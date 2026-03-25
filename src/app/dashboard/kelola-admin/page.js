'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Plus, Pencil, Trash2, Shield, Search, RefreshCcw, Users, UserCog, Mail, KeyRound } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/lib/api';

const ROLE_TONES = {
  SUPERADMIN: { background: '#fde68a', color: '#92400e' },
  KEUANGAN: { background: '#dbeafe', color: '#1d4ed8' },
  UPLOADER: { background: '#dcfce7', color: '#166534' },
};

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-black opacity-80">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value, tone = 'neutral' }) {
  const palette = {
    neutral: { background: '#f3f4f6', color: '#111827' },
    superadmin: { background: '#fde68a', color: '#92400e' },
    keuangan: { background: '#dbeafe', color: '#1d4ed8' },
    uploader: { background: '#dcfce7', color: '#166534' },
  };

  const style = palette[tone] || palette.neutral;

  return (
    <div className="rounded-[22px] border-4 p-4" style={{ borderColor: 'var(--panel-border)', background: style.background, color: style.color }}>
      <div className="text-xs font-black uppercase tracking-wide opacity-75">{label}</div>
      <div className="mt-2 text-2xl font-black leading-none">{value}</div>
    </div>
  );
}

function RoleBadge({ role }) {
  const key = String(role || 'UPLOADER').toUpperCase();
  const tone = ROLE_TONES[key] || { background: '#e5e7eb', color: '#111827' };

  return (
    <span className="inline-flex items-center rounded-full border-4 px-3 py-1 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: tone.background, color: tone.color }}>
      {key}
    </span>
  );
}

