import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './useAuth';
import { SESSION_KEY, readSession, revokeSession, setAccessToken } from '../Api/apiFetch';

function clearStorage() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

/* Only who is signed in goes to storage — never tokens. */
function profileOf(session) {
  const profile = { ...session };
  delete profile.token;
  delete profile.refreshToken;
  return profile;
}

/*
 * Restore who was signed in so their portal renders straight away. Whether the
 * session is still valid is decided by the httpOnly refresh cookie: apiFetch
 * asks for a new access token on the first call and signs out if that fails.
 */
function loadInitialUser() {
  const session = readSession();
  if (!session?.loggedIn || !session.role) return null;
  /* sessions saved by older builds held tokens in storage — strip them */
  if ('token' in session || 'refreshToken' in session) {
    const store = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(profileOf(session)));
  }
  return profileOf(session);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadInitialUser);

  /* session = { token, role, name, email, id } from /auth/login */
  const login = useCallback((session, remember = false) => {
    clearStorage();
    setAccessToken(session.token);
    const profile = profileOf(session);
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(profile));
    setUser(profile);
  }, []);

  /* "Sign out": revoke the refresh cookie on the server, forget everything here. */
  const logout = useCallback(() => {
    revokeSession();
    clearStorage();
    setUser(null);
  }, []);

  /* apiFetch fires this when the refresh cookie is missing, expired or revoked */
  useEffect(() => {
    const expired = () => {
      clearStorage();
      setUser(null);
    };
    window.addEventListener('dh:unauthorized', expired);
    return () => window.removeEventListener('dh:unauthorized', expired);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
