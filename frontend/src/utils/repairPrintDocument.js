export async function resolveRepairPrintDocument({state,repairId,quoteId,invoiceId}, {loadOrder,createQuote}) {
 if(!repairId)throw Error('Không tìm thấy hồ sơ sửa chữa để in.');
 if(Number(state)>=4){
  const id=invoiceId||(await loadOrder(repairId))?.invoice?.ID;
  if(!id)throw Error('Hồ sơ đã hoàn thành nhưng chưa có hóa đơn sửa chữa. Vui lòng kiểm tra phần thanh toán.');
  return {type:'MauHoaDonSuaChua',id};
 }
 if(Number(state)<2)return {type:'MauBaoGia',id:quoteId||(await createQuote(repairId)).quoteId};
 return {type:Number(state)===3?'MauPhieuTamTinh':'MauPhieuSuaChua',id:repairId};
}
