'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Users, ShieldBan, Search, Clock3, UserRound, Ban, ShieldAlert, RefreshCcw, ChevronLeft, ChevronRight, Mail, User, KeyRound } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAdminUsers, createAdminUser, updateAdminUser, moderateAdminUser, deleteAdminUser } from '@/lib/api';

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

export default function KelolaUserPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  // Hooks for page state MUST be declared before any conditional returns
  // Real users state from API
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  const [form, setForm] = useState({ id: null, email: '', username: '', password: '', account_status: '', account_status_reason: '' });
  const [mode, setMode] = useState('add'); // add | edit
  const [moderation, setModeration] = useState({ action: 'WARN', reason: '', ban_type: 'PERMANENT', suspended_until: '', banned_until: '', ban_ip: false, ip_reason: '', ip_banned_until: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moderating, setModerating] = useState(false);
  const resetForm = () => setForm({ id: null, email: '', username: '', password: '', account_status: '', account_status_reason: '' });
  const resetModeration = () => setModeration({ action: 'WARN', reason: '', ban_type: 'PERMANENT', suspended_until: '', banned_until: '', ban_ip: false, ip_reason: '', ip_banned_until: '' });

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadUsers = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = { page, limit, q, ...opts };
      const data = await listAdminUsers({ token, ...params });
      setUsers(data.items || []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat users');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, user]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers({ page: 1 });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    if (mode === 'add') {
      if (!form.email || !form.username || !form.password) {
        setSubmitting(false);
        return toast.error('Email, username, dan password wajib diisi');
      }
      try {
        const token = getSession()?.token;
        await createAdminUser({ token, email: form.email, username: form.username, password: form.password });
        toast.success('User ditambahkan');
        resetForm();
        setPage(1);
        await loadUsers({ page: 1 });
      } catch (err) {
        toast.error(err?.message || 'Gagal menambah user');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!form.email && !form.username && !form.account_status && !form.account_status_reason) {
        setSubmitting(false);
        return toast.error('Isi salah satu: username, email, status akun, atau alasan status');
      }
      try {
        const token = getSession()?.token;
        await updateAdminUser({ token, id: form.id, username: form.username, email: form.email, account_status: form.account_status, account_status_reason: form.account_status_reason });
        toast.success('User diperbarui');
        setMode('add');
        resetForm();
        await loadUsers();
      } catch (err) {
        toast.error(err?.message || 'Gagal memperbarui user');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const onEdit = (u) => {
    setMode('edit');
    setForm({ id: u.id, email: u.email, username: u.username, password: '', account_status: u.account_status || '', account_status_reason: u.account_status_reason || '' });
    resetModeration();
  };

  const onModerate = async (e) => {
    e.preventDefault();
    if (!form?.id) return toast.error('Pilih user dulu untuk dimoderasi');
    const action = String(moderation.action || '').toUpperCase();
    const reason = String(moderation.reason || '').trim();
    const banType = String(moderation.ban_type || 'PERMANENT').toUpperCase();
    const banIp = !!moderation.ban_ip;
    const ipReason = String(moderation.ip_reason || '').trim();
    if (action === 'SUSPEND' && !moderation.suspended_until) return toast.error('Tentukan waktu suspend sampai kapan');
    if (action === 'BAN' && banType === 'TEMPORARY' && !moderation.banned_until) return toast.error('Tentukan waktu ban sementara sampai kapan');

    try {
      setModerating(true);
      const token = getSession()?.token;
      const payload = {
        action,
        reason: reason || undefined,
        ban_type: action === 'BAN' ? banType : undefined,
        suspended_until: action === 'SUSPEND' && moderation.suspended_until ? new Date(moderation.suspended_until).toISOString() : undefined,
        banned_until: action === 'BAN' && banType === 'TEMPORARY' && moderation.banned_until ? new Date(moderation.banned_until).toISOString() : undefined,
        ban_ip: banIp,
        ip_reason: banIp && ipReason ? ipReason : undefined,
        ip_banned_until: banIp && moderation.ip_banned_until ? new Date(moderation.ip_banned_until).toISOString() : undefined,
      };
      const item = await moderateAdminUser({ token, id: form.id, payload });
      toast.success(`Moderasi ${action} berhasil diterapkan`);
      setUsers((prev) => prev.map((u) => (u.id === form.id ? { ...u, ...item } : u)));
      setForm((f) => ({
        ...f,
        account_status: item?.account_status || f.account_status,
        account_status_reason: item?.account_status_reason || f.account_status_reason,
      }));
      resetModeration();
      await loadUsers();
    } catch (err) {
      toast.error(err?.message || 'Gagal memoderasi user');
    } finally {
      setModerating(false);
    }
  };

  const onRequestDelete = (target) => {
    setConfirmTarget(target);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      const token = getSession()?.token;
      await deleteAdminUser({ token, id: confirmTarget.id });
      toast.success('User dihapus');
      if (mode === 'edit' && form.id === confirmTarget.id) {
        setMode('add');
        resetForm();
      }
      await loadUsers();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus user');
    } finally {
      setConfirmOpen(false);
      setConfirmTarget(null);
      setDeleting(false);
    }
  };

  const onCancelDelete = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const summary = useMemo(() => {
    return users.reduce((acc, userItem) => {
      const status = String(userItem?.account_status || 'ACTIVE').toUpperCase();
      acc.total += 1;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, { total: 0, ACTIVE: 0, WARNED: 0, SUSPENDED: 0, BANNED: 0 });
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const isSuspend = moderation.action === 'SUSPEND';
  const isBan = moderation.action === 'BAN';
  const isUnban = moderation.action === 'UNBAN';
  const isTemporaryBan = isBan && moderation.ban_type === 'TEMPORARY';

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 min-w-0"
    >
      {loading || !user ? null : (
        <>
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5" />
                <span className="label uppercase">Moderasi User</span>
              </div>
              <h1 className="page-title">Kelola User</h1>
              <p className="label mt-1">Atur data akun pengguna, pantau statusnya dengan lebih jelas.</p>
            </div>
            <button type="button" onClick={() => loadUsers()} disabled={loadingList} className="btn btn--secondary btn--sm flex-shrink-0">
              <RefreshCcw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
              {loadingList ? 'Memuat...' : 'Refresh'}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="stat-grid">
            <SummaryCard label="Total" value={summary.total} />
            <SummaryCard label="Active" value={summary.ACTIVE} />
            <SummaryCard label="Warned" value={summary.WARNED} />
            <SummaryCard label="Suspended" value={summary.SUSPENDED} />
            <SummaryCard label="Banned" value={summary.BANNED} />
            <SummaryCard label="Halaman" value={`${page}/${totalPages}`} />
          </div>

          {/* Main Layout */}
          <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="space-y-4">
              {/* Search */}
              <form onSubmit={onSearch} className="filter-bar">
                <div className="flex items-center gap-2 label mb-3"><Search className="w-4 h-4" /> Pencarian User</div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px]">
                  <div className="input-icon">
                    <Search className="input-icon__icon" />
                    <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari username atau email" className="input" />
                  </div>
                  <button type="submit" disabled={loadingList} className="btn btn--primary btn--sm">
                    {loadingList ? '...' : 'Cari'}
                  </button>
                </div>
              </form>

              {/* User Form */}
              <form onSubmit={onSubmit} className="card p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="label uppercase">Profil Akun</div>
                    <div className="section-title">{mode === 'add' ? 'Tambah User Baru' : `Edit User #${form.id}`}</div>
                  </div>
                  {mode === 'edit' && (
                    <button type="button" onClick={() => { setMode('add'); resetForm(); resetModeration(); }} className="btn btn--secondary btn--sm">
                      Reset
                    </button>
                  )}
                </div>

                <div className="grid gap-3">
                  <Field label="Email">
                    <div className="input-icon">
                      <Mail className="input-icon__icon" />
                      <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email user" className="input" />
                    </div>
                  </Field>
                  <Field label="Username">
                    <div className="input-icon">
                      <User className="input-icon__icon" />
                      <input type="text" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="Username" className="input" />
                    </div>
                  </Field>
                  <Field label="Password">
                    {mode === 'add' ? (
                      <div className="input-icon">
                        <KeyRound className="input-icon__icon" />
                        <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password" className="input" />
                      </div>
                    ) : (
                      <div className="input w-full text-sm" style={{ color: 'var(--muted)' }}>Password tidak bisa diubah dari halaman ini.</div>
                    )}
                  </Field>
                  <Field label="Status Akun">
                    <select value={form.account_status} onChange={(e) => setForm((f) => ({ ...f, account_status: e.target.value }))} className="select w-full">
                      <option value="">Status akun (opsional)</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="WARNED">WARNED</option>
                      <option value="BANNED">BANNED</option>
                    </select>
                  </Field>
                  <Field label="Alasan Status">
                    <textarea value={form.account_status_reason} onChange={(e) => setForm((f) => ({ ...f, account_status_reason: e.target.value }))} maxLength={500} placeholder="Alasan status akun" rows={3} className="input w-full resize-y" />
                  </Field>
                </div>

                <button type="submit" disabled={submitting} className="btn btn--primary w-full">
                  {submitting ? (mode === 'add' ? 'Menambah...' : 'Menyimpan...') : (mode === 'add' ? (<><Plus className="w-4 h-4" /> Tambah User</>) : (<><Pencil className="w-4 h-4" /> Simpan Perubahan</>))}
                </button>
              </form>

              {mode === 'edit' && (
                <form onSubmit={onModerate} className="card p-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldAlert className="w-4 h-4" />
                      <span className="label uppercase">Panel Moderasi</span>
                    </div>
                    <div className="section-title">Aksi untuk user #{form.id}</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Action">
                      <select value={moderation.action} onChange={(e) => setModeration((m) => ({ ...m, action: e.target.value }))} className="select w-full">
                        <option value="WARN">WARN</option>
                        <option value="SUSPEND">SUSPEND</option>
                        <option value="BAN">BAN</option>
                        <option value="UNBAN">UNBAN</option>
                      </select>
                    </Field>
                    <Field label="Ban Type">
                      <select value={moderation.ban_type} onChange={(e) => setModeration((m) => ({ ...m, ban_type: e.target.value }))} disabled={!isBan} className="select w-full">
                        <option value="PERMANENT">PERMANENT</option>
                        <option value="TEMPORARY">TEMPORARY</option>
                      </select>
                    </Field>
                    <Field label="Reason">
                      <textarea value={moderation.reason} onChange={(e) => setModeration((m) => ({ ...m, reason: e.target.value }))} rows={3} maxLength={500} placeholder="Alasan moderasi" className="input w-full resize-y" />
                    </Field>
                    <div>
                      {isUnban ? (
                        <p className="label p-3" style={{ border: '1px solid var(--border-muted)' }}>Unban akan mengaktifkan kembali akun dan membersihkan ban IP.</p>
                      ) : (
                        <label className="flex items-center gap-3 p-3 cursor-pointer" style={{ border: '2px solid var(--border)' }}>
                          <input type="checkbox" checked={moderation.ban_ip} onChange={(e) => setModeration((m) => ({ ...m, ban_ip: e.target.checked }))} />
                          <span className="text-sm font-bold">Ban IP juga</span>
                        </label>
                      )}
                    </div>
                  </div>
                  {isSuspend && (
                    <Field label="Suspend Until">
                      <input type="datetime-local" value={moderation.suspended_until} onChange={(e) => setModeration((m) => ({ ...m, suspended_until: e.target.value }))} className="input w-full" />
                    </Field>
                  )}
                  {isTemporaryBan && (
                    <Field label="Banned Until">
                      <input type="datetime-local" value={moderation.banned_until} onChange={(e) => setModeration((m) => ({ ...m, banned_until: e.target.value }))} className="input w-full" />
                    </Field>
                  )}
                  {moderation.ban_ip && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="IP Ban Until">
                        <input type="datetime-local" value={moderation.ip_banned_until} onChange={(e) => setModeration((m) => ({ ...m, ip_banned_until: e.target.value }))} className="input w-full" />
                      </Field>
                      <Field label="IP Reason">
                        <textarea value={moderation.ip_reason} onChange={(e) => setModeration((m) => ({ ...m, ip_reason: e.target.value }))} rows={3} maxLength={500} placeholder="Alasan ban IP" className="input w-full resize-y" />
                      </Field>
                    </div>
                  )}
                  <button type="submit" disabled={moderating} className="btn btn--danger w-full">
                    {moderating ? 'Menerapkan moderasi...' : (<><Ban className="w-4 h-4" /> Terapkan Moderasi</>)}
                  </button>
                </form>
              )}
            </div>

            {/* User List */}
            <div className="space-y-4">
              {users.map((u) => (
                <div key={u.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 flex-shrink-0 overflow-hidden" style={{ border: '2px solid var(--border)', background: 'var(--muted-bg)' }}>
                        {u.profile?.avatar_url ? <img src={u.profile.avatar_url} alt={u.username} className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <UserRound className="w-6 h-6 m-auto mt-3" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-base">{u.profile?.full_name || u.username || '-'}</span>
                          <span className="badge">{String(u.account_status || 'ACTIVE').toUpperCase()}</span>
                        </div>
                        <div className="label break-all">@{u.username || '-'} · {u.email || '-'}</div>
                        <div className="mono text-xs" style={{ color: 'var(--muted)' }}>ID {u.userID || u.id} · {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEdit(u)} disabled={deleting || moderating} className="btn btn--secondary btn--sm">
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                      <button onClick={() => onRequestDelete(u)} disabled={deleting || moderating} className="btn btn--danger btn--sm">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <MiniInfo label="Status" value={u.account_status || 'ACTIVE'} />
                    <MiniInfo label="VIP" value={u.vip?.status ? `Level ${u.vip?.vip_level || 0}` : 'Tidak aktif'} />
                    <MiniInfo label="Full Name" value={u.profile?.full_name || '-'} />
                    <MiniInfo label="Reason" value={u.account_status_reason || '-'} />
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="card p-8 text-center">
                  <div className="section-title">{loadingList ? 'Memuat user...' : 'Belum ada user.'}</div>
                  <div className="label mt-2">Coba ubah kata kunci pencarian atau refresh data.</div>
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-3 flex-wrap">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn btn--secondary btn--sm">
              <ChevronLeft className="w-4 h-4" /> Sebelumnya
            </button>
            <span className="mono text-sm font-bold">Halaman {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn btn--secondary btn--sm">
              Berikutnya <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Confirm Delete Modal */}
          {confirmOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center">
              <div className="absolute inset-0 bg-black/50" onClick={onCancelDelete} />
              <div className="modal relative z-10 w-[92%] max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <Trash2 className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <h3 className="section-title">Hapus User?</h3>
                    <p className="label break-words">{confirmTarget?.email} (@{confirmTarget?.username})</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={onCancelDelete} disabled={deleting} className="btn btn--secondary btn--sm">Batal</button>
                  <button onClick={onConfirmDelete} disabled={deleting} className="btn btn--danger btn--sm">
                    {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="label uppercase">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>{value}</div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="p-2" style={{ border: '1px solid var(--border-muted)' }}>
      <div className="label uppercase mb-1">{label}</div>
      <div className="mono text-xs font-bold break-words">{value}</div>
    </div>
  );
}
