import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from '../../../frontend/node_modules/xlsx/xlsx.mjs';
import {readExcel,autoMap,customerFields} from '../../../frontend/src/utils/masterExcel.js';
const file=(name,bytes)=>({name,size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
const csv=(text)=>file('khach.csv',new TextEncoder().encode(text));
test('CSV preserves UTF-8 Vietnamese, leading zeroes, quoted commas, newlines and quotes',async()=>{
 const [sheet]=await readExcel(csv('\uFEFFMã khách,Tên khách hàng,Số điện thoại,Địa chỉ\r\n001,"Chị THY, VIP",0900123456,"Dòng 1\nDòng 2 ""A"""'));
 assert.deepEqual(sheet.rows[1],['001','Chị THY, VIP','0900123456','Dòng 1\nDòng 2 "A"']);
 assert.deepEqual(autoMap(sheet.rows[0],customerFields),['MAKHACH','NAME','DIENTHOAI','DIACHI']);
});
test('CSV recognizes semicolon, tab and Excel sep= marker, rejects inconsistent columns',async()=>{
 for(const text of ['Mã khách;Tên khách hàng\n001;Nguyễn A','Mã khách\tTên khách hàng\n001\tNguyễn A','sep=;\r\nMã khách;Tên khách hàng\r\n001;Nguyễn A']){
  assert.deepEqual((await readExcel(csv(text)))[0].rows[1],['001','Nguyễn A']);
 }
 await assert.rejects(()=>readExcel(csv('Mã khách,Tên khách hàng\n001,A,x')),/số cột/);
 await assert.rejects(()=>readExcel(csv('Mã khách,Tên khách hàng\n001,"A')),/ngoặc kép/);
});
test('CSV from Excel in UTF-16LE is decoded with Vietnamese intact',async()=>{
 const text='Mã khách,Tên khách hàng\r\n001,Nguyễn Văn A',buffer=Buffer.concat([Buffer.from([255,254]),Buffer.from(text,'utf16le')]);
 assert.equal((await readExcel(file('khach.csv',buffer)))[0].rows[1][1],'Nguyễn Văn A');
});
test('binary Excel 97-2003 .xls reads all sheets and formatted zero-leading codes',async()=>{
 const book=XLSX.utils.book_new(),sheet=XLSX.utils.aoa_to_sheet([['Mã khách','Tên khách hàng','Số điện thoại'],[12,'Nguyễn Văn A','0900123456']]);
 sheet.A2.z='00000';XLSX.utils.book_append_sheet(book,sheet,'Khách hàng');XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Biển số'],['30A-123.45']]),'Xe');
 const bytes=new Uint8Array(XLSX.write(book,{type:'array',bookType:'biff8'}));
 assert.deepEqual(Array.from(bytes.slice(0,4)),[208,207,17,224]);
 const found=await readExcel(file('du-lieu.xls',bytes));assert.equal(found.length,2);assert.deepEqual(found[0].rows[1],['00012','Nguyễn Văn A','0900123456']);assert.equal(found[1].rows[1][0],'30A-123.45');
});
test('legacy Excel XML .xls with formulas is rejected like .xlsx',async()=>{
 const xml='<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Test"><Table><Row><Cell><Data ss:Type="String">Tên khách hàng</Data></Cell></Row><Row><Cell ss:Formula="=1+1"><Data ss:Type="Number">2</Data></Cell></Row></Table></Worksheet></Workbook>';
 await assert.rejects(()=>readExcel(file('old.xls',new TextEncoder().encode(xml))),/công thức/);
});
test('CSV row limit and .xls file-size limit match .xlsx constraints',async()=>{
 await assert.rejects(()=>readExcel(csv('Tên khách hàng\n'+Array.from({length:1001},(_,i)=>'Khách '+i).join('\n'))),/1.000/);
 await assert.rejects(()=>readExcel({name:'big.xls',size:11*1024*1024}),/10 MB/);
});
