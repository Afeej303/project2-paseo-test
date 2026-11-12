import { createContext, useCallback, useEffect, useMemo, useState, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    setProfile(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await api.get('/auth/me');
    setUser(response.data.data.user);
    setProfile(response.data.data.profile || null);
    return response.data.data;
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    refreshUser()
      .catch(clearSession)
      .finally(() => setLoading(false));
  }, [clearSession, refreshUser]);

  const login = useCallback((userData, token, profileData = null) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setProfile(profileData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      clearSession();
      return;
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    login,
    logout,
    refreshUser,
  }), [user, profile, loading, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;