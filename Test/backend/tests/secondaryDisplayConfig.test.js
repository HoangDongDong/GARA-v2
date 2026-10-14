const test=require('node:test'),assert=require('node:assert/strict');
const service=require('../../../backend/src/services/secondaryDisplayConfig');
const screens=()=>Object.fromEntries(['1','2','3'].map(id=>[id,{id,type:id==='2'?'payment_qr':'price_banner',bankInfo:{accountId:'bank-a',bankName:'forged',accountNo:'wrong',accountName:'wrong',bankBin:'970000'},pages:[{interval:15,banners:[]}]}]));
test('display config stores account IDs only and resolves payment information from tenant bank catalog',()=>{
  const validated=service.validate(screens());assert.equal(validated['2'].bankInfo.accountId,'bank-a');assert.equal(validated['2'].bankInfo.accountNo,undefined);
  const hydrated=service.hydrate(validated,[{ID:'bank-a',TENNGANHANG:'ACB',SOTAIKHOAN:'000000123',NAME:'Owner A',BIN:'970416'}]);
  assert.equal(hydrated['2'].bankInfo.accountNo,'000000123');assert.equal(hydrated['2'].bankInfo.bankName,'ACB');assert.equal(hydrated['2'].bankInfo.bankBin,'970416');
  const removed=service.hydrate(validated,[]);assert.equal(removed['2'].bankInfo.accountNo,'');assert.equal(removed['2'].bankInfo.bankBin,'');
});
test('invalid display pages, oversized JSON and unsafe content are rejected',()=>{
  const empty=screens();empty['1'].pages=[];assert.throws(()=>service.validate(empty),/1–30/);
  const timing=screens();timing['1'].pages[0].interval=0;assert.throws(()=>service.validate(timing),/5–3600/);
  const unsafe=screens();unsafe['1'].pages[0].bgCustomUrl='javascript:alert(1)';assert.throws(()=>service.validate(unsafe),/an toàn/);
  const large=screens();large['1'].name='x'.repeat(9*1024*1024);assert.throws(()=>service.validate(large),e=>e.status===413);
});
test('display API lets authorized sales staff read but only administrators write',async()=>{
  const router=require('../../../backend/src/routes/secondaryDisplayConfig');
  const handler=method=>router.stack.find(layer=>layer.route?.methods[method]).route.stack[0].handle;
  const original={load:service.load,save:service.save};let includedAccounts,actor,called=false;
  service.load=async include=>(includedAccounts=include,called=true,{screens:null,accounts:[]});
  service.save=async(s,v,a)=>(actor=a,called=true,{screens:s,version:'saved'});
  async function call(method,user){let status=200;await handler(method)({accessUser:user,body:{screens:screens(),version:null,actor:'spoof'}},{set(){return this;},status(value){status=value;return this;},json(){}});return status;}
  try{
    assert.equal(await call('get',{ID:'u',ISADMIN:0,permissions:{}}),403);assert.equal(called,false);
    assert.equal(await call('get',{ID:'u',ISADMIN:0,permissions:{SALES:1}}),200);assert.equal(includedAccounts,false);
    called=false;assert.equal(await call('put',{ID:'u',ISADMIN:0,permissions:{SALES:31}}),403);assert.equal(called,false);
    assert.equal(await call('put',{ID:'admin-fixture',ISADMIN:1}),200);assert.equal(actor,'admin-fixture');
  }finally{Object.assign(service,original);}
});
test('real Firebird stores BLOB display config, rejects conflicts/foreign bank and retains catalog authority',{skip:process.env.TEST_FIREBIRD!=='1'},async()=>{
  const db=require('../../../backend/src/db'),original={query:db.query,transaction:db.transaction};
  const rollback=Error('DISPLAY_TEST_ROLLBACK');
  await assert.rejects(original.transaction(async(q,x,uuid)=>{
    db.query=q;db.transaction=task=>task(q,x,uuid);
    try{
      await x('DELETE FROM SCONFIG WHERE ID=?',[service.ID]);
      const bank=uuid();await x("INSERT INTO DTAIKHOANNGANHANG (ID,NAME,SOTAIKHOAN,TENNGANHANG,STATUS,USERCREATEDID) VALUES (?,'Display fixture','000000123','ACB',1,'TEST')",[bank]);
      const initial=screens();for(const screen of Object.values(initial))screen.bankInfo.accountId=bank;
      const saved=await service.save(initial,null,'TEST');assert.equal(saved.screens['2'].bankInfo.accountNo,'000000123');
      assert.ok(saved.version);assert.equal((await service.load(false)).accounts.length,0);
      await assert.rejects(()=>service.save(initial,null,'TEST'),e=>e.status===409);
      const foreign=screens();await assert.rejects(()=>service.save(foreign,saved.version,'TEST'),e=>e.status===400);
      await x("UPDATE DTAIKHOANNGANHANG SET SOTAIKHOAN='000000456' WHERE ID=?",[bank]);assert.equal((await service.load()).screens['2'].bankInfo.accountNo,'000000456');
      await x('UPDATE DTAIKHOANNGANHANG SET STATUS=0 WHERE ID=?',[bank]);assert.equal((await service.load()).screens['2'].bankInfo.accountNo,'');
      throw rollback;
    }finally{Object.assign(db,original);}
  }),error=>error===rollback);
});
