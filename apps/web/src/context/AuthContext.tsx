'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: string;
  honorBadge?: string | null;
  departmentOrUnit?: string | null;
  phone?: string | null;
  gender?: string | null;
  defaultShirtSize?: string | null;
  defaultShippingAddress?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  maxHeartRate?: number | null;
  stravaConnection?: any;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (googlePayload?: {
    email: string;
    fullName?: string;
    avatarUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    departmentOrUnit?: string;
    gender?: string;
    defaultShirtSize?: string;
  }) => Promise<{ success: boolean; error?: string; emailDelivery?: any }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserSession: (partialUser: Partial<AuthUser>) => void;
  verifyEmailToken: (token: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resendActivation: (email: string) => Promise<{ success: boolean; error?: string; message?: string; emailDelivery?: any }>;
  requestPasswordResetOtp: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPasswordWithOtp: (payload: { email: string; otp: string; newPassword: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveSession = (authToken: string, authUser: AuthUser) => {
    setToken(authToken);
    setUser(authUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('toprun_auth_token', authToken);
      localStorage.setItem('toprun_auth_user', JSON.stringify(authUser));
      document.cookie = `toprun_auth_token=${authToken}; path=/; max-age=604800; SameSite=Lax`;
    }
  };

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('toprun_auth_token');
      localStorage.removeItem('toprun_auth_user');
      document.cookie = 'toprun_auth_token=; path=/; max-age=0; SameSite=Lax';
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken =
      token || (typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null);

    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('toprun_auth_user', JSON.stringify(data.user));
        }
      } else {
        clearSession();
      }
    } catch {
      // In case server is offline temporarily, preserve cached user
      const cached = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_user') : null;
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          clearSession();
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, clearSession]);

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_user') : null;

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        clearSession();
      }
    }
    refreshUser();
  }, [refreshUser, clearSession]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Đăng nhập không thành công.' };
      }
      saveSession(data.accessToken, data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Không thể kết nối đến máy chủ xác thực.' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (googlePayload?: {
    email: string;
    fullName?: string;
    avatarUrl?: string;
  }) => {
    try {
      setIsLoading(true);
      // Mặc định cho chế độ Dev Demo nếu không truyền payload
      const payload = googlePayload || {
        email: 'thuan.nguyen@assaabloy.com',
        fullName: 'Nguyễn Hữu Thuận (Google Account)',
        avatarUrl:
          'https://dgalywyr863hv.cloudfront.net/pictures/athletes/126278000/57450920/1/large.jpg',
      };

      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Đăng nhập Google thất bại.' };
      }
      saveSession(data.accessToken, data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Không thể kết nối dịch vụ Google Auth.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    departmentOrUnit?: string;
    gender?: string;
    defaultShirtSize?: string;
  }) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Đăng ký tài khoản không thành công.' };
      }
      saveSession(data.accessToken, data.user);
      return { success: true, emailDelivery: data.emailDelivery };
    } catch (err: any) {
      return { success: false, error: err.message || 'Không thể kết nối máy chủ.' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserSession = (partialUser: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partialUser };
      if (typeof window !== 'undefined') {
        localStorage.setItem('toprun_auth_user', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const verifyEmailToken = async (verifyToken: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(verifyToken)}`);
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Xác thực kích hoạt tài khoản không thành công.' };
      }
      if (data.accessToken && data.user) {
        saveSession(data.accessToken, data.user);
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối máy chủ xác thực.' };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Mã OTP không chính xác hoặc đã hết hạn.' };
      }
      if (data.accessToken && data.user) {
        saveSession(data.accessToken, data.user);
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối máy chủ.' };
    } finally {
      setIsLoading(false);
    }
  };

  const resendActivation = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/resend-activation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Không thể gửi lại email xác thực.' };
      }
      return { success: true, message: data.message, emailDelivery: data.emailDelivery };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi mạng khi yêu cầu gửi lại mã.' };
    }
  };

  const requestPasswordResetOtp = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Không thể gửi mã xác thực.' };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối máy chủ.' };
    }
  };

  const resetPasswordWithOtp = async (payload: { email: string; otp: string; newPassword: string }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Không thể đặt lại mật khẩu.' };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối máy chủ.' };
    }
  };

  const logout = () => {
    clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshUser,
        updateUserSession,
        verifyEmailToken,
        verifyOtp,
        resendActivation,
        requestPasswordResetOtp,
        resetPasswordWithOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

