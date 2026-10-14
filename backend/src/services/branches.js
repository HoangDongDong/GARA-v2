const db=require('../db'),scope=require('../branchScope');
async function list(user){
 if(!scope.enabled())return [];
 return db.query(scope.owner(user)?'SELECT ID,CODE,NAME,ISMAIN,VERSION,STATUS FROM DCUAHANG WHERE STATUS IN(0,1) ORDER BY ISMAIN DESC,NAME':`SELECT B.ID,B.CODE,B.NAME,B.ISMAIN,B.VERSION,B.STATUS,M.ISDEFAULT,M.SGROUPUSERID FROM DCUAHANG B JOIN TNGUOIDUNGTHEOCUAHANG M ON M.DCUAHANGID=B.ID WHERE B.STATUS=1 AND M.STATUS=1 AND M.SUSERID=? ORDER BY M.ISDEFAULT DESC,B.ISMAIN DESC,B.NAME`,scope.owner(user)?[]:[user.ID]);
}
async function middleware(req,res,next){
 if(!scope.enabled())return next();
 try{
  const user=req.accessUser,branches=await list(user),path=req.originalUrl.split('?')[0];
  if(!branches.length)throw scope.fail('Tài khoản chưa được cấp chi nhánh.');
  const chosen=String(req.headers['x-branch-id']||req.query.branch_id||branches[0].ID),all=chosen==='all';
  if(!scope.owner(user)&&!['GET','HEAD'].includes(req.method)&&/^\/api\/employees(?:\/[^/]+)?$/.test(path))throw scope.fail('Chỉ chủ được sửa hồ sơ nhân viên dùng chung.');
  if(all&&(!scope.owner(user)||!['GET','HEAD'].includes(req.method)))throw scope.fail('Chỉ chủ được xem tổng hợp; giao dịch phải chọn một chi nhánh.');
  if(!all&&!branches.some(b=>b.ID===chosen))throw scope.fail('Không có quyền truy cập chi nhánh này.');
  if(!scope.owner(user)&&/^\/api\/(admin-access|system-config|print-templates)(\/|$)/.test(path))throw scope.fail('Chỉ chủ được quản lý cấu hình chung và tài khoản.');
  if(!scope.owner(user)&&!['GET','HEAD'].includes(req.method)&&/^\/api\/(catalog|master-data)\/(resources\/)?(branches|stores|employees|banks|funds|bank_accounts|cash_funds)(\/|$)/.test(path))throw scope.fail('Chỉ chủ được quản lý danh mục này.');
  const selected=branches.find(b=>b.ID===chosen);
  if(!scope.owner(user)&&selected?.SGROUPUSERID){
   const rows=await db.query('SELECT F.CODE,R.MODE FROM SGROUPROLE R JOIN SFUNCTION F ON F.ID=R.SFUNCTIONID WHERE R.SGROUPUSERID=? AND R.STATUS=1 AND F.STATUS=1',[selected.SGROUPUSERID]);
   req.accessUser={...user,ISADMIN:0,permissions:Object.fromEntries(rows.map(r=>[r.CODE,Number(r.MODE||0)]))};
  }
  if(selected&&Number(selected.STATUS)===0&&!['GET','HEAD'].includes(req.method)){const reactivating=scope.owner(user)&&path===`/api/catalog/resources/stores/${chosen}/status`&&req.method==='PATCH'&&req.body.status===1;if(!reactivating)throw scope.fail('Chi nhánh đã ngừng sử dụng, chỉ được xem lịch sử.');}
  req.branch=selected||null;req.branches=branches;
  res.setHeader('X-Branch-Id',chosen);res.vary('X-Branch-Id');res.setHeader('Cache-Control','private, no-store');
  return scope.run({branchId:all?null:chosen,readIds:all?branches.map(b=>b.ID):[chosen],writeIds:all?[]:[chosen],userId:user.ID,ORGROLE:user.ORGROLE},next);
 }catch(error){next(error);}
}
async function effective(user,id){
 if(!scope.enabled()||scope.owner(user))return user;
 const branches=await list(user),branch=branches.find(b=>b.ID===id)||branches[0];
 if(!branch?.SGROUPUSERID)return user;
 const rows=await db.query('SELECT F.CODE,R.MODE FROM SGROUPROLE R JOIN SFUNCTION F ON F.ID=R.SFUNCTIONID WHERE R.SGROUPUSERID=? AND R.STATUS=1 AND F.STATUS=1',[branch.SGROUPUSERID]);
 return {...user,ISADMIN:0,permissions:Object.fromEntries(rows.map(r=>[r.CODE,Number(r.MODE||0)]))};
}
async function audit(q,action,entityId,detail,branchId=scope.current()?.branchId,actor=scope.current()?.userId){return q('INSERT INTO TBRANCHAUDIT(ID,DCUAHANGID,USERID,ACTION,ENTITYTYPE,ENTITYID,DETAIL) VALUES (?,?,?,?,?,?,?)',[db.uuidv4(),branchId,actor,action,'BRANCH',entityId,JSON.stringify(detail)]);}
module.exports={list,middleware,audit,effective};
