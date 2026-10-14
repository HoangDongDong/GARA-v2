import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Clipboard,
  Download,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Check,
  FolderOpen,
  Info
} from 'lucide-react';
import { customers, vehicles, suppliers, masterData } from '../services';
import { can } from '../utils/permissions';
import {
  fieldsWithOptions,
  autoMap,
  parsePaste,
  prepareRows,
  readExcel,
  downloadExcel
} from '../utils/masterExcel';
import './MasterExcelImport.css';

export default function MasterExcelImport({ kind, onClose, onImported }) {
  const isCustomer = kind === 'customers';
  const isSupplier = kind === 'suppliers';
  const title = isCustomer ? 'khách hàng' : isSupplier ? 'nhà cung cấp' : 'hồ sơ xe';
  const code = isCustomer ? 'CUSTOMERS' : isSupplier ? 'SUPPLIERS' : 'VEHICLES';
  const service = isCustomer ? customers : isSupplier ? suppliers : vehicles;

  const [fields, setFields] = useState([]);
  const [existing, setExisting] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [common, setCommon] = useState({});
  const [count, setCount] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [sheets, setSheets] = useState([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState([]);
  const [paste, setPaste] = useState(null);

  const fileRef = useRef();
  const nextId = useRef(0);
  const fresh = (data) => ({ id: ++nextId.current, data, saved: false, errors: [] });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!can(code, 2)) throw Error('Bạn không có quyền thêm dữ liệu.');
        if (isCustomer) {
          const [groups, records] = await Promise.all([
            masterData.customerGroups(),
            customers.list()
          ]);
          if (active) {
            setFields(fieldsWithOptions(kind, { groups }));
            setExisting(records);
          }
        } else if (isSupplier) {
          const [groups, records] = await Promise.all([
            suppliers.groups(),
            suppliers.list()
          ]);
          if (active) {
            setFields(fieldsWithOptions(kind, { groups }));
            setExisting(records);
          }
        } else {
          const [meta, owners, records] = await Promise.all([
            vehicles.meta(),
            customers.list(),
            vehicles.list()
          ]);
          if (active) {
            setFields(fieldsWithOptions(kind, { meta, owners }));
            setExisting(records);
          }
        }
      } catch (e) {
        if (active) setError(e.response?.data?.error || e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [kind]);

  const visible = fields.filter((f) => !common[f.key]?.enabled);
  const checked = prepareRows(rows, fields, common, existing);
  const pending = checked.filter((r) => !r.saved);
  const invalid = pending.filter((r) => r.errors.length);
  const bad = pending.filter(
    (r) => r.errors.length || rows.find((x) => x.id === r.id)?.errors.length
  );
  const selectedRow = rows.find((row) => row.id === selectedRowId);

  function removeRow(id) {
    if (busy || !rows.some((row) => row.id === id && !row.saved)) return;
    const index = rows.findIndex((row) => row.id === id);
    const remaining = rows.filter((row) => row.id !== id);
    setRows(remaining);
    if (selectedRowId === id)
      setSelectedRowId(remaining[Math.min(index, remaining.length - 1)]?.id ?? null);
    setMessage('');
  }

  function update(id, key, value) {
    setRows((old) =>
      old.map((r) =>
        r.id === id ? { ...r, data: { ...r.data, [key]: value }, errors: [] } : r
      )
    );
    setMessage('');
  }

  function addRows(data) {
    if (rows.length + data.length > 1000)
      throw Error('Tối đa 1.000 dòng mỗi lần nhập.');
    const added = data.map(fresh);
    setRows((old) => [...old, ...added]);
    if (added.length) setSelectedRowId(added[0].id);
    setMessage('');
  }

  async function action(fn) {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }

  async function chooseFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    await action(async () => {
      const found = await readExcel(file);
      if (!found.length) throw Error('File không có dữ liệu.');
      setSheets(found);
      setSheetIndex(0);
      setMapping(autoMap(found[0].rows[0], fields));
    });
    setBusy(false);
  }

  function applyMapping() {
    const targets = mapping.filter(Boolean);
    if (new Set(targets).size !== targets.length)
      throw Error('Mỗi thuộc tính chỉ được ghép với một cột Excel.');
    if (!targets.length) throw Error('Hãy chọn ít nhất một cột dữ liệu.');

    const data = sheets[sheetIndex].rows.slice(1).map((cells) =>
      Object.fromEntries(
        mapping
          .map((key, i) => [key, cells[i] ?? ''])
          .filter(([key]) => key)
      )
    );
    if (!data.length)
      throw Error('Sheet chỉ có tiêu đề, chưa có dữ liệu để nhập.');
    addRows(data);
    setSheets([]);
  }

  async function save() {
    if (!can(code, 2)) return setError('Bạn không có quyền thêm dữ liệu.');
    if (!pending.length) return setError('Chưa có dòng nào cần lưu.');
    if (invalid.length)
      return setError(`Có ${invalid.length} dòng cần sửa. Xem lỗi ở cuối từng dòng.`);

    setBusy(true);
    setError('');
    let success = 0;
    let failed = 0;

    if (rows.some((r) => r.uncertain)) {
      setBusy(false);
      return setError(
        'Hãy kiểm tra dòng mất kết nối trong danh sách trước khi tiếp tục.'
      );
    }

    for (const row of pending) {
      try {
        const data = { ...row.data };
        for (const f of fields) {
          if (f.type === 'number' && data[f.key] === '') {
            data[f.key] =
              f.key === 'GIAMGIARIENG'
                ? null
                : f.key === 'NAMSANXUAT'
                ? null
                : f.key === 'MUCNHIENLIEU'
                ? 50
                : 0;
          }
        }
        const result = await service.create(data);
        success++;
        setRows((old) =>
          old.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  data: {
                    ...data,
                    ...(result.code ? { MAKHACH: result.code } : {})
                  },
                  saved: true,
                  errors: []
                }
              : r
          )
        );
      } catch (e) {
        failed++;
        setRows((old) =>
          old.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  errors: [e.response?.data?.error || e.message],
                  uncertain: !e.response
                }
              : r
          )
        );
        if (!e.response || e.response.status === 401 || e.response.status === 403) {
          setError(
            !e.response
              ? 'Mất kết nối: có thể dòng đang gửi đã được lưu. Đóng cửa sổ và kiểm tra danh sách trước khi nhập lại dòng này.'
              : 'Đã dừng nhập. Kiểm tra quyền truy cập trước khi thử lại.'
          );
          break;
        }
      }
      setMessage(`Đã lưu ${success}/${pending.length} dòng; lỗi ${failed} dòng.`);
    }
    setMessage(`Đã lưu ${success}/${pending.length} dòng; lỗi ${failed} dòng.`);
    try {
      await onImported();
    } catch (e) {
      setError((old) => old || `Đã lưu dữ liệu nhưng chưa tải lại được danh sách: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  function control(f, value, onChange, disabled = false) {
    return f.options ? (
      <select
        aria-label={f.label}
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">-- Chọn --</option>
        {value && !f.options.some((o) => o.value === value) && (
          <option value={value}>{value}</option>
        )}
        {f.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ) : (
      <input
        aria-label={f.label}
        disabled={disabled}
        type="text"
        inputMode={f.type === 'number' ? 'decimal' : undefined}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return createPortal(
    <div className="mei-backdrop">
      <section
        className="mei-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Thêm nhanh ${title}`}
      >
        {/* ===== 1. HEADER CHÍNH ===== */}
        <header className="mei-header">
          <div className="mei-header-left">
            <div className="mei-header-icon">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="mei-title">Thêm nhanh {title}</h2>
              <p className="mei-subtitle">
                Nhập từng dòng, dán từ bảng tính hoặc nhập tự động từ file Excel (.xlsx, .xls, .csv).
              </p>
            </div>
          </div>
          <button
            type="button"
            className="mei-close-btn"
            disabled={busy}
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </header>

        {/* DÒNG NHẮC NHỞ KIỂU MẪU (Biểu tượng folder/ngôi sao vàng) */}
        <div className="mei-notice-bar">
          <FolderOpen size={16} />
          <span>
            Mời bạn điền danh sách <strong>{title}</strong> vào lưới phía dưới hoặc sử dụng chức năng <strong>Chọn file Excel</strong> để nạp dữ liệu.
          </span>
        </div>

        {error && (
          <div className="mei-alert error" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="mei-alert success" role="status">
            <CheckCircle2 size={15} />
            <span>{message}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Đang tải dữ liệu danh mục…
          </div>
        ) : (
          <>
            {/* ===== 2. TOOLBAR CỦA LƯỚI THEO KIỂU MẪU ===== */}
            <div className="mei-toolbar">
              <label className="mei-count-control">
                <span>Số dòng</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </label>

              <button
                type="button"
                className="mei-btn-tool add"
                disabled={busy || !fields.length}
                onClick={() =>
                  action(() => {
                    if (
                      !Number.isInteger(Number(count)) ||
                      count < 1 ||
                      count > 1000
                    )
                      throw Error('Số dòng từ 1 đến 1.000.');
                    addRows(Array.from({ length: Number(count) }, () => ({})));
                  })
                }
              >
                <Plus size={14} />
                <span>Thêm dữ liệu</span>
              </button>

              <button
                type="button"
                className="mei-btn-tool delete"
                disabled={busy || !selectedRow || selectedRow.saved}
                onClick={() => removeRow(selectedRowId)}
                title="Xóa dòng đang chọn trong bảng nhập"
              >
                <Trash2 size={14} />
                <span>Xóa dữ liệu</span>
              </button>

              <button
                type="button"
                className="mei-btn-tool"
                disabled={busy}
                onClick={() => setPaste('')}
              >
                <Clipboard size={14} />
                <span>Dán dữ liệu</span>
              </button>

              <button
                type="button"
                className="mei-btn-tool excel"
                disabled={busy}
                onClick={() => fileRef.current.click()}
              >
                <FileSpreadsheet size={15} />
                <span>Chọn file Excel</span>
              </button>
              <input
                ref={fileRef}
                hidden
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={chooseFile}
              />

              <div className="mei-toolbar-divider" />

              <button
                type="button"
                className="mei-btn-tool"
                disabled={busy}
                onClick={() =>
                  action(() =>
                    downloadExcel(
                      visible,
                      [],
                      'Mau_' + kind + '_cot_dang_hien'
                    )
                  )
                }
                title="Tải file mẫu chỉ gồm các cột đang hiển thị trong lưới"
              >
                <Download size={13} />
                <span>Mẫu cột đang hiện</span>
              </button>

              <button
                type="button"
                className="mei-btn-tool"
                disabled={busy}
                onClick={() =>
                  action(() =>
                    downloadExcel(fields, [], 'Mau_' + kind + '_day_du')
                  )
                }
                title="Tải file mẫu đầy đủ mọi thuộc tính"
              >
                <Download size={13} />
                <span>Mẫu đầy đủ</span>
              </button>
            </div>

            {/* ===== 3. CONTENT AREA (LƯỚI TRÁI + THUỘC TÍNH CHUNG PHẢI) ===== */}
            <div className="mei-content">
              {/* Lưới bảng bên trái */}
              <div className="mei-grid-wrap">
                <div className="mei-grid">
                  <table>
                    <thead>
                      <tr>
                        <th className="col-stt">STT</th>
                        {visible.map((f) => (
                          <th key={f.key}>
                            {f.label}
                            {f.required && (
                              <span style={{ color: '#dc2626' }}> *</span>
                            )}
                          </th>
                        ))}
                        <th className="col-result">Trạng thái / Kết quả</th>
                        <th className="col-action" />
                      </tr>
                    </thead>
                    <tbody>
                      {checked.map((r, index) => (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedRowId(r.id)}
                          onFocus={() => setSelectedRowId(r.id)}
                          aria-selected={selectedRowId === r.id}
                          className={
                            (selectedRowId === r.id ? 'mei-selected ' : '') + (r.saved
                              ? 'mei-saved'
                              : r.errors.length || rows[index].errors.length
                              ? 'mei-bad'
                              : '')
                          }
                        >
                          <td className="col-stt">{index + 1}</td>
                          {visible.map((f) => (
                            <td key={f.key}>
                              {control(
                                f,
                                rows[index].data[f.key],
                                (v) => update(r.id, f.key, v),
                                busy || r.saved
                              )}
                            </td>
                          ))}
                          <td className="col-result">
                            {r.saved ? (
                              <span style={{ color: '#15803d', fontWeight: 600 }}>
                                ✓ Đã lưu
                              </span>
                            ) : (
                              [...r.errors, ...rows[index].errors].join('; ') || (
                                <span style={{ color: '#64748b' }}>Sẵn sàng</span>
                              )
                            )}
                          </td>
                          <td className="col-action">
                            <button
                              type="button"
                              className="mei-row-delete-btn"
                              aria-label={`Xóa dòng ${index + 1}`}
                              disabled={busy || r.saved}
                              onClick={(event) => { event.stopPropagation(); removeRow(r.id); }}
                              title="Xóa dòng này"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!rows.length && (
                    <div className="mei-empty">
                      Chưa có dòng dữ liệu nào. Bấm <strong>Thêm dữ liệu</strong> hoặc <strong>Chọn file Excel</strong> để bắt đầu.
                    </div>
                  )}
                </div>
              </div>

              {/* Khung Các thuộc tính chung bên phải (Kiểu biểu thị chuẩn mẫu) */}
              <aside className="mei-common-panel">
                <h3 className="mei-common-title">Các thuộc tính chung</h3>
                <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.4 }}>
                  Tích chọn để áp dụng một giá trị cố định cho mọi dòng. Cột tương ứng sẽ ẩn trong bảng bên trái.
                </div>

                <div className="mei-common-list">
                  {fields.map((f) => (
                    <div className="mei-common-row" key={f.key}>
                      <input
                        type="checkbox"
                        id={`common-chk-${f.key}`}
                        disabled={busy}
                        checked={!!common[f.key]?.enabled}
                        onChange={(e) =>
                          setCommon((old) => ({
                            ...old,
                            [f.key]: {
                              ...old[f.key],
                              enabled: e.target.checked
                            }
                          }))
                        }
                      />
                      <label
                        className="mei-common-label"
                        htmlFor={`common-chk-${f.key}`}
                        title={f.label}
                      >
                        {f.label}:
                      </label>
                      <div className="mei-common-control">
                        {control(
                          f,
                          common[f.key]?.value,
                          (v) =>
                            setCommon((old) => ({
                              ...old,
                              [f.key]: {
                                ...old[f.key],
                                value: v
                              }
                            })),
                          busy || !common[f.key]?.enabled
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            {/* ===== 4. FOOTER CỬA SỔ CHÍNH ===== */}
            <footer className="mei-footer">
              <div className="mei-footer-left">
                <button
                  type="button"
                  className="mei-btn-action mei-btn-danger-ghost"
                  disabled={busy || !bad.length}
                  onClick={() =>
                    setRows((old) =>
                      old.filter((r) => r.saved || !bad.some((e) => e.id === r.id))
                    )
                  }
                >
                  <Trash2 size={14} />
                  <span>Xóa mặt hàng lỗi ({bad.length})</span>
                </button>

                <div className="mei-footer-stats">
                  Tổng cộng: <strong>{rows.length}</strong> dòng · Đã lưu:{' '}
                  <strong style={{ color: '#15803d' }}>
                    {checked.filter((r) => r.saved).length}
                  </strong>{' '}
                  · Cần sửa:{' '}
                  <strong style={{ color: bad.length ? '#dc2626' : '#64748b' }}>
                    {bad.length}
                  </strong>
                </div>
              </div>

              <div className="mei-footer-right">
                <button
                  type="button"
                  className="mei-btn-action mei-btn-ghost"
                  disabled={busy}
                  onClick={onClose}
                >
                  <span>Hủy bỏ</span>
                </button>

                <button
                  type="button"
                  className="mei-btn-action mei-btn-primary"
                  disabled={
                    busy ||
                    loading ||
                    !pending.length ||
                    !fields.length ||
                    rows.some((r) => r.uncertain)
                  }
                  onClick={save}
                >
                  <Check size={16} />
                  <span>{busy ? 'Đang xử lý…' : 'Chấp nhận'}</span>
                </button>
              </div>
            </footer>
          </>
        )}

        {/* ===== 5. POPUP CON: "THÊM TỪ EXCEL" (CHUẨN MẪU HÌNH 2) ===== */}
        {!!sheets.length && (
          <div className="mei-layer">
            <section
              className="mei-mapping-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Thêm từ excel"
            >
              <div className="mei-mapping-header">
                <h3 className="mei-mapping-title">Thêm từ excel</h3>
                <button
                  type="button"
                  className="mei-close-btn"
                  onClick={() => setSheets([])}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mei-mapping-instruction">
                <strong>Hướng dẫn:</strong> Cột bên trái là cột sẵn có trong file excel của bạn.
                Bạn lựa chọn cột bên phải để hệ thống hiểu được cột trong file excel là dữ liệu nào.
              </div>

              <div className="mei-mapping-body">
                {sheets.length > 1 && (
                  <div className="mei-sheet-select-row">
                    <span>Chọn Sheet Excel:</span>
                    <select
                      value={sheetIndex}
                      onChange={(e) => {
                        const i = Number(e.target.value);
                        setSheetIndex(i);
                        setMapping(autoMap(sheets[i].rows[0], fields));
                      }}
                    >
                      {sheets.map((s, i) => (
                        <option value={i} key={i}>
                          {s.name} ({s.rows.length - 1} dòng)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* BẢNG ÁNH XẠ 2 CỘT CHUẨN MẪU: [Cột excel] | [Dữ liệu] */}
                <div className="mei-mapping-table-wrap">
                  <table className="mei-mapping-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50%' }}>Cột excel</th>
                        <th style={{ width: '50%' }}>Dữ liệu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheets[sheetIndex].rows[0].map((h, i) => {
                        const previewVal = sheets[sheetIndex].rows[1]?.[i];
                        return (
                          <tr key={i}>
                            <td>
                              <div className="mei-excel-col-name">
                                <span>{h || `Cột ${i + 1}`}</span>
                                {previewVal !== undefined && previewVal !== '' && (
                                  <span className="mei-excel-col-preview">
                                    Mẫu: {String(previewVal).slice(0, 35)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <select
                                className="mei-mapping-select"
                                value={mapping[i] || ''}
                                onChange={(e) =>
                                  setMapping((old) =>
                                    old.map((v, j) =>
                                      j === i ? e.target.value : v
                                    )
                                  )
                                }
                              >
                                <option value="">-- Bỏ qua cột này --</option>
                                {fields.map((f) => (
                                  <option key={f.key} value={f.key}>
                                    {f.label} {f.required ? '(*)' : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FOOTER POPUP CON: [Tự động chọn] bên trái, [Chấp nhận] [Hủy bỏ] bên phải */}
              <div className="mei-mapping-footer">
                <button
                  type="button"
                  className="mei-btn-tool"
                  onClick={() =>
                    setMapping(autoMap(sheets[sheetIndex].rows[0], fields))
                  }
                  title="Hệ thống tự động phân tích tên cột và khớp trường dữ liệu"
                >
                  <Sparkles size={14} color="#ea580c" />
                  <span>Tự động chọn</span>
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="mei-btn-action mei-btn-primary"
                    onClick={() => action(applyMapping)}
                  >
                    <Check size={15} />
                    <span>Chấp nhận</span>
                  </button>

                  <button
                    type="button"
                    className="mei-btn-action mei-btn-ghost"
                    onClick={() => setSheets([])}
                  >
                    <span>Hủy bỏ</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ===== 6. POPUP CON: "DÁN DỮ LIỆU" ===== */}
        {paste !== null && (
          <div className="mei-layer">
            <section
              className="mei-mapping-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Dán dữ liệu từ Excel"
            >
              <div className="mei-mapping-header">
                <h3 className="mei-mapping-title">Dán dữ liệu từ Excel</h3>
                <button
                  type="button"
                  className="mei-close-btn"
                  onClick={() => setPaste(null)}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mei-mapping-instruction">
                Sao chép các ô từ Excel (Ctrl+C) và dán vào ô bên dưới (không bao gồm dòng tiêu đề).
                Thứ tự các cột cần tương ứng: <strong>{visible.map((f) => f.label).join(' → ')}</strong>.
              </div>

              <div className="mei-mapping-body">
                <textarea
                  style={{
                    width: '100%',
                    height: 220,
                    padding: 10,
                    fontSize: 12.5,
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  autoFocus
                  placeholder="Nhấp vào đây và nhấn Ctrl+V để dán dữ liệu…"
                />
              </div>

              <div className="mei-mapping-footer" style={{ justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="mei-btn-action mei-btn-ghost"
                  onClick={() => setPaste(null)}
                >
                  <span>Hủy bỏ</span>
                </button>

                <button
                  type="button"
                  className="mei-btn-action mei-btn-primary"
                  onClick={() =>
                    action(() => {
                      const values = parsePaste(paste);
                      if (!values.length) throw Error('Chưa có dữ liệu để dán.');
                      if (values.some((r) => r.length > visible.length))
                        throw Error('Số cột dán nhiều hơn số cột đang hiện.');
                      addRows(
                        values.map((r) =>
                          Object.fromEntries(
                            visible.map((f, i) => [f.key, r[i] ?? ''])
                          )
                        )
                      );
                      setPaste(null);
                    })
                  }
                >
                  <Check size={15} />
                  <span>Chấp nhận</span>
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>,
    document.body
  );
}
