const router=require('express').Router(),db=require('../db'),scope=require('../branchScope'),service=require('../services/branches');
router.use((req,res,next)=>scope.enabled()?next():res.status(404).json({error:'Chưa bật quản lý chi nhánh.'}));
router.get('/',async(req,res,next)=>{try{res.json({data:await service.list(req.accessUser),owner:scope.owner(req.accessUser)});}catch(e){next(e);}});
router.use((req,res,next)=>scope.owner(req.accessUser)?next():res.status(403).json({error:'Chỉ chủ được quản lý chi nhánh.'}));
router.get('/members',async(req,res,next)=>{try{res.json({data:await db.query(`SELECT M.ID,M.SUSERID,M.DCUAHANGID,M.STATUS,M.ISDEFAULT,M.SGROUPUSERID,M.VERSION,U.USERNAME,U.NAME,B.NAME AS BRANCHNAME FROM TNGUOIDUNGTHEOCUAHANG M JOIN SUSER U ON U.ID=M.SUSERID JOIN DCUAHANG B ON B.ID=M.DCUAHANGID ORDER BY U.USERNAME,B.NAME`),users:await db.query('SELECT ID,USERNAME,NAME,ORGROLE FROM SUSER WHERE STATUS=1'),groups:await db.query('SELECT ID,NAME FROM SGROUPUSER WHERE STATUS=1'),employees:await db.query('SELECT ID,NAME FROM DNHANVIEN WHERE STATUS=1'),assignments:await db.query('SELECT DNHANVIENID,DCUAHANGID,STATUS FROM TNHANVIENCHINHANH')});}catch(e){next(e);}});
router.put('/members',async(req,res,next)=>{try{
 const {userId,branchId,groupId=null,status=1,isDefault=false,version=null}=req.body;
 if(!scope.validId(userId)||!scope.validId(branchId)||groupId&&!scope.validId(groupId))throw scope.fail('Thông tin phân quyền không hợp lệ.',400);
 await db.transaction(async(q,x,uuid)=>{
  if(!(await q('SELECT ID FROM SUSER WHERE ID=? AND STATUS=1',[userId])).length||!(await q('SELECT ID FROM DCUAHANG WHERE ID=? AND STATUS=1',[branchId])).length)throw scope.fail('Tài khoản hoặc chi nhánh không tồn tại.',400);
  if(groupId&&!(await q('SELECT ID FROM SGROUPUSER WHERE ID=? AND STATUS=1',[groupId])).length)throw scope.fail('Nhóm quyền không tồn tại.',400);
  await x('UPDATE SUSER SET TIMEMODIFIED=TIMEMODIFIED WHERE ID=?',[userId]);
  const [old]=await q('SELECT ID,VERSION FROM TNGUOIDUNGTHEOCUAHANG WHERE SUSERID=? AND DCUAHANGID=?',[userId,branchId]);
  if(old&&version!==null&&Number(version)!==Number(old.VERSION))throw scope.fail('Phân quyền đã thay đổi. Tải lại trước khi lưu.',409);
  if(isDefault)await x('UPDATE TNGUOIDUNGTHEOCUAHANG SET ISDEFAULT=0 WHERE SUSERID=?',[userId]);
  if(old)await x('UPDATE TNGUOIDUNGTHEOCUAHANG SET STATUS=?,ISDEFAULT=?,SGROUPUSERID=?,VERSION=VERSION+1 WHERE ID=?',[Number(status)===1?1:0,isDefault?1:0,groupId,old.ID]);
  else await x('INSERT INTO TNGUOIDUNGTHEOCUAHANG(ID,SUSERID,DCUAHANGID,STATUS,ISDEFAULT,SGROUPUSERID,VERSION,USERCREATEDID,TIMECREATED) VALUES (?,?,?,?,?,?,0,?,CURRENT_TIMESTAMP)',[uuid(),userId,branchId,Number(status)===1?1:0,isDefault?1:0,groupId,req.accessUser.ID]);
  await service.audit(x,'ASSIGN_USER',userId,{branchId,status,groupId,isDefault},branchId,req.accessUser.ID);
 });res.json({ok:true});
 }catch(e){next(e);}});
router.put('/employees',async(req,res,next)=>{try{const {employeeId,branchId,status=1}=req.body;if(!scope.validId(employeeId)||!scope.validId(branchId))throw scope.fail('Thông tin nhân viên không hợp lệ.',400);await db.transaction(async(q,x,uuid)=>{const [old]=await q('SELECT ID FROM TNHANVIENCHINHANH WHERE DNHANVIENID=? AND DCUAHANGID=?',[employeeId,branchId]);await x('UPDATE OR INSERT INTO TNHANVIENCHINHANH(ID,DNHANVIENID,DCUAHANGID,STATUS) VALUES (?,?,?,?) MATCHING(ID)',[old?.ID||uuid(),employeeId,branchId,Number(status)===1?1:0]);await service.audit(x,'ASSIGN_EMPLOYEE',employeeId,{branchId,status},branchId,req.accessUser.ID);});res.json({ok:true});}catch(e){next(e);}});

router.get('/:id/settings',async(req,res,next)=>{try{if(!(await service.list(req.accessUser)).some(b=>b.ID===req.params.id))throw scope.fail('Chi nhánh không hoạt động.',404);res.json(await require('../services/branchSettings').load(req.params.id,req.accessUser));}catch(e){next(e);}});
router.put('/:id/settings',async(req,res,next)=>{try{if(!(await service.list(req.accessUser)).some(b=>b.ID===req.params.id))throw scope.fail('Chi nhánh không hoạt động.',404);res.json(await require('../services/branchSettings').save(req.params.id,req.body.values||req.body,req.accessUser.ID,req.body.version??null));}catch(e){next(e);}});

router.put('/bank-accounts/:id/shared',async(req,res,next)=>{try{
 if(typeof req.body.shared!=='boolean')throw scope.fail('Trạng thái dùng chung không hợp lệ.',400);
 const [bank]=await db.query('SELECT DCUAHANGID FROM DTAIKHOANNGANHANG WHERE ID=? AND STATUS=1',[req.params.id]);if(!bank)throw scope.fail('Không tìm thấy tài khoản ngân hàng.',404);
 await scope.run({branchId:bank.DCUAHANGID,readIds:[bank.DCUAHANGID],writeIds:[bank.DCUAHANGID],userId:req.accessUser.ID},()=>db.transaction(async(q,x)=>{await x('UPDATE DTAIKHOANNGANHANG SET SHAREDORG=?,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[req.body.shared?1:0,req.accessUser.ID,req.params.id]);await service.audit(x,'SHARE_BANK',req.params.id,{shared:req.body.shared});}));res.json({ok:true});
 }catch(e){next(e);}});
module.exports=router;
