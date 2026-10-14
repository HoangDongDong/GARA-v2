const test=require('node:test'),assert=require('node:assert/strict');
const scope=require('../../../backend/src/branchScope'),sql=require('../../../backend/src/branchSql');
const A='418a09a4-de81-4fdc-8c49-1ee7b7855230',B='b807fb92-9b79-453d-a93a-1aa78e1ce73b';
test('parallel branch contexts, invalid grants, locked rows and explicit maintenance',async()=>{
 const prior=process.env.MULTIBRANCH_ENABLED;process.env.MULTIBRANCH_ENABLED='true';
 try{
  const values=await Promise.all([scope.run({branchId:A,readIds:[A],writeIds:[A]},async()=>{await new Promise(r=>setTimeout(r,8));return scope.selected();}),scope.run({branchId:B,readIds:[B],writeIds:[B]},async()=>{await new Promise(r=>setTimeout(r,1));return scope.selected();})]);
  assert.deepEqual(values,[A,B]);assert.equal(scope.current(),undefined);
  assert.throws(()=>scope.run({readIds:[A],writeIds:[B]},()=>{}));assert.throws(()=>scope.run({readIds:['bad']},()=>{}));assert.throws(()=>scope.selected());
  assert.equal(sql.table('TDONHANG'),'V_B_TDONHANG');assert.equal(sql.lockPredicate('TDONHANG'),'ID IN (SELECT ID FROM V_B_TDONHANG) AND ');
  assert.equal(await scope.maintenance(()=>sql.table('TDONHANG')),'TDONHANG');assert.throws(()=>sql.table('TDONHANG; DELETE FROM SUSER'));
  assert.equal(scope.owner({ISADMIN:1,ORGROLE:'STAFF'}),false);assert.equal(scope.owner({ORGROLE:'OWNER'}),true);
 }finally{if(prior===undefined)delete process.env.MULTIBRANCH_ENABLED;else process.env.MULTIBRANCH_ENABLED=prior;}
});
