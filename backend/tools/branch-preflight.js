// Read-only preparation for branch migration; never changes business rows.
const fs=require('fs'),path=require('path');
const db=require('../src/db'),platform=require('../src/services/platform'),tenancy=require('../src/tenancy');
const tables=['DKHOHANG','TDONHANG','TNHAPKHO','TTIEPNHANXE','TLENHSUACHUA','THOADONSUACHUA','TTHUCHI','TBANGLUONG','TTRANGTHAIXE'];
async function preflight(code='kazuko'){
 const tenant=await platform.find(code,true);
 return tenancy.run(tenant,async()=>{
  const branches=await db.query('SELECT ID,CODE,NAME,STATUS FROM DCUAHANG ORDER BY CODE');
  const users=await db.query('SELECT ID,USERNAME,NAME,ISADMIN,STATUS FROM SUSER WHERE STATUS=1 ORDER BY USERNAME');
  const assignments=await db.query('SELECT SUSERID,DCUAHANGID,STATUS FROM TNGUOIDUNGTHEOCUAHANG');
  const usage={};for(const table of tables)usage[table]=await db.query(`SELECT DCUAHANGID,COUNT(*) AS N FROM ${table} GROUP BY DCUAHANGID`);
  const warehouseLinks=await db.query('SELECT ID,NAME,DCUAHANGID,STATUS FROM DKHOHANG');
  const nullBranchTables=Object.entries(usage).filter(([,rows])=>rows.some(r=>r.DCUAHANGID==null)).map(([table])=>table);
  return {tenant:tenant.code,database:tenant.database,branches,users,assignments,warehouseLinks,usage,nullBranchTables};
 });
}
if(require.main===module)preflight(process.argv[2]).then(result=>{if(process.argv[3]){fs.mkdirSync(path.dirname(path.resolve(process.argv[3])),{recursive:true});fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));}console.log(JSON.stringify(result,null,2));}).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={preflight};
