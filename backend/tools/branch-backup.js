const fs=require('fs'),path=require('path');
const db=require('../src/db'),tenancy=require('../src/tenancy'),platform=require('../src/services/platform');
const config=require('../src/config'),tool=require('./database-backup');
async function main(){
 const [directory,code='kazuko']=process.argv.slice(2);if(!directory)throw Error('Usage: node tools/branch-backup.js <directory> [tenantCode]');
 const tenant=await platform.find(code,true),output=path.resolve(directory);fs.mkdirSync(output,{recursive:true});
 const results=[];
 for(const [name,database] of [['tenant',tenant.database],['platform',platform.database()]]){
  const before=await tenancy.run({id:'backup-'+name,database},async()=>{
   const tables=await db.query("SELECT TRIM(RDB$RELATION_NAME) AS NAME FROM RDB$RELATIONS WHERE COALESCE(RDB$SYSTEM_FLAG,0)=0 AND RDB$VIEW_BLR IS NULL ORDER BY RDB$RELATION_NAME");
   const counts={};for(const row of tables)counts[row.NAME]=Number((await db.query(`SELECT COUNT(*) AS N FROM "${row.NAME}"`))[0].N);return counts;
  });
  const backup=await tool.backup({...config.firebird,database},path.join(output,name));
  const restored=path.join(output,name,'verified-before.fdb');await tool.restore(backup,restored,{...config.firebird,database});
  const after=await tenancy.run({id:'verify-'+name,database:restored},async()=>{const counts={};for(const table of Object.keys(before))counts[table]=Number((await db.query(`SELECT COUNT(*) AS N FROM "${table}"`))[0].N);return counts;});
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Backup row count mismatch: '+name);
  results.push({name,database,backup,restored,tables:Object.keys(before).length,verified:true});
 }
 fs.writeFileSync(path.join(output,'verified.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
