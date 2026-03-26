export function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

export function getStoragePublicBaseUrl() {
  return process.env.NEXT_PUBLIC_CDN_BASE_URL_STORAGE || process.env.NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL || '';
}

export function buildStoragePublicUrl(key) {
  const base = (getStoragePublicBaseUrl() || '').replace(/\/$/, '');
  const k = String(key || '').replace(/^\//, '');
  if (!k) return '';
  if (!base) return `/${k}`;
  return `${base}/${k}`;
}

export async function listMyAdminPublicKeys({ token } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const API_BASE = getApiBase();
  const res = await fetch(`${API_BASE}/admin/me/public-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal mengambil public keys');
  const d = data?.data ?? data;
  return {
    items: Array.isArray(d?.items) ? d.items : Array.isArray(data?.items) ? data.items : [],
  };
}

export async function upsertMyAdminPublicKey({ token, payload } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const API_BASE = getApiBase();
  const res = await fetch(`${API_BASE}/admin/me/public-keys`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const data = await handleJson(res, 'Gagal menyimpan public key');
  return data?.data ?? data;
}

function guessFileExtension(filename) {
  const name = String(filename || '');
  const idx = name.lastIndexOf('.');
  if (idx === -1) return '';
  const ext = name.slice(idx + 1).toLowerCase();
  if (!ext || ext.length > 10) return '';
  return ext;
}

export async function createPresignedPutUrl({ token, key, contentType, expiresInSeconds = 600, useStorage = true }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!key) throw new Error('key wajib diisi');
  if (!contentType) throw new Error('contentType wajib diisi');
  const res = await fetch(`${getApiBase()}/upload/admin/presigned-put`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, contentType, expiresInSeconds, useStorage }),
  });
  const data = await handleJson(res, 'Gagal membuat presigned PUT URL');
  const d = data?.data ?? data;
  if (!d?.url) throw new Error('Presigned PUT URL tidak tersedia');
  return d;
}

export async function putFileToPresignedUrl({ url, file, contentType }) {
  if (!url) throw new Error('url tidak valid');
  if (!(file instanceof File)) throw new Error('File tidak valid');
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType || file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) throw new Error(`Gagal upload ke storage (${res.status})`);
  return true;
}

export async function uploadFileViaPresignedPut({ token, folder, file, key }) {
  if (!(file instanceof File)) throw new Error('File tidak valid');
  const ext = guessFileExtension(file.name);
  const safeFolder = String(folder || '').replace(/^\/+|\/+$/g, '');
  const computedKey = key || `${safeFolder ? `${safeFolder}/` : ''}${Date.now()}_${Math.random().toString(16).slice(2)}${ext ? `.${ext}` : ''}`;
  const presigned = await createPresignedPutUrl({
    token,
    key: computedKey,
    contentType: file.type || 'application/octet-stream',
    expiresInSeconds: 600,
    useStorage: true,
  });
  await putFileToPresignedUrl({ url: presigned.url, file, contentType: file.type });
  return {
    key: presigned.key || computedKey,
    bucket: presigned.bucket,
    publicUrl: buildStoragePublicUrl(presigned.key || computedKey),
  };
}

// Back-compat name used by UI: delegates to Komiku grab
export async function grabMangaChapter({ token, mangaId, chapterNumber, url, title }) {
  return await grabKomikuChapter({ token, url, manga_id: mangaId, chapter_number: chapterNumber, title });
}

// ===== Admin Management (SUPERADMIN only) =====
const adminsBase = () => `${getApiBase()}/admin`;

// ===== Admin Sign-In Event Configs =====
const signinEventConfigsBase = () => `${getApiBase()}/admin/signin-event-configs`;

// ===== Admin Watch Event Configs =====
const watchEventConfigsBase = () => `${getApiBase()}/admin/watch-event-configs`;

// ===== Admin Moderation =====
const moderationBase = () => `${getApiBase()}/admin/moderation`;

const nsfwQuarantineBase = () => `${getApiBase()}/admin/nsfw-quarantine/uploads`;

// ===== Admin Livechat =====
const livechatAdminBase = () => `${getApiBase()}/admin/livechat`;

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

export async function listModerationComments({
  token,
  page = 1,
  limit = 20,
  q = '',
  is_deleted,
  anime_id,
  episode_id,
  user_id,
} = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 100)));
  if (q) params.set('q', String(q));
  if (is_deleted !== undefined && is_deleted !== null && is_deleted !== '') params.set('is_deleted', String(is_deleted));
  if (anime_id !== undefined && anime_id !== null && anime_id !== '') params.set('anime_id', String(anime_id));
  if (episode_id !== undefined && episode_id !== null && episode_id !== '') params.set('episode_id', String(episode_id));
  if (user_id !== undefined && user_id !== null && user_id !== '') params.set('user_id', String(user_id));

  const url = `${moderationBase()}/comments?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar comments');
  const d = data?.data ?? data;
  return {
    page: d?.page ?? page,
    limit: d?.limit ?? limit,
    total: d?.total ?? 0,
    totalPages: d?.totalPages ?? undefined,
    items: Array.isArray(d?.items) ? d.items : [],
  };
}

export async function listModerationGlobalChat({
  token,
  page = 1,
  limit = 20,
  q = '',
  is_deleted,
  parent_id,
  user_id,
  kind,
} = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 100)));
  if (q) params.set('q', String(q));
  if (is_deleted !== undefined && is_deleted !== null && is_deleted !== '') params.set('is_deleted', String(is_deleted));
  if (parent_id !== undefined && parent_id !== null && parent_id !== '') params.set('parent_id', String(parent_id));
  if (user_id !== undefined && user_id !== null && user_id !== '') params.set('user_id', String(user_id));
  if (kind !== undefined && kind !== null && kind !== '') params.set('kind', String(kind));

  const url = `${moderationBase()}/global-chat?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar global chat');
  const d = data?.data ?? data;
  return {
    page: d?.page ?? page,
    limit: d?.limit ?? limit,
    total: d?.total ?? 0,
    totalPages: d?.totalPages ?? undefined,
    items: Array.isArray(d?.items) ? d.items : [],
  };
}

export async function listModerationCommentReplies({ token, commentId, page = 1, limit = 50, q = '', is_deleted } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!commentId && commentId !== 0) throw new Error('commentId tidak valid');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 100)));
  if (q) params.set('q', String(q));
  if (is_deleted !== undefined && is_deleted !== null && is_deleted !== '') params.set('is_deleted', String(is_deleted));

  const url = `${moderationBase()}/comments/${commentId}/replies?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar comment replies');
  const d = data?.data ?? data;
  return {
    parent: d?.comment_id !== undefined ? { comment_id: d.comment_id } : undefined,
    page: d?.page ?? page,
    limit: d?.limit ?? limit,
    total: d?.total ?? 0,
    totalPages: d?.totalPages ?? undefined,
    items: Array.isArray(d?.items) ? d.items : [],
  };
}

