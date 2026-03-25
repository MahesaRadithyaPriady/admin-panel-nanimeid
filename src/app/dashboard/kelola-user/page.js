'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Plus, Pencil, Trash2, Users, ShieldBan, Search, Clock3, UserRound, Ban, ShieldAlert, RefreshCcw } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAdminUsers, createAdminUser, updateAdminUser, moderateAdminUser, deleteAdminUser } from '@/lib/api';

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
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[28px] border-4 p-5 md:p-6" style={{ boxShadow: '10px 10px 0 #000', background: 'linear-gradient(135deg, var(--panel-bg) 0%, #e0f2fe 100%)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-1 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: '#fef3c7', color: '#92400e' }}>
                    <ShieldBan className="size-4" /> Moderasi User
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3"><Users className="size-7" /> Kelola User</h2>
                    <p className="mt-2 max-w-2xl text-sm md:text-base font-semibold opacity-80">
                      Atur data akun pengguna, pantau statusnya dengan lebih jelas, dan lakukan tindakan moderasi dengan alur yang rapi, cepat, dan nyaman digunakan.
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => loadUsers()} disabled={loadingList} className="inline-flex items-center gap-2 rounded-2xl border-4 px-4 py-3 font-black disabled:opacity-60" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)', borderColor: 'var(--panel-border)' }}>
                  <RefreshCcw className={`size-4 ${loadingList ? 'animate-spin' : ''}`} />
                  {loadingList ? 'Memuat...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-[28px] border-4 p-5" style={{ boxShadow: '10px 10px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <SummaryCard label="Total" value={summary.total} tone="neutral" />
              <SummaryCard label="Active" value={summary.ACTIVE} tone="active" />
              <SummaryCard label="Warned" value={summary.WARNED} tone="warned" />
              <SummaryCard label="Suspended" value={summary.SUSPENDED} tone="suspended" />
              <SummaryCard label="Banned" value={summary.BANNED} tone="banned" />
              <SummaryCard label="Halaman" value={`${page}/${totalPages}`} tone="neutral" />
            </div>
          </div>

      {/* Search */}
      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-4">
          <form onSubmit={onSearch} className="rounded-[24px] border-4 p-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex items-center gap-2 text-sm font-black opacity-70"><Search className="size-4" /> Pencarian User</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari username atau email"
                className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              />
              <button type="submit" disabled={loadingList} className="border-4 rounded-2xl font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)', background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}>
                {loadingList ? 'Memuat...' : 'Cari'}
              </button>
            </div>
          </form>

          <form onSubmit={onSubmit} className="rounded-[24px] border-4 p-4 space-y-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black opacity-70">Profil Akun</div>
                <div className="text-lg font-black">{mode === 'add' ? 'Tambah User Baru' : `Edit User #${form.id}`}</div>
              </div>
              {mode === 'edit' ? (
                <button type="button" onClick={() => { setMode('add'); resetForm(); resetModeration(); }} className="px-3 py-2 border-4 rounded-xl font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  Reset
                </button>
              ) : null}
            </div>

            <div className="grid gap-3">
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Email user"
                  className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </Field>
              <Field label="Username">
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="Username"
                  className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </Field>
              <Field label="Password">
                {mode === 'add' ? (
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Password"
                    className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold"
                    style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  />
                ) : (
                  <div className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold text-sm" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    Password tidak bisa diubah dari halaman ini.
                  </div>
                )}
              </Field>
              <Field label="Status Akun">
                <select
                  value={form.account_status}
                  onChange={(e) => setForm((f) => ({ ...f, account_status: e.target.value }))}
                  className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                >
                  <option value="">Status akun (opsional)</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="WARNED">WARNED</option>
                  <option value="BANNED">BANNED</option>
                </select>
              </Field>
              <Field label="Alasan Status">
                <textarea
                  value={form.account_status_reason}
                  onChange={(e) => setForm((f) => ({ ...f, account_status_reason: e.target.value }))}
                  maxLength={500}
                  placeholder="Alasan status akun"
                  rows={3}
                  className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold resize-y"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 border-4 rounded-2xl py-3 font-extrabold disabled:opacity-60"
              style={{ boxShadow: '5px 5px 0 #000', borderColor: 'var(--panel-border)', background: mode === 'add' ? 'var(--accent-add)' : 'var(--accent-edit)', color: mode === 'add' ? 'var(--accent-add-foreground)' : 'var(--accent-edit-foreground)' }}
            >
              {submitting ? (mode === 'add' ? 'Menambah...' : 'Menyimpan...') : (mode === 'add' ? (<><Plus className="size-4" /> Tambah User</>) : (<><Pencil className="size-4" /> Simpan Perubahan</>))}
            </button>
          </form>

          {mode === 'edit' ? (
            <form onSubmit={onModerate} className="rounded-[24px] border-4 p-4 space-y-4" style={{ boxShadow: '8px 8px 0 #000', background: 'linear-gradient(180deg, var(--panel-bg) 0%, #fee2e2 100%)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-1 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: '#fecaca', color: '#7f1d1d' }}>
                  <ShieldAlert className="size-4" /> Panel Moderasi
                </div>
                <div className="mt-3 text-lg font-black">Aksi untuk user #{form.id}</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Action">
                  <select value={moderation.action} onChange={(e) => setModeration((m) => ({ ...m, action: e.target.value }))} className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <option value="WARN">WARN</option>
                    <option value="SUSPEND">SUSPEND</option>
                    <option value="BAN">BAN</option>
                    <option value="UNBAN">UNBAN</option>
                  </select>
                </Field>
                <Field label="Ban Type">
                  <select value={moderation.ban_type} onChange={(e) => setModeration((m) => ({ ...m, ban_type: e.target.value }))} disabled={!isBan} className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <option value="PERMANENT">PERMANENT</option>
                    <option value="TEMPORARY">TEMPORARY</option>
                  </select>
                </Field>
                <Field label="Reason">
                  <textarea value={moderation.reason} onChange={(e) => setModeration((m) => ({ ...m, reason: e.target.value }))} rows={3} maxLength={500} placeholder="Alasan moderasi" className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold resize-y" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </Field>
                <div className="space-y-3">
                  {isUnban ? (
                    <div className="rounded-2xl border-4 px-4 py-3 font-bold" style={{ borderColor: 'var(--panel-border)', background: '#fee2e2', color: '#7f1d1d' }}>
                      Unban akan mengaktifkan kembali akun dan membersihkan ban IP yang masih terkait.
                    </div>
                  ) : (
                    <label className="flex items-center gap-3 rounded-2xl border-4 px-4 py-3 font-bold" style={{ borderColor: 'var(--panel-border)', background: moderation.ban_ip ? '#fee2e2' : 'var(--background)', color: moderation.ban_ip ? '#7f1d1d' : 'var(--foreground)' }}>
                      <input type="checkbox" checked={moderation.ban_ip} onChange={(e) => setModeration((m) => ({ ...m, ban_ip: e.target.checked }))} />
                      Ban IP juga
                    </label>
                  )}
                </div>
              </div>

              {isSuspend ? (
                <Field label="Suspend Until">
                  <input type="datetime-local" value={moderation.suspended_until} onChange={(e) => setModeration((m) => ({ ...m, suspended_until: e.target.value }))} className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </Field>
              ) : null}

              {isTemporaryBan ? (
                <Field label="Banned Until">
                  <input type="datetime-local" value={moderation.banned_until} onChange={(e) => setModeration((m) => ({ ...m, banned_until: e.target.value }))} className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </Field>
              ) : null}

              {moderation.ban_ip ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="IP Ban Until">
                    <input type="datetime-local" value={moderation.ip_banned_until} onChange={(e) => setModeration((m) => ({ ...m, ip_banned_until: e.target.value }))} className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </Field>
                  <Field label="IP Reason">
                    <textarea value={moderation.ip_reason} onChange={(e) => setModeration((m) => ({ ...m, ip_reason: e.target.value }))} rows={3} maxLength={500} placeholder="Alasan ban IP" className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold resize-y sm:col-span-2" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </Field>
                </div>
              ) : null}

              <button type="submit" disabled={moderating} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border-4 py-3 font-black disabled:opacity-60" style={{ boxShadow: '5px 5px 0 #000', background: '#ef4444', color: '#fff', borderColor: 'var(--panel-border)' }}>
                {moderating ? 'Menerapkan moderasi...' : (<><Ban className="size-4" /> Terapkan Moderasi</>)}
              </button>
            </form>
          ) : null}
        </div>

        <div className="space-y-4">
          {users.map((u) => (
            <div key={u.id} className="rounded-[24px] border-4 p-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="grid place-items-center size-14 rounded-2xl border-4 overflow-hidden" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                    {u.profile?.avatar_url ? <img src={u.profile.avatar_url} alt={u.username} className="w-full h-full object-cover" /> : <UserRound className="size-7" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-black truncate">{u.profile?.full_name || u.username || '-'}</div>
                      <StatusBadge status={u.account_status} />
                    </div>
                    <div className="text-sm font-bold opacity-80 break-all">@{u.username || '-'} • {u.email || '-'}</div>
                    <div className="mt-1 text-xs font-bold opacity-60">ID {u.userID || u.id} • dibuat {u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onEdit(u)} disabled={deleting || moderating} className="px-3 py-2 border-4 rounded-xl font-extrabold disabled:opacity-60 inline-flex items-center gap-2" style={{ boxShadow: '3px 3px 0 #000', borderColor: 'var(--panel-border)', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)' }}>
                    <Pencil className="size-4" /> Edit
                  </button>
                  <button onClick={() => onRequestDelete(u)} disabled={deleting || moderating} className="px-3 py-2 border-4 rounded-xl font-extrabold disabled:opacity-60 inline-flex items-center gap-2" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <Trash2 className="size-4" /> Hapus
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniInfo label="Status" value={u.account_status || 'ACTIVE'} icon={<ShieldAlert className="size-4" />} />
                <MiniInfo label="VIP" value={u.vip?.status ? `Level ${u.vip?.vip_level || 0}` : 'Tidak aktif'} icon={<Clock3 className="size-4" />} />
                <MiniInfo label="Full Name" value={u.profile?.full_name || '-'} icon={<UserRound className="size-4" />} />
                <MiniInfo label="Reason" value={u.account_status_reason || '-'} icon={<ShieldBan className="size-4" />} />
              </div>
            </div>
          ))}

          {users.length === 0 ? (
            <div className="rounded-[24px] border-4 p-8 text-center" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="text-xl font-black">{loadingList ? 'Memuat user...' : 'Belum ada user.'}</div>
              <div className="mt-2 text-sm font-semibold opacity-70">Coba ubah kata kunci pencarian atau refresh data.</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Sebelumnya</button>
        <div className="text-sm font-extrabold">Halaman {page} / {totalPages}</div>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Berikutnya</button>
      </div>

      {/* <div className="text-xs opacity-70">Managed via Admin Users API</div> */}

      {/* Confirm Delete Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete} />
          <div
            className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6"
            style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="grid place-items-center size-10 bg-[#FEB2B2] border-4 rounded-md" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Hapus User?</h3>
                <p className="text-sm opacity-80 break-words">{confirmTarget?.email} (username: {confirmTarget?.username})</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={onCancelDelete} disabled={deleting} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                Batal
              </button>
              <button onClick={onConfirmDelete} disabled={deleting} className="px-3 py-2 border-4 rounded-lg bg-[#FFD803] font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value, tone }) {
  const meta = getSummaryTone(tone);
  return (
    <div className="rounded-2xl border-4 px-3 py-4" style={{ borderColor: 'var(--panel-border)', background: meta.bg, color: meta.fg }}>
      <div className="text-[11px] font-black uppercase tracking-[0.15em] opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

function MiniInfo({ label, value, icon }) {
  return (
    <div className="rounded-2xl border-4 px-4 py-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] opacity-60">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-bold break-words">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);
  return (
    <span className="inline-flex items-center rounded-full border-4 px-3 py-1 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: meta.bg, color: meta.fg }}>
      {meta.label}
    </span>
  );
}

function getStatusMeta(status) {
  const s = String(status || 'ACTIVE').toUpperCase();
  if (s === 'WARNED') return { label: 'WARNED', bg: '#fef3c7', fg: '#92400e' };
  if (s === 'SUSPENDED') return { label: 'SUSPENDED', bg: '#dbeafe', fg: '#1e3a8a' };
  if (s === 'BANNED') return { label: 'BANNED', bg: '#fecaca', fg: '#7f1d1d' };
  return { label: 'ACTIVE', bg: '#dcfce7', fg: '#166534' };
}

function getSummaryTone(tone) {
  if (tone === 'active') return { bg: '#dcfce7', fg: '#166534' };
  if (tone === 'warned') return { bg: '#fef3c7', fg: '#92400e' };
  if (tone === 'suspended') return { bg: '#dbeafe', fg: '#1e3a8a' };
  if (tone === 'banned') return { bg: '#fecaca', fg: '#7f1d1d' };
  return { bg: 'var(--background)', fg: 'var(--foreground)' };
}
