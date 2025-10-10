'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Users, Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listBorderOwners, addOrUpdateBorderOwner, updateBorderOwner, deleteBorderOwner, getAvatarBorder } from '@/lib/api';

export default function BorderOwnersPage() {
  const router = useRouter();
  const params = useParams();
  const borderId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) return raw[0];
    return raw;
  }, [params]);

  const { user, loading } = useSession();
  const isSuperAdmin = (user?.role || '').toUpperCase() === 'SUPERADMIN';

  // Border info (optional header)
  const [borderInfo, setBorderInfo] = useState(null);

  // List & filters
  const [owners, setOwners] = useState([]);
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  // Add / Upsert form
  const [upUserId, setUpUserId] = useState('');
  const [upActive, setUpActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Update owner active inline
  const [actingId, setActingId] = useState(null);

  // Delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadBorderInfo = async () => {
    try {
      const token = getSession()?.token;
      const data = await getAvatarBorder({ token, id: borderId });
      setBorderInfo(data?.data || data || null);
    } catch {}
  };

  const loadOwners = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const data = await listBorderOwners({ token, borderId, page, limit, userId: userId.trim(), ...opts });
      setOwners(Array.isArray(data.items) ? data.items : []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat owners');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin || !borderId) return;
    loadBorderInfo();
    loadOwners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borderId, page, limit, isSuperAdmin]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadOwners({ page: 1 });
  };

  const onUpsert = async (e) => {
    e.preventDefault();
    const uid = upUserId.trim();
    if (!uid) return toast.error('user_id wajib');
    try {
      setSubmitting(true);
      const token = getSession()?.token;
      const res = await addOrUpdateBorderOwner({ token, borderId, user_id: Number(uid), is_active: !!upActive });
      toast.success(res?.message || 'Ownership ditambahkan/diperbarui');
      setUpUserId('');
      setUpActive(false);
      setPage(1);
      await loadOwners({ page: 1 });
    } catch (err) {
      toast.error(err?.message || 'Gagal menambahkan ownership');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleOwnerActive = async (it) => {
    const token = getSession()?.token;
    try {
      setActingId(it.id);
      const res = await updateBorderOwner({ token, borderId, userId: it.user_id, is_active: !it.is_active });
      toast.success(res?.message || 'Ownership diupdate');
      await loadOwners();
    } catch (err) {
      toast.error(err?.message || 'Gagal mengubah status ownership');
    } finally {
      setActingId(null);
    }
  };

  const onRequestDelete = (it) => {
    setConfirmTarget(it);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!confirmTarget) return;
    const token = getSession()?.token;
    try {
      setDeleting(true);
      await deleteBorderOwner({ token, borderId, userId: confirmTarget.user_id });
      toast.success('Ownership dihapus');
      setConfirmOpen(false);
      setConfirmTarget(null);
      await loadOwners();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus ownership');
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
            <div className="flex items-center gap-2">
              <Link href="/dashboard/avatar-borders" className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <ArrowLeft className="size-4" />
              </Link>
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <Users className="size-5" /> Pemilik Border {borderInfo?.title ? `- ${borderInfo.title}` : `#${borderId}`}
              </h2>
            </div>
          </div>

          {/* Filters */}
          <form onSubmit={onSearch} className="grid sm:grid-cols-[1fr_120px] gap-3 mb-4">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Filter ID Pengguna"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            />
            <button type="submit" className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>Terapkan</button>
          </form>

          {/* Upsert form */}
          <form onSubmit={onUpsert} className="grid sm:grid-cols-[1fr_160px_140px] gap-3 mb-4">
            <input
              type="number"
              value={upUserId}
              onChange={(e) => setUpUserId(e.target.value)}
              placeholder="user_id"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            />
            <label className="flex items-center gap-2 font-extrabold">
              <input type="checkbox" checked={upActive} onChange={(e) => setUpActive(e.target.checked)} /> Set Aktif
            </label>
            <button type="submit" disabled={submitting} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}>
              {submitting ? 'Menyimpan...' : (<><Plus className="inline size-4" /> Tambah / Perbarui</>)}
            </button>
          </form>

          {/* Table */}
          <div className="overflow-auto">
            <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <thead style={{ background: 'var(--panel-bg)' }}>
                <tr>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>ID Pengguna</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aktif</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Didapat Pada</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2 border-b-4 font-extrabold" style={{ borderColor: 'var(--panel-border)' }}>{it.user_id}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>
                      <span className="px-2 py-1 border-2 rounded" style={{ borderColor: 'var(--panel-border)', background: it.is_active ? 'var(--accent-add)' : 'var(--panel-bg)', color: it.is_active ? 'var(--accent-add-foreground)' : 'var(--foreground)' }}>{it.is_active ? 'Aktif' : 'Nonaktif'}</span>
                    </td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.obtained_at ? new Date(it.obtained_at).toLocaleString() : '-'}</td>
                    <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleOwnerActive(it)} disabled={actingId === it.id} className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }} title={it.is_active ? 'Set Nonaktif' : 'Set Aktif'}>
                          {it.is_active ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                        </button>
                        <button onClick={() => onRequestDelete(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {owners.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Tidak ada data.'}</td>
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
              <div className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid place-items-center size-10 bg-[#FEB2B2] border-4 rounded-md" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>
                    <Trash2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">Hapus Kepemilikan?</h3>
                    <p className="text-sm opacity-80 break-words">ID Pengguna: {confirmTarget?.user_id}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={onCancelDelete} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    Batal
                  </button>
                  <button onClick={onConfirmDelete} disabled={deleting} className="px-3 py-2 border-4 rounded-lg bg-[#FFD803] hover:brightness-95 font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>
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
