const db = require('../db'), branchSql = require('../branchSql');
const policy = require('./pricingPolicy'), charges = require('./defaultChargeRates');
const commissions = require('./repairCommissions');
const fail = (message, status=400) => Object.assign(Error(message), {status});
async function ensure() {
 for (const [table, fields] of Object.entries({
  TBAOHANHXULY: {TILETHUE:'DECIMAL(9,2) DEFAULT 0', TILEPHIDICHVU:'DECIMAL(9,2) DEFAULT 0', TILEGIAMGIA:'DECIMAL(9,2) DEFAULT 0', GIAMPHIEU:'DECIMAL(18,2)', TIENGIAMGIA:'DECIMAL(18,2) DEFAULT 0', TIENTHUE:'DECIMAL(18,2) DEFAULT 0', PHIDICHVU:'DECIMAL(18,2) DEFAULT 0', TAXSUMMARY:'VARCHAR(4000)', PHANCONG:'VARCHAR(8191) CHARACTER SET UTF8', HOADONID:'VARCHAR(36)'},
  TBAOHANHXULYCT: {TILETHUE:'DECIMAL(9,2) DEFAULT 0', TILECHIETKHAU:'DECIMAL(9,2) DEFAULT 0', TIENCHIETKHAU:'DECIMAL(18,2) DEFAULT 0', TIENGIAMGIA:'DECIMAL(18,2) DEFAULT 0', HHKIEU:'SMALLINT DEFAULT 0', HHGIATRI:'DECIMAL(18,2) DEFAULT 0', HOAHONG:'DECIMAL(18,2) DEFAULT 0'}
 })) {
  const existing = await db.query('SELECT TRIM(RDB$FIELD_NAME) NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=?',[table]);
  for (const [field,type] of Object.entries(fields)) if (!existing.some(c=>c.NAME===field)) await db.execute(`ALTER TABLE ${table} ADD ${field} ${type}`);
 }
}
function totals(job) {
 return policy.calculate(job.items.map(l=>({id:l.ID,amount:l.KIND==='warranty'?0:Number(l.THANHTIEN),discountRate:l.KIND==='warranty'?0:Number(l.TILECHIETKHAU||0),taxRate:l.KIND==='warranty'?0:Number(l.TILETHUE||0)})),
  {taxRate:Number(job.TILETHUE||0),serviceRate:Number(job.TILEPHIDICHVU||0)},Number(job.TILEGIAMGIA||0),job.GIAMPHIEU==null?undefined:Number(job.GIAMPHIEU));
}
async function refresh(job,q,x) {
 const value=totals(job);
 for(const l of value.details) await x('UPDATE TBAOHANHXULYCT SET TIENCHIETKHAU=?,TIENGIAMGIA=? WHERE ID=?',[l.lineDiscount,l.discount,l.id]);
 await x('UPDATE TBAOHANHXULY SET TONGCONG=?,TIENGIAMGIA=?,TIENTHUE=?,PHIDICHVU=?,TAXSUMMARY=? WHERE ID=?',[value.total,value.discount,value.tax,value.serviceFee,JSON.stringify(value.taxGroups),job.ID]);
 return value;
}
async function assignments(id,q=db.query) {
 const job=await require('./warrantyJobs').get(id,q);
 const details=job.items.map(l=>commissions.calculateLine({...l,TEN:l.NAME}));
 return {details,total:policy.round(details.reduce((s,l)=>s+l.HOAHONG,0)),captured:!!job.PHANCONG,
  assignments:JSON.parse(job.PHANCONG||'[]'),employees:await q(`SELECT ID,NAME,CHUYENMON FROM ${branchSql.table('DNHANVIEN')} WHERE STATUS=1 ORDER BY NAME`)};
}
async function capture(job,input,q,x) {
 const rows=commissions.validateAssignments(input);
 const employees=await q(`SELECT ID,NAME FROM ${branchSql.table('DNHANVIEN')} WHERE STATUS=1 AND ID IN (${rows.map(()=>'?').join(',')})`,rows.map(r=>r.employeeId));
 if(employees.length!==rows.length)throw fail('Nhân viên không tồn tại hoặc đã ngừng làm việc.');
 await recapture(job,rows.map(r=>({...r,name:employees.find(e=>e.ID===r.employeeId).NAME})),q,x);
}
async function recapture(job,rows,q,x) {
 let total=0;
 for(const line of job.items){const c=commissions.calculateLine({...line,TEN:line.NAME});total+=c.HOAHONG;await x('UPDATE TBAOHANHXULYCT SET HOAHONG=? WHERE ID=?',[c.HOAHONG,line.ID]);}
 const assigned=commissions.distribute(policy.round(total),rows).map(r=>({EMPLOYEEID:r.employeeId,NAME:r.name,TILECHIA:r.share,PHUTRACHCHINH:r.primary?1:0,HOAHONG:r.amount}));
 const content=JSON.stringify(assigned);if(content.length>8191)throw fail('Danh sách phân công quá dài.');
 await x('UPDATE TBAOHANHXULY SET PHANCONG=? WHERE ID=?',[content,job.ID]);
}
async function additional(job,q,x) {
 if(!job.PHANCONG)return;
 const rows=JSON.parse(job.PHANCONG).map(r=>({employeeId:r.EMPLOYEEID,name:r.NAME,share:Number(r.TILECHIA),primary:Number(r.PHUTRACHCHINH)===1}));
 await recapture(job,rows,q,x);
}
async function pay(id,body,user) {
 await require('./warrantyJobs').ensure();
 return db.transaction(async(q,x,uuid)=>{
  const job=await require('./warrantyJobs').get(id,q,true);
  if(Number(job.TRANGTHAI)!==3||job.HOADONID)throw fail('Chỉ thanh toán một lần tại bước Giao xe.',409);
  if(require('../branchScope').enabled()&&job.DCUAHANGID!==require('../branchScope').selected())throw fail('Chọn đúng chi nhánh của phiếu.');
  if(body.note!==undefined){if(typeof body.note!=='string'||body.note.length>2000)throw fail('Ghi chú xử lý quá dài.');await x('UPDATE TBAOHANHXULY SET NOTE=? WHERE ID=?',[body.note||null,id]);}
  const value=totals(job),[vehicle]=await q('SELECT DKHACHHANGID FROM DXE WHERE ID=?',[job.DXEID]);
  const payments=['TIENMAT','CHUYENKHOAN','THE'].map(k=>Number(body[k]??0));
  const result=require('./repairPayment').calculate(value.total,payments,body.ALLOW_DEBT,vehicle?.DKHACHHANGID);
  const settings=await require('./paymentSettings').load('repair',q);require('./paymentSettings').assertDebt(settings,result.remaining);
  if(settings.requireBill&&!require('../permissionPolicy').has(user,'WARRANTY',17))throw fail('Cần quyền in bảo hành khi cấu hình bắt buộc in bill.',403);
  const invoiceId=uuid(),code=await require('./documentNumbers').nextInTransaction('HoaDonSuaChua',q,x);
  const partTotal=job.items.filter(l=>l.KIND==='part').reduce((s,l)=>s+Number(l.THANHTIEN),0),serviceTotal=value.subtotal-partTotal;
  await x(`INSERT INTO THOADONSUACHUA (ID,NAME,NGAY,DXEID,DKHACHHANGID,DCUAHANGID,TIENPHUTUNG,TIENCONG,TIENDICHVU,TILEGIAMGIA,TIENGIAMGIA,TIENTHUE,TONGCONG,DATCOC,CONLAI,TIENMAT,CHUYENKHOAN,THE,CONGNO,DATHANHTOAN,STATUS,USERCREATEDID,TIMECREATED,TILETHUE,TILEPHIDICHVU,PHIDICHVU,CHARGEVERSION,TAXSUMMARY,NOTE)
   VALUES (?,?,CURRENT_TIMESTAMP,?,?,?,?,?,0,?,?,?,?,0,?,?,?,?,?,?,1,?,CURRENT_TIMESTAMP,?,?,?,1,?,?)`,
   [invoiceId,code,job.DXEID,vehicle?.DKHACHHANGID,job.DCUAHANGID,partTotal,serviceTotal,Number(job.TILEGIAMGIA||0),value.discount,value.tax,value.total,result.remaining,...payments,result.remaining,result.paid?1:0,user.ID,Number(job.TILETHUE||0),Number(job.TILEPHIDICHVU||0),value.serviceFee,JSON.stringify(value.taxGroups),'Thanh toán bảo hành '+job.NAME]);
  await x('UPDATE TBAOHANHXULY SET HOADONID=?,TRANGTHAI=4,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[invoiceId,id]);
  return {id:invoiceId,code,...result,completed:true,requireBill:settings.requireBill};
 });
}
module.exports={ensure,totals,refresh,assignments,capture,additional,pay};
