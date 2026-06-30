'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Shield, Search, RefreshCcw, Users, UserCog, Mail, KeyRound, ChevronLeft, ChevronRight, Crown, Wallet, Upload } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/lib/api';

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

const ROLE_ICONS = { SUPERADMIN: Crown, KEUANGAN: Wallet, UPLOADER: Upload };

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

function RoleBadge({ role }) {
  const key = String(role || 'UPLOADER').toUpperCase();
  const Icon = ROLE_ICONS[key] || Shield;
  return (
    <span className="badge">
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
                <Shield className="w-5 h-5" />
                <span className="label uppercase">Manajemen Admin</span>
              </div>
              <h1 className="page-title">Kelola Admin</h1>
              <p className="label mt-1">Kelola akun admin, atur role dan permission akses, pantau daftar tim.</p>
            </div>
            <button type="button" onClick={() => loadAdmins()} disabled={loadingList} className="btn btn--secondary btn--sm flex-shrink-0">
              <RefreshCcw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
              {loadingList ? 'Memuat...' : 'Refresh'}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="stat-grid">
            <SummaryCard label="Total" value={summary.total} />
            <SummaryCard label="Superadmin" value={summary.SUPERADMIN} />
            <SummaryCard label="Keuangan" value={summary.KEUANGAN} />
            <SummaryCard label="Uploader" value={summary.UPLOADER} />
            <SummaryCard label="Halaman" value={`${page}/${totalPages}`} />
            <SummaryCard label="Per Page" value={limit} />
          </div>

          {/* Main Content */}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
            {/* Left Panel */}
            <div className="space-y-4">
              {/* Search */}
              <form onSubmit={onSearch} className="filter-bar">
                <div className="flex items-center gap-2 label mb-3"><Search className="w-4 h-4" /> Pencarian Admin</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="input-icon flex-1">
                    <Search className="input-icon__icon" />
                    <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari username atau email" className="input" />
                  </div>
                  <button type="submit" disabled={loadingList} className="btn btn--primary btn--sm">
                    {loadingList ? '...' : 'Cari'}
                  </button>
                </div>
              </form>

              <form onSubmit={onSubmit} className="card p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black opacity-70">Profil Admin</div>
                    <div className="text-lg font-black">{mode === 'add' ? 'Tambah Admin Baru' : `Edit Admin #${form.id}`}</div>
                  </div>
                  {mode === 'edit' && (
                    <button type="button" onClick={() => { setMode('add'); resetForm(); }} className="btn btn--secondary btn--sm">Reset</button>
                  )}
                </div>

                <div className="grid gap-3">
                  <Field label="Email Admin">
                    <div className="relative">
                      {/* <Mail className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2" style={{ color: 'var(--muted)' }} /> */}
                      <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email admin" className="input w-full pl-[3.25rem]" />
                    </div>
                  </Field>

                  <Field label="Username">
                    <div className="relative">
                      {/* <UserCog className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2" style={{ color: 'var(--muted)' }} /> */}
                      <input type="text" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="Username admin" className="input w-full pl-[3.25rem]" />
                    </div>
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Password">
                      <div className="relative">
                        {/* <KeyRound className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2" style={{ color: 'var(--muted)' }} /> */}
                        <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={mode === 'add' ? 'Password admin' : 'Password baru (opsional)'} className="input w-full pl-[3.25rem]" />
                      </div>
                    </Field>
                    <Field label="Role">
                      <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="select w-full">
                        <option value="UPLOADER">UPLOADER</option>
                        <option value="KEUANGAN">KEUANGAN</option>
                        <option value="SUPERADMIN">SUPERADMIN</option>
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="p-4 space-y-3" style={{ border: '2px solid var(--border)' }}>
                  <div>
                    <div className="label uppercase">Permission Akses</div>
                    <div className="section-title">Pilih menu yang bisa diakses admin ini</div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.title} className="p-3" style={{ border: '1px solid var(--border-muted)' }}>
                        <div className="label uppercase mb-2">{group.title}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((item) => {
                            const active = hasPermission(item.key);
                            return (
                              <label key={item.key} className="inline-flex cursor-pointer items-center gap-2 px-2 py-1 text-xs font-bold" style={{ border: '2px solid var(--border)', background: active ? 'var(--foreground)' : 'var(--background)', color: active ? 'var(--background)' : 'var(--foreground)' }}>
                                <input type="checkbox" checked={active} onChange={() => togglePermission(item.key)} className="w-3 h-3" />
                                {item.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="btn btn--primary w-full">
                  {submitting ? (mode === 'add' ? 'Menambah...' : 'Menyimpan...') : (mode === 'add' ? (<><Plus className="w-4 h-4" /> Tambah Admin</>) : (<><Pencil className="w-4 h-4" /> Simpan Perubahan</>))}
                </button>
              </form>
            </div>

            {/* Right Panel - Admin List */}
            <div className="space-y-4">
              {admins.map((u) => (
                <div key={u.id} className="card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-12 h-12 grid place-items-center" style={{ border: '2px solid var(--border)', background: 'var(--muted-bg)' }}>
                          <Shield className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-lg font-black break-words">{u.username || '-'}</div>
                          <div className="text-sm font-semibold opacity-75 break-all">{u.email || '-'}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={u.role} />
                        <span className="badge">
                          {Array.isArray(u.permissions) ? `${u.permissions.length} perm` : '0 perm'}
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
                          <span key={`${u.id}-${permission}`} className="badge">
                            {permission}
                          </span>
                        )) : (
                          <span className="text-sm font-semibold opacity-70">Belum ada permission khusus.</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onEdit(u)} className="btn btn--secondary btn--sm">
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                      <button type="button" onClick={() => onRequestDelete(u)} className="btn btn--danger btn--sm">
                        <Trash2 className="w-4 h-4" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {admins.length === 0 ? (
                <div className="card p-8 text-center">
                  <div className="text-lg font-bold text-[var(--foreground)]">{loadingList ? 'Memuat admin...' : 'Belum ada admin.'}</div>
                  <div className="mt-2 text-sm text-[var(--foreground)]/60">Coba ubah kata kunci pencarian atau tambahkan admin baru.</div>
                </div>
              ) : null}
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
          <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete} />
          <div
            className="modal relative z-10 w-[92%] max-w-md p-4 sm:p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-5 h-5 flex-shrink-0" />
              <div>
                <h3 className="section-title">Hapus Admin?</h3>
                <p className="label break-words">{confirmTarget?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={onCancelDelete} className="btn btn--secondary btn--sm">
                Batal
              </button>
              <button onClick={onConfirmDelete} className="btn btn--danger btn--sm">
                Ya, Hapus
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
