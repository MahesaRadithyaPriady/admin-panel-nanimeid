import { getApiBase } from './api';

// Animasi profil dinamis (GIF) — endpoint backend: /profile-animations/admin
const base = () => `${getApiBase()}/profile-animations/admin`;

async function handle(res, fallback) {
  let j = null;
  try { j = await res.json(); } catch {}
  if (!res.ok) throw new Error(j?.message || `${fallback} (${res.status})`);
  return j;
}

function toFormData(form) {
  const fd = new FormData();
  const put = (k, v) => {
    if (v === undefined || v === null || v === '') return;
    fd.set(k, String(v));
  };
  put('code', form.code);
  put('title', form.title);
  put('description', form.description);
  put('accent_color', form.accent_color);
  put('tier', form.tier);
  put('poin_collection', form.poin_collection);
  // harga kosong = tidak dijual → kirim "null" eksplisit saat edit
  fd.set('coin_price', form.coin_price === '' || form.coin_price == null ? 'null' : String(form.coin_price));
  put('per_user_limit', form.per_user_limit);
  fd.set('is_active', String(!!form.is_active));
  fd.set('is_limited', String(!!form.is_limited));
  put('total_supply', form.total_supply);
  if (form.starts_at) fd.set('starts_at', new Date(form.starts_at).toISOString());
  if (form.ends_at) fd.set('ends_at', new Date(form.ends_at).toISOString());
  if (form.gif_url) fd.set('gif_url', form.gif_url);
  if (form.file instanceof File) fd.set('gif', form.file);
  return fd;
}

export async function listProfileAnimations({ token, q = '' }) {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  const res = await fetch(`${base()}?${p.toString()}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  return handle(res, 'Gagal memuat animasi');
}

export async function createProfileAnimation({ token, form }) {
  const res = await fetch(base(), { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: toFormData(form) });
  return handle(res, 'Gagal membuat animasi');
}

export async function updateProfileAnimation({ token, id, form }) {
  const res = await fetch(`${base()}/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: toFormData(form) });
  return handle(res, 'Gagal memperbarui animasi');
}

export async function deleteProfileAnimation({ token, id }) {
  const res = await fetch(`${base()}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return handle(res, 'Gagal menghapus animasi');
}

export async function grantProfileAnimation({ token, id, userId }) {
  const res = await fetch(`${base()}/${id}/grant`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: Number(userId) }),
  });
  return handle(res, 'Gagal memberikan animasi');
}

export async function listProfileAnimationOwners({ token, id, page = 1, limit = 20, q = '' }) {
  const p = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) p.set('q', q);
  const res = await fetch(`${base()}/${id}/owners?${p.toString()}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  return handle(res, 'Gagal memuat pemilik');
}

export async function setProfileAnimationOwnerActive({ token, id, userId, active }) {
  const res = await fetch(`${base()}/${id}/owners/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: !!active }),
  });
  return handle(res, 'Gagal mengubah status');
}

export async function removeProfileAnimationOwner({ token, id, userId }) {
  const res = await fetch(`${base()}/${id}/owners/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return handle(res, 'Gagal menghapus kepemilikan');
}
