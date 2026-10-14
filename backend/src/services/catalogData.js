const branchSql=require('../branchSql');
const db = require('../db.js');
const { loadFuelOptions } = require('./fuelOptions.js');

const fields = (text) => text.split(' ');
const master = (table, extra = '') => ({ table, fields: fields(`NAME NOTE ${extra}`.trim()), required: ['NAME'], uniqueName: true });
// Explicit resources: request input never supplies table/column names.
const resources = {
  customers: { table: 'DKHACHHANG', fields: fields('NAME MAKHACH DIENTHOAI EMAIL DIACHI MASOTHUE DNHOMKHACHHANGID GIAMGIARIENG'), required: ['NAME'], code: 'MAKHACH', links: { DNHOMKHACHHANGID: 'DNHOMKHACHHANG' } },
  suppliers: { table: 'DNHACUNGCAP', fields: fields('NAME MANHACUNGCAP DIENTHOAI EMAIL DIACHI WEBSITE NOTE DNHOMNHACUNGCAPID'), required: ['NAME', 'MANHACUNGCAP'], code: 'MANHACUNGCAP', links: { DNHOMNHACUNGCAPID: 'DNHOMNHACUNGCAP' } },
  parts: { table: 'DMATHANG', fields: fields('NAME CODE BARCODE MAOEM GIANHAP GIABAN GIABAN2 GIABAN3 BAOHANH TONTOITHIEU TONTOIDA MASANCO DNHOMMATHANGID DHANGSANXUATID DDONVITINHID DVITRIKHOID THUESUATRIENG HHKIEU HHGIATRI'), required: ['NAME', 'CODE'], code: 'CODE' },
  services: { ...master('DDICHVU', 'CODE GIA THOIGIAN DLOAIDICHVUID THUESUATRIENG HHKIEU HHGIATRI'), code: 'CODE', links: { DLOAIDICHVUID: 'DLOAIDICHVU' } },
  models: { ...master('DDONGXE', 'CODE DHANGXEID'), code: 'CODE', scope: 'DHANGXEID', links: { DHANGXEID: 'DHANGXE' } },
  vehicles: { table: 'DXE', fields: fields('BIENSO NAME PHIENBAN NAMSANXUAT MAUXE SOKHUNG SOMAY ODO NHIENLIEU MUCNHIENLIEU GHICHU DHANGXEID DDONGXEID DKHACHHANGID'), readonly: true },
  warehouses: master('DKHOHANG', 'CHOPHEPAMKHO'),
  locations: { ...master('DVITRIKHO', 'DKHOHANGID'), scope: 'DKHOHANGID', links: { DKHOHANGID: 'DKHOHANG' } },
  manufacturers: master('DHANGSANXUAT'),
  units: { ...master('DDONVITINH', 'CODE'), code: 'CODE' },
  departments: master('DPHONGBAN', 'CODE'),
  positions: master('DCHUCVU', 'CODE'),
  shifts: master('DCALAMVIEC', 'GIOBATDAU GIOKETTHUC'),
  fuels: master('DNHIENLIEU', 'CODE'),
  cashReasons: master('DLYDOTHUCHI', 'LOAI'),
  stores: { ...master('DCUAHANG', 'CODE DIACHI DIENTHOAI EMAIL'), code: 'CODE' },
  banks: { ...master('DTAIKHOANNGANHANG', 'SOTAIKHOAN TENNGANHANG CHINHANH SODUDAU'), required: ['NAME', 'SOTAIKHOAN', 'TENNGANHANG'], code: 'SOTAIKHOAN', uniqueName: false },
  funds: master('DQUYTIENMAT', 'CODE'),
  customer_groups: master('DNHOMKHACHHANG', 'GIAMGIARIENG'),
  supplier_groups: master('DNHOMNHACUNGCAP'),
  categories: master('DNHOMMATHANG', 'THUESUATRIENG'),
  service_categories: master('DLOAIDICHVU', 'THUESUATRIENG'),
  brands: { ...master('DHANGXE', 'CODE'), code: 'CODE' },
};
const layouts = {
  customers: { groupResource: 'customer_groups', groupField: 'DNHOMKHACHHANGID' },
  suppliers: { groupResource: 'supplier_groups', groupField: 'DNHOMNHACUNGCAPID' },
  parts: { groupResource: 'categories', groupField: 'DNHOMMATHANGID' },
  services: { groupResource: 'service_categories', groupField: 'DLOAIDICHVUID' },
  models: { resource: 'models', groupResource: 'brands', groupField: 'DHANGXEID' },
  vehicles: { groupResource: 'brands', groupField: 'DHANGXEID' },
  warehouses: { resource: 'locations', groupResource: 'warehouses', groupField: 'DKHOHANGID' },
  stock: { groupResource: 'warehouses', readonly: true },
};
function failure(message, status = 400, code) { return Object.assign(new Error(message), { status, code }); }
async function tableExists(table, query = db.query) {
  return (await query('SELECT FIRST 1 RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME=?', [table])).length > 0;
}
function readTable(resource,def){
  // Branch directory is managed across the organization by its verified owner.
  // Business tables and staff reads retain the selected branch's scope.
  const scope=require('../branchScope');
  return resource==='stores'&&scope.owner(scope.current())?def.table:branchSql.table(def.table);
}
async function read(resource) {
  if (resource === 'fuels') return loadFuelOptions();
  const def = resources[resource];
  if (!def) throw failure('Danh mục không tồn tại.', 404);
  if (!await tableExists(def.table)) return { data: [], available: false, table: def.table, message: 'Danh mục này chưa có bảng trong database hiện tại.' };
  const photo = resource === 'parts' ? ', CASE WHEN ANH IS NULL THEN 0 ELSE 1 END AS CO_ANH' : resource === 'vehicles' ? ', CASE WHEN ANHXE IS NULL THEN 0 ELSE 1 END AS CO_ANHXE' : '';
  const data = await db.query(`SELECT ID, STATUS, ${def.fields.join(', ')}${photo} FROM ${readTable(resource,def)} ORDER BY ${resource === 'vehicles' ? 'BIENSO' : 'NAME'}`);
  return { data, available: true, table: def.table };
}
// Stock is grouped by the warehouse on each movement, rather than the part's current storage location.
const stockSql = `
 SELECT M.ID AS PART_ID, M.CODE, M.NAME, M.STATUS, M.DVITRIKHOID,
        U.NAME AS UNIT_NAME, V.NAME AS LOCATION_NAME, S.DKHOHANGID,
        SUM(S.QUANTITY) AS TON_KHO
 FROM (
   ${require('./stock.js').movements}
   UNION ALL
   SELECT M.ID, V.DKHOHANGID, CAST(0 AS DOUBLE PRECISION) FROM DMATHANG M LEFT JOIN ${branchSql.table('DVITRIKHO')} V ON V.ID=M.DVITRIKHOID
 ) S JOIN DMATHANG M ON M.ID=S.DMATHANGID
 LEFT JOIN DDONVITINH U ON U.ID=M.DDONVITINHID
 LEFT JOIN ${branchSql.table('DVITRIKHO')} V ON V.ID=M.DVITRIKHOID AND V.DKHOHANGID=S.DKHOHANGID
 GROUP BY M.ID, M.CODE, M.NAME, M.STATUS, M.DVITRIKHOID, U.NAME, V.NAME, S.DKHOHANGID
 ORDER BY M.NAME`;