export async function listModerationGlobalChatReplies({ token, messageId, page = 1, limit = 50, q = '', is_deleted } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!messageId && messageId !== 0) throw new Error('messageId tidak valid');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 100)));
  if (q) params.set('q', String(q));
  if (is_deleted !== undefined && is_deleted !== null && is_deleted !== '') params.set('is_deleted', String(is_deleted));

  const url = `${moderationBase()}/global-chat/${messageId}/replies?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar global chat replies');
  const d = data?.data ?? data;
  return {
    parent: d?.parent ?? undefined,
    page: d?.page ?? page,
    limit: d?.limit ?? limit,
    total: d?.total ?? 0,
    totalPages: d?.totalPages ?? undefined,
    items: Array.isArray(d?.items) ? d.items : [],
  };
}

export async function softDeleteComment({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!id) throw new Error('ID komentar tidak valid');
  const res = await fetch(`${moderationBase()}/comments/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal soft-delete comment');
}

export async function softDeleteCommentReply({ token, replyId }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!replyId) throw new Error('Reply ID tidak valid');
  const res = await fetch(`${moderationBase()}/comment-replies/${replyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal soft-delete comment reply');
}

export async function softDeleteGlobalChat({ token, messageId }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!messageId) throw new Error('Message ID tidak valid');
  const res = await fetch(`${moderationBase()}/global-chat/${messageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal soft-delete global chat');
}

export async function listNsfwQuarantineUploads({
  token,
  page = 1,
  limit = 20,
  status = '',
  verdict = '',
  action = '',
  user_id = '',
} = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 100)));
  if (status) params.set('status', String(status));
  if (verdict) params.set('verdict', String(verdict));
  if (action) params.set('action', String(action));
  if (user_id !== undefined && user_id !== null && user_id !== '') params.set('user_id', String(user_id));

  const url = `${nsfwQuarantineBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar gambar tertahan');
  const d = data?.data ?? data;
  return {
    page: d?.page ?? page,
    limit: d?.limit ?? limit,
    total: d?.total ?? 0,
    totalPages: d?.totalPages ?? undefined,
    items: Array.isArray(d?.items) ? d.items : [],
  };
}

export async function getNsfwQuarantineUploadDetail({ token, id } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!id && id !== 0) throw new Error('ID upload tidak valid');
  const res = await fetch(`${nsfwQuarantineBase()}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal mengambil detail gambar tertahan');
  return data?.data ?? data;
}

export async function reviewNsfwQuarantineUpload({ token, id, payload } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!id && id !== 0) throw new Error('ID upload tidak valid');
  const body = Object.fromEntries(
    Object.entries(payload || {}).filter(([, value]) => value !== undefined && value !== '')
  );
  const res = await fetch(`${nsfwQuarantineBase()}/${id}/review`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await handleJson(res, 'Gagal menyimpan hasil peninjauan');
  return data?.data ?? data;
}

