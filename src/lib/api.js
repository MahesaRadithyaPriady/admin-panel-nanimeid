export function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

// ===== Admin Management (SUPERADMIN only) =====
const adminsBase = () => `${getApiBase()}/admin`;

export async function listAdmins({ token, page = 1, limit = 20, q = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (q) params.set('q', q);
  const url = `${adminsBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar admin');
  return {
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
    total: data?.total ?? 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

export async function getAdminDetail({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${adminsBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail admin');
}

export async function createAdmin({ token, username, email, password, role }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${adminsBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, role }),
  });
  return await handleJson(res, 'Gagal membuat admin');
}

export async function updateAdmin({ token, id, username, email, password, role }) {
  if (!token) throw new Error('Token tidak tersedia');
  const payload = {};
  if (username) payload.username = username;
  if (email) payload.email = email;
  if (password) payload.password = password;
  if (role) payload.role = role;
  const res = await fetch(`${adminsBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await handleJson(res, 'Gagal memperbarui admin');
}

export async function deleteAdmin({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${adminsBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus admin');
}

// Admin Users APIs
export async function listAdminUsers({ token, page = 1, limit = 20, q = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  const API_BASE = getApiBase();
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (q) params.set('q', q);
  const url = `${API_BASE}/admin/users?${params.toString()}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar users');
  return {
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
    total: data?.total ?? 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

// NOTE: Create endpoint is not documented; assuming POST /admin/users with {email, username, password}
export async function createAdminUser({ token, email, username, password }) {
  if (!token) throw new Error('Token tidak tersedia');
  const API_BASE = getApiBase();
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, username, password }),
  });
  const data = await handleJson(res, 'Gagal membuat user');
  return data;
}

export async function updateAdminUser({ token, id, username, email }) {
  if (!token) throw new Error('Token tidak tersedia');
  const API_BASE = getApiBase();
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email }),
  });
  const data = await handleJson(res, 'Gagal memperbarui user');
  return data?.item ?? data;
}

export async function deleteAdminUser({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const API_BASE = getApiBase();
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal menghapus user');
  return data;
}

// ===== Admin Anime (SUPERADMIN | UPLOADER) =====
const animeBase = () => `${getApiBase()}/admin/anime`;

export async function listAnime({ token, page = 1, limit = 20, q = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (q) params.set('q', q);
  const url = `${animeBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar anime');
  const pg = data?.pagination || {};
  return {
    page: pg.page ?? page,
    limit: pg.limit ?? limit,
    total: pg.total ?? 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

export async function getAnimeDetail({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail anime');
}

export async function createAnime({ token, payload }) {
  // payload should include: nama_anime, gambar_anime, rating_anime, status_anime, sinopsis_anime, label_anime, and optional fields as per docs
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat anime');
}

export async function updateAnime({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui anime');
}

export async function deleteAnime({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus anime');
}

// ===== Admin Episodes (SUPERADMIN | UPLOADER) =====
const episodesBase = () => `${getApiBase()}/admin/episodes`;

// List episodes for an anime
export async function listEpisodes({ token, animeId, page = 1, limit = 50 }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!animeId && animeId !== 0) throw new Error('animeId tidak valid');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const url = `${animeBase()}/${animeId}/episodes?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar episode');
  const pg = data?.pagination || {};
  return {
    page: pg.page ?? page,
    limit: pg.limit ?? limit,
    total: pg.total ?? 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

// Create episode for anime (with optional qualities)
export async function createEpisode({ token, animeId, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!animeId && animeId !== 0) throw new Error('animeId tidak valid');
  const res = await fetch(`${animeBase()}/${animeId}/episodes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat episode');
}

// Get episode detail (includes qualities)
export async function getEpisodeDetail({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${episodesBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail episode');
}

// Update episode (replace qualities if provided)
export async function updateEpisode({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${episodesBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui episode');
}

// Delete episode
export async function deleteEpisode({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${episodesBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus episode');
}

// ===== Admin Uploads (SUPERADMIN | UPLOADER) =====
const uploadsBase = () => `${getApiBase()}/admin/uploads`;

// Create Upload History
export async function createUploadHistory({ token, target_type, target_id, size_bytes, note, status }) {
  if (!token) throw new Error('Token tidak tersedia');
  const payload = { target_type, target_id };
  if (typeof size_bytes === 'number') payload.size_bytes = size_bytes;
  if (note) payload.note = note;
  if (status) payload.status = status;
  const res = await fetch(`${uploadsBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await handleJson(res, 'Gagal membuat riwayat upload');
}

// List Upload History (for current admin)
export async function listUploadHistory({ token, page = 1, limit = 20, status = '', target_type = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (status) params.set('status', status);
  if (target_type) params.set('target_type', target_type);
  const url = `${uploadsBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil riwayat upload');
  const pg = data?.pagination || {};
  return {
    page: pg.page ?? page,
    limit: pg.limit ?? limit,
    total: pg.total ?? 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

// Update Upload History Status
export async function updateUploadStatus({ token, id, status }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${uploadsBase()}/${id}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return await handleJson(res, 'Gagal memperbarui status upload');
}

// Get My Upload Stats
export async function getMyUploadStats({ token }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${uploadsBase()}/stats/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal mengambil statistik upload');
  const st = data?.stats || {};
  return {
    total_upload: st.total_upload ?? 0,
    pending: st.pending ?? 0,
    approved: st.approved ?? 0,
    rejected: st.rejected ?? 0,
    storage: st.storage ?? null,
  };
}

// ===== Admin Settings (SUPERADMIN only) =====
const settingsBase = () => `${getApiBase()}/admin/settings`;

export async function getSettings({ token }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(settingsBase(), { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil settings');
  return data?.settings || null;
}

export async function updateSettings({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(settingsBase(), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const data = await handleJson(res, 'Gagal memperbarui settings');
  return data?.settings || null;
}

async function handleJson(res, defaultError = 'Request failed') {
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j?.message || ''; } catch {}
    throw new Error(detail || `${defaultError} (${res.status})`);
  }
  try { return await res.json(); } catch { return null; }
}

export async function getOverview({ token }) {
  if (!token) throw new Error('Token tidak tersedia');
  const API_BASE = getApiBase();
  const res = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal mengambil overview');
  const counts = data?.counts || {};
  const srv = data?.server || {};

  const metrics = {
    users: counts.users ?? 0,
    anime: counts.anime ?? 0,
    episodes: counts.episodes ?? 0,
  };

  const cpuPct = Math.round((srv.cpu?.usagePercent ?? 0));
  const ramPct = Math.round((srv.memory?.usagePercent ?? 0));
  let storagePct = 0;
  const used = srv.storage?.used ?? 0;
  const total = srv.storage?.total ?? null;
  const free = srv.storage?.free ?? 0;
  if (total && total > 0) storagePct = Math.round((used / total) * 100);
  else if (used || free) storagePct = Math.round((used / (used + free)) * 100);

  const server = { cpu: cpuPct, ram: ramPct, storage: storagePct };
  return { metrics, server };
}

export async function getHttpLogs({ token, level }) {
  if (!token) throw new Error('Token tidak tersedia');
  const API_BASE = getApiBase();
  const params = new URLSearchParams();
  if (level && level !== 'all') params.set('level', level);
  const qs = params.toString();
  const url = `${API_BASE}/admin/http-logs${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal mengambil logs');
  const items = Array.isArray(data?.logs) ? data.logs : [];
  return items.map((it, idx) => ({
    id: `${it.time || Date.now()}-${idx}`,
    ts: it.time ? Date.parse(it.time) : Date.now(),
    level: (it.level || 'info').toLowerCase(),
    msg: it.line || `${it.method || ''} ${it.url || ''} ${it.status || ''}`.trim(),
  }));
}
