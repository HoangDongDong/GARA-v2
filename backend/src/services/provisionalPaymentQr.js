const branchSql=require('../branchSql');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
// Public bank identifiers from https://api.vietqr.io/v2/banks (2026-10-13).
const banks = require('./vietqrBanks.json');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toUpperCase().replace(/[^A-Z0-9]/g, '');
function bankBin(name) {
  const value = normalize(name);
  const exact = banks.find(bank => [bank.bin, bank.code, bank.shortName, bank.name].some(alias => normalize(alias) === value));
  const matches = exact ? [exact] : banks.filter(bank => normalize(bank.shortName).length >= 4 && value.includes(normalize(bank.shortName)));
  return matches.length === 1 ? String(matches[0].bin) : '';
}
function tlv(id, value) {
  const text = String(value), length = Buffer.byteLength(text, 'utf8');
  if (length > 99) throw Error('Dữ liệu QR quá dài.');
  return id + String(length).padStart(2, '0') + text;
}
function crc16(value) {
  let crc = 0xffff;
  for (const byte of Buffer.from(value, 'utf8')) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
function buildCode(bin, account, amount, memo) {
  if (!/^\d{6}$/.test(bin) || !/^\d{6,19}$/.test(account) || !Number.isSafeInteger(amount) || amount <= 0 || String(amount).length > 13) throw Error('Thông tin chuyển khoản không hợp lệ.');
  const merchant = tlv('00', 'A000000727') + tlv('01', tlv('00', bin) + tlv('01', account)) + tlv('02', 'QRIBFTTA');
  const content = tlv('00', '01') + tlv('01', '12') + tlv('38', merchant) + tlv('53', '704') + tlv('54', amount) + tlv('58', 'VN') + tlv('62', tlv('08', memo)) + '6304';
  return content + crc16(content);
}
function removeSignatures(xml) {
  const doc = new DOMParser().parseFromString(xml.replace(/^\uFEFF/, ''), 'text/xml');
  let changed = false;
  for (const node of Array.from(doc.getElementsByTagName('*'))) {
    if (!['TextObject', 'TableCell'].includes(node.tagName)) continue;
    const text = (node.getAttribute('Text') || '').trim();
    if (!/^(Khách hàng\s*\/\s*người giao nhận|Nhân viên GARA)$/.test(text) && text !== '[FooterNote]') continue;
    const target = node.parentNode?.tagName === 'TableRow' ? node.parentNode : node;
    const parent = target.parentNode;
    if (!parent) continue;
    const height = Number(target.getAttribute('Height') || target.getAttribute('MinHeight')) || 0;
    parent.removeChild(target); changed = true;
    if (parent.getAttribute('Name') === 'StyledFooter' && !Array.from(parent.childNodes).some(child => child.tagName === 'TableRow')) {
      const removedHeight = Number(parent.getAttribute('Height')) || height;
      parent.setAttribute('Height', '0');
      const band = parent.parentNode;
      if (band?.tagName === 'ReportSummaryBand') band.setAttribute('Height', String(Math.max(0, Number(band.getAttribute('Height')) - removedHeight)));
    }
  }
  return changed ? new XMLSerializer().serializeToString(doc) : xml;
}
async function apply(xml, data, query) {
  xml = removeSignatures(xml);
  let [setting] = await query("SELECT TEXTVALUE FROM SCONFIG WHERE NAME='PaymentBankAccountId' AND STATUS=30");
  setting=setting||{};
  if(require('../branchScope').enabled())setting.TEXTVALUE=await require('./branchSettings').text('PaymentBankAccountId',setting?.TEXTVALUE||'',data.parameters.DCUAHANGID,query);
  if (!setting?.TEXTVALUE) return { xml, notice: 'Chưa có QR chuyển khoản: hãy chọn tài khoản nhận thanh toán trong Cấu hình.' };
  const [account] = await query(`SELECT NAME,SOTAIKHOAN,TENNGANHANG FROM ${branchSql.table('DTAIKHOANNGANHANG')} WHERE ID=? AND STATUS=1`, [setting.TEXTVALUE]);
  const bin = bankBin(account?.TENNGANHANG), number = String(account?.SOTAIKHOAN || '').replace(/\s/g, '');
  const amount = Math.round(Number(data.parameters.TONGCONG));
  const memo = ('TT ' + normalize(data.parameters.DocNumber)).slice(0, 25);
  let code;
  try { code = buildCode(bin, number, amount, memo); }
  catch { return { xml, notice: 'Chưa tạo được QR chuyển khoản. Kiểm tra ngân hàng, số tài khoản đã chọn trong Cấu hình và tổng tiền trên phiếu.' }; }
  const doc = new DOMParser().parseFromString(xml.replace(/^\uFEFF/, ''), 'text/xml');
  const summary = doc.getElementsByTagName('ReportSummaryBand')[0];
  if (!summary) return { xml, notice: 'Mẫu in chưa có phần cuối phiếu để đặt QR chuyển khoản.' };
  if (Array.from(doc.getElementsByTagName('ChildBand')).some(node => node.getAttribute('Name') === 'PaymentQrBand')) return { xml, notice: '' };
  data.parameters.PaymentQrData = code;
  data.parameters.PaymentQrBank = account.TENNGANHANG;
  data.parameters.PaymentQrAccount = number;
  data.parameters.PaymentQrName = account.NAME || '';
  data.parameters.PaymentQrAmount = amount.toLocaleString('vi-VN') + ' đ';
  data.parameters.PaymentQrMemo = memo;
  data.parameters.LoiCamOn = String(data.parameters.LoiCamOn || '').trim();
  // Move an existing thank-you line after the QR instead of printing it twice.
  for (const node of Array.from(doc.getElementsByTagName('*'))) {
    if (!['TextObject', 'TableCell'].includes(node.tagName)) continue;
    const text = node.getAttribute('Text') || '';
    if (!text.includes('[LoiCamOn]') && !/^Cảm ơn/i.test(text.trim())) continue;
    const target = node.parentNode?.tagName === 'TableRow' ? node.parentNode : node;
    target.parentNode?.removeChild(target);
  }
  const make = (tag, attributes, parent) => {
    const node = doc.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.appendChild(node); return node;
  };
  let parent = summary;
  while (Array.from(parent.childNodes).some(node => node.tagName === 'ChildBand')) parent = Array.from(parent.childNodes).find(node => node.tagName === 'ChildBand');
  const width = Number(summary.getAttribute('Width')) || 506.52;
  const narrow = width < 350, size = narrow ? 128 : 140;
  const band = make('ChildBand', { Name: 'PaymentQrBand', Width: width, Height: size + 75, CanGrow: 'true', CanShrink: 'true', KeepTogether: 'true' }, parent);
  make('TextObject', { Name: 'PaymentQrTitle', Left: 0, Top: 8, Width: width, Height: 20, Text: 'QUÉT QR CHUYỂN KHOẢN', Font: `Arial, ${narrow ? 8 : 9}pt, style=Bold`, HorzAlign: 'Center' }, band);
  make('BarcodeObject', { Name: 'PaymentQrCode', Left: (width - size) / 2, Top: 32, Width: size, Height: size, AutoSize: 'false', Text: '[PaymentQrData]', ShowText: 'false', AllowExpressions: 'true', Barcode: 'QR Code', 'Barcode.ErrorCorrection': 'M', 'Barcode.Encoding': 'UTF8', 'Barcode.QuietZone': 'true' }, band);
  make('TextObject', { Name: 'PaymentQrThanks', Left: 0, Top: size + 42, Width: width, Height: 25, Text: '[LoiCamOn]', Font: `Arial, ${narrow ? 8 : 9}pt, style=Italic`, HorzAlign: 'Center', WordWrap: 'true', CanGrow: 'true', CanShrink: 'true', VisibleExpression: '[LoiCamOn] != ""' }, band);
  return { xml: new XMLSerializer().serializeToString(doc), notice: '' };
}
module.exports = { apply, bankBin, buildCode, crc16, removeSignatures };
