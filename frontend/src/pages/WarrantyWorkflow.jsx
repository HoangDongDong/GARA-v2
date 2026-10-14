import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { rememberWarrantyJob, readWarrantyJob, restoreWarrantyJob } from '../utils/warrantySelection';
import {
  Check,
  ShieldCheck,
  Search,
  ChevronDown,
  Trash2,
  CheckSquare,
  XSquare,
  Wrench
} from 'lucide-react';
import api from '../api';
import VehicleSelect from '../components/VehicleSelect';
import QuickCreateButton from '../components/QuickCreateButton';
import WarrantySupplements from '../components/WarrantySupplements';
import RepairAssignmentPanel from '../components/RepairAssignmentPanel';
import ChargeSummary from '../components/ChargeSummary';
import DiscountFields from '../components/DiscountFields';
import EditableSalePrice from '../components/EditableSalePrice';
import LineTaxField from '../components/LineTaxField';
import useChargeRates from '../hooks/useChargeRates';
import { calculate, taxPolicy } from '../utils/pricingPolicy';
import canEditPricing from '../utils/canEditPricing';
import { openDocumentPrint } from '../components/DocumentPrintDialog';
import WarrantyImages from '../components/WarrantyImages';
import { parts, masterData } from '../services';
import { can } from '../utils/permissions';
import './SuaChuaPage.css';
import './WarrantyWorkflow.css';

const stages = ['Tiếp nhận & Báo giá', 'Xác nhận bảo hành', 'Đang bảo hành', 'Giao xe', 'Hoàn thành'];
const shortStages = ['Tiếp nhận', 'Xác nhận', 'Đang xử lý', 'Giao xe', 'Hoàn thành'];
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
const empty = () => ({ vehicleId: '', warehouseId: '', date: today(), note: '' });
const key = (item) => `${item.kind}:${item.sourceId}`;
const money = (n) => Number(n || 0).toLocaleString('vi-VN') + ' đ';

