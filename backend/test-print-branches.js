const test=require('node:test'),assert=require('node:assert/strict');
const {resolve,apply}=require('./src/services/printBranches');
test('single branch adds nothing, multiple branches show the saved document branch',async()=>{
 const one=await resolve({},null,async()=>[{ID:'a',NAME:'A'}]);assert.equal(one.PrintShowBranch,false);
 const two=[{ID:'a',NAME:'A'},{ID:'b',NAME:'B'}];
 assert.equal((await resolve({DCUAHANGID:'b'},null,async()=>two)).BranchCaption,'Chi nhánh: B');
 assert.equal((await resolve({}, {DCUAHANGID:'a'},async()=>two)).BranchName,'A');
 assert.equal((await resolve({},null,async()=>two)).BranchName,'Chưa xác định');
 assert.equal((await resolve({},null,async()=>two,{aggregate:true})).BranchCaption,'Chi nhánh: Tất cả');
 assert.equal((await resolve({TLENHSUACHUAID:'order'},null,async(sql)=>sql.includes('FROM DCUAHANG')?two:[{DCUAHANGID:'b'}])).BranchName,'B');
});
test('branch line shifts an embedded table header and is absent for a single branch',()=>{
 const xml='<Report><ReportPage PaperWidth="80" LeftMargin="0" RightMargin="8"><ReportTitleBand Width="272.16" Height="200"><TableObject Name="colHeader" Top="180"/></ReportTitleBand></ReportPage></Report>';
 assert.equal(apply(xml,{PrintShowBranch:false}),xml);
 const result=apply(xml,{PrintShowBranch:true,BranchCaption:'Chi nhánh: B'});
 assert.ok(result.includes('Top="199"'));assert.ok(result.includes('Height="219"'));
 assert.ok(result.includes('Text="[BranchCaption]"'));assert.equal(apply(result,{PrintShowBranch:true}),result);
});
test('report PDF and Excel display branch scope only when supplied',()=>{
 const service=require('./src/services/reportExport');
 const result={report:{name:'Doanh thu',columns:[{key:'amount',label:'Tiền',type:'money'}]},rows:[{amount:1000}],filters:{},notes:[],totals:{amount:1000},createdAt:'2026-10-14T01:00:00Z',branchCaption:'Chi nhánh: Tất cả'};
 const built=service.buildPrintTemplate(result,'portrait',{name:'GARA',branchCaption:result.branchCaption});
 assert.ok(built.template.includes('Chi nhánh: Tất cả'));assert.ok(service.xlsx(result).includes(Buffer.from(result.branchCaption)));
 const plain=service.buildPrintTemplate(result,'portrait',{name:'GARA'});assert.ok(!plain.template.includes('Name="BranchCaption"'));
});

