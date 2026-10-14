process.env.MULTIBRANCH_ENABLED='false';
const db=require('../src/db'),platform=require('../src/services/platform'),tenancy=require('../src/tenancy');
const [code,mainBranchId,ownerUserId]=process.argv.slice(2);
if(!code||!mainBranchId||!ownerUserId)throw Error('Usage: node tools/migrate-branches.js <tenantCode> <mainBranchId> <ownerUserId>');
platform.find(code,true).then(tenant=>tenancy.run(tenant,()=>require('../src/services/branchMigration').migrate({mainBranchId,ownerUserId}))).then(result=>console.log(JSON.stringify(result))).catch(e=>{console.error(e.message);process.exitCode=1;});
