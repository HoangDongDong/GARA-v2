import { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Send,
  CheckCheck,
  XCircle,
  RotateCcw,
  Search,
  X,
  Info,
  Building,
  ArrowRight,
  Trash2,
  FileText,
  AlertCircle,
  Truck
} from 'lucide-react';
import api from '../api';
import { branchId } from '../utils/branchSession';
import './InventoryTransfers.css';

const states = {
  DRAFT: 'Nháp',
  SENT: 'Đang vận chuyển',
  PARTIAL: 'Đã nhận một phần',
  RECEIVED: 'Đã nhận đủ',
  CANCELLED: 'Đã hủy'
};

export default function InventoryTransfers() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ warehouses: [], branches: [] });
  const [parts, setParts] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [receipt, setReceipt] = useState(null);

  // Bộ lọc danh sách phiếu
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState('all');

  const id = branchId();

  const displayError = (e) => {
    setError(e.response?.data?.error || e.message);
  };

  async function load() {
    setBusy(true);
    try {
      const [r, o, p] = await Promise.all([
        api.get('/inventory-transfers'),
        api.get('/inventory-transfers/options'),
        api.get('/parts')
      ]);
      setRows(r.data.data || []);
      setOptions(o.data || { warehouses: [], branches: [] });
      setParts(p.data.data || []);
      setOpen(true);
      setError('');
    } catch (e) {
      displayError(e);
    } finally {
      setBusy(false);
    }
  }

  async function action(key, row) {
    setBusy(true);
    setError('');
    try {
      await api.post(`/inventory-transfers/${row.ID}/${key}`);
      await load();
    } catch (e) {
      displayError(e);
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!form.sourceWarehouse || !form.targetWarehouse) {
      setError('Vui lòng chọn cả kho xuất và kho nhận.');
      return;
    }
    if (!form.items.length || form.items.some((i) => !i.partId || Number(i.quantity) <= 0)) {
      setError('Vui lòng chọn đầy đủ mặt hàng và số lượng chuyển hợp lệ (> 0).');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await api.post('/inventory-transfers', form);
      setForm(null);
      await load();
    } catch (e) {
      displayError(e);
    } finally {
      setBusy(false);
    }
  }

  async function receive(row) {
    setBusy(true);
    setError('');
    try {
      const h = (await api.get(`/inventory-transfers/${row.ID}`)).data.data;
      setReceipt(h);
    } catch (e) {
      displayError(e);
    } finally {
      setBusy(false);
    }
  }

  async function saveReceipt() {
    setBusy(true);
    setError('');
    try {
      await api.post(`/inventory-transfers/${receipt.ID}/receive`, {
        items: receipt.items.map((i) => ({
          id: i.ID,
          quantity: Number(i.SOLUONGNHAN)
        }))
      });
      setReceipt(null);
      await load();
    } catch (e) {
      displayError(e);
    } finally {
      setBusy(false);
    }
  }

  // Danh sách đã lọc
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        !searchQuery ||
        (r.NAME || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.KHOXUAT || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.KHONHAP || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchState = filterState === 'all' || r.STATE === filterState;

      return matchSearch && matchState;
    });
  }, [rows, searchQuery, filterState]);

  return (
    <>
      <button
        type="button"
        onClick={load}
        disabled={busy}
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
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f8fafc';
          e.currentTarget.style.borderColor = '#94a3b8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.borderColor = '#cbd5e1';
        }}
      >
        <Boxes size={15} color="#ea580c" />
        <span>Chuyển kho chi nhánh</span>
      </button>

      {error && !open && (
        <span role="alert" style={{ color: '#dc2626', fontSize: 12 }}>
          {error}
        </span>
      )}

      {open && (
        <div
          className="transfer-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Chuyển kho chi nhánh"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) {
              setOpen(false);
              setForm(null);
              setReceipt(null);
            }
          }}
        >
          <div className="transfer-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* ===== HEADER ===== */}
            <header className="transfer-modal-header">
              <div className="transfer-modal-header-left">
                <div className="transfer-modal-header-icon">
                  <Boxes size={24} />
                </div>
                <div>
                  <h2 className="transfer-modal-title">Chuyển Kho Giữa Các Chi Nhánh</h2>
                  <p className="transfer-modal-subtitle">
                    Điều chuyển phụ tùng, vật tư và đồng bộ tồn kho giữa các cơ sở gara KAZUKO.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="transfer-modal-close-btn"
                aria-label="Đóng cửa sổ"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setForm(null);
                  setReceipt(null);
                  setError('');
                }}
              >
                <X size={20} />
              </button>
            </header>

            {/* ===== BODY ===== */}
            <div className="transfer-modal-body">
              {/* Box quy tắc */}
              <div className="transfer-notice">
                <Info size={16} />
                <div>
                  <strong>Quy tắc luân chuyển kho:</strong> Khi gửi hàng, hệ thống sẽ trừ tồn tại kho xuất ngay lập tức.
                  Kho nhận chỉ được ghi nhận tăng số lượng khi đã kiểm đếm và bấm <em>Xác nhận nhận hàng</em>.
                </div>
              </div>

              {/* Lỗi nếu có */}
              {error && (
                <div className="transfer-alert-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* ===== 1. VIEW DANH SÁCH PHIẾU ===== */}
              {!form && !receipt && (
                <>
                  <div className="transfer-toolbar">
                    <button
                      type="button"
                      className="transfer-btn transfer-btn-primary"
                      disabled={id === 'all' || busy}
                      onClick={() =>
                        setForm({
                          sourceWarehouse: '',
                          targetWarehouse: '',
                          note: '',
                          items: [{ partId: '', quantity: 1 }]
                        })
                      }
                      title={id === 'all' ? 'Vui lòng chọn 1 chi nhánh cụ thể để tạo phiếu' : 'Lập phiếu chuyển kho mới'}
                    >
                      <Plus size={15} />
                      <span>Tạo phiếu chuyển kho</span>
                    </button>

                    <div className="transfer-search-group">
                      <div className="transfer-search-box">
                        <Search size={14} color="#64748b" />
                        <input
                          type="search"
                          placeholder="Tìm số phiếu, kho xuất, kho nhận…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      <select
                        className="transfer-filter-select"
                        value={filterState}
                        aria-label="Lọc trạng thái phiếu"
                        onChange={(e) => setFilterState(e.target.value)}
                      >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="DRAFT">Nháp</option>
                        <option value="SENT">Đang vận chuyển</option>
                        <option value="PARTIAL">Đã nhận một phần</option>
                        <option value="RECEIVED">Đã nhận đủ</option>
                        <option value="CANCELLED">Đã hủy</option>
                      </select>

                      <button
                        type="button"
                        className="transfer-btn transfer-btn-ghost"
                        style={{ padding: '7px 11px' }}
                        disabled={busy}
                        onClick={load}
                        title="Tải lại danh sách"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="transfer-table-wrap">
                    <table className="transfer-table">
                      <thead>
                        <tr>
                          <th style={{ width: 44, textAlign: 'center' }}>STT</th>
                          <th>Số phiếu</th>
                          <th>Kho xuất (Gửi)</th>
                          <th>Kho nhận (Đích)</th>
                          <th style={{ textAlign: 'center' }}>Trạng thái</th>
                          <th style={{ textAlign: 'center', width: 170 }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((r, idx) => {
                          const stateClass =
                            r.STATE === 'DRAFT'
                              ? 'draft'
                              : r.STATE === 'SENT'
                              ? 'sent'
                              : r.STATE === 'PARTIAL'
                              ? 'partial'
                              : r.STATE === 'RECEIVED'
                              ? 'received'
                              : 'cancelled';

                          return (
                            <tr key={r.ID}>
                              <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                              <td>
                                <strong style={{ color: '#ea580c' }}>{r.NAME}</strong>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Building size={14} color="#64748b" />
                                  <span>{r.KHOXUAT}</span>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <ArrowRight size={14} color="#64748b" />
                                  <span>{r.KHONHAP}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`transfer-badge ${stateClass}`}>
                                  {r.STATE === 'SENT' && <Truck size={12} />}
                                  {states[r.STATE] || r.STATE}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div className="transfer-row-actions">
                                  {r.DCUAHANGID === id && r.STATE === 'DRAFT' && (
                                    <>
                                      <button
                                        type="button"
                                        className="transfer-action-btn send"
                                        disabled={busy}
                                        onClick={() => action('send', r)}
                                        title="Bắt đầu gửi hàng và trừ tồn kho xuất"
                                      >
                                        <Send size={12} />
                                        <span>Gửi hàng</span>
                                      </button>
                                      <button
                                        type="button"
                                        className="transfer-action-btn cancel"
                                        disabled={busy}
                                        onClick={() => action('cancel', r)}
                                        title="Hủy bỏ phiếu nháp"
                                      >
                                        <XCircle size={12} />
                                        <span>Hủy nháp</span>
                                      </button>
                                    </>
                                  )}

                                  {r.DCHINHANHDICHID === id && ['SENT', 'PARTIAL'].includes(r.STATE) && (
                                    <button
                                      type="button"
                                      className="transfer-action-btn receive"
                                      disabled={busy}
                                      onClick={() => receive(r)}
                                      title="Kiểm đếm và xác nhận nhận hàng"
                                    >
                                      <CheckCheck size={13} />
                                      <span>Xác nhận nhận</span>
                                    </button>
                                  )}

                                  {!(r.DCUAHANGID === id && r.STATE === 'DRAFT') &&
                                    !(r.DCHINHANHDICHID === id && ['SENT', 'PARTIAL'].includes(r.STATE)) && (
                                      <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                                    )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredRows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="transfer-table-empty">
                              Không có phiếu chuyển kho nào phù hợp với bộ lọc hiện tại.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ===== 2. VIEW TẠO PHIẾU CHUYỂN KHO ===== */}
              {form && (
                <div className="transfer-form-card">
                  <div className="transfer-card-header">
                    <h3 className="transfer-card-title">
                      <Plus size={17} />
                      <span>Lập Phiếu Chuyển Kho Mới</span>
                    </h3>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Điền thông tin xuất - nhập kho và danh mục phụ tùng cần chuyển
                    </span>
                  </div>

                  {/* Kho Xuất / Nhập Grid */}
                  <div className="transfer-warehouse-grid">
                    <div className="transfer-form-group">
                      <label className="transfer-form-label" htmlFor="source-warehouse-select">
                        <Building size={14} />
                        <span>Kho xuất hàng (Chi nhánh hiện tại)</span>
                        <span className="required">*</span>
                      </label>
                      <select
                        id="source-warehouse-select"
                        className="transfer-select"
                        value={form.sourceWarehouse}
                        onChange={(e) => setForm({ ...form, sourceWarehouse: e.target.value })}
                        disabled={busy}
                      >
                        <option value="">-- Chọn kho xuất tại chi nhánh --</option>
                        {options.warehouses
                          .filter((k) => k.DCUAHANGID === id)
                          .map((k) => (
                            <option key={k.ID} value={k.ID}>
                              {k.NAME}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="transfer-form-group">
                      <label className="transfer-form-label" htmlFor="target-warehouse-select">
                        <ArrowRight size={14} />
                        <span>Kho chi nhánh nhận hàng</span>
                        <span className="required">*</span>
                      </label>
                      <select
                        id="target-warehouse-select"
                        className="transfer-select"
                        value={form.targetWarehouse}
                        onChange={(e) => setForm({ ...form, targetWarehouse: e.target.value })}
                        disabled={busy}
                      >
                        <option value="">-- Chọn kho chi nhánh đích --</option>
                        {options.warehouses
                          .filter((k) => k.DCUAHANGID !== id)
                          .map((k) => {
                            const bName = options.branches?.find((b) => b.ID === k.DCUAHANGID)?.NAME || 'Chi nhánh';
                            return (
                              <option key={k.ID} value={k.ID}>
                                {bName} — {k.NAME}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  </div>

                  {/* Bảng Mặt hàng Chuyển */}
                  <div className="transfer-items-container">
                    <div className="transfer-items-header">
                      <strong style={{ fontSize: 13, color: '#0f172a' }}>Danh mục mặt hàng chuyển đi:</strong>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        Tổng cộng: <strong>{form.items.length}</strong> mặt hàng
                      </span>
                    </div>

                    <div className="transfer-table-wrap">
                      <table className="transfer-items-table">
                        <thead>
                          <tr>
                            <th style={{ width: 44, textAlign: 'center' }}>STT</th>
                            <th>Mặt hàng / Phụ tùng</th>
                            <th style={{ width: 140, textAlign: 'center' }}>Số lượng chuyển</th>
                            <th style={{ width: 50, textAlign: 'center' }}>Xóa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.items.map((i, index) => (
                            <tr key={index}>
                              <td style={{ textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                              <td>
                                <select
                                  className="transfer-select"
                                  value={i.partId}
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      items: form.items.map((x, j) =>
                                        j === index ? { ...x, partId: e.target.value } : x
                                      )
                                    })
                                  }
                                  disabled={busy}
                                >
                                  <option value="">-- Chọn mặt hàng từ kho --</option>
                                  {parts.map((p) => (
                                    <option key={p.ID} value={p.ID}>
                                      [{p.CODE}] {p.NAME}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  className="transfer-input"
                                  style={{ textAlign: 'right', fontWeight: 600 }}
                                  value={i.quantity}
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      items: form.items.map((x, j) =>
                                        j === index ? { ...x, quantity: Number(e.target.value) } : x
                                      )
                                    })
                                  }
                                  disabled={busy}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {form.items.length > 1 && (
                                  <button
                                    type="button"
                                    className="transfer-btn-remove-item"
                                    title="Xóa dòng này"
                                    disabled={busy}
                                    onClick={() =>
                                      setForm({
                                        ...form,
                                        items: form.items.filter((_, j) => j !== index)
                                      })
                                    }
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      type="button"
                      className="transfer-btn-add-item"
                      disabled={busy}
                      onClick={() =>
                        setForm({
                          ...form,
                          items: [...form.items, { partId: '', quantity: 1 }]
                        })
                      }
                    >
                      <Plus size={14} />
                      <span>Thêm mặt hàng khác</span>
                    </button>
                  </div>

                  {/* Ghi chú */}
                  <div className="transfer-form-group">
                    <label className="transfer-form-label" htmlFor="transfer-note-input">
                      <FileText size={14} />
                      <span>Ghi chú vận chuyển (nếu có)</span>
                    </label>
                    <input
                      id="transfer-note-input"
                      type="text"
                      className="transfer-input"
                      placeholder="Nhập lý do chuyển kho, biển số xe vận chuyển hoặc lưu ý người nhận…"
                      value={form.note}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                      disabled={busy}
                    />
                  </div>

                  {/* Nút hành động */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8 }}>
                    <button
                      type="button"
                      className="transfer-btn transfer-btn-primary"
                      disabled={busy}
                      onClick={create}
                    >
                      <Plus size={15} />
                      <span>{busy ? 'Đang lưu…' : 'Lưu phiếu chuyển kho (Nháp)'}</span>
                    </button>

                    <button
                      type="button"
                      className="transfer-btn transfer-btn-ghost"
                      disabled={busy}
                      onClick={() => setForm(null)}
                    >
                      <span>Quay lại danh sách</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ===== 3. VIEW XÁC NHẬN NHẬN HÀNG ===== */}
              {receipt && (
                <div className="transfer-form-card">
                  <div className="transfer-card-header">
                    <h3 className="transfer-card-title">
                      <CheckCheck size={18} color="#16a34a" />
                      <span>Xác Nhận Nhận Hàng · Phiếu {receipt.NAME}</span>
                    </h3>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Kiểm đếm thực tế và cập nhật số lượng nhập vào kho chi nhánh
                    </span>
                  </div>

                  <div className="transfer-notice">
                    <Info size={16} />
                    <span>
                      Nhập <strong>tổng số lượng đã nhận lũy kế</strong> tính đến lần nhận này. Số lượng xác nhận sẽ được cộng trực tiếp vào tồn kho chi nhánh đích.
                    </span>
                  </div>

                  <div className="transfer-table-wrap">
                    <table className="transfer-table">
                      <thead>
                        <tr>
                          <th style={{ width: 44, textAlign: 'center' }}>STT</th>
                          <th>Mặt hàng / Phụ tùng</th>
                          <th style={{ textAlign: 'right', width: 140 }}>Số lượng đã gửi</th>
                          <th style={{ textAlign: 'center', width: 180 }}>Số lượng thực nhận lũy kế</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipt.items?.map((i, idx) => (
                          <tr key={i.ID}>
                            <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                            <td>
                              <strong>[{i.CODE}]</strong> {i.NAME}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                              {i.SOLUONGGUI}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                max={i.SOLUONGGUI}
                                step="0.01"
                                className="transfer-input"
                                style={{
                                  width: 120,
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  color: '#15803d',
                                  borderColor: '#86efac'
                                }}
                                value={i.SOLUONGNHAN}
                                onChange={(e) =>
                                  setReceipt({
                                    ...receipt,
                                    items: receipt.items.map((x) =>
                                      x.ID === i.ID ? { ...x, SOLUONGNHAN: Number(e.target.value) } : x
                                    )
                                  })
                                }
                                disabled={busy}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8 }}>
                    <button
                      type="button"
                      className="transfer-btn transfer-btn-primary"
                      disabled={busy}
                      onClick={saveReceipt}
                    >
                      <CheckCheck size={15} />
                      <span>{busy ? 'Đang xử lý…' : 'Xác nhận số lượng thực nhận'}</span>
                    </button>

                    <button
                      type="button"
                      className="transfer-btn transfer-btn-ghost"
                      disabled={busy}
                      onClick={() => setReceipt(null)}
                    >
                      <span>Quay lại</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ===== FOOTER ===== */}
            <footer className="transfer-modal-footer">
              <div className="transfer-footer-stats">
                <span>
                  Tổng số phiếu: <strong>{rows.length}</strong>
                </span>
                <span>•</span>
                <span>
                  Đang vận chuyển: <strong>{rows.filter((r) => r.STATE === 'SENT').length}</strong>
                </span>
              </div>

              <button
                type="button"
                className="transfer-btn transfer-btn-primary"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setForm(null);
                  setReceipt(null);
                  setError('');
                }}
              >
                <span>Đóng cửa sổ</span>
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
