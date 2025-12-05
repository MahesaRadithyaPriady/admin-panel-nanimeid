'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Users, Plus, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getBadge, listBadgeOwners, addBadgeOwner, updateBadgeOwner, deleteBadgeOwner } from '@/lib/api';

export default function BadgeOwnersPage() {
  const router = useRouter();
  const params = useParams();
  const badgeId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) return raw[0];
    return raw;
  }, [params]);

  const { user, loading } = useSession();
  const isSuperAdmin = (user?.role || '').toUpperCase() === 'SUPERADMIN';

  const [badgeInfo, setBadgeInfo] = useState(null);

  const [owners, setOwners] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  const [newUserId, setNewUserId] = useState('');
  const [newActive, setNewActive] = useState(true);
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [actingId, setActingId] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadBadgeInfo = async () => {
    try {
      const token = getSession()?.token;
      if (!token || !badgeId) return;
      const data = await getBadge({ token, id: badgeId });
      setBadgeInfo(data || null);
    } catch {}
  };

  const loadOwners = async (opts = {}) => {
    if (!isSuperAdmin || !badgeId) return;
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = { page, limit, q: q.trim(), active: activeFilter };
      const data = await listBadgeOwners({ token, badgeId, ...params, ...opts });
      setOwners(Array.isArray(data.items) ? data.items : []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat owners badge');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin || !badgeId) return;
    loadBadgeInfo();
  }, [isSuperAdmin, badgeId]);

  useEffect(() => {
    if (!isSuperAdmin || !badgeId) return;
    loadOwners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, activeFilter, isSuperAdmin, badgeId]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadOwners({ page: 1 });
  };

  const onAdd = async (e) => {
    e.preventDefault();
    const uid = newUserId.trim();
    if (!uid) return toast.error('user_id wajib');
    const num = Number(uid);
    if (!Number.isFinite(num) || num <= 0) return toast.error('user_id harus angka > 0');

    const token = getSession()?.token;
    if (!token || !badgeId) return toast.error('Token atau badgeId tidak tersedia');

    try {
      setSubmitting(true);
      const payload = {
        user_id: num,
        active: !!newActive,
      };
      if (newExpiresAt) {
        payload.expires_at = new Date(newExpiresAt).toISOString();
      }
      const res = await addBadgeOwner({ token, badgeId, payload });
      toast.success(res?.message || 'Badge owner ditambahkan');
      setNewUserId('');
      setNewActive(true);
      setNewExpiresAt('');
      setPage(1);
      await loadOwners({ page: 1 });
    } catch (err) {
      toast.error(err?.message || 'Gagal menambahkan badge owner');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (owner) => {
    const token = getSession()?.token;
    if (!token || !badgeId) return toast.error('Token atau badgeId tidak tersedia');
    try {
      setActingId(owner.id);
      const res = await updateBadgeOwner({
        token,
        badgeId,
        ownerId: owner.id,
        payload: { active: !owner.active },
      });
      toast.success(res?.message || 'Owner diupdate');
      await loadOwners();
    } catch (err) {
      toast.error(err?.message || 'Gagal mengubah status owner');
    } finally {
      setActingId(null);
    }
  };

  const onRequestDelete = (owner) => {
    setConfirmTarget(owner);
    setConfirmOpen(true);
  };

  const onCancelDelete = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const onConfirmDelete = async () => {
    if (!confirmTarget) return;
    const token = getSession()?.token;
    if (!token || !badgeId) return toast.error('Token atau badgeId tidak tersedia');
    try {
      setDeleting(true);
      const res = await deleteBadgeOwner({ token, badgeId, ownerId: confirmTarget.id });
      toast.success(res?.message || 'Owner dihapus');
      await loadOwners();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus owner');
    } finally {
      setDeleting(false);
      setConfirmTarget(null);
      setConfirmOpen(false);
    }
  };

  if (loading || !user) return null;
  if (!isSuperAdmin) {
    return (
      <div className="text-sm font-semibold">
        Halaman ini khusus superadmin. Anda login sebagai{' '}
        <span className="px-2 py-1 border-2 rounded" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}>
          {user.role}
        </span>
        .
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/badges"
            className="px-2 py-1 border-4 rounded font-extrabold"
            style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <Users className="size-5" /> Pemilik Badge {badgeInfo?.name ? `- ${badgeInfo.name}` : `#${badgeId}`}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-3 py-2 border-4 rounded-lg font-extrabold text-sm"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
        >
          Kembali
        </button>
      </div>

      {badgeInfo && (
        <div
          className="p-3 border-4 rounded-lg flex items-center gap-3"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
        >
          {badgeInfo.badge_url && (
            <img
              src={badgeInfo.badge_url}
              alt={badgeInfo.name || badgeInfo.code}
              className="w-12 h-12 object-contain border-2 rounded"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
            />
          )}
          <div>
            <div className="font-extrabold text-sm">
              {badgeInfo.name} ({badgeInfo.code})
            </div>
            <div className="text-xs font-semibold opacity-80">
              Sort: {badgeInfo.sort_order ?? '-'} | Aktif: {badgeInfo.is_active ? 'Ya' : 'Tidak'}
            </div>
          </div>
        </div>
      )}

      <div
        className="p-3 border-4 rounded-lg"
        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
      >
        <form onSubmit={onSearch} className="grid sm:grid-cols-[2fr_1fr_140px] gap-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari username/email/nama badge"
            className="px-3 py-2 border-4 rounded-lg font-semibold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          />
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 border-4 rounded-lg font-semibold text-sm"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <option value="">Semua status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
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

      <div
        className="p-3 border-4 rounded-lg"
        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
      >
        <form onSubmit={onAdd} className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-center">
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
              className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60 text-sm"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}
            >
              {submitting ? 'Menyimpan...' : (
                <span className="inline-flex items-center justify-center gap-2">
                  <Plus className="size-4" />
                  <span>Tambah Owner</span>
                </span>
              )}
            </button>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 border-4 rounded-lg"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <Clock className="size-4 flex-shrink-0" />
            <input
              type="datetime-local"
              value={newExpiresAt}
              onChange={(e) => setNewExpiresAt(e.target.value)}
              className="w-full bg-transparent outline-none font-semibold text-xs"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} /> Aktif
          </label>
        </form>
      </div>

      <div className="overflow-auto">
        <table
          className="min-w-full border-4 rounded-lg overflow-hidden"
          style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
        >
          <thead style={{ background: 'var(--panel-bg)' }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>User</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Status</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Kadaluarsa</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>
                  {it.id}
                </td>
                <td className="px-3 py-2 border-b-4 font-semibold text-xs" style={{ borderColor: 'var(--panel-border)' }}>
                  <div>ID: {it.user_id}</div>
                  <div>{it.user?.username || '-'}</div>
                  <div>{it.user?.email || '-'}</div>
                </td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                  <span
                    className="px-2 py-1 border-2 rounded text-xs font-extrabold"
                    style={{
                      borderColor: 'var(--panel-border)',
                      background: it.active ? 'var(--accent-add)' : 'var(--panel-bg)',
                      color: it.active ? 'var(--accent-add-foreground)' : 'var(--foreground)',
                    }}
                  >
                    {it.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-3 py-2 border-b-4 text-xs font-semibold" style={{ borderColor: 'var(--panel-border)' }}>
                  {it.expires_at ? new Date(it.expires_at).toLocaleString() : '-'}
                </td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(it)}
                      disabled={actingId === it.id}
                      className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60"
                      style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                      title={it.active ? 'Set Nonaktif' : 'Set Aktif'}
                    >
                      {it.active ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(it)}
                      className="px-2 py-1 border-4 rounded font-extrabold"
                      style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {owners.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm opacity-70">
                  {loadingList ? 'Memuat...' : 'Belum ada owner.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
        >
          Prev
        </button>
        <div className="text-sm font-extrabold">
          Page {page} / {totalPages}
        </div>
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
                <h3 className="text-lg font-extrabold">Hapus Owner?</h3>
                <p className="text-sm opacity-80 break-words">
                  Owner ID {confirmTarget?.id} untuk user_id {confirmTarget?.user_id}
                </p>
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