export default function KelolaAdminPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canAccess = permissions.includes('kelola-admin') || String(user?.role || '').toLowerCase() === 'superadmin';

  // State
  const [admins, setAdmins] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [form, setForm] = useState({ id: null, email: '', username: '', password: '', role: 'UPLOADER', permissions: [] });
  const [mode, setMode] = useState('add'); // add | edit
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const resetForm = () => setForm({ id: null, email: '', username: '', password: '', role: 'UPLOADER', permissions: [] });

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && !canAccess) {
      toast.error('Kamu tidak punya permission untuk Kelola Admin');
      router.replace('/dashboard');
    }
  }, [loading, user, canAccess, router]);

  const loadAdmins = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = { page, limit, q, ...opts };
      const data = await listAdmins({ token, ...params });
      setAdmins(data.items || []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat admins');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, user]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadAdmins({ page: 1 });
  };

  const PERMISSION_GROUPS = [
    {
      title: 'Overview',
      items: [
        { key: 'overview', label: 'Overview' },
      ],
    },
    {
      title: 'Moderation',
      items: [
        { key: 'moderation', label: 'Moderation' },
      ],
    },
    {
      title: 'Kelola',
      items: [
        { key: 'kelola-user', label: 'Kelola User' },
        { key: 'kelola-admin', label: 'Kelola Admin' },
        { key: 'livechat', label: 'Live Chat' },
        { key: 'signin-event-configs', label: 'Sign-In Event Configs' },
      ],
    },
    {
      title: 'Keuangan',
      items: [
        { key: 'keuangan', label: 'Keuangan' },
        { key: 'topup-manual', label: 'Topup Manual' },
      ],
    },
    {
      title: 'Store',
      items: [
        { key: 'store-admin', label: 'Store Admin' },
        { key: 'prime-store', label: 'Prime Store' },
        { key: 'sponsor-admin', label: 'Sponsor Admin' },
      ],
    },
    {
      title: 'VIP & Items',
      items: [
        { key: 'vip-plans', label: 'VIP Plans' },
        { key: 'vip-tiers', label: 'VIP Tiers' },
        { key: 'vip-feature-requirements', label: 'VIP Feature Requirements' },
        { key: 'admin-vip', label: 'Admin VIP' },
        { key: 'admin-wallet', label: 'Admin Wallet' },
        { key: 'redeem-codes', label: 'Kode Redeem' },
        { key: 'avatar-borders', label: 'Avatar Borders' },
        { key: 'badges', label: 'Badges' },
        { key: 'stickers', label: 'Stickers' },
        { key: 'gacha-admin', label: 'Gacha Admin' },
      ],
    },
    {
      title: 'Konten',
      items: [
        { key: 'daftar-konten', label: 'Daftar Konten' },
        { key: 'manga-admin', label: 'Manga Admin' },
        { key: 'list-grab', label: 'List Grab' },
        { key: 'episode-video-issues', label: 'Episode Issue' },
      ],
    },
    {
      title: 'Lainnya',
      items: [
        { key: 'waifu-vote', label: 'Waifu Vote' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { key: 'settings', label: 'Pengaturan' },
      ],
    },
  ];

  const togglePermission = (key) => {
    setForm((f) => {
      const has = f.permissions.includes(key);
      return {
        ...f,
        permissions: has
          ? f.permissions.filter((p) => p !== key)
          : [...f.permissions, key],
      };
    });
  };

  const hasPermission = (key) => form.permissions.includes(key);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const token = getSession()?.token;
    if (mode === 'add') {
      if (!form.email || !form.username || !form.password) {
        setSubmitting(false);
        return toast.error('Email, username, dan password wajib diisi');
      }
      try {
        const res = await createAdmin({ token, email: form.email, username: form.username, password: form.password, role: form.role, permissions: form.permissions });
        toast.success(res?.message || 'Admin ditambahkan');
        resetForm();
        setPage(1);
        await loadAdmins({ page: 1 });
      } catch (err) {
        toast.error(err?.message || 'Gagal membuat admin');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!form.email || !form.username) {
        setSubmitting(false);
        return toast.error('Email dan username wajib diisi');
      }
      try {
        const res = await updateAdmin({ token, id: form.id, email: form.email, username: form.username, password: form.password || undefined, role: form.role, permissions: form.permissions });
        toast.success(res?.message || 'Admin diperbarui');
        setMode('add');
        resetForm();
        await loadAdmins();
      } catch (err) {
        toast.error(err?.message || 'Gagal memperbarui admin');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const onEdit = (u) => {
    setMode('edit');
    setForm({
      id: u.id,
      email: u.email || '',
      username: u.username || '',
      password: '',
      role: u.role || 'UPLOADER',
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
    });
  };

  const onRequestDelete = (target) => {
    setConfirmTarget(target);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!confirmTarget) return;
    const token = getSession()?.token;
    try {
      setDeleting(true);
      await deleteAdmin({ token, id: confirmTarget.id });
      toast.success('Admin dihapus');
      if (mode === 'edit' && form.id === confirmTarget.id) {
        setMode('add');
        resetForm();
      }
      setConfirmOpen(false);
      setConfirmTarget(null);
      await loadAdmins();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus admin');
    } finally {
      setDeleting(false);
    }
  };

  const onCancelDelete = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const summary = useMemo(() => {
    return admins.reduce((acc, admin) => {
      const role = String(admin?.role || 'UPLOADER').toUpperCase();
      acc.total += 1;
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, { total: 0, SUPERADMIN: 0, KEUANGAN: 0, UPLOADER: 0 });
  }, [admins]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[28px] border-4 p-5 md:p-6" style={{ boxShadow: '10px 10px 0 #000', background: 'linear-gradient(135deg, var(--panel-bg) 0%, #ede9fe 100%)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-1 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: '#ddd6fe', color: '#5b21b6' }}>
                    <Shield className="size-4" /> Manajemen Admin
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3"><Users className="size-7" /> Kelola Admin</h2>
                    <p className="mt-2 max-w-2xl text-sm md:text-base font-semibold opacity-80">
                      Kelola akun admin, atur role dan permission akses, lalu pantau daftar tim dari satu halaman yang lebih rapi dan mudah dipakai.
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => loadAdmins()} disabled={loadingList} className="inline-flex items-center gap-2 rounded-2xl border-4 px-4 py-3 font-black disabled:opacity-60" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)', borderColor: 'var(--panel-border)' }}>
                  <RefreshCcw className={`size-4 ${loadingList ? 'animate-spin' : ''}`} />
                  {loadingList ? 'Memuat...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-[28px] border-4 p-5" style={{ boxShadow: '10px 10px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <SummaryCard label="Total" value={summary.total} tone="neutral" />
              <SummaryCard label="Superadmin" value={summary.SUPERADMIN} tone="superadmin" />
              <SummaryCard label="Keuangan" value={summary.KEUANGAN} tone="keuangan" />
              <SummaryCard label="Uploader" value={summary.UPLOADER} tone="uploader" />
              <SummaryCard label="Halaman" value={`${page}/${totalPages}`} tone="neutral" />
              <SummaryCard label="Per Page" value={limit} tone="neutral" />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[460px_minmax(0,1fr)]">
            <div className="space-y-4">
              <form onSubmit={onSearch} className="rounded-[24px] border-4 p-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <div className="flex items-center gap-2 text-sm font-black opacity-70"><Search className="size-4" /> Pencarian Admin</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cari username atau email admin"
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
                    <div className="text-sm font-black opacity-70">Profil Admin</div>
                    <div className="text-lg font-black">{mode === 'add' ? 'Tambah Admin Baru' : `Edit Admin #${form.id}`}</div>
                  </div>
                  {mode === 'edit' ? (
                    <button type="button" onClick={() => { setMode('add'); resetForm(); }} className="px-3 py-2 border-4 rounded-xl font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                      Reset
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <Field label="Email Admin">
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-60" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="Email admin"
                        className="w-full min-w-0 border-4 rounded-2xl py-3 pl-10 pr-3 font-semibold"
                        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                      />
                    </div>
                  </Field>

                  <Field label="Username">
                    <div className="relative">
                      <UserCog className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-60" />
                      <input
                        type="text"
                        value={form.username}
                        onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                        placeholder="Username admin"
                        className="w-full min-w-0 border-4 rounded-2xl py-3 pl-10 pr-3 font-semibold"
                        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                      />
                    </div>
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Password">
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-60" />
                        <input
                          type="password"
                          value={form.password}
                          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                          placeholder={mode === 'add' ? 'Password admin' : 'Password baru (opsional)'}
                          className="w-full min-w-0 border-4 rounded-2xl py-3 pl-10 pr-3 font-semibold"
                          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                        />
                      </div>
                    </Field>

                    <Field label="Role">
                      <select
                        value={form.role}
                        onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                        className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-extrabold"
                        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                      >
                        <option value="UPLOADER">UPLOADER</option>
                        <option value="KEUANGAN">KEUANGAN</option>
                        <option value="SUPERADMIN">SUPERADMIN</option>
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="rounded-[22px] border-4 p-4 space-y-3" style={{ boxShadow: '4px 4px 0 #000', background: 'linear-gradient(180deg, var(--panel-bg) 0%, #eef2ff 100%)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <div>
                    <div className="text-sm font-black opacity-70">Permission Akses</div>
                    <div className="text-base font-black">Pilih menu yang bisa diakses admin ini</div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.title} className="rounded-[20px] border-4 p-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                        <div className="mb-2 text-xs font-black uppercase tracking-wide opacity-70">{group.title}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((item) => {
                            const active = hasPermission(item.key);
                            return (
                              <label key={item.key} className="inline-flex cursor-pointer items-center gap-2 rounded-full border-4 px-3 py-2 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: active ? '#dbeafe' : 'var(--background)', color: active ? '#1d4ed8' : 'var(--foreground)' }}>
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() => togglePermission(item.key)}
                                  className="size-4"
                                />
                                <span>{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 border-4 rounded-2xl py-3 font-extrabold disabled:opacity-60"
                  style={{ boxShadow: '5px 5px 0 #000', borderColor: 'var(--panel-border)', background: mode === 'add' ? 'var(--accent-add)' : 'var(--accent-edit)', color: mode === 'add' ? 'var(--accent-add-foreground)' : 'var(--accent-edit-foreground)' }}
                >
                  {submitting ? (mode === 'add' ? 'Menambah...' : 'Menyimpan...') : (mode === 'add' ? (<><Plus className="size-4" /> Tambah Admin</>) : (<><Pencil className="size-4" /> Simpan Perubahan</>))}
                </button>
              </form>
            </div>

            <div className="space-y-4">
              {admins.map((u) => (
                <div key={u.id} className="rounded-[24px] border-4 p-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="grid place-items-center size-14 rounded-2xl border-4" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                          <Shield className="size-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-lg font-black break-words">{u.username || '-'}</div>
                          <div className="text-sm font-semibold opacity-75 break-all">{u.email || '-'}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={u.role} />
                        <span className="inline-flex items-center rounded-full border-4 px-3 py-1 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                          {Array.isArray(u.permissions) ? `${u.permissions.length} permission` : '0 permission'}
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm font-semibold opacity-80 sm:grid-cols-2">
                        <div>
                          <span className="font-black">ID:</span> {u.id}
                        </div>
                        <div>
                          <span className="font-black">Dibuat:</span> {u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(u.permissions) && u.permissions.length > 0 ? u.permissions.map((permission) => (
                          <span key={`${u.id}-${permission}`} className="inline-flex items-center rounded-full border-4 px-3 py-1 text-[11px] font-black" style={{ borderColor: 'var(--panel-border)', background: '#f3f4f6', color: '#111827' }}>
                            {permission}
                          </span>
                        )) : (
                          <span className="text-sm font-semibold opacity-70">Belum ada permission khusus.</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(u)}
                        className="inline-flex items-center gap-2 rounded-2xl border-4 px-3 py-2 font-extrabold"
                        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}
                      >
                        <Pencil className="size-4" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDelete(u)}
                        className="inline-flex items-center gap-2 rounded-2xl border-4 px-3 py-2 font-extrabold"
                        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                      >
                        <Trash2 className="size-4" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {admins.length === 0 ? (
                <div className="rounded-[24px] border-4 p-8 text-center" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <div className="text-lg font-black">{loadingList ? 'Memuat admin...' : 'Belum ada admin.'}</div>
                  <div className="mt-2 text-sm font-semibold opacity-75">Coba ubah kata kunci pencarian atau tambahkan admin baru dari panel sebelah kiri.</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 border-4 rounded-2xl disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Sebelumnya</button>
            <div className="text-sm font-extrabold">Halaman {page} / {totalPages}</div>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 border-4 rounded-2xl disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Berikutnya</button>
          </div>

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
                <h3 className="text-lg font-extrabold">Hapus Admin?</h3>
                <p className="text-sm opacity-80 break-words">{confirmTarget?.email} (username: {confirmTarget?.username})</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={onCancelDelete} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                Batal
              </button>
              <button onClick={onConfirmDelete} className="px-3 py-2 border-4 rounded-lg bg-[#FFD803] hover:brightness-95 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>
                Ya, Hapus
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
