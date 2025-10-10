'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/lib/api';

export default function KelolaAdminPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const isSuperAdmin = (user?.role || '').toUpperCase() === 'SUPERADMIN';

  // State
  const [admins, setAdmins] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [form, setForm] = useState({ id: null, email: '', username: '', password: '', role: 'UPLOADER' });
  const [mode, setMode] = useState('add'); // add | edit
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const resetForm = () => setForm({ id: null, email: '', username: '', password: '', role: 'UPLOADER' });

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

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
    if (!isSuperAdmin) return;
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, isSuperAdmin]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadAdmins({ page: 1 });
  };

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
        const res = await createAdmin({ token, email: form.email, username: form.username, password: form.password, role: form.role });
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
        const res = await updateAdmin({ token, id: form.id, email: form.email, username: form.username, password: form.password || undefined, role: form.role });
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
    setForm({ id: u.id, email: u.email || '', username: u.username || '', password: '', role: u.role || 'UPLOADER' });
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

  return (
    <div className="space-y-6">
      {loading || !user ? null : !isSuperAdmin ? (
        <div className="text-sm font-semibold">
          Halaman ini khusus superadmin. Anda login sebagai{' '}
          <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">{user.role}</span>.
        </div>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2"><Shield className="size-5" /> Kelola Admin</h2>
      </div>

      {/* Search */}
      <form onSubmit={onSearch} className="grid sm:grid-cols-[1fr_140px] gap-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari (username/email)"
          className="px-3 py-2 border-4 rounded-lg font-semibold"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
        />
        <button type="submit" className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>Cari</button>
      </form>

      {/* Form Tambah / Edit */}
      <form onSubmit={onSubmit} className="grid sm:grid-cols-[1fr_160px_160px_160px_120px] gap-3">
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email admin"
          className="px-3 py-2 border-4 rounded-lg font-semibold"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
        />
        <input
          type="text"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          placeholder="Username"
          className="px-3 py-2 border-4 rounded-lg font-semibold"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
        />
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder={mode === 'add' ? 'Password' : 'Password (opsional)'}
          className="px-3 py-2 border-4 rounded-lg font-semibold"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
        />
        <select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          className="px-3 py-2 border-4 rounded-lg font-extrabold"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
        >
          <option value="UPLOADER">UPLOADER</option>
          <option value="KEUANGAN">KEUANAGAN</option>
          <option value="SUPERADMIN">SUPERADMIN</option>
        </select>
        <button
          type="submit"
          className={`flex items-center justify-center gap-2 border-4 rounded-lg font-extrabold hover:brightness-95`}
          style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)', background: mode === 'add' ? 'var(--accent-add)' : 'var(--accent-edit)', color: mode === 'add' ? 'var(--accent-add-foreground)' : 'var(--accent-edit-foreground)' }}
        >
          {mode === 'add' ? (<><Plus className="size-4" /> Tambah</>) : (<><Pencil className="size-4" /> Simpan</>)}
        </button>
      </form>

      {/* Table */}
<div className="overflow-auto">
  <table
    className="min-w-full border-4 rounded-lg overflow-hidden"
    style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
  >
    <thead style={{ background: 'var(--panel-bg)' }}>
      <tr>
        <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Email</th>
        <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Username</th>
        <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Role</th>
        <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Dibuat</th>
        <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
      </tr>
    </thead>
    <tbody>
      {admins.map((u) => (
        <tr key={u.id}>
          <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{u.email}</td>
          <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{u.username}</td>
          <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{u.role}</td>
          <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>
            {u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}
          </td>
          <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(u)}
                className="px-2 py-1 border-4 rounded font-extrabold"
                style={{
                  boxShadow: '3px 3px 0 #000',
                  background: 'var(--accent-edit)',
                  color: 'var(--accent-edit-foreground)',
                  borderColor: 'var(--panel-border)',
                }}
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={() => onRequestDelete(u)}
                className="px-2 py-1 border-4 rounded font-extrabold"
                style={{
                  boxShadow: '3px 3px 0 #000',
                  background: 'var(--panel-bg)',
                  color: 'var(--foreground)',
                  borderColor: 'var(--panel-border)',
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </td>
        </tr>
      ))}
      {admins.length === 0 && (
        <tr>
          <td colSpan={5} className="px-3 py-6 text-center text-sm opacity-70">
            {loadingList ? 'Memuat...' : 'Belum ada admin.'}
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Sebelumnya</button>
        <div className="text-sm font-extrabold">Halaman {page} / {Math.max(1, Math.ceil(total / limit))}</div>
        <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Berikutnya</button>
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
