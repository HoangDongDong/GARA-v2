import test from 'node:test';
import assert from 'node:assert/strict';
const map=new Map();globalThis.sessionStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
const {branchId,initializeBranches,prepareBranch,checkBranch}=await import('../../../frontend/src/utils/branchSession.js');
test('tab scope resets unauthorized branches and rejects responses from a previous branch',()=>{
 map.clear();initializeBranches({ORGROLE:'STAFF',BRANCHES:[{ID:'A'}]});assert.equal(branchId(),'A');
 const req=prepareBranch({url:'/sales',headers:{}});assert.equal(req.headers['X-Branch-Id'],'A');map.set('garage_branch','B');assert.throws(()=>checkBranch({config:req}));
 initializeBranches({ORGROLE:'STAFF',BRANCHES:[{ID:'A'}]});assert.equal(branchId(),'A');map.set('garage_branch','all');
 initializeBranches({ORGROLE:'OWNER',BRANCHES:[{ID:'A'},{ID:'B'}]});assert.equal(branchId(),'all');initializeBranches({ORGROLE:'STAFF',BRANCHES:[{ID:'B'}]});assert.equal(branchId(),'B');initializeBranches({BRANCHES:[]});assert.equal(branchId(),'');
});
