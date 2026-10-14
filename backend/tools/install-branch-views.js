// Stop the API before running schema changes. The verified backup is external.
process.env.MULTIBRANCH_ENABLED='false';
const tenancy=require('../src/tenancy'),platform=require('../src/services/platform');
const code=process.argv[2]||'kazuko';
platform.find(code,true).then(tenant=>tenancy.run(tenant,()=>require('../src/services/branchViewMigration').install())).then(result=>{
 const expected=require('../src/branchTables.json');
 for(const [name,view]of Object.entries(expected))if(result.mapping[name]!==view)throw Error('Schema mapping mismatch: '+name);
 console.log(JSON.stringify({ok:true,views:Object.keys(result.mapping).length}));
}).catch(e=>{console.error(e.message);process.exitCode=1;});
