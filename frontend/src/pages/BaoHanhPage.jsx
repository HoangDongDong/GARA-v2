import QuickCreateButton from '../components/QuickCreateButton';
import { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Printer,
  Plus,
  RotateCcw,
  FileSpreadsheet,
  Search,
  X,
  Wrench,
  Table as TableIcon
} from 'lucide-react';
import api from '../api.js';
import { can } from '../utils/permissions.js';
import { openDocumentPrint } from '../components/DocumentPrintDialog';
import './BaoHanhPage.css';
import WarrantyWorkflow from './WarrantyWorkflow';

const day = (value) => String(value || '').slice(0, 10);
const status = (row) =>
  day(row.NGAYKETTHUC) < day(new Date().toISOString()) ? 'Hết hạn' : 'Còn hạn';
const today = () => new Date().toISOString().slice(0, 10);
const empty = () => ({
  DXEID: '',
  NGAYBATDAU: today(),
  NGAYKETTHUC: today(),
  NOTE: '',
  TRANGTHAI: 1,
  KETQUAXULY: '',
  CHIPHI: 0
});

function BaoHanhList({ actionsRef }) {
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api.get('/vehicles/warranties');
      setRows(r.data.data || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((row) =>
    [row.NAME, row.BIENSO, row.TEN_KH].some((value) =>
      String(value || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const active = rows.find((row) => row.ID === selected) || filtered[0];

  const open = async (row = null) => {
    if (!can('WARRANTY', row ? 4 : 2)) return;
    setEditing(row?.ID || null);
    setForm(
      row
        ? {
            ...row,
            NGAYBATDAU: day(row.NGAYBATDAU),
            NGAYKETTHUC: day(row.NGAYKETTHUC)
          }
        : empty()
    );
    setError('');
    try {
      if (!row) {
        const r = await api.get('/vehicles');
        setVehicles(r.data.data || []);
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, CHIPHI: Number(form.CHIPHI || 0) };
      if (editing) await api.put('/vehicles/warranties/' + editing, payload);
      else await api.post('/vehicles/warranties', payload);
      setForm(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    if (!can('EXPORT')) return;
    const cell = (value) =>
      '"' +
      String(value ?? '')
        .replace(/"/g, '""')
        .replace(/^[=+@-]/, "'") +
      '"';
    const data = [
      [
        'Mã bảo hành',
        'Biển số',
        'Khách hàng',
        'Từ ngày',
        'Đến ngày',
        'Nội dung',
        'Kết quả'
      ],
      ...filtered.map((row) => [
        row.NAME,
        row.BIENSO,
        row.TEN_KH,
        day(row.NGAYBATDAU),
        day(row.NGAYKETTHUC),
        row.NOTE,
        row.KETQUAXULY
      ])
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + data], { type: 'text/csv;charset=utf-8' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bao-hanh.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  useEffect(() => {
    if (actionsRef) {
      actionsRef.current = {
        reload: load,
        exportCsv,
        create: () => open()
      };
    }
  }, [actionsRef, filtered]);

  return (
    <div className="warranty-page">
      {error && (
        <div
          role="alert"
          style={{
            color: '#b91c1c',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12.5
          }}
        >
          {error}
        </div>
      )}

      {/* Bố cục chính 2 Cột */}
      <div className="warranty-main-layout">
        {/* CỘT TRÁI: Ô tìm kiếm & Bảng danh sách phiếu bảo hành */}
        <div className="warranty-left-col">
          <div className="warranty-search-bar">
            <div className="warranty-search-wrapper">
              <Search size={15} className="warranty-search-icon" />
              <input
                aria-label="Tìm bảo hành"
                placeholder="Tìm mã bảo hành, biển số, khách hàng…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="warranty-search-input"
              />
            </div>
            <span className="warranty-count-badge">
              Tổng số: <strong>{filtered.length}</strong> phiếu
            </span>
          </div>

          {busy ? (
            <p style={{ color: '#64748b', fontSize: 13, padding: 16 }}>Đang tải dữ liệu bảo hành…</p>
          ) : (
            <div className="warranty-table-card">
              <div className="table-responsive">
                <table className="warranty-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Mã bảo hành</th>
                      <th style={{ textAlign: 'left' }}>Biển số</th>
                      <th style={{ textAlign: 'left' }}>Khách hàng</th>
                      <th style={{ textAlign: 'left' }}>Bắt đầu</th>
                      <th style={{ textAlign: 'left' }}>Kết thúc</th>
                      <th style={{ textAlign: 'center' }}>Thời hạn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const isCurrent = active?.ID === row.ID;
                      const isExpired = status(row) === 'Hết hạn';

                      return (
                        <tr
                          key={row.ID}
                          onClick={() => setSelected(row.ID)}
                          className={`warranty-row ${isCurrent ? 'selected' : ''}`}
                        >
                          <td style={{ fontWeight: 600, color: '#ea580c' }}>
                            {row.NAME}
                          </td>
                          <td style={{ fontWeight: 600 }}>{row.BIENSO}</td>
                          <td>{row.TEN_KH || '—'}</td>
                          <td style={{ color: '#475569' }}>{day(row.NGAYBATDAU)}</td>
                          <td style={{ color: '#475569' }}>{day(row.NGAYKETTHUC)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`warranty-badge ${isExpired ? 'expired' : 'active'}`}>
                              {status(row)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!filtered.length && (
                  <p style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    {error ? 'Chưa tải được dữ liệu.' : 'Chưa có phiếu bảo hành phù hợp với bộ lọc.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: Card Chi tiết phiếu bảo hành đang chọn & Hàng nút thao tác */}
        <div className="warranty-right-col">
          {active ? (
            <div className="warranty-detail-card">
              <div className="warranty-detail-header">
                <div className="warranty-detail-title-group">
                  <div className="warranty-detail-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="warranty-detail-code">{active.NAME}</span>
                      {active.BIENSO && (
                        <span className="warranty-plate-tag">{active.BIENSO}</span>
                      )}
                      <span
                        className={`warranty-badge ${
                          status(active) === 'Còn hạn' ? 'active' : 'expired'
                        }`}
                      >
                        {status(active) === 'Còn hạn' ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertCircle size={12} />
                        )}
                        {status(active)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3 }}>
                      Khách hàng: <strong style={{ color: '#0f172a' }}>{active.TEN_KH || '—'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="warranty-detail-grid">
                <div className="warranty-detail-item">
                  <label>Thời hạn áp dụng</label>
                  <span>
                    {day(active.NGAYBATDAU)} ➔ {day(active.NGAYKETTHUC)}
                  </span>
                </div>

                <div className="warranty-detail-item">
                  <label>Chi phí xử lý</label>
                  <strong style={{ color: '#ea580c', fontSize: 13.5 }}>
                    {Number(active.CHIPHI || 0).toLocaleString('vi-VN')} đ
                  </strong>
                </div>

                <div className="warranty-detail-item full-width">
                  <label>Nội dung bảo hành</label>
                  <span>{active.NOTE || 'Chưa có nội dung bảo hành.'}</span>
                </div>

                <div className="warranty-detail-item full-width">
                  <label>Kết quả xử lý</label>
                  <span>{active.KETQUAXULY || 'Chưa ghi nhận kết quả'}</span>
                </div>
              </div>

              {/* Cụm nút thao tác gọn gàng, tự co giãn, không tràn màn hình */}
              <div className="warranty-detail-actions">
                <button
                  type="button"
                  className="warranty-btn primary"
                  disabled={!can('WARRANTY', 4)}
                  onClick={() => open(active)}
                >
                  <Edit3 size={14} />
                  <span>Sửa / Gia hạn / Ghi kết quả</span>
                </button>

                <button
                  type="button"
                  className="warranty-btn secondary"
                  disabled={!can('WARRANTY', 17)}
                  onClick={() =>
                    openDocumentPrint({ type: 'MauPhieuBaoHanh', id: active.ID })
                  }
                >
                  <Printer size={14} />
                  <span>In phiếu</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="warranty-empty-detail">
              <ShieldCheck size={36} color="#cbd5e1" />
              <span>Chọn một phiếu bảo hành từ danh sách bên trái để xem chi tiết.</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form Thêm / Cập nhật (Hiển thị 2 cột cân đối) */}
      {form && (
        <div className="warranty-modal-overlay" onClick={() => !saving && setForm(null)}>
          <form
            onSubmit={save}
            className="warranty-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="warranty-modal-header">
              <h3 className="warranty-modal-title">
                {editing ? 'Cập nhật phiếu bảo hành' : 'Tạo phiếu bảo hành mới'}
              </h3>
              <button
                type="button"
                className="warranty-modal-close"
                disabled={saving}
                onClick={() => setForm(null)}
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="warranty-modal-grid">
              {/* Cột 1: Thông tin xe & Thời hạn */}
              <div className="warranty-modal-col">
                <div className="warranty-modal-col-title">Thông tin thời hạn & xe</div>

                {!editing ? (
                  <label className="warranty-form-label">
                    <span>Xe áp dụng <span className="req">*</span></span>
                    <div className="select-with-quick-create">
                      <select
                        required
                        className="warranty-form-input"
                        value={form.DXEID}
                        onChange={(e) => setForm({ ...form, DXEID: e.target.value })}
                      >
                        <option value="">-- Chọn xe trong hệ thống --</option>
                        {vehicles.map((v) => (
                          <option key={v.ID} value={v.ID}>
                            {v.BIENSO} — {v.TEN_KH}
                          </option>
                        ))}
                      </select>
                      <QuickCreateButton
                        resource="vehicles"
                        title="Thêm hồ sơ xe"
                        label="Thêm"
                        disabled={saving}
                        onCreated={(id, row, rows) => {
                          setVehicles(rows);
                          setForm((current) => ({ ...current, DXEID: id }));
                        }}
                      />
                    </div>
                  </label>
                ) : (
                  <label className="warranty-form-label">
                    <span>Xe bảo hành</span>
                    <input
                      disabled
                      className="warranty-form-input"
                      value={`${form.BIENSO || ''} — ${form.TEN_KH || 'Khách hàng'}`}
                      style={{ background: '#f8fafc', color: '#475569' }}
                    />
                  </label>
                )}

                <label className="warranty-form-label">
                  <span>Ngày bắt đầu <span className="req">*</span></span>
                  <input
                    required
                    type="date"
                    className="warranty-form-input"
                    value={form.NGAYBATDAU}
                    onChange={(e) => setForm({ ...form, NGAYBATDAU: e.target.value })}
                  />
                </label>

                <label className="warranty-form-label">
                  <span>Ngày kết thúc <span className="req">*</span></span>
                  <input
                    required
                    min={form.NGAYBATDAU}
                    type="date"
                    className="warranty-form-input"
                    value={form.NGAYKETTHUC}
                    onChange={(e) => setForm({ ...form, NGAYKETTHUC: e.target.value })}
                  />
                </label>

                {editing && (
                  <>
                    <label className="warranty-form-label">
                      <span>Trạng thái xử lý</span>
                      <select
                        className="warranty-form-input"
                        value={form.TRANGTHAI}
                        onChange={(e) =>
                          setForm({ ...form, TRANGTHAI: Number(e.target.value) })
                        }
                      >
                        <option value="0">Chờ tiếp nhận</option>
                        <option value="1">Đã tiếp nhận</option>
                        <option value="2">Đang xử lý</option>
                        <option value="3">Hoàn thành</option>
                      </select>
                    </label>

                    <label className="warranty-form-label">
                      <span>Chi phí xử lý (đ)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="warranty-form-input"
                        value={form.CHIPHI || 0}
                        onChange={(e) => setForm({ ...form, CHIPHI: e.target.value })}
                      />
                    </label>
                  </>
                )}
              </div>

              {/* Cột 2: Nội dung & Kết quả xử lý */}
              <div className="warranty-modal-col">
                <div className="warranty-modal-col-title">Nội dung & Kết quả</div>

                <label className="warranty-form-label" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span>Nội dung bảo hành</span>
                  <textarea
                    maxLength={2000}
                    rows={editing ? 4 : 8}
                    className="warranty-form-textarea"
                    style={{ flex: 1, minHeight: editing ? 85 : 170 }}
                    value={form.NOTE || ''}
                    placeholder="Nhập chi tiết linh kiện phụ tùng, hạng mục bảo hành, điều kiện áp dụng…"
                    onChange={(e) => setForm({ ...form, NOTE: e.target.value })}
                  />
                </label>

                {editing && (
                  <label className="warranty-form-label" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span>Kết quả xử lý</span>
                    <textarea
                      maxLength={2000}
                      rows={3}
                      className="warranty-form-textarea"
                      style={{ flex: 1, minHeight: 80 }}
                      value={form.KETQUAXULY || ''}
                      placeholder="Ghi nhận kết quả sau khi kiểm tra, bảo hành hoặc thay thế…"
                      onChange={(e) => setForm({ ...form, KETQUAXULY: e.target.value })}
                    />
                  </label>
                )}
              </div>
            </div>

            {error && (
              <p role="alert" style={{ color: '#ef4444', margin: 0, fontSize: 12.5 }}>
                {error}
              </p>
            )}

            <div className="warranty-modal-footer">
              <button
                type="button"
                className="warranty-btn secondary"
                disabled={saving}
                onClick={() => setForm(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="warranty-btn primary"
                disabled={saving}
              >
                {saving ? 'Đang lưu…' : 'Lưu bảo hành'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function BaoHanhPage() {
  const [tab, setTab] = useState('workflow'); // 'workflow' | 'list'
  const listActionsRef = useRef(null);
  const workflowActionsRef = useRef(null);

  const handleReload = () => {
    if (tab === 'workflow') {
      workflowActionsRef.current?.reload?.();
    } else {
      listActionsRef.current?.reload?.();
    }
  };

  const handleExportCsv = () => {
    if (tab === 'workflow') {
      setTab('list');
      setTimeout(() => listActionsRef.current?.exportCsv?.(), 100);
    } else {
      listActionsRef.current?.exportCsv?.();
    }
  };

  const handleCreate = () => {
    if (tab === 'workflow') {
      workflowActionsRef.current?.create?.();
    } else {
      listActionsRef.current?.create?.();
    }
  };

  return (
    <div className="warranty-page-container">
      {/* Header kiểu Hồ sơ chờ duyệt: Trái là Bảo hành, Phải gồm Tabs + Tải lại + Xuất CSV + Tạo phiếu bảo hành */}
      <div className="warranty-page-header">
        <div className="warranty-title-group">
          <div className="warranty-title-icon">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="warranty-title">Bảo hành</h1>
            <div className="warranty-subtitle">
              Quản lý quy trình dịch vụ và danh sách bảo hành phụ tùng
            </div>
          </div>
        </div>

        <div className="warranty-header-actions">
          {/* Toggle chuyển đổi 2 tab */}
          <div className="warranty-view-toggle">
            <button
              type="button"
              className={`warranty-view-btn ${tab === 'workflow' ? 'active' : ''}`}
              onClick={() => setTab('workflow')}
            >
              <Wrench size={14} />
              <span>Bảng kê các dịch vụ bảo hành</span>
            </button>
            <button
              type="button"
              className={`warranty-view-btn ${tab === 'list' ? 'active' : ''}`}
              onClick={() => setTab('list')}
            >
              <TableIcon size={14} />
              <span>Danh sách bảo hành</span>
            </button>
          </div>

          {/* Nút Tải lại */}
          <button
            type="button"
            className="hscd-btn-reset"
            onClick={handleReload}
            title="Tải lại dữ liệu"
          >
            <RotateCcw size={14} />
            <span>Tải lại</span>
          </button>

          {/* Nút Xuất CSV */}
          <button
            type="button"
            className="hscd-btn-reset"
            onClick={handleExportCsv}
            disabled={!can('EXPORT')}
            title="Xuất CSV"
          >
            <FileSpreadsheet size={14} />
            <span>Xuất CSV</span>
          </button>

          {/* Nút Tạo phiếu bảo hành */}
          <button
            type="button"
            className="hscd-btn-add"
            onClick={handleCreate}
            disabled={!can('WARRANTY', 2)}
            title={tab === 'workflow' ? 'Tiếp nhận xử lý bảo hành mới' : 'Tạo phiếu bảo hành'}
          >
            <Plus size={14} />
            <span>{tab === 'workflow' ? 'Tiếp nhận mới' : 'Tạo phiếu bảo hành'}</span>
          </button>
        </div>
      </div>

      {/* Nội dung tương ứng theo tab (giữ state khi chuyển tab) */}
      <div style={{ display: tab === 'workflow' ? 'block' : 'none' }}>
        <WarrantyWorkflow actionsRef={workflowActionsRef} />
      </div>

      <div style={{ display: tab === 'list' ? 'block' : 'none' }}>
        <BaoHanhList actionsRef={listActionsRef} />
      </div>
    </div>
  );
}
