import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Employee } from '../types';
import { api, setToken, clearToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  demoLogin: (params: { role?: string; email?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  updateSelfProfile: (data: { phone?: string; address?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const res = await api.getMe();
      if (res.success) {
        setUser(res.user);
        setEmployee(res.employee);
      }
    } catch (err) {
      console.warn('Session expired or invalid, logging out:', err);
      clearToken();
      setUser(null);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('staffsync_token');
    if (token) {
      refreshMe();
    } else {
      // Start app with login page
      setLoading(false);
    }
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await api.login(credentials);
      if (res.token) {
        setToken(res.token);
        setUser(res.user);
        setEmployee(res.employee);
      }
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (params: { role?: string; email?: string }) => {
    setLoading(true);
    try {
      const res = await api.demoLogin(params);
      if (res.token) {
        setToken(res.token);
        setUser(res.user);
        setEmployee(res.employee);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      // Ignore
    } finally {
      clearToken();
      setUser(null);
      setEmployee(null);
    }
  };

  const updateSelfProfile = async (data: { phone?: string; address?: string }) => {
    const res = await api.updateEmployeeMe(data);
    if (res.employee) {
      setEmployee(prev => prev ? { ...prev, ...res.employee } : res.employee);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        loading,
        login,
        demoLogin,
        logout,
        refreshMe,
        updateSelfProfile,
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
