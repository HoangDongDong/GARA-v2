const db=require('../db'),crypto=require('crypto');
const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const types=[{key:'MauBaoGiaBaoHanh',label:'Báo giá bảo hành',table:'TBAOHANHXULY'},{key:'MauLenhBaoHanh',label:'Lệnh bảo hành',table:'TBAOHANHXULY'},{key:'MauBanGiaoBaoHanh',label:'Bàn giao bảo hành',table:'TBAOHANHXULY'},{key:'MauHoaDonBaoHanh',label:'Hóa đơn bảo hành',table:'TBAOHANHXULY'}];
const supports=key=>types.some(t=>t.key===key),cache=new Map();
const idFor=(key,format)=>{const h=crypto.createHash('sha256').update(`garage-warranty-print-v1:${key}:${format}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;};
function variant(source,style){
 if(style==='stt')return source;
 const doc=new DOMParser().parseFromString(source,'text/xml');
 for(const table of Array.from(doc.getElementsByTagName('TableObject')).filter(n=>['detail','colHeader'].includes(n.getAttribute('Name')))){
  const detail=table.getAttribute('Name')==='detail';
  if(style==='simple'){
   const columns=Array.from(table.getElementsByTagName('TableColumn'));table.removeChild(columns[0]);columns[1].setAttribute('Width',String(Number(columns[1].getAttribute('Width'))+18));
   for(const row of Array.from(table.getElementsByTagName('TableRow'))){const cell=row.getElementsByTagName('TableCell')[0];row.removeChild(cell);}
  }else{
   const name=table.getAttribute('Name');const labels=detail?['[Table0.QuantityText]','[Table0.UnitPriceText]','[Table0.AmountText]']:['SL','Giá','T Tiền'];
   let xml=[36,92,144.16].map((w,i)=>`<TableColumn Name="${name}TwoColumn${i}" Width="${w}"/>`).join('');
   if(detail)xml+='<TableRow Name="WarrantyTitleRow" MinHeight="20" AutoSize="true"><TableCell Name="WarrantyTitleCell" Text="[Table0.ItemName]" ColSpan="3" Font="Arial, 8pt, style=Bold"/><TableCell Name="WarrantyTitleEmpty1"/><TableCell Name="WarrantyTitleEmpty2"/></TableRow>';
   xml+=`<TableRow Name="${name}TwoRow" MinHeight="20" AutoSize="true">${labels.map((text,i)=>`<TableCell Name="${name}TwoCell${i}" Text="${text}" Border.Lines="All" Border.Style="Dash" HorzAlign="Right" Padding="2, 2, 2, 2" Font="Arial, 8pt${detail?'':', style=Bold'}" ${detail?'':'Fill.Color="255, 255, 192"'}/>`).join('')}</TableRow>`;
   const fragment=new DOMParser().parseFromString('<Root>'+xml+'</Root>','text/xml').documentElement;
   while(table.firstChild)table.removeChild(table.firstChild);
   for(const node of Array.from(fragment.childNodes))table.appendChild(doc.importNode(node,true));table.setAttribute('Height',detail?'40':'20');
  }
 }
 if(style==='two-lines'){for(const band of Array.from(doc.getElementsByTagName('DataBand'))){band.setAttribute('Height','40');for(const note of Array.from(band.getElementsByTagName('TextObject')))if((note.getAttribute('Text')||'').includes('[Table0.Note]'))note.setAttribute('Top','40');}}
 return new XMLSerializer().serializeToString(doc);
}
function templates(type){const {build}=require('./documentPaperSizes');return ['A4-doc','A4-ngang','A5','80mm-stt','80mm-simple','80mm-two-lines'].map(format=>({id:idFor(type.key,format),name:`${type.label} - ${({'A4-doc':'A4 dọc','A4-ngang':'A4 ngang',A5:'A5','80mm-stt':'80mm có STT','80mm-simple':'80mm không STT','80mm-two-lines':'80mm mỗi mặt hàng 2 dòng'})[format]}`,xml:format.startsWith('80mm-')?variant(build({...type,layout:'money'},'80mm'),format.slice(5)):build({...type,layout:'money'},format),format}));}
async function ensure(){const tenant=require('../tenancy').key();if(cache.has(tenant))return cache.get(tenant);const task=db.transaction(async(q,x,uuid)=>{
 for(const type of types){const generated=templates(type);const [config]=await q('SELECT ID,TEXTVALUE,OTHERCONFIG FROM SCONFIG WHERE NAME=? AND STATUS=30',[type.key]);const ids=require('./systemConfigOptions').templateFilter(config?.OTHERCONFIG)?.ids||[];
  for(const item of generated){if(!(await q('SELECT ID FROM STEMPLATE WHERE ID=?',[item.id])).length)await x("INSERT INTO STEMPLATE (ID,NAME,STATUS,TEMPLATE,REPORTBASE,USERCREATEDID,TIMECREATED) VALUES (?,?,30,?,0,'SYSTEM',CURRENT_TIMESTAMP)",[item.id,item.name,Buffer.from(item.xml)]);if(!ids.includes(item.id))ids.push(item.id);}
  const defaultId=config?.TEXTVALUE||generated.find(t=>t.format==='80mm-stt').id;
  if(config)await x('UPDATE SCONFIG SET TEXTVALUE=?,OTHERCONFIG=? WHERE ID=?',[defaultId,JSON.stringify(ids),config.ID]);
  else await x("INSERT INTO SCONFIG (ID,NAME,CAPTION,STATUS,DATATYPE,CONTROLTYPE,TEXTVALUE,OTHERCONFIG,USERCREATEDID,TIMECREATED) VALUES (?,?,?,30,1,'1',?,?,'SYSTEM',CURRENT_TIMESTAMP)",[uuid(),type.key,type.label,defaultId,JSON.stringify(ids)]);
 }
});cache.set(tenant,task);try{await task;}catch(e){cache.delete(tenant);throw e;}}
module.exports={types,supports,templates,idFor,ensure};
