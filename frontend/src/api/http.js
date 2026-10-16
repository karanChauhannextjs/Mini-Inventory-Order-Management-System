import { clearAuthSession, getToken } from '@/lib/auth-storage';

const baseUrl = import.meta.env.VITE_API_URL || '/api';

export async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 304) {
    const err = new Error('Unexpected cached response (304). Please refresh.');
    err.status = 304;
    throw err;
  }

  let body;
  try {
    body = await res.json();
  } catch {
    body = { success: false, message: 'Invalid response from server' };
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
      clearAuthSession();
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.assign('/login');
      }
    }
    const err = new Error(body.message || 'Something went wrong');
    err.status = res.status;
    throw err;
  }

  return body;
}