export default function WarrantyWorkflow({ actionsRef }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const remember = (id) => {
    rememberWarrantyJob(localStorage, sessionStorage, id);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('warrantyJobId', id || 'new');
        return next;
      },
      { replace: true }
    );
  };
  const [showSupplements, setShowSupplements] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [vehicleList, setVehicles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [form, setForm] = useState(empty);
  const [job, setJob] = useState(null);
  const [selected, setSelected] = useState({});
  const [savedItems, setSavedItems] = useState([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const chargeConfig = useChargeRates('warranty-jobs');
  const canPrice = canEditPricing('WARRANTY');
  const [discountRate, setDiscountRate] = useState(0);
  const [discountMoney, setDiscountMoney] = useState(null);
  const [dialog, setDialog] = useState('');
  const [assignment, setAssignment] = useState({valid:false,assignments:[]});
  const [declined, setDeclined] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [allowDebt, setAllowDebt] = useState(false);
  const [collected, setCollected] = useState('');

  const stage = Number(job?.TRANGTHAI || 0);
  const locked = stage >= 2;
  const allowed = can('WARRANTY', job ? 4 : 2);

  const reload = async () => {
    const response = await api.get('/warranty-jobs');
    const list = response.data.data || [];
    setJobs(list);
    return list;
  };

  const open = async (id) => {
    setError('');
    setNotice('');
    setDialog('');
    setDeclined([]);
    if (!id) {
      remember('');
      setJob(null);
      setForm(empty());
      setSelected({});
      setSavedItems([]);
      setDiscountRate(0);setDiscountMoney(null);
      return;
    }
    setBusy(true);
    try {
      const r = await api.get('/warranty-jobs/' + id);
      const j = r.data.data;
      setJob(j);
      setDiscountRate(Number(j.TILEGIAMGIA||0));setDiscountMoney(j.GIAMPHIEU==null?null:Number(j.GIAMPHIEU));
      setForm({
        vehicleId: j.DXEID,
        warehouseId: j.DKHOHANGID || '',
        date: String(j.NGAY).slice(0, 10),
        note: j.NOTE || ''
      });
      const items = j.items.map((l) => ({
        kind: l.KIND,
        sourceId: l.SOURCEID,
        name: l.NAME,
        unit: l.UNITNAME,
        lineId: l.ID,
        price: Number(l.DONGIA),
        taxRate: Number(l.TILETHUE||0),
        discountRate: Number(l.TILECHIETKHAU||0),
        quantity: Number(l.SOLUONG),
        note: l.NOTE || '',
        checked: true
      }));
      setSavedItems(items);
      setSelected(Object.fromEntries(items.map((l) => [key(l), l])));
      remember(j.ID);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get('/warranty-jobs/vehicles').then((r) => r.data.data || []),
      masterData.services(),
      parts.list(),
      masterData.warehouses(),
      reload()
    ])
      .then(async ([v, s, p, w, loadedJobs]) => {
        setVehicles(v);
        setWarehouses(w);
        setCatalog([
          ...s.map((r) => ({
            kind: 'service',
            sourceId: r.ID,
            name: r.NAME,
            group: r.CATEGORY_NAME || 'Dịch vụ',
            unit: 'Lần',
            price: Number(r.GIA || 0)
            ,policy: r
          })),
          ...p.map((r) => ({
            kind: 'part',
            sourceId: r.ID,
            name: r.NAME,
            group: 'Phụ tùng',
            unit: r.DDONVITINH_NAME || 'Cái',
            price: Number(r.GIABAN || 0)
            ,policy: r
          }))
        ]);
        const restore = restoreWarrantyJob(
          loadedJobs,
          searchParams.get('warrantyJobId'),
          readWarrantyJob(localStorage, sessionStorage)
        );
        if (restore) await open(restore);
      })
      .catch((e) => setError(e.response?.data?.error || e.message));
  }, []);

  useEffect(() => {
    if (actionsRef) {
      actionsRef.current = {
        reload: async () => {
          try {
            await reload();
            if (job?.ID) await open(job.ID);
          } catch (e) {
            setError(e.response?.data?.error || e.message);
          }
        },
        create: () => open('')
      };
    }
  }, [actionsRef, job?.ID]);

  useEffect(() => {
    setCoverage([]);
    if (!form.vehicleId) return;
    const controller = new AbortController();
    api
      .get('/warranty-jobs/eligible/' + form.vehicleId, { signal: controller.signal })
      .then((r) =>
        setCoverage(
          (r.data.data || []).map((b) => ({
            kind: 'warranty',
            sourceId: b.ID,
            name: b.PART_NAME || b.SERVICE_NAME || b.NOTE || b.NAME,
            group: 'Bảo hành còn hạn',
            unit: b.UNITNAME || 'Lần',
            price: 0,
            expires: String(b.NGAYKETTHUC).slice(0, 10)
          }))
        )
      )
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.response?.data?.error || e.message);
      });
    return () => controller.abort();
  }, [form.vehicleId]);

  const all = useMemo(() => [...coverage, ...catalog], [coverage, catalog]);
  const chosen = locked
    ? savedItems
    : Object.entries(selected)
        .filter(([, value]) => value.checked)
        .map(([id, value]) => ({
          ...all.find((r) => key(r) === id) || savedItems.find((r) => key(r) === id),
          ...value
        }))
        .filter((r) => r.sourceId);

  const rates = job ? {...chargeConfig.rates,taxRate:Number(job.TILETHUE||0),serviceRate:Number(job.TILEPHIDICHVU||0),taxEnabled:Number(job.TILETHUE)>0||savedItems.some(r=>r.taxRate>0),serviceEnabled:Number(job.TILEPHIDICHVU)>0} : chargeConfig.rates;
  const preview = (rows) => {
    try {return {totals:calculate(rows.map(r=>({id:r.lineId||key(r),amount:r.kind==='warranty'?0:r.price*Number(r.quantity||1),discountRate:r.kind==='warranty'?0:Number(r.discountRate||0),taxRate:r.kind==='warranty'?0:taxPolicy(r.policy||{},rates,r.taxRate).taxRate})),rates,discountRate,discountMoney==null?undefined:discountMoney),error:''};}
    catch(e){return {totals:{subtotal:0,discount:0,billDiscount:0,afterLineDiscount:0,serviceFee:0,tax:0,total:0,details:[]},error:e.message};}
  };
  const charges = preview(chosen);
  const accepted = chosen.filter(r=>!declined.includes(r.lineId||key(r)));
  const confirmation = preview(accepted);
  const total = charges.totals.total;
  const lineBody = rows => rows.map(l=>({kind:l.kind,sourceId:l.sourceId,quantity:Number(l.quantity),note:l.note,price:l.kind==='warranty'?0:l.price,taxRate:l.kind==='warranty'?0:taxPolicy(l.policy||{},rates,l.taxRate).taxRate,discountRate:l.kind==='warranty'?0:Number(l.discountRate||0)}));
  const summary = (value) => <ChargeSummary subtotal={value.subtotal} discount={value.discount} totals={value} rates={rates} loading={chargeConfig.loading} error={chargeConfig.error} onRetry={chargeConfig.reload}
    discountControl={<><DiscountFields name="bảo hành" percent={discountRate} amount={value.billDiscount} base={value.afterLineDiscount} disabled={locked||busy||!canPrice} onPercent={v=>{setDiscountRate(v);setDiscountMoney(null);}} onAmount={setDiscountMoney}/>{value.lineDiscount>0&&<div>Giảm hạng mục: {money(value.lineDiscount)}</div>}</>}/>;
  const print = () => openDocumentPrint({type:stage<2?'MauBaoGiaBaoHanh':stage===2?'MauLenhBaoHanh':job?.HOADONID?'MauHoaDonBaoHanh':'MauBanGiaoBaoHanh',id:job.ID,autoPreview:true});
  const shown = all.filter((r) =>
    [r.name, r.group].some((v) => String(v || '').toLowerCase().includes(search.toLowerCase()))
  );

  const currentVehicle = useMemo(() => {
    return vehicleList.find((v) => v.ID === form.vehicleId) || null;
  }, [vehicleList, form.vehicleId]);

  const customerName = currentVehicle?.TEN_KH || job?.TEN_KH || (form.vehicleId ? 'Khách vãng lai' : '—');

  const change = (field, value) => {
    setNotice('');
    setForm((f) => ({ ...f, [field]: value }));
    if (field === 'vehicleId') {
      setSelected({});
      setSavedItems([]);
    }
  };

  const pick = (item, checked) =>
    setSelected((s) => ({
      ...s,
      [key(item)]: {
        ...s[key(item)],
        checked,
        quantity: s[key(item)]?.quantity || 1,
        note: s[key(item)]?.note || ''
      }
    }));

  const pickAll = () => {
    const next = { ...selected };
    shown.forEach((r) => {
      next[key(r)] = {
        ...next[key(r)],
        checked: true,
        quantity: next[key(r)]?.quantity || 1,
        note: next[key(r)]?.note || ''
      };
    });
    setSelected(next);
  };

  const removeChosen = (item) => {
    if (locked) return;
    setSelected((s) => ({
      ...s,
      [key(item)]: { ...s[key(item)], checked: false }
    }));
  };

  const editLine = (item, field, value) =>
    setSelected((s) => ({
      ...s,
      [key(item)]: {
        ...s[key(item)],
        checked: true,
        [field]: value
      }
    }));

  const save = async (draft) => {
    if (busy || !allowed) return;
    setBusy(true);
    setError('');
    try {
      const body = {
        ...form,
        draft,
        discountRate:canPrice||job?discountRate:undefined,discountMoney,
        items: lineBody(chosen)
      };
      const response = job
        ? await api.put('/warranty-jobs/' + job.ID, body)
        : await api.post('/warranty-jobs', body);
      await open(response.data.id);
      await reload();
      setNotice(draft ? 'Đã lưu tạm tiếp nhận bảo hành.' : 'Đã tiếp nhận. Phiếu đang chờ xác nhận bảo hành.');
      return response.data.id;
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const advance = async (confirmed = false) => {
    if (stage === 0) return save(false);
    if(stage===1&&confirmed!==true){setDeclined([]);setDialog('confirm');return;}
    if(stage===3){setAllowDebt(false);setCollected('');setPaymentMethod('cash');setDialog('payment');return;}
    setBusy(true);
    setError('');
    try {
      if (stage === 1)
        await api.put('/warranty-jobs/' + job.ID, {
          ...form,
          discountRate,discountMoney,
          items: lineBody(accepted)
        });
      await api.patch('/warranty-jobs/' + job.ID + '/transition', {
        expected: stage,
        note: form.note,
        assignments: assignment.assignments
      });
      await open(job.ID);
      await reload();
      setNotice(
        stage === 1
          ? 'Đã xác nhận. Xe đang bảo hành; phụ tùng mới được xuất nếu có.'
          : stage === 2 ? 'Đã giao xe và lưu kết quả xử lý bảo hành.' : 'Đã hoàn thành phiếu bảo hành.'
      );
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    setBusy(true);setError('');
    try {
      const amount=allowDebt?Number(collected||0):total;
      const r=await api.post(`/warranty-jobs/${job.ID}/pay`,{TIENMAT:paymentMethod==='cash'?amount:0,CHUYENKHOAN:paymentMethod==='transfer'?amount:0,THE:paymentMethod==='card'?amount:0,ALLOW_DEBT:allowDebt,note:form.note});
      await open(job.ID);await reload();
      setNotice(r.data.remaining>0?`Đã hoàn thành và ghi nhận công nợ ${money(r.data.remaining)}.`:'Đã thanh toán và hoàn thành bảo hành.');
      if(r.data.requireBill)openDocumentPrint({type:'MauHoaDonBaoHanh',id:job.ID,requiredPrint:true,autoPrint:true});
    }catch(e){setError(e.response?.data?.error||e.message);}finally{setBusy(false);}
  };

  return (
    <div className="suachua-page-container warranty-workflow-container" style={{ padding: 0 }}>
      {error && (
        <div role="alert" className="ww-alert error" style={{ marginBottom: 8 }}>
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="ww-alert notice" style={{ marginBottom: 8 }}>
          {notice}
        </div>
      )}

      {/* Stepper tiến trình chuẩn giao diện Sửa chữa */}
      <div className="repair-process-stepper">
        {stages.map((label, index) => {
          const stepCompleted = index < stage || stage === 4;
          const stepActive = index === stage && stage !== 4;
          return (
            <div key={label} className="repair-process-step">
              <div
                className="step-content"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  color: stepCompleted ? '#2E7D32' : stepActive ? '#E65100' : '#94A3B8',
                  fontWeight: stepCompleted || stepActive ? 800 : 600
                }}
              >
                <span
                  className="step-circle"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: stepCompleted ? '#2E7D32' : stepActive ? '#E65100' : '#F1F5F9',
                    color: stepCompleted || stepActive ? '#fff' : '#94A3B8',
                    fontSize: 10,
                    flexShrink: 0
                  }}
                >
                  {stepCompleted ? <Check size={12} /> : index + 1}
                </span>
                <span className="step-label-full">{label}</span>
                <span className="step-label-short">{shortStages[index]}</span>
              </div>
              {index < stages.length - 1 && (
                <ChevronDown
                  size={13}
                  className="step-arrow"
                  style={{
                    margin: '0 8px',
                    transform: 'rotate(-90deg)',
                    color: index < stage ? '#2E7D32' : '#CBD5E1',
                    flexShrink: 0
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Bố cục chính chuẩn Sửa Chữa (reception & catalog bên trái, selected bên phải) */}
      <div className="suachua-main-split">
        {/* Card Thông tin phiếu xe (Bộ lọc thông tin tiếp nhận - 3 hàng 2 cột) */}
        <div
          className="suachua-reception-info"
          style={{
            background: '#FFFFFF',
            borderRadius: 6,
            border: '1px solid #E0E0E0',
            padding: 'clamp(6px, 1vh, 10px) clamp(8px, 1vw, 14px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(4px, 0.6vh, 8px)',
            flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div className="suachua-reception-grid" style={{ alignItems: 'center', gap: 8 }}>
            {/* Hàng 1 - Cột 1: Biển số xe */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label
                style={{
                  width: 95,
                  minWidth: 95,
                  flexShrink: 0,
                  color: '#334155',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              >
                Biển số xe
              </label>
              <div style={{ display: 'flex', flex: 1, minWidth: 0, gap: 6 }}>
                <VehicleSelect
                  vehicles={
                    job && !vehicleList.some((v) => v.ID === job.DXEID)
                      ? [
                          ...vehicleList,
                          {
                            ID: job.DXEID,
                            BIENSO: jobs.find((j) => j.ID === job.ID)?.BIENSO || '',
                            TEN_KH: jobs.find((j) => j.ID === job.ID)?.TEN_KH || ''
                          }
                        ]
                      : vehicleList
                  }
                  value={form.vehicleId}
                  disabled={!!job || busy}
                  onChange={(id) => change('vehicleId', id)}
                />
                <QuickCreateButton
                  resource="vehicles"
                  title="Thêm hồ sơ xe"
                  label="Thêm"
                  disabled={!!job || busy}
                  onCreated={(id, row, rows) => {
                    setVehicles(rows);
                    change('vehicleId', id);
                  }}
                />
              </div>
            </div>

            {/* Hàng 1 - Cột 2: Số phiếu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label
                style={{
                  width: 95,
                  minWidth: 95,
                  flexShrink: 0,
                  color: '#334155',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              >
                Số phiếu
              </label>
              <select
                value={job?.ID || ''}
                disabled={busy}
                onChange={(e) => open(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 'clamp(28px, 3.2vh, 31px)',
                  padding: '0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  background: '#FFFFFF',
                  color: '#334155',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                <option value="">Tiếp nhận mới (chọn xe có bảo hành)</option>
                {jobs.map((j) => (
                  <option key={j.ID} value={j.ID}>
                    {j.NAME} - {stages[j.TRANGTHAI]} ({j.BIENSO})
                  </option>
                ))}
              </select>
            </div>

            {/* Hàng 2 - Cột 1: Kho phụ tùng */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label
                style={{
                  width: 95,
                  minWidth: 95,
                  flexShrink: 0,
                  color: '#334155',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              >
                Kho phụ tùng
              </label>
              <select
                value={form.warehouseId}
                disabled={locked || busy}
                onChange={(e) => change('warehouseId', e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 'clamp(28px, 3.2vh, 31px)',
                  padding: '0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">-- Chọn kho xuất --</option>
                {warehouses.map((w) => (
                  <option key={w.ID} value={w.ID}>
                    {w.NAME}
                  </option>
                ))}
              </select>
            </div>

            {/* Hàng 2 - Cột 2: Khách hàng */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label
                style={{
                  width: 95,
                  minWidth: 95,
                  flexShrink: 0,
                  color: '#334155',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              >
                Khách hàng
              </label>
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  value={customerName}
                  readOnly
                  style={{
                    width: '100%',
                    height: 'clamp(28px, 3.2vh, 31px)',
                    padding: '0 26px 0 8px',
                    border: '1px solid #CBD5E1',
                    borderRadius: 4,
                    fontSize: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#F8FAFC',
                    color: '#1E293B'
                  }}
                />
                <Search
                  size={13}
                  color="#64748B"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
              </div>
            </div>

            {/* Hàng 3 - Cột 1: Ngày tiếp nhận */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label
                style={{
                  width: 95,
                  minWidth: 95,
                  flexShrink: 0,
                  color: '#334155',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              >
                Ngày tiếp nhận
              </label>
              <input
                type="date"
                value={form.date}
                disabled={locked || busy}
                onChange={(e) => change('date', e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 'clamp(28px, 3.2vh, 31px)',
                  padding: '0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  background: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Hàng 3 - Cột 2: Ghi chú */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label
                style={{
                  width: 95,
                  minWidth: 95,
                  flexShrink: 0,
                  color: '#334155',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              >
                Ghi chú
              </label>
              <input
                type="text"
                value={form.note}
                disabled={stage === 4 || busy || !allowed}
                onChange={(e) => change('note', e.target.value)}
                placeholder="Nhập ghi chú yêu cầu tiếp nhận..."
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 'clamp(28px, 3.2vh, 31px)',
                  padding: '0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  background: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* CỘT TRÁI: Toolbar + Bảng danh sách dịch vụ & phụ tùng (grid-area: catalog) */}
        <div
          className="suachua-left-col"
          style={{
            background: '#FFFFFF',
            borderRadius: 6,
            border: '1px solid #E0E0E0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          {/* Toolbar tìm kiếm & các nút thao tác */}
          <div
            style={{
              padding: '6px 10px',
              borderBottom: '1px solid #E0E0E0',
              background: '#FAFAFA',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <input
                type="text"
                placeholder="Tìm dịch vụ, phụ tùng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: 30,
                  padding: '0 26px 0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Search
                size={13}
                color="#64748B"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}
              />
            </div>

            {locked && (
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                Phiếu đã lưu • hạng mục đã khóa
              </span>
            )}

            <button
              type="button"
              disabled={locked || busy || !form.vehicleId}
              onClick={pickAll}
              style={{
                height: 30,
                padding: '0 10px',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                background: '#FFFFFF',
                color: '#334155',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: locked || busy || !form.vehicleId ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <CheckSquare size={13} color="#E65100" /> Chọn tất cả
            </button>

            <button
              type="button"
              disabled={locked || busy || !form.vehicleId}
              onClick={() => setSelected({})}
              style={{
                height: 30,
                padding: '0 10px',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                background: '#FFFFFF',
                color: '#475569',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: locked || busy || !form.vehicleId ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <XSquare size={13} color="#D32F2F" /> Bỏ chọn tất cả
            </button>
          </div>

          {form.vehicleId && !coverage.length && !locked && (
            <div
              style={{
                padding: '6px 10px',
                background: '#FFFBEB',
                borderBottom: '1px solid #FEF3C7',
                fontSize: 11.5,
                color: '#92400E'
              }}
            >
              ℹ️ Xe chưa có hạng mục bảo hành còn hạn trong hệ thống. Bạn có thể kiểm tra tab Danh sách bảo hành.
            </div>
          )}

          {/* Table danh mục dịch vụ & phụ tùng */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 280, maxHeight: 'calc(100vh - 350px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: '#FFE0B2', color: '#BF360C', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '6px 4px', textAlign: 'center', width: 34 }}></th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', width: 36 }}>STT</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', width: 130 }}>Nhóm</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Dịch vụ / Hạng mục</th>
                  <th style={{ padding: '6px 6px', textAlign: 'center', width: 55 }}>Đơn vị</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', width: 105 }}>Đơn giá (VNĐ)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', width: 140 }}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => {
                  const isCov = r.kind === 'warranty';
                  const isSel = !!selected[key(r)]?.checked;
                  return (
                    <tr
                      key={key(r)}
                      onClick={() => !locked && form.vehicleId && pick(r, !isSel)}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: isCov ? '#F0FDF4' : isSel ? '#FFF7ED' : undefined,
                        cursor: locked || !form.vehicleId ? 'default' : 'pointer'
                      }}
                    >
                      <td style={{ padding: '4px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          aria-label={'Chọn ' + r.name}
                          type="checkbox"
                          checked={isSel}
                          disabled={locked || busy || !form.vehicleId}
                          onChange={(e) => pick(r, e.target.checked)}
                          style={{ accentColor: '#E65100', width: 15, height: 15, cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '4px', textAlign: 'center', color: '#64748B' }}>{i + 1}</td>
                      <td style={{ padding: '4px 8px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 7px',
                            borderRadius: 4,
                            fontWeight: 600,
                            fontSize: 10.5,
                            background: isCov ? '#DCFCE7' : '#E0F2FE',
                            color: isCov ? '#15803D' : '#0369A1'
                          }}
                        >
                          {isCov && <ShieldCheck size={12} />} {r.group}
                        </span>
                      </td>
                      <td style={{ padding: '4px 8px', fontWeight: 600, color: '#1E293B' }}>
                        {r.name}
                        {r.expires && (
                          <div style={{ fontSize: 10.5, color: '#15803D', fontWeight: 500 }}>
                            ✓ Còn hạn đến {r.expires.split('-').reverse().join('/')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', color: '#475569' }}>{r.unit}</td>
                      <td
                        style={{
                          padding: '4px 8px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: isCov ? '#15803D' : '#1E293B'
                        }}
                      >
                        {isCov ? 'Bảo hành · 0 đ' : Number(r.price).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '4px 8px' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          value={selected[key(r)]?.note || ''}
                          disabled={locked || busy}
                          onChange={(e) => editLine(r, 'note', e.target.value)}
                          maxLength={1000}
                          placeholder="Ghi chú thêm…"
                          style={{
                            width: '100%',
                            height: 24,
                            padding: '2px 6px',
                            border: '1px solid #CBD5E1',
                            borderRadius: 4,
                            fontSize: 11,
                            background: 'transparent',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              padding: '4px 10px',
              borderTop: '1px solid #E0E0E0',
              background: '#F8FAFC',
              fontSize: 11,
              color: '#64748B',
              fontWeight: 500,
              flexShrink: 0
            }}
          >
            Tổng số: <b>{shown.length}</b> hạng mục khả dụng
          </div>
        </div>

        {/* CỘT PHẢI: Danh sách đã chọn & Tổng tiền & Nút hành động (grid-area: selected) */}
        <div
          className="suachua-right-col"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minWidth: 0
          }}
        >
          {/* Card Danh sách đã chọn */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 6,
              border: '1px solid #E0E0E0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div
              style={{
                padding: '6px 10px',
                background: '#FAFAFA',
                borderBottom: '1px solid #E0E0E0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12.5, color: '#1E293B' }}>
                <CheckSquare size={14} color="#E65100" />
                <span>Danh sách đã chọn ({chosen.length})</span>
              </div>
              {job && stage>=1 && <button type="button" className="ww-outline" onClick={()=>setDialog('confirm')}>Phân công / HH</button>}
              {stage === 2 && (
                <button
                  type="button"
                  onClick={() => setShowSupplements(true)}
                  disabled={busy}
                  style={{
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    background: '#E65100',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Phát sinh
                </button>
              )}
            </div>

            <div style={{overflowY:'auto',maxHeight:240,minHeight:120}}>
              <table className="ww-selected-table"><thead><tr><th>STT</th><th>Dịch vụ / Hạng mục</th><th>Đơn giá</th><th>Giảm %</th><th>Thuế</th><th>Thành tiền</th><th>Xóa</th></tr></thead><tbody>
                {chosen.map((r,index)=><tr key={r.lineId||key(r)}><td>{index+1}</td><td><b>{r.name}</b>{r.kind==='warranty'&&<small>Miễn phí bảo hành</small>}{(r.kind==='part'||Number(r.quantity)!==1)&&<label>SL <input aria-label={'Số lượng '+r.name} type="number" min="0.001" step="0.001" value={r.quantity} disabled={locked||busy} onChange={e=>editLine(r,'quantity',e.target.value)}/></label>}</td>
                  <td><EditableSalePrice name={r.name} value={r.price} disabled={locked||busy||!canPrice||r.kind==='warranty'} onChange={v=>editLine(r,'price',v)}/></td>
                  <td><input aria-label={'Giảm giá '+r.name} type="number" min="0" max="100" step="0.01" value={r.discountRate||0} disabled={locked||busy||!canPrice||r.kind==='warranty'} onChange={e=>editLine(r,'discountRate',e.target.value)}/></td>
                  <td><LineTaxField name={r.name} value={r.taxRate} policy={r.kind==='warranty'?{taxRate:0,taxSource:'Miễn phí bảo hành'}:taxPolicy(r.policy||{},rates,r.taxRate)} disabled={locked||busy||!canPrice||r.kind==='warranty'} onChange={v=>editLine(r,'taxRate',v)}/></td>
                  <td><b>{Number(charges.totals.details[index]?.lineNet||0).toLocaleString('vi-VN')}</b></td><td><button type="button" disabled={locked||busy} onClick={()=>removeChosen(r)} title="Bỏ chọn"><Trash2 size={12}/></button></td>
                </tr>)}{!chosen.length&&<tr><td colSpan={7}>Chưa chọn hạng mục nào</td></tr>}
              </tbody></table>
            </div>
            {summary(charges.totals)}
            {charges.error&&<div role="alert">{charges.error}</div>}
            {/* Bảng tổng tiền chuẩn giao diện Sửa chữa */}
            <div
              style={{
                padding: '8px 12px',
                background: '#FFF3E0',
                borderTop: '1px solid #FFE0B2',
                display: 'flex',
                justifyContent: 'space-between',
                color: '#BF360C',
                fontWeight: 800,
                fontSize: 13
              }}
            >
              <span>Tổng cộng</span>
              <span>{money(total)}</span>
            </div>
          </div>

          {/* Card Ghi chú xử lý bảo hành */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 6,
              border: '1px solid #E0E0E0',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>
              Ghi chú xử lý bảo hành
            </label>
            <textarea
              maxLength={2000}
              value={form.note}
              disabled={stage === 4 || busy || !allowed}
              onChange={(e) => change('note', e.target.value)}
              placeholder="Nhập ghi chú chi tiết kết quả xử lý..."
              style={{
                width: '100%',
                minHeight: 55,
                padding: 6,
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                fontSize: 11.5,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <WarrantyImages job={job} stage={stage} disabled={busy||!allowed} onSaveDraft={()=>save(true)}/>
          {/* Cụm nút hành động chuẩn Sửa chữa */}
          <div
            className="suachua-action-buttons-row"
            style={{ display: 'flex', alignItems: 'stretch', gap: 6, width: '100%', flexShrink: 0 }}
          >
            {job && <button type="button" className="ww-outline" disabled={busy||!can('WARRANTY',17)} onClick={print}>{stage<2?'In báo giá':stage===2?'In lệnh bảo hành':'In phiếu'}</button>}
            {!locked && (
              <button
                type="button"
                className="ww-btn-draft"
                disabled={busy || !allowed}
                onClick={() => save(true)}
                style={{
                  flex: 1,
                  height: 'clamp(32px, 4vh, 38px)',
                  background: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: 5,
                  fontWeight: 600,
                  fontSize: 'clamp(10.5px, 0.8vw, 12px)',
                  cursor: busy || !allowed ? 'not-allowed' : 'pointer'
                }}
              >
                Lưu tạm
              </button>
            )}

            {stage === 1 && (
              <button
                type="button"
                className="ww-btn-draft"
                disabled={busy || !allowed}
                onClick={() => save(false)}
                style={{
                  flex: 1,
                  height: 'clamp(32px, 4vh, 38px)',
                  background: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: 5,
                  fontWeight: 600,
                  fontSize: 'clamp(10.5px, 0.8vw, 12px)',
                  cursor: busy || !allowed ? 'not-allowed' : 'pointer'
                }}
              >
                Lưu thay đổi
              </button>
            )}

            <button
              type="button"
              disabled={busy || !allowed || stage === 4 || !!charges.error || chargeConfig.loading || !!chargeConfig.error}
              onClick={advance}
              style={{
                flex: 1.5,
                height: 'clamp(32px, 4vh, 38px)',
                background: busy || !allowed || stage === 4 ? '#FDBA74' : '#E65100',
                color: '#FFFFFF',
                border: 0,
                borderRadius: 5,
                fontWeight: 700,
                fontSize: 'clamp(10.5px, 0.8vw, 12px)',
                cursor: busy || !allowed || stage === 4 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5
              }}
            >
              <Check size={14} />
              {busy
                ? 'Đang lưu…'
                : stage === 0
                ? 'Lưu tiếp nhận'
                : stage === 1
                ? 'Xác nhận bảo hành'
                : stage === 2
                ? 'Giao xe'
                : stage === 3
                ? 'Thanh toán'
                : 'Đã hoàn thành'}
            </button>
          </div>
        </div>
      </div>

      {dialog && job && <div className="ww-dialog-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setDialog('');}}>
        <section className="ww-process-dialog" role="dialog" aria-modal="true" aria-label={dialog==='payment'?'Thanh toán bảo hành':'Xác nhận bảo hành'}>
          <header><b>{dialog==='payment'?'THANH TOÁN BẢO HÀNH':'XÁC NHẬN BẢO HÀNH'}</b><button type="button" disabled={busy} onClick={()=>setDialog('')}>×</button></header>
          <div className="ww-dialog-content">
            <div className="ww-dialog-info"><span>Số phiếu: <b>{job.NAME}</b></span><span>Biển số: <b>{currentVehicle?.BIENSO||jobs.find(j=>j.ID===job.ID)?.BIENSO}</b></span><span>Khách hàng: <b>{customerName}</b></span></div>
            {error&&<div role="alert" className="ww-alert error">{error}</div>}
            {dialog==='confirm'?<>
              <b>Hạng mục khách hàng xác nhận ({accepted.length}/{chosen.length})</b>
              <table className="ww-selected-table"><thead><tr><th>STT</th><th>Dịch vụ / Phụ tùng</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{chosen.map((r,i)=><tr key={r.lineId||key(r)}><td>{i+1}</td><td><label><input type="checkbox" checked={!declined.includes(r.lineId||key(r))} disabled={locked||busy} onChange={e=>setDeclined(v=>e.target.checked?v.filter(id=>id!==(r.lineId||key(r))):[...v,r.lineId||key(r)])}/><b>{r.name}</b></label><small>{r.kind==='warranty'?'Miễn phí bảo hành':r.kind==='part'?'Phụ tùng':'Dịch vụ'}</small></td><td>{r.quantity}</td><td>{money(r.price)}</td><td>{money(r.price*r.quantity)}</td></tr>)}</tbody></table>
              <div className="ww-confirm-total"><b>TỔNG KHÁCH ĐỒNG Ý</b><b>{money(confirmation.totals.total)}</b></div>
              <ChargeSummary subtotal={confirmation.totals.subtotal} discount={confirmation.totals.discount} totals={confirmation.totals} rates={rates}/>
              {confirmation.error&&<div role="alert">{confirmation.error}</div>}
              <RepairAssignmentPanel resource="warranty-jobs" repairId={job.ID} acceptedTotals={locked?null:confirmation.totals} onChange={setAssignment} disabled={busy} readOnly={locked}/>
            </>:<>
              {summary(charges.totals)}<div className="ww-confirm-total"><b>Tổng thanh toán</b><b>{money(total)}</b></div>
              <label className="ww-payment-field">Phương thức thanh toán<select value={paymentMethod} disabled={busy} onChange={e=>setPaymentMethod(e.target.value)}><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option><option value="card">Thẻ</option></select></label>
              {chargeConfig.rates.allowDebt!==false&&<label><input type="checkbox" checked={allowDebt} disabled={busy} onChange={e=>setAllowDebt(e.target.checked)}/> Khách nợ</label>}
              {allowDebt&&<label className="ww-payment-field">Số tiền khách trả<input type="number" min="0" max={total} step="0.01" value={collected} disabled={busy} onChange={e=>setCollected(e.target.value)}/><span>Còn nợ: {money(Math.max(0,total-Number(collected||0)))}</span></label>}
              <p className="ww-dialog-info">Xác nhận thanh toán sẽ chuyển phiếu sang <b>Hoàn thành</b>. Số tiền còn thiếu được ghi nhận công nợ.</p>
            </>}
          </div>
          <footer><button type="button" className="ww-outline" disabled={busy} onClick={()=>setDialog('')}>Đóng</button><button type="button" className="ww-outline" disabled={busy||!can('WARRANTY',17)} onClick={print}>In {dialog==='confirm'&&!locked?'báo giá':'phiếu'}</button>
            {dialog==='confirm'&&!locked&&<button type="button" disabled={busy||!assignment.valid||!!confirmation.error||!can('ASSIGN_REPAIR',4)} onClick={()=>advance(true)}>Xác nhận bảo hành</button>}
            {dialog==='payment'&&<button type="button" disabled={busy||!can('PAYMENTS',4)} onClick={pay}>Xác nhận thanh toán</button>}
          </footer>
        </section>
      </div>}

      {showSupplements && job && (
        <WarrantySupplements
          job={job}
          catalog={catalog}
          warehouses={warehouses}
          onClose={() => setShowSupplements(false)}
          onChanged={async () => {
            await open(job.ID);
            await reload();
          }}
        />
      )}
    </div>
  );
}

