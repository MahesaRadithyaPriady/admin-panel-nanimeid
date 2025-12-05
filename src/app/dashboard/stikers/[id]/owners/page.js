'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { List, Plus, Trash2 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listStickerOwners, addStickerOwner, deleteStickerOwner, getSticker } from '@/lib/api';

export default function StickerOwnersPage() {
  const router = useRouter();
  const params = useParams();
  const stickerId = Number(params?.id);
  const { user, loading } = useSession();
  const role = (user?.role || '').toLowerCase();
  const canAccess = role === 'superadmin';

  const [sticker, setSticker] = useState(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  const [newUserId, setNewUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadSticker = async () => {
    try {
      const token = getSession()?.token;
      if (!token || !stickerId) return;
      const data = await getSticker({ token, id: stickerId });
      setSticker(data || null);
    } catch (err) {
      toast.error(err?.message || 'Gagal mengambil data stiker');
    }
  };

  const loadOwners = async (opts = {}) => {
    if (!canAccess || !stickerId) return;
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = { page, limit, userId: userIdFilter ? Number(userIdFilter) : '' };
      const data = await listStickerOwners({ token, stickerId, ...params, ...opts });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat ownership stiker');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!canAccess || !stickerId) return;
    loadSticker();
  }, [canAccess, stickerId]);

  useEffect(() => {
    if (!canAccess || !stickerId) return;
    loadOwners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, canAccess, stickerId]);

  const onFilter = (e) => {
    e.preventDefault();
    setPage(1);
    loadOwners({ page: 1 });
  };

  const onAdd = async (e) => {
    e.preventDefault();
    if (!newUserId.trim()) return toast.error('user_id wajib diisi');
    const token = getSession()?.token;
    if (!token || !stickerId) return toast.error('Token atau stickerId tidak tersedia');
    try {
      setSubmitting(true);
      const uid = Number(newUserId);
      if (!Number.isFinite(uid) || uid <= 0) {
        toast.error('user_id harus angka > 0');
        return;
      }
      const res = await addStickerOwner({ token, stickerId, user_id: uid });
      toast.success(res?.message || 'Ownership stiker ditambahkan');
      setNewUserId('');
      setPage(1);
      await loadOwners({ page: 1 });
    } catch (err) {
      toast.error(err?.message || 'Gagal menambahkan ownership');
    } finally {
      setSubmitting(false);
    }
  };

  const onRequestDelete = (it) => {
    setConfirmTarget(it);
    setConfirmOpen(true);
  };

  const onCancelDelete = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const onConfirmDelete = async () => {
    if (!confirmTarget) return;
    const token = getSession()?.token;
    if (!token || !stickerId) return toast.error('Token atau stickerId tidak tersedia');
    try {
      setDeleting(true);
      const uid = confirmTarget.user_id;
      const res = await deleteStickerOwner({ token, stickerId, userId: uid });
      toast.success(res?.message || 'Ownership stiker dihapus');
      await loadOwners();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus ownership');
    } finally {
      setDeleting(false);
      setConfirmTarget(null);
      setConfirmOpen(false);
    }
  };

  if (loading || !user) return null;
  if (!canAccess) {
    return (
      <div className="text-sm font-semibold">
        Halaman ini khusus superadmin. Anda login sebagai{' '}
        <span className="px-2 py-1 border-2 rounded" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}>{user.role}</span>.
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <List className="size-5" /> Ownership Stiker
        </h2>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-3 py-2 border-4 rounded-lg font-extrabold text-sm"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
        >
          Kembali
        </button>
      </div>

      {sticker && (
        <div className="p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="font-extrabold mb-1">Stiker</div>
          <div className="text-sm font-semibold">{sticker.name} ({sticker.code})</div>
          {sticker.image_url && (
            <div className="mt-2">
              <img
                src={sticker.image_url}
                alt={sticker.name || sticker.code}
                className="w-12 h-12 object-contain border-2 rounded"
                style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Filter User */}
      <div className="p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <form onSubmit={onFilter} className="grid sm:grid-cols-[1fr_140px] gap-3">
          <input
            type="number"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            placeholder="Filter by user_id (opsional)"
            className="px-3 py-2 border-4 rounded-lg font-semibold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          />
          <button
            type="submit"
            disabled={loadingList}
            className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}
          >
            {loadingList ? 'Memuat...' : 'Terapkan'}
          </button>
        </form>
      </div>

      {/* Tambah Ownership */}
      <div className="p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <form onSubmit={onAdd} className="grid sm:grid-cols-[1fr_150px] gap-3 items-center">
          <input
            type="number"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            placeholder="user_id (wajib)"
            className="px-3 py-2 border-4 rounded-lg font-semibold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}
          >
            {submitting ? (
              'Menambah...'
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                <Plus className="size-4" />
                <span>Tambah</span>
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Tabel Ownership */}
      <div className="overflow-auto">
        <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <thead style={{ background: 'var(--panel-bg)' }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>User ID</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Sticker ID</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Acquired At</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.id}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.user_id}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.sticker_id}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.acquired_at || '-'}</td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                  <button
                    type="button"
                    onClick={() => onRequestDelete(it)}
                    className="px-2 py-1 border-4 rounded font-extrabold"
                    style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Belum ada ownership.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
        >
          Prev
        </button>
        <div className="text-sm font-extrabold">Page {page} / {totalPages}</div>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
        >
          Next
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete} />
          <div
            className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6"
            style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="grid place-items-center size-10 bg-[#FEB2B2] border-4 rounded-md"
                style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}
              >
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Hapus Ownership?</h3>
                <p className="text-sm opacity-80 break-words">user_id {confirmTarget?.user_id} untuk sticker_id {confirmTarget?.sticker_id}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={onCancelDelete}
                className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={onConfirmDelete}
                className="px-3 py-2 border-4 rounded-lg bg-[#FFD803] hover:brightness-95 font-extrabold disabled:opacity-60"
                style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
