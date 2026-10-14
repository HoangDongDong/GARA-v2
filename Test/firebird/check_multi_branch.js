// Destructive fixtures are permitted only in a separately restored test database.
const testPath=require('path'),testFs=require('fs');
const database=process.env.BRANCH_TEST_DB;
if(!database||!testPath.isAbsolute(database))throw Error('Set BRANCH_TEST_DB to an absolute path for a restored test database.');
const real=testFs.realpathSync(database),sourceRoot=testFs.realpathSync(testPath.resolve(__dirname,'../..'));
if(real.toLowerCase().startsWith(sourceRoot.toLowerCase()+testPath.sep)||!testPath.basename(real).toLowerCase().endsWith('.branch-test.fdb'))throw Error('Only an external *.branch-test.fdb fixture is permitted. Never run against GARAGE.FDB.');
process.env.MULTIBRANCH_ENABLED='false';
const assert=require('assert/strict'),fs=require('fs'),root='../../backend/src/';
const tenancy=require(root+'tenancy'),scope=require(root+'branchScope'),db=require(root+'db'),platform=require(root+'services/platform');
const tenant={id:'legacy',code:'kazuko',name:'KAZUKO',state:'active',database:real};
const originalFind=platform.find;platform.find=async id=>id==='legacy'?tenant:originalFind(id);
const A='418a09a4-de81-4fdc-8c49-1ee7b7855230',B='b807fb92-9b79-453d-a93a-1aa78e1ce73b';
tenancy.run(tenant,async()=>{

 await require(root+'services/branchViewMigration').install();
 process.env.MULTIBRANCH_ENABLED='true';
 const run=(branch,f)=>scope.run({branchId:branch,readIds:[branch],writeIds:[branch],userId:'e3473acf-7ea6-4815-b037-0973bb3babaf'},f);
 const stock=require(root+'services/stock'),transfer=require(root+'services/inventoryTransfers'),warehouse=db.uuidv4();
 await run(B,()=>db.execute('INSERT INTO DKHOHANG(ID,NAME,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,?,1,?,CURRENT_TIMESTAMP)',[warehouse,'Kho kiểm thử chi nhánh','e3473acf-7ea6-4815-b037-0973bb3babaf']));
 const [source]=await run(A,()=>db.query(`SELECT FIRST 1 M.ID,K.ID AS KHO FROM DMATHANG M CROSS JOIN V_B_DKHOHANG K WHERE M.STATUS=1 AND K.STATUS=1 AND ${stock.expression('M.ID','K.ID')}>3`));assert.ok(source,'Test copy needs at least four units of one part in the main branch.');
 const sent=await run(A,()=>transfer.create({sourceWarehouse:source.KHO,targetWarehouse:warehouse,items:[{partId:source.ID,quantity:2}]}));await run(A,()=>transfer.send(sent.id));
 const h=await run(B,()=>transfer.detail(sent.id));await run(B,()=>transfer.receive(h.ID,{items:[{id:h.items[0].ID,quantity:1}]}));await run(B,()=>transfer.receive(h.ID,{items:[{id:h.items[0].ID,quantity:1}]}));await run(B,()=>transfer.receive(h.ID,{items:[{id:h.items[0].ID,quantity:2}]}));
 const owner=await require(root+'accessControl').loadAccessUser('e3473acf-7ea6-4815-b037-0973bb3babaf');
 const staff=await require(root+'accessControl').loadAccessUser('d2cd3777-d9cf-4153-8a37-174def905799');
 const token=require(root+'authSecurity').signToken(owner.ID,owner.credentialVersion,{tenantId:'legacy'}),staffToken=require(root+'authSecurity').signToken(staff.ID,staff.credentialVersion,{tenantId:'legacy'});
 const {app}=require(root+'server');const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 async function get(url,branch=A,t=token){const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+url,{headers:{Authorization:'Bearer '+t,'X-Branch-Id':branch}});const body=await response.text();return {status:response.status,body,data:response.headers.get('content-type')?.includes('json')?JSON.parse(body):null};}
 try{

  // Warm sockets outside any branch before exercising transactions. Driver
  // callbacks must retain the caller context even when the pool was opened
  // by authentication or another request.
  await Promise.all([1,2,3].map(()=>db.query('SELECT 1 AS N FROM RDB$DATABASE')));
  for(const branch of [A,B,A,B])await run(branch,()=>db.transaction(async query=>{
   assert.equal(scope.selected(),branch);
   const [context]=await query("SELECT RDB$GET_CONTEXT('USER_SESSION','BRANCH_CURRENT') AS BRANCH FROM RDB$DATABASE");
   assert.equal(context.BRANCH,branch);assert.equal(scope.selected(),branch);
   assert.equal(tenancy.current().id,'legacy');
  }));

  async function write(route,branch,body,method='POST',key=require('crypto').randomUUID()){const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+route,{method,headers:{Authorization:'Bearer '+token,'X-Branch-Id':branch,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});const value=await r.json();assert.equal(r.status,200,route+' '+JSON.stringify(value));return value;}
  const [bank]=await run(A,()=>db.query('SELECT FIRST 1 ID FROM V_B_DTAIKHOANNGANHANG WHERE STATUS=1 AND DCUAHANGID=?',[A]));assert.ok(bank);
  await write('branches/bank-accounts/'+bank.ID+'/shared',B,{shared:true},'PUT');
  let bankSettings=(await get('branches/'+B+'/settings',B)).data;
  assert.ok(bankSettings.accounts.some(a=>a.ID===bank.ID));
  await write('branches/bank-accounts/'+bank.ID+'/shared',B,{shared:false},'PUT');
  bankSettings=(await get('branches/'+B+'/settings',B)).data;
  assert.ok(!bankSettings.accounts.some(a=>a.ID===bank.ID));
  assert.ok(bankSettings.managedAccounts.some(a=>a.ID===bank.ID&&Number(a.SHAREDORG)===0&&a.BRANCHNAME));
  await write('branches/bank-accounts/'+bank.ID+'/shared',B,{shared:true},'PUT');
  assert.ok((await get('branches/'+B+'/settings',B)).data.accounts.some(a=>a.ID===bank.ID));
  assert.equal((await get('branches/'+A+'/settings',A,staffToken)).status,403);
  await write('branches/bank-accounts/'+bank.ID+'/shared',B,{shared:false},'PUT');
  console.log('PASS owner can re-enable bank sharing from another branch; payment choices and staff access remain restricted.');
  const [employee]=await db.query('SELECT FIRST 1 ID FROM DNHANVIEN WHERE STATUS=1');
  if(!(await db.query('SELECT ID FROM TNHANVIENCHINHANH WHERE DNHANVIENID=? AND DCUAHANGID=?',[employee.ID,B])).length)await db.execute('INSERT INTO TNHANVIENCHINHANH(ID,DNHANVIENID,DCUAHANGID,STATUS,USERCREATEDID) VALUES(?,?,?,1,?)',[db.uuidv4(),employee.ID,B,owner.ID]);
  const [supplier]=await db.query('SELECT FIRST 1 ID FROM DNHACUNGCAP WHERE STATUS=1');
  const receiptBody={DNHACUNGCAPID:supplier.ID,DKHOHANGID:warehouse,DNHANVIENID:employee.ID,NGAY:'2026-10-14',TIENHANG:200000,TIENGIAMGIA:0,TONGCONG:200000,TIENTHANHTOAN:0,items:[{DMATHANGID:source.ID,SOLUONG:1,DONGIA:200000,THANHTIEN:200000}]},receiptKey=require('crypto').randomUUID();
  const receipt=await write('inventory-receipts',B,receiptBody,'POST',receiptKey),receiptRetry=await write('inventory-receipts',B,receiptBody,'POST',receiptKey);
  assert.equal(receipt.id,receiptRetry.id);assert.ok(!receipt.code.startsWith('01-'));
  assert.equal((await get('inventory-receipts/'+receipt.id,A)).status,404);assert.equal((await get('inventory-receipts/'+receipt.id,B)).status,200);
  console.log('PASS warmed pool tenant/branch context and receipt save + retry + branch isolation.');
  const [part]=await scope.run({branchId:B,readIds:[B],writeIds:[B]},()=>db.query(`SELECT FIRST 1 M.ID,K.ID AS KHO,${require(root+'services/stock').expression('M.ID','K.ID')} AS SL FROM DMATHANG M CROSS JOIN V_B_DKHOHANG K WHERE M.STATUS=1 AND K.STATUS=1 AND ${require(root+'services/stock').expression('M.ID','K.ID')}>1`));assert.ok(part);
  const [customer]=await db.query('SELECT FIRST 1 ID FROM DKHACHHANG WHERE STATUS=1');
  const body={DKHOXUATID:part.KHO,DKHACHHANGID:customer.ID,items:[{DMATHANGID:part.ID,SOLUONG:1}]},key=require('crypto').randomUUID();
  const sale=await write('sales',B,body,'POST',key),retry=await write('sales',B,body,'POST',key);assert.equal(sale.id,retry.id);assert.ok(!sale.code.startsWith('01-'));
  assert.equal((await get('sales/'+sale.id,A)).status,404);
  const printed=await get('printing/MauHoaDonBanHang/'+sale.id+'/pdf',B);assert.equal(printed.status,200,printed.body.slice(0,500));
  const documentPrint=require(root+'services/documentPrint');
  const printPayload=await run(B,()=>documentPrint.payload(documentPrint.typeByKey('MauHoaDonBanHang'),sale.id,{},owner.NAME));
  assert.equal(printPayload.parameters.DocNumber,sale.code);
  const [service]=await db.query('SELECT FIRST 1 ID,GIA FROM DDICHVU WHERE STATUS=1');const vehicle=db.uuidv4();
  const beforeVehicles=(await get('reports/dashboard',B)).data;
  await db.execute('INSERT INTO DXE(ID,NAME,BIENSO,DKHACHHANGID,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,?,?,?,1,?,CURRENT_TIMESTAMP)',[vehicle,'Xe thử chi nhánh','CN-'+vehicle.slice(0,8),customer.ID,owner.ID]);
  const afterProfile=(await get('reports/dashboard',B)).data;assert.deepEqual(afterProfile,beforeVehicles);
  for(const branch of [A,B])assert.ok(!(await get('workflow/board',branch)).data.data.some(r=>r.DXEID===vehicle||r.PROFILE_ONLY));
  const repair=await write('repair-orders',B,{DXEID:vehicle,DKHACHHANGID:customer.ID,items:[{LOAI:1,DDICHVUID:service.ID,SOLUONG:1,DONGIA:Number(service.GIA)}]});
  assert.ok((await get('workflow/board',B)).data.data.some(r=>r.DXEID===vehicle));
  assert.ok(!(await get('workflow/board',A)).data.data.some(r=>r.DXEID===vehicle));
  const afterReception=(await get('reports/dashboard',B)).data;
  assert.equal(Number(afterReception.data.xe),Number(beforeVehicles.data.xe)+1);
  console.log('PASS shared vehicle profile does not create branch reception; receiving at B affects only B.');
  assert.equal((await get('repair-orders/'+repair.id,A)).status,404);
  const quote=await write('repair-orders/'+repair.id+'/quote',B,{});assert.ok(quote.quoteId);
  const [flow]=await scope.run({branchId:B,readIds:[B],writeIds:[B]},()=>db.query('SELECT ID FROM V_B_TTRANGTHAIXE WHERE TLENHSUACHUAID=?',[repair.id]));assert.ok(flow);
  const [paymentId]=await scope.run({branchId:B,readIds:[B],writeIds:[B]},()=>db.query('SELECT DCUAHANGID FROM V_B_TDONHANG WHERE ID=?',[sale.id]));assert.equal(paymentId.DCUAHANGID,B);
  const tv=require(root+'services/secondaryDisplayConfig'),screens=Object.fromEntries(['1','2','3'].map(k=>[k,{type:'price_banner',bankInfo:{},pages:[{interval:10,title:'Màn hình B'}]}]));
  const before=await scope.run({branchId:B,readIds:[B],writeIds:[B]},()=>tv.load());await scope.run({branchId:B,readIds:[B],writeIds:[B]},()=>tv.save(screens,before.version,owner.ID));assert.equal((await scope.run({branchId:B,readIds:[B],writeIds:[B]},()=>tv.load())).screens['1'].pages[0].title,'Màn hình B');
  const movements=await scope.run({branchId:B,readIds:[B],writeIds:[B]},()=>require(root+'services/reportData').sources('movements',{},db.query));assert.ok(movements.some(r=>r.source==='Chuyển kho nhận'));
  console.log('PASS B sale + same-key retry + actual PDF + repair + quote + branch stamping + independent TV + transfer reports.');

  const expectedBranches=(await get('branches',A)).data.data.map(b=>b.ID).sort();
  for(const branch of [A,B]){const directory=await get('catalog/stores',branch);assert.equal(directory.status,200);assert.deepEqual(directory.data.data.map(b=>b.ID).sort(),expectedBranches);}
  const staffDirectory=await scope.run({branchId:A,readIds:[A],writeIds:[A],ORGROLE:'STAFF'},()=>require(root+'services/catalogData').read('stores'));assert.ok(staffDirectory.data.every(b=>b.ID===A));
  const summary=[];
  for(const route of ['auth/me','branches','branches/members','sales','repair-orders','inventory-receipts','master-data/warehouses','master-data/locations','catalog/stock','finance/cashbook','reports/dashboard','print-control/configuration','printing/MauPhieuTamTinh/records','printing/MauHoaDonBanHang/records','employees']){
   for(const branch of [A,B]){const result=await get(route,branch);summary.push({route,branch:branch===A?'A':'B',status:result.status});assert.equal(result.status,200,route+' '+branch+' '+result.body.slice(0,500));}
  }
  assert.equal((await get('sales',B,staffToken)).status,403);
  assert.equal((await get('sales','all',staffToken)).status,403);
  const [h]=await scope.run({branchId:A,readIds:[A],writeIds:[A]},()=>db.query('SELECT FIRST 1 ID FROM V_B_TDONHANG'));
  assert.equal((await get('sales/'+h.ID,B)).status,404);
  assert.equal((await get('printing/MauHoaDonBanHang/'+h.ID+'/pdf',B)).status,404);
console.log('PASS '+summary.length+' branch API reads plus denied forged branch/document/PDF.');
 }finally{await new Promise(resolve=>server.close(resolve));await db.closePool();}
}).catch(e=>{console.error(e);process.exitCode=1;});
