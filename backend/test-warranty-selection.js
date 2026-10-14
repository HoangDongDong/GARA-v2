const test=require('node:test'),assert=require('node:assert/strict');
test('reload restores the saved job while explicit new intake remains new',async()=>{
 const {restoreWarrantyJob,rememberWarrantyJob,readWarrantyJob}=await import('../frontend/src/utils/warrantySelection.js');
 const id='c568bf15-012b-4c39-bef3-d3b807fc575d',other='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 const jobs=[{ID:other,TRANGTHAI:1},{ID:id,TRANGTHAI:2}];
 assert.equal(restoreWarrantyJob(jobs,id,''),id);
 assert.equal(restoreWarrantyJob(jobs,'',id),id);
 assert.equal(restoreWarrantyJob(jobs,'new',id),'');
 assert.equal(restoreWarrantyJob([{ID:other,TRANGTHAI:4},{ID:id,TRANGTHAI:3}],'',''),id);
 assert.equal(restoreWarrantyJob([{ID:id,TRANGTHAI:4}],'',''),'');
 assert.equal(restoreWarrantyJob(jobs,'','new'),'');
 const values=new Map([['garage_user',JSON.stringify({ID:'user1',TENANT:{id:'store1'}})]]),sessions=new Map([['garage_branch','branch1']]);
 const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},session={getItem:k=>sessions.get(k)};
 rememberWarrantyJob(storage,session,id);assert.equal(readWarrantyJob(storage,session),id);
 sessions.set('garage_branch','branch2');assert.equal(readWarrantyJob(storage,session),'');
 sessions.set('garage_branch','branch1');rememberWarrantyJob(storage,session,'');assert.equal(readWarrantyJob(storage,session),'new');
 values.set('garage_user',JSON.stringify({ID:'user2',TENANT:{id:'store1'}}));assert.equal(readWarrantyJob(storage,session),'');
});
