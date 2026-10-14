const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const fixtureRoot=path.resolve(__dirname,'../../../backend/tmp');fs.mkdirSync(fixtureRoot,{recursive:true});
process.env.NOTIFICATION_STATE_DIR=fs.mkdtempSync(path.join(fixtureRoot,'notification-test-'));
const service=require('../../../backend/src/services/assignmentNotifications'),tenancy=require('../../../backend/src/tenancy');
test('only authenticated recipient is queried, read receipts persist and cannot mark another account',async()=>{
  const user={ID:'u1',permissions:{REPAIR:1}};
  const query=async(sql,params)=>{assert.deepEqual(params,['u1']);assert.match(sql,/U.ID=\?/);assert.match(sql,/U.STATUS=1/);assert.match(sql,/P.STATUS=1/);return [{ID:'assignment-1',REPAIRID:'repair&one',PHUTRACHCHINH:1,CODE:'LSC-1',BIENSO:'TEST',TIMECREATED:new Date()}];};
  await tenancy.run({id:'tenant-a',database:'test.fdb'},async()=>{
    let list=await service.list(user,query);assert.equal(list.unread,1);assert.equal(list.items[0].url,'/sua-chua?repairId=repair%26one');assert.match(list.items[0].title,/phụ trách chính/);
    await assert.rejects(()=>service.markRead('u1',['another-assignment'],query),e=>e.status===404);
    await service.markRead('u1',['assignment-1'],query);assert.equal((await service.list(user,query)).unread,0);
    assert.equal((await service.list({...user,permissions:{}},query)).items[0].url,null);
    assert.equal((await service.list({ID:'u2'},async()=>[])).items.length,0);
    await assert.rejects(()=>service.markRead('u1',[],query),e=>e.status===400);
  });
  // Equal user/assignment IDs in another store must not share read receipts.
  await tenancy.run({id:'tenant-b',database:'test.fdb'},async()=>assert.equal((await service.list(user,query)).unread,1));
});
test('repeated polling does not create duplicate notification files or messages',async()=>{
  await tenancy.run({id:'tenant-c',database:'test.fdb'},async()=>{
    const user={ID:'u3'},query=async()=>[{ID:'pc',REPAIRID:'r',PHUTRACHCHINH:0}];
    assert.equal((await service.list(user,query)).items.length,1);
    assert.equal((await service.list(user,query)).items.length,1);
    await service.markRead(user.ID,['pc'],query);await service.markRead(user.ID,['pc'],query);
    assert.equal((await service.list(user,query)).unread,0);
  });
});
test('notification API is accessible to linked staff without admin permissions and cannot mark someone elses message',async()=>{
  const express=require('../../../backend/node_modules/express'),db=require('../../../backend/src/db'),authorize=require('../../../backend/src/accessControl').authorize;
  const router=require('../../../backend/src/routes/notifications');
  const original=db.query;db.query=async(sql,params)=>params[0]==='staff-fixture'?[{ID:'staff-job',REPAIRID:'r',PHUTRACHCHINH:0}]:[];
  const app=express();app.use(express.json());
  app.use((req,res,next)=>{req.accessUser={ID:req.headers['x-fixture-user']||'staff-fixture',ISADMIN:0,permissions:{}};next();});
  app.use('/api/notifications',router);app.use('/api',authorize);
  const server=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
  const base='http://127.0.0.1:'+server.address().port;
  try{
    const response=await fetch(base+'/api/notifications');assert.equal(response.status,200);const data=(await response.json()).data;assert.equal(data.items.length,1);assert.equal(data.items[0].url,null);
    const mark=await fetch(base+'/api/notifications/read',{method:'POST',headers:{'Content-Type':'application/json','x-fixture-user':'other-staff'},body:JSON.stringify({ids:['staff-job']})});assert.equal(mark.status,404);
    const unknown=await fetch(base+'/api/unknown-notification-function');assert.equal(unknown.status,403);
  }finally{await new Promise(resolve=>server.close(resolve));db.query=original;}
});
