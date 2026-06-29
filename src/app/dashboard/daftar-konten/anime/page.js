'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, ArrowLeft, MoreHorizontal, Trash2, Pencil, Eye, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAnime, deleteAnime, getAnimeStats } from '@/lib/api';

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

const STATUS_META = {
  ONGOING:   { label: 'Berlangsung' },
  COMPLETED: { label: 'Selesai' },
  HIATUS:    { label: 'Hiatus' },
  UPCOMING:  { label: 'Segera' },
};

export default function AnimeListPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [stats, setStats] = useState({ ONGOING: 0, COMPLETED: 0, HIATUS: 0, UPCOMING: 0, total: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

  // Load stats
  const loadStats = async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      const token = getSession()?.token;
      const res = await getAnimeStats({ token });


      // Handle various response structures from backend
      // New format: data.by_status {ongoing, completed, hiatus, upcoming}
      // Old format: data.counts {ONGOING, COMPLETED, HIATUS, UPCOMING}
      const data = res?.data || res || {};
      const byStatus = data.by_status || {};
      const counts = data.counts || {};


      const newStats = {
        ONGOING: byStatus.ongoing || counts.ONGOING || 0,
        COMPLETED: byStatus.completed || counts.COMPLETED || 0,
        HIATUS: byStatus.hiatus || counts.HIATUS || 0,
        UPCOMING: byStatus.upcoming || counts.UPCOMING || 0,
        total: data.total || 0,
      };

      setStats(newStats);
    } catch (err) {
      console.error('Gagal load stats:', err);
      toast.error('Gagal memuat statistik anime');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadList = async ({ page: p = 1 } = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const res = await listAnime({ token, page: p, limit, q: q || undefined, status: status || undefined });
      const data = res?.data || res?.items || res || [];
      const meta = res?.meta || {};
      setItems(Array.isArray(data) ? data : []);
      setTotal(meta?.total ?? data?.length ?? 0);
      setPage(p);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat anime');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (user) loadList({ page: 1 });
  }, [user, status, limit]);

  useEffect(() => {
    const timer = setTimeout(() => { if (user) loadList({ page: 1 }); }, 400);
    return () => clearTimeout(timer);
  }, [q]);

  // Load stats on mount
  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const onDelete = async (id) => {
    if (!confirm('Hapus anime ini? Semua episode juga akan terhapus.')) return;
    setDeletingId(id);
    try {
      const token = getSession()?.token;
      await deleteAnime({ token, id });
      toast.success('Anime dihapus');
      loadList({ page });
      loadStats(); // Refresh stats
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus');
    } finally {
      setDeletingId(null);
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
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">Daftar Anime</h1>
                <p className="text-sm opacity-70">Kelola semua anime dan episode</p>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard/daftar-konten/anime/create')} className="btn btn--primary btn--sm">
              <Plus className="w-4 h-4" /> Tambah Anime
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(STATUS_META).map(([key, meta]) => {
              const count = stats[key] || 0;
              const active = status === key;
              return (
                <button
                  key={key}
                  onClick={() => setStatus(active ? '' : key)}
                  className={`stat-card text-left border-2 border-[var(--border)] ${active ? 'bg-[var(--foreground)] text-[var(--background)]' : ''}`}
                  style={{ boxShadow: active ? 'var(--shadow-md)' : 'var(--shadow-md)' }}
                >
                  <div className="text-xs font-extrabold uppercase tracking-wide label">{meta.label}</div>
                  <div className="mt-1 text-2xl font-black">{loadingStats ? '-' : count}</div>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="card p-3 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input
                type="text"
                placeholder="Cari anime..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="input w-full pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 opacity-60 flex-shrink-0" />
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="select">
                <option value="">Semua Status</option>
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="select">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {loadingList && items.length === 0 ? (
              <div className="card p-8 text-center">
                <Search className="w-8 h-8 mx-auto mb-3 animate-pulse" style={{ color: 'var(--muted)' }} />
                <p className="label">Memuat anime...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="section-title">Tidak ada anime</p>
                <p className="label mt-1">Coba ubah filter atau tambah anime baru</p>
              </div>
            ) : (
              items.map((item) => {
                const statusLabel = STATUS_META[item.status_anime]?.label ?? item.status_anime ?? '-';
                return (
                  <div
                    key={item.id}
                    className="card p-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Cover */}
                      <div className="w-14 h-18 sm:w-16 sm:h-22 border-2 border-[var(--border)] overflow-hidden flex-shrink-0" style={{ aspectRatio: '2/3', width: '56px', minWidth: '56px' }}>
                        {(item.cover_anime || item.gambar_anime) ? (
                          <img
                            src={item.cover_anime || item.gambar_anime}
                            alt={item.nama_anime}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-center opacity-30 p-1">No Image</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-extrabold truncate">{item.nama_anime}</h3>
                          <span className="border-2 border-[var(--border)] px-2 py-0 text-[10px] font-extrabold uppercase tracking-wide">
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-xs opacity-60 line-clamp-1 mt-0.5">{item.sinopsis_anime || '-'}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs opacity-50 flex-wrap">
                          <span>Ep: {Array.isArray(item.episodes) ? item.episodes.length : (item.episode_count || 0)}</span>
                          <span>Rating: {item.rating_anime || '-'}</span>
                          <span className="truncate">{Array.isArray(item.genre_anime) ? item.genre_anime.join(', ') : (item.genre_anime || '-')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 justify-end sm:flex-shrink-0">
                      <button onClick={() => router.push(`/dashboard/daftar-konten/anime/${item.id}`)} className="btn btn--secondary btn--sm" title="Lihat detail">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => router.push(`/dashboard/daftar-konten/anime/${item.id}/batch-upload`)} className="btn btn--secondary btn--sm" title="Batch Upload Episode">
                        <Upload className="w-4 h-4" />
                      </button>
                      <button onClick={() => router.push(`/dashboard/daftar-konten/anime/${item.id}/edit`)} className="btn btn--secondary btn--sm" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(item.id)} disabled={deletingId === item.id} className="btn btn--danger btn--sm disabled:opacity-50" title="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => loadList({ page: Math.max(1, page - 1) })} disabled={page <= 1 || loadingList} className="btn btn--secondary disabled:opacity-60 inline-flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>
              <span className="text-sm font-extrabold">Halaman {page} dari {totalPages}</span>
              <button onClick={() => loadList({ page: Math.min(totalPages, page + 1) })} disabled={page >= totalPages || loadingList} className="btn btn--secondary disabled:opacity-60 inline-flex items-center gap-1">
                Selanjutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
