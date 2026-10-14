import { useEffect, useRef, useState } from 'react';
import { UserRound, KeyRound, ShieldCheck, Store, Eye, EyeOff, X, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import './AccountDialog.css';

export default function AccountDialog({ mode, user, onClose, onChangePassword }) {
  const dialog = useRef(null);
  const firstInput = useRef(null);
  const navigate = useNavigate();
  const [values, setValues] = useState({ oldPass: '', newPass: '', confirm: '' });
  const [visible, setVisible] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const passwordMode = mode === 'password';
  const name = user.TEN_HIEN_THI || user.USERNAME;
  const role = user.ROLE || (Number(user.ISADMIN) === 1 ? 'Admin' : 'Chưa gán chức vụ');
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    firstInput.current?.focus();
    return () => element.close();
  }, []);

  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (values.newPass.length < 6) return setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
    if (values.newPass !== values.confirm) return setError('Mật khẩu nhập lại chưa khớp.');
    if (values.oldPass === values.newPass) return setError('Mật khẩu mới phải khác mật khẩu hiện tại.');
    setBusy(true);
    try {
      await api.post('/auth/change-password', { oldPass: values.oldPass, newPass: values.newPass });
      localStorage.removeItem('garage_token');
      localStorage.removeItem('garage_user');
      navigate('/login', { replace: true, state: { passwordChanged: true, username: user.USERNAME } });
    } catch (exception) {
      setError(exception.response?.data?.error || 'Chưa đổi được mật khẩu. Vui lòng thử lại.');
      setBusy(false);
    }
  };

  return <dialog className="account-dialog" ref={dialog} aria-labelledby="account-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="account-dialog-header">
      <span className="account-dialog-icon">{passwordMode ? <KeyRound size={23} /> : <UserRound size={23} />}</span>
      <div><h2 id="account-dialog-title">{passwordMode ? 'Đổi mật khẩu' : 'Hồ sơ cá nhân'}</h2><p>{passwordMode ? 'Cập nhật mật khẩu đăng nhập của bạn' : 'Thông tin tài khoản đang đăng nhập'}</p></div>
      <button type="button" className="account-icon-button" aria-label="Đóng" disabled={busy} onClick={onClose}><X size={21} /></button>
    </header>
    {passwordMode ? <form onSubmit={submit}>
      <div className="account-dialog-body">
        <div className="account-identity compact"><div className="account-avatar">{name?.trim().slice(0, 1).toUpperCase() || 'K'}</div><div><strong>{name}</strong><span>{user.USERNAME}</span></div></div>
        {[
          ['oldPass', 'Mật khẩu hiện tại', 'current-password'],
          ['newPass', 'Mật khẩu mới', 'new-password'],
          ['confirm', 'Nhập lại mật khẩu mới', 'new-password'],
        ].map(([key, label, autocomplete], index) => <label className="account-password-field" key={key} htmlFor={`account-${key}`}>
          <span>{label} <b aria-hidden="true">*</b></span>
          <div className="account-password-input"><LockKeyhole size={17} aria-hidden="true" />
            <input ref={index === 0 ? firstInput : undefined} id={`account-${key}`} type={visible[key] ? 'text' : 'password'} value={values[key]} autoComplete={autocomplete} required maxLength={256} disabled={busy} placeholder={key === 'newPass' ? 'Ít nhất 6 ký tự' : label} onChange={event => { setValues(previous => ({ ...previous, [key]: event.target.value })); setError(''); }} />
            <button type="button" className="account-icon-button" disabled={busy} aria-label={`${visible[key] ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`} aria-pressed={!!visible[key]} onClick={() => setVisible(previous => ({ ...previous, [key]: !previous[key] }))}>{visible[key] ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </label>)}
        <p className="account-help"><ShieldCheck size={18} /> Sau khi đổi mật khẩu, hãy đăng nhập lại bằng mật khẩu mới.</p>
        {error && <div className="account-error" role="alert">{error}</div>}
      </div>
      <footer className="account-dialog-footer"><button type="button" className="account-button secondary" disabled={busy} onClick={onClose}>Hủy bỏ</button><button type="submit" className="account-button primary" disabled={busy}><KeyRound size={17} />{busy ? 'Đang cập nhật…' : 'Đổi mật khẩu'}</button></footer>
    </form> : <>
      <div className="account-dialog-body">
        <div className="account-identity"><div className="account-avatar">{name?.trim().slice(0, 1).toUpperCase() || 'K'}</div><div><h3>{name}</h3><span className="account-role"><ShieldCheck size={14} />{role}</span></div></div>
        <section className="account-section"><h4><UserRound size={17} /> Thông tin tài khoản</h4><dl><div><dt>Tên hiển thị</dt><dd>{name || '—'}</dd></div><div><dt>Tên đăng nhập</dt><dd>{user.USERNAME || '—'}</dd></div><div><dt>Vai trò</dt><dd>{role}</dd></div></dl></section>
        {user.TENANT && <section className="account-section"><h4><Store size={17} /> Cửa hàng</h4><dl><div><dt>Tên cửa hàng</dt><dd>{user.TENANT.name || '—'}</dd></div><div><dt>Mã cửa hàng</dt><dd>{user.TENANT.code || '—'}</dd></div></dl></section>}
      </div>
      <footer className="account-dialog-footer"><button type="button" className="account-button secondary" onClick={onClose}>Đóng</button><button type="button" className="account-button primary" onClick={onChangePassword}><KeyRound size={17} />Đổi mật khẩu</button></footer>
    </>}
  </dialog>;
}
