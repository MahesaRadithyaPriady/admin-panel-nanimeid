'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, ArrowLeft, MoreHorizontal, Trash2, Pencil, Eye, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAnime, deleteAnime, getAnimeStats } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const STATUS_COLORS = {
  ONGOING: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Berlangsung' },
  COMPLETED: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Selesai' },
  HIATUS: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Hiatus' },
  UPCOMING: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', label: 'Segera' },
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
    console.log('loadStats called, user:', user);
    if (!user) return;
    setLoadingStats(true);
    try {
      const token = getSession()?.token;
      console.log('Token:', token ? 'exists' : 'missing');
      const res = await getAnimeStats({ token });
      console.log('Raw API Response:', JSON.stringify(res, null, 2));

      console.log('API Response:', res);

      // Handle various response structures from backend
      // New format: data.by_status {ongoing, completed, hiatus, upcoming}
      // Old format: data.counts {ONGOING, COMPLETED, HIATUS, UPCOMING}
      const data = res?.data || res || {};
      const byStatus = data.by_status || {};
      const counts = data.counts || {};

      console.log('Parsed data:', { data, byStatus, counts });

      const newStats = {
        ONGOING: byStatus.ongoing || counts.ONGOING || 0,
        COMPLETED: byStatus.completed || counts.COMPLETED || 0,
        HIATUS: byStatus.hiatus || counts.HIATUS || 0,
        UPCOMING: byStatus.upcoming || counts.UPCOMING || 0,
        total: data.total || 0,
      };

      console.log('Setting stats:', newStats);
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
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 min-w-0">
      {loading || !user ? null : (
        <>
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard/daftar-konten')}
                className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold transition-all hover:translate-y-[-2px]"
                style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">Daftar Anime</h1>
                <p className="text-sm text-[var(--foreground)]/70">Kelola semua anime dan episode</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/daftar-konten/anime/create')}
              className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-3 font-bold transition-all hover:translate-y-[-2px]"
              style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
            >
              <Plus className="w-4 h-4" /> Tambah Anime
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(STATUS_COLORS).map(([key, meta]) => {
              const count = stats[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setStatus(status === key ? '' : key)}
                  className={`rounded-xl border-2 p-4 text-left transition-all hover:translate-y-[-2px] ${status === key ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                  style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: meta.bg, borderColor: 'var(--panel-border)' }}
                >
                  <div className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</div>
                  <div className="mt-1 text-2xl font-black" style={{ color: meta.color }}>
                    {loadingStats ? '-' : count}
                  </div>
                </button>
              );
            })}
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants} className="rounded-2xl border-2 p-4" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground)]/40" />
                <input
                  type="text"
                  placeholder="Cari anime..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full rounded-lg border-2 pl-10 pr-4 py-2.5 text-sm font-semibold"
                  style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[var(--foreground)]/60" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                  style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                >
                  <option value="">Semua Status</option>
                  {Object.entries(STATUS_COLORS).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                  style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* List */}
          <motion.div variants={itemVariants} className="space-y-3">
            {loadingList && items.length === 0 ? (
              <div className="rounded-2xl border-2 p-8 text-center" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                <div className="animate-spin w-8 h-8 border-3 border-[var(--accent-primary)] border-t-transparent rounded-full mx-auto" />
                <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">Memuat anime...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border-2 p-12 text-center" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                <p className="text-lg font-bold text-[var(--foreground)]">Tidak ada anime</p>
                <p className="text-sm text-[var(--foreground)]/60">Coba ubah filter atau tambah anime baru</p>
              </div>
            ) : (
              items.map((item) => {
                const statusMeta = STATUS_COLORS[item.status_anime] || STATUS_COLORS.ONGOING;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-2xl border-2 p-4 transition-all hover:translate-y-[-2px]"
                    style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
                  >
                    {/* Cover */}
                    <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg border-2 overflow-hidden flex-shrink-0" style={{ borderColor: 'var(--panel-border)' }}>
                      {(item.cover_anime || item.gambar_anime) ? (
                        <img 
                          src={item.cover_anime || item.gambar_anime} 
                          alt={item.nama_anime} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]/30 text-xs text-center p-1">No Image</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] truncate">{item.nama_anime}</h3>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-bold"
                          style={{ background: statusMeta.bg, color: statusMeta.color }}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--foreground)]/70 line-clamp-1">{item.sinopsis_anime || '-'}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--foreground)]/50">
                        <span>Ep: {Array.isArray(item.episodes) ? item.episodes.length : (item.episode_count || 0)}</span>
                        <span>Rating: {item.rating_anime || '-'}</span>
                        <span>{Array.isArray(item.genre_anime) ? item.genre_anime.join(', ') : (item.genre_anime || '-')}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/daftar-konten/anime/${item.id}`)}
                        className="rounded-lg border-2 p-2 transition-all hover:translate-y-[-2px]"
                        style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.15)', background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)', borderColor: 'var(--panel-border)' }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/daftar-konten/anime/${item.id}/batch-upload`)}
                        className="rounded-lg border-2 p-2 transition-all hover:translate-y-[-2px]"
                        style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.15)', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
                        title="Batch Upload Episode"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/daftar-konten/anime/${item.id}/edit`)}
                        className="rounded-lg border-2 p-2 transition-all hover:translate-y-[-2px]"
                        style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="rounded-lg border-2 p-2 text-red-500 disabled:opacity-50 transition-all hover:translate-y-[-2px]"
                        style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.15)', background: 'rgba(239,68,68,0.1)', borderColor: 'var(--panel-border)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div variants={itemVariants} className="flex items-center justify-between">
              <button
                onClick={() => loadList({ page: Math.max(1, page - 1) })}
                disabled={page <= 1 || loadingList}
                className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold disabled:opacity-50 transition-all"
                style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>
              <span className="text-sm font-bold text-[var(--foreground)]">
                Halaman {page} dari {totalPages}
              </span>
              <button
                onClick={() => loadList({ page: Math.min(totalPages, page + 1) })}
                disabled={page >= totalPages || loadingList}
                className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold disabled:opacity-50 transition-all"
                style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                Selanjutnya <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