async function load(type) {
  const layout = layouts[type] || {};
  const resource = layout.resource || type;
  const [records, groupResult] = await Promise.all([
    type === 'stock' ? db.query(stockSql).then((data) => ({ data: data.map((row) => ({ ...row, ID: `${row.PART_ID}:${row.DKHOHANGID || ''}` })), available: true })) : read(resource),
    layout.groupResource ? read(layout.groupResource) : Promise.resolve({ data: [], available: true }),
  ]);
  let groups = groupResult.data;
  if (type === 'banks') groups = [...new Set(records.data.map((row) => row.TENNGANHANG).filter(Boolean))].sort().map((name) => ({ ID: name, NAME: name, STATUS: 1 }));
  if (type === 'cashReasons') groups = [{ ID: '0', NAME: 'Thu', STATUS: 1 }, { ID: '1', NAME: 'Chi', STATUS: 1 }];
  const groupIds = new Set(groups.map((group) => String(group.ID)));
  const lookupKeys = type === 'parts' ? ['units', 'manufacturers', 'locations'] : type === 'vehicles' ? ['models', 'customers'] : [];
  const lookupResults = await Promise.all(lookupKeys.map((key) => read(key)));
  const lookups = Object.fromEntries(lookupKeys.map((key, index) => [key, lookupResults[index].data]));
  return { ...records, resource, groupResource: layout.groupResource || null, groupsAvailable: groupResult.available,
    groups, lookups, data: records.data.map((row) => {
      const value = type === 'banks' ? row.TENNGANHANG : type === 'cashReasons' ? row.LOAI : type === 'stock' ? row.DKHOHANGID : row[layout.groupField];
      return { ...row, GROUP_ID: value != null && value !== '' && groupIds.has(String(value)) ? String(value) : '',
        GROUP_NAME: groups.find((group) => String(group.ID) === String(value))?.NAME || '',
        ...(type === 'parts' ? { UNIT_NAME: lookups.units.find((unit) => unit.ID === row.DDONVITINHID)?.NAME || '', MANUFACTURER_NAME: lookups.manufacturers.find((item) => item.ID === row.DHANGSANXUATID)?.NAME || '' } : {}),
        ...(type === 'vehicles' ? { MODEL_NAME: lookups.models.find((model) => model.ID === row.DDONGXEID)?.NAME || '', CUSTOMER_NAME: lookups.customers.find((customer) => customer.ID === row.DKHACHHANGID)?.NAME || '' } : {}),
      };
    }) };
}
async function save(resource, id, body, actor) {
  const def = resources[resource];
  if (!def) throw failure('Danh mục không tồn tại.', 404);
  if (def.readonly) throw failure('Danh mục này sử dụng form nghiệp vụ riêng.', 405);
  if (!await tableExists(def.table)) throw failure('Danh mục này chưa có bảng trong database hiện tại.', 409, 'CATALOG_UNAVAILABLE');
  const allowed = new Set(def.fields);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw failure('Dữ liệu có trường không thuộc danh mục.');
  const payload = {};
  require('./pricingPolicy.js').validateMaster(body);
  require('./repairCommissions.js').validateConfig(body);
  for (const [key, value] of Object.entries(body)) {
    if (value != null && typeof value !== 'string' && typeof value !== 'number') throw failure('Giá trị không hợp lệ.');
    if (typeof value === 'number' && !Number.isFinite(value)) throw failure('Giá trị số không hợp lệ.');
    if (typeof value === 'string' && value.length > 255) throw failure('Nội dung không được vượt quá 255 ký tự.');
    payload[key] = typeof value === 'string' ? value.trim() || null : value;
  }
  return db.transaction(async (query, execute, uuid) => {
    const current = id ? (await query(`SELECT ${def.fields.join(', ')} FROM ${readTable(resource,def)} WHERE ID=?`, [id]))[0] : null;
    if (id && !current) throw failure('Bản ghi không còn tồn tại.', 404);
    const autoKey = {customers:'KhachHang',services:'DichVu',parts:'MatHang'}[resource];
    if (!id && autoKey && !payload[def.code]) payload[def.code] = await require('./documentNumbers.js').nextInTransaction(autoKey, query, execute);
    if (resource === 'parts') payload.BARCODE = payload.CODE || current?.CODE;
    if(resource==='stores'&&payload.CODE)payload.CODE=payload.CODE.toUpperCase();
    const combined = { ...current, ...payload };
    if(resource==='stores'&&require('../branchScope').enabled()&&(!/^[A-Z0-9][A-Z0-9_-]{0,19}$/i.test(String(combined.CODE||''))))throw failure('Mã chi nhánh gồm 1–20 chữ, số, dấu gạch ngang hoặc gạch dưới.');
    if ((def.required || ['NAME']).some((field) => !String(combined[field] ?? '').trim())) throw failure('Vui lòng điền đầy đủ các trường bắt buộc.');
    const numericFields = ['GIA', 'THOIGIAN', 'CHOPHEPAMKHO', 'LOAI'];
    if (payload.SODUDAU != null) {
      payload.SODUDAU=Number(payload.SODUDAU);
      if (!Number.isFinite(payload.SODUDAU) || Math.abs(payload.SODUDAU)>Number.MAX_SAFE_INTEGER || Math.abs(payload.SODUDAU*100-Math.round(payload.SODUDAU*100))>1e-6) throw failure('Số dư đầu kỳ không hợp lệ, tối đa 2 chữ số thập phân.');
    }
    for (const field of numericFields) if (payload[field] != null) {
      payload[field] = Number(payload[field]);
      if (!Number.isFinite(payload[field]) || payload[field] < 0 || (['LOAI', 'CHOPHEPAMKHO'].includes(field) && ![0, 1].includes(payload[field]))) throw failure('Giá trị số không hợp lệ.');
    }
    for (const field of ['GIOBATDAU', 'GIOKETTHUC']) if (payload[field]) {
      payload[field] = new Date(payload[field]);
      if (Number.isNaN(payload[field].getTime())) throw failure('Giờ làm việc không hợp lệ.');
    }
    for (const [field, table] of Object.entries(def.links || {})) if (combined[field] && !(await query(`SELECT FIRST 1 ID FROM ${branchSql.table(table)} WHERE ID=?`, [combined[field]])).length) throw failure('Nhóm được chọn không còn tồn tại.');
    for (const field of [def.code, def.uniqueName ? 'NAME' : null].filter(Boolean)) {
      if (!combined[field]) continue;
      let sql = `SELECT FIRST 1 ID FROM ${resource==='stores'?def.table:branchSql.table(def.table)} WHERE UPPER(TRIM(${field}))=?`;
      const params = [String(combined[field]).trim().toUpperCase()];
      if (id) { sql += ' AND ID<>?'; params.push(id); }
      if (def.scope && field === 'NAME') {
        sql += combined[def.scope] ? ` AND ${def.scope}=?` : ` AND ${def.scope} IS NULL`;
        if (combined[def.scope]) params.push(combined[def.scope]);
      }
      if ((await query(sql, params)).length) throw failure(field === 'NAME' ? 'Tên danh mục đã tồn tại.' : 'Mã đã tồn tại.', 409);
    }
    const columns = Object.keys(payload);
    if (id) {
      if (columns.length) await execute(`UPDATE ${def.table} SET ${columns.map((key) => `${key}=?`).join(', ')}, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [...columns.map((key) => payload[key]), actor, id]);
      return { ok: true, id };
    }
    const newId = uuid();
    await execute(`INSERT INTO ${def.table} (ID, STATUS, USERCREATEDID, TIMECREATED, ${columns.join(', ')}) VALUES (?, 1, ?, CURRENT_TIMESTAMP, ${columns.map(() => '?').join(', ')})`, [newId, actor, ...columns.map((key) => payload[key])]);
    return { ok: true, id: newId };
  });
}
async function setStatus(resource, id, status, actor) {
  const def = resources[resource];
  if (!def) throw failure('Danh mục không tồn tại.', 404);
  if (def.readonly) throw failure('Hãy thay đổi trạng thái trong màn hình nghiệp vụ.', 405);
  if (![0, 1].includes(status)) throw failure('Trạng thái không hợp lệ.');
  if(resource==='stores'&&status===0&&require('../branchScope').enabled()){
    const [branch]=await db.query('SELECT ISMAIN FROM DCUAHANG WHERE ID=?',[id]);
    if(Number(branch?.ISMAIN)===1)throw failure('Không thể ngừng chi nhánh chính.');
    const [busy]=await db.query('SELECT FIRST 1 ID FROM TLENHSUACHUA WHERE DCUAHANGID=? AND STATUS=1 AND TRANGTHAI<4',[id]);
    const [transit]=await db.query("SELECT FIRST 1 ID FROM TCHUYENKHO WHERE (DCUAHANGID=? OR DCHINHANHDICHID=?) AND STATE IN ('SENT','PARTIAL')",[id,id]);
    if(busy||transit)throw failure('Chi nhánh còn xe đang sửa hoặc hàng đang vận chuyển.');
  }
  if (!await tableExists(def.table)) throw failure('Danh mục này chưa có bảng trong database hiện tại.', 409, 'CATALOG_UNAVAILABLE');
  if (!(await db.query(`SELECT FIRST 1 ID FROM ${readTable(resource,def)} WHERE ID=?`, [id])).length) throw failure('Bản ghi không còn tồn tại.', 404);
  await db.execute(`UPDATE ${def.table} SET STATUS=?, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [status, actor, id]);
  return { ok: true };
}
module.exports = { resources, layouts, read, load, save, setStatus, stockSql };
