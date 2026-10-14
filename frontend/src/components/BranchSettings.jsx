import { useState } from 'react';
import {
  Settings,
  Building2,
  Phone,
  MapPin,
  HeartHandshake,
  QrCode,
  CreditCard,
  Share2,
  Check,
  X,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import api from '../api';
import { branchId } from '../utils/branchSession';
import './BranchSettings.css';

export default function BranchSettings() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [sharingId, setSharingId] = useState(null);

  const id = branchId();

  async function load() {
    try {
      const res = await api.get(`/branches/${id}/settings`);
      setData(res.data);
      setError('');
      setSuccessMsg('');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }

  async function share(account) {
    setSharingId(account.ID);
    setError('');
    try {
      await api.put(`/branches/bank-accounts/${account.ID}/shared`, {
        shared: Number(account.SHAREDORG) !== 1
      });
      const fresh = (await api.get(`/branches/${id}/settings`)).data;
      setData((old) => ({ ...old, accounts: fresh.accounts, managedAccounts: fresh.managedAccounts,
        values: { ...old.values, PaymentBankAccountId: fresh.accounts.some(a => a.ID === old.values.PaymentBankAccountId) ? old.values.PaymentBankAccountId : '' }
      }));
      setSuccessMsg(
        Number(account.SHAREDORG) === 1
          ? `Đã ngừng dùng chung tài khoản ${account.TENNGANHANG}`
          : `Đã kích hoạt dùng chung tài khoản ${account.TENNGANHANG} cho mọi chi nhánh`
      );
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSharingId(null);
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.put(`/branches/${id}/settings`, {
        values: data.values,
        version: data.version
      });
      const fresh = (await api.get(`/branches/${id}/settings`)).data;
      setData(fresh);
      setSuccessMsg('Đã lưu cấu hình chi nhánh thành công!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={!id || id === 'all'}
        onClick={load}
        title={!id || id === 'all' ? 'Vui lòng chọn 1 chi nhánh cụ thể để cấu hình' : 'Cấu hình chi nhánh'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#334155',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: !id || id === 'all' ? 'not-allowed' : 'pointer',
          opacity: !id || id === 'all' ? 0.6 : 1,
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          if (id && id !== 'all') {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#94a3b8';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.borderColor = '#cbd5e1';
        }}
      >
        <Settings size={15} color="#ea580c" />
        <span>Cấu hình chi nhánh</span>
      </button>

      {error && !data && (
        <span role="alert" style={{ color: '#dc2626', fontSize: 12 }}>
          {error}
        </span>
      )}

      {data && (
        <div
          className="settings-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Cấu hình chi nhánh"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) {
              setData(null);
              setError('');
              setSuccessMsg('');
            }
          }}
        >
          <div className="settings-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* ===== HEADER ===== */}
            <header className="settings-modal-header">
              <div className="settings-modal-header-left">
                <div className="settings-modal-header-icon">
                  <Settings size={23} />
                </div>
                <div>
                  <h2 className="settings-modal-title">Cấu Hình Chi Nhánh</h2>
                  <p className="settings-modal-subtitle">
                    Thiết lập thông tin in ấn hóa đơn, báo giá và tài khoản ngân hàng nhận thanh toán QR.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="settings-modal-close-btn"
                aria-label="Đóng cửa sổ"
                disabled={saving}
                onClick={() => {
                  setData(null);
                  setError('');
                  setSuccessMsg('');
                }}
              >
                <X size={20} />
              </button>
            </header>

            {/* ===== BODY ===== */}
            <div className="settings-modal-body">
              {/* Alert Feedback */}
              {error && (
                <div className="settings-alert error" role="alert">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="settings-alert success" role="status">
                  <CheckCircle2 size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* SECTION 1: THÔNG TIN BẢN IN */}
              <section className="settings-section-card">
                <h3 className="settings-section-title">
                  <Building2 size={16} />
                  <span>Thông tin hiển thị trên bản in & hóa đơn</span>
                </h3>

                <div className="settings-grid-2">
                  <div className="settings-form-group">
                    <label className="settings-form-label" htmlFor="setting-company-name">
                      <Building2 size={14} color="#64748b" />
                      <span>Tên đơn vị trên bản in</span>
                    </label>
                    <input
                      id="setting-company-name"
                      type="text"
                      className="settings-input"
                      placeholder="Ví dụ: KAZUKO AUTO - CHI NHÁNH QUẬN 12"
                      value={data.values.CompanyName || ''}
                      onChange={(e) =>
                        setData({
                          ...data,
                          values: { ...data.values, CompanyName: e.target.value }
                        })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-form-label" htmlFor="setting-company-phone">
                      <Phone size={14} color="#64748b" />
                      <span>Số điện thoại hotline</span>
                    </label>
                    <input
                      id="setting-company-phone"
                      type="text"
                      className="settings-input"
                      placeholder="Ví dụ: 0917 66 4444"
                      value={data.values.CompanyPhone || ''}
                      onChange={(e) =>
                        setData({
                          ...data,
                          values: { ...data.values, CompanyPhone: e.target.value }
                        })
                      }
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label" htmlFor="setting-company-address">
                    <MapPin size={14} color="#64748b" />
                    <span>Địa chỉ chi nhánh</span>
                  </label>
                  <input
                    id="setting-company-address"
                    type="text"
                    className="settings-input"
                    placeholder="Ví dụ: Số 925/15 Âu Cơ, Phường Tân Sơn Nhì, Q. Tân Phú, TP.HCM"
                    value={data.values.CompanyAddress || ''}
                    onChange={(e) =>
                      setData({
                        ...data,
                        values: { ...data.values, CompanyAddress: e.target.value }
                      })
                    }
                    disabled={saving}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label" htmlFor="setting-loi-cam-on">
                    <HeartHandshake size={14} color="#64748b" />
                    <span>Lời cảm ơn cuối hóa đơn / phiếu sửa chữa</span>
                  </label>
                  <input
                    id="setting-loi-cam-on"
                    type="text"
                    className="settings-input"
                    placeholder="Ví dụ: Cảm ơn quý khách đã tin tưởng dịch vụ của Kazuko Auto!"
                    value={data.values.LoiCamOn || ''}
                    onChange={(e) =>
                      setData({
                        ...data,
                        values: { ...data.values, LoiCamOn: e.target.value }
                      })
                    }
                    disabled={saving}
                  />
                </div>
              </section>

              {/* SECTION 2: TÀI KHOẢN QR CHÍNH */}
              <section className="settings-section-card">
                <h3 className="settings-section-title">
                  <QrCode size={16} />
                  <span>Tài khoản nhận chuyển khoản (Mã QR thanh toán)</span>
                </h3>

                <div className="settings-form-group">
                  <label className="settings-form-label" htmlFor="setting-qr-bank">
                    <CreditCard size={14} color="#64748b" />
                    <span>Chọn tài khoản sinh mã QR in trên hóa đơn</span>
                  </label>
                  <select
                    id="setting-qr-bank"
                    className="settings-select"
                    value={data.values.PaymentBankAccountId || ''}
                    onChange={(e) =>
                      setData({
                        ...data,
                        values: { ...data.values, PaymentBankAccountId: e.target.value }
                      })
                    }
                    disabled={saving}
                  >
                    <option value="">-- Không hiển thị mã QR thanh toán --</option>
                    {data.accounts.map((a) => (
                      <option key={a.ID} value={a.ID}>
                        {a.TENNGANHANG} · STK: {a.SOTAIKHOAN} ({a.NAME})
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {/* SECTION 3: TÀI KHOẢN DÙNG CHUNG */}
              <section className="settings-section-card">
                <h3 className="settings-section-title">
                  <Share2 size={16} />
                  <span>Quản lý tài khoản ngân hàng dùng chung toàn hệ thống</span>
                </h3>

                <div className="settings-bank-list">
                  {(data.managedAccounts || data.accounts).map((a) => {
                    const isShared = Number(a.SHAREDORG) === 1;
                    const isSharing = sharingId === a.ID;

                    return (
                      <div key={a.ID} className="settings-bank-item">
                        <div className="settings-bank-info">
                          <div className="settings-bank-name">
                            <span>{a.TENNGANHANG}</span>
                            <span style={{ color: '#ea580c' }}>STK: {a.SOTAIKHOAN}</span>
                            <span className={`settings-badge ${isShared ? 'shared' : 'local'}`}>
                              {isShared ? 'Dùng chung mọi chi nhánh' : 'Nội bộ chi nhánh'}
                            </span>
                          </div>
                          <span className="settings-bank-sub">
                            Chủ tài khoản: <strong>{a.NAME || '—'}</strong>
                            {a.BRANCHNAME && <> · Chi nhánh quản lý: <strong>{a.BRANCHNAME}</strong></>}
                          </span>
                        </div>

                        <button
                          type="button"
                          className={`settings-share-btn ${isShared ? 'is-active' : ''}`}
                          disabled={saving || isSharing}
                          onClick={() => share(a)}
                          title={isShared ? 'Chuyển về chỉ dùng cho chi nhánh quản lý tài khoản' : 'Bật dùng chung cho mọi chi nhánh gara'}
                        >
                          <Share2 size={13} />
                          <span>
                            {isSharing
                              ? 'Đang đổi…'
                              : isShared
                              ? 'Ngừng dùng chung'
                              : 'Dùng chung toàn gara'}
                          </span>
                        </button>
                      </div>
                    );
                  })}

                  {(data.managedAccounts || data.accounts).length === 0 && (
                    <span style={{ color: '#94a3b8', fontSize: 12.5, textAlign: 'center', padding: '16px 0' }}>
                      Chưa có tài khoản ngân hàng nào được thiết lập.
                    </span>
                  )}
                </div>
              </section>
            </div>

            {/* ===== FOOTER ===== */}
            <footer className="settings-modal-footer">
              <button
                type="button"
                className="settings-btn settings-btn-ghost"
                disabled={saving}
                onClick={() => {
                  setData(null);
                  setError('');
                  setSuccessMsg('');
                }}
              >
                <span>Hủy bỏ</span>
              </button>

              <button
                type="button"
                className="settings-btn settings-btn-primary"
                disabled={saving}
                onClick={save}
              >
                <Check size={16} />
                <span>{saving ? 'Đang lưu…' : 'Lưu cấu hình chi nhánh'}</span>
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
