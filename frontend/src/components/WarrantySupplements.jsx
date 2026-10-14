import {useMemo,useState} from 'react';
import api from '../api';
import {vehicles} from '../services';
import RepairSupplements from './RepairSupplements';
const status=state=>state==='partial'?'partially_approved':state;
export default function WarrantySupplements({job,catalog,warehouses,onChanged,onClose}){
 const [warehouse,setWarehouse]=useState(job.DKHOHANGID||'');
 const adapter=useMemo(()=>({
  get:async()=>(await vehicles.profile(job.DXEID))?.vehicle,
  supplements:async id=>{const r=await api.get(`/warranty-jobs/${id}/supplements`);return (r.data.data||[]).map(head=>({...head,TRANGTHAI:status(head.STATE),NGAYXACNHAN:head.TIMEAPPROVED,items:head.items.map((line,i)=>({ID:`${head.ID}:${i}`,TEN:line.name,SOLUONG:line.quantity,DONGIA:line.price,THANHTIEN:line.amount,TRANGTHAI:head.STATE==='pending'?'pending':line.accepted?'approved':head.STATE==='draft'?'draft':'rejected'}))}));},
  createSupplement:async(id,body)=>{
   const grouped=new Map();for(const row of body.items){const kind=Number(row.LOAI)===0?'part':'service',sourceId=row.DMATHANGID||row.DDICHVUID,key=kind+sourceId;const previous=grouped.get(key);grouped.set(key,{kind,sourceId,quantity:Number(row.SOLUONG)+(previous?.quantity||0)});}
   return (await api.post(`/warranty-jobs/${id}/supplements`,{reason:body.LYDO,state:body.TRANGTHAI,warehouseId:warehouse,items:[...grouped.values()]})).data;
  },
  decideSupplement:async(id,proposalId,body)=>(await api.patch(`/warranty-jobs/${id}/supplements/${proposalId}`,{...body,accepted:body.approvedItemIds?.map(itemId=>Number(itemId.split(':').at(-1)))})).data,
 }),[job.DXEID,warehouse]);
 const entries=useMemo(()=>catalog.map(row=>({...row,id:`${row.kind}:${row.sourceId}`,sourceType:row.kind==='part'?0:1})),[catalog]);
 return <RepairSupplements repairId={job.ID} state={job.TRANGTHAI} catalog={entries} apiService={adapter} permissionCode="WARRANTY" title="Đề xuất phát sinh bảo hành" contextTitle={job.NAME} canEditPrice={false} createFields={<label>Kho xuất phụ tùng<select value={warehouse} onChange={event=>setWarehouse(event.target.value)}><option value="">Chọn kho</option>{warehouses.map(row=><option key={row.ID} value={row.ID}>{row.NAME}</option>)}</select></label>} onChanged={onChanged} onClose={onClose}/>;
}

