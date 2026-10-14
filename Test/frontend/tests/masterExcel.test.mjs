import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from '../../../frontend/node_modules/exceljs/excel.js';
import {customerFields,vehicleFields,supplierFields,fieldsWithOptions,autoMap,parsePaste,prepareRows,readExcel,excelBuffer} from '../../../frontend/src/utils/masterExcel.js';
const file=buffer=>({name:'test.xlsx',size:buffer.length,arrayBuffer:async()=>buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength)});
test('supplier Excel roundtrip uses its own fields, groups, required code and duplicate checks',async()=>{
 const fields=fieldsWithOptions('suppliers',{groups:[{ID:'g1',NAME:'Phụ tùng'}]}),source={MANHACUNGCAP:'0001',NAME:'Công ty A',DNHOMNHACUNGCAPID:'g1',DIENTHOAI:'0900123456',WEBSITE:'https://example.com',NOTE:'Ghi chú'};
 const [sheet]=await readExcel(file(await excelBuffer(fields,[source]))),mapping=autoMap(sheet.rows[0],fields);
 assert.deepEqual(mapping,supplierFields.map(f=>f.key));
 const [row]=prepareRows([{data:Object.fromEntries(mapping.map((key,i)=>[key,sheet.rows[1][i]]))}],fields,{});
 assert.deepEqual(row.errors,[]);assert.equal(row.data.DNHOMNHACUNGCAPID,'g1');assert.equal(row.data.DIENTHOAI,'0900123456');
 assert.ok(prepareRows([{data:{NAME:'B'}}],fields,{})[0].errors.some(e=>e.includes('Mã nhà cung cấp')));
 assert.ok(prepareRows([{data:source}],fields,{},[{MANHACUNGCAP:'0001'}])[0].errors.some(e=>e.includes('đã tồn tại')));
 assert.equal(prepareRows([{data:{MANHACUNGCAP:'0002',NAME:'B'}}],fields,{NOTE:{enabled:true,value:'Dùng chung'}})[0].data.NOTE,'Dùng chung');
});
test('Excel mapping recognizes Vietnamese headers and prevents duplicate automatic targets',()=>{
 assert.deepEqual(autoMap(['Mã khách','Tên khách hàng','SDT','Số điện thoại','Không có'],customerFields),['MAKHACH','NAME','DIENTHOAI','','']);
 assert.deepEqual(autoMap(['Biển số','VIN','Số km'],vehicleFields),['BIENSO','SOKHUNG','ODO']);
});
test('paste retains leading zeroes, embedded tabs/newlines and escaped quotes',()=>{
 assert.deepEqual(parsePaste('KH1\t"Tên\tA"\t0901234567\r\nKH2\t"Dòng\n2 ""B"""\t001'),[['KH1','Tên\tA','0901234567'],['KH2','Dòng\n2 "B"','001']]);
});
test('validation applies common attributes and detects duplicate customer codes, blank names and saved rows',()=>{
 const rows=[{id:1,data:{MAKHACH:'KH1',NAME:'A'},saved:true},{id:2,data:{MAKHACH:'kh1',NAME:''}}];
 const checked=prepareRows(rows,customerFields,{DIENTHOAI:{enabled:true,value:'0900000000'}});
 assert.deepEqual(checked[0].errors,[]);assert.equal(checked[1].data.DIENTHOAI,'0900000000');assert.equal(checked[1].errors.length,2);
 assert.ok(prepareRows([{data:{MAKHACH:'KH2',NAME:'B',GIAMGIARIENG:'101'}}],customerFields,{},[{MAKHACH:'KH2'}])[0].errors.length===2);
});
test('vehicle references resolve by names/codes and reject mismatched brand/model',()=>{
 const fields=vehicleFields.map(f=>({...f,options:({DKHACHHANGID:[{value:'owner',label:'KH1 · A',aliases:['KH1','A']}],DHANGXEID:[{value:'ford',label:'Ford'},{value:'toyota',label:'Toyota'}],DDONGXEID:[{value:'eco',label:'EcoSport',brand:'ford'}]})[f.key]}));
 const [valid]=prepareRows([{data:{BIENSO:'30A-123.45',DKHACHHANGID:'KH1',DDONGXEID:'EcoSport',ODO:'123'}}],fields,{});
 assert.deepEqual(valid.errors,[]);assert.equal(valid.data.DKHACHHANGID,'owner');assert.equal(valid.data.DHANGXEID,'ford');assert.equal(valid.data.ODO,123);
 assert.ok(prepareRows([{data:{BIENSO:'30A-123.45',DHANGXEID:'Toyota',DDONGXEID:'EcoSport'}}],fields,{},[{BIENSO:'30A12345'}])[0].errors.length===2);
});
test('actual vehicle metadata uses string fuel names and exported references can be imported again',async()=>{
 const fields=fieldsWithOptions('vehicles',{owners:[{ID:'owner',MAKHACH:'KH1',NAME:'Tên A'}],meta:{brands:[{ID:'ford',NAME:'Ford'}],models:[{ID:'eco',NAME:'EcoSport',DHANGXEID:'ford'}],fuels:['Xăng','Điện']}});
 const source={BIENSO:'30A-222.22',DKHACHHANGID:'owner',DHANGXEID:'ford',DDONGXEID:'eco',NHIENLIEU:'Xăng',ODO:100};
 const sheet=(await readExcel(file(await excelBuffer(fields,[source]))))[0],mapping=autoMap(sheet.rows[0],fields);
 const [row]=prepareRows([{data:Object.fromEntries(mapping.map((key,i)=>[key,sheet.rows[1][i]]))}],fields,{});
 assert.deepEqual(row.errors,[]);for(const key of Object.keys(source))assert.equal(row.data[key],source[key]);
});
test('real .xlsx export/import roundtrip keeps phone/code text and literal formulas',async()=>{
 const buffer=await excelBuffer(customerFields,[{MAKHACH:'001',NAME:'=SUM(A1)',DIENTHOAI:'0901234567',MASOTHUE:'000123'}]);
 const book=new ExcelJS.Workbook();await book.xlsx.load(buffer);assert.equal(book.worksheets[0].getCell('C2').value,'0901234567');assert.equal(book.worksheets[0].getCell('B2').type,ExcelJS.ValueType.String);
 const sheets=await readExcel(file(buffer));assert.equal(sheets[0].rows[1][0],'001');assert.equal(sheets[0].rows[1][2],'0901234567');assert.equal(sheets[0].rows[1][5],'000123');
 const mapping=autoMap(sheets[0].rows[0],customerFields);assert.deepEqual(mapping,customerFields.map(f=>f.key));
});
test('import rejects formula cells, unsupported files and oversize files; zero-formatted codes retain zeros',async()=>{
 const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Nhập');sheet.addRow(['Mã khách','Tên khách hàng']);sheet.addRow([12,'Tên']);sheet.getCell('A2').numFmt='00000';
 assert.equal((await readExcel(file(await book.xlsx.writeBuffer())))[0].rows[1][0],'00012');
 sheet.getCell('B2').value={formula:'1+1',result:2};await assert.rejects(async()=>readExcel(file(await book.xlsx.writeBuffer())),/công thức/);
 await assert.rejects(()=>readExcel({name:'unsupported.txt',size:1}),/xlsx/);await assert.rejects(()=>readExcel({name:'huge.xlsx',size:11*1024*1024}),/10 MB/);await assert.rejects(()=>excelBuffer([],[]),/ít nhất/);
});
