const db=require('../db'),scope=require('../branchScope'),branchSql=require('../branchSql'),policy=require('./pricingPolicy'),charges=require('./defaultChargeRates');
const fail=message=>Object.assign(Error(message),{status:400});
async function payload(body,user){
 const settings=await require('./salesSettings').load();if(!settings.allowDraftPrint)throw fail('Cấu hình không cho phép in tạm tính.');
 if(!Array.isArray(body.items)||!body.items.length||body.items.length>500)throw fail('Giỏ hàng cần từ 1 đến 500 dòng.');
 const branchId=scope.enabled()?scope.selected():null;
 const [warehouse]=body.DKHOXUATID?await db.query(`SELECT * FROM ${branchSql.table('DKHOHANG')} WHERE ID=? AND STATUS=1`,[body.DKHOXUATID]):[];
 if(body.DKHOXUATID&&!warehouse)throw fail('Kho không thuộc chi nhánh đang chọn hoặc đã ngừng sử dụng.');
 const [customer]=body.DKHACHHANGID?await db.query('SELECT * FROM DKHACHHANG WHERE ID=? AND STATUS=1',[body.DKHACHHANGID]):[];
 if(body.DKHACHHANGID&&!customer)throw fail('Khách hàng không còn sử dụng.');
 const defaults=await charges.loadForSales(),rates={...charges.resolveForSales(body,defaults),roundingStep:settings.roundingStep};
 const discount=require('./salesSettings').discount(await policy.customer(db.query,body.DKHACHHANGID),body.TILEGIAMGIA,settings),lines=[];
 for(const item of body.items){
  const [product]=await db.query('SELECT M.*,U.NAME AS UNITNAME FROM DMATHANG M LEFT JOIN DDONVITINH U ON U.ID=M.DDONVITINHID WHERE M.ID=? AND M.STATUS=1 AND COALESCE(M.TAMKHOA,0)=0',[item.DMATHANGID]);
  if(!product)throw fail('Mặt hàng không tồn tại hoặc đã ngừng bán.');
  const quantity=Number(item.SOLUONG),price=item.DONGIA===undefined?Number(product.GIABAN):Number(item.DONGIA);
  if(!Number.isFinite(quantity)||quantity<=0||item.DONGIA===null||item.DONGIA===''||!Number.isFinite(price)||price<0)throw fail('Số lượng hoặc đơn giá không hợp lệ.');
  if(!settings.allowDiscount&&(item.TILEGIAMGIA!=null||body.TIENGIAMGIAPHIEU!=null))throw fail('Cấu hình không cho phép giảm giá.');
  lines.push({...product,quantity,price,amount:quantity*price,discountRate:policy.rate(item.TILEGIAMGIA),...policy.taxPolicy(product,rates,item.TILETHUE)});
 }
 const reduction=policy.billDiscount(lines,discount.discountRate,body.TIENGIAMGIAPHIEU),totals=policy.calculate(lines,rates,reduction.percent,reduction.fixed);
 const now=new Date(),code=String(body.NAME||await require('./documentNumbers').previewNumber('BanPhuTung')).trim();if(code.length>100)throw fail('Số phiếu quá dài.');
 const header={NAME:code,STATUS:1,NGAY:now.toISOString(),DCUAHANGID:branchId,NOTE:String(body.NOTE||'').slice(0,2048),TIENHANG:totals.subtotal,TIENHANGCHUAGIAM:totals.subtotal,TILEGIAMGIA:reduction.percent,TIENGIAMGIA:totals.discount,TIENTHUE:totals.tax,PHIDICHVU:0,TILEPHIDICHVU:0,TILETHUE:rates.taxRate,TONGCONG:totals.total,TAXSUMMARY:JSON.stringify(totals.taxGroups),KHACHDUA:0,TRALAI:0,CHUYENKHOAN:0,THE:0,CONGNO:0,CONLAI:0,DATHANHTOAN:0,GIOTHANHTOAN:'',DOITRA:0};
 const details=totals.details.map(line=>({SLXUAT:line.quantity,DONGIA:line.price,THANHTIEN:line.amount,TIENGIAMGIA:line.discount,TIENCHIETKHAU:line.lineDiscount,TILECHIETKHAU:line.lineDiscountRate,TENHANG:line.NAME,M_NAME:line.NAME,M_CODE:line.CODE,DV_NAME:line.UNITNAME||'',SLXUATCHUAQUYDOI:line.quantity}));
 return require('./salesPrint').assembleSalesPayload(header,details,customer,warehouse,user);
}
module.exports={payload};
