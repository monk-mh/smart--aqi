import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

// ─── Helpers ──────────────────────────────────────────────────────
function loadStoredUser() {
  try {
    const raw = localStorage.getItem('smartaq_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem('smartaq_token'));
  const [loading, setLoading] = useState(() => {
    // Only show loading spinner if we have a token but no cached user
    // (i.e. first-ever login on a new device).  Otherwise skip it.
    const t = localStorage.getItem('smartaq_token');
    const u = localStorage.getItem('smartaq_user');
    return !!(t && !u);
  });

  // On mount, validate the stored token in the background
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Token expired');
      })
      .then((userData) => {
        setUser(userData);
        localStorage.setItem('smartaq_user', JSON.stringify(userData));
      })
      .catch(() => {
        // Token is invalid/expired — clear everything
        localStorage.removeItem('smartaq_token');
        localStorage.removeItem('smartaq_user');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // run once on mount, not on every token change

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }

    const data = await res.json();
    localStorage.setItem('smartaq_token', data.access_token);
    localStorage.setItem('smartaq_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password, role = 'Student') => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }

    const data = await res.json();
    localStorage.setItem('smartaq_token', data.access_token);
    localStorage.setItem('smartaq_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('smartaq_token');
    localStorage.removeItem('smartaq_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

