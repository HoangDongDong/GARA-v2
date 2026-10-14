const test=require('node:test'),assert=require('node:assert/strict');
const {validateItems,eligible,vehicles}=require('./src/services/warrantyJobs');
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
test('warranty jobs require coverage and reject invalid quantities and duplicates',()=>{
 const valid=[{kind:'warranty',sourceId:id,quantity:1},{kind:'service',sourceId:id,quantity:2}];
 assert.doesNotThrow(()=>validateItems(valid));
 assert.throws(()=>validateItems(valid.slice(1)),/bảo hành còn hạn/);
 for(const quantity of [0,-1,NaN,Infinity,10001])assert.throws(()=>validateItems([{...valid[0],quantity}]));
 assert.throws(()=>validateItems([valid[0],valid[0]]),/trùng/);
 assert.throws(()=>validateItems([{...valid[0],sourceId:'not-a-uuid'}]));
});
test('eligible coverage checks the selected vehicle and both ends of the date range without exposing cost',async()=>{
 let sql,params;await eligible(id,async(s,p)=>{sql=s;params=p;return [];});
 assert.deepEqual(params,[id]);assert.match(sql,/B.DXEID=\?/);assert.match(sql,/B.NGAYBATDAU<=CURRENT_DATE/);assert.match(sql,/B.NGAYKETTHUC>=CURRENT_DATE/);assert.ok(!sql.includes('GIANHAP'));
});
test('vehicle picker only includes active vehicles with a current warranty in the branch scope',async()=>{
 let sql;await vehicles(async s=>{sql=s;return [];});
 assert.match(sql,/V.STATUS=1 AND EXISTS/);assert.match(sql,/B.DXEID=V.ID/);
 assert.match(sql,/B.STATUS=1/);assert.match(sql,/B.NGAYBATDAU<=CURRENT_DATE/);assert.match(sql,/B.NGAYKETTHUC>=CURRENT_DATE/);
});
