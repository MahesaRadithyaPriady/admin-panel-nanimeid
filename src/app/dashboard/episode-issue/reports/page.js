'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BadgeCheck, Pencil, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listEpisodeVideoIssueReports, listEpisodeVideoIssueReasons, updateEpisodeVideoIssueReport, updateEpisodeVideoIssueReportStatus, deleteEpisodeVideoIssueReport } from '@/lib/api';

export default function EpisodeIssueReportsPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [loadingList, setLoadingList] = useState(false);

  const [status, setStatus] = useState('');
  const [episodeId, setEpisodeId] = useState('');
  const [userId, setUserId] = useState('');
  const [reasonId, setReasonId] = useState('');

  const [reasons, setReasons] = useState([]);

  const [editing, setEditing] = useState(null); // { id, reason_id, note, metadataText, status }
  const [submitting, setSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const canAccess = useMemo(() => {
    const role = String(user?.role || '').toLowerCase();
    if (role === 'superadmin') return true;
    const perms = Array.isArray(user?.permissions) ? user.permissions : [];
    return perms.includes('episode-video-issues');
  }, [user]);

  useEffect(() => {
    if (!loading && user && !canAccess) {
      toast.error('Tidak punya permission: episode-video-issues');
      router.replace('/dashboard');
    }
  }, [loading, user, canAccess, router]);

  const loadReasons = async () => {
    try {
      const token = getSession()?.token;
      const res = await listEpisodeVideoIssueReasons({ token, include_inactive: true });
      setReasons(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      setReasons([]);
    }
  };

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const page = opts.page ?? pagination.page;
      const limit = opts.limit ?? pagination.limit;
      const res = await listEpisodeVideoIssueReports({
        token,
        page,
        limit,
        status: status || undefined,
        episode_id: episodeId || undefined,
        user_id: userId || undefined,
        reason_id: reasonId || undefined,
      });
      setItems(Array.isArray(res?.items) ? res.items : []);
      setPagination(res?.pagination || { page, limit, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat reports');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user || !canAccess) return;
    loadReasons();
    loadList({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canAccess]);

  const onSearch = (e) => {
    e.preventDefault();
    setEditing(null);
    loadList({ page: 1 });
  };

  const onStartEdit = (it) => {
    setEditing({
      id: it.id,
      reason_id: it.reason_id ?? '',
      note: it.note ?? '',
      metadataText: it.metadata ? JSON.stringify(it.metadata, null, 2) : '',
      status: it.status || 'PENDING',
    });
  };

  const onCancelEdit = () => setEditing(null);

  const parseMetadata = (text) => {
    const raw = (text || '').trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('Metadata harus JSON valid (atau kosong)');
    }
  };

  const onSaveEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    const token = getSession()?.token;

    let metadata;
    try {
      metadata = parseMetadata(editing.metadataText);
    } catch (err) {
      return toast.error(err?.message || 'Metadata tidak valid');
    }

    const payload = {
      reason_id: editing.reason_id === '' ? null : Number(editing.reason_id),
      note: editing.note === '' ? null : editing.note,
      metadata,
      status: editing.status,
    };

    try {
      setSubmitting(true);
      const res = await updateEpisodeVideoIssueReport({ token, id: editing.id, payload });
      toast.success(res?.message || 'Report diperbarui');
      setEditing(null);
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan report');
    } finally {
      setSubmitting(false);
    }
  };

  const onQuickStatus = async (id, nextStatus) => {
    const token = getSession()?.token;
    try {
      setSubmitting(true);
      const res = await updateEpisodeVideoIssueReportStatus({ token, id, status: nextStatus });
      toast.success(res?.message || 'Status diperbarui');
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal update status');
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
    try {
      setDeleting(true);
      const res = await deleteEpisodeVideoIssueReport({ token, id: confirmTarget.id });
      toast.success(res?.message || 'Report dihapus');
      setConfirmOpen(false);
      setConfirmTarget(null);
      if (editing?.id === confirmTarget.id) setEditing(null);
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus report');
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !user) return null;
  if (!canAccess) return null;

  const totalPages = Math.max(1, Number(pagination?.totalPages) || Math.ceil((pagination?.total || 0) / (pagination?.limit || 1)) || 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2"><BadgeCheck className="size-5" /> Episode Issue - Reports</h2>
      </div>

      <div className="p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <form onSubmit={onSearch} className="grid gap-3">
          <div className="grid sm:grid-cols-4 gap-3">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <option value="">Semua status</option>
              <option value="PENDING">PENDING</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="FIXED">FIXED</option>
            </select>
            <input value={episodeId} onChange={(e) => setEpisodeId(e.target.value)} placeholder="episode_id" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user_id" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
            <select value={reasonId} onChange={(e) => setReasonId(e.target.value)} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <option value="">Semua reason</option>
              {reasons.map((r) => (
                <option key={r.id} value={String(r.id)}>{r.code} - {r.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={loadingList} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
              {loadingList ? 'Memuat...' : 'Cari'}
            </button>
            <button type="button" onClick={() => { setStatus(''); setEpisodeId(''); setUserId(''); setReasonId(''); setEditing(null); loadList({ page: 1 }); }} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              Reset
            </button>
          </div>
        </form>
      </div>

      {editing && (
        <div className="p-3 border-4 rounded-lg space-y-3" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="text-sm font-extrabold">Edit Report #{editing.id}</div>
          <form onSubmit={onSaveEdit} className="grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <select value={String(editing.reason_id ?? '')} onChange={(e) => setEditing((s) => ({ ...s, reason_id: e.target.value }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <option value="">(hapus reason)</option>
                {reasons.map((r) => (
                  <option key={r.id} value={String(r.id)}>{r.code} - {r.title}</option>
                ))}
              </select>
              <select value={editing.status} onChange={(e) => setEditing((s) => ({ ...s, status: e.target.value }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <option value="PENDING">PENDING</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="FIXED">FIXED</option>
              </select>
            </div>
            <textarea value={editing.note ?? ''} onChange={(e) => setEditing((s) => ({ ...s, note: e.target.value }))} placeholder="Note (opsional)" rows={2} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
            <textarea value={editing.metadataText ?? ''} onChange={(e) => setEditing((s) => ({ ...s, metadataText: e.target.value }))} placeholder="Metadata (JSON, opsional)" rows={5} className="px-3 py-2 border-4 rounded-lg font-mono text-xs" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />

            <div className="flex items-center gap-2">
              <button type="submit" disabled={submitting} className="flex w-32 py-2 items-center justify-center gap-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>
                {submitting ? 'Menyimpan...' : (<><Save className="size-4" /> Simpan</>)}
              </button>
              <button type="button" onClick={onCancelEdit} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-auto">
        <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <thead style={{ background: 'var(--panel-bg)' }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Status</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>User</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Episode</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Reason</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Note</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Dibuat</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.id}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.status}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.user?.username ? `${it.user.username} (#${it.user_id})` : `#${it.user_id}`}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.episode?.anime?.nama_anime ? `${it.episode.anime.nama_anime} - Ep ${it.episode.nomor_episode}` : `#${it.episode_id}`}</td>
                <td className="px-3 py-2 border-b-4 text-xs font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.reason?.code ? `${it.reason.code}` : (it.reason_id ? `#${it.reason_id}` : '-')}</td>
                <td className="px-3 py-2 border-b-4 text-xs" style={{ borderColor: 'var(--panel-border)' }}>{it.note || '-'}</td>
                <td className="px-3 py-2 border-b-4 text-xs font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.createdAt ? new Date(it.createdAt).toLocaleString() : '-'}</td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => onStartEdit(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" onClick={() => onQuickStatus(it.id, 'PENDING')} disabled={submitting} className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>
                      P
                    </button>
                    <button type="button" onClick={() => onQuickStatus(it.id, 'IN_PROGRESS')} disabled={submitting} className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>
                      IP
                    </button>
                    <button type="button" onClick={() => onQuickStatus(it.id, 'FIXED')} disabled={submitting} className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60" style={{ boxShadow: '3px 3px 0 #000', background: '#C6F6D5', color: '#111', borderColor: 'var(--panel-border)' }}>
                      FIX
                    </button>
                    <button type="button" onClick={() => onRequestDelete(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Belum ada report.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button disabled={(pagination.page || 1) <= 1 || loadingList} onClick={() => loadList({ page: Math.max(1, (pagination.page || 1) - 1) })} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Sebelumnya</button>
        <div className="text-sm font-extrabold">Halaman {pagination.page || 1} / {totalPages}</div>
        <button disabled={(pagination.page || 1) >= totalPages || loadingList} onClick={() => loadList({ page: (pagination.page || 1) + 1 })} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Berikutnya</button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete} />
          <div className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="text-lg font-extrabold mb-1">Hapus Report?</div>
            <div className="text-sm opacity-80 mb-4 break-words">Report #{confirmTarget?.id}</div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" disabled={deleting} onClick={onCancelDelete} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Batal</button>
              <button type="button" disabled={deleting} onClick={onConfirmDelete} className="px-3 py-2 border-4 rounded-lg bg-[#FFD803] hover:brightness-95 font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>{deleting ? 'Menghapus...' : 'Ya, Hapus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
