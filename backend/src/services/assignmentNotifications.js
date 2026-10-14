const branchSql=require('../branchSql');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const db=require('../db'),tenancy=require('../tenancy');
const root=()=>path.resolve(process.env.NOTIFICATION_STATE_DIR||path.resolve(__dirname,'../../storage/notifications'));
const file=userId=>path.join(tenancy.storageDirectory(root()),crypto.createHash('sha256').update(String(userId)+':'+(require('../branchScope').enabled()?require('../branchScope').current()?.branchId||'all':'legacy')).digest('hex')+'.json');
function readState(userId){try{return JSON.parse(fs.readFileSync(file(userId),'utf8'));}catch(error){if(error.code==='ENOENT')return {};throw error;}}
async function assignments(userId,query=db.query){
  // Recipient comes from the authenticated account, never a caller-supplied employee.
  return query(`SELECT FIRST 200 P.ID,P.TLENHSUACHUAID AS REPAIRID,P.PHUTRACHCHINH,P.TIMECREATED,
      L.NAME AS CODE,V.BIENSO
    FROM ${branchSql.table('TPHANCONGNHANVIEN')} P
    JOIN SUSER U ON U.DNHANVIENID=P.DNHANVIENID AND U.ID=? AND U.STATUS=1
    JOIN ${branchSql.table('DNHANVIEN')} N ON N.ID=P.DNHANVIENID AND N.STATUS=1
    JOIN ${branchSql.table('TLENHSUACHUA')} L ON L.ID=P.TLENHSUACHUAID AND L.STATUS=1
    LEFT JOIN DXE V ON V.ID=L.DXEID
    WHERE P.STATUS=1 AND P.TILECHIA IS NOT NULL ORDER BY P.TIMECREATED DESC,P.ID`,[userId]);
}
async function list(user,query=db.query){
  const rows=await assignments(user.ID,query),state=readState(user.ID);
  const items=rows.map(row=>({id:row.ID,repairId:row.REPAIRID,created:row.TIMECREATED,read:!!state[row.ID],
    title:Number(row.PHUTRACHCHINH)===1?'Bạn được phân công phụ trách chính':'Bạn được phân công công việc',
    message:[row.CODE||'Lệnh sửa chữa',row.BIENSO].filter(Boolean).join(' · '),
    url:(Number(user.ISADMIN)===1||(Number(user.permissions?.REPAIR||0)&1))?'/sua-chua?repairId='+encodeURIComponent(row.REPAIRID):null}));
  return {items,unread:items.filter(item=>!item.read).length};
}
async function markRead(userId,ids,query=db.query){
  if(!Array.isArray(ids)||!ids.length||ids.length>200||ids.some(id=>typeof id!=='string'||id.length>100))throw Object.assign(Error('Danh sách thông báo không hợp lệ.'),{status:400});
  const rows=await assignments(userId,query),allowed=new Set(rows.map(row=>row.ID));
  if(ids.some(id=>!allowed.has(id)))throw Object.assign(Error('Không tìm thấy thông báo của tài khoản.'),{status:404});
  // Synchronous read/write after async checks prevents overlapping read receipts from losing updates.
  const state=readState(userId),next=Object.fromEntries(rows.filter(row=>state[row.ID]).map(row=>[row.ID,state[row.ID]]));
  for(const id of ids)next[id]=new Date().toISOString();
  const target=file(userId);fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target+'.tmp',JSON.stringify(next),{mode:0o600});fs.renameSync(target+'.tmp',target);
}
module.exports={assignments,list,markRead};
