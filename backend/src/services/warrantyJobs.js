const db=require('../db'),branch=require('../branchScope'),branchSql=require('../branchSql');
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const localDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const schemas=new Map();
async function ensure(){
 const key=require('../tenancy').key();if(schemas.has(key))return schemas.get(key);
 const promise=(async()=>{
  const names=await db.query("SELECT TRIM(RDB$RELATION_NAME) AS NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME IN ('TBAOHANHXULY','TBAOHANHXULYCT')");
  if(!names.some(r=>r.NAME==='TBAOHANHXULY'))await db.execute(`CREATE TABLE TBAOHANHXULY (ID VARCHAR(36) NOT NULL PRIMARY KEY, NAME VARCHAR(60), DXEID VARCHAR(36) NOT NULL, DCUAHANGID VARCHAR(36), DKHOHANGID VARCHAR(36), NGAY DATE, NOTE VARCHAR(2000) CHARACTER SET UTF8, TRANGTHAI SMALLINT DEFAULT 0 NOT NULL, TONGCONG DECIMAL(18,2) DEFAULT 0, STATUS SMALLINT DEFAULT 1, USERCREATEDID VARCHAR(36), TIMECREATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP, TIMEMODIFIED TIMESTAMP, CONSTRAINT CK_BHXLY_STATE CHECK (TRANGTHAI BETWEEN 0 AND 3))`);
  if(!names.some(r=>r.NAME==='TBAOHANHXULYCT'))await db.execute(`CREATE TABLE TBAOHANHXULYCT (ID VARCHAR(36) NOT NULL PRIMARY KEY, TBAOHANHXULYID VARCHAR(36) NOT NULL REFERENCES TBAOHANHXULY(ID), KIND VARCHAR(12) NOT NULL, SOURCEID VARCHAR(36) NOT NULL, DMATHANGID VARCHAR(36), DDICHVUID VARCHAR(36), NAME VARCHAR(255) CHARACTER SET UTF8, UNITNAME VARCHAR(50) CHARACTER SET UTF8, SOLUONG DECIMAL(18,3), DONGIA DECIMAL(18,2), THANHTIEN DECIMAL(18,2), NOTE VARCHAR(1000) CHARACTER SET UTF8, XUATID VARCHAR(36), SORTORDER INTEGER)`);
  const constraints=await db.query("SELECT TRIM(RDB$CONSTRAINT_NAME) AS NAME FROM RDB$RELATION_CONSTRAINTS WHERE RDB$RELATION_NAME='TBAOHANHXULY' AND RDB$CONSTRAINT_TYPE='CHECK'");
  if(!constraints.some(c=>c.NAME==='CK_BHXLY_STATE_V2'))await db.transaction(async(q,x)=>{
   if(constraints.some(c=>c.NAME==='CK_BHXLY_STATE'))await x('ALTER TABLE TBAOHANHXULY DROP CONSTRAINT CK_BHXLY_STATE');
   await x('ALTER TABLE TBAOHANHXULY ADD CONSTRAINT CK_BHXLY_STATE_V2 CHECK (TRANGTHAI BETWEEN 0 AND 4)');
  });
  await require('./warrantyAccounting').ensure();
  await require('./warrantyImages').ensure();
  await require('./warrantySupplements').ensure();
 })();schemas.set(key,promise);try{await promise;}catch(error){schemas.delete(key);throw error;}
}
function scopeWhere(alias='J'){
 if(!branch.enabled()||branch.current()?.maintenance)return {sql:'1=1',params:[]};
 const ids=branch.current()?.readIds||[];return {sql:ids.length?`${alias}.DCUAHANGID IN (${ids.map(()=>'?').join(',')})`:'1=0',params:ids};
}
async function eligible(vehicleId,query=db.query){
 const rows=await query(`SELECT B.ID,B.NAME,B.NOTE,B.NGAYKETTHUC,B.DMATHANGID,B.DDICHVUID,M.NAME AS PART_NAME,D.NAME AS SERVICE_NAME,U.NAME AS UNITNAME FROM ${branchSql.table('TBAOHANH')} B LEFT JOIN DMATHANG M ON M.ID=B.DMATHANGID LEFT JOIN DDICHVU D ON D.ID=B.DDICHVUID LEFT JOIN DDONVITINH U ON U.ID=M.DDONVITINHID WHERE B.DXEID=? AND B.STATUS=1 AND B.NGAYBATDAU<=CURRENT_DATE AND B.NGAYKETTHUC>=CURRENT_DATE ORDER BY B.NGAYKETTHUC`,[vehicleId]);
 return rows.map(row=>({...row,NGAYKETTHUC:row.NGAYKETTHUC?localDay(row.NGAYKETTHUC):''}));
}
function validateItems(items){
 if(!Array.isArray(items)||!items.length||items.length>200)throw fail('Chọn hạng mục bảo hành và dịch vụ/phụ tùng cần xử lý.');
 const seen=new Set();for(const item of items){if(!['warranty','part','service'].includes(item.kind)||!branch.validId(item.sourceId)||!Number.isFinite(Number(item.quantity))||Number(item.quantity)<=0||Number(item.quantity)>10000)throw fail('Hạng mục hoặc số lượng không hợp lệ.');const key=item.kind+item.sourceId;if(seen.has(key))throw fail('Hạng mục bị trùng.');seen.add(key);if(String(item.note||'').length>1000)throw fail('Ghi chú hạng mục quá dài.');}
 if(!items.some(item=>item.kind==='warranty'))throw fail('Chọn ít nhất một hạng mục bảo hành còn hạn của xe.');
}
async function list(){await ensure();const s=scopeWhere();return db.query(`SELECT FIRST 200 J.*,V.BIENSO,K.NAME AS TEN_KH FROM TBAOHANHXULY J LEFT JOIN DXE V ON V.ID=J.DXEID LEFT JOIN DKHACHHANG K ON K.ID=V.DKHACHHANGID WHERE J.STATUS=1 AND ${s.sql} ORDER BY J.TIMECREATED DESC`,s.params).then(rows=>rows.map(row=>({...row,NGAY:row.NGAY?localDay(row.NGAY):''})));}
async function get(id,query=db.query,lock=false){const s=scopeWhere();const [row]=await query(`SELECT J.* FROM TBAOHANHXULY J WHERE J.ID=? AND J.STATUS=1 AND ${s.sql}${lock?' WITH LOCK':''}`,[id,...s.params]);if(!row)throw fail('Không tìm thấy phiếu xử lý bảo hành.',404);row.NGAY=row.NGAY?localDay(row.NGAY):'';row.items=await query('SELECT * FROM TBAOHANHXULYCT WHERE TBAOHANHXULYID=? ORDER BY SORTORDER',[id]);return row;}
async function save(body,user,id){
 await ensure();validateItems(body.items);if(!branch.validId(body.vehicleId)||!/^\d{4}-\d{2}-\d{2}$/.test(body.date||'')||!Number.isFinite(Date.parse(body.date))||new Date(body.date).toISOString().slice(0,10)!==body.date||String(body.note||'').length>2000)throw fail('Thông tin tiếp nhận không hợp lệ.');
 const branchId=branch.enabled()?branch.selected():null;
 return db.transaction(async(q,x,uuid)=>{
  let old;if(id){old=await get(id,q,true);if(old.TRANGTHAI>1)throw fail('Phiếu đã xác nhận; không thể đổi hạng mục.',409);if(old.DXEID!==body.vehicleId)throw fail('Không thể đổi xe của phiếu đã lưu.');}
  const [vehicle]=await q('SELECT ID FROM DXE WHERE ID=? AND STATUS=1',[body.vehicleId]);if(!vehicle)throw fail('Xe không còn hoạt động.');
  const charges=require('./defaultChargeRates'),policy=require('./pricingPolicy');
  const defaults=old?{taxRate:Number(old.TILETHUE||0),serviceRate:Number(old.TILEPHIDICHVU||0)}:await charges.loadForRepairs(q);
  const rates=charges.resolveForRepairs(body,defaults);
  const coverage=await eligible(body.vehicleId,q),lines=[];
  for(const item of body.items){
   const qty=Number(item.quantity);let name,unit='Lần',price=0,partId=null,serviceId=null;
   if(item.kind==='warranty'){const warranty=coverage.find(r=>r.ID===item.sourceId);if(!warranty)throw fail('Bảo hành đã hết hạn hoặc không thuộc xe đang chọn.',409);name=warranty.PART_NAME||warranty.SERVICE_NAME||warranty.NOTE||warranty.NAME;unit=warranty.UNITNAME||'Lần';partId=warranty.DMATHANGID;serviceId=warranty.DDICHVUID;}
   else{const part=item.kind==='part';const [catalog]=await q(`SELECT ID,NAME,${part?'GIABAN':'GIA'} AS PRICE FROM ${part?'DMATHANG':'DDICHVU'} WHERE ID=? AND STATUS=1`,[item.sourceId]);if(!catalog)throw fail('Dịch vụ hoặc phụ tùng không còn hoạt động.');name=catalog.NAME;unit=part?'Cái':'Lần';price=Number(catalog.PRICE||0);if(part)partId=catalog.ID;else serviceId=catalog.ID;}
   let tax=0,discount=0,hhKind=0,hhValue=0;
   if(item.kind!=='warranty'){
    const catalog=await policy.item(q,item.kind==='service'?1:0,item.sourceId);
    tax=policy.taxPolicy(catalog,rates,item.taxRate).taxRate;
    discount=policy.rate(item.discountRate)||0;
    const canPrice=require('../permissionPolicy').has(user,'PRICING',4);
    const prior=old?.items.find(l=>l.KIND===item.kind&&l.SOURCEID===item.sourceId);
    if(!canPrice&&(item.price!=null&&Number(item.price)!==Number(prior?.DONGIA??price)||item.taxRate!=null&&Number(item.taxRate)!==Number(prior?.TILETHUE??policy.taxPolicy(catalog,rates).taxRate)||discount!==Number(prior?.TILECHIETKHAU||0)))throw fail('Bạn cần quyền Điều chỉnh giá / Thuế / Giảm giá.',403);
    if(item.price!=null){price=Number(item.price);if(!Number.isFinite(price)||price<0||price>1e12)throw fail('Đơn giá không hợp lệ.');}
    const [hh]=await q(`SELECT HHKIEU,HHGIATRI FROM ${item.kind==='part'?'DMATHANG':'DDICHVU'} WHERE ID=?`,[item.sourceId]);hhKind=hh.HHKIEU||0;hhValue=hh.HHGIATRI||0;
   }
   lines.push({kind:item.kind,sourceId:item.sourceId,name:String(name).slice(0,255),unit:String(unit).slice(0,50),qty,price,amount:Math.round(qty*price*100)/100,partId,serviceId,note:item.note||'',tax,discount,hhKind,hhValue});
  }
  if(lines.some(l=>l.kind!=='warranty'&&l.partId)&&!body.warehouseId)throw fail('Chọn kho xuất cho phụ tùng mới được thêm vào phiếu.');
  if(body.warehouseId){const [warehouse]=await q(`SELECT ID,DCUAHANGID FROM ${branchSql.table('DKHOHANG')} WHERE ID=? AND STATUS=1`,[body.warehouseId]);if(!warehouse||branchId&&warehouse.DCUAHANGID!==branchId)throw fail('Kho không thuộc chi nhánh đang chọn.');}
  const jobId=id||uuid(),name=old?.NAME||'BHXL-'+jobId.slice(0,8).toUpperCase(),total=lines.reduce((s,l)=>s+l.amount,0),state=Number(old?.TRANGTHAI)===1?1:body.draft?0:1;
  if(id){await x('UPDATE TBAOHANHXULY SET DKHOHANGID=?,NGAY=?,NOTE=?,TONGCONG=?,TRANGTHAI=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[body.warehouseId||null,body.date,body.note||null,total,state,jobId]);await x('DELETE FROM TBAOHANHXULYCT WHERE TBAOHANHXULYID=?',[jobId]);}
  else await x('INSERT INTO TBAOHANHXULY (ID,NAME,DXEID,DCUAHANGID,DKHOHANGID,NGAY,NOTE,TONGCONG,TRANGTHAI,USERCREATEDID) VALUES (?,?,?,?,?,?,?,?,?,?)',[jobId,name,body.vehicleId,branchId,body.warehouseId||null,body.date,body.note||null,total,state,user.ID]);
  if(!require('../permissionPolicy').has(user,'PRICING',4)&&(rates.taxRate!==defaults.taxRate||rates.serviceRate!==defaults.serviceRate))throw fail('Bạn chưa có quyền đổi thuế hoặc phí dịch vụ.',403);
  const [owner]=await q('SELECT DKHACHHANGID FROM DXE WHERE ID=?',[body.vehicleId]);
  const customer=await policy.customer(q,owner?.DKHACHHANGID);
  const reduction=policy.discountPolicy(customer,body.discountRate??old?.TILEGIAMGIA);
  if(!require('../permissionPolicy').has(user,'PRICING',4)&&(reduction.discountRate!==Number(old?.TILEGIAMGIA??policy.discountPolicy(customer).discountRate)||body.discountMoney!=null&&Number(body.discountMoney)!==Number(old?.GIAMPHIEU||0)))throw fail('Bạn cần quyền Điều chỉnh giá / Thuế / Giảm giá.',403);
  policy.billDiscount(lines.map(l=>({amount:l.amount,discountRate:l.discount})),reduction.discountRate,body.discountMoney);
  await x('UPDATE TBAOHANHXULY SET TILETHUE=?,TILEPHIDICHVU=?,TILEGIAMGIA=?,GIAMPHIEU=? WHERE ID=?',[rates.taxRate,rates.serviceRate,reduction.discountRate,body.discountMoney??null,jobId]);
  for(const [i,l]of lines.entries())await x('INSERT INTO TBAOHANHXULYCT (ID,TBAOHANHXULYID,KIND,SOURCEID,DMATHANGID,DDICHVUID,NAME,UNITNAME,SOLUONG,DONGIA,THANHTIEN,NOTE,SORTORDER,TILETHUE,TILECHIETKHAU,HHKIEU,HHGIATRI) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[uuid(),jobId,l.kind,l.sourceId,l.partId,l.serviceId,l.name,l.unit,l.qty,l.price,l.amount,l.note,i,l.tax,l.discount,l.hhKind,l.hhValue]);
  await require('./warrantyAccounting').refresh(await get(jobId,q),q,x);
  return {id:jobId,name,state};
 });
}
async function transition(id,expected,user,note,assignments){
 await ensure();if(![1,2,3].includes(Number(expected)))throw fail('Bước chuyển không hợp lệ.');
 return db.transaction(async(q,x,uuid)=>{
  const job=await get(id,q,true);if(Number(job.TRANGTHAI)!==Number(expected))throw fail('Trạng thái phiếu đã thay đổi. Tải lại để tiếp tục.',409);
  if(expected===3&&require('./warrantyAccounting').totals(job).total>0)throw fail('Phiếu có chi phí phát sinh; cần xác nhận thanh toán để hoàn thành.',409);
  if(note!==undefined){if(typeof note!=='string'||note.length>2000)throw fail('Ghi chú xử lý quá dài.');job.NOTE=note;await x('UPDATE TBAOHANHXULY SET NOTE=? WHERE ID=?',[note||null,id]);}
  if(branch.enabled()&&job.DCUAHANGID!==branch.selected())throw fail('Chọn đúng chi nhánh của phiếu.');
  if(expected===2&&(await q("SELECT ID FROM TBAOHANHPHATSINH WHERE TBAOHANHXULYID=? AND STATE='pending'",[id])).length)throw fail('Còn phát sinh chờ khách xác nhận. Duyệt hoặc từ chối trước khi giao xe.',409);
  if(expected===1){
   await require('./warrantyAccounting').capture(job,assignments,q,x);
   const valid=await eligible(job.DXEID,q);if(job.items.some(l=>l.KIND==='warranty'&&!valid.some(b=>b.ID===l.SOURCEID)))throw fail('Hạng mục bảo hành đã hết hạn; kiểm tra lại trước khi xác nhận.',409);
   // A warranty line references the item already fitted to the vehicle.
   // Only separately added replacement parts consume stock.
   const parts=job.items.filter(l=>l.KIND!=='warranty'&&l.DMATHANGID).map(l=>({...l,DKHOHANGID:job.DKHOHANGID}));const stock=require('./stock');await stock.lock(x,parts.map(l=>l.DMATHANGID));await stock.requireAvailable(q,parts);
   for(const part of parts){const stockId=uuid(),[catalog]=await q('SELECT GIANHAP FROM DMATHANG WHERE ID=?',[part.DMATHANGID]);await x('INSERT INTO TXUATPHUTUNG (ID,DXEID,DMATHANGID,DKHOHANGID,SOLUONG,DONGIA,THANHTIEN,GIAVON,BAOHANH,NGAYXUAT,SLHOAN,NOTE,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,0,?,1,?,CURRENT_TIMESTAMP)',[stockId,job.DXEID,part.DMATHANGID,job.DKHOHANGID,part.SOLUONG,part.DONGIA,part.THANHTIEN,Number(catalog?.GIANHAP||0),part.KIND==='warranty'?1:0,'Bảo hành '+job.NAME,user.ID]);await x('UPDATE TBAOHANHXULYCT SET XUATID=? WHERE ID=?',[stockId,part.ID]);}
  }
  if(expected===2)for(const item of job.items.filter(l=>l.KIND==='warranty')){const [prior]=await q('SELECT KETQUAXULY FROM TBAOHANH WHERE ID=?',[item.SOURCEID]);await x('UPDATE TBAOHANH SET KETQUAXULY=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[`${prior?.KETQUAXULY||''}\nĐã xử lý theo phiếu ${job.NAME}. ${job.NOTE||''}`.trim().slice(-2000),item.SOURCEID]);}
  await x('UPDATE TBAOHANHXULY SET TRANGTHAI=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[Number(expected)+1,id]);return {id,state:Number(expected)+1};
 });
}
async function vehicles(query=db.query){
 return query(`SELECT V.ID,V.BIENSO,K.NAME AS TEN_KH FROM DXE V LEFT JOIN DKHACHHANG K ON K.ID=V.DKHACHHANGID WHERE V.STATUS=1 AND EXISTS (SELECT 1 FROM ${branchSql.table('TBAOHANH')} B WHERE B.DXEID=V.ID AND B.STATUS=1 AND B.NGAYBATDAU<=CURRENT_DATE AND B.NGAYKETTHUC>=CURRENT_DATE) ORDER BY V.BIENSO`);
}
module.exports={ensure,eligible,vehicles,validateItems,list,get,save,transition};

