// eslint-disable-next-line react-refresh/only-export-components
import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

function decodeJwtPayload(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(json);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('panacea_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const loginWithGoogle = useCallback(async (credential) => {
    const payload = decodeJwtPayload(credential);
    const email = payload.email?.toLowerCase();
    if (!ALLOWED_EMAILS.includes(email)) {
      throw new Error('no_autorizado');
    }
    const u = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
    setUser(u);
    localStorage.setItem('panacea_user', JSON.stringify(u));
    return u;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('panacea_user');
    window.google?.accounts.id.disableAutoSelect();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading: false,
      loginWithGoogle,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
