// frontend/src/utils/authApi.ts
import { API_URL } from '../config';

export interface AuthUser {
  id: number;
  email: string;
  full_name: string | null;
  is_verified: boolean;
}

export interface AuthError {
  detail: string;
}

const AUTH_BASE = `${API_URL}/api/auth`;

// All auth requests MUST include credentials so the browser sends/receives
// the HTTP-only session cookie set by the backend.
const opts: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

async function handle(res: Response) {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text || 'Unknown error' };
  }
  if (!res.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d: any) => d.msg || d.detail || JSON.stringify(d)).join('; ')
      : detail || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function signup(email: string, password: string, fullName: string): Promise<AuthUser> {
  const res = await fetch(`${AUTH_BASE}/signup`, {
    ...opts,
    method: 'POST',
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  return handle(res);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${AUTH_BASE}/login`, {
    ...opts,
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return handle(res);
}

export async function logout(): Promise<void> {
  const res = await fetch(`${AUTH_BASE}/logout`, {
    ...opts,
    method: 'POST',
  });
  await handle(res);
}

export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch(`${AUTH_BASE}/me`, {
    ...opts,
    method: 'GET',
  });
  if (res.status === 401) return null;
  return handle(res);
}
