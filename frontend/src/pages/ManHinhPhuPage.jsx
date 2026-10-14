import { workshopCars, configuredBanners } from '../utils/secondaryDisplayLiveData';
import { paymentQrUrl } from '../utils/secondaryDisplayQr';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  Monitor, Plus, Copy, Trash2, ChevronLeft, ChevronRight,
  Sun, Moon, Slash, Sparkles, Lightbulb, Zap, Image as ImageIcon,
  Check, ExternalLink, Play, Pause, Radio, Volume2, Maximize, Minimize,
  ArrowUp, ArrowDown, CheckSquare, Square, RefreshCw, Car, Phone, MapPin,
  Clock, ShieldCheck, Heart, Tv, Layers, CreditCard, QrCode, Wrench,
  CheckCircle2, AlertCircle, FileText, Coffee, PhoneCall, Award, Eye, Wifi,
  Boxes, ShoppingCart, BarChart3, Star, Gift
} from 'lucide-react';
import api from '../api.js';
import { compressImage, imagePolicies } from '../utils/compressImage.js';
import './ManHinhPhuPage.css';

const STORAGE_KEY = 'garage_tv_displays_v3';

export const COLOR_THEMES = [
  { id: 'orange', name: 'Cam Kazuko', sub: 'Bản sắc Kazuko', color: '#EA580C', darkColor: '#9A3412', glow: 'rgba(234, 88, 12, 0.4)' },
  { id: 'sapphire', name: 'Tý - Xanh Sapphire', sub: 'Hành Thủy', color: '#0284C7', darkColor: '#0369A1', glow: 'rgba(2, 132, 199, 0.4)' },
  { id: 'indigo', name: 'Hợi - Xanh Midnight Indigo', sub: 'Hành Thủy', color: '#4F46E5', darkColor: '#3730A3', glow: 'rgba(79, 70, 229, 0.4)' },
  { id: 'emerald', name: 'Dần - Xanh Ngọc Emerald', sub: 'Hành Mộc', color: '#059669', darkColor: '#065F46', glow: 'rgba(5, 150, 105, 0.4)' },
  { id: 'jade', name: 'Mão - Xanh Bạc Hà Jade', sub: 'Hành Mộc', color: '#0D9488', darkColor: '#115E59', glow: 'rgba(13, 148, 136, 0.4)' },
  { id: 'ruby', name: 'Tỵ - Đỏ Rượu Ruby', sub: 'Hành Hỏa', color: '#BE123C', darkColor: '#9F1239', glow: 'rgba(190, 18, 60, 0.4)' },
  { id: 'amethyst', name: 'Ngọ - Tím Thạch Anh Amethyst', sub: 'Hành Hỏa', color: '#7C3AED', darkColor: '#6D28D9', glow: 'rgba(124, 58, 237, 0.4)' },
  { id: 'mocha', name: 'Sửu - Nâu Mocha Caramel', sub: 'Hành Thổ', color: '#78350F', darkColor: '#451A03', glow: 'rgba(120, 53, 15, 0.4)' },
  { id: 'gold', name: 'Thìn - Vàng Hoàng Kim', sub: 'Hành Thổ', color: '#D97706', darkColor: '#B45309', glow: 'rgba(217, 119, 6, 0.4)' },
];

export const BG_PRESETS = [
  {
    id: 'login_warm_luxury',
    name: 'Sáng kem Kazuko (Như trang đăng nhập)',
    previewGradient: 'linear-gradient(135deg, #FDFBF7 0%, #F5ECE3 50%, #EDE0D4 100%)',
    bgStyle: {
      backgroundColor: '#E2CEBD',
      backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(240, 90, 40, 0.12) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(217, 119, 6, 0.1) 0%, transparent 45%), linear-gradient(135deg, #FDFBF7 0%, #F5ECE3 50%, #EDE0D4 100%)'
    }
  },
  {
    id: 'orange_luxury',
    name: 'Cam ánh kim',
    previewGradient: 'linear-gradient(135deg, #1C0A00 0%, #3D1300 30%, #9A3412 65%, #EA580C 100%)',
    bgStyle: {
      background: 'radial-gradient(ellipse at 85% 25%, rgba(249, 115, 22, 0.35) 0%, transparent 60%), linear-gradient(145deg, #140500 0%, #2A0C01 35%, #4A1407 70%, #170500 100%)'
    }
  },
  {
    id: 'blue_metallic',
    name: 'Xanh salon / gara',
    previewGradient: 'linear-gradient(135deg, #021B1C 0%, #064E3B 40%, #0F766E 70%, #0284C7 100%)',
    bgStyle: {
      background: 'radial-gradient(ellipse at 85% 25%, rgba(14, 165, 233, 0.35) 0%, transparent 60%), linear-gradient(145deg, #011417 0%, #042F2C 35%, #083344 70%, #02121A 100%)'
    }
  },
  {
    id: 'dark_gold',
    name: 'Đen vàng',
    previewGradient: 'linear-gradient(135deg, #0A0A0A 0%, #1F1604 40%, #45300B 75%, #D4AF37 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 50% 30%, rgba(212, 175, 55, 0.28) 0%, transparent 65%), linear-gradient(160deg, #080602 0%, #140E04 40%, #1E1505 75%, #050401 100%)'
    }
  },
  {
    id: 'cream_minimal',
    name: 'Kem tối giản',
    previewGradient: 'linear-gradient(135deg, #FFFDF8 0%, #FEF3C7 50%, #FDE68A 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 70% 30%, rgba(254, 215, 170, 0.45) 0%, transparent 60%), linear-gradient(140deg, #FCFBF7 0%, #FEF7ED 40%, #FFEDD5 80%, #FFF7ED 100%)'
    }
  }
];

export const GLASS_STYLES = [
  {
    id: 'login_card_luxury',
    name: 'Thẻ trắng bo góc sang trọng (Như trang đăng nhập)',
    desc: 'Thẻ trắng sữa bo tròn 28px, đổ bóng mềm và viền mịn như trang Login',
    icon: Sun
  },
  {
    id: 'dark_gold',
    name: 'Kính đen mờ (Dark Gold Glass)',
    desc: 'Thích hợp cho banner sáng/vàng kim, chữ trắng vàng sang trọng',
    icon: Moon
  },
  {
    id: 'light_glass',
    name: 'Kính trắng mờ (Light Glass)',
    desc: 'Thích hợp cho banner nền tối, chữ đen rõ nét',
    icon: Sun
  }
];

export const TEXT_EFFECTS = [
  { id: 'laser', name: 'Quét sáng Laser', desc: 'Tia laser quét qua', icon: Sparkles },
  { id: 'neon', name: 'Tỏa sáng Neon', desc: 'Hào quang cực đại', icon: Lightbulb },
  { id: 'blink', name: 'Chớp kép Neon', desc: 'Nháy đúp hút mắt', icon: Zap },
  { id: 'static', name: 'Tĩnh (Mặc định)', desc: 'Không chớp nháy', icon: Slash }
];

export const SCREEN_TYPES = [
  { id: 'price_banner', label: '1. Màn hình Quảng Cáo & Khuyến Mãi (TV Sảnh)', icon: Tv, desc: 'Trình chiếu banner quảng cáo xe sang, video, gói khuyến mãi và dịch vụ' },
  { id: 'payment_qr', label: '2. Màn hình Thanh Toán & Quét VietQR (Quầy POS)', icon: CreditCard, desc: 'Hiển thị hóa đơn điện tử minh bạch, chi tiết phụ tùng và mã VietQR' },
  { id: 'repair_flow', label: '3. Màn hình Tiến Độ Sửa Chữa (Xưởng & Phòng Chờ)', icon: Wrench, desc: 'Hiển thị các xe đang thi công tại khoang, KCS và bàn giao xe' }
];

function createDefaultPage(pageIndex, title = '', mode = 'price_banner') {
  return {
    id: `page-${Date.now()}-${pageIndex}`,
    name: title || `Trang ${pageIndex + 1}`,
    screenTitle: mode === 'payment_qr' ? 'Quầy Thu Ngân & Thanh Toán VietQR' : mode === 'repair_flow' ? 'Bảng Tiến Độ Xe Trong Khoang Dịch Vụ' : 'Màn hình Quảng Cáo & Khuyến Mãi Showroom',
    mode: mode,
    adLayout: 'fullscreen',
    interval: 15,
    ticker: '',
    bgPreset: mode === 'payment_qr' ? 'login_warm_luxury' : mode === 'repair_flow' ? 'blue_metallic' : 'orange_luxury',
    bgCustomUrl: '',
    bgFit: 'cover',
    bgPos: 'center',
    bgDarkOverlay: mode === 'payment_qr' ? 0 : 15,
    glassStyle: mode === 'payment_qr' ? 'login_card_luxury' : 'dark_gold',
    textEffect: 'laser',
    bannerInterval: 12,
    repairSpeed: 8,
    repairAutoPlay: true,
    banners: [],
    selectedServiceIds: []
  };
}

function createDefaultScreens() {
  return {
    '1': {
      id: '1',
      name: 'Màn hình 1 (TV Quảng Cáo Sảnh)',
      type: 'price_banner',
      colorTheme: 'orange',
      pages: [createDefaultPage(0, 'Trang 1 - Quảng cáo Showroom', 'price_banner'), createDefaultPage(1, 'Trang 2 - Khuyến mãi', 'price_banner')]
    },
    '2': {
      id: '2',
      name: 'Màn hình 2 (TV Quầy Thu Ngân)',
      type: 'payment_qr',
      colorTheme: 'orange',
      bankInfo: {
        accountId: '', bankName: '', accountNo: '', accountName: '', bankBin: '',
        qrMemoPrefix: 'GARA',
        styleMode: 'login_luxury',
        bannerTitle: 'Quầy Thu Ngân & Thanh Toán Minh Bạch',
        bannerSubtitle: 'Đối soát công khai — Chuẩn hóa chi phí — Bảo hành điện tử',
        footerSloganMain: 'Minh bạch từng dịch vụ & phụ tùng',
        footerSloganSub: 'UY TÍN TẠO NIỀM TIN • AN TÂM MỌI HÀNH TRÌNH',
        hotline: '',
        website: ''
      },
      pages: [createDefaultPage(0, 'Trang 1 - Thanh toán', 'payment_qr')]
    },
    '3': {
      id: '3',
      name: 'Màn hình 3 (TV Phòng Chờ & Tiến Độ)',
      type: 'repair_flow',
      colorTheme: 'sapphire',
      loungeInfo: {
        wifiSsid: '',
        wifiPass: '',
        hotline: ''
      },
      pages: [createDefaultPage(0, 'Trang 1 - Tiến độ xưởng', 'repair_flow')]
    }
  };
}

function loadLegacyScreens() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const defaults = createDefaultScreens();
        const merged = { ...defaults };
        ['1', '2', '3'].forEach(k => {
          if (parsed[k]) {
            merged[k] = {
              ...defaults[k],
              ...parsed[k],
              type: k === '2' ? 'payment_qr' : k === '3' ? 'repair_flow' : (parsed[k].type || defaults[k].type),
              bankInfo: { ...(defaults[k]?.bankInfo || {}), ...(parsed[k]?.bankInfo || {}) },
              loungeInfo: { ...(defaults[k]?.loungeInfo || {}), ...(parsed[k]?.loungeInfo || {}) },
              pages: parsed[k].pages && parsed[k].pages.length ? parsed[k].pages : defaults[k].pages
            };
          }
        });
        return merged;
      }
    }
  } catch (err) {}
  return createDefaultScreens();
}

function mergeScreens(value,accounts=[],defaultAccountId='') {
  const defaults=createDefaultScreens(),result={...defaults,...(value||{})};
  for(const id of ['1','2','3']){const screen=result[id]||defaults[id];const bank={...(defaults[id].bankInfo||{}),...(screen.bankInfo||{})};if(!value)bank.accountId=defaultAccountId;const account=accounts.find(row=>row.ID===bank.accountId);result[id]={...defaults[id],...screen,bankInfo:{...bank,bankName:account?.TENNGANHANG||bank.bankName||'',accountNo:account?.SOTAIKHOAN||bank.accountNo||'',accountName:account?.NAME||bank.accountName||'',bankBin:account?.BIN||bank.bankBin||''},pages:(screen.pages?.length?screen.pages:defaults[id].pages).map(page=>({...page,banners:configuredBanners(page.banners || [])}))};}
  return result;
}

const formatMoney = val => Number(val || 0).toLocaleString('vi-VN') + 'đ';

