const router=require('express').Router(),service=require('../services/assignmentNotifications');
router.get('/',async(req,res)=>{try{res.set('Cache-Control','no-store').json({data:await service.list(req.accessUser)});}catch(error){console.error('Notifications:',error.message);res.status(503).json({error:'Chưa tải được thông báo.'});}});
router.post('/read',async(req,res)=>{try{await service.markRead(req.accessUser.ID,req.body.ids);res.json({ok:true});}catch(error){res.status(error.status||503).json({error:error.status?error.message:'Chưa cập nhật được thông báo.'});}});
module.exports=router;
