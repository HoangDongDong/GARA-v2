const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const database=process.env.BRANCH_TEST_DB;
if(!database||!path.isAbsolute(database)||!path.basename(database).endsWith('.branch-test.fdb')||fs.realpathSync(database).toLowerCase().startsWith(path.resolve(__dirname,'../..').toLowerCase()+path.sep))throw Error('Use only an external restored *.branch-test.fdb fixture.');
process.env.MULTIBRANCH_ENABLED='true';
const root='../../backend/src/',db=require(root+'db'),scope=require(root+'branchScope'),tenancy=require(root+'tenancy'),platform=require(root+'services/platform'),A='418a09a4-de81-4fdc-8c49-1ee7b7855230';
const tenant={id:'legacy',code:'kazuko',state:'active',database};const original=platform.find;platform.find=async id=>id==='legacy'?tenant:original(id);
tenancy.run(tenant,()=>scope.run({branchId:A,readIds:[A],writeIds:[A],ORGROLE:'OWNER',userId:'e3473acf-7ea6-4815-b037-0973bb3babaf'},async()=>{
 const owner=await require(root+'accessControl').loadAccessUser('e3473acf-7ea6-4815-b037-0973bb3babaf'),token=require(root+'authSecurity').signToken(owner.ID,owner.credentialVersion,{tenantId:'legacy'});
 const [part]=await db.query('SELECT FIRST 1 ID FROM DMATHANG WHERE STATUS=1 AND COALESCE(TAMKHOA,0)=0'),[warehouse]=await db.query('SELECT FIRST 1 ID FROM V_B_DKHOHANG WHERE STATUS=1');
 const [bank]=await db.query('SELECT FIRST 1 ID FROM V_B_DTAIKHOANNGANHANG WHERE STATUS=1');assert.ok(bank);
 const settings=require(root+'services/branchSettings'),beforeSettings=await settings.load(A);await settings.save(A,{PaymentBankAccountId:bank.ID},owner.ID,beforeSettings.version);
 const before=await db.query('SELECT CODE,PERIODKEY,SEQ FROM SNUMBERCOUNTER ORDER BY CODE'),[salesBefore]=await db.query('SELECT COUNT(*) AS N FROM TDONHANG');
 const draft={NAME:'BH-DRAFT-TEST',DKHOXUATID:warehouse.ID,TILETHUE:10,TILEPHIDICHVU:99,items:[{DMATHANGID:part.ID,SOLUONG:1,DONGIA:0,TILETHUE:10},{DMATHANGID:part.ID,SOLUONG:1,DONGIA:580000,TILETHUE:10}]};
 const printing=require(root+'services/documentPrint'),data=await printing.payload(printing.typeByKey('MauHoaDonBanHang'),'draft',{draft},owner.USERNAME);
 assert.equal(data.parameters.TONGCONG,638000);assert.equal(data.parameters.PHIDICHVU,0);assert.equal(data.parameters.DocTitle,'PHIẾU TẠM TÍNH');assert.equal(data.parameters.KHACHDUA,0);
 const template=await printing.resolve(printing.typeByKey('MauHoaDonBanHang')),qr=await require(root+'services/provisionalPaymentQr').apply(template.content.toString('utf8'),data,db.query);
 assert.equal(qr.notice,'');assert.ok(qr.xml.includes('PaymentQrCode'));assert.ok(data.parameters.PaymentQrData.includes('5406638000'));assert.equal(data.parameters.PaymentQrAmount,'638.000 đ');
 const {app}=require(root+'server'),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{
  const result=await fetch('http://127.0.0.1:'+server.address().port+'/api/printing/MauHoaDonBanHang/draft/pdf',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Branch-Id':A,'Content-Type':'application/json'},body:JSON.stringify({draft})});
  const buffer=Buffer.from(await result.arrayBuffer());assert.equal(result.status,200,buffer.toString().slice(0,400));assert.equal(buffer.subarray(0,4).toString(),'%PDF');assert.equal(result.headers.get('x-print-notice'),null);
  assert.deepEqual(await db.query('SELECT CODE,PERIODKEY,SEQ FROM SNUMBERCOUNTER ORDER BY CODE'),before);assert.equal((await db.query('SELECT COUNT(*) AS N FROM TDONHANG'))[0].N,salesBefore.N);
  console.log('PASS configured bill PDF + centered VietQR uses 638000, no service fee, no sale or counter allocation before payment.');
 }finally{await new Promise(r=>server.close(r));await db.closePool();}
})).catch(e=>{console.error(e);process.exitCode=1;});
