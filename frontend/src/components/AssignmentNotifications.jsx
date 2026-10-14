import {useEffect,useRef,useState,useCallback} from 'react';
import {Bell,X} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import api from '../api';
import './AssignmentNotifications.css';
export function useAssignmentNotifications(){
  const [data,setData]=useState({items:[],unread:0}),[error,setError]=useState('');
  const active=useRef(false),inFlight=useRef(false);
  const refresh=useCallback(async()=>{if(inFlight.current)return;inFlight.current=true;try{const response=await api.get('/notifications');if(active.current){setData(response.data.data);setError('');}}catch(e){if(active.current)setError(e.response?.data?.error||'Chưa tải được thông báo.');}finally{inFlight.current=false;}},[]);
  useEffect(()=>{active.current=true;refresh();const timer=setInterval(()=>{if(!document.hidden)refresh();},15000);window.addEventListener('focus',refresh);return()=>{active.current=false;clearInterval(timer);window.removeEventListener('focus',refresh);};},[refresh]);
  const mark=async ids=>{if(!ids.length)return true;try{await api.post('/notifications/read',{ids});await refresh();return true;}catch(e){setError(e.response?.data?.error||'Chưa đánh dấu đã đọc.');return false;}};
  return {data,error,refresh,mark};
}
export default function AssignmentNotifications({notifications}){
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),wrapper=useRef(null),nav=useNavigate();
  const {data,error,refresh,mark}=notifications;
  useEffect(()=>{if(!open)return;const close=e=>{if(!wrapper.current?.contains(e.target))setOpen(false);};const escape=e=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};},[open]);
  async function read(item){setBusy(true);try{const ok=item.read||await mark([item.id]);if(ok&&item.url){setOpen(false);nav(item.url);}}finally{setBusy(false);}}
  return <div className="assignment-notifications" ref={wrapper}>
    <button type="button" className="assignment-bell" aria-label={`Thông báo công việc${data.unread?', '+data.unread+' chưa đọc':''}`} aria-expanded={open} onClick={()=>{setOpen(value=>!value);refresh();}}><Bell size={20}/>{data.unread>0&&<span>{data.unread>99?'99+':data.unread}</span>}</button>
    {open&&<section className="assignment-inbox" aria-label="Thông báo công việc"><div className="assignment-inbox-heading"><strong>Thông báo công việc</strong><button type="button" aria-label="Đóng thông báo" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      {error&&<p role="alert">{error} <button type="button" onClick={refresh}>Thử lại</button></p>}
      {data.unread>0&&<button type="button" className="assignment-read-all" disabled={busy} onClick={async()=>{setBusy(true);try{await mark(data.items.filter(item=>!item.read).map(item=>item.id));}finally{setBusy(false);}}}>Đánh dấu tất cả đã đọc</button>}
      {!data.items.length&&!error&&<p>Chưa có thông báo phân công.</p>}
      <div className="assignment-inbox-list">{data.items.map(item=><button type="button" key={item.id} disabled={busy} className={'assignment-message '+(!item.read?'unread':'')} onClick={()=>read(item)}><strong>{item.title}</strong><span>{item.message}</span><small>{item.created?new Date(item.created).toLocaleString('vi-VN'):''}{!item.url?' · Chưa có quyền mở lệnh sửa chữa':''}</small></button>)}</div>
    </section>}
  </div>;
}
