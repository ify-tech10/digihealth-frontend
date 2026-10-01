import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import styles from './Login.module.css';
import { API_BASE } from '../../Api/apiFetch';

/*
 * Landing page for the emailed links:
 *   /reset-password?token=…  — "Forgot password?" from the login page
 *   /set-password?token=…    — new accounts created by an admin / RM (invite)
 *
 * Both post to POST /auth/reset-password { token, password }.
 */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const token = params.get('token') || '';
  const invite = pathname.startsWith('/set-password');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return setError('Use at least one letter and one number.');
    if (password !== confirm) return setError('The two passwords don’t match.');
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        let data = {};
        try { data = await res.json(); } catch { /* not JSON */ }
        throw new Error(data.message || (res.status === 400 || res.status === 410
          ? 'This link has expired or was already used. Request a new one from the login page.'
          : `Something went wrong (${res.status}). Please try again.`));
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof TypeError ? 'Cannot reach the server. Check your connection and try again.' : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.leftPanel}>
        <Link to="/" className={styles.brand}>
          <div className={styles.brandLogo}>DH</div>
          <div className={styles.brandText}>
            <strong>DiGi Health</strong>
            <span>Healthcare at home — done right.</span>
          </div>
        </Link>
        <div className={styles.leftContent}>
          <h1>{invite ? 'Welcome to DiGi Health.' : 'Let’s get you back in.'}</h1>
          <p>{invite ? 'Your account is ready. Choose a password to finish setting it up.' : 'Choose a new password for your account. The link in your email can only be used once.'}</p>
        </div>
        <div className={styles.leftFooter}>© 2026 DiGi Health. All rights reserved.</div>
      </section>

      <section className={styles.rightPanel}>
        <div className={styles.loginBox}>
          <h2>{invite ? 'Set your password' : 'Choose a new password'}</h2>
          <p className={styles.subtitle}>{done ? 'All done.' : 'At least 8 characters, with a letter and a number.'}</p>

          {!token && !done && (
            <div className={styles.errorMsg}>
              <span>This link is incomplete. Open the link from your email again, or request a new one from the login page.</span>
            </div>
          )}
          {error && <div className={styles.errorMsg}><span>{error}</span></div>}

          {done ? (
            <>
              <div className={styles.successMsg}>Your password has been {invite ? 'set' : 'changed'}. You can now sign in.</div>
              <Link to="/login" className={styles.btnLogin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Go to sign in</Link>
            </>
          ) : (
            <form onSubmit={submit} className={styles.loginForm} noValidate>
              <div className={styles.formGroup}>
                <label htmlFor="newPassword">New password</label>
                <input id="newPassword" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} autoComplete="new-password" disabled={loading || !token} />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm password</label>
                <input id="confirmPassword" type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(''); }} autoComplete="new-password" disabled={loading || !token} />
              </div>
              <button type="submit" className={styles.btnLogin} disabled={loading || !token}>{loading ? 'Saving…' : invite ? 'Set password' : 'Change password'}</button>
            </form>
          )}

          {!done && <p className={styles.registerLink}><Link to="/login">Back to sign in</Link></p>}
        </div>
      </section>
    </main>
  );
}
