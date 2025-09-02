'use client';

// Auth utilities for admin login/logout and session persistence
// Persists to localStorage using the same key read by useSession()
const SESSION_KEY = 'nanimeid_admin_session';

function normalizeRole(role) {
  if (!role) return '';
  const r = String(role).toLowerCase();
  // Map known roles to the ones used in the UI
  if (r.includes('superadmin')) return 'superadmin';
  if (r.includes('uploader')) return 'uploader';
  if (r.includes('keuangan') || r.includes('finance')) return 'keuangan';
  return r; // fallback
}

export async function loginAdmin({ username, password }) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const url = `${API_BASE}/admin/auth/login`;
  // POST to the backend login endpoint
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.message || '';
    } catch {}
    throw new Error(detail || `Login failed with status ${res.status}`);
  }

  const data = await res.json();
  // Expected response shape (example):
  // {
  //   message: 'Login admin success',
  //   token: '...jwt...'
  //   admin: { id, username, email, role: 'SUPERADMIN', createdAt }
  // }
  const { token, admin } = data || {};
  if (!token || !admin) {
    throw new Error('Invalid login response');
  }

  const session = {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    role: normalizeRole(admin.role),
    token,
    createdAt: admin.createdAt,
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    // If storage fails, still return the session for caller to handle
    console.warn('Failed to persist session:', e);
  }

  return session;
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logoutAdmin() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}
