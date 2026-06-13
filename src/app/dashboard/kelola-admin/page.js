'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Shield, Search, RefreshCcw, Users, UserCog, Mail, KeyRound, ChevronLeft, ChevronRight, Crown, Wallet, Upload } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/lib/api';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
};

const ROLE_TONES = {
  SUPERADMIN: { bg: 'from-amber-500 to-orange-500', text: 'text-white', icon: Crown },
  KEUANGAN: { bg: 'from-blue-500 to-cyan-500', text: 'text-white', icon: Wallet },
  UPLOADER: { bg: 'from-emerald-500 to-teal-500', text: 'text-white', icon: Upload },
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
  const gradients = {
    neutral: 'from-gray-500 to-gray-600',
    superadmin: 'from-amber-500 to-orange-500',
    keuangan: 'from-blue-500 to-cyan-500',
    uploader: 'from-emerald-500 to-teal-500',
  };

  return (
    <div className="glass-card rounded-2xl p-4 relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-2" style={{ borderColor: 'var(--panel-border)', boxShadow: '4px 4px 0 rgba(0,0,0,0.2)' }}>
      <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${gradients[tone]} opacity-20 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500`} />
      <div className="relative z-10">
        <div className="text-xs font-bold text-[var(--foreground)]/60 uppercase tracking-wide">{label}</div>
        <div className="mt-1 text-2xl font-black text-[var(--foreground)]">{value}</div>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const key = String(role || 'UPLOADER').toUpperCase();
  const tone = ROLE_TONES[key] || { bg: 'from-gray-400 to-gray-500', text: 'text-white' };
  const Icon = tone.icon || Shield;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${tone.bg} ${tone.text} border-2`} style={{ borderColor: 'rgba(0,0,0,0.2)', boxShadow: '2px 2px 0 rgba(0,0,0,0.2)' }}>
      <Icon className="w-3 h-3" />
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
    <div className="space-y-6 min-w-0">
      {loading || !user ? null : (
        <>
          {/* Header & Stats - Glassbrutalism Style */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Header Card - Glassbrutalism */}
            <div className="glass-card rounded-2xl sm:rounded-3xl border-2 p-5 sm:p-6 relative overflow-hidden" style={{ boxShadow: '8px 8px 0 rgba(0,0,0,0.3)' }}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-bold backdrop-blur-sm" style={{ borderColor: 'var(--panel-border)', background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }}>
                    <Shield className="w-4 h-4" /> Manajemen Admin
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black flex items-center gap-3 text-[var(--foreground)]"><Users className="w-7 h-7" /> Kelola Admin</h2>
                    <p className="mt-2 max-w-2xl text-sm sm:text-base font-medium opacity-70">
                      Kelola akun admin, atur role dan permission akses, lalu pantau daftar tim.
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => loadAdmins()} disabled={loadingList} className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-3 font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px]" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.3)', background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)', borderColor: 'var(--panel-border)' }}>
                  <RefreshCcw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{loadingList ? 'Memuat...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {/* Stats Cards - Glassbrutalism */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
              <SummaryCard label="Total" value={summary.total} tone="neutral" />
              <SummaryCard label="Superadmin" value={summary.SUPERADMIN} tone="superadmin" />
              <SummaryCard label="Keuangan" value={summary.KEUANGAN} tone="keuangan" />
              <SummaryCard label="Uploader" value={summary.UPLOADER} tone="uploader" />
              <SummaryCard label="Halaman" value={`${page}/${totalPages}`} tone="neutral" />
              <SummaryCard label="Per Page" value={limit} tone="neutral" />
            </div>
          </div>

          {/* Main Content - Glassbrutalism */}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
            {/* Left Panel */}
            <div className="space-y-4">
              {/* Search */}
              <form onSubmit={onSearch} className="glass-card rounded-2xl border-2 p-4" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.3)', borderColor: 'var(--panel-border)' }}>
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]/70 mb-3"><Search className="w-4 h-4" /> Pencarian Admin</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cari username atau email"
                    className="flex-1 px-3 py-2.5 border-2 rounded-xl font-semibold text-sm bg-[var(--background)] border-[var(--panel-border)] text-[var(--foreground)] outline-none focus:border-[var(--accent-primary)] transition-colors"
                    style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.2)' }}
                  />
                  <button type="submit" disabled={loadingList} className="px-4 py-2.5 border-2 rounded-xl font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px] text-sm" style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.3)', borderColor: 'var(--panel-border)', background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}>
                    {loadingList ? '...' : 'Cari'}
                  </button>
                </div>
              </form>

              <form onSubmit={onSubmit} className="glass-card rounded-2xl border-2 p-4 space-y-4" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.3)', borderColor: 'var(--panel-border)' }}>
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

            {/* Right Panel - Admin List */}
            <div className="space-y-4">
              {admins.map((u) => (
                <div key={u.id} className="glass-card rounded-2xl border-2 p-4 sm:p-5" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.3)', borderColor: 'var(--panel-border)' }}>
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
                <div className="glass-card rounded-2xl border-2 p-8 text-center" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.3)', borderColor: 'var(--panel-border)' }}>
                  <div className="text-lg font-bold text-[var(--foreground)]">{loadingList ? 'Memuat admin...' : 'Belum ada admin.'}</div>
                  <div className="mt-2 text-sm text-[var(--foreground)]/60">Coba ubah kata kunci pencarian atau tambahkan admin baru.</div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Pagination - Glassbrutalism */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm font-bold text-[var(--foreground)]/60">
              Halaman {page} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--panel-bg)] border-2 border-[var(--panel-border)] text-[var(--foreground)] transition-all hover:translate-y-[-2px]"
                style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.3)' }}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--panel-bg)] border-2 border-[var(--panel-border)] text-[var(--foreground)] transition-all hover:translate-y-[-2px]"
                style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.3)' }}
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

      {/* Confirm Delete Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete} />
          <div
            className="relative z-10 w-[92%] max-w-md glass-card border-2 rounded-2xl p-4 sm:p-6"
            style={{ boxShadow: '8px 8px 0 rgba(0,0,0,0.3)', borderColor: 'var(--panel-border)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="grid place-items-center w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 border-2" style={{ borderColor: 'rgba(0,0,0,0.2)', boxShadow: '4px 4px 0 rgba(0,0,0,0.2)' }}>
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">Hapus Admin?</h3>
                <p className="text-sm text-[var(--foreground)]/60 break-words">{confirmTarget?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={onCancelDelete} className="px-4 py-2 rounded-xl bg-[var(--panel-bg)] border-2 border-[var(--panel-border)] text-[var(--foreground)] text-sm font-bold hover:bg-[var(--accent-primary)]/10 transition-colors" style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.2)' }}>
                Batal
              </button>
              <button onClick={onConfirmDelete} className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold hover:brightness-110 transition-all" style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.3)' }}>
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