export async function deleteNsfwQuarantineUpload({ token, id } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!id && id !== 0) throw new Error('ID upload tidak valid');
  return await handleJson(await fetch(`${nsfwQuarantineBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }), 'Gagal menghapus gambar tertahan');
}

export async function banUserFromNsfwQuarantineUpload({ token, id, days, permanent } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!id && id !== 0) throw new Error('ID upload tidak valid');
  const body = Object.fromEntries(
    Object.entries({ days, permanent }).filter(([, value]) => value !== undefined && value !== '')
  );
  return await handleJson(await fetch(`${nsfwQuarantineBase()}/${id}/ban`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }), 'Gagal memblokir akun');
}

export async function suspendUserFromNsfwQuarantineUpload({ token, id, days } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!id && id !== 0) throw new Error('ID upload tidak valid');
  const body = Object.fromEntries(
    Object.entries({ days }).filter(([, value]) => value !== undefined && value !== '')
  );
  return await handleJson(await fetch(`${nsfwQuarantineBase()}/${id}/suspend`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }), 'Gagal menangguhkan akun');
}

export async function clearWarnedFromNsfwQuarantineUpload({ token, id } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!id && id !== 0) throw new Error('ID upload tidak valid');
  return await handleJson(await fetch(`${nsfwQuarantineBase()}/${id}/clear-warned`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }), 'Gagal memulihkan status peringatan');
}

// ===== Admin Livechat (Ticket + Messages) =====
export async function listAdminLivechatQueue({ token, status = 'QUEUED', take = 50, skip = 0 } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (status) params.set('status', String(status));
  if (take !== undefined && take !== null && take !== '') params.set('take', String(take));
  if (skip !== undefined && skip !== null && skip !== '') params.set('skip', String(skip));

  const url = `${livechatAdminBase()}/queue?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil queue livechat');
  const d = data?.data ?? data;

  return {
    items: Array.isArray(d?.items) ? d.items : [],
    total: d?.total ?? 0,
    take: d?.take ?? take,
    skip: d?.skip ?? skip,
  };
}

export async function listAdminLivechatAdmins({ token, q = '', take = 50, skip = 0 } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (q !== undefined && q !== null && q !== '') params.set('q', String(q));
  if (take !== undefined && take !== null && take !== '') params.set('take', String(take));
  if (skip !== undefined && skip !== null && skip !== '') params.set('skip', String(skip));

  const url = `${livechatAdminBase()}/admins?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar admin livechat');
  const d = data?.data ?? data;

  return {
    items: Array.isArray(d?.items) ? d.items : [],
    total: d?.total ?? 0,
    take: d?.take ?? take,
    skip: d?.skip ?? skip,
  };
}

export async function getAdminLivechatStats({ token } = {}) {
  if (!token) throw new Error('Token tidak tersedia');

  const res = await fetch(`${livechatAdminBase()}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal mengambil statistik livechat');
  const d = data?.data ?? data;

  return {
    queued: Number(d?.queued ?? 0) || 0,
    active: Number(d?.active ?? 0) || 0,
    closed: Number(d?.closed ?? 0) || 0,
  };
}

export async function adminJoinLivechatTicket({ token, ticketId, device_id } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (ticketId === undefined || ticketId === null || ticketId === '') throw new Error('ticketId tidak valid');

  const res = await fetch(`${livechatAdminBase()}/tickets/${ticketId}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: device_id || 'admin-web-1' }),
  });

  const data = await handleJson(res, 'Gagal join ticket livechat');
  const d = data?.data ?? data;

  const serverToken =
    d?.access_token ??
    d?.accessToken ??
    d?.participant?.encrypted_session_key ??
    d?.participant?.encryptedSessionKey ??
    null;

  return {
    participant: d?.participant ?? null,
    access_token: serverToken,
    livechat_token: serverToken,
    public_key: d?.public_key ?? d?.publicKey ?? null,
    alg: d?.alg ?? null,
  };
}

export async function adminRemindLivechatTicket({ token, ticketId, title, body } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (ticketId === undefined || ticketId === null || ticketId === '') throw new Error('ticketId tidak valid');

  const payload = {};
  if (title !== undefined && title !== null && title !== '') payload.title = String(title);
  if (body !== undefined && body !== null && body !== '') payload.body = String(body);

  const res = await fetch(`${livechatAdminBase()}/tickets/${ticketId}/remind`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await handleJson(res, 'Gagal mengirim reminder livechat');
  return data?.data ?? data;
}

export async function adminListLivechatTicketMessages({
  token,
  ticketId,
  livechatToken,
  take,
  cursor,
  direction,
} = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (ticketId === undefined || ticketId === null || ticketId === '') throw new Error('ticketId tidak valid');
  if (!livechatToken) throw new Error('livechatToken tidak tersedia');

  const params = new URLSearchParams();
  if (take !== undefined && take !== null && take !== '') params.set('take', String(take));
  if (cursor !== undefined && cursor !== null && cursor !== '') params.set('cursor', String(cursor));
  if (direction !== undefined && direction !== null && direction !== '') params.set('direction', String(direction));
  const qs = params.toString();

  const url = `${livechatAdminBase()}/tickets/${ticketId}/messages${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'x-livechat-token': String(livechatToken) },
  });
  const data = await handleJson(res, 'Gagal mengambil pesan livechat');
  const d = data?.data ?? data;

  const items = Array.isArray(d?.items)
    ? d.items
    : Array.isArray(d?.messages)
      ? d.messages
      : [];

  return {
    items,
    ticket: d?.ticket ?? d?.room?.ticket ?? null,
    user_display: d?.user_display ?? d?.ticket?.user_display ?? null,
    assigned_admin: d?.assigned_admin ?? d?.ticket?.assigned_admin ?? null,
    total: d?.total ?? 0,
    take: d?.take ?? take,
    cursor: d?.cursor ?? cursor,
    nextCursor: d?.nextCursor ?? d?.next_cursor ?? d?.next_cursor_id ?? null,
    latestCursor: d?.latestCursor ?? d?.latest_cursor ?? d?.latest_cursor_id ?? null,
  };
}

