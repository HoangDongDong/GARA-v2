const branchSql=require('../branchSql');
const db=require('../db'),scope=require('../branchScope'),sql=require('../branchSql');
const names=['CompanyName','CompanyAddress','CompanyPhone','LoiCamOn','PaymentBankAccountId'];
async function text(name,fallback='',id=scope.current()?.branchId,query=db.query){
 if(!scope.enabled()||!id)return fallback;
 if(!scope.current()?.maintenance&&!scope.current()?.readIds.includes(id))throw scope.fail('Không có quyền đọc cấu hình chi nhánh.');
 const [setting]=await query(`SELECT TEXTVALUE FROM ${sql.table('DCHINHANHCONFIG')} WHERE DCUAHANGID=? AND NAME=?`,[id,name]);
 if(setting)return setting.TEXTVALUE||'';
 const [branch]=await query(`SELECT NAME,DIACHI,DIENTHOAI,ISMAIN FROM ${branchSql.table('DCUAHANG')} WHERE ID=?`,[id]);
 if(!branch||Number(branch.ISMAIN)===1)return fallback;
 return ({CompanyName:branch.NAME,CompanyAddress:branch.DIACHI||'',CompanyPhone:branch.DIENTHOAI||'',PaymentBankAccountId:''})[name]??fallback;
}
async function load(id,user=scope.current()){
 const caller=scope.current(),owner=scope.owner(user);
 return scope.run({branchId:id,readIds:[id],writeIds:[id],userId:caller?.userId},async()=>{
  const settings=await db.query('SELECT NAME,TEXTVALUE FROM SCONFIG WHERE STATUS=30'),values={};
  for(const n of names)values[n]=await text(n,settings.find(s=>s.NAME===n)?.TEXTVALUE||'',id);
  const [branch]=await db.query('SELECT VERSION FROM DCUAHANG WHERE ID=?',[id]);
  const accounts=await db.query(`SELECT ID,NAME,TENNGANHANG,SOTAIKHOAN,SHAREDORG,DCUAHANGID FROM ${sql.table('DTAIKHOANNGANHANG')} WHERE STATUS=1 ORDER BY NAME`);
  // Organization owners can re-enable sharing even after an account stops
  // being available for payment at the selected branch.
  const managedAccounts=owner?await db.query(`SELECT A.ID,A.NAME,A.TENNGANHANG,A.SOTAIKHOAN,A.SHAREDORG,A.DCUAHANGID,B.NAME AS BRANCHNAME FROM DTAIKHOANNGANHANG A LEFT JOIN DCUAHANG B ON B.ID=A.DCUAHANGID WHERE A.STATUS=1 ORDER BY B.NAME,A.NAME`):accounts;
  return {values,version:Number(branch.VERSION),accounts,managedAccounts};
 });
}
async function save(id,values,actor,expectedVersion=null){return scope.run({branchId:id,readIds:[id],writeIds:[id],userId:actor},()=>db.transaction(async(q,x,uuid)=>{
 if(Object.keys(values).some(n=>!names.includes(n)))throw scope.fail('Trường cấu hình không hợp lệ.',400);
 await x('UPDATE DCUAHANG SET VERSION=VERSION WHERE ID=? AND STATUS=1',[id]);const [branch]=await q('SELECT VERSION FROM DCUAHANG WHERE ID=?',[id]);if(expectedVersion!==null&&Number(expectedVersion)!==Number(branch.VERSION))throw scope.fail('Cấu hình đã thay đổi. Tải lại trước khi lưu.',409);
 if(values.PaymentBankAccountId)await require('./paymentAccountConfig').validateAccount(q,values.PaymentBankAccountId);
 for(const [name,value]of Object.entries(values)){if(typeof value!=='string'||value.length>2048)throw scope.fail('Nội dung tối đa 2048 ký tự.',400);const [old]=await q(`SELECT ID FROM ${branchSql.table('DCHINHANHCONFIG')} WHERE DCUAHANGID=? AND NAME=?`,[id,name]);if(old)await x('UPDATE DCHINHANHCONFIG SET TEXTVALUE=?,VERSION=VERSION+1,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[value,actor,old.ID]);else await x('INSERT INTO DCHINHANHCONFIG(ID,DCUAHANGID,NAME,TEXTVALUE,USERMODIFIEDID,TIMEMODIFIED) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)',[uuid(),id,name,value,actor]);}
 await x('UPDATE DCUAHANG SET VERSION=VERSION+1 WHERE ID=?',[id]);await require('./branches').audit(x,'BRANCH_SETTINGS',id,{fields:Object.keys(values)});return {ok:true};
 }));}
module.exports={text,load,save,names};
