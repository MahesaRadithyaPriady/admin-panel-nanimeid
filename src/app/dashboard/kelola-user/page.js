'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '@/lib/api';

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

  const [form, setForm] = useState({ id: null, email: '', username: '', password: '' });
  const [mode, setMode] = useState('add'); // add | edit
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const resetForm = () => setForm({ id: null, email: '', username: '', password: '' });

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
    if (!user || user.role !== 'superadmin') return;
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
      if (!form.email && !form.username) {
        setSubmitting(false);
        return toast.error('Isi username atau email untuk update');
      }
      try {
        const token = getSession()?.token;
        await updateAdminUser({ token, id: form.id, username: form.username, email: form.email });
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
    setForm({ id: u.id, email: u.email, username: u.username, password: '' });
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

  return (
    <div className="space-y-6">
      {loading || !user ? null : user.role !== 'superadmin' ? (
        <div className="text-sm font-semibold">
          Halaman ini khusus superadmin. Anda login sebagai{' '}
          <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">{user.role}</span>.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2"><Users  className="size-5" /> Kelola User</h2>
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
        <button type="submit" disabled={loadingList} className="border-4 border-black rounded-lg bg-[#C0E8FF] font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000' }}>
          {loadingList ? 'Memuat...' : 'Cari'}
        </button>
      </form>

      {/* Form */}
      <form onSubmit={onSubmit} className="grid sm:grid-cols-[1fr_180px_180px_120px] gap-3">
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email user"
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
        {mode === 'add' ? (
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Password"
            className="px-3 py-2 border-4 border-black rounded-lg bg-white font-semibold"
            style={{ boxShadow: '4px 4px 0 #000' }}
          />
        ) : (
          <div className="px-3 py-2 border-4 border-black rounded-lg bg-[#F7F7F0] font-semibold text-sm grid place-items-center">
            Edit mode (password tidak bisa diubah di sini)
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className={`flex items-center justify-center gap-2 border-4 border-black rounded-lg font-extrabold disabled:opacity-60 ${mode === 'add' ? 'bg-[#C6F6D5]' : 'bg-[#FFD803]'}`}
          style={{ boxShadow: '4px 4px 0 #000' }}
        >
          {submitting
            ? (mode === 'add' ? 'Menambah...' : 'Menyimpan...')
            : (mode === 'add' ? (<><Plus className="size-4" /> Tambah</>) : (<><Pencil className="size-4" /> Simpan</>))}
        </button>
      </form>

      {/* Table */}
      <div className="overflow-auto">
        <table className="min-w-full border-4 border-black rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000' }}>
          <thead className="bg-[#E2E8F0]">
            <tr>
              <th className="text-left px-3 py-2 border-b-4 border-black">Email</th>
              <th className="text-left px-3 py-2 border-b-4 border-black">Username</th>
              <th className="text-left px-3 py-2 border-b-4 border-black">Created</th>
              <th className="text-left px-3 py-2 border-b-4 border-black">Full Name</th>
              <th className="text-left px-3 py-2 border-b-4 border-black">VIP</th>
              <th className="text-left px-3 py-2 border-b-4 border-black">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="odd:bg-white even:bg-[#F7F7F0]">
                <td className="px-3 py-2 border-b-4 border-black font-semibold">{u.email}</td>
                <td className="px-3 py-2 border-b-4 border-black font-semibold">{u.username}</td>
                <td className="px-3 py-2 border-b-4 border-black font-semibold">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                <td className="px-3 py-2 border-b-4 border-black font-semibold">{u.profile?.full_name || '-'}</td>
                <td className="px-3 py-2 border-b-4 border-black font-semibold">
                  {u.vip ? (
                    <span className="px-2 py-0.5 border-2 border-black rounded bg-[#C6F6D5] text-xs font-extrabold">
                      L{u.vip.vip_level || 1} {u.vip.status ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  ) : (
                    <span className="text-xs opacity-70">-</span>
                  )}
                </td>
                <td className="px-3 py-2 border-b-4 border-black">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(u)} disabled={deleting} className="px-2 py-1 border-4 border-black rounded bg-[#FFD803] font-extrabold disabled:opacity-60" style={{ boxShadow: '3px 3px 0 #000' }}>
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => onRequestDelete(u)} disabled={deleting} className="px-2 py-1 border-4 border-black rounded bg-white font-extrabold disabled:opacity-60" style={{ boxShadow: '3px 3px 0 #000' }}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Belum ada user.'}</td>
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

      {/* <div className="text-xs opacity-70">Managed via Admin Users API</div> */}

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
                <h3 className="text-lg font-extrabold">Hapus User?</h3>
                <p className="text-sm opacity-80 break-words">{confirmTarget?.email} (username: {confirmTarget?.username})</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={onCancelDelete} disabled={deleting} className="px-3 py-2 border-4 border-black rounded-lg bg-white font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000' }}>
                Batal
              </button>
              <button onClick={onConfirmDelete} disabled={deleting} className="px-3 py-2 border-4 border-black rounded-lg bg-[#FFD803] font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000' }}>
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
