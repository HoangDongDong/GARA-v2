const test=require('node:test'),assert=require('node:assert/strict');
const scope=require('./src/branchScope'),{resolve}=require('./src/services/printBranches');
const a='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
test('report captions use the actual selected scope and all does not enumerate branches',async()=>{
 const query=async()=>[{ID:a,NAME:'Chi nhánh A'},{ID:b,NAME:'Chi nhánh B'}];
 await scope.run({branchId:b,readIds:[b],writeIds:[]},async()=>{
  assert.equal((await resolve({},null,query,{aggregate:true})).BranchCaption,'Chi nhánh: Chi nhánh B');
 });
 await scope.run({readIds:[a,b],writeIds:[]},async()=>{
  assert.equal((await resolve({},null,query,{aggregate:true})).BranchCaption,'Chi nhánh: Tất cả');
 });
});
test('report request selection leaves the overview selection intact and cannot override other routes',async()=>{
 const memory=new Map([['garage_branch',a]]);
 global.sessionStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
 const {prepareBranch,branchId,checkBranch}=await import('../frontend/src/utils/branchSession.js');
 const report=prepareBranch({url:'/reports/center/run/sales',method:'get',headers:{},reportBranchId:b});
 assert.equal(report.headers['X-Branch-Id'],b);assert.equal(branchId(),a);
 assert.doesNotThrow(()=>checkBranch({config:report}));
 const other=prepareBranch({url:'/repair-orders',method:'get',headers:{},reportBranchId:b});
 assert.equal(other.headers['X-Branch-Id'],a);
 const all=prepareBranch({url:'/reports/center/snapshots/id/pdf',method:'get',headers:{},reportBranchId:'all'});
 assert.equal(all.headers['X-Branch-Id'],'all');
 memory.set('garage_branch',b);assert.throws(()=>checkBranch({config:report}),/Chi nhánh đã thay đổi/);
});
