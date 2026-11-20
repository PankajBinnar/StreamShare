'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { User, Role } from '../types';
import { fetchApi, setAccessToken, getAccessToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (idToken: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    username: string,
    password: string,
    role?: Role
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth on page load (try refreshing short-lived token via HttpOnly cookie)
  useEffect(() => {
    async function initAuth() {
      try {
        const refreshRes = await fetchApi<{ accessToken: string }>('/auth/refresh', {
          method: 'POST',
          requiresAuth: false,
        });

        if (refreshRes.success && refreshRes.data) {
          setAccessToken(refreshRes.data.accessToken);
          setToken(refreshRes.data.accessToken);

          const meRes = await fetchApi<User>('/auth/me');
          if (meRes.success && meRes.data) {
            setUser(meRes.data);
          }
        }
      } catch (err) {
        // Unauthenticated session
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetchApi<{ accessToken: string; user: User }>('/auth/login', {
        method: 'POST',
        requiresAuth: false,
        body: JSON.stringify({ email, password }),
      });

      if (res.success && res.data) {
        setAccessToken(res.data.accessToken);
        setToken(res.data.accessToken);
        setUser(res.data.user);
        return { success: true };
      }

      return { success: false, error: res.error || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    setIsLoading(true);
    try {
      const res = await fetchApi<{ accessToken: string; user: User }>('/auth/google', {
        method: 'POST',
        requiresAuth: false,
        body: JSON.stringify({ idToken }),
      });

      if (res.success && res.data) {
        setAccessToken(res.data.accessToken);
        setToken(res.data.accessToken);
        setUser(res.data.user);
        return { success: true };
      }

      return { success: false, error: res.error || 'Google authentication failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, username: string, password: string, role?: Role) => {
    setIsLoading(true);
    try {
      const res = await fetchApi<{ accessToken: string; user: User }>('/auth/register', {
        method: 'POST',
        requiresAuth: false,
        body: JSON.stringify({ email, username, password, role }),
      });

      if (res.success && res.data) {
        setAccessToken(res.data.accessToken);
        setToken(res.data.accessToken);
        setUser(res.data.user);
        return { success: true };
      }

      return { success: false, error: res.error || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    if (!getAccessToken()) return;
    const meRes = await fetchApi<User>('/auth/me');
    if (meRes.success && meRes.data) {
      setUser(meRes.data);
    }
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    login,
    loginWithGoogle,
    register,
    logout,
    refreshUser,
  };

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '349524862127-fa15jor6r72j5opmrkqdb5frv4kdlcio.apps.googleusercontent.com';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

