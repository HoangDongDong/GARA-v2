export const normalize = value => String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]/g,'');
export const customerFields = [
 ['MAKHACH','Mã khách hàng'],['NAME','Tên khách hàng',true],['DIENTHOAI','Số điện thoại'],['EMAIL','Email'],['DIACHI','Địa chỉ'],['MASOTHUE','Mã số thuế / CCCD'],['DNHOMKHACHHANGID','Nhóm khách hàng'],['GIAMGIARIENG','Giảm giá riêng (%)','number'],
].map(([key,label,rule])=>({key,label,required:rule===true,type:rule==='number'?'number':'text'}));
export function fieldsWithOptions(kind,{groups=[],owners=[],meta={}}={}){
 const options=kind==='customers'?{DNHOMKHACHHANGID:groups.map(g=>({value:g.ID,label:g.NAME}))}:kind==='suppliers'?{DNHOMNHACUNGCAPID:groups.map(g=>({value:g.ID,label:g.NAME}))}:{
  DKHACHHANGID:owners.map(o=>({value:o.ID,label:`${o.MAKHACH||o.ID} · ${o.NAME}`,aliases:[o.MAKHACH||'',o.NAME]})),
  DHANGXEID:(meta.brands||[]).map(o=>({value:o.ID,label:o.NAME})),
  DDONGXEID:(meta.models||[]).map(o=>({value:o.ID,label:o.NAME,brand:o.DHANGXEID})),
  NHIENLIEU:(meta.fuels||[]).map(name=>({value:name,label:name})),
 };
 return (kind==='customers'?customerFields:kind==='suppliers'?supplierFields:vehicleFields).map(f=>({...f,...(options[f.key]?{options:options[f.key]}:{})}));
}
export const supplierFields=[
 ['MANHACUNGCAP','Mã nhà cung cấp',true],['NAME','Tên nhà cung cấp',true],['DNHOMNHACUNGCAPID','Nhóm nhà cung cấp'],['DIENTHOAI','Số điện thoại'],['EMAIL','Email'],['DIACHI','Địa chỉ'],['WEBSITE','Website'],['NOTE','Ghi chú'],
].map(([key,label,required])=>({key,label,required:!!required,type:'text'}));
export const vehicleFields = [
 ['BIENSO','Biển số',true],['DKHACHHANGID','Chủ xe'],['DHANGXEID','Hãng xe'],['DDONGXEID','Dòng xe'],['PHIENBAN','Phiên bản'],['NAMSANXUAT','Năm sản xuất','number'],['MAUXE','Màu xe'],['SOKHUNG','Số khung / VIN'],['SOMAY','Số máy'],['ODO','ODO (km)','number'],['NHIENLIEU','Nhiên liệu'],['MUCNHIENLIEU','Mức nhiên liệu (%)','number'],['GHICHU','Ghi chú'],
].map(([key,label,rule])=>({key,label,required:rule===true,type:rule==='number'?'number':'text'}));
export function autoMap(headers,fields){
 const aliases={MAKHACH:['makhach','makh'],MANHACUNGCAP:['mancc','manhacungcap'],DNHOMNHACUNGCAPID:['nhomncc','nhomnhacungcap'],NOTE:['ghichu'],DIENTHOAI:['dienthoai','sdt'],MASOTHUE:['masothue','cccd'],SOKHUNG:['vin','sokhung'],DKHACHHANGID:['khachhang','chuxe','tenkhachhang'],GIAMGIARIENG:['giamgiarieng','giamgia'],ODO:['odo','sokm'],DNHOMKHACHHANGID:['nhomkhachhang','nhomkh']};
 const used=new Set();return headers.map(h=>{const n=normalize(h),f=fields.find(f=>!used.has(f.key)&&[f.label,f.key,...(aliases[f.key]||[])].some(v=>normalize(v)===n));if(f)used.add(f.key);return f?.key||'';});
}
export function parseDelimited(text,delimiter='\t'){
 const result=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'&&(quoted||cell==='')){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===delimiter||c==='\n'||c==='\r')){row.push(cell);cell='';if(c!==delimiter){if(c==='\r'&&text[i+1]==='\n')i++;result.push(row);row=[];}}else cell+=c;}
 if(quoted)throw Error('Dữ liệu có dấu ngoặc kép chưa đóng.');
 row.push(cell);if(row.some(v=>v.trim()))result.push(row);return result;
}
export const parsePaste=text=>parseDelimited(text,'\t');
export function parseCsv(text){
 text=text.replace(/^\uFEFF/,'');
 const separator=text.match(/^sep=([,;\t])\r?\n/i);
 if(separator)return parseDelimited(text.slice(separator[0].length),separator[1]);
 const candidates=[',',';','\t'].map(d=>({rows:parseDelimited(text,d),delimiter:d}));
 candidates.sort((a,b)=>(b.rows[0]?.length||0)-(a.rows[0]?.length||0));
 const rows=candidates[0].rows.filter(r=>r.some(v=>v.trim()));
 if(rows.length&&rows.some(r=>r.length!==rows[0].length))throw Error('Các dòng CSV không có cùng số cột. Kiểm tra dấu phân cách và dấu ngoặc kép.');
 return rows;
}
export function prepareRows(rows,fields,common,existing=[]){
 // The import dialog renders once before its asynchronous metadata arrives.
 // Validation must also tolerate a failed metadata request.
 if(!fields.length)return rows.map(row=>({...row,errors:row.saved?[]:['Đang chờ danh mục dữ liệu.']}));
 const keyField=fields[0].key;
 const recordKey=value=>String(value??'').trim().toUpperCase().replace(keyField==='BIENSO'?/[-.\s]/g:/$^/g,'');
 const seen=new Set([...existing.map(r=>recordKey(r[keyField])),...rows.filter(r=>r.saved).map(r=>recordKey(r.data[keyField]))].filter(Boolean));
 return rows.map(row=>{
  if(row.saved)return {...row,errors:[]};
  const data={},errors=[];
  for(const f of fields){let v=String(common[f.key]?.enabled?common[f.key].value??'':row.data[f.key]??'').trim();
   if(f.required&&!v)errors.push(`${f.label}: bắt buộc`);
   if(f.options&&v){const hits=f.options.filter(o=>o.value===v||[o.label,...(o.aliases||[])].some(label=>normalize(label)===normalize(v)));if(hits.length!==1)errors.push(`${f.label}: không tìm thấy hoặc trùng tên, hãy chọn trong danh sách`);else v=hits[0].value;}
   if(f.type==='number'&&v){const number=Number(v.replace(',','.'));if(!Number.isFinite(number)||number<0)errors.push(`${f.label}: số không hợp lệ`);else{if(['GIAMGIARIENG','MUCNHIENLIEU'].includes(f.key)&&number>100)errors.push(`${f.label}: tối đa 100`);if(f.key==='NAMSANXUAT'&&(!Number.isInteger(number)||number<1886||number>new Date().getFullYear()+1))errors.push('Năm sản xuất không hợp lệ');v=number;}}
   data[f.key]=v;
  }
  if(data.EMAIL&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.EMAIL))errors.push('Email không hợp lệ');
  const key=fields[0].key,value=recordKey(data[key]);if(value){if(seen.has(value))errors.push(`${fields[0].label}: đã tồn tại hoặc trùng trong bảng`);seen.add(value);}
  const model=fields.find(f=>f.key==='DDONGXEID')?.options?.find(o=>o.value===data.DDONGXEID);if(model?.brand&&data.DHANGXEID&&model.brand!==data.DHANGXEID)errors.push('Dòng xe không thuộc hãng xe đã chọn');if(model?.brand&&!data.DHANGXEID)data.DHANGXEID=model.brand;
  return {...row,data,errors};
 });
}
export async function readExcel(file){
 const extension=file.name.toLowerCase().split('.').pop();
 if(!['xlsx','xls','csv'].includes(extension))throw Error('Vui lòng chọn file .xlsx, .xls hoặc .csv.');
 if(file.size>10*1024*1024)throw Error('File tối đa 10 MB.');
 if(extension==='csv'){
  const bytes=new Uint8Array(await file.arrayBuffer());let text;
  if(bytes[0]===255&&bytes[1]===254)text=new TextDecoder('utf-16le').decode(bytes);
  else if(bytes[0]===254&&bytes[1]===255)text=new TextDecoder('utf-16be').decode(bytes);
  else{try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('windows-1258').decode(bytes);}}
  const rows=parseCsv(text);if(rows.length>1001||rows.some(r=>r.length>80))throw Error('File tối đa 1.000 dòng dữ liệu và 80 cột.');
  return rows.length?[{name:file.name,rows}]:[];
 }
 if(extension==='xls'){
  const XLSX=await import('xlsx'),book=XLSX.read(await file.arrayBuffer(),{type:'array',cellFormula:true,cellText:true});
  return book.SheetNames.map(name=>{const sheet=book.Sheets[name];if(!sheet['!ref'])return {name,rows:[]};
   const range=XLSX.utils.decode_range(sheet['!ref']);if(range.e.r-range.s.r>1000||range.e.c-range.s.c>=80)throw Error('Mỗi sheet tối đa 1.000 dòng dữ liệu và 80 cột.');
   const rows=[];for(let r=range.s.r;r<=range.e.r;r++){const row=[];for(let c=range.s.c;c<=range.e.c;c++){const cell=sheet[XLSX.utils.encode_cell({r,c})];if(cell?.f)throw Error('File nhập có công thức. Hãy sao chép và dán dưới dạng giá trị trước khi nhập.');row.push(cell?String(cell.w??cell.v??''):'');}if(row.some(v=>v.trim()))rows.push(row);}return {name,rows};
  }).filter(s=>s.rows.length);
 }
 const {default:ExcelJS}=await import('exceljs'),book=new ExcelJS.Workbook();await book.xlsx.load(await file.arrayBuffer());
 return book.worksheets.map(sheet=>{
  if(sheet.rowCount>1001||sheet.columnCount>80)throw Error('Mỗi sheet tối đa 1.000 dòng dữ liệu và 80 cột.');
  const rows=[];sheet.eachRow({includeEmpty:true},row=>{const cells=[];for(let i=1;i<=sheet.columnCount;i++){const c=row.getCell(i);if(c.type===ExcelJS.ValueType.Formula)throw Error('File nhập có công thức. Hãy sao chép và dán dưới dạng giá trị trước khi nhập.');let text=c.text;if(typeof c.value==='number'&&/^0+$/.test(c.numFmt))text=String(c.value).padStart(c.numFmt.length,'0');cells.push(text);}rows.push(cells);});
  return {name:sheet.name,rows:rows.filter(r=>r.some(v=>String(v).trim()))};
 }).filter(s=>s.rows.length);
}
export async function excelBuffer(fields,rows,title='Danh sách'){
 if(!fields.length)throw Error('Cần ít nhất một cột đang hiện để xuất file mẫu.');
 const {default:ExcelJS}=await import('exceljs'),book=new ExcelJS.Workbook(),sheet=book.addWorksheet(title.slice(0,31));
 sheet.columns=fields.map(f=>({header:f.label,key:f.key,width:f.key==='NAME'||f.key==='DIACHI'||f.key==='GHICHU'?32:22}));
 rows.forEach(row=>sheet.addRow(Object.fromEntries(fields.map(f=>{const value=row[f.key]??'';const option=f.options?.find(o=>o.value===value);return [f.key,option?.label??value];}))));
 sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:{row:Math.max(1,sheet.rowCount),column:fields.length}};
 sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEA580C'}};sheet.getRow(1).height=26;
 fields.forEach((f,i)=>{sheet.getColumn(i+1).numFmt=f.type==='number'?'0.##':'@';});
 return book.xlsx.writeBuffer();
}
export async function downloadExcel(fields,rows,name){const buffer=await excelBuffer(fields,rows),url=URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),a=document.createElement('a');a.href=url;a.download=name+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
