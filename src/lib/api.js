export function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

// Back-compat name used by UI: delegates to Komiku grab
export async function grabMangaChapter({ token, mangaId, chapterNumber, url, title }) {
  return await grabKomikuChapter({ token, url, manga_id: mangaId, chapter_number: chapterNumber, title });
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

export async function createAdmin({ token, username, email, password, role, permissions }) {
  if (!token) throw new Error('Token tidak tersedia');
  const payload = { username, email, password, role };
  if (Array.isArray(permissions)) payload.permissions = permissions;
  const res = await fetch(`${adminsBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await handleJson(res, 'Gagal membuat admin');
}

export async function updateAdmin({ token, id, username, email, password, role, permissions }) {
  if (!token) throw new Error('Token tidak tersedia');
  const payload = {};
  if (username) payload.username = username;
  if (email) payload.email = email;
  if (password) payload.password = password;
  if (role) payload.role = role;
   if (Array.isArray(permissions)) payload.permissions = permissions;
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

export async function getUserRegistrationStats({ token }) {
  if (!token) throw new Error('Token tidak tersedia');
  const API_BASE = getApiBase();
  const res = await fetch(`${API_BASE}/admin/users/stats/registrations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal mengambil statistik registrasi user');
  return {
    today: data?.today ?? 0,
    yesterday: data?.yesterday ?? 0,
    thisMonth: data?.thisMonth ?? 0,
    lastMonth: data?.lastMonth ?? 0,
    thisYear: data?.thisYear ?? 0,
    lastYear: data?.lastYear ?? 0,
  };
}

export async function listOnlineUsers({ token, page = 1, limit = 20 }) {
  if (!token) throw new Error('Token tidak tersedia');
  const API_BASE = getApiBase();
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const url = `${API_BASE}/admin/users/online?${params.toString()}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar user online');
  return {
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
    total: data?.total ?? 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

// ===== Admin Anime (SUPERADMIN | UPLOADER) =====
const animeBase = () => `${getApiBase()}/admin/anime`;

export async function listAnime({ token, page = 1, limit = 20, q = '', status = '', genre = '', includeEpisodes } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (genre) params.set('genre', genre);
  if (includeEpisodes !== undefined && includeEpisodes !== null) params.set('includeEpisodes', String(!!includeEpisodes));
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

// Search anime (admin) with q, limit, includeEpisodes
export async function searchAnime({ token, q = '', limit = 10, includeEpisodes = false }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!q) return { items: [] };
  const params = new URLSearchParams();
  params.set('q', q);
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 50)));
  if (includeEpisodes) params.set('includeEpisodes', 'true');
  const url = `${animeBase()}/search?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mencari anime');
  return { items: Array.isArray(data?.items) ? data.items : [] };
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

// ===== Anime Relations (SUPERADMIN | UPLOADER) =====
const animeRelationsBase = () => `${getApiBase()}/admin/anime/relations`;

// List relations with optional filters and pagination
export async function listAnimeRelations({ token, source_anime_id = '', related_anime_id = '', relation = '', page = 1, limit = 50, group = false }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (source_anime_id !== '' && source_anime_id !== undefined && source_anime_id !== null) params.set('source_anime_id', String(source_anime_id));
  if (related_anime_id !== '' && related_anime_id !== undefined && related_anime_id !== null) params.set('related_anime_id', String(related_anime_id));
  if (relation) params.set('relation', relation);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 200)));
  if (group) params.set('group', 'true');
  const url = `${animeRelationsBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar relations');
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? undefined,
    groups: Array.isArray(data?.groups) ? data.groups : undefined,
  };
}

// Create a relation
export async function createAnimeRelation({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeRelationsBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat relation');
}

// Update a relation by id
export async function updateAnimeRelation({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeRelationsBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui relation');
}

// Delete a relation by id
export async function deleteAnimeRelation({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeRelationsBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus relation');
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

export async function getTopupRequestStats({ token }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${topupBase()}/requests/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal mengambil statistik topup request');
  return {
    today: data?.today ?? 0,
    yesterday: data?.yesterday ?? 0,
    thisMonth: data?.thisMonth ?? 0,
    lastMonth: data?.lastMonth ?? 0,
    thisYear: data?.thisYear ?? 0,
    lastYear: data?.lastYear ?? 0,
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

// ===== Admin Badges (SUPERADMIN only) =====
const badgesBase = () => `${getApiBase()}/admin/badges`;

export async function listBadges({ token, page = 1, limit = 50, q = '', active = '' } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 200)));
  if (q) params.set('q', q);
  if (active !== '' && active !== null && active !== undefined) params.set('active', String(active));
  const url = `${badgesBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar badge');
  const pg = data?.pagination || {};
  return {
    page: pg.page ?? page,
    limit: pg.limit ?? limit,
    total: pg.total ?? 0,
    totalPages: pg.totalPages ?? undefined,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

export async function getBadge({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${badgesBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil data badge');
  return data?.data ?? data;
}

export async function createBadge({ token, form }) {
  if (!token) throw new Error('Token tidak tersedia');
  const fd = new FormData();
  if (form?.code) fd.set('code', form.code);
  if (form?.name) fd.set('name', form.name);
  if (form?.description) fd.set('description', form.description);
  if (form?.badge_url) fd.set('badge_url', form.badge_url);
  if (form?.is_active !== undefined) fd.set('is_active', String(!!form.is_active));
  if (form?.sort_order !== undefined && form.sort_order !== null && form.sort_order !== '') fd.set('sort_order', String(form.sort_order));
  if (form?.file instanceof File) fd.set('image', form.file);

  const res = await fetch(badgesBase(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return await handleJson(res, 'Gagal membuat badge');
}

export async function updateBadge({ token, id, form }) {
  if (!token) throw new Error('Token tidak tersedia');
  const fd = new FormData();
  if (form?.code !== undefined) fd.set('code', form.code);
  if (form?.name !== undefined) fd.set('name', form.name);
  if (form?.description !== undefined) fd.set('description', form.description ?? '');
  if (form?.badge_url !== undefined) fd.set('badge_url', form.badge_url ?? '');
  if (form?.is_active !== undefined) fd.set('is_active', String(!!form.is_active));
  if (form?.sort_order !== undefined)
    fd.set('sort_order', form.sort_order === null || form.sort_order === '' ? '' : String(form.sort_order));
  if (form?.file instanceof File) fd.set('image', form.file);

  const res = await fetch(`${badgesBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return await handleJson(res, 'Gagal memperbarui badge');
}

export async function deleteBadge({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${badgesBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus badge');
}

// Badge Ownership (SUPERADMIN only)
export async function listBadgeOwners({ token, badgeId, page = 1, limit = 50, q = '', active = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!badgeId && badgeId !== 0) throw new Error('badgeId tidak valid');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 200)));
  if (q) params.set('q', q);
  if (active !== '' && active !== null && active !== undefined) params.set('active', String(active));
  const url = `${badgesBase()}/${badgeId}/owners?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil owners badge');
  const pg = data?.pagination || {};
  return {
    page: pg.page ?? page,
    limit: pg.limit ?? limit,
    total: pg.total ?? 0,
    totalPages: pg.totalPages ?? undefined,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

export async function addBadgeOwner({ token, badgeId, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!badgeId && badgeId !== 0) throw new Error('badgeId tidak valid');
  const body = JSON.stringify(payload || {});
  const res = await fetch(`${badgesBase()}/${badgeId}/owners`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body,
  });
  return await handleJson(res, 'Gagal menambahkan badge owner');
}

export async function updateBadgeOwner({ token, badgeId, ownerId, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!badgeId && badgeId !== 0) throw new Error('badgeId tidak valid');
  if (!ownerId && ownerId !== 0) throw new Error('ownerId tidak valid');
  const body = JSON.stringify(payload || {});
  const res = await fetch(`${badgesBase()}/${badgeId}/owners/${ownerId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body,
  });
  return await handleJson(res, 'Gagal memperbarui badge owner');
}

export async function deleteBadgeOwner({ token, badgeId, ownerId }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!badgeId && badgeId !== 0) throw new Error('badgeId tidak valid');
  if (!ownerId && ownerId !== 0) throw new Error('ownerId tidak valid');
  const res = await fetch(`${badgesBase()}/${badgeId}/owners/${ownerId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus badge owner');
}

// ===== Admin Stickers (SUPERADMIN only) =====
const stickersBase = () => `${getApiBase()}/admin/stickers`;

export async function listStickers({ token, page = 1, limit = 50, q = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 200)));
  if (q) params.set('q', q);
  const url = `${stickersBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar stiker');
  return {
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? undefined,
    items: Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [],
  };
}

export async function getSticker({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${stickersBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil data stiker');
  return data?.data ?? data;
}

export async function createSticker({ token, form }) {
  if (!token) throw new Error('Token tidak tersedia');
  const fd = new FormData();
  if (form?.code) fd.set('code', form.code);
  if (form?.name) fd.set('name', form.name);
  if (form?.description) fd.set('description', form.description);
  if (form?.is_active !== undefined) fd.set('is_active', String(!!form.is_active));
  if (form?.sort_order !== undefined && form.sort_order !== null && form.sort_order !== '') fd.set('sort_order', String(form.sort_order));
  if (form?.file instanceof File) fd.set('image', form.file);

  const res = await fetch(stickersBase(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return await handleJson(res, 'Gagal membuat stiker');
}

export async function updateSticker({ token, id, form }) {
  if (!token) throw new Error('Token tidak tersedia');
  const fd = new FormData();
  if (form?.code !== undefined) fd.set('code', form.code);
  if (form?.name !== undefined) fd.set('name', form.name);
  if (form?.description !== undefined) fd.set('description', form.description);
  if (form?.is_active !== undefined) fd.set('is_active', String(!!form.is_active));
  if (form?.sort_order !== undefined) fd.set('sort_order', form.sort_order === null || form.sort_order === '' ? '' : String(form.sort_order));
  if (form?.file instanceof File) fd.set('image', form.file);

  const res = await fetch(`${stickersBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return await handleJson(res, 'Gagal memperbarui stiker');
}

export async function deleteSticker({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${stickersBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus stiker');
}

// Sticker Ownership (SUPERADMIN only)
export async function listStickerOwners({ token, stickerId, page = 1, limit = 20, userId = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!stickerId && stickerId !== 0) throw new Error('stickerId tidak valid');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 100)));
  if (userId) params.set('userId', String(userId));
  const url = `${stickersBase()}/${stickerId}/users?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil ownership stiker');
  const pg = data?.pagination || {};
  return {
    page: pg.page ?? page,
    limit: pg.limit ?? limit,
    total: pg.total ?? 0,
    totalPages: pg.totalPages ?? undefined,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

export async function addStickerOwner({ token, stickerId, user_id }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!stickerId && stickerId !== 0) throw new Error('stickerId tidak valid');
  const res = await fetch(`${stickersBase()}/${stickerId}/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
  });
  return await handleJson(res, 'Gagal menambahkan ownership stiker');
}

export async function deleteStickerOwner({ token, stickerId, userId }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!stickerId && stickerId !== 0) throw new Error('stickerId tidak valid');
  if (!userId && userId !== 0) throw new Error('userId tidak valid');
  const res = await fetch(`${stickersBase()}/${stickerId}/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus ownership stiker');
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
  if (form?.tier !== undefined) fd.set('tier', form.tier);
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

// Update avatar border with file (multipart/form-data)
export async function updateAvatarBorderWithFile({ token, id, form }) {
  if (!token) throw new Error('Token tidak tersedia');
  const fd = new FormData();
  if (form?.code !== undefined) fd.set('code', form.code);
  if (form?.title !== undefined) fd.set('title', form.title);
  if (form?.coin_price !== undefined) fd.set('coin_price', form.coin_price === null || form.coin_price === '' ? '' : String(form.coin_price));
  if (form?.is_active !== undefined) fd.set('is_active', String(!!form.is_active));
  if (form?.starts_at !== undefined) fd.set('starts_at', form.starts_at || '');
  if (form?.ends_at !== undefined) fd.set('ends_at', form.ends_at || '');
  if (form?.is_limited !== undefined) fd.set('is_limited', String(!!form.is_limited));
  if (form?.total_supply !== undefined) fd.set('total_supply', form.total_supply === null || form.total_supply === '' ? '' : String(form.total_supply));
  if (form?.per_user_limit !== undefined) fd.set('per_user_limit', form.per_user_limit === null || form.per_user_limit === '' ? '' : String(form.per_user_limit));
  if (form?.tier !== undefined) fd.set('tier', form.tier);
  if (form?.file instanceof File) fd.set('image', form.file);

  const res = await fetch(`${avatarBordersBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
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

// ===== Redeem Codes (SUPERADMIN) =====
const redeemCodesBase = () => `${getApiBase()}/admin/redeem-codes`;

export async function listRedeemCodes({ token, page = 1, limit = 20, q = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (q) params.set('q', q);
  const url = `${redeemCodesBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar kode redeem');
  const pg = data?.pagination || {};
  return {
    page: pg.page ?? page,
    limit: pg.limit ?? limit,
    total: pg.total ?? 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

export async function createRedeemCode({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${redeemCodesBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat kode redeem');
}

export async function getRedeemCodeById({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${redeemCodesBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail kode redeem');
}

export async function deleteRedeemCode({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${redeemCodesBase()}/${id}`, {
    method: 'DELETE',
  });
  return await handleJson(res, 'Gagal menghapus kode redeem');
}

// ===== Admin Gacha (SUPERADMIN / GACHA ADMIN) =====
const adminGachaBase = () => `${getApiBase()}/admin/gacha`;

// Gacha Configs
export async function listGachaConfigs({ token }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${adminGachaBase()}/configs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal mengambil daftar konfigurasi gacha');
  const configs = Array.isArray(data?.configs) ? data.configs : Array.isArray(data?.items) ? data.items : [];
  return { configs };
}

export async function getGachaConfig({ token, event_code }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!event_code) throw new Error('event_code wajib diisi');
  const safe = encodeURIComponent(event_code);
  const res = await fetch(`${adminGachaBase()}/configs/${safe}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal mengambil konfigurasi gacha');
}

// Upsert penuh
export async function upsertGachaConfig({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${adminGachaBase()}/configs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal menyimpan konfigurasi gacha');
}

// Patch sebagian field berdasarkan event_code
export async function patchGachaConfig({ token, event_code, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!event_code) throw new Error('event_code wajib diisi');
  const safe = encodeURIComponent(event_code);
  const res = await fetch(`${adminGachaBase()}/configs/${safe}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui konfigurasi gacha');
}

// Gacha Prizes
export async function listGachaPrizes({ token, event_code = '' }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (event_code) params.set('event_code', event_code);
  const qs = params.toString();
  const url = `${adminGachaBase()}/prizes${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar hadiah gacha');
  const items = Array.isArray(data?.prizes) ? data.prizes : Array.isArray(data?.items) ? data.items : [];
  return { items };
}

export async function createGachaPrize({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${adminGachaBase()}/prizes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat hadiah gacha');
}

export async function updateGachaPrize({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${adminGachaBase()}/prizes/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui hadiah gacha');
}

export async function deleteGachaPrize({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${adminGachaBase()}/prizes/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus hadiah gacha');
}

// Gacha Sharp Token Shop (GachaShopItem)
export async function listGachaShopItems({ token, event_code = '' } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (event_code) params.set('event_code', event_code);
  const qs = params.toString();
  const url = `${adminGachaBase()}/shop/items${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar item shop gacha');
  const items = Array.isArray(data?.items) ? data.items : [];
  return { items };
}

export async function createGachaShopItem({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${adminGachaBase()}/shop/items`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat item shop gacha');
}

export async function updateGachaShopItem({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${adminGachaBase()}/shop/items/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui item shop gacha');
}

export async function deleteGachaShopItem({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${adminGachaBase()}/shop/items/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus item shop gacha');
}

// Upload banner special event (image)
export async function uploadGachaBanner({ token, file }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!(file instanceof File)) throw new Error('File gambar tidak valid');
  const fd = new FormData();
  fd.set('image', file);
  const res = await fetch(`${adminGachaBase()}/upload-banner`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return await handleJson(res, 'Gagal mengupload banner gacha');
}

// ===== Store Admin (SUPERADMIN) =====
const storeAdminBase = () => `${getApiBase()}/store/admin/items`;

export async function listStoreItems({ token, q = '', active = '', page = 1, limit = 20 }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (active !== '' && active !== null && active !== undefined) params.set('active', String(active));
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const url = `${storeAdminBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar item store');
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
    total: data?.total ?? 0,
  };
}

export async function getStoreItem({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${storeAdminBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail item store');
}

export async function createStoreItem({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${storeAdminBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat item store');
}

export async function updateStoreItem({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${storeAdminBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui item store');
}

export async function deleteStoreItem({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${storeAdminBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus item store');
}

// ===== Prime Store Admin (SUPERADMIN) =====
const primeStoreItemsBase = () => `${getApiBase()}/admin/prime-store/items`;
const primeStoreDiscountsBase = () => `${getApiBase()}/admin/prime-store/daily-discounts`;

// ===== VIP Plan Admin (SUPERADMIN) =====
const vipPlansBase = () => `${getApiBase()}/admin/vip-plans`;

export async function listVipPlans({ token, page = 1, pageSize = 20, includeInactive = false } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(Math.min(Math.max(1, pageSize), 100)));
  if (includeInactive) params.set('includeInactive', 'true');
  const url = `${vipPlansBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar VIP plan');
  const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.items) ? data.items : [];
  const pg = data?.data?.pagination || data?.pagination || {};
  return {
    items,
    page: pg.page ?? page,
    pageSize: pg.pageSize ?? pageSize,
    total: pg.total ?? 0,
    totalPages: pg.totalPages ?? (pg.total && pg.pageSize ? Math.ceil(pg.total / pg.pageSize) : undefined),
  };
}

export async function getVipPlan({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipPlansBase()}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal mengambil detail VIP plan');
}

export async function createVipPlan({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipPlansBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat VIP plan');
}

export async function updateVipPlan({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipPlansBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui VIP plan');
}

export async function toggleVipPlanStatus({ token, id, is_active }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipPlansBase()}/${id}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active }),
  });
  return await handleJson(res, 'Gagal mengubah status VIP plan');
}

export async function deleteVipPlan({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipPlansBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus VIP plan');
}

export async function listPrimeStoreItems({ token, q = '', active = '', page = 1, limit = 20 }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (active !== '' && active !== null && active !== undefined) params.set('active', String(active));
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const url = `${primeStoreItemsBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar item Prime Store');
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
    total: data?.total ?? 0,
  };
}

export async function getPrimeStoreItem({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${primeStoreItemsBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail item Prime Store');
}

export async function createPrimeStoreItem({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${primeStoreItemsBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat item Prime Store');
}

export async function updatePrimeStoreItem({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${primeStoreItemsBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui item Prime Store');
}

export async function deletePrimeStoreItem({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${primeStoreItemsBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus item Prime Store');
}

export async function listPrimeStoreDailyDiscounts({ token, date = '', page = 1, limit = 50 }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const url = `${primeStoreDiscountsBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar diskon harian Prime Store');
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
    total: data?.total ?? 0,
  };
}

export async function upsertPrimeStoreDailyDiscount({ token, itemId, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${primeStoreItemsBase()}/${itemId}/daily-discount`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal menyimpan diskon harian Prime Store');
}

export async function deletePrimeStoreDailyDiscount({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${primeStoreDiscountsBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus diskon harian Prime Store');
}

// ===== Sponsor Admin (SUPERADMIN) =====
const sponsorAdminBase = () => `${getApiBase()}/sponsors/admin`;

export async function listSponsors({ token }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${sponsorAdminBase()}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar sponsor');
  return { items: Array.isArray(data?.items) ? data.items : [] };
}

export async function getSponsor({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${sponsorAdminBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail sponsor');
}

export async function createSponsor({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${sponsorAdminBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat sponsor');
}

export async function updateSponsor({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${sponsorAdminBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui sponsor');
}

export async function deleteSponsor({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${sponsorAdminBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus sponsor');
}

// ===== Manga Admin (SUPERADMIN | UPLOADER) =====
const mangaBase = () => `${getApiBase()}/admin/manga`;

export async function listManga({ token, q = '', page = 1, limit = 20 }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const res = await fetch(`${mangaBase()}?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar manga');
  return {
    items: Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data) ? data.data : []),
    page: data?.page ?? data?.pagination?.page ?? page,
    limit: data?.limit ?? data?.pagination?.limit ?? limit,
    total: data?.total ?? data?.pagination?.total ?? 0,
  };
}

export async function createManga({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${mangaBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat manga');
}

export async function uploadMangaCover({ token, id, file }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!(file instanceof File)) throw new Error('File cover tidak valid');
  const fd = new FormData();
  fd.append('cover', file);
  const res = await fetch(`${mangaBase()}/${id}/cover`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return await handleJson(res, 'Gagal upload cover manga');
}

export async function getManga({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${mangaBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail manga');
}

export async function updateManga({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${mangaBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui manga');
}

export async function deleteManga({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${mangaBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus manga');
}

export async function listMangaChapters({ token, mangaId }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${mangaBase()}/${mangaId}/chapters`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil daftar chapter manga');
}

export async function createMangaChapter({ token, mangaId, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${mangaBase()}/${mangaId}/chapters`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat chapter');
}

const chaptersBase = () => `${getApiBase()}/admin/chapters`;

export async function getChapter({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${chaptersBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail chapter');
}

export async function updateChapter({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${chaptersBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui chapter');
}

export async function deleteChapter({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${chaptersBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus chapter');
}

export async function uploadMangaChapterImages({ token, mangaId, chapterNumber, files, title }) {
  if (!token) throw new Error('Token tidak tersedia');
  const fd = new FormData();
  if (files instanceof FileList) {
    Array.from(files).forEach((f) => fd.append('images', f));
  } else if (Array.isArray(files)) {
    files.forEach((f) => f instanceof File && fd.append('images', f));
  } else if (files instanceof File) {
    fd.append('images', files);
  }
  if (title) fd.set('title', title);
  const res = await fetch(`${mangaBase()}/${mangaId}/chapters/${chapterNumber}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return await handleJson(res, 'Gagal upload halaman chapter');
}

export async function getMangaChapterPages({ token, mangaId, chapterNumber }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${mangaBase()}/${mangaId}/chapters/${chapterNumber}/pages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal mengambil halaman chapter');
  const base = getApiBase();
  if (Array.isArray(data?.pages)) {
    data.pages = data.pages.map((p) => {
      const url = p?.image_url || '';
      const abs = url.startsWith('http://') || url.startsWith('https://') ? url : `${base}${url}`;
      return { ...p, image_url: abs };
    });
  }
  return data;
}

export async function getChapterPages({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${chaptersBase()}/${id}/pages`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil halaman chapter');
  const base = getApiBase();
  if (Array.isArray(data?.pages)) {
    data.pages = data.pages.map((p) => {
      const url = p?.image_url || '';
      const abs = url.startsWith('http://') || url.startsWith('https://') ? url : `${base}${url}`;
      return { ...p, image_url: abs };
    });
  }
  return data;
}

export async function deletePageById({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${getApiBase()}/admin/pages/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus halaman');
}

export async function deletePageByNumber({ token, mangaId, chapterNumber, pageNumber }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${mangaBase()}/${mangaId}/chapters/${chapterNumber}/pages/${pageNumber}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus halaman');
}

// ===== Komiku Grab (SUPERADMIN) =====
export async function grabKomikuChapter({ token, url, manga_id, chapter_number, title }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${getApiBase()}/manga/komiku/grab`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url, manga_id, chapter_number, title }),
  });
  return await handleJson(res, 'Gagal grab Komiku');
}

export async function grabKomikuRange({ token, mangaId, sample_url, start, end, title_prefix }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${mangaBase()}/${mangaId}/komiku/grab-range`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sample_url, start, end, title_prefix }),
  });
  return await handleJson(res, 'Gagal grab Komiku range');
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
