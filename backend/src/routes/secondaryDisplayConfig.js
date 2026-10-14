const router=require('express').Router(),service=require('../services/secondaryDisplayConfig'),{has}=require('../permissionPolicy');
const admin=user=>Number(user.ISADMIN)===1;
router.get('/',async(req,res)=>{
  if(!admin(req.accessUser)&&!['SALES','REPAIR','SETTINGS'].some(code=>has(req.accessUser,code,1)))return res.status(403).json({error:'Bạn không có quyền xem màn hình phụ.'});
  try{res.set('Cache-Control','no-store').json({data:await service.load(admin(req.accessUser))});}catch(error){console.error('Display config:',error.message);res.status(503).json({error:'Chưa tải được cấu hình màn hình phụ.'});}
});
router.put('/',async(req,res)=>{
  if(!admin(req.accessUser))return res.status(403).json({error:'Chỉ Admin được lưu cấu hình màn hình phụ.'});
  try{res.json({data:await service.save(req.body.screens,req.body.version,req.accessUser.ID)});}catch(error){res.status(error.status||503).json({error:error.status?error.message:'Chưa lưu được cấu hình màn hình phụ.'});}
});
module.exports=router;
