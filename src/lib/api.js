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

export async function updateAdminUser({ token, id, username, email, account_status, account_status_reason }) {
  if (!token) throw new Error('Token tidak tersedia');
  const API_BASE = getApiBase();
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      Object.fromEntries(
        Object.entries({ username, email, account_status, account_status_reason }).filter(([_, v]) => v !== undefined && v !== '')
      )
    ),
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

// ===== Admin Topup Moderation (SUPERADMIN only) =====
const topupBase = () => `${getApiBase()}/admin/topup`;

// List topup manual requests
export async function listTopupRequests({ token, userId = '', status = '', page = 1, limit = 20 }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (userId) params.set('userId', String(userId));
  if (status) params.set('status', status);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const url = `${topupBase()}/requests?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar topup');
  const pg = data?.pagination || {};
  return {
    page: pg.page ?? page,
    limit: pg.limit ?? limit,
    total: pg.total ?? 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

// Get single topup request detail
export async function getTopupRequest({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${topupBase()}/requests/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail topup');
}

// Update topup request status: PENDING|APPROVED|REJECTED|PAID|CANCELED
export async function setTopupStatus({ token, id, status }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${topupBase()}/requests/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return await handleJson(res, 'Gagal memperbarui status topup');
}

// ===== Admin Avatar Borders (SUPERADMIN only) =====
const avatarBordersBase = () => `${getApiBase()}/admin/avatar-borders`;

export async function createAvatarBorder({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(avatarBordersBase(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat avatar border');
}

// Create avatar border with file (multipart/form-data)
export async function createAvatarBorderWithFile({ token, form }) {
  if (!token) throw new Error('Token tidak tersedia');
  const fd = new FormData();
  if (form?.code) fd.set('code', form.code);
  if (form?.title) fd.set('title', form.title);
  if (form?.coin_price !== undefined && form.coin_price !== null && form.coin_price !== '') fd.set('coin_price', String(form.coin_price));
  if (form?.is_active !== undefined) fd.set('is_active', String(!!form.is_active));
  if (form?.starts_at) fd.set('starts_at', form.starts_at);
  if (form?.ends_at) fd.set('ends_at', form.ends_at);
  if (form?.is_limited !== undefined) fd.set('is_limited', String(!!form.is_limited));
  if (form?.total_supply !== undefined && form.total_supply !== null && form.total_supply !== '') fd.set('total_supply', String(form.total_supply));
  if (form?.per_user_limit !== undefined && form.per_user_limit !== null && form.per_user_limit !== '') fd.set('per_user_limit', String(form.per_user_limit));
  if (form?.file instanceof File) {
    fd.set('image', form.file);
  }

  const res = await fetch(avatarBordersBase(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return await handleJson(res, 'Gagal membuat avatar border');
}

// List avatar borders (admin)
export async function listAvatarBorders({ token, page = 1, limit = 20, q = '', active = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (q) params.set('q', q);
  if (active !== '' && active !== null && active !== undefined) params.set('active', String(active));
  const url = `${avatarBordersBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil avatar borders');
  const pg = data?.pagination || {};
  return {
    page: pg.page ?? page,
    limit: pg.limit ?? limit,
    total: pg.total ?? 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

// Get detail
export async function getAvatarBorder({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${avatarBordersBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail avatar border');
}

// Update (partial)
export async function updateAvatarBorder({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${avatarBordersBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui avatar border');
}

// Delete
export async function deleteAvatarBorder({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${avatarBordersBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus avatar border');
}

// ===== Avatar Border Owners (SUPERADMIN only) =====
// List owners for a border
export async function listBorderOwners({ token, borderId, page = 1, limit = 20, userId = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!borderId && borderId !== 0) throw new Error('borderId tidak valid');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (userId) params.set('userId', String(userId));
  const url = `${avatarBordersBase()}/${borderId}/owners?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil owners');
  const pg = data?.pagination || {};
  return {
    page: pg.page ?? page,
    limit: pg.limit ?? limit,
    total: pg.total ?? 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

// Add/Upsert owner for a border
export async function addOrUpdateBorderOwner({ token, borderId, user_id, is_active = false }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${avatarBordersBase()}/${borderId}/owners`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, is_active }),
  });
  return await handleJson(res, 'Gagal menambahkan ownership');
}

// Update owner active flag
export async function updateBorderOwner({ token, borderId, userId, is_active }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${avatarBordersBase()}/${borderId}/owners/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active }),
  });
  return await handleJson(res, 'Gagal memperbarui ownership');
}

// Delete owner
export async function deleteBorderOwner({ token, borderId, userId }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${avatarBordersBase()}/${borderId}/owners/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus ownership');
}

// ===== Waifu Vote (PUBLIC + ADMIN) =====
const waifuBase = () => `${getApiBase()}/waifu`;

// Public/Admin: List waifu with pagination and optional q
export async function listWaifu({ token = '', page = 1, limit = 20, q = '' }) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (q) params.set('q', q);
  const url = `${waifuBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  const data = await handleJson(res, 'Gagal mengambil daftar waifu');
  const pg = data?.pagination || {};
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    pagination: {
      page: pg.page ?? page,
      limit: pg.limit ?? limit,
      total: pg.total ?? data?.total ?? 0,
      totalPages: pg.totalPages ?? (pg.total && pg.limit ? Math.ceil(pg.total / pg.limit) : undefined),
    },
  };
}

// Public/Admin: Get waifu by id
export async function getWaifu({ id }) {
  const res = await fetch(`${waifuBase()}/${id}`);
  return await handleJson(res, 'Gagal mengambil detail waifu');
}

// Admin: Create waifu
export async function createWaifu({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${waifuBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat waifu');
}

// Admin: Update waifu
export async function updateWaifu({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${waifuBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui waifu');
}

// Create waifu with file (multipart/form-data)
export async function createWaifuWithFile({ token, form }) {
  if (!token) throw new Error('Token tidak tersedia');
  const fd = new FormData();
  if (form?.name) fd.set('name', form.name);
  if (form?.anime_title) fd.set('anime_title', form.anime_title);
  if (form?.description) fd.set('description', form.description);
  if (form?.file instanceof File) fd.set('image', form.file);
  const res = await fetch(`${waifuBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return await handleJson(res, 'Gagal membuat waifu');
}

// Update waifu with file (multipart/form-data)
export async function updateWaifuWithFile({ token, id, form }) {
  if (!token) throw new Error('Token tidak tersedia');
  const fd = new FormData();
  if (form?.name !== undefined) fd.set('name', form.name);
  if (form?.anime_title !== undefined) fd.set('anime_title', form.anime_title);
  if (form?.description !== undefined) fd.set('description', form.description);
  if (form?.file instanceof File) fd.set('image', form.file);
  const res = await fetch(`${waifuBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return await handleJson(res, 'Gagal memperbarui waifu');
}

// Admin: Delete waifu
export async function deleteWaifu({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${waifuBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus waifu');
}

// Admin: Reset all votes
export async function resetWaifuVotes({ token }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${waifuBase()}/reset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal mereset vote');
}

// ===== Admin VIP Management (SUPERADMIN) =====
const vipBase = () => `${getApiBase()}/admin/vip`;

export async function getUserVipStatus({ token, userId }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipBase()}/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal mengambil status VIP');
}

export async function getUserVipHistory({ token, userId, page = 1, pageSize = 20 }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));
  const res = await fetch(`${vipBase()}/users/${userId}/history?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal mengambil riwayat VIP');
}

export async function activateUserVip({ token, userId, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipBase()}/users/${userId}/activate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal mengaktifkan VIP');
}

export async function renewUserVip({ token, userId, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipBase()}/users/${userId}/renew`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperpanjang VIP');
}

export async function cancelUserVip({ token, userId, payload = {} }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipBase()}/users/${userId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membatalkan VIP');
}

export async function setUserVipAutoRenew({ token, userId, auto_renew }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipBase()}/users/${userId}/auto-renew`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ auto_renew }),
  });
  return await handleJson(res, 'Gagal mengatur auto-renew VIP');
}

