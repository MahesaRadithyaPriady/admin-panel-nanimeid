'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Inbox, CheckCircle2, XCircle, Clock, Loader2, Trash2, RefreshCw, Eye, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAnimeRequests, deleteAnimeRequest, takeAnimeRequest, updateAnimeRequest } from '@/lib/api';

const REQUEST_STATUSES = ['PENDING', 'UNDER_REVIEW', 'UPLOAD_IN_PROGRESS', 'COMPLETED', 'REJECTED'];

const STATUS_META = {
  ALL:                { label: 'Semua',   icon: Filter },
  PENDING:            { label: 'Menunggu', icon: Clock },
  UNDER_REVIEW:       { label: 'Ditinjau', icon: Eye },
  UPLOAD_IN_PROGRESS: { label: 'Proses',   icon: Loader2 },
  COMPLETED:          { label: 'Selesai',  icon: CheckCircle2 },
  REJECTED:           { label: 'Ditolak',  icon: XCircle },
};

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

export default function AnimeRequestsPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const canManage = useMemo(() => {
    if (!user) return false;
    return user.role === 'SUPERADMIN' || (user.permissions || []).includes('anime_request_review');
  }, [user]);

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

  const loadList = async ({ page: p = 1, status: s } = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const res = await listAnimeRequests({ token, page: p, limit, status: s || status || undefined });
      const data = res?.data || res?.items || res || [];
      const meta = res?.meta || {};
      setItems(Array.isArray(data) ? data : []);
      setTotal(meta?.total ?? data?.length ?? 0);
      setPage(p);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat permintaan');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { if (user) loadList({ page: 1 }); }, [user, status]);

  const onDelete = async (id) => {
    if (!confirm('Hapus permintaan ini?')) return;
    setDeletingId(id);
    try {
      const token = getSession()?.token;
      await deleteAnimeRequest({ token, id });
      toast.success('Permintaan dihapus');
      loadList({ page });
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus');
    } finally {
      setDeletingId(null);
    }
  };

  const onTake = async (id) => {
    try {
      const token = getSession()?.token;
      await takeAnimeRequest({ token, id });
      toast.success('Permintaan diambil');
      loadList({ page });
    } catch (err) {
      toast.error(err?.message || 'Gagal mengambil');
    }
  };

  const onUpdateStatus = async (id, newStatus) => {
    try {
      const token = getSession()?.token;
      await updateAnimeRequest({ token, id, payload: { status: newStatus } });
      toast.success('Status diperbarui');
      loadList({ page });
    } catch (err) {
      toast.error(err?.message || 'Gagal memperbarui');
    }
  };

  const totalPages = Math.max(1, Math.ceil((total || 0) / Math.max(1, limit)));

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6 min-w-0">
      {loading || !user ? null : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard/daftar-konten')} className="btn btn--secondary btn--sm">
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
              <div>
                <h1 className="page-title">Permintaan Anime</h1>
                <p className="label">Kelola permintaan anime dari pengguna</p>
              </div>
            </div>
            <button onClick={() => loadList()} disabled={loadingList} className="btn btn--secondary btn--sm">
              <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Status Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {REQUEST_STATUSES.map((s) => {
              const meta = STATUS_META[s];
              const count = items.filter((it) => it.status === s).length;
              const Icon = meta.icon;
              const isActive = status === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(isActive ? '' : s)}
                  className={`stat-card text-left ${isActive ? 'ring-2 ring-[var(--foreground)]' : ''}`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Icon className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                    <span className="stat-card__label">{meta.label}</span>
                  </div>
                  <div className="stat-card__value">{count}</div>
                </button>
              );
            })}
          </div>

          {/* Filter */}
          <div className="filter-bar">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4" style={{ color: 'var(--muted)' }} />
              <span className="label">Filter Status:</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="select">
                <option value="">Semua Status</option>
                {REQUEST_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
              {status && (
                <button onClick={() => setStatus('')} className="btn btn--secondary btn--sm">Reset</button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {loadingList && items.length === 0 ? (
              <div className="card p-8 text-center">
                <Loader2 className="w-8 h-8 mx-auto animate-spin" style={{ color: 'var(--muted)' }} />
                <p className="label mt-3">Memuat permintaan...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="card p-12 text-center">
                <Inbox className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
                <p className="section-title">Belum ada permintaan</p>
                <p className="label mt-1">Permintaan anime dari pengguna akan muncul di sini</p>
              </div>
            ) : (
              items.map((item) => {
                const meta = STATUS_META[item.status] || STATUS_META.ALL;
                const Icon = meta.icon || Clock;
                return (
                  <div key={item.id} className="card p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="badge"><Icon className="w-3 h-3" /> {meta.label}</span>
                          <span className="mono text-xs" style={{ color: 'var(--muted)' }}>
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                        <h3 className="section-title truncate">{item.title}</h3>
                        <p className="label line-clamp-2">{item.description || '-'}</p>
                        {item.requested_by && (
                          <p className="mono text-xs mt-1" style={{ color: 'var(--muted)' }}>Oleh: {item.requested_by}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {canManage && item.status === 'PENDING' && (
                          <button onClick={() => onTake(item.id)} className="btn btn--primary btn--sm">Ambil</button>
                        )}
                        {canManage && (
                          <select value={item.status} onChange={(e) => onUpdateStatus(item.id, e.target.value)} className="select">
                            {REQUEST_STATUSES.map((s) => (
                              <option key={s} value={s}>{STATUS_META[s].label}</option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={() => onDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="btn btn--danger btn--sm btn--icon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button onClick={() => loadList({ page: Math.max(1, page - 1) })} disabled={page <= 1 || loadingList} className="btn btn--secondary btn--sm">
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>
              <span className="mono text-sm font-bold">Halaman {page} dari {totalPages}</span>
              <button onClick={() => loadList({ page: Math.min(totalPages, page + 1) })} disabled={page >= totalPages || loadingList} className="btn btn--secondary btn--sm">
                Selanjutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
