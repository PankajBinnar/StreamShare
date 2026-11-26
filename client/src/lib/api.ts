import { ApiResponse } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// In-memory access token storage (avoids local storage XSS theft)
let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { requiresAuth = true, headers = {}, ...rest } = options;

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (requiresAuth && currentAccessToken) {
    requestHeaders['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  try {
    let response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
      credentials: 'include', // Includes HttpOnly refresh cookie
    });

    // Handle token expiration & automatic refresh
    if (response.status === 401 && requiresAuth && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        requestHeaders['Authorization'] = `Bearer ${currentAccessToken}`;
        response = await fetch(url, {
          ...rest,
          headers: requestHeaders,
          credentials: 'include',
        });
      }
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: Request failed`,
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network connection failed.',
    };
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

async function attemptTokenRefresh(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push((token) => resolve(!!token));
    });
  }

  isRefreshing = true;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (res.ok) {
      const json = await res.json();
      currentAccessToken = json.data.accessToken;
      refreshSubscribers.forEach((callback) => callback(currentAccessToken));
      refreshSubscribers = [];
      return true;
    } else {
      currentAccessToken = null;
      refreshSubscribers.forEach((callback) => callback(null));
      refreshSubscribers = [];
      return false;
    }
  } catch (err) {
    currentAccessToken = null;
    return false;
  } finally {
    isRefreshing = false;
  }
}

export async function uploadApi<T>(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers: Record<string, string> = {};

  if (currentAccessToken) {
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  try {
    let response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (response.status === 401) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed && currentAccessToken) {
        headers['Authorization'] = `Bearer ${currentAccessToken}`;
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
        });
      }
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network upload request failed.',
    };
  }
}


