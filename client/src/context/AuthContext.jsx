import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem('campusfix-token')) { setLoading(false); return; }
    api('/api/auth/me').then(data => setUser(data.user)).catch(() => localStorage.removeItem('campusfix-token')).finally(() => setLoading(false));
  }, []);
  const value = useMemo(() => ({
    user, loading,
    async signIn(email, password) { const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); localStorage.setItem('campusfix-token', data.token); setUser(data.user); },
    async register(name, email, password) { const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }); localStorage.setItem('campusfix-token', data.token); setUser(data.user); },
    signOut() { localStorage.removeItem('campusfix-token'); setUser(null); }
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
