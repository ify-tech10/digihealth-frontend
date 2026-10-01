import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { adminApi } from '../../Api/adminApi';
import { API_BASE } from '../../Api/apiFetch';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { humanize } from '../../utils/format';
import { Detail } from './components/Common';
import s from './admin.module.css';

const EMPTY = { current: '', next: '', confirm: '' };

export default function Settings() {
  usePageHeader('Settings', 'Your account and security');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }));

  async function changePassword(e) {
    e.preventDefault();
    const errs = {};
    if (!form.current) errs.current = 'Enter your current password';
    if (form.next.length < 8) errs.next = 'Use at least 8 characters';
    if (form.next && form.next === form.current) errs.next = 'New password must be different';
    if (form.confirm !== form.next) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      await adminApi.changePassword(form.current, form.next);
      setForm(EMPTY);
      showToast('success', 'Password changed.');
    } catch (err) {
      setErrors({ general: err.message });
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  const fieldErr = (f) => errors[f] && <span className={s.fieldError}>{errors[f]}</span>;

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Account</h3></div>
          <div className={s.cardBody}>
            <div className={s.details}>
              <Detail label="Name">{user?.name}</Detail>
              <Detail label="Email">{user?.email}</Detail>
              <Detail label="Role">{humanize(user?.role)}</Detail>
              <Detail label="Session">
                {localStorage.getItem('dh_user') ? 'Remembered on this device' : 'Ends when the browser closes'}
              </Detail>
              <Detail label="API server" full><span className={s.muted}>{API_BASE}</span></Detail>
            </div>
            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnLarge}`} onClick={signOut}>
                <Icon name="logout" /> Sign out
              </button>
            </div>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>Change password</h3></div>
          <form className={`${s.cardBody} ${s.form}`} onSubmit={changePassword} noValidate>
            {errors.general && <p className={s.fieldError} style={{ marginBottom: 12 }}>{errors.general}</p>}

            <div className={s.field}>
              <label htmlFor="pw-current">Current password</label>
              <input id="pw-current" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} />
              {fieldErr('current')}
            </div>
            <div className={s.field} style={{ marginTop: 14 }}>
              <label htmlFor="pw-new">New password</label>
              <input id="pw-new" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} />
              {fieldErr('next')}
            </div>
            <div className={s.field} style={{ marginTop: 14 }}>
              <label htmlFor="pw-confirm">Confirm new password</label>
              <input id="pw-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
              {fieldErr('confirm')}
            </div>

            <div className={s.modalActions}>
              <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>
                <Icon name="lock" /> {busy ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
