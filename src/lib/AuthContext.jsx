import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/api/base44Client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'it_fund_access_token';
const USER_KEY = 'it_fund_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (token) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  };

  const hydrateFromStorage = () => {
    const token = getToken();
    const stored = localStorage.getItem(USER_KEY);
    if (token && stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setIsAuthenticated(true);
      } catch {
        setUser(null);
        setIsAuthenticated(false);
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setIsLoadingAuth(false);
    setAuthChecked(true);
  };

  const loadUser = async () => {
    const token = getToken();
    if (!token) {
      hydrateFromStorage();
      return;
    }

    try {
      setIsLoadingAuth(true);
      const currentUser = await api.get('/auth/me', token);
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      setAuthError({
        type: 'auth_required',
        message: error.message || 'Authentication required'
      });
      setToken(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    if (data?.access_token) {
      setToken(data.access_token);
      await loadUser();
    }
  };

  const register = async (email, password) => {
    const data = await api.post('/auth/register', { email, password });
    if (data?.access_token) {
      setToken(data.access_token);
      await loadUser();
    }
  };

  const verifyOtp = async (email, otpCode) => {
    const data = await api.post('/auth/verify-otp', { email, otpCode });
    if (data?.access_token) {
      setToken(data.access_token);
      await loadUser();
    }
    return data;
  };

  const resendOtp = async (email) => {
    await api.post('/auth/resend-otp', { email });
  };

  const loginWithProvider = (provider, redirectTo = '/') => {
    const params = new URLSearchParams({ provider, redirectTo });
    window.location.href = `/auth/${provider}?${params.toString()}`;
  };

  const logout = (shouldRedirect = true) => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(USER_KEY);
    if (shouldRedirect) window.location.href = '/';
  };

  const requestPasswordReset = async (email) => {
    await api.post('/auth/forgot-password', { email });
  };

  const resetPassword = async ({ resetToken, newPassword }) => {
    await api.post('/auth/reset-password', { resetToken, newPassword });
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        authError,
        authChecked,
        login,
        register,
        verifyOtp,
        resendOtp,
        loginWithProvider,
        logout,
        navigateToLogin,
        requestPasswordReset,
        resetPassword,
        loadUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