// Chuyển đổi số tiền thành chữ tiếng Việt chuẩn kế toán
export function numberToVietnameseWords(n) {
  if (!n || isNaN(n) || n <= 0) return 'Không đồng';
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroup(group, showZeroHundred) {
    const h = Math.floor(group / 100);
    const t = Math.floor((group % 100) / 10);
    const u = group % 10;
    let s = '';
    if (h > 0 || showZeroHundred) {
      s += digits[h] + ' trăm ';
    }
    if (t > 1) {
      s += digits[t] + ' mươi ';
      if (u === 1) s += 'mốt ';
      else if (u === 5) s += 'lăm ';
      else if (u > 0) s += digits[u] + ' ';
    } else if (t === 1) {
      s += 'mười ';
      if (u === 5) s += 'lăm ';
      else if (u > 0) s += digits[u] + ' ';
    } else if (u > 0) {
      if (h > 0 || showZeroHundred) s += 'lẻ ';
      s += digits[u] + ' ';
    }
    return s.trim();
  }

  let num = Math.round(n);
  let groups = [];
  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  let words = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      const showZero = i < groups.length - 1 && g < 100;
      const gText = readGroup(g, showZero);
      const unit = units[i];
      words.push(gText + (unit ? ' ' + unit : ''));
    }
  }

  const result = words.join(' ').trim();
  if (!result) return 'Không đồng';
  return (result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn').trim();
}

