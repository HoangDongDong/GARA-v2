const branchSql=require('../branchSql');
const db=require('../db'),crypto=require('crypto');
const {readBlob}=require('./webReportDesigner'),{bankBin}=require('./provisionalPaymentQr');
const ID='SECONDARY_DISPLAY_CONFIG_V1',NAME='SecondaryDisplayScreens';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
function validate(screens){
  if(!screens||typeof screens!=='object'||Array.isArray(screens)||Object.keys(screens).some(key=>!['1','2','3'].includes(key)))throw fail('Cấu hình màn hình không hợp lệ.');
  if(Buffer.byteLength(JSON.stringify(screens))>8*1024*1024)throw fail('Cấu hình vượt quá 8 MB; giảm số lượng ảnh.',413);
  const result=JSON.parse(JSON.stringify(screens));
  for(const key of ['1','2','3']){
    const screen=result[key];if(!screen||!Array.isArray(screen.pages)||!screen.pages.length||screen.pages.length>30)throw fail('Mỗi màn hình cần 1–30 trang.');
    if(!['price_banner','payment_qr','repair_flow'].includes(screen.type))throw fail('Kiểu màn hình không hợp lệ.');
    for(const page of screen.pages){if(!page||typeof page!=='object'||!Number.isFinite(Number(page.interval))||Number(page.interval)<5||Number(page.interval)>3600)throw fail('Thời gian chuyển trang cần 5–3600 giây.');}
    const bank=screen.bankInfo||{};
    screen.bankInfo={...bank,accountId:String(bank.accountId||'')};
    for(const field of ['bankName','accountNo','accountName','bankBin'])delete screen.bankInfo[field];
  }
  const check=value=>{if(typeof value==='string'&&/^\s*(javascript:|data:(?!image\/(png|jpeg|webp|gif);base64,))/i.test(value))throw fail('Đường dẫn nội dung không an toàn.');if(value&&typeof value==='object')for(const child of Object.values(value))check(child);};check(result);
  return result;
}
async function accounts(query=db.query){return (await query(`SELECT ID,NAME,SOTAIKHOAN,TENNGANHANG FROM ${branchSql.table('DTAIKHOANNGANHANG')} WHERE STATUS=1 ORDER BY NAME`)).map(row=>({...row,BIN:bankBin(row.TENNGANHANG)}));}
function hydrate(screens,rows){
  if(!screens)return null;
  const result=JSON.parse(JSON.stringify(screens));
  for(const screen of Object.values(result)){
    const bank=screen.bankInfo||{},account=rows.find(row=>row.ID===bank.accountId);
    screen.bankInfo={...bank,bankName:account?.TENNGANHANG||'',accountNo:account?.SOTAIKHOAN||'',accountName:account?.NAME||'',bankBin:account?.BIN||''};
  }return result;
}
async function load(includeAccounts=true){
  const [rows,banks]=await Promise.all([db.query('SELECT TEXTVALUE,OTHERCONFIG FROM SCONFIG WHERE ID=?',[ID]),accounts()]);
  let screens=null;const row=rows[0];if(row){const content=await readBlob(row.OTHERCONFIG);if(content)screens=JSON.parse(content.toString('utf8'));}
  const [payment]=await db.query("SELECT TEXTVALUE FROM SCONFIG WHERE NAME='PaymentBankAccountId' AND STATUS=30");
  const settings=await db.query("SELECT NAME,TEXTVALUE FROM SCONFIG WHERE NAME IN ('CompanyName','CompanyAddress','CompanyPhone') AND STATUS=30");
  const company=Object.fromEntries(settings.map(row=>[row.NAME,row.TEXTVALUE||'']));
  return {screens:hydrate(screens,banks),version:row?.TEXTVALUE||null,accounts:includeAccounts?banks:[],defaultAccountId:banks.some(row=>row.ID===payment?.TEXTVALUE)?payment.TEXTVALUE:'',company:{name:company.CompanyName||'',address:company.CompanyAddress||'',hotline:company.CompanyPhone||''}};
}
async function save(screens,expectedVersion,actor){
  const value=validate(screens),version=crypto.randomUUID();
  try{await db.transaction(async(q,x)=>{
    const [row]=await q('SELECT TEXTVALUE FROM SCONFIG WHERE ID=? WITH LOCK',[ID]);
    if((row?.TEXTVALUE||null)!==(expectedVersion||null))throw fail('Cấu hình đã được thay đổi ở máy khác. Tải lại trước khi lưu.',409);
    const banks=await accounts(q);
    for(const screen of Object.values(value))if(screen.bankInfo.accountId&&!banks.some(bank=>bank.ID===screen.bankInfo.accountId))throw fail('Tài khoản ngân hàng không còn hoạt động hoặc không thuộc cửa hàng.');
    const content=Buffer.from(JSON.stringify(value),'utf8');
    if(row)await x('UPDATE SCONFIG SET OTHERCONFIG=?,TEXTVALUE=?,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[content,version,actor,ID]);
    else await x("INSERT INTO SCONFIG (ID,NAME,CAPTION,STATUS,DATATYPE,CONTROLTYPE,OTHERCONFIG,TEXTVALUE,USERCREATEDID,TIMECREATED) VALUES (?,?,'Cấu hình màn hình phụ',0,1,'1',?,?,?,CURRENT_TIMESTAMP)",[ID,NAME,content,version,actor]);
  });}catch(error){if(!error.status&&/unique/i.test(error.message))throw fail('Cấu hình đã được khởi tạo ở máy khác. Tải lại trước khi lưu.',409);throw error;}
  return load();
}

async function loadBranch(includeAccounts=true){
 const scope=require('../branchScope');if(!scope.enabled())return load(includeAccounts);
 const id=scope.selected(),[row]=await db.query(`SELECT ID,TEXTVALUE FROM ${branchSql.table('DCHINHANHCONFIG')} WHERE DCUAHANGID=? AND NAME=?`,[id,NAME]);
 let screens=null;
 if(row){const content=await db.queryBlob(`SELECT BLOBVALUE FROM ${branchSql.table('DCHINHANHCONFIG')} WHERE ID=?`,[row.ID],'BLOBVALUE');if(content)screens=JSON.parse(content.toString('utf8'));}
 else{const [branch]=await db.query('SELECT ISMAIN FROM DCUAHANG WHERE ID=?',[id]);if(Number(branch?.ISMAIN)===1)screens=(await load(false)).screens;}
 const banks=await accounts(),[payment]=await db.query("SELECT TEXTVALUE FROM SCONFIG WHERE NAME='PaymentBankAccountId' AND STATUS=30"),defaultAccountId=await require('./branchSettings').text('PaymentBankAccountId',payment?.TEXTVALUE||'',id);
 const company=await require('./salesPrint').company(id);
 return {screens:hydrate(screens,banks),version:row?.TEXTVALUE||null,accounts:includeAccounts?banks:[],defaultAccountId:banks.some(b=>b.ID===defaultAccountId)?defaultAccountId:'',company:{name:company.CompanyName,address:company.CompanyAddress,hotline:company.CompanyPhone}};
}
async function saveBranch(screens,expectedVersion,actor){
 const scope=require('../branchScope');if(!scope.enabled())return save(screens,expectedVersion,actor);
 const branch=scope.selected(),value=validate(screens),version=crypto.randomUUID();
 await db.transaction(async(q,x,uuid)=>{
  await x('UPDATE DCUAHANG SET VERSION=VERSION WHERE ID=?',[branch]);
  const [row]=await q('SELECT ID,TEXTVALUE FROM DCHINHANHCONFIG WHERE DCUAHANGID=? AND NAME=?',[branch,NAME]);
  if((row?.TEXTVALUE||null)!==(expectedVersion||null))throw fail('Cấu hình đã thay đổi ở máy khác. Tải lại trước khi lưu.',409);
  const banks=await accounts(q);for(const screen of Object.values(value))if(screen.bankInfo.accountId&&!banks.some(b=>b.ID===screen.bankInfo.accountId))throw fail('Tài khoản ngân hàng không thuộc chi nhánh.');
  if(row)await x('UPDATE DCHINHANHCONFIG SET BLOBVALUE=?,TEXTVALUE=?,VERSION=VERSION+1,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[JSON.stringify(value),version,actor,row.ID]);
  else await x('INSERT INTO DCHINHANHCONFIG(ID,DCUAHANGID,NAME,BLOBVALUE,TEXTVALUE,USERMODIFIEDID,TIMEMODIFIED) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)',[uuid(),branch,NAME,JSON.stringify(value),version,actor]);
 });return loadBranch();
}
module.exports={ID,NAME,validate,hydrate,accounts,load:loadBranch,save:saveBranch};
