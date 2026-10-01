
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import { API_BASE } from '../../Api/apiFetch';
import { useAuth } from '../../context/useAuth';
import { homeFor } from '../../config/roles';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  /*
   * Already signed in? Go straight to the right dashboard
   * (or back to the page that sent them here).
   */
  useEffect(() => {
    if (!user) return;
    const home = homeFor(user.role);
    if (home) {
      navigate(location.state?.from || home, { replace: true });
    }
  }, [user, navigate, location.state]);

  function clearMessages() {
    setError('');
    setSuccess('');
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function handleLogin(event) {
    event.preventDefault();

    clearMessages();

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      /*
       * credentials: 'include' lets the backend set the httpOnly refresh
       * cookie. `remember` decides whether that cookie outlives the browser
       * session (persistent Max-Age) or not (session cookie).
       */
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          remember,
        }),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      /*
       * Handle unsuccessful responses.
       */
      if (!response.ok) {
        switch (response.status) {
          case 400:
            setError(
              data.message ||
              'Invalid login request. Please check your details.'
            );
            break;

          case 401:
            setError(
              data.message ||
              'Invalid email or password. Please try again.'
            );
            break;

          case 403:
            setError(
              data.message ||
              'Your account has been suspended or you do not have access.'
            );
            break;

          case 404:
            setError(
              data.message ||
              'No account found with this email address.'
            );
            break;

          case 429:
            setError(
              'Too many login attempts. Please wait a few minutes and try again.'
            );
            break;

          case 500:
          case 502:
          case 503:
            setError(
              'Server error. Please try again shortly.'
            );
            break;

          default:
            setError(
              data.message ||
              `Login failed (${response.status}). Please try again.`
            );
        }

        return;
      }

      /*
       * Make sure the backend returned an access token.
       */
      if (!data.accessToken) {
        setError(
          'Login failed. No access token received from the server.'
        );

        console.error('Missing access token:', data);

        return;
      }

      /*
       * Create the local user session.
       */
      const session = {
        loggedIn: true,
        token: data.accessToken, // kept in memory only — AuthContext never stores it
        role: data.role,
        name: data.name || trimmedEmail,
        email: data.email || trimmedEmail,
        id: data.id || null,
      };

      /*
       * Only accept roles we have a dashboard for.
       */
      if (!homeFor(data.role)) {
        setError(
          `Unknown role "${data.role}". Contact your administrator.`
        );

        console.error(
          'No redirect configured for role:',
          data.role
        );

        return;
      }

      /*
       * Save the session (Remember me -> localStorage, otherwise
       * sessionStorage). The effect above then redirects.
       */
      login(session, remember);
    } catch (err) {
      console.error('Login error:', err);

      if (
        err instanceof TypeError &&
        err.message.toLowerCase().includes('fetch')
      ) {
        setError(
          'Cannot connect to server. Check your internet connection or try again in a moment.'
        );
      } else {
        setError(
          'An unexpected error occurred. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();

    clearMessages();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError(
        'Enter your email address first, then click Forgot password.'
      );
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
        }),
      });

      /*
       * Keep the response generic so we don't reveal
       * whether an email exists in the system.
       */
      setSuccess(
        'If that email is registered, a reset link has been sent.'
      );
    } catch (err) {
      console.error('Forgot password error:', err);

      /*
       * Intentionally show the same message even
       * when the request fails.
       */
      setSuccess(
        'If that email is registered, a reset link has been sent.'
      );
    }
  }

  return (
    <main className={styles.loginPage}>

      {/* LEFT PANEL */}
      <section className={styles.leftPanel}>

        <Link
          to="/"
          className={styles.brand}
        >
          <div className={styles.brandLogo}>
            DH
          </div>

          <div className={styles.brandText}>
            <strong>DiGi Health</strong>

            <span>
              Healthcare at home — done right.
            </span>
          </div>
        </Link>

        <div className={styles.leftContent}>

          <h1>
            Professional home healthcare,
            managed in one place.
          </h1>

          <p>
            Patients, caregivers, and admin staff
            all have a dedicated workspace to
            manage care, track progress, and stay
            connected.
          </p>

          <div className={styles.featureList}>

            <div className={styles.featureItem}>

              <div className={styles.featureDot}>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <polyline
                    points="20 6 9 17 4 12"
                  />
                </svg>
              </div>

              <div>
                <h4>
                  Patients & Families
                </h4>

                <p>
                  Track bookings, view care
                  summaries, and manage your
                  care plan.
                </p>
              </div>

            </div>

            <div className={styles.featureItem}>

              <div className={styles.featureDot}>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <polyline
                    points="20 6 9 17 4 12"
                  />
                </svg>
              </div>

              <div>
                <h4>
                  Service providers
                </h4>

                <p>
                  View assigned patients,
                  update schedules, and manage
                  your profile.
                </p>
              </div>

            </div>

            <div className={styles.featureItem}>

              <div className={styles.featureDot}>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <polyline
                    points="20 6 9 17 4 12"
                  />
                </svg>
              </div>

              <div>
                <h4>
                  Admin Staff
                </h4>

                <p>
                  Manage all care requests,
                  assign caregivers, and track
                  operations.
                </p>
              </div>

            </div>

          </div>
        </div>

        <div className={styles.leftFooter}>
          © 2026 DiGi Health. All rights reserved.
        </div>

      </section>

      {/* RIGHT PANEL */}
      <section className={styles.rightPanel}>

        <div className={styles.loginBox}>

          <h2>
            Welcome back
          </h2>

          <p className={styles.subtitle}>
            Login to your account
          </p>

          {/* ERROR */}
          {error && (
            <div className={styles.errorMsg}>

              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />

                <line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="12"
                />

                <line
                  x1="12"
                  y1="16"
                  x2="12.01"
                  y2="16"
                />
              </svg>

              <span>
                {error}
              </span>

            </div>
          )}

          {/* SUCCESS */}
          {success && (
            <div className={styles.successMsg}>
              {success}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className={styles.loginForm}
          >

            {/* EMAIL */}
            <div className={styles.formGroup}>

              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearMessages();
                }}
                placeholder="you@email.com"
                autoComplete="email"
                disabled={loading}
              />

            </div>

            {/* PASSWORD */}
            <div className={styles.formGroup}>

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearMessages();
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
              />

            </div>

            {/* OPTIONS */}
            <div className={styles.formOptions}>

              <label className={styles.rememberMe}>

                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) =>
                    setRemember(event.target.checked)
                  }
                  disabled={loading}
                />

                <span>
                  Remember me
                </span>

              </label>

              <button
                type="button"
                className={styles.forgotLink}
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Forgot password?
              </button>

            </div>

            {/* LOGIN */}
            <button
              type="submit"
              className={styles.btnLogin}
              disabled={loading}
            >
              {loading
                ? 'Signing in…'
                : 'Sign In'}
            </button>

          </form>

          {/* DEMO ACCOUNTS */}
          <div className={styles.divider}>

            <div className={styles.dividerLine} />

            <span>
              New to DiGi Health?
            </span>

            <div className={styles.dividerLine} />

          </div>

          {/* REGISTER LINKS */}
          <p className={styles.registerLink}>

            New patient?{' '}

            <Link to="/contact">
              Book care instead
            </Link>

            <span className={styles.separator}>
              ·
            </span>

            Service provider?{' '}

            <Link to="/apply">
              Apply here
            </Link>

          </p>

        </div>

      </section>

    </main>
  );
}

