/*
 * One place for every authenticated API call.
 *
 * Token handling (nothing secret is ever written to browser storage):
 * - The REFRESH token lives in an httpOnly cookie set by the backend on
 *   /auth/login and /auth/refresh. JavaScript can't read it, so an injected
 *   script can't steal it; the browser sends it to /auth/* by itself.
 * - The short-lived ACCESS token is kept in memory only (this module). After
 *   a page reload it's gone, so the first call silently gets a new one from
 *   POST /auth/refresh.
 * - Storage only holds who is signed in (name, role, email, id) so the right
 *   portal can render straight away.
 * - Access token about to expire, missing, or rejected with a 401 → one
 *   refresh, then retry once. Only if the refresh fails is `dh:unauthorized`
 *   fired so AuthContext signs the user out.
 */
export const API_BASE =
  import.meta.env.VITE_API_BASE || 'https://digihealth-2795.onrender.com/api';

export const SESSION_KEY = 'dh_user';

/* Refresh this long before the access token actually expires. */
const REFRESH_EARLY_MS = 30 * 1000;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/* Who is signed in (no tokens). */
export function readSession() {
  try {
    const raw =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ── Access token: memory only ── */
let accessToken = null;
export function setAccessToken(token) {
  accessToken = token || null;
}

/* Expiry time (ms) from a JWT's `exp` claim, or null if it can't be read. */
export function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/*
 * Get a new access token using the refresh cookie. Concurrent callers share one
 * request, so a page that fires five calls at once refreshes only once.
 * Backend: read the httpOnly cookie, rotate it (Set-Cookie), return { accessToken }.
 */
let refreshing = null;
export function refreshSession() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        /* custom header forces a CORS preflight — a cheap CSRF guard */
        headers: { 'X-Requested-With': 'DiGiHealth' },
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      if (!data.accessToken) return null;
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/* Revoke the refresh cookie on the server (best effort — never blocks sign-out). */
export function revokeSession() {
  const token = accessToken;
  setAccessToken(null);
  fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: {
      'X-Requested-With': 'DiGiHealth',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }).catch(() => {});
}

function signedOut() {
  setAccessToken(null);
  window.dispatchEvent(new Event('dh:unauthorized'));
  return new ApiError('Your session has expired. Please sign in again.', 401);
}

export async function apiFetch(path, { method = 'GET', body, headers = {}, params } = {}) {
  /* No token yet (fresh page load) or about to expire → refresh first. */
  const exp = accessToken ? tokenExpiry(accessToken) : null;
  if (!accessToken || (exp && exp - Date.now() < REFRESH_EARLY_MS)) {
    const fresh = await refreshSession();
    if (!fresh && (!accessToken || (exp && exp <= Date.now()))) throw signedOut();
  }

  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  const isFormData = body instanceof FormData;

  const send = () =>
    fetch(url.toString(), {
      method,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });

  let res;
  try {
    res = await send();
    /* Token rejected — one refresh, then retry the same call once. */
    if (res.status === 401) {
      if (!(await refreshSession())) throw signedOut();
      res = await send();
      if (res.status === 401) throw signedOut();
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'Cannot reach the server. Check your connection and try again.',
      0
    );
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data;
}

/* Lists come back either as a plain array or a Spring Page ({ content: [] }). */
export function asList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return [];
}