// ===== Admin Wallet (SUPERADMIN) =====
const walletBase = () => `${getApiBase()}/admin/wallet`;

// Global credit (body includes userId)
export async function adminWalletCredit({ token, userId, amount, note = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${walletBase()}/credit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, note }),
  });
  return await handleJson(res, 'Gagal kredit koin');
}

// Global debit (body includes userId)
export async function adminWalletDebit({ token, userId, amount, note = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${walletBase()}/debit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, note }),
  });
  return await handleJson(res, 'Gagal debit koin');
}

// User-level wallet summary with user info
export async function getUserWallet({ token, userId }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${walletBase()}/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal mengambil wallet user');
}

// User-level transactions with pagination
export async function getUserWalletTransactions({ token, userId, page = 1, limit = 20 }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const res = await fetch(`${walletBase()}/users/${userId}/transactions?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal mengambil transaksi wallet');
}

// User-level credit
export async function creditUserWallet({ token, userId, amount, note = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${walletBase()}/users/${userId}/credit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, note }),
  });
  return await handleJson(res, 'Gagal kredit koin user');
}

// User-level debit
export async function debitUserWallet({ token, userId, amount, note = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${walletBase()}/users/${userId}/debit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, note }),
  });
  return await handleJson(res, 'Gagal debit koin user');
}
