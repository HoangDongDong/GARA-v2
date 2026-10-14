export function workshopCars(rows,states=[]){
 const names=new Map(states.map(state=>[Number(state.STT_WORKFLOW),state.TEN]));
 return (rows||[]).filter(row=>row.TLENHSUACHUAID&&Number.isInteger(Number(row.TRANGTHAI))&&Number(row.TRANGTHAI)>=0&&Number(row.TRANGTHAI)<4).map(row=>({
  BIENSO:row.BIENSO||'—',LOAIXE:[row.HANG_XE,row.DONG_XE,row.PHIENBAN].filter(Boolean).join(' ')||'—',KHACHHANG:row.TEN_KH||'—',DIENTHOAI:row.DIENTHOAI||'—',
  KHOANG:row.KHOANG||'Chưa ghi nhận',KTV:row.TEN_KTV||'Chưa phân công',CO_VAN:row.TEN_CV||'Chưa phân công',
  GIO_VAO:row.NGAY_VAO?new Date(row.NGAY_VAO).toLocaleString('vi-VN'):'—',GIO_XONG:row.NGAY_DUKIEN?new Date(row.NGAY_DUKIEN).toLocaleString('vi-VN'):'Chưa có dự kiến',
  TRANGTHAI:Number(row.TRANGTHAI),STATUS_LABEL:names.get(Number(row.TRANGTHAI))||row.TRANGTHAI_TEN||'Chưa cập nhật',
  TASKS:(row.ITEMS||[]).map(item=>({name:item.TEN_HANG_MUC||item.NOTE||'Hạng mục',status:'untracked'}))
 }));
}
export function configuredBanners(rows=[]){return rows.filter(row=>row?.url&&!/photo-(1617788138017-80ad40651399|1486006920555-c77dce18193b|1520340356584-f9917d1eea6f)/.test(row.url));}
