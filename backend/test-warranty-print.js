const test=require('node:test'),assert=require('node:assert/strict');
const {types,templates}=require('./src/services/warrantyPrint');
test('all warranty print documents use the same printing permission and include every paper size',()=>{
 const print=require('./src/services/documentPrint');
 for(const type of types){const catalog=print.typeByKey(type.key);assert.ok(print.permitted({permissions:{WARRANTY:17}},catalog));assert.ok(!print.permitted({permissions:{REPAIR:17}},catalog));const layouts=templates(type);assert.equal(layouts.length,6);assert.deepEqual(layouts.map(l=>l.format),['A4-doc','A4-ngang','A5','80mm-stt','80mm-simple','80mm-two-lines']);
  for(const layout of layouts){const params=Object.fromEntries([...layout.xml.matchAll(/<Parameter Name="([^"]+)"/g)].map(m=>[m[1],0]));const row=Object.fromEntries([...layout.xml.matchAll(/<Column Name="([^"]+)"/g)].map(m=>[m[1],0]));assert.doesNotThrow(()=>print.validateBindings(layout.xml,{parameters:params,tables:{Table0:[row]}}));}
 }
});
