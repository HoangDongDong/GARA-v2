const test=require('node:test');
const assert=require('node:assert/strict');
const {parsePattern,formatNumber,periodFor,nextInTransaction,definitions}=require('../../../backend/src/services/documentNumbers.js');
const date=new Date('2026-10-03T10:00:00Z');
test('branches allocate configured numbers without branch prefixes using the shared locked sequence',async()=>{
 const scope=require('../../../backend/src/branchScope'),prior=process.env.MULTIBRANCH_ENABLED;process.env.MULTIBRANCH_ENABLED='true';
 const A='418a09a4-de81-4fdc-8c49-1ee7b7855230',B='b807fb92-9b79-453d-a93a-1aa78e1ce73b',writes=[];let sequence=0;const occupied=new Set(['CUSTOM-26-001']);
 const query=async(sql,params)=>{
  if(sql.includes('SCONFIG'))return [{TEXTVALUE:'CUSTOM-(yy)-(***)'}];
  if(sql.includes('DCUAHANG'))return [{CODE:params[0]===A?'KAZUKO':'12'}];
  if(sql.includes('SNUMBERCOUNTER'))return [{PERIODKEY:'2026',SEQ:sequence}];
  assert.ok(sql.includes('FROM TNHAPKHO WHERE NAME=?'));return occupied.has(params[0])?[{ID:'other-branch-or-cancelled'}]:[];
 };
 const execute=async(sql,params)=>{writes.push(sql);if(sql.startsWith('UPDATE SNUMBERCOUNTER SET PERIODKEY'))sequence=params[1];};
 try{
  for(const [id,expected]of [[A,'CUSTOM-26-002'],[B,'CUSTOM-26-003']])await scope.run({branchId:id,readIds:[id],writeIds:[id]},async()=>{const value=await nextInTransaction('NhapKho',query,execute,date);assert.equal(value,expected);occupied.add(value);});
  assert.ok(writes.includes('UPDATE SNUMBERCOUNTER SET SEQ=SEQ WHERE CODE=?'));assert.ok(writes.every(sql=>!sql.includes('SBRANCHCOUNTER')));
  await assert.rejects(()=>nextInTransaction('NhapKho',query,execute,date),/Chọn một chi nhánh/);
 }finally{if(prior===undefined)delete process.env.MULTIBRANCH_ENABLED;else process.env.MULTIBRANCH_ENABLED=prior;}
});
test('number patterns support legacy quoted stars and year/month/day tokens',()=>{
  assert.equal(formatNumber("BG(yy)/('*****')",12,date),'BG26/00012');
  assert.equal(formatNumber('HD(yyyy)(MM)(dd)-(*** )'.replace('*** ','***'),99,date),'HD20261003-099');
  assert.equal(formatNumber('HD(**)',1,date),'HD01');
  assert.equal(formatNumber('TN(yy)/(*****)',1,new Date('2026-12-31T18:00:00Z')),'TN27/00001');
});
test('invalid and exhausted patterns are rejected before allocating',()=>{
  for(const value of ['', 'BG', 'BG(*)-(*)','BG(yy)/(**', 'BG(yyyyy)(*)','BG(**********)','BG(0)(*)']) assert.throws(()=>parsePattern(value));
  assert.throws(()=>formatNumber('BG(**)',100,date),/hết số/);
  assert.throws(()=>formatNumber('BG(**)',0,date));
});
test('reset uses the finest configured date unit in local time',()=>{
  assert.equal(periodFor('HD(**)',date),'ALL');
  assert.equal(periodFor('HD(yy)(**)',date),'2026');
  assert.equal(periodFor('HD(MM)(**)',date),'202610');
  assert.equal(periodFor('HD(dd)(**)',date),'20261003');
});
test('allocator locks first, skips existing numbers including cancelled documents and persists sequence',async()=>{
  const calls=[];
  const query=async(sql,params)=>{
    calls.push(sql);
    if(sql.includes('FROM SCONFIG'))return[{TEXTVALUE:'TN(yy)/(*****)'}];
    if(sql.includes('FROM SNUMBERCOUNTER'))return[{PERIODKEY:'2025',SEQ:50}];
    if(sql.includes('FROM TTIEPNHANXE'))return params[0]==='TN26/00001'?[{ID:'cancelled'}]:[];
    throw Error(sql);
  };
  const writes=[];
  const execute=async(sql,params)=>{calls.push(sql);writes.push({sql,params});};
  assert.equal(await nextInTransaction('TiepNhan',query,execute,date),'TN26/00002');
  assert.ok(calls.indexOf('UPDATE SNUMBERCOUNTER SET SEQ=SEQ WHERE CODE=?')<calls.indexOf('SELECT PERIODKEY,SEQ FROM SNUMBERCOUNTER WHERE CODE=?'));
  assert.deepEqual(writes.at(-1).params,['2026',2,'TiepNhan']);
});
test('all ten document settings are distinct and bound to actual GARA tables',()=>{
  assert.equal(definitions.length,10);
  assert.equal(new Set(definitions.map(d=>d.name)).size,10);
  assert.equal(definitions.filter(d=>d.active).length,6);
  for(const type of definitions)assert.doesNotThrow(()=>parsePattern(type.pattern));
});
test('preview finds the next available number without locking or consuming the counter',async()=>{
  const query=async(sql,params)=>{
    if(sql.includes('FROM SCONFIG'))return[{TEXTVALUE:'BH(yy)/(*****)'}];
    if(sql.includes('FROM SNUMBERCOUNTER'))return[{PERIODKEY:'2026',SEQ:7}];
    return params[0]==='BH26/00008'?[{ID:'existing'}]:[];
  };
  const execute=()=>assert.fail('Preview must never write or lock the counter');
  for(let i=0;i<2;i++)assert.equal(await nextInTransaction('BanPhuTung',query,execute,date,false),'BH26/00009');
});
