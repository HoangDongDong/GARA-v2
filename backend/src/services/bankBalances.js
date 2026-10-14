const branchSql=require('../branchSql');
const db = require('../db.js');
// Balances are derived from active receipts/payments, so cancelled cash entries
// stop affecting the account without maintaining a second mutable balance.
async function load(query=db.query) {
  const accounts=await query(`SELECT ID,NAME,SOTAIKHOAN,TENNGANHANG,COALESCE(SODUDAU,0) AS OPENING${require('../branchScope').enabled()?',SHAREDORG':''} FROM ${branchSql.table('DTAIKHOANNGANHANG')} WHERE STATUS=1 ORDER BY NAME`);
  const movements=await query(`SELECT DTAIKHOANNGANHANGID AS ACCOUNT_ID,SUM(AMOUNT) AS AMOUNT FROM (
    SELECT DTAIKHOANNGANHANGID,CASE WHEN LOAI=1 THEN -SOTIEN ELSE SOTIEN END AS AMOUNT FROM ${branchSql.table('TTHUCHI')} WHERE STATUS=1
    UNION ALL
    SELECT C.DTAIKHOANNGANHANGID,C.SOTIEN FROM ${branchSql.table('TCHITIETTHANHTOAN')} C
      LEFT JOIN ${branchSql.table('TDONHANG')} S ON S.ID=C.TDONHANGID LEFT JOIN ${branchSql.table('THOADONSUACHUA')} R ON R.ID=C.THOADONSUACHUAID
      WHERE C.STATUS=1 AND C.LOAI IN (1,2) AND (S.STATUS=1 OR R.STATUS=1)
    UNION ALL
    SELECT S.DTAIKHOANNGANHANGID,COALESCE(S.CHUYENKHOAN,0)+COALESCE(S.THE,0) FROM ${branchSql.table('TDONHANG')} S
      WHERE S.STATUS=1 AND NOT EXISTS (SELECT C.ID FROM ${branchSql.table('TCHITIETTHANHTOAN')} C WHERE C.TDONHANGID=S.ID AND C.STATUS=1 AND C.LOAI IN (1,2))
    UNION ALL
    SELECT R.DTAIKHOANNGANHANGID,COALESCE(R.CHUYENKHOAN,0)+COALESCE(R.THE,0) FROM ${branchSql.table('THOADONSUACHUA')} R
      WHERE R.STATUS=1 AND NOT EXISTS (SELECT C.ID FROM ${branchSql.table('TCHITIETTHANHTOAN')} C WHERE C.THOADONSUACHUAID=R.ID AND C.STATUS=1 AND C.LOAI IN (1,2))
  ) M WHERE DTAIKHOANNGANHANGID IS NOT NULL GROUP BY DTAIKHOANNGANHANGID`);
  const amounts=new Map(movements.map(row=>[row.ACCOUNT_ID,Number(row.AMOUNT || 0)]));

  const shared=accounts.filter(a=>Number(a.SHAREDORG)===1);
  if(require('../branchScope').enabled()&&require('../branchScope').current()?.branchId&&shared.length){
   // Owner explicitly shares these accounts across the organization. Expose
   // only their aggregate balance, never another branch's documents.
   const global=await query(`SELECT M.ACCOUNT_ID,SUM(M.AMOUNT) AS AMOUNT FROM (
    SELECT DTAIKHOANNGANHANGID AS ACCOUNT_ID,CASE WHEN LOAI=1 THEN -SOTIEN ELSE SOTIEN END AS AMOUNT FROM TTHUCHI WHERE STATUS=1
    UNION ALL SELECT C.DTAIKHOANNGANHANGID,C.SOTIEN FROM TCHITIETTHANHTOAN C LEFT JOIN TDONHANG S ON S.ID=C.TDONHANGID LEFT JOIN THOADONSUACHUA R ON R.ID=C.THOADONSUACHUAID WHERE C.STATUS=1 AND C.LOAI IN(1,2) AND (S.STATUS=1 OR R.STATUS=1)
    UNION ALL SELECT S.DTAIKHOANNGANHANGID,COALESCE(S.CHUYENKHOAN,0)+COALESCE(S.THE,0) FROM TDONHANG S WHERE S.STATUS=1 AND NOT EXISTS(SELECT 1 FROM TCHITIETTHANHTOAN C WHERE C.TDONHANGID=S.ID AND C.STATUS=1 AND C.LOAI IN(1,2))
    UNION ALL SELECT R.DTAIKHOANNGANHANGID,COALESCE(R.CHUYENKHOAN,0)+COALESCE(R.THE,0) FROM THOADONSUACHUA R WHERE R.STATUS=1 AND NOT EXISTS(SELECT 1 FROM TCHITIETTHANHTOAN C WHERE C.THOADONSUACHUAID=R.ID AND C.STATUS=1 AND C.LOAI IN(1,2))
   ) M WHERE M.ACCOUNT_ID IN (${shared.map(()=>'?').join(',')}) GROUP BY M.ACCOUNT_ID`,shared.map(a=>a.ID));
   const totals=new Map(global.map(r=>[r.ACCOUNT_ID,Number(r.AMOUNT||0)]));for(const a of shared)amounts.set(a.ID,totals.get(a.ID)||0);
  }
  return accounts.map(row=>({...row,BALANCE:Math.round((Number(row.OPENING)+ (amounts.get(row.ID)||0))*100)/100}));
}
module.exports={load};
