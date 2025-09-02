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
    const token = getSession()?.token;
    if (mode === 'add') {
      if (!form.email || !form.username || !form.password) {
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
      }
    } else {
      if (!form.email || !form.username) {
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
          className="px-3 py-2 border-4 border-black rounded-lg bg-white font-semibold"
          style={{ boxShadow: '4px 4px 0 #000' }}
        />
        <button type="submit" className="px-3 py-2 border-4 border-black rounded-lg bg-white font-extrabold" style={{ boxShadow: '4px 4px 0 #000' }}>Cari</button>
      </form>

      {/* Form Tambah / Edit */}
      <form onSubmit={onSubmit} className="grid sm:grid-cols-[1fr_160px_160px_160px_120px] gap-3">
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email admin"
          className="px-3 py-2 border-4 border-black rounded-lg bg-white font-semibold"
          style={{ boxShadow: '4px 4px 0 #000' }}
        />
        <input
          type="text"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          placeholder="Username"
          className="px-3 py-2 border-4 border-black rounded-lg bg-white font-semibold"
          style={{ boxShadow: '4px 4px 0 #000' }}
        />
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder={mode === 'add' ? 'Password' : 'Password (opsional)'}
          className="px-3 py-2 border-4 border-black rounded-lg bg-white font-semibold"
          style={{ boxShadow: '4px 4px 0 #000' }}
        />
        <select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          className="px-3 py-2 border-4 border-black rounded-lg bg-white font-extrabold"
          style={{ boxShadow: '4px 4px 0 #000' }}
        >
          <option value="UPLOADER">UPLOADER</option>
          <option value="KEUANGAN">KEUANAGAN</option>
          <option value="SUPERADMIN">SUPERADMIN</option>
        </select>
        <button
          type="submit"
          className={`flex items-center justify-center gap-2 border-4 border-black rounded-lg font-extrabold ${mode === 'add' ? 'bg-[#C6F6D5] hover:brightness-95' : 'bg-[#FFD803] hover:brightness-95'}`}
          style={{ boxShadow: '4px 4px 0 #000' }}
        >
          {mode === 'add' ? (<><Plus className="size-4" /> Tambah</>) : (<><Pencil className="size-4" /> Simpan</>)}
        </button>
      </form>

      {/* Table */}
      <div className="overflow-auto">
        <table className="min-w-full border-4 border-black rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000' }}>
          <thead className="bg-[#E2E8F0]">
            <tr>
              <th className="text-left px-3 py-2 border-b-4 border-black">Email</th>
              <th className="text-left px-3 py-2 border-b-4 border-black">Username</th>
              <th className="text-left px-3 py-2 border-b-4 border-black">Role</th>
              <th className="text-left px-3 py-2 border-b-4 border-black">Dibuat</th>
              <th className="text-left px-3 py-2 border-b-4 border-black">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((u) => (
              <tr key={u.id} className="odd:bg-white even:bg-[#F7F7F0]">
                <td className="px-3 py-2 border-b-4 border-black font-semibold">{u.email}</td>
                <td className="px-3 py-2 border-b-4 border-black font-semibold">{u.username}</td>
                <td className="px-3 py-2 border-b-4 border-black font-semibold">{u.role}</td>
                <td className="px-3 py-2 border-b-4 border-black font-semibold">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                <td className="px-3 py-2 border-b-4 border-black">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(u)} className="px-2 py-1 border-4 border-black rounded bg-[#FFD803] font-extrabold" style={{ boxShadow: '3px 3px 0 #000' }}>
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => onRequestDelete(u)} className="px-2 py-1 border-4 border-black rounded bg-white font-extrabold" style={{ boxShadow: '3px 3px 0 #000' }}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Belum ada admin.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 border-4 border-black rounded-lg bg-white disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000' }}>Prev</button>
        <div className="text-sm font-extrabold">Page {page} / {Math.max(1, Math.ceil(total / limit))}</div>
        <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 border-4 border-black rounded-lg bg-white disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000' }}>Next</button>
      </div>

      {/* Confirm Delete Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete} />
          <div
            className="relative z-10 w-[92%] max-w-md bg-white border-4 border-black rounded-xl p-4 sm:p-6"
            style={{ boxShadow: '8px 8px 0 #000' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="grid place-items-center size-10 bg-[#FEB2B2] border-4 border-black rounded-md" style={{ boxShadow: '4px 4px 0 #000' }}>
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Hapus Admin?</h3>
                <p className="text-sm opacity-80 break-words">{confirmTarget?.email} (username: {confirmTarget?.username})</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={onCancelDelete} className="px-3 py-2 border-4 border-black rounded-lg bg-white font-extrabold" style={{ boxShadow: '4px 4px 0 #000' }}>
                Batal
              </button>
              <button onClick={onConfirmDelete} className="px-3 py-2 border-4 border-black rounded-lg bg-[#FFD803] hover:brightness-95 font-extrabold" style={{ boxShadow: '4px 4px 0 #000' }}>
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