function VietQrBox({ amount = 0, memo = '', bankName = '', accountNo = '', accountName = '', bankBin = '' }) {
  const qrApiUrl=paymentQrUrl({bankBin,accountNo,accountName},amount,memo);
  if(!qrApiUrl)return <div className="tv-vietqr-card"><p>Chưa chọn tài khoản ngân hàng hợp lệ. Vào cấu hình màn hình phụ để chọn tài khoản của cửa hàng.</p></div>;

  return (
    <div className="tv-vietqr-card">
      <div className="tv-vietqr-header">
        <div className="tv-vietqr-napas-badge">
          <span>NAPAS 247</span>
          <span className="vietqr-pill">VietQR</span>
        </div>
        <span className="tv-vietqr-hint">Quét mã chuyển khoản 24/7</span>
      </div>

      <div className="tv-vietqr-img-wrapper">
        <img src={qrApiUrl} alt="VietQR" className="tv-vietqr-image" onError={e => {
          e.target.style.display = 'none';
        }} />
      </div>

      <div className="tv-vietqr-details-table">
        <div className="tv-qr-line">
          <span>Ngân hàng:</span>
          <b>{bankName}</b>
        </div>
        <div className="tv-qr-line">
          <span>Số tài khoản:</span>
          <b className="tv-qr-acc-num">{accountNo}</b>
        </div>
        <div className="tv-qr-line">
          <span>Chủ tài khoản:</span>
          <b>{accountName}</b>
        </div>
        <div className="tv-qr-line highlight">
          <span>Số tiền:</span>
          <b className="tv-qr-amount">{formatMoney(amount)}</b>
        </div>
        {memo && (
          <div className="tv-qr-line memo">
            <span>Nội dung CK:</span>
            <mark>{memo}</mark>
          </div>
        )}
      </div>

      <div className="tv-vietqr-guide-steps">
        <div className="tv-guide-step">
          <span className="tv-guide-num">1</span>
          <span>Mở App Bank</span>
        </div>
        <div className="tv-guide-step">
          <span className="tv-guide-num">2</span>
          <span>Quét mã QR</span>
        </div>
        <div className="tv-guide-step">
          <span className="tv-guide-num">3</span>
          <span>Xác nhận</span>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TV DISPLAY SCREEN (Realtime Presentation on TV)
// =========================================================================
export function SecondaryDisplayScreen() {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const screenId = params.screenId || searchParams.get('screen') || '1';

  const [screens, setScreens] = useState(createDefaultScreens);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [allServices, setAllServices] = useState([]);
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    branch: 'CHI NHÁNH CHÍNH · BẢNG GIÁ DỊCH VỤ',
    hotline: '0917 66 4444 - 0967 04 1111',
    address: ''
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [flows,setFlows]=useState([]),[workflowStates,setWorkflowStates]=useState([]),[liveError,setLiveError]=useState('');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [repairIndex, setRepairIndex] = useState(0);

  useEffect(()=>{let active=true;const load=()=>api.get('/secondary-display-config').then(r=>{if(active){const data=r.data.data;setScreens(mergeScreens(data.screens,data.accounts,data.defaultAccountId));setCompanyInfo(previous=>({...previous,...data.company}));}}).catch(()=>{});load();const timer=setInterval(load,5000);window.addEventListener('garage:tv-displays-changed',load);return()=>{active=false;clearInterval(timer);window.removeEventListener('garage:tv-displays-changed',load);};},[]);

  // Poll live payment order
  useEffect(() => {
    let active = true;
    const fetchPayment = () => {
      api.get('/secondary-payment')
        .then(res => {if(active)setCurrentOrder(res.data?.data||null);})
        .catch(()=>{if(active)setCurrentOrder(null);});
    };
    fetchPayment();
    const timer = setInterval(fetchPayment, 2500);
    return () => { active = false; clearInterval(timer); };
  }, []);

  useEffect(()=>{let active=true;const load=async()=>{const results=await Promise.allSettled([api.get('/catalog/resources/services'),api.get('/workflow/board'),api.get('/workflow/states')]);if(!active)return;const [catalog,board,states]=results;setAllServices(catalog.status==='fulfilled'?(catalog.value.data?.data||[]).map(row=>({id:String(row.ID),name:row.NAME,group:row.DLOAIDICHVU_NAME||'Dịch vụ',price:Number(row.GIA||0)})):[]);setFlows(board.status==='fulfilled'?board.value.data?.data||[]:[]);setWorkflowStates(states.status==='fulfilled'?states.value.data?.data||[]:[]);setLiveError(results.some(result=>result.status==='rejected')?'Một số dữ liệu chưa tải được. Kiểm tra kết nối và quyền xem danh mục/sửa chữa.':'');};load();const timer=setInterval(load,5000);return()=>{active=false;clearInterval(timer);};},[]);

  const currentScreen = screens[screenId] || screens['1'];
  const pages = currentScreen?.pages?.length ? currentScreen.pages : [createDefaultPage(0)];
  const currentPage = pages[activePageIndex] || pages[0];
  const activeColorTheme = COLOR_THEMES.find(t => t.id === currentScreen.colorTheme) || COLOR_THEMES[0];
  const currentBgPreset = BG_PRESETS.find(p => p.id === currentPage.bgPreset) || BG_PRESETS[0];

  // Auto cycle pages
  useEffect(() => {
    if (pages.length <= 1) return;
    const sec = Math.max(5, Number(currentPage.interval || 15));
    const timer = setTimeout(() => {
      setActivePageIndex(prev => (prev + 1) % pages.length);
      setActiveBannerIndex(0);
    }, sec * 1000);
    return () => clearTimeout(timer);
  }, [activePageIndex, pages.length, currentPage.interval]);

  // Auto cycle banners
  const banners=configuredBanners(currentPage.banners || []);
  useEffect(() => {
    if (banners.length <= 1) return;
    const sec = Math.max(4, Number(currentPage.bannerInterval || 15));
    const timer = setTimeout(() => {
      setActiveBannerIndex(prev => (prev + 1) % banners.length);
    }, sec * 1000);
    return () => clearTimeout(timer);
  }, [activeBannerIndex, banners.length, currentPage.bannerInterval]);

  const activeBanner=banners[activeBannerIndex]||banners[0]||{title:(currentPage.name || 'Trang hiện tại')+' chưa có banner',subtitle:'Trang này chưa được thêm ảnh. Chọn đúng trang trong cấu hình màn hình phụ để tải banner.',url:''};

  // Filter selected services for current page
  const pageServices = useMemo(() => {
    const selectedIds = new Set(currentPage.selectedServiceIds || []);
    const list = allServices.filter(s => selectedIds.has(s.id));
    if (list.length === 0) return allServices.slice(0, 10);
    return list;
  }, [allServices, currentPage.selectedServiceIds]);

  // Group services by category (or split into 2 columns if only 1 group exists)
  const groupedServices = useMemo(() => {
    const groups = {};
    pageServices.forEach(s => {
      const g = s.group || 'DỊCH VỤ GARA';
      if (!groups[g]) groups[g] = [];
      groups[g].push(s);
    });
    const keys = Object.keys(groups);
    if (keys.length === 1 && groups[keys[0]].length > 4) {
      const all = groups[keys[0]];
      const mid = Math.ceil(all.length / 2);
      return {
        [keys[0]]: all.slice(0, mid),
        [`${keys[0]} (TIẾP)`]: all.slice(mid)
      };
    }
    return groups;
  }, [pageServices]);

  const groupKeys = Object.keys(groupedServices);

  const workshopCarsList=useMemo(()=>workshopCars(flows,workflowStates),[flows,workflowStates]);

  useEffect(() => {
    if (workshopCarsList.length <= 1) return;
    const speed = Math.max(4, Number(currentPage.repairSpeed || 8));
    const timer = setInterval(() => {
      setRepairIndex(prev => (prev + 1) % workshopCarsList.length);
    }, speed * 1000);
    return () => clearInterval(timer);
  }, [workshopCarsList.length, currentPage.repairSpeed]);

  const activeCar = workshopCarsList[repairIndex] || workshopCarsList[0];

  const [adLayoutMode, setAdLayoutMode] = useState(currentPage.adLayout || 'fullscreen');
  const [realtimeClock, setRealtimeClock] = useState('');

  useEffect(() => {
    if (currentPage.adLayout) {
      setAdLayoutMode(currentPage.adLayout);
    }
  }, [currentPage.adLayout]);

  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setRealtimeClock(d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const bgStyle = useMemo(() => {
    if (currentPage.bgCustomUrl) {
      return {
        backgroundImage: `url(${currentPage.bgCustomUrl})`,
        backgroundSize: currentPage.bgFit || 'cover',
        backgroundPosition: currentPage.bgPos || 'center'
      };
    }
    return currentBgPreset.bgStyle;
  }, [currentPage.bgCustomUrl, currentPage.bgFit, currentPage.bgPos, currentBgPreset]);

  // Determine active mode of screen
  const screenMode = currentScreen.type || currentPage.mode || (screenId === '2' ? 'payment_qr' : screenId === '3' ? 'repair_flow' : 'price_banner');

  const effectivePaymentOrder=currentOrder;
  const bankInfo = currentScreen.bankInfo || {
    bankName: '', accountNo: '', accountName: '', bankBin: '',
    qrMemoPrefix: 'GARA'
  };
  const loungeInfo = currentScreen.loungeInfo || {
    wifiSsid: 'KAZUKO AUTO VIP',
    wifiPass: 'kazuko2026',
    hotline: companyInfo.hotline
  };

  return (
    <div className={`tv-display-root screen-type-${screenMode} theme-${activeColorTheme.id} glass-${currentPage.glassStyle || 'dark_gold'} ${bankInfo.styleMode !== 'dark_gold' ? 'login-luxury-mode' : ''}`}>
      <div className="tv-background-layer" style={bgStyle} />
      <div className="tv-dark-overlay" style={{ backgroundColor: `rgba(0, 0, 0, ${(currentPage.bgDarkOverlay ?? (bankInfo.styleMode !== 'dark_gold' ? 0 : 15)) / 100})` }} />

      {/* ========================================================
          HEADER RIÊNG BIỆT CHO TỪNG KIỂU MÀN HÌNH
          ======================================================== */}
      {screenMode === 'payment_qr' ? (
        /* HEADER RIÊNG CHO QUẦY THU NGÂN / POS */
        bankInfo.styleMode !== 'dark_gold' ? (
          <header className="tv-header tv-pos-header style-login">
            <div className="tv-header-brand">
              <div className="card-car-icon" style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(230,81,0,0.15)' }}>
                <Car size={26} color="#E65100" />
              </div>
              <div className="tv-brand-info">
                <h1 className="tv-brand-title" style={{ color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>KAZUKO</span> <span style={{ color: '#E65100', fontStyle: 'italic' }}>Auto</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#EA580C', background: '#FFF3E0', padding: '2px 8px', borderRadius: 6, marginLeft: 6 }}>QUẦY THU NGÂN POS</span>
                </h1>
                <span className="tv-brand-sub" style={{ color: '#64748B' }}>ĐỐI SOÁT HÓA ĐƠN MINH BẠCH & QUÉT MÃ VIETQR 24/7</span>
              </div>
            </div>

            <div className="tv-header-right">
              <div className="tv-clock-badge" style={{ background: '#FFF3E0', border: '1px solid #FED7AA', color: '#C2410C' }}>
                <Clock size={16} color="#EA580C" />
                <span className="tv-clock-time" style={{ color: '#C2410C', fontWeight: 800 }}>{realtimeClock || '—'}</span>
              </div>
              <div className="tv-napas-live-badge" style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', color: '#15803D' }}>
                <span className="tv-pulse-dot green" />
                <span style={{ color: '#15803D', fontWeight: 700 }}>Napas 24/7 Trực Tuyến</span>
              </div>
              
            </div>
          </header>
        ) : (
          <header className="tv-header tv-pos-header" style={{ background: `linear-gradient(90deg, #1E1B18 0%, ${activeColorTheme.darkColor} 60%, ${activeColorTheme.color} 100%)` }}>
            <div className="tv-header-brand">
              <div className="tv-brand-logo-icon pos-icon">
                <CreditCard size={26} color="#FBBF24" />
              </div>
              <div className="tv-brand-info">
                <h1 className="tv-brand-title">{companyInfo.name} · QUẦY THU NGÂN POS</h1>
                <span className="tv-brand-sub">ĐỐI SOÁT HÓA ĐƠN MINH BẠCH & QUÉT MÃ VIETQR 24/7</span>
              </div>
            </div>

            <div className="tv-header-right">
              <div className="tv-clock-badge">
                <Clock size={16} color="#FBBF24" />
                <span className="tv-clock-time">{realtimeClock || '—'}</span>
              </div>
              <div className="tv-napas-live-badge">
                <span className="tv-pulse-dot green" />
                <span>Napas 24/7 Trực Tuyến</span>
              </div>
              
            </div>
          </header>
        )
      ) : screenMode === 'repair_flow' ? (
        /* HEADER RIÊNG CHO TIẾN ĐỘ SỬA CHỮA XƯỞNG / PHÒNG CHỜ */
        <header className="tv-header tv-workshop-header" style={{ background: `linear-gradient(90deg, #02182B 0%, ${activeColorTheme.darkColor} 60%, ${activeColorTheme.color} 100%)` }}>
          <div className="tv-header-brand">
            <div className="tv-brand-logo-icon workshop-icon">
              <Wrench size={26} color="#38BDF8" />
            </div>
            <div className="tv-brand-info">
              <h1 className="tv-brand-title">{companyInfo.name} · TRUNG TÂM ĐIỀU HÀNH XƯỞNG DỊCH VỤ</h1>
              <span className="tv-brand-sub">WORKSHOP LIVE OPERATIONS MONITOR & PHÒNG CHỜ VIP</span>
            </div>
          </div>

          <div className="tv-header-right">
            <div className="tv-clock-badge">
              <Clock size={16} color="#38BDF8" />
              <span className="tv-clock-time">{realtimeClock || '—'}</span>
            </div>
            <div className="tv-workshop-status-badge">
              <span className="tv-pulse-dot amber" />
              <span>{workshopCarsList.length} xe đang theo dõi</span>
            </div>
          </div>
        </header>
      ) : (
        /* HEADER RIÊNG CHO QUẢNG CÁO & BẢNG GIÁ SẢNH CHÍNH */
        <header className="tv-header" style={{ background: `linear-gradient(90deg, ${activeColorTheme.color} 0%, ${activeColorTheme.darkColor} 100%)` }}>
          <div className="tv-header-brand">
            <div className="tv-brand-logo-icon">
              <Car size={26} color="#FFF" />
            </div>
            <div className="tv-brand-info">
              <h1 className="tv-brand-title">{companyInfo.name}</h1>
              <span className="tv-brand-sub">
                {currentPage.name || 'Trang hiện tại'} · {activePageIndex+1}/{pages.length} · {adLayoutMode === 'fullscreen' ? 'MÀN HÌNH QUẢNG CÁO' : (currentPage.screenTitle || 'BẢNG GIÁ DỊCH VỤ')}
              </span>
            </div>
          </div>

          <div className="tv-header-right">
            <button
              type="button"
              onClick={() => setAdLayoutMode(prev => prev === 'fullscreen' ? 'split' : 'fullscreen')}
              className="tv-header-toggle-btn"
              title="Chuyển chế độ xem Quảng Cáo Toàn Cảnh hoặc Bảng Giá"
            >
              {adLayoutMode === 'fullscreen' ? '📋 Bảng Giá + Banner' : '🎬 Quảng Cáo Toàn Cảnh'}
            </button>
            <div className="tv-hotline-wrap">
              <Phone size={15} color="#FFF" />
              <span className="tv-hotline-num">{companyInfo.hotline}</span>
            </div>
            <div className="tv-address-wrap">
              <MapPin size={13} color="rgba(255,255,255,0.85)" />
              <span>{companyInfo.address}</span>
            </div>
            <div className="tv-realtime-badge">
              <span className="tv-pulse-dot" />
              <span>{realtimeClock || 'Realtime'}</span>
            </div>
            <button onClick={toggleFullscreen} className="tv-fs-action-btn" title="Toàn màn hình">
              <Maximize size={15} color="#FFF" />
            </button>
          </div>
        </header>
      )}

      {/* ========================================================
          MAIN CONTENT AREA - 3 KIỂU MÀN HÌNH HOÀN TOÀN KHÁC BIỆT
          ======================================================== */}
      <main className="tv-main-content">{liveError&&<p role="alert">{liveError}</p>}
        {screenMode === 'payment_qr' ? (
          /* ========================================================
             KIỂU 2: BẢNG KÊ THANH TOÁN & QUÉT MÃ VIETQR (QUẦY POS)
             ======================================================== */
          <div className="tv-payment-wrapper">
            {effectivePaymentOrder ? (
              <div className="tv-split-layout tv-payment-layout">
                {/* CỘT TRÁI (62%): TỜ HÓA ĐƠN ĐIỆN TỬ MINH BẠCH KÍNH MỜ CHUẨN POS */}
                <div className={`tv-price-glass-card tv-invoice-card ${bankInfo.styleMode !== 'dark_gold' ? 'style-login-card' : ''} glass-style-${currentPage.glassStyle || 'dark_gold'}`}>
                  {/* HEADER HÓA ĐƠN */}
                  <div className="tv-invoice-top">
                    <div className="tv-plate-badge-pos">
                      <Car size={24} color="#EA580C" />
                      <span className="tv-plate-text">{effectivePaymentOrder.BIENSO || '—'}</span>
                    </div>

                    <div className="tv-invoice-meta-right">
                      <div className="tv-invoice-code">
                        <span>Mã phiếu:</span>
                        <b>{effectivePaymentOrder.MA_PHIEU || effectivePaymentOrder.NAME || 'Đơn đang thanh toán'}</b>
                      </div>
                      <div className="tv-invoice-time">
                        <Clock size={13} />
                        <span>{effectivePaymentOrder.NGAY || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* THÔNG TIN KHÁCH HÀNG & XE */}
                  <div className="tv-invoice-customer-bar">
                    <div className="tv-customer-meta-item">
                      <span>Khách hàng:</span>
                      <b>{effectivePaymentOrder.KHACHHANG || '—'}</b>
                    </div>
                    <div className="tv-customer-meta-item">
                      <span>Dòng xe:</span>
                      <b>{effectivePaymentOrder.HIEUXE || '—'}</b>
                    </div>
                    <div className="tv-customer-meta-item">
                      <span>Cố vấn:</span>
                      <b>{effectivePaymentOrder.CO_VAN || '—'}</b>
                    </div>
                  </div>

                  {/* BẢNG CHI TIẾT HẠNG MỤC DẠNG TABLE KẾ TOÁN SẮC NÉT */}
                  <div className="tv-invoice-table-wrap">
                    <table className="tv-invoice-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40, textAlign: 'center' }}>#</th>
                          <th>Hạng mục dịch vụ & Phụ tùng</th>
                          <th style={{ width: 85, textAlign: 'center' }}>Loại</th>
                          <th style={{ width: 60, textAlign: 'center' }}>SL</th>
                          <th style={{ width: 110, textAlign: 'right' }}>Đơn giá</th>
                          <th style={{ width: 130, textAlign: 'right' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(effectivePaymentOrder.details || []).map((row, idx) => {
                          const isPart = row.LOAI === 'Phụ tùng' || String(row.TEN).toLowerCase().includes('lọc') || String(row.TEN).toLowerCase().includes('nhớt');
                          return (
                            <tr key={idx} className="tv-invoice-tr">
                              <td style={{ textAlign: 'center' }} className="tv-td-stt">{idx + 1}</td>
                              <td className="tv-td-name">
                                <span className="tv-item-icon">{isPart ? '📦' : '🔧'}</span>
                                <span className="tv-item-title">{row.TEN || row.TEN_PT || row.NAME}</span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`tv-type-pill ${isPart ? 'part' : 'labor'}`}>
                                  {isPart ? 'Phụ tùng' : 'Công thợ'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }} className="tv-td-qty">x{row.SOLUONG ?? 0}</td>
                              <td style={{ textAlign: 'right' }} className="tv-td-price">{formatMoney(row.DONGIA)}</td>
                              <td style={{ textAlign: 'right' }} className="tv-td-amount">{formatMoney(row.THANHTIEN ?? 0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* KHỐI TỔNG KẾT TÀI CHÍNH */}
                  <div className="tv-invoice-footer-box">
                    <div className="tv-summary-row">
                      <span>Tổng tiền hàng & phụ tùng:</span>
                      <b>{formatMoney(effectivePaymentOrder.TONGCONG || 0)}</b>
                    </div>
                    {Number(effectivePaymentOrder.TIENGIAMGIA || 0) > 0 && (
                      <div className="tv-summary-row discount">
                        <span>Chiết khấu ưu đãi VIP:</span>
                        <b>-{formatMoney(effectivePaymentOrder.TIENGIAMGIA)}</b>
                      </div>
                    )}
                    <div className="tv-summary-row grand-total-row">
                      <span className="tv-grand-label">TỔNG CẦN THANH TOÁN:</span>
                      <strong className={`tv-grand-amount effect-${currentPage.textEffect || 'laser'}`}>
                        {formatMoney(Number(effectivePaymentOrder.TONGCONG || 0))}
                      </strong>
                    </div>
                    <div className="tv-amount-in-words">
                      <span>Bằng chữ: </span>
                      <em>{numberToVietnameseWords(Number(effectivePaymentOrder.TONGCONG || 0))}</em>
                    </div>
                  </div>
                </div>

                {/* CỘT PHẢI (38%): DOCK QUÉT MÃ VIETQR NAPAS 24/7 ĐỘNG */}
                <div className={`tv-payment-qr-column ${bankInfo.styleMode !== 'dark_gold' ? 'style-login-column' : ''}`}>
                  <VietQrBox
                    amount={Number(effectivePaymentOrder.TONGCONG || 0)}
                    memo={`${bankInfo.qrMemoPrefix || 'GARA'} ${(effectivePaymentOrder.BIENSO || effectivePaymentOrder.NAME || '').replace(/[^a-zA-Z0-9]/g, '')}`}
                    bankName={bankInfo.bankName || ''} bankBin={bankInfo.bankBin || ''}
                    accountNo={bankInfo.accountNo || ''}
                    accountName={bankInfo.accountName || ''}
                  />

                  <div className="tv-payment-status-card">
                    <div className="tv-radar-scanner">
                      <span className="tv-radar-beam" />
                      <Radio size={22} color="#EA580C" />
                    </div>
                    <div className="tv-radar-meta">
                      <b>ĐANG CHỜ THANH TOÁN...</b>
                      <span>Hệ thống tự động ghi nhận giao dịch thành công trong 3 giây</span>
                    </div>
                  </div>

                  <div className="tv-payment-perks-row">
                    <div className="tv-perk-pill">
                      <ShieldCheck size={18} color="#10B981" />
                      <span>Hóa đơn điện tử VAT gửi qua Zalo / Email</span>
                    </div>
                    <div className="tv-perk-pill">
                      <Award size={18} color="#EA580C" />
                      <span>Bảo hành chính hãng toàn hệ thống Kazuko</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* GIAO DIỆN CHỜ GIAO DỊCH (STANDBY KHI CHƯA CHỌN PHIẾU) */
              bankInfo.styleMode !== 'dark_gold' ? (
                /* PHONG CÁCH SÁNG KEM LUXURY NHƯ TRANG ĐĂNG NHẬP */
                <div className="tv-payment-standby-full tv-login-style-wrapper">
                  {/* CỘT TRÁI (62%): THẺ GIỚI THIỆU THƯƠNG HIỆU & 6 TÍNH NĂNG CHUẨN LOGIN */}
                  <div className="tv-login-left-banner">
                    <div className="banner-glass-container">
                      <div className="banner-header">
                        <div className="brand-logo-badge">
                          <div className="car-badge-icon">
                            <CreditCard size={28} color="#E65100" />
                          </div>
                          <div className="brand-badge-text">
                            <span className="brand-main">KAZUKO <span className="brand-accent">Auto</span></span>
                            <span className="brand-sub">QUẦY THU NGÂN & THANH TOÁN</span>
                          </div>
                        </div>
                        <h1 className="banner-main-title">{bankInfo.bannerTitle || 'Quầy Thu Ngân & Thanh Toán Minh Bạch'}</h1>
                        <p className="banner-sub-title">{bankInfo.bannerSubtitle || 'Đối soát công khai — Chuẩn hóa chi phí — Bảo hành điện tử'}</p>
                      </div>

                      {/* Lưới 6 cam kết dịch vụ thu ngân & thanh toán minh bạch */}
                      <div className="banner-features-grid">
                        <div className="feature-tile-card">
                          <div className="feature-icon-box" style={{ background: '#FFF3E0' }}>
                            <FileText size={22} color="#E65100" />
                          </div>
                          <div className="feature-text-box">
                            <span className="feature-title">Đối soát hóa đơn</span>
                            <span className="feature-desc">Minh bạch phụ tùng & tiền công</span>
                          </div>
                        </div>
                        <div className="feature-tile-card">
                          <div className="feature-icon-box" style={{ background: '#DCFCE7' }}>
                            <QrCode size={22} color="#16A34A" />
                          </div>
                          <div className="feature-text-box">
                            <span className="feature-title">VietQR Napas 24/7</span>
                            <span className="feature-desc">Quét mã chuyển khoản tức thì</span>
                          </div>
                        </div>
                        <div className="feature-tile-card">
                          <div className="feature-icon-box" style={{ background: '#FEF3C7' }}>
                            <CreditCard size={22} color="#D97706" />
                          </div>
                          <div className="feature-text-box">
                            <span className="feature-title">Đa dạng thanh toán</span>
                            <span className="feature-desc">Chuyển khoản, quẹt thẻ POS, tiền mặt</span>
                          </div>
                        </div>
                        <div className="feature-tile-card">
                          <div className="feature-icon-box" style={{ background: '#DBEAFE' }}>
                            <ShieldCheck size={22} color="#2563EB" />
                          </div>
                          <div className="feature-text-box">
                            <span className="feature-title">Bảo hành điện tử</span>
                            <span className="feature-desc">Kích hoạt bảo hành theo biển số xe</span>
                          </div>
                        </div>
                        <div className="feature-tile-card">
                          <div className="feature-icon-box" style={{ background: '#FFE4E6' }}>
                            <Zap size={22} color="#E11D48" />
                          </div>
                          <div className="feature-text-box">
                            <span className="feature-title">Xác nhận tức thì (3s)</span>
                            <span className="feature-desc">Tự động gạch nợ & in biên lai</span>
                          </div>
                        </div>
                        <div className="feature-tile-card">
                          <div className="feature-icon-box" style={{ background: '#F3E8FF' }}>
                            <CheckCircle2 size={22} color="#9333EA" />
                          </div>
                          <div className="feature-text-box">
                            <span className="feature-title">Hóa đơn điện tử VAT</span>
                            <span className="feature-desc">Xuất hóa đơn hợp lệ theo quy định</span>
                          </div>
                        </div>
                      </div>

                      {/* Slogan dưới cùng */}
                      <div className="banner-bottom-slogan">
                        <div className="slogan-script">{bankInfo.footerSloganMain || 'Minh bạch từng dịch vụ & phụ tùng'}</div>
                        <div className="slogan-caps">{bankInfo.footerSloganSub || 'UY TÍN TẠO NIỀM TIN • AN TÂM MỌI HÀNH TRÌNH'}</div>
                      </div>
                    </div>
                  </div>

                  {/* CỘT PHẢI (38%): THẺ THANH TOÁN VIETQR CHUẨN THẺ TRẮNG BO GÓC LOGIN */}
                  <div className="tv-login-right-panel">
                    <div className="tv-login-card">
                      <div className="card-brand-logo">
                        <div className="card-car-icon">
                          <Car size={22} color="#E65100" />
                        </div>
                        <div className="brand-text-col">
                          <span className="brand-name">KAZUKO <span className="brand-accent">Auto</span></span>
                          <span className="brand-sub">ALL IN ONE GARAGE SYSTEM</span>
                        </div>
                      </div>

                      <div className="tv-login-card-heading">
                        <h2 className="tv-login-card-title">Thanh toán VietQR</h2>
                        <p className="tv-login-card-sub">Quét mã nhanh qua mọi App Ngân hàng & Ví điện tử</p>
                      </div>

                      <div className="tv-login-qr-center-box">
                        <div className="tv-login-qr-frame">
                          {paymentQrUrl(bankInfo)?<img src={paymentQrUrl(bankInfo,0,bankInfo.qrMemoPrefix || 'Thanh toan')} alt="VietQR" className="tv-login-qr-img"/>:<p>Chưa chọn tài khoản ngân hàng hợp lệ.</p>}
                        </div>
                      </div>

                      <div className="tv-login-bank-meta">
                        <div className="tv-login-meta-item">
                          <span className="lbl">Ngân hàng:</span>
                          <b className="val highlight">{bankInfo.bankName || 'Chưa chọn tài khoản'}</b>
                        </div>
                        <div className="tv-login-meta-item">
                          <span className="lbl">Số tài khoản:</span>
                          <b className="val acc-num">{bankInfo.accountNo || '—'}</b>
                        </div>
                        <div className="tv-login-meta-item">
                          <span className="lbl">Chủ tài khoản:</span>
                          <b className="val">{bankInfo.accountName || '—'}</b>
                        </div>
                      </div>

                      <div className="tv-login-quick-methods">
                        <div className="tv-method-pill active">
                          <QrCode size={16} color="#E65100" />
                          <span>VietQR 24/7</span>
                        </div>
                        <div className="tv-method-pill">
                          <CreditCard size={16} color="#2563EB" />
                          <span>Thẻ POS</span>
                        </div>
                        <div className="tv-method-pill">
                          <Award size={16} color="#16A34A" />
                          <span>Tiền mặt</span>
                        </div>
                      </div>

                      

                      <div className="tv-login-card-footer">
                        <div className="footer-copyright">PHẦN MỀM ĐƯỢC PHÁT TRIỂN BỞI CTY KAZUKO VIỆT NAM</div>
                        <div className="footer-contact">
                          Hotline: <b>{bankInfo.hotline || companyInfo.hotline || '—'}</b>
                        </div>
                        <div className="footer-web">Website: {bankInfo.website || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* PHONG CÁCH KÍNH TỐI DARK GOLD */
                <div className="tv-payment-standby-full">
                  <div className="tv-standby-luxury-grid">
                    <div className="tv-standby-info-card">
                      <div className="tv-standby-icon-aura">
                        <CreditCard size={52} color="#FBBF24" />
                      </div>
                      <h2>QUẦY DỊCH VỤ & THU NGÂN KAZUKO AUTO</h2>
                      <p className="tv-standby-subdesc">
                        Hệ thống thanh toán điện tử minh bạch · Tiết kiệm thời gian · Bảo mật tiêu chuẩn Ngân hàng
                      </p>

                      <div className="tv-standby-perks-grid">
                        <div className="tv-standby-perk-item">
                          <CheckCircle2 size={20} color="#10B981" />
                          <div>
                            <b>Minh bạch 100%</b>
                            <span>Chi tiết rõ ràng từng hạng mục & phụ tùng</span>
                          </div>
                        </div>
                        <div className="tv-standby-perk-item">
                          <CheckCircle2 size={20} color="#10B981" />
                          <div>
                            <b>Quét VietQR 24/7</b>
                            <span>Chuyển khoản miễn phí tất cả ngân hàng</span>
                          </div>
                        </div>
                        <div className="tv-standby-perk-item">
                          <CheckCircle2 size={20} color="#10B981" />
                          <div>
                            <b>Đa dạng thanh toán</b>
                            <span>Hỗ trợ thẻ ATM, Visa, MasterCard, Ví điện tử</span>
                          </div>
                        </div>
                        <div className="tv-standby-perk-item">
                          <CheckCircle2 size={20} color="#10B981" />
                          <div>
                            <b>Bảo hành điện tử</b>
                            <span>Hóa đơn lưu trên hệ thống tra cứu trọn đời</span>
                          </div>
                        </div>
                      </div>

                      <div className="tv-standby-action-bar">
                        <span className="tv-standby-status-pill">
                          <span className="tv-pulse-dot" />
                          Thu ngân đang sẵn sàng phục vụ quý khách
                        </span>
                        
                      </div>
                    </div>

                    <div className="tv-standby-qr-card">
                      <div className="tv-qr-card-top">
                        <span className="tv-napas-pill">NAPAS 247</span>
                        <span className="tv-garage-account-label">TÀI KHOẢN CHÍNH THỨC GARAGE</span>
                      </div>

                      <div className="tv-static-qr-img-box">
                        {paymentQrUrl(bankInfo)?<img src={paymentQrUrl(bankInfo,0,bankInfo.qrMemoPrefix || 'Thanh toan')} alt="VietQR" className="tv-static-qr-img"/>:<p>Chưa chọn tài khoản ngân hàng hợp lệ.</p>}
                      </div>

                      <div className="tv-static-qr-meta">
                        <div className="tv-meta-row">
                          <span>Ngân hàng:</span>
                          <b>{bankInfo.bankName || 'Chưa chọn tài khoản'}</b>
                        </div>
                        <div className="tv-meta-row">
                          <span>Số tài khoản:</span>
                          <b className="tv-static-acc">{bankInfo.accountNo || '—'}</b>
                        </div>
                        <div className="tv-meta-row">
                          <span>Chủ tài khoản:</span>
                          <b>{bankInfo.accountName || '—'}</b>
                        </div>
                      </div>

                      <div className="tv-static-qr-hint">
                        Quý khách có thể quét mã để thanh toán cọc hoặc chi phí sửa chữa bất cứ lúc nào.
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        ) : screenMode === 'repair_flow' ? (
          /* ========================================================
             KIỂU 3: BẢNG TIẾN ĐỘ SỬA CHỮA XƯỞNG DỊCH VỤ (PHÒNG CHỜ VIP)
             ======================================================== */
          !workshopCarsList.length ? <div className="tv-price-glass-card"><p>Chưa có xe đang sửa chữa.</p></div> : <div className="tv-workshop-wrapper">
            {/* THANH 4 CHỈ SỐ VẬN HÀNH THỜI GIAN THỰC TRÊN CÙNG */}
            <div className="tv-workshop-metrics-bar">
              <div className="tv-metric-tile total">
                <div className="tv-metric-icon-wrap">
                  <Car size={22} color="#38BDF8" />
                </div>
                <div className="tv-metric-info">
                  <span className="tv-metric-num">{workshopCarsList.length}</span>
                  <span className="tv-metric-name">Tổng xe trong xưởng</span>
                </div>
              </div>

              <div className="tv-metric-tile repairing">
                <div className="tv-metric-icon-wrap">
                  <Wrench size={22} color="#F97316" />
                </div>
                <div className="tv-metric-info">
                  <span className="tv-metric-num">
                    {workshopCarsList.filter(c => c.TRANGTHAI === 2).length}
                  </span>
                  <span className="tv-metric-name">Đang thi công sửa chữa</span>
                </div>
                <span className="tv-status-glow-dot orange" />
              </div>

              <div className="tv-metric-tile kcs">
                <div className="tv-metric-icon-wrap">
                  <CheckCircle2 size={22} color="#FBBF24" />
                </div>
                <div className="tv-metric-info">
                  <span className="tv-metric-num">
                    {workshopCarsList.filter(c => c.TRANGTHAI === 1).length}
                  </span>
                  <span className="tv-metric-name">Chờ xác nhận sửa chữa</span>
                </div>
                <span className="tv-status-glow-dot amber" />
              </div>

              <div className="tv-metric-tile ready">
                <div className="tv-metric-icon-wrap">
                  <Award size={22} color="#10B981" />
                </div>
                <div className="tv-metric-info">
                  <span className="tv-metric-num">
                    {workshopCarsList.filter(c => c.TRANGTHAI === 3).length}
                  </span>
                  <span className="tv-metric-name">Chờ bàn giao xe</span>
                </div>
                <span className="tv-status-glow-dot green" />
              </div>
            </div>

            {/* BỐ CỤC CHÍNH CỦA TIẾN ĐỘ XƯỞNG */}
            <div className="tv-split-layout tv-repair-flow-layout">
              {/* CỘT TRÁI (58%): SPOTLIGHT XE NỔI BẬT ĐANG TRONG KHOANG */}
              <div className={`tv-price-glass-card tv-featured-car-card glass-style-${currentPage.glassStyle || 'dark_gold'}`}>
                {/* HEADER XE SPOTLIGHT */}
                <div className="tv-featured-car-header">
                  <div className="tv-featured-plate">
                    <Car size={26} color="#FBBF24" />
                    <span className="tv-plate-number">{activeCar?.BIENSO || '—'}</span>
                  </div>

                  <div className="tv-featured-car-model">
                    <h3>{activeCar?.LOAIXE || '—'}</h3>
                    <div className="tv-model-meta-row">
                      <span>Chủ xe: <b>{activeCar?.KHACHHANG || '—'}</b></span>
                      <span className="tv-sep">·</span>
                      <span>SĐT: <b>{activeCar?.DIENTHOAI || '—'}</b></span>
                    </div>
                  </div>
                </div>

                {/* 5 BƯỚC TIẾN ĐỘ QUY TRÌNH CHUẨN */}
                <div className="tv-flow-steps-tracker">
                  {workflowStates.map((state,i)=>{const st={step:Number(state.STT_WORKFLOW)+1,label:state.TEN,desc:''};
                    const currentStep = Number(activeCar?.TRANGTHAI ?? 0) + 1;
                    const isDone = st.step < currentStep;
                    const isCurrent = st.step === currentStep;
                    return (
                      <div key={i} className={`tv-step-node ${isDone ? 'done' : isCurrent ? 'current' : ''}`}>
                        <div className="tv-step-dot">
                          {isDone ? <Check size={16} /> : st.step}
                        </div>
                        <span className="tv-step-label">{st.label}</span>
                        <span className="tv-step-sub">{st.desc}</span>
                      </div>
                    );
                  })}
                </div>

                {/* CHI TIẾT HẠNG MỤC DỊCH VỤ THỰC TẾ CỦA XE */}
                <div className="tv-featured-tasks-box">
                  <div className="tv-tasks-header">
                    <h4 className="tv-tasks-title">HẠNG MỤC CÔNG VIỆC ĐANG THỰC HIỆN TẠI KHOANG:</h4>
                    <span className="tv-tasks-count">Trạng thái: <b>{activeCar?.STATUS_LABEL}</b></span>
                  </div>

                  <div className="tv-tasks-list">{!activeCar?.TASKS?.length&&<p>Chưa có hạng mục công việc.</p>}
                    {(activeCar?.TASKS || []).map((tsk, tIdx) => (
                      <div key={tIdx} className={`tv-task-item ${tsk.status}`}>
                        {tsk.status === 'done' ? (
                          <CheckCircle2 size={18} color="#10B981" />
                        ) : tsk.status === 'doing' ? (
                          <RefreshCw size={18} color="#F59E0B" className="spin-slow" />
                        ) : (
                          <Clock size={18} color="#64748B" />
                        )}
                        <span className="tv-task-text">{tsk.name}</span>
                        <span className={`tv-task-badge ${tsk.status}`}>
                          {tsk.status === 'done' ? 'Hoàn thành' : tsk.status === 'doing' ? 'Đang thi công' : 'Chưa ghi nhận trạng thái'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* THÔNG TIN KỸ THUẬT VIÊN & DỰ KIẾN GIAO XE */}
                <div className="tv-featured-footer-meta">
                  <div className="tv-meta-cell">
                    <span>Vị trí:</span>
                    <b>{activeCar?.KHOANG || 'Chưa ghi nhận'}</b>
                  </div>
                  <div className="tv-meta-cell">
                    <span>KTV phụ trách:</span>
                    <b>{activeCar?.KTV || 'Chưa phân công'}</b>
                  </div>
                  <div className="tv-meta-cell">
                    <span>Vào xưởng:</span>
                    <b>{activeCar?.GIO_VAO || '—'}</b>
                  </div>
                  <div className="tv-meta-cell highlight">
                    <span>Dự kiến bàn giao:</span>
                    <b className="tv-due-time">{activeCar?.GIO_XONG || 'Chưa có dự kiến'}</b>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI (42%): BẢNG ĐIỀU PHỐI TẤT CẢ CÁC XE TRONG KHOANG */}
              <div className="tv-queue-column">
                <div className="tv-queue-card">
                  <div className="tv-queue-header">
                    <Wrench size={20} color="#F59E0B" />
                    <h3>KHOANG DỊCH VỤ & DANH SÁCH XE ({workshopCarsList.length} XE)</h3>
                  </div>

                  <div className="tv-queue-items-list">
                    {workshopCarsList.map((car, idx) => {
                      const isSelected = car.BIENSO === activeCar?.BIENSO;
                      const isReady = car.TRANGTHAI === 4;
                      return (
                        <div
                          key={idx}
                          className={`tv-queue-row ${isSelected ? 'active' : ''} ${isReady ? 'is-ready' : ''}`}
                          onClick={() => setRepairIndex(idx)}
                        >
                          <div className="tv-queue-left">
                            <b className="tv-queue-plate">{car.BIENSO}</b>
                            <span className="tv-queue-model">{car.LOAIXE}</span>
                            <small className="tv-queue-bay">{car.KHOANG}</small>
                          </div>
                          <div className="tv-queue-right">
                            <span className={`tv-queue-badge status-${car.TRANGTHAI}`}>
                              {car.TRANGTHAI === 1 ? 'Tiếp nhận' : car.TRANGTHAI === 2 ? 'Đang sửa' : car.TRANGTHAI === 3 ? 'KCS & Rửa xe' : 'MỜI NHẬN XE'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* KHỐI TIỆN ÍCH PHÒNG CHỜ VIP CHO KHÁCH HÀNG */}
                <div className="tv-lounge-perks-box">
                  <div className="tv-perk-row">
                    <Wifi size={18} color="#38BDF8" />
                    <span>Wifi VIP: <b>{loungeInfo.wifiSsid || 'Chưa cấu hình'}</b> · Mật khẩu: <b>{loungeInfo.wifiPass || '—'}</b></span>
                  </div>
                  <div className="tv-perk-row">
                    <Coffee size={18} color="#F59E0B" />
                    <span>Trà, cà phê & nước suối miễn phí tại phòng chờ VIP</span>
                  </div>
                  <div className="tv-perk-row">
                    <PhoneCall size={18} color="#EA580C" />
                    <span>Cố vấn dịch vụ hỗ trợ trực tiếp: <b>{loungeInfo.hotline || companyInfo.hotline}</b></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             KIỂU 1: QUẢNG CÁO & KHUYẾN MÃI SHOWROOM (SẢNH CHÍNH)
             ======================================================== */
          adLayoutMode === 'fullscreen' ? (
            <div className="tv-fullscreen-ad-layout">
              {/* CỘT TRÁI (68%): BANNER QUẢNG CÁO HERO CINEMATIC */}
              <div className="tv-ad-hero-card">
                <div className="tv-ad-hero-media">
                  {activeBanner.url ? <img key={activeBanner.id || activeBannerIndex} src={activeBanner.url} alt={activeBanner.title} className="tv-ad-hero-img"/> : <div role="status" style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',padding:24,textAlign:'center'}}>Chưa có ảnh banner cho {currentPage.name || 'trang này'}</div>}
                  <div className="tv-ad-hero-overlay" />

                  {/* TOP FLOATING BADGES */}
                  <div className="tv-ad-top-badges">
                    <div className="tv-ad-badge-item pulse">
                      <Sparkles size={16} color="#FBBF24" />
                      <span>NỘI DUNG CỬA HÀNG</span>
                    </div>
                    <div className="tv-ad-badge-item blur">
                      <ShieldCheck size={16} color="#34D399" />
                      <span>NỘI DUNG ĐÃ CẤU HÌNH</span>
                    </div>
                    <div className="tv-ad-slide-counter">
                      <span>{banners.length ? `${Math.min(activeBannerIndex,banners.length-1)+1} / ${banners.length}` : '0 banner'}</span>
                    </div>
                  </div>

                  {/* BOTTOM HERO CONTENT */}
                  <div className="tv-ad-hero-content">
                    <div className="tv-ad-brand-pill">
                      <Car size={16} color="#EA580C" />
                      <span>{companyInfo.name} • SHOWROOM & DỊCH VỤ Ô TÔ</span>
                    </div>
                    <h1 className="tv-ad-hero-title">{activeBanner?.title}</h1>
                    <p className="tv-ad-hero-sub">{activeBanner?.subtitle}</p>

                    
                  </div>

                  {/* SLIDE INDICATORS */}
                  <div className="tv-ad-slide-indicators">
                    {banners.map((b, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`tv-ad-indicator-dot ${idx === activeBannerIndex ? 'active' : ''}`}
                        onClick={() => setActiveBannerIndex(idx)}
                        title={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI (32%): CÁC GÓI COMBO KHUYẾN MÃI NỔI BẬT */}
              <div className="tv-ad-promos-column">
                <div className="tv-ad-promos-header">
                  <div className="tv-ad-promos-title-wrap">
                    <Star size={18} color="#F59E0B" />
                    <h3 className="tv-ad-promos-title">DỊCH VỤ CỦA CỬA HÀNG</h3>
                  </div>
                  <span className="tv-ad-promos-tag">BẢNG GIÁ HIỆN TẠI</span>
                </div>

                <div className="tv-ad-promos-list">{!pageServices.length&&<p>Chưa có dịch vụ được chọn cho trang này.</p>}
                  {pageServices.map((service, pIdx) => (
                    <div key={pIdx} className="tv-ad-promo-card">
                      <div className="tv-ad-promo-badge" style={{ backgroundColor: activeColorTheme.color }}>
                        BẢNG GIÁ
                      </div>
                      <div className="tv-ad-promo-body">
                        <h4 className="tv-ad-promo-name">{service.name}</h4>
                        <p className="tv-ad-promo-desc">{service.group}</p>
                        <div className="tv-ad-promo-price-row">
                          
                          <span className="tv-ad-sale-price">{formatMoney(service.price)}</span>
                        </div>
                        
                      </div>
                    </div>
                  ))}
                </div>

                {/* BOX ĐẶT LỊCH HẸN NHANH */}
                <div className="tv-ad-booking-box">
                  <div className="tv-booking-left">
                    <span className="tv-booking-label">ĐẶT LỊCH ƯU TIÊN SẢNH</span>
                    <span className="tv-booking-phone">{companyInfo.hotline}</span>
                  </div>
                  <div className="tv-booking-qr">
                    <QrCode size={38} color="#0F172A" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* CHẾ ĐỘ SPLIT: BẢNG GIÁ DỊCH VỤ + BANNER PHỤ */
            <div className="tv-split-layout">
              {/* PRICE LIST GLASS CARD */}
              <div className={`tv-price-glass-card glass-style-${currentPage.glassStyle || 'dark_gold'}`}>
                <div className="tv-price-columns">
                  {groupKeys.map((grpKey, colIdx) => (
                    <div key={colIdx} className="tv-price-group-col">
                      <div className="tv-group-header">
                        <span className="tv-group-bullet" />
                        <h3 className="tv-group-title">{grpKey}</h3>
                      </div>
                      <div className="tv-service-list">
                        {groupedServices[grpKey].map((srv, sIdx) => (
                          <div key={sIdx} className="tv-service-row">
                            <span className="tv-service-name">{srv.name}</span>
                            <span className={`tv-service-price effect-${currentPage.textEffect || 'laser'}`}>
                              {formatMoney(srv.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BANNER SHOWCASE */}
              <div className="tv-banner-showcase-card">
                <div className="tv-banner-image-wrap">
                  {activeBanner.url&&<img src={activeBanner.url} alt={activeBanner.title} className="tv-banner-img"/>}
                  <div className="tv-banner-badge-bar" style={{ background: activeColorTheme.color }}>
                    <span className="tv-banner-badge-tag">{companyInfo.name}</span>
                    <h2 className="tv-banner-badge-title">{activeBanner.title}</h2>
                    <p className="tv-banner-badge-sub">{activeBanner.subtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* BOTTOM FOOTER */}
      <footer className="tv-footer" style={{ background: `linear-gradient(90deg, ${activeColorTheme.darkColor} 0%, ${activeColorTheme.color} 100%)` }}>
        <div className="tv-footer-hotline-pill" style={{ background: activeColorTheme.color }}>
          <Phone size={14} color="#FFF" />
          <span>HOTLINE {companyInfo.hotline}</span>
        </div>

        <div className="tv-marquee-track">
          <div className="tv-marquee-text">
            {currentPage.ticker || ''}
          </div>
        </div>

        <div className="tv-footer-controls">
          <span className="tv-page-indicator">
            {activePageIndex + 1}/{pages.length}
          </span>
          <button className="tv-fullscreen-btn" onClick={toggleFullscreen} title="Toàn màn hình">
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            <span>Phóng to</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

// =========================================================================
// MANAGER UI (Admin Dashboard: /man-hinh-phu)
// =========================================================================
export default function ManHinhPhuPage() {
  const navigate = useNavigate();
  const [screens, setScreens] = useState(createDefaultScreens);
  const [activeScreenId, setActiveScreenId] = useState('1');
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [saveStatus,setSaveStatus]=useState('');
  const [configReady,setConfigReady]=useState(false),[configError,setConfigError]=useState(''),[configVersion,setConfigVersion]=useState(null),[bankAccounts,setBankAccounts]=useState([]),[savingConfig,setSavingConfig]=useState(false);
  const [legacyAvailable,setLegacyAvailable]=useState(false);
  const loadConfiguration=async()=>{setConfigError('');try{const r=await api.get('/secondary-display-config');const data=r.data.data;setScreens(mergeScreens(data.screens,data.accounts,data.defaultAccountId));setConfigVersion(data.version);setBankAccounts(data.accounts);setConfigReady(true);setIsDirty(false);setLegacyAvailable(!data.screens&&!!localStorage.getItem(STORAGE_KEY));}catch(error){setConfigError(error.response?.data?.error||'Chưa tải được cấu hình từ Firebird.');}};
  useEffect(()=>{loadConfiguration();},[]);

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    api.get('/catalog/resources/services')
      .then(res => {
        const rows = res.data?.data || [];
        if (rows.length > 0) {
          setServices(rows.map(r => ({
            id: String(r.ID),
            name: r.NAME,
            group: r.DLOAIDICHVU_NAME || 'DỊCH VỤ TIÊU CHUẨN',
            price: Number(r.GIA || 0)
          })));
        }
      })
      .catch(() => {});

    api.get('/repair-orders')
      .then(res => setOrders(res.data?.data || []))
      .catch(() => {});
  }, []);

  const currentScreen = screens[activeScreenId] || screens['1'];
  const pages = currentScreen.pages?.length ? currentScreen.pages : [createDefaultPage(0)];
  const currentPage = pages[activePageIndex] || pages[0];

  const updateCurrentScreen = updater => {
    setScreens(prev => {
      const next = { ...prev };
      next[activeScreenId] = updater({ ...next[activeScreenId] });
      return next;
    });
    setIsDirty(true);
    setSaveStatus('');
  };

  const updateCurrentPage = updater => {
    updateCurrentScreen(scr => {
      const newPages = [...scr.pages];
      newPages[activePageIndex] = updater({ ...newPages[activePageIndex] });
      return { ...scr, pages: newPages };
    });
  };

  const handleAddPage = () => {
    updateCurrentScreen(scr => ({
      ...scr,
      pages: [...scr.pages, createDefaultPage(scr.pages.length, `Trang ${scr.pages.length + 1}`, scr.type)]
    }));
    setActivePageIndex(pages.length);
  };

  const handleDuplicatePage = () => {
    const clone = {
      ...currentPage,
      id: `page-${Date.now()}-${pages.length}`,
      name: `${currentPage.name} (Bản sao)`
    };
    updateCurrentScreen(scr => ({
      ...scr,
      pages: [...scr.pages, clone]
    }));
    setActivePageIndex(pages.length);
  };

  const handleDeletePage = () => {
    if (pages.length <= 1) {
      alert('Mỗi màn hình cần ít nhất 1 trang trình chiếu.');
      return;
    }
    updateCurrentScreen(scr => ({
      ...scr,
      pages: scr.pages.filter((_, idx) => idx !== activePageIndex)
    }));
    setActivePageIndex(prev => Math.max(0, prev - 1));
  };

  const toggleService = srvId => {
    const set = new Set(currentPage.selectedServiceIds || []);
    if (set.has(srvId)) set.delete(srvId);
    else set.add(srvId);
    updateCurrentPage(p => ({ ...p, selectedServiceIds: Array.from(set) }));
  };

  const handleAddCustomBanner = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const res = await compressImage(file, imagePolicies.advertising);
      const newBanner = {
        id: `banner-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        subtitle: 'Dịch vụ chuyên nghiệp KAZUKO AUTO',
        url: res.data
      };
      updateCurrentPage(p => ({
        ...p,
        banners: [...(p.banners || []), newBanner]
      }));
    } catch (err) {
      alert(err.message || 'Lỗi nén ảnh banner');
    }
  };

  const handleMoveBanner = (index, dir) => {
    const list = [...(currentPage.banners || [])];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    updateCurrentPage(p => ({ ...p, banners: list }));
  };

  const handleDeleteBanner = index => {
    const list = (currentPage.banners || []).filter((_, idx) => idx !== index);
    updateCurrentPage(p => ({ ...p, banners: list }));
  };

  const handleUpdateBanner = (index, field, val) => {
    const list = [...(currentPage.banners || [])];
    list[index] = { ...list[index], [field]: val };
    updateCurrentPage(p => ({ ...p, banners: list }));
  };

  const handleUploadCustomBg = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const res = await compressImage(file, imagePolicies.advertising);
      updateCurrentPage(p => ({ ...p, bgCustomUrl: res.data, bgPreset: 'custom' }));
    } catch (err) {
      alert(err.message || 'Lỗi tải ảnh nền');
    }
  };

  const handleSaveDraft = async()=>{
    if(savingConfig||!configReady)return false;setSavingConfig(true);setConfigError('');
    try{const r=await api.put('/secondary-display-config',{screens,version:configVersion});const data=r.data.data;setScreens(mergeScreens(data.screens,data.accounts));setConfigVersion(data.version);setBankAccounts(data.accounts);setIsDirty(false);setLegacyAvailable(false);setSaveStatus('Đã lưu cấu hình vào Firebird của cửa hàng.');window.dispatchEvent(new Event('garage:tv-displays-changed'));return true;}
    catch(error){setConfigError(error.response?.data?.error||'Chưa lưu được cấu hình.');return false;}finally{setSavingConfig(false);}
  };
  const handleOpenDisplay=()=>{const display=window.open('about:blank','_blank');handleSaveDraft().then(ok=>{if(ok){if(display)display.location.href='/man-hinh-phu/xem/'+activeScreenId;}else display?.close();});};
  const importLegacy=()=>{if(!window.confirm('Chuyển cấu hình trình duyệt cũ vào cửa hàng đang đăng nhập? Hãy kiểm tra đúng cửa hàng và chọn lại tài khoản ngân hàng trước khi lưu.'))return;const old=loadLegacyScreens();for(const screen of Object.values(old)){const bank=screen.bankInfo||{};screen.bankInfo={...bank,accountId:'',bankName:'',accountNo:'',accountName:'',bankBin:''};}setScreens(old);setIsDirty(true);setSaveStatus('Đã nạp cấu hình cũ. Chọn lại tài khoản ngân hàng rồi bấm Lưu cấu hình.');};
  if(!configReady)return <div className="sd-admin-container"><p>{configError||'Đang tải cấu hình Firebird…'}</p>{configError&&<button onClick={loadConfiguration}>Thử lại</button>}</div>;

  return (
    <fieldset className="sd-admin-container" disabled={savingConfig} style={{border:0,margin:0,minWidth:0}}>
      {configError&&<p role="alert">{configError} <button type="button" onClick={loadConfiguration}>Tải lại cấu hình đã lưu</button></p>}{legacyAvailable&&<p>Có cấu hình cũ trong trình duyệt. <button type="button" onClick={importLegacy}>Chuyển cấu hình cũ sang cửa hàng này</button></p>}
      {/* 3 SCREEN TABS AT TOP */}
      <div className="sd-screen-tabs-bar">
        <div className="sd-screen-tabs-list">
          {['1', '2', '3'].map(id => {
            const scr = screens[id] || {};
            const theme = COLOR_THEMES.find(t => t.id === scr.colorTheme) || COLOR_THEMES[0];
            const isSelected = activeScreenId === id;
            const scrTypeInfo = SCREEN_TYPES.find(t => t.id === scr.type) || SCREEN_TYPES[Number(id) - 1] || SCREEN_TYPES[0];
            const TypeIcon = scrTypeInfo.icon;

            return (
              <button
                key={id}
                type="button"
                className={`sd-screen-tab-btn ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setActiveScreenId(id);
                  setActivePageIndex(0);
                }}
              >
                <div className="sd-screen-tab-icon" style={{ background: theme.color }}>
                  <TypeIcon size={20} color="#FFF" />
                </div>
                <div className="sd-screen-tab-info">
                  <span className="sd-screen-tab-title">{scr.name || `Màn hình ${id}`}</span>
                  <span className="sd-screen-tab-pages">{scrTypeInfo.label.split('.')[1]}</span>
                </div>
                <span
                  className="sd-screen-open-link"
                  title={`Mở Màn hình ${id} trên tab mới`}
                  onClick={e => {
                    e.stopPropagation();
                    window.open(`/man-hinh-phu/xem/${id}`, '_blank');
                  }}
                >
                  <ExternalLink size={14} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONFIGURATION CARD */}
      <div className="sd-config-card">
        {/* KIỂU MÀN HÌNH CHỌN TRỰC TIẾP */}
        <div className="sd-screen-type-selector-box">
          <label className="sd-field-label">Kiểu hiển thị của Màn hình {activeScreenId}:</label>
          <div className="sd-screen-type-buttons">
            {SCREEN_TYPES.map(st => {
              const isActive = (currentScreen.type || 'price_banner') === st.id;
              const Icon = st.icon;
              return (
                <button
                  key={st.id}
                  type="button"
                  className={`sd-type-select-btn ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    updateCurrentScreen(s => ({ ...s, type: st.id }));
                    updateCurrentPage(p => ({ ...p, mode: st.id }));
                  }}
                >
                  <Icon size={18} />
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TOP BAR: CÁC TRANG TRÌNH CHIẾU */}
        <div className="sd-pages-header-row">
          <div className="sd-pages-title-group">
            <h2 className="sd-pages-heading">Các trang trình chiếu ({pages.length})</h2>
            <p className="sd-pages-subheading">Mỗi trang có nội dung, banner, ảnh nền và thời gian riêng.</p>
          </div>

          <div className="sd-pages-actions">
            <button type="button" className="sd-btn-add-page" onClick={handleAddPage}>
              <Plus size={16} />
              <span>Thêm trang</span>
            </button>
            <button
              type="button"
              className="sd-btn-action-outline"
              title="Nhân bản trang này để tạo nhanh trang mới tương tự"
              onClick={handleDuplicatePage}
            >
              <Copy size={15} />
              <span>Nhân bản trang</span>
            </button>
            <button
              type="button"
              className="sd-btn-action-outline danger"
              disabled={pages.length <= 1}
              title={pages.length <= 1 ? "Mỗi màn hình cần ít nhất 1 trang trình chiếu" : "Xóa vĩnh viễn trang này"}
              onClick={handleDeletePage}
            >
              <Trash2 size={15} />
              <span>Xóa trang</span>
            </button>
          </div>
        </div>

        {/* PAGE PILLS */}
        <div className="sd-page-pills-list">
          {pages.map((p, idx) => {
            const isSelected = activePageIndex === idx;
            return (
              <div
                key={p.id || idx}
                className={`sd-page-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setActivePageIndex(idx)}
              >
                <span className="sd-pill-num">{idx + 1}. {p.name || `Trang ${idx + 1}`}</span>
                <span className="sd-pill-stats">
                  {p.mode === 'payment_qr' ? 'Thanh toán VietQR' : p.mode === 'repair_flow' ? 'Tiến độ sửa xe' : `${p.selectedServiceIds?.length || 0} dịch vụ · ${p.banners?.length || 0} banner`}
                </span>
              </div>
            );
          })}
        </div>

        {/* PAGE NAV / RENAME */}
        <div className="sd-page-nav-bar">
          <input
            type="text"
            className="sd-page-name-input"
            value={currentPage.name || `Trang ${activePageIndex + 1}`}
            onChange={e => updateCurrentPage(p => ({ ...p, name: e.target.value }))}
            placeholder="Tên trang..."
          />
          <div className="sd-page-arrows">
            <span className="sd-page-counter-badge">
              Trang {activePageIndex + 1} / {pages.length}
            </span>
            <button
              type="button"
              className="sd-arrow-btn"
              disabled={activePageIndex === 0}
              onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
              title={activePageIndex === 0 ? "Đang ở trang đầu tiên" : "Xem/sửa trang trước đó"}
            >
              <ChevronLeft size={16} />
              <span>Trang trước</span>
            </button>
            <button
              type="button"
              className="sd-arrow-btn"
              disabled={activePageIndex >= pages.length - 1}
              onClick={() => setActivePageIndex(prev => Math.min(pages.length - 1, prev + 1))}
              title={activePageIndex >= pages.length - 1 ? "Đang ở trang cuối cùng" : "Xem/sửa trang tiếp theo"}
            >
              <span>Trang sau</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* SETTINGS ROW 1 */}
        <div className="sd-form-row three-cols">
          <div className="sd-field-group">
            <label className="sd-field-label">Tên màn hình nội dung</label>
            <input
              type="text"
              className="sd-input"
              value={currentPage.screenTitle || ''}
              onChange={e => updateCurrentPage(p => ({ ...p, screenTitle: e.target.value }))}
              placeholder="Bảng giá TV chính"
            />
          </div>

          <div className="sd-field-group">
            <label className="sd-field-label">Chế độ trình chiếu</label>
            <select
              className="sd-select"
              value={currentPage.mode || currentScreen.type || 'price_banner'}
              onChange={e => updateCurrentPage(p => ({ ...p, mode: e.target.value }))}
            >
              <option value="price_banner">1. Màn hình Quảng Cáo & Khuyến Mãi (TV Sảnh)</option>
              <option value="payment_qr">2. Màn hình Thanh Toán & VietQR (Quầy POS)</option>
              <option value="repair_flow">3. Màn hình Tiến Độ Sửa Chữa (Xưởng & Phòng Chờ)</option>
            </select>
          </div>

          {activeScreenId === '1' && (
            <div className="sd-field-group">
              <label className="sd-field-label">Kiểu hiển thị TV Quảng Cáo</label>
              <select
                className="sd-select"
                value={currentPage.adLayout || 'fullscreen'}
                onChange={e => updateCurrentPage(p => ({ ...p, adLayout: e.target.value }))}
              >
                <option value="fullscreen">🎬 Quảng cáo toàn cảnh + Gói khuyến mãi (Showroom)</option>
                <option value="split">📋 Bảng giá dịch vụ + Banner bên phải</option>
              </select>
            </div>
          )}

          <div className="sd-field-group">
            <label className="sd-field-label">Đổi trang sau</label>
            <div className="sd-number-unit-wrap">
              <input
                type="number"
                min="5"
                max="300"
                className="sd-input number"
                value={currentPage.interval || 15}
                onChange={e => updateCurrentPage(p => ({ ...p, interval: Math.max(5, Number(e.target.value)) }))}
              />
              <span className="sd-unit-label">giây</span>
            </div>
          </div>
        </div>

        {/* SETTINGS ROW 2: Chữ chạy liên tục */}
        <div className="sd-field-group full-width">
          <label className="sd-field-label">Chữ chạy liên tục</label>
          <textarea
            className="sd-textarea"
            rows="2"
            value={currentPage.ticker || ''}
            onChange={e => updateCurrentPage(p => ({ ...p, ticker: e.target.value }))}
            placeholder="Cảm ơn quý khách đã luôn tin tưởng và đồng hành cùng KAZUKO AUTO..."
          />
        </div>

        {/* MÀU MÀN HÌNH TV (9 MÀU PHONG THỦY) */}
        <div className="sd-section-block">
          <div className="sd-section-header-row">
            <h3 className="sd-section-title">Màu màn hình TV</h3>
            <span className="sd-section-note">Lưu riêng theo màn hình</span>
          </div>

          <div className="sd-color-themes-grid">
            {COLOR_THEMES.map(th => {
              const isSelected = currentScreen.colorTheme === th.id;
              return (
                <div
                  key={th.id}
                  className={`sd-theme-card ${isSelected ? 'active' : ''}`}
                  onClick={() => updateCurrentScreen(scr => ({ ...scr, colorTheme: th.id }))}
                >
                  <span className="sd-theme-color-box" style={{ background: th.color }} />
                  <div className="sd-theme-meta">
                    <span className="sd-theme-name">{th.name}</span>
                    <span className="sd-theme-sub">{th.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ẢNH NỀN CỦA TRANG */}
        <div className="sd-section-block">
          <div className="sd-section-header-row">
            <h3 className="sd-section-title">Ảnh nền của trang</h3>
            <span className="sd-section-note">Chọn mẫu có sẵn hoặc tải ảnh riêng</span>
          </div>

          <div className="sd-bg-presets-grid">
            {BG_PRESETS.map(bg => {
              const isSelected = currentPage.bgPreset === bg.id && !currentPage.bgCustomUrl;
              return (
                <div
                  key={bg.id}
                  className={`sd-bg-preset-card ${isSelected ? 'active' : ''}`}
                  onClick={() => updateCurrentPage(p => ({ ...p, bgPreset: bg.id, bgCustomUrl: '' }))}
                >
                  <div className="sd-bg-preview-rect" style={{ background: bg.previewGradient }} />
                  <span className="sd-bg-preset-title">{bg.name}</span>
                </div>
              );
            })}
          </div>

          <div className="sd-bg-controls-row">
            {currentPage.bgCustomUrl && (
              <div className="sd-custom-bg-badge">
                <span>Đang dùng ảnh riêng</span>
                <button
                  type="button"
                  className="sd-remove-btn"
                  onClick={() => updateCurrentPage(p => ({ ...p, bgCustomUrl: '', bgPreset: 'orange_luxury' }))}
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            )}

            <label className="sd-upload-bg-btn">
              <ImageIcon size={16} />
              <span>Tải ảnh nền riêng</span>
              <input type="file" accept="image/*" onChange={handleUploadCustomBg} style={{ display: 'none' }} />
            </label>

            <div className="sd-field-group mini">
              <label className="sd-field-label">Cách vừa ảnh</label>
              <select
                className="sd-select"
                value={currentPage.bgFit || 'cover'}
                onChange={e => updateCurrentPage(p => ({ ...p, bgFit: e.target.value }))}
              >
                <option value="cover">Phủ kín</option>
                <option value="contain">Vừa khít</option>
              </select>
            </div>

            <div className="sd-field-group mini">
              <label className="sd-field-label">Vị trí</label>
              <select
                className="sd-select"
                value={currentPage.bgPos || 'center'}
                onChange={e => updateCurrentPage(p => ({ ...p, bgPos: e.target.value }))}
              >
                <option value="center">Giữa</option>
                <option value="top">Trên</option>
                <option value="bottom">Dưới</option>
              </select>
            </div>
          </div>

          <div className="sd-overlay-slider-wrap">
            <div className="sd-slider-label-row">
              <span>Lớp phủ tối:</span>
              <b>{currentPage.bgDarkOverlay ?? 15}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              className="sd-slider"
              value={currentPage.bgDarkOverlay ?? 15}
              onChange={e => updateCurrentPage(p => ({ ...p, bgDarkOverlay: Number(e.target.value) }))}
            />
          </div>
        </div>

        {/* KIỂU KÍNH MỜ BẢNG GIÁ (GLASSMORPHISM) */}
        <div className="sd-section-block">
          <div className="sd-section-header-row">
            <h3 className="sd-section-title">Kiểu kính mờ bảng giá (Glassmorphism)</h3>
            <span className="sd-section-note">Chọn hiệu ứng nổi bật theo màu banner</span>
          </div>

          <div className="sd-glass-options-grid">
            {GLASS_STYLES.map(g => {
              const isSelected = (currentPage.glassStyle || 'dark_gold') === g.id;
              const Icon = g.icon;
              return (
                <div
                  key={g.id}
                  className={`sd-glass-card ${g.id} ${isSelected ? 'active' : ''}`}
                  onClick={() => updateCurrentPage(p => ({ ...p, glassStyle: g.id }))}
                >
                  <div className="sd-glass-card-top">
                    <span className="sd-glass-icon-box"><Icon size={20} /></span>
                    <span className="sd-glass-name">{g.name}</span>
                  </div>
                  <p className="sd-glass-desc">{g.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* HIỆU ỨNG CHỮ & GIÁ TIỀN */}
        <div className="sd-section-block">
          <div className="sd-section-header-row">
            <h3 className="sd-section-title">Hiệu ứng chữ & giá tiền (Chớp sáng / Lấp lánh)</h3>
            <span className="sd-section-note">Tạo điểm nhấn thu hút ánh nhìn trên TV</span>
          </div>

          <div className="sd-effects-grid">
            {TEXT_EFFECTS.map(eff => {
              const isSelected = (currentPage.textEffect || 'laser') === eff.id;
              const Icon = eff.icon;
              return (
                <div
                  key={eff.id}
                  className={`sd-effect-card ${isSelected ? 'active' : ''}`}
                  onClick={() => updateCurrentPage(p => ({ ...p, textEffect: eff.id }))}
                >
                  <span className="sd-effect-icon-circle"><Icon size={18} /></span>
                  <span className="sd-effect-name">{eff.name}</span>
                  <span className="sd-effect-desc">{eff.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CẤU HÌNH ĐẶC THÙ THEO KIỂU MÀN HÌNH */}
        {currentScreen.type === 'payment_qr' ? (
          /* CẤU HÌNH QUẦY THANH TOÁN */
          <div className="sd-section-block">
            <div className="sd-section-header-row">
              <div>
                <h3 className="sd-section-title">Phong cách giao diện màn hình thanh toán & POS</h3>
                <p className="sd-section-subheading">Tùy biến hiển thị như trang đăng nhập sang trọng hoặc kính tối ánh kim</p>
              </div>
            </div>

            {/* CHỌN PHONG CÁCH GIAO DIỆN */}
            <div className="sd-style-mode-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 20 }}>
              <div
                className={`sd-style-mode-card ${(currentScreen.bankInfo?.styleMode || 'login_luxury') === 'login_luxury' ? 'active' : ''}`}
                style={{
                  padding: '16px 18px',
                  borderRadius: 16,
                  border: (currentScreen.bankInfo?.styleMode || 'login_luxury') === 'login_luxury' ? '2px solid #EA580C' : '1.5px solid #E2E8F0',
                  background: (currentScreen.bankInfo?.styleMode || 'login_luxury') === 'login_luxury' ? '#FFF7ED' : '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: (currentScreen.bankInfo?.styleMode || 'login_luxury') === 'login_luxury' ? '0 4px 14px rgba(234, 88, 12, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => updateCurrentScreen(s => ({
                  ...s,
                  bankInfo: { ...(s.bankInfo || {}), styleMode: 'login_luxury' }
                }))}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>🌟</span>
                  <b style={{ fontSize: 14, color: '#C2410C' }}>Phong cách Đăng nhập (Sáng kem thanh lịch)</b>
                  {(currentScreen.bankInfo?.styleMode || 'login_luxury') === 'login_luxury' && (
                    <span style={{ background: '#EA580C', color: '#FFF', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, marginLeft: 'auto' }}>Đang chọn</span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                  Bố cục 2 thẻ bo tròn 26-28px, nền kem be ấm áp sang trọng, lưới 6 tính năng pastel y hệt ảnh mockup trang Đăng nhập.
                </p>
              </div>

              <div
                className={`sd-style-mode-card ${currentScreen.bankInfo?.styleMode === 'dark_gold' ? 'active' : ''}`}
                style={{
                  padding: '16px 18px',
                  borderRadius: 16,
                  border: currentScreen.bankInfo?.styleMode === 'dark_gold' ? '2px solid #D97706' : '1.5px solid #E2E8F0',
                  background: currentScreen.bankInfo?.styleMode === 'dark_gold' ? '#1E1B18' : '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: currentScreen.bankInfo?.styleMode === 'dark_gold' ? '0 4px 14px rgba(217, 119, 6, 0.25)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => updateCurrentScreen(s => ({
                  ...s,
                  bankInfo: { ...(s.bankInfo || {}), styleMode: 'dark_gold' }
                }))}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>🌙</span>
                  <b style={{ fontSize: 14, color: currentScreen.bankInfo?.styleMode === 'dark_gold' ? '#FBBF24' : '#0F172A' }}>Phong cách Kính tối Ánh kim (Dark Gold Glass)</b>
                  {currentScreen.bankInfo?.styleMode === 'dark_gold' && (
                    <span style={{ background: '#D97706', color: '#FFF', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, marginLeft: 'auto' }}>Đang chọn</span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: currentScreen.bankInfo?.styleMode === 'dark_gold' ? '#94A3B8' : '#64748B', lineHeight: 1.4 }}>
                  Nền tối kính mờ huyền bí, đèn neon laser vàng kim dạ quang phát sáng chuẩn TV hiện đại.
                </p>
              </div>
            </div>

            {/* THÔNG TIN TÀI KHOẢN NGÂN HÀNG */}
            <div className="sd-section-header-row" style={{ marginTop: 16 }}>
              <h4 className="sd-section-title" style={{ fontSize: 14 }}>Thông tin tài khoản thụ hưởng VietQR Napas 24/7</h4>
            </div>
            <div className="sd-form-row four-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div className="sd-field-group">
                <label className="sd-field-label">Ngân hàng</label>
                <select className="sd-input" value={currentScreen.bankInfo?.accountId || ''} onChange={e=>{const account=bankAccounts.find(row=>row.ID===e.target.value);updateCurrentScreen(screen=>({...screen,bankInfo:{...(screen.bankInfo||{}),accountId:account?.ID||'',bankName:account?.TENNGANHANG||'',accountNo:account?.SOTAIKHOAN||'',accountName:account?.NAME||'',bankBin:account?.BIN||''}}));}}><option value="">Chọn tài khoản ngân hàng</option>{bankAccounts.map(account=><option key={account.ID} value={account.ID}>{account.TENNGANHANG} — {account.SOTAIKHOAN} — {account.NAME}</option>)}</select>
              </div>
              <div className="sd-field-group">
                <label className="sd-field-label">Số tài khoản</label>
                <input className="sd-input" readOnly value={currentScreen.bankInfo?.accountNo || ''} placeholder="Lấy từ tài khoản ngân hàng đã chọn"/>
              </div>
              <div className="sd-field-group">
                <label className="sd-field-label">Tên chủ tài khoản</label>
                <input className="sd-input" readOnly value={currentScreen.bankInfo?.accountName || ''} placeholder="Lấy từ tài khoản ngân hàng đã chọn"/>
              </div>
              <div className="sd-field-group">
                <label className="sd-field-label">Tiền tố ghi chú QR</label>
                <input
                  type="text"
                  className="sd-input"
                  value={currentScreen.bankInfo?.qrMemoPrefix || 'GARA'}
                  onChange={e => updateCurrentScreen(s => ({
                    ...s,
                    bankInfo: { ...(s.bankInfo || {}), qrMemoPrefix: e.target.value }
                  }))}
                  placeholder="GARA"
                />
              </div>
            </div>

            {/* NỘI DUNG THẺ TRÁI (GIỚI THIỆU GARA NHƯ TRANG LOGIN) */}
            <div className="sd-section-header-row" style={{ marginTop: 20 }}>
              <h4 className="sd-section-title" style={{ fontSize: 14 }}>Nội dung giới thiệu thương hiệu (Thẻ bên trái)</h4>
            </div>
            <div className="sd-form-row two-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div className="sd-field-group">
                <label className="sd-field-label">Tiêu đề chính thẻ trái</label>
                <input
                  type="text"
                  className="sd-input"
                  value={currentScreen.bankInfo?.bannerTitle || 'Quản lý gara ô tô chuyên nghiệp'}
                  onChange={e => updateCurrentScreen(s => ({
                    ...s,
                    bankInfo: { ...(s.bankInfo || {}), bannerTitle: e.target.value }
                  }))}
                  placeholder="Quản lý gara ô tô chuyên nghiệp"
                />
              </div>
              <div className="sd-field-group">
                <label className="sd-field-label">Phụ đề slogan</label>
                <input
                  type="text"
                  className="sd-input"
                  value={currentScreen.bankInfo?.bannerSubtitle || 'Một phần mềm — Vận hành trọn vẹn xưởng dịch vụ'}
                  onChange={e => updateCurrentScreen(s => ({
                    ...s,
                    bankInfo: { ...(s.bankInfo || {}), bannerSubtitle: e.target.value }
                  }))}
                  placeholder="Một phần mềm — Vận hành trọn vẹn xưởng dịch vụ"
                />
              </div>
            </div>
            <div className="sd-form-row two-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 10 }}>
              <div className="sd-field-group">
                <label className="sd-field-label">Slogan thư pháp cuối thẻ</label>
                <input
                  type="text"
                  className="sd-input"
                  value={currentScreen.bankInfo?.footerSloganMain || 'Giải pháp quản lý toàn diện'}
                  onChange={e => updateCurrentScreen(s => ({
                    ...s,
                    bankInfo: { ...(s.bankInfo || {}), footerSloganMain: e.target.value }
                  }))}
                  placeholder="Giải pháp quản lý toàn diện"
                />
              </div>
              <div className="sd-field-group">
                <label className="sd-field-label">Slogan in hoa chân thẻ</label>
                <input
                  type="text"
                  className="sd-input"
                  value={currentScreen.bankInfo?.footerSloganSub || 'HIỆU QUẢ HƠN • ĐƠN GIẢN HƠN • PHÁT TRIỂN BỀN VỮNG'}
                  onChange={e => updateCurrentScreen(s => ({
                    ...s,
                    bankInfo: { ...(s.bankInfo || {}), footerSloganSub: e.target.value }
                  }))}
                  placeholder="HIỆU QUẢ HƠN • ĐƠN GIẢN HƠN • PHÁT TRIỂN BỀN VỮNG"
                />
              </div>
            </div>

            {/* THÔNG TIN LIÊN HỆ & BẢN QUYỀN (CHÂN THẺ PHẢI) */}
            <div className="sd-form-row two-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 10 }}>
              <div className="sd-field-group">
                <label className="sd-field-label">Hotline hỗ trợ khách hàng</label>
                <input
                  type="text"
                  className="sd-input"
                  value={currentScreen.bankInfo?.hotline || ''}
                  onChange={e => updateCurrentScreen(s => ({
                    ...s,
                    bankInfo: { ...(s.bankInfo || {}), hotline: e.target.value }
                  }))}
                  placeholder="0917 66 4444 - 0967 04 1111"
                />
              </div>
              <div className="sd-field-group">
                <label className="sd-field-label">Website</label>
                <input
                  type="text"
                  className="sd-input"
                  value={currentScreen.bankInfo?.website || ''}
                  onChange={e => updateCurrentScreen(s => ({
                    ...s,
                    bankInfo: { ...(s.bankInfo || {}), website: e.target.value }
                  }))}
                  placeholder="kazukovietnam.com"
                />
              </div>
            </div>

            <div className="sd-payment-config-box" style={{ marginTop: 16 }}>
              <p>Màn hình TV này được tối ưu để đặt tại <strong>Quầy Thu Ngân / POS</strong>.</p>
              <ul>
                <li>Tự động nhận đơn hàng thanh toán từ quầy lễ tân theo thời gian thực (Realtime).</li>
                <li>Hiển thị bảng kê chi tiết phụ tùng, tiền công, chiết khấu và tổng thanh toán rõ ràng bằng chữ.</li>
                <li>Tự động tạo mã <strong>VietQR Napas 24/7</strong> đúng số tiền để khách quét chuyển khoản tức thì.</li>
                <li>Khi chưa có đơn: Tự động chuyển sang giao diện 2 thẻ sáng kem sang trọng chuẩn phong cách Đăng nhập.</li>
              </ul>
            </div>
          </div>
        ) : currentScreen.type === 'repair_flow' ? (
          /* CẤU HÌNH TIẾN ĐỘ SỬA XE */
          <div className="sd-section-block">
            <div className="sd-section-header-row">
              <h3 className="sd-section-title">Cấu hình tiến độ xe sửa chữa tại xưởng & Phòng chờ VIP</h3>
              <span className="sd-section-note">Tự động đồng bộ với quy trình tiếp nhận & sửa chữa</span>
            </div>
            <div className="sd-form-row three-cols">
              <div className="sd-field-group">
                <label className="sd-field-label">Thời gian chuyển xe (giây)</label>
                <input
                  type="number"
                  min="3"
                  max="120"
                  className="sd-input number"
                  value={currentPage.repairSpeed || 8}
                  onChange={e => updateCurrentPage(p => ({ ...p, repairSpeed: Math.max(3, Number(e.target.value)) }))}
                />
              </div>
              <div className="sd-field-group">
                <label className="sd-field-label">Tên Wifi Phòng Chờ VIP</label>
                <input
                  type="text"
                  className="sd-input"
                  value={currentScreen.loungeInfo?.wifiSsid || ''}
                  onChange={e => updateCurrentScreen(s => ({
                    ...s,
                    loungeInfo: { ...(s.loungeInfo || {}), wifiSsid: e.target.value }
                  }))}
                  placeholder="KAZUKO AUTO VIP"
                />
              </div>
              <div className="sd-field-group">
                <label className="sd-field-label">Mật khẩu Wifi</label>
                <input
                  type="text"
                  className="sd-input"
                  value={currentScreen.loungeInfo?.wifiPass || ''}
                  onChange={e => updateCurrentScreen(s => ({
                    ...s,
                    loungeInfo: { ...(s.loungeInfo || {}), wifiPass: e.target.value }
                  }))}
                  placeholder="kazuko2026"
                />
              </div>
            </div>
          </div>
        ) : (
          /* CẤU HÌNH BẢNG GIÁ & BANNER */
          <>
            {/* BANNER QUẢNG BÁ */}
            <div className="sd-section-block">
              <div className="sd-section-header-row">
                <h3 className="sd-section-title">Banner quảng bá ({(currentPage.banners || []).length})</h3>
                <div className="sd-banner-speed-group">
                  <span>Đổi banner sau</span>
                  <input
                    type="number"
                    min="4"
                    max="120"
                    className="sd-input mini-number"
                    value={currentPage.bannerInterval || 15}
                    onChange={e => updateCurrentPage(p => ({ ...p, bannerInterval: Math.max(4, Number(e.target.value)) }))}
                  />
                  <span>giây</span>
                </div>
              </div>

              <label className="sd-add-banner-dropzone">
                <ImageIcon size={22} color="#EA580C" />
                <span>Chọn ảnh từ máy (Tải ảnh banner)</span>
                <input type="file" accept="image/*" onChange={handleAddCustomBanner} style={{ display: 'none' }} />
              </label>

              <div className="sd-banners-list">
                {(currentPage.banners || []).map((bnr, idx) => (
                  <div key={bnr.id || idx} className="sd-banner-item-row">
                    <img src={bnr.url} alt="" className="sd-banner-thumb" />
                    <div className="sd-banner-fields">
                      <input
                        type="text"
                        className="sd-banner-title-input"
                        value={bnr.title || ''}
                        onChange={e => handleUpdateBanner(idx, 'title', e.target.value)}
                        placeholder="Tiêu đề banner"
                      />
                      <input
                        type="text"
                        className="sd-banner-sub-input"
                        value={bnr.subtitle || ''}
                        onChange={e => handleUpdateBanner(idx, 'subtitle', e.target.value)}
                        placeholder="Phụ đề slogan"
                      />
                    </div>
                    <div className="sd-banner-actions">
                      <button
                        type="button"
                        className="sd-btn-move"
                        disabled={idx === 0}
                        onClick={() => handleMoveBanner(idx, -1)}
                        title={idx === 0 ? "Banner đã ở vị trí đầu tiên" : "Đổi thứ tự: Di chuyển banner lên trên"}
                      >
                        <ArrowUp size={14} />
                        <span>Lên</span>
                      </button>
                      <button
                        type="button"
                        className="sd-btn-move"
                        disabled={idx >= (currentPage.banners || []).length - 1}
                        onClick={() => handleMoveBanner(idx, 1)}
                        title={idx >= (currentPage.banners || []).length - 1 ? "Banner đã ở vị trí cuối cùng" : "Đổi thứ tự: Di chuyển banner xuống dưới"}
                      >
                        <ArrowDown size={14} />
                        <span>Xuống</span>
                      </button>
                      <button
                        type="button"
                        className="sd-btn-trash"
                        onClick={() => handleDeleteBanner(idx)}
                        title="Xóa banner này khỏi danh sách"
                      >
                        <Trash2 size={14} />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DỊCH VỤ CỦA TRANG */}
            <div className="sd-section-block">
              <div className="sd-section-header-row">
                <div>
                  <h3 className="sd-section-title">Dịch vụ của {currentPage.name || `Trang ${activePageIndex + 1}`}</h3>
                  <p className="sd-section-subheading">Chọn ở trang mới sẽ tự chuyển dịch vụ khỏi trang cũ.</p>
                </div>
                <button
                  type="button"
                  className="sd-btn-text-action"
                  onClick={() => updateCurrentPage(p => ({ ...p, selectedServiceIds: [] }))}
                >
                  Bỏ chọn trang này
                </button>
              </div>

              <div className="sd-services-checkbox-grid">
                {services.map(srv => {
                  const isChecked = (currentPage.selectedServiceIds || []).includes(srv.id);
                  const otherPageIdx = pages.findIndex((p, idx) => idx !== activePageIndex && (p.selectedServiceIds || []).includes(srv.id));
                  return (
                    <div
                      key={srv.id}
                      className={`sd-service-check-item ${isChecked ? 'checked' : ''}`}
                      onClick={() => toggleService(srv.id)}
                    >
                      <span className="sd-checkbox-icon">
                        {isChecked ? <CheckSquare size={18} color="#EA580C" /> : <Square size={18} color="#94A3B8" />}
                      </span>
                      <div className="sd-service-check-meta">
                        <span className="sd-service-check-name">{srv.name}</span>
                        <span className="sd-service-check-sub">
                          {srv.group} · {formatMoney(srv.price)}
                          {otherPageIdx !== -1 && <em className="sd-assigned-tag"> · đang ở trang {otherPageIdx + 1}</em>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* BOTTOM ACTION BUTTONS */}
        <div className="sd-bottom-actions-bar">
          <div className="sd-save-status-msg">
            {saveStatus && <span className="sd-status-success">{saveStatus}</span>}
            {isDirty && !saveStatus && <span className="sd-status-dirty">Có thay đổi chưa lưu</span>}
          </div>

          <div className="sd-action-buttons-group">
            <button type="button" className="sd-btn-draft" disabled={savingConfig} onClick={handleSaveDraft}>
              {savingConfig ? 'Đang lưu…' : 'Lưu cấu hình'}
            </button>
            <button type="button" className="sd-btn-broadcast" disabled={savingConfig} onClick={handleOpenDisplay}>
              <Radio size={18} className="sd-radio-wave" />
              <span>Phát lên màn hình TV {activeScreenId}</span>
            </button>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
