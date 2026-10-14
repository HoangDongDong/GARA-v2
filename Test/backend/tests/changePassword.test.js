const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
process.env.AUTH_SECURITY_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'garage-password-test-'));
const db=require('../../../backend/src/db'),security=require('../../../backend/src/authSecurity');
const router=require('../../../backend/src/routes/auth');
const layer=router.stack.find(item=>item.route?.path==='/change-password');
const handler=layer.route.stack.at(-1).handle;
async function request(body){let status=200,result,write;const query=db.query,execute=db.execute;
 db.query=async()=>[{PASSWORD:security.hashPassword('current-pass')}];
 db.execute=async(sql,values)=>{write={sql,values};};
 try{await handler({body,accessUser:{ID:'own-account'}},{status(value){status=value;return this;},json(value){result=value;}});return{status,result,write};}finally{db.query=query;db.execute=execute;}
}
test('incorrect current password is a form error, preserving the authenticated session',async()=>{const response=await request({oldPass:'incorrect',newPass:'new-password'});assert.equal(response.status,400);assert.match(response.result.error,/hiện tại/);assert.equal(response.write,undefined);});
test('rejects malformed, overlong, too short and unchanged passwords before writing',async()=>{for(const body of [{oldPass:'current-pass',newPass:'123'},{oldPass:'current-pass',newPass:'x'.repeat(257)},{oldPass:{},newPass:'new-password'},{oldPass:'current-pass',newPass:'current-pass'}]){const response=await request(body);assert.equal(response.status,400);assert.equal(response.write,undefined);}});
test('updates only the authenticated account with a hash and invalidates old credential version',async()=>{const response=await request({oldPass:'current-pass',newPass:'new-password'});assert.equal(response.status,200);assert.equal(response.result.ok,true);assert.equal(response.write.values[1],'own-account');assert.equal(security.verifyPassword('new-password',response.write.values[0]),true);assert.equal(security.verifyPassword('current-pass',response.write.values[0]),false);assert.match(response.write.sql,/NOTE=NULL/);});
