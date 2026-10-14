// Refresh only the initial store's local database path when the delivery folder moves.
require('../src/db');
const fs=require('fs'),path=require('path');
const config=require('../src/config'),platform=require('../src/services/platform');
(async()=>{
 if(!require('../src/tenancy').enabled())return;
 if(!fs.existsSync(config.firebird.database)||!fs.existsSync(platform.database()))throw Error('Thiếu database bàn giao. Kiểm tra backend/GARAGE.FDB và backend/saas/platform-v1.fdb.');
 const stores=await platform.query('SELECT ID,SLUG FROM SAAS_TENANTS');
 if(stores.length!==1||stores[0].ID!=='legacy'||stores[0].SLUG!=='kazuko')throw Error('Chỉ cập nhật đường dẫn bản bàn giao có duy nhất cửa hàng kazuko.');
 await platform.query("UPDATE SAAS_TENANTS SET DBPATH=? WHERE ID='legacy'",[path.resolve(config.firebird.database)]);
 await platform.find('kazuko',true);require('../src/services/saasWorker').manifest();
 console.log('Đường dẫn cửa hàng kazuko đã sẵn sàng.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