export async function adminPostLivechatTicketMessage({ token, ticketId, livechatToken, payload } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (ticketId === undefined || ticketId === null || ticketId === '') throw new Error('ticketId tidak valid');
  if (!livechatToken) throw new Error('livechatToken tidak tersedia');

  const res = await fetch(`${livechatAdminBase()}/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'x-livechat-token': String(livechatToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const data = await handleJson(res, 'Gagal mengirim pesan livechat');
  return data?.data ?? data;
}

export async function adminTransferLivechatTicket({ token, ticketId, to_admin_id, reason } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (ticketId === undefined || ticketId === null || ticketId === '') throw new Error('ticketId tidak valid');

  const res = await fetch(`${livechatAdminBase()}/tickets/${ticketId}/transfer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to_admin_id, reason }),
  });
  const data = await handleJson(res, 'Gagal transfer ticket livechat');
  return data?.data ?? data;
}

export async function adminCloseLivechatTicket({ token, ticketId, note } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (ticketId === undefined || ticketId === null || ticketId === '') throw new Error('ticketId tidak valid');

  const res = await fetch(`${livechatAdminBase()}/tickets/${ticketId}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  const data = await handleJson(res, 'Gagal menutup ticket livechat');
  return data?.data ?? data;
}

export async function listSigninEventConfigs({ token, page = 1, limit = 20, is_active } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 100)));
  if (is_active !== undefined && is_active !== null && is_active !== '') params.set('is_active', String(is_active));
  const url = `${signinEventConfigsBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar sign-in event configs');
  return {
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
    total: data?.total ?? 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

export async function getSigninEventConfig({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${signinEventConfigsBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail sign-in event config');
}

export async function createSigninEventConfig({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${signinEventConfigsBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat sign-in event config');
}

export async function updateSigninEventConfig({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${signinEventConfigsBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal mengupdate sign-in event config');
}

export async function toggleSigninEventConfig({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${signinEventConfigsBase()}/${id}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal toggle sign-in event config');
}

export async function deleteSigninEventConfig({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${signinEventConfigsBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus sign-in event config');
}

export async function listWatchEventConfigs({ token, page = 1, limit = 20, is_active } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 100)));
  if (is_active !== undefined && is_active !== null && is_active !== '') params.set('is_active', String(is_active));
  const url = `${watchEventConfigsBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar watch event configs');
  return {
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
    total: data?.total ?? 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

export async function getWatchEventConfig({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${watchEventConfigsBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail watch event config');
}

export async function createWatchEventConfig({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${watchEventConfigsBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat watch event config');
}

export async function updateWatchEventConfig({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${watchEventConfigsBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal mengupdate watch event config');
}

export async function toggleWatchEventConfig({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${watchEventConfigsBase()}/${id}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal toggle watch event config');
}

export async function deleteWatchEventConfig({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${watchEventConfigsBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus watch event config');
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

export async function moderateAdminUser({ token, id, payload } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (id === undefined || id === null || id === '') throw new Error('id user tidak valid');
  const API_BASE = getApiBase();
  const body = Object.fromEntries(
    Object.entries(payload || {}).filter(([, value]) => value !== undefined && value !== '')
  );
  const res = await fetch(`${API_BASE}/admin/users/${id}/moderation`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await handleJson(res, 'Gagal memperbarui moderasi user');
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

export async function getAdminOverviewDailyStats({ token, days = 7 } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const API_BASE = getApiBase();
  const params = new URLSearchParams();
  if (days !== undefined && days !== null && days !== '') params.set('days', String(days));
  const url = `${API_BASE}/admin/overview/stats?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil statistik harian overview');
  return {
    days: data?.days ?? days,
    items: Array.isArray(data?.items) ? data.items : [],
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

// ===== Admin Anime Requests (permission: daftar-konten) =====
const animeRequestsBase = () => `${getApiBase()}/admin/anime-requests`;

export async function listAnimeRequests({ token, page = 1, limit = 20, status = '', user_id = '', admin_id = '', q = '' } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 100)));
  if (status) params.set('status', status);
  if (q) params.set('q', q);
  if (user_id !== '' && user_id !== undefined && user_id !== null) params.set('user_id', String(user_id));
  if (admin_id !== '' && admin_id !== undefined && admin_id !== null) params.set('admin_id', String(admin_id));
  const url = `${animeRequestsBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil daftar anime requests');
}

export async function getAnimeRequestStats({ token } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeRequestsBase()}/stats`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil statistik anime requests');
  const d = data?.data ?? data?.stats ?? data ?? {};
  return {
    pending: Number(d?.pending ?? d?.PENDING ?? 0) || 0,
    under_review: Number(d?.under_review ?? d?.UNDER_REVIEW ?? 0) || 0,
    upload_in_progress: Number(d?.upload_in_progress ?? d?.UPLOAD_IN_PROGRESS ?? 0) || 0,
    completed: Number(d?.completed ?? d?.COMPLETED ?? 0) || 0,
    rejected: Number(d?.rejected ?? d?.REJECTED ?? 0) || 0,
  };
}

export async function createAnimeRequest({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(animeRequestsBase(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat anime request');
}

export async function getAnimeRequestDetail({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeRequestsBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail anime request');
}

export async function updateAnimeRequest({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeRequestsBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui anime request');
}

export async function deleteAnimeRequest({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeRequestsBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus anime request');
}

export async function takeAnimeRequest({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeRequestsBase()}/${id}/take`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal mengambil anime request');
}

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

export async function listAnimeAliases({ token, q = '', limit = 20 }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 100)));
  const qs = params.toString();
  const url = `${animeBase()}/aliases${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar alias anime');
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    pagination: data?.pagination || null,
  };
}

export async function getAnimeDetail({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${animeBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail anime');
}

export async function createAnime({ token, payload }) {
  // payload should include required fields and `image` (File) per docs
  if (!token) throw new Error('Token tidak tersedia');
  const p0 = payload || {};
  const hasImageFile = p0?.image instanceof File;
  if (!hasImageFile) {
    const { image: _image, ...rest } = p0;
    const res = await fetch(`${animeBase()}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(Object.entries(rest).filter(([_, v]) => v !== undefined))),
    });
    return await handleJson(res, 'Gagal membuat anime');
  }
  const fd = new FormData();
  const p = p0;
  if (p?.image instanceof File) fd.set('image', p.image);
  Object.entries(p).forEach(([k, v]) => {
    if (k === 'image') return;
    if (v === undefined) return;
    if (v === null) return;
    if (Array.isArray(v) || (v && typeof v === 'object')) fd.set(k, JSON.stringify(v));
    else fd.set(k, String(v));
  });
  const res = await fetch(`${animeBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return await handleJson(res, 'Gagal membuat anime');
}

export async function updateAnime({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const p0 = payload || {};
  const fd = new FormData();
  const p = p0;
  if (p?.image instanceof File) fd.set('image', p.image);
  Object.entries(p).forEach(([k, v]) => {
    if (k === 'image') return;
    if (v === undefined) return;
    if (v === null) return;
    if (Array.isArray(v) || (v && typeof v === 'object')) fd.set(k, JSON.stringify(v));
    else fd.set(k, String(v));
  });
  const res = await fetch(`${animeBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
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
  const p0 = payload || {};
  if (p0?.thumbnail_episode && !(p0?.image instanceof File)) {
    const { image: _image, ...rest } = p0;
    const res = await fetch(`${animeBase()}/${animeId}/episodes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(Object.entries(rest).filter(([_, v]) => v !== undefined))),
    });
    return await handleJson(res, 'Gagal membuat episode');
  }
  const fd = new FormData();
  const p = p0;
  if (p?.image instanceof File) fd.set('image', p.image);
  Object.entries(p).forEach(([k, v]) => {
    if (k === 'image') return;
    if (v === undefined) return;
    if (v === null) return;
    if (Array.isArray(v) || (v && typeof v === 'object')) fd.set(k, JSON.stringify(v));
    else fd.set(k, String(v));
  });
  const res = await fetch(`${animeBase()}/${animeId}/episodes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
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
  const p0 = payload || {};
  if (p0?.thumbnail_episode && !(p0?.image instanceof File)) {
    const { image: _image, ...rest } = p0;
    const res = await fetch(`${episodesBase()}/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(Object.entries(rest).filter(([_, v]) => v !== undefined))),
    });
    return await handleJson(res, 'Gagal memperbarui episode');
  }
  const fd = new FormData();
  const p = p0;
  if (p?.image instanceof File) fd.set('image', p.image);
  Object.entries(p).forEach(([k, v]) => {
    if (k === 'image') return;
    if (v === undefined) return;
    if (v === null) return;
    if (Array.isArray(v) || (v && typeof v === 'object')) fd.set(k, JSON.stringify(v));
    else fd.set(k, String(v));
  });
  const res = await fetch(`${episodesBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
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

// ===== Admin Episode Video Issues (permission: episode-video-issues) =====
const episodeVideoIssuesBase = () => `${getApiBase()}/admin/episode-video-issues`;

// Reasons
export async function listEpisodeVideoIssueReasons({ token, include_inactive = false } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (include_inactive) params.set('include_inactive', 'true');
  const url = `${episodeVideoIssuesBase()}/reasons${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil daftar reasons');
}

export async function createEpisodeVideoIssueReason({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${episodeVideoIssuesBase()}/reasons`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat reason');
}

export async function updateEpisodeVideoIssueReason({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${episodeVideoIssuesBase()}/reasons/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui reason');
}

export async function deleteEpisodeVideoIssueReason({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${episodeVideoIssuesBase()}/reasons/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus reason');
}

// Reports
export async function listEpisodeVideoIssueReports({ token, page = 1, limit = 20, status = '', episode_id = '', user_id = '', reason_id = '' } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 100)));
  if (status) params.set('status', status);
  if (episode_id !== '' && episode_id !== undefined && episode_id !== null) params.set('episode_id', String(episode_id));
  if (user_id !== '' && user_id !== undefined && user_id !== null) params.set('user_id', String(user_id));
  if (reason_id !== '' && reason_id !== undefined && reason_id !== null) params.set('reason_id', String(reason_id));
  const url = `${episodeVideoIssuesBase()}/reports?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil daftar reports');
}

export async function updateEpisodeVideoIssueReport({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${episodeVideoIssuesBase()}/reports/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui report');
}

export async function updateEpisodeVideoIssueReportStatus({ token, id, status }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${episodeVideoIssuesBase()}/reports/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return await handleJson(res, 'Gagal memperbarui status report');
}

export async function deleteEpisodeVideoIssueReport({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${episodeVideoIssuesBase()}/reports/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus report');
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

const inAppAnnouncementBase = () => `${getApiBase()}/admin/in-app-announcement`;

export async function updateWatchLiteCoinPerMinute({ token, value }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${settingsBase()}/watch-lite-coin-per-minute`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ watch_lite_coin_per_minute: value }),
  });
  const data = await handleJson(res, 'Gagal memperbarui watch lite coin per minute');
  return data?.settings || null;
}

export async function getInAppAnnouncement({ token }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(inAppAnnouncementBase(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal mengambil in-app announcement');
  return data?.data || data?.announcement || null;
}

export async function updateInAppAnnouncement({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(inAppAnnouncementBase(), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const data = await handleJson(res, 'Gagal memperbarui in-app announcement');
  return data?.data || data?.announcement || null;
}

export async function updateInAppAnnouncementMessage({ token, message }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${inAppAnnouncementBase()}/message`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const data = await handleJson(res, 'Gagal memperbarui pesan in-app announcement');
  return data?.data || data?.announcement || null;
}

export async function deleteInAppAnnouncement({ token }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(inAppAnnouncementBase(), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus in-app announcement');
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
export async function listTopupRequests({ token, userId = '', status = '', q = '', page = 1, limit = 20 }) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (userId) params.set('userId', String(userId));
  if (status) params.set('status', status);
  if (q) params.set('q', String(q));
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
    totalPages: pg.totalPages ?? undefined,
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

// Update topup request status for admin moderation: APPROVED|REJECTED
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
  if (form?.badge_url && !(form?.file instanceof File)) {
    const payload = {
      code: form?.code,
      name: form?.name,
      description: form?.description,
      badge_url: form?.badge_url,
      poin_collection: form?.poin_collection,
      is_active: form?.is_active,
      sort_order: form?.sort_order,
    };
    const res = await fetch(badgesBase(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined))),
    });
    return await handleJson(res, 'Gagal membuat badge');
  }
  const fd = new FormData();
  if (form?.code) fd.set('code', form.code);
  if (form?.name) fd.set('name', form.name);
  if (form?.description) fd.set('description', form.description);
  if (form?.poin_collection !== undefined && form.poin_collection !== null && form.poin_collection !== '') fd.set('poin_collection', String(form.poin_collection));
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
  if (form?.badge_url && !(form?.file instanceof File)) {
    const payload = {
      code: form?.code,
      name: form?.name,
      description: form?.description,
      badge_url: form?.badge_url,
      poin_collection: form?.poin_collection,
      is_active: form?.is_active,
      sort_order: form?.sort_order,
    };
    const res = await fetch(`${badgesBase()}/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined))),
    });
    return await handleJson(res, 'Gagal memperbarui badge');
  }
  const fd = new FormData();
  if (form?.code !== undefined) fd.set('code', form.code);
  if (form?.name !== undefined) fd.set('name', form.name);
  if (form?.description !== undefined) fd.set('description', form.description ?? '');
  if (form?.poin_collection !== undefined) fd.set('poin_collection', form.poin_collection === null || form.poin_collection === '' ? '' : String(form.poin_collection));
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

export async function refreshBadgeDimensions({ token, id, badge_url } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!id && id !== 0) throw new Error('id badge tidak valid');

  const payload = {};
  if (badge_url) payload.badge_url = badge_url;

  const res = await fetch(`${badgesBase()}/${id}/refresh-dimensions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await handleJson(res, 'Gagal refresh dimensi badge');
}

// Badge Ownership (SUPERADMIN only)
export async function listBadgeOwners({ token, badgeId, page = 1, limit = 50, q = '', active = '' } = {}) {
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
  if (form?.image_url && !(form?.file instanceof File)) {
    const payload = {
      code: form?.code,
      name: form?.name,
      description: form?.description,
      image_url: form?.image_url,
      poin_collection: form?.poin_collection,
      is_active: form?.is_active,
      sort_order: form?.sort_order,
    };
    const res = await fetch(stickersBase(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined))),
    });
    return await handleJson(res, 'Gagal membuat stiker');
  }
  const fd = new FormData();
  if (form?.code) fd.set('code', form.code);
  if (form?.name) fd.set('name', form.name);
  if (form?.description) fd.set('description', form.description);
  if (form?.poin_collection !== undefined && form.poin_collection !== null && form.poin_collection !== '') fd.set('poin_collection', String(form.poin_collection));
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
  if (form?.image_url && !(form?.file instanceof File)) {
    const payload = {
      code: form?.code,
      name: form?.name,
      description: form?.description,
      image_url: form?.image_url,
      poin_collection: form?.poin_collection,
      is_active: form?.is_active,
      sort_order: form?.sort_order,
    };
    const res = await fetch(`${stickersBase()}/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined))),
    });
    return await handleJson(res, 'Gagal memperbarui stiker');
  }
  const fd = new FormData();
  if (form?.code !== undefined) fd.set('code', form.code);
  if (form?.name !== undefined) fd.set('name', form.name);
  if (form?.description !== undefined) fd.set('description', form.description);
  if (form?.poin_collection !== undefined) fd.set('poin_collection', form.poin_collection === null || form.poin_collection === '' ? '' : String(form.poin_collection));
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
  const p0 = payload || {};
  if (p0?.image_url && !(p0?.file instanceof File)) {
    const { file: _file, ...rest } = p0;
    const res = await fetch(`${waifuBase()}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(Object.entries(rest).filter(([_, v]) => v !== undefined))),
    });
    return await handleJson(res, 'Gagal membuat waifu');
  }
  const fd = new FormData();
  const p = p0;
  if (p?.file instanceof File) fd.set('image', p.file);
  Object.entries(p).forEach(([k, v]) => {
    if (k === 'file') return;
    if (v === undefined) return;
    if (v === null) return;
    if (Array.isArray(v) || (v && typeof v === 'object')) fd.set(k, JSON.stringify(v));
    else fd.set(k, String(v));
  });
  const res = await fetch(`${waifuBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return await handleJson(res, 'Gagal membuat waifu');
}

// Admin: Update waifu
export async function updateWaifu({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const p0 = payload || {};
  if (p0?.image_url && !(p0?.file instanceof File)) {
    const { file: _file, ...rest } = p0;
    const res = await fetch(`${waifuBase()}/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(Object.entries(rest).filter(([_, v]) => v !== undefined))),
    });
    return await handleJson(res, 'Gagal memperbarui waifu');
  }
  const fd = new FormData();
  const p = p0;
  if (p?.file instanceof File) fd.set('image', p.file);
  Object.entries(p).forEach(([k, v]) => {
    if (k === 'file') return;
    if (v === undefined) return;
    if (v === null) return;
    if (Array.isArray(v) || (v && typeof v === 'object')) fd.set(k, JSON.stringify(v));
    else fd.set(k, String(v));
  });
  const res = await fetch(`${waifuBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
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
    headers: { Authorization: `Bearer ${token}` },
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

// ===== VIP Feature Requirements Admin =====
const vipFeatureRequirementsBase = () => `${getApiBase()}/admin/vip-feature-requirements`;

// ===== VIP Tiers Admin =====
const vipTiersBase = () => `${getApiBase()}/admin/vip-tiers`;

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

export async function listVipFeatureRequirements({ token, page = 1, limit = 50, q = '', enabled } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 200)));
  if (q) params.set('q', q);
  if (enabled !== undefined && enabled !== null && enabled !== '') params.set('enabled', String(enabled));
  const url = `${vipFeatureRequirementsBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar VIP feature requirements');
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    pagination: data?.pagination,
  };
}

export async function getVipFeatureRequirement({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipFeatureRequirementsBase()}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal mengambil detail VIP feature requirement');
}

export async function updateVipFeatureRequirement({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipFeatureRequirementsBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal mengupdate VIP feature requirement');
}

export async function upsertVipFeatureRequirementByFeature({ token, feature, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipFeatureRequirementsBase()}/by-feature/${encodeURIComponent(String(feature))}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal upsert VIP feature requirement');
}

export async function toggleVipFeatureRequirement({ token, id, is_enabled }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipFeatureRequirementsBase()}/${id}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_enabled }),
  });
  return await handleJson(res, 'Gagal mengubah status VIP feature requirement');
}

export async function listVipTiers({ token, page = 1, limit = 50, q = '', active } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(Math.min(Math.max(1, limit), 200)));
  if (q) params.set('q', q);
  if (active !== undefined && active !== null && active !== '') params.set('active', String(active));
  const url = `${vipTiersBase()}?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await handleJson(res, 'Gagal mengambil daftar VIP tiers');
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    pagination: data?.pagination,
  };
}

export async function getVipTier({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipTiersBase()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return await handleJson(res, 'Gagal mengambil detail VIP tier');
}

export async function createVipTier({ token, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipTiersBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal membuat VIP tier');
}

export async function updateVipTier({ token, id, payload }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipTiersBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return await handleJson(res, 'Gagal memperbarui VIP tier');
}

export async function toggleVipTierStatus({ token, id, is_active }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipTiersBase()}/${id}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active }),
  });
  return await handleJson(res, 'Gagal mengubah status VIP tier');
}

export async function deleteVipTier({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${vipTiersBase()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal menghapus VIP tier');
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
  const p0 = payload || {};
  if (p0?.cover_manga && !(p0?.cover instanceof File)) {
    const { cover: _cover, ...rest } = p0;
    const res = await fetch(`${mangaBase()}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(Object.entries(rest).filter(([_, v]) => v !== undefined))),
    });
    return await handleJson(res, 'Gagal membuat manga');
  }
  const fd = new FormData();
  const p = p0;
  if (p?.cover instanceof File) fd.set('cover', p.cover);
  Object.entries(p).forEach(([k, v]) => {
    if (k === 'cover') return;
    if (v === undefined) return;
    if (v === null) return;
    if (Array.isArray(v) || (v && typeof v === 'object')) fd.set(k, JSON.stringify(v));
    else fd.set(k, String(v));
  });
  const res = await fetch(`${mangaBase()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
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
  const p0 = payload || {};
  if (p0?.cover_manga && !(p0?.cover instanceof File)) {
    const { cover: _cover, ...rest } = p0;
    const res = await fetch(`${mangaBase()}/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(Object.entries(rest).filter(([_, v]) => v !== undefined))),
    });
    return await handleJson(res, 'Gagal memperbarui manga');
  }
  const fd = new FormData();
  const p = p0;
  if (p?.cover instanceof File) fd.set('cover', p.cover);
  Object.entries(p).forEach(([k, v]) => {
    if (k === 'cover') return;
    if (v === undefined) return;
    if (v === null) return;
    if (Array.isArray(v) || (v && typeof v === 'object')) fd.set(k, JSON.stringify(v));
    else fd.set(k, String(v));
  });
  const res = await fetch(`${mangaBase()}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
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

export async function commitMangaChapterPages({ token, mangaId, chapterNumber, replace = false, title, pages }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!mangaId && mangaId !== 0) throw new Error('mangaId tidak valid');
  if (chapterNumber === undefined || chapterNumber === null || chapterNumber === '') throw new Error('chapterNumber tidak valid');
  if (!Array.isArray(pages) || pages.length === 0) throw new Error('pages wajib diisi');

  const payload = { replace: !!replace, pages };
  if (title !== undefined) payload.title = title;
  const res = await fetch(`${mangaBase()}/${mangaId}/chapters/${chapterNumber}/pages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await handleJson(res, 'Gagal commit pages chapter');
}

export async function refreshMangaChapterDimensions({ token, mangaId, chapterNumber, only_missing = true }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!mangaId && mangaId !== 0) throw new Error('mangaId tidak valid');
  if (chapterNumber === undefined || chapterNumber === null || chapterNumber === '') throw new Error('chapterNumber tidak valid');
  const res = await fetch(`${mangaBase()}/${mangaId}/chapters/${chapterNumber}/refresh-dimensions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ only_missing: only_missing !== undefined ? !!only_missing : true }),
  });
  return await handleJson(res, 'Gagal refresh dimensi chapter');
}

export async function refreshPageDimensions({ token, id }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!id && id !== 0) throw new Error('id page tidak valid');
  const res = await fetch(`${getApiBase()}/admin/pages/${id}/refresh-dimensions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal refresh dimensi page');
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

export async function grabMangaChapterPlan({ token, mangaId, chapterNumber, url, title, plan_only = true }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!mangaId && mangaId !== 0) throw new Error('mangaId tidak valid');
  if (chapterNumber === undefined || chapterNumber === null || chapterNumber === '') throw new Error('chapterNumber tidak valid');
  if (!url) throw new Error('url wajib diisi');
  const res = await fetch(`${mangaBase()}/${mangaId}/chapters/${chapterNumber}/grab`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url, title, plan_only: plan_only !== undefined ? !!plan_only : false }),
  });
  return await handleJson(res, 'Gagal grab chapter (plan)');
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

export async function grabKomikuRangePlan({ token, mangaId, sample_url, start, end, title_prefix, plan_only = true }) {
  if (!token) throw new Error('Token tidak tersedia');
  const res = await fetch(`${mangaBase()}/${mangaId}/komiku/grab-range`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sample_url, start, end, title_prefix, plan_only: plan_only !== undefined ? !!plan_only : false }),
  });
  return await handleJson(res, 'Gagal grab Komiku range');
}

export async function getMangaKomikuGrabJob({ token, mangaId, jobId }) {
  if (!token) throw new Error('Token tidak tersedia');
  if (!mangaId && mangaId !== 0) throw new Error('mangaId tidak valid');
  if (!jobId && jobId !== 0) throw new Error('jobId tidak valid');
  const res = await fetch(`${mangaBase()}/${mangaId}/komiku/grab-jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleJson(res, 'Gagal mengambil progres grab manga');
}

export async function listGlobalMangaGrabStatus({ token, status, limit = 20 } = {}) {
  if (!token) throw new Error('Token tidak tersedia');
  const params = new URLSearchParams();
  if (status) params.set('status', String(status));
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  const res = await fetch(`${mangaBase()}/grab-status${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleJson(res, 'Gagal mengambil status grab manga');
  const d = data?.data ?? data ?? {};
  return {
    filter: d?.filter ?? null,
    items: Array.isArray(d?.items) ? d.items : [],
  };
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
