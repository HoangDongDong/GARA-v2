const db=require('../db.js');
const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
async function resolve(header={},warehouse=null,query=db.query,{aggregate=false}={}){
 const stores=await query('SELECT ID,NAME FROM DCUAHANG WHERE STATUS=1 ORDER BY NAME');
 if(stores.length<2)return {PrintShowBranch:false,BranchName:'',BranchCaption:''};
 let id=header.DCUAHANGID||warehouse?.DCUAHANGID||(aggregate?require('../branchScope').current()?.branchId:null);
 if(!id&&header.TLENHSUACHUAID){const [row]=await query('SELECT DCUAHANGID FROM TLENHSUACHUA WHERE ID=?',[header.TLENHSUACHUAID]);id=row?.DCUAHANGID;}
 if(!id&&header.TTIEPNHANXEID){const [row]=await query('SELECT DCUAHANGID FROM TTIEPNHANXE WHERE ID=?',[header.TTIEPNHANXEID]);id=row?.DCUAHANGID;}
 const store=stores.find(row=>row.ID===id);
 const name=store?.NAME||(aggregate?'Tất cả':'Chưa xác định');
 return {PrintShowBranch:true,BranchName:name,BranchCaption:`Chi nhánh: ${name}`};
}
function apply(xml,parameters){
 if(!parameters.PrintShowBranch)return xml;
 const doc=new DOMParser().parseFromString(xml.replace(/^\uFEFF/,''),'text/xml');
 if(Array.from(doc.getElementsByTagName('*')).some(node=>/\[(?:BranchCaption|BranchName)\]/.test(node.getAttribute('Text')||'')))return xml;
 const band=doc.getElementsByTagName('ReportTitleBand')[0];if(!band)return xml;
 const page=doc.getElementsByTagName('ReportPage')[0],receipt=Number(page?.getAttribute('PaperWidth'))===80;
 const h=receipt?19:23;
 const header=Array.from(band.getElementsByTagName('TableObject')).find(node=>node.getAttribute('Name')==='colHeader');
 const top=header?Number(header.getAttribute('Top')||0):Number(band.getAttribute('Height')||0);
 if(header)header.setAttribute('Top',String(top+h));
 band.setAttribute('Height',String(Number(band.getAttribute('Height')||0)+h));
 const node=doc.createElement('TextObject');
 const width=Number(band.getAttribute('Width'))||(Number(page.getAttribute('PaperWidth'))-Number(page.getAttribute('LeftMargin'))-Number(page.getAttribute('RightMargin')))*3.78;
 for(const [key,value]of Object.entries({Name:'PrintBranchCaption',Top:top,Width:width,Height:h,Text:'[BranchCaption]',Font:`Arial, ${receipt?8:9}pt, style=Bold`,CanGrow:'true',CanShrink:'true'}))node.setAttribute(key,String(value));
 band.appendChild(node);
 return new XMLSerializer().serializeToString(doc);
}
module.exports={resolve,apply};
