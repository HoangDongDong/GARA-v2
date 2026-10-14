const test=require('node:test'),assert=require('node:assert/strict');
const {validate}=require('./src/services/warrantySupplements');
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
test('warranty supplement requires a reason and only valid additional parts or services',()=>{
 const valid={reason:'Khách yêu cầu thay thêm',items:[{kind:'part',sourceId:id,quantity:1}]};
 assert.doesNotThrow(()=>validate(valid));
 assert.throws(()=>validate({...valid,reason:''}));
 assert.throws(()=>validate({...valid,items:[{...valid.items[0],kind:'warranty'}]}));
 assert.throws(()=>validate({...valid,items:[{...valid.items[0],quantity:0}]}));
 assert.throws(()=>validate({...valid,items:[valid.items[0],valid.items[0]]}));
});
