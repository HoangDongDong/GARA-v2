const test=require('node:test'),assert=require('node:assert/strict');
const {apply,buildCode,bankBin}=require('../../../backend/src/services/provisionalPaymentQr');
const template='<Report><ReportPage><ReportSummaryBand Width="506.52" Height="220"/></ReportPage></Report>';
test('VietQR payload matches the official example including CRC',()=>{
 assert.equal(buildCode('970415','113366668888',79000,'Ung Ho Quy Vac Xin'),'00020101021238560010A0000007270126000697041501121133666688880208QRIBFTTA53037045405790005802VN62220818Ung Ho Quy Vac Xin63043ACF');
 assert.equal(bankBin('Vietcombank'),'970436');assert.equal(bankBin('VCB'),'970436');assert.equal(bankBin('Ngân hàng không tồn tại'),'');
});
test('QR uses selected active account and bill grand total, keeping leading zeroes',async()=>{
 const data={parameters:{TONGCONG:1331000,TIENHANG:1100000,DocNumber:'LSC26/00025'}};let requested;
 const result=await apply(template,data,async(sql,params)=>sql.includes('SCONFIG')?[{TEXTVALUE:'selected-bank'}]:(requested=params,[{TENNGANHANG:'Vietcombank',SOTAIKHOAN:'0000000001',NAME:'TEST ACCOUNT'}]));
 assert.deepEqual(requested,['selected-bank']);assert.equal(data.parameters.PaymentQrAmount,'1.331.000 đ');
 assert.match(data.parameters.PaymentQrData,/54071331000/);assert.match(data.parameters.PaymentQrData,/01100000000001/);
 assert.match(result.xml,/Barcode="QR Code"/);assert.match(result.xml,/Name="PaymentQrBand"/);assert.equal(result.notice,'');
});
test('missing or invalid config never prints a guessed account QR and leaves the bill available',async()=>{
 for(const account of [null,{TENNGANHANG:'unknown',SOTAIKHOAN:'0000000001'},{TENNGANHANG:'VCB',SOTAIKHOAN:'invalid'}]){
  const result=await apply(template,{parameters:{TONGCONG:1331000,DocNumber:'LSC26/00025'}},async sql=>sql.includes('SCONFIG')?[{TEXTVALUE:'id'}]:account?[account]:[]);
  assert.equal(result.xml,template);assert.ok(result.notice);
 }
 const missing=await apply(template,{parameters:{}},async()=>[]);assert.equal(missing.xml,template);assert.match(missing.notice,/Cấu hình/);
});
