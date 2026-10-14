const branchSql=require('../branchSql');
const express = require('express');
const router = express.Router();
const db = require('../db.js');
router.use('/center', require('./reportCenter.js'));

/**
 * Bao cao tong quan.
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [kh]    = await db.query(`SELECT COUNT(*) AS TOTAL FROM DKHACHHANG WHERE STATUS=1`);
    const receivedOnly=require('../branchScope').enabled()?` AND (
      EXISTS (SELECT 1 FROM ${branchSql.table('TTIEPNHANXE')} TN WHERE TN.DXEID=V.ID AND TN.STATUS=1)
      OR EXISTS (SELECT 1 FROM ${branchSql.table('TLENHSUACHUA')} LS WHERE LS.DXEID=V.ID AND LS.STATUS=1)
      OR EXISTS (SELECT 1 FROM ${branchSql.table('TTRANGTHAIXE')} TT WHERE TT.DXEID=V.ID AND TT.STATUS=1)
    )`:'';
    const [xe] = await db.query(`SELECT COUNT(*) AS TOTAL FROM DXE V WHERE V.STATUS=1${receivedOnly}`);
    const [pt]    = await db.query(`SELECT COUNT(*) AS TOTAL FROM DMATHANG   WHERE STATUS=1 AND TAMKHOA=0`);
    const [nv]    = await db.query(`SELECT COUNT(*) AS TOTAL FROM ${branchSql.table('DNHANVIEN')}  WHERE STATUS=1`);
    const [tn]    = await db.query(`SELECT COUNT(*) AS TOTAL FROM ${branchSql.table('TTIEPNHANXE')} WHERE STATUS=1`);
    const [lsc]   = await db.query(`SELECT COUNT(*) AS TOTAL FROM ${branchSql.table('TLENHSUACHUA')} WHERE STATUS=1`);
    const [hd]    = await db.query(
      `SELECT COUNT(*) AS TOTAL,
              COALESCE(SUM(CASE WHEN DATHANHTOAN=1 THEN TONGCONG ELSE 0 END),0) AS DOANH_THU,
              COALESCE(SUM(CASE WHEN DATHANHTOAN=0 THEN CONLAI ELSE 0 END),0)    AS CONG_NO
         FROM ${branchSql.table('THOADONSUACHUA')} WHERE STATUS=1`
    );
    const [kho]   = await db.query(
      `SELECT COALESCE(SUM(TON_KHO),0) AS TONG_SL,
              COALESCE(SUM(TON_KHO * COALESCE(GIANHAP,0)),0) AS GIA_TRI
         FROM (
           SELECT M.ID, M.GIANHAP,
                  ${require('../services/stock.js').expression('M.ID')} AS TON_KHO
             FROM DMATHANG M
            WHERE M.STATUS=1 AND M.TAMKHOA=0
         )`
    );

    res.json({
      data: {
        khachHang: kh.TOTAL,
        xe:        xe.TOTAL,
        phuTung:   pt.TOTAL,
        nhanVien:  nv.TOTAL,
        tiepNhan:  tn.TOTAL,
        lenhSuaChua: lsc.TOTAL,
        hoaDon:    hd.TOTAL,
        doanhThu:  hd.DOANH_THU,
        congNo:    hd.CONG_NO,
        tongSLKho: kho.TONG_SL,
        giaTriKho: kho.GIA_TRI,
      },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// doanh thu theo ngay
router.get('/revenue', async (req, res) => {
  try {
    const { from, to } = req.query;
    const rows = await db.query(
      `SELECT CAST(NGAY AS DATE)        AS NGAY,
              COUNT(*)                  AS SO_HD,
              COALESCE(SUM(TONGCONG),0) AS DOANH_THU,
              COALESCE(SUM(TIENPHUTUNG),0) AS TIEN_PT,
              COALESCE(SUM(TIENCONG),0)    AS TIEN_CONG
         FROM ${branchSql.table('THOADONSUACHUA')}
        WHERE STATUS=1 AND DATHANHTOAN=1
          AND CAST(NGAY AS DATE) BETWEEN ? AND ?
     GROUP BY CAST(NGAY AS DATE)
     ORDER BY NGAY`,
      [from || '2000-01-01', to || '2100-12-31']
    );
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Lich bao duong va nhac han gan nhat
router.get('/maintenance', async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT FIRST 20 LS.ID, LS.NAME, LS.DXEID, LS.DKHACHHANGID,
             LS.LOAIBAODUONG, LS.CHUKY_NGAY, LS.CHUKY_KM,
             LS.ODO_LANCUOI, LS.NGAY_LANCUOI, LS.NGAY_DUKIEN,
             LS.ODO_DUKIEN, LS.DANH_AC_CHUYEN,
             V.BIENSO, V.ODO AS ODO_HIENTAI, KH.NAME AS TEN_KH
        FROM ${branchSql.table('TLICHSUBAODUONG')} LS
        LEFT JOIN DXE V ON V.ID = LS.DXEID
        LEFT JOIN DKHACHHANG KH ON KH.ID = LS.DKHACHHANGID
       WHERE LS.STATUS = 1
       ORDER BY CASE WHEN LS.NGAY_DUKIEN IS NULL THEN 1 ELSE 0 END,
                LS.NGAY_DUKIEN, LS.TIMECREATED DESC
    `);
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
