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
  ALL: { label: 'Semua', color: 'var(--foreground)' },
  PENDING: { label: 'Menunggu', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', icon: Clock },
  UNDER_REVIEW: { label: 'Ditinjau', bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', icon: Eye },
  UPLOAD_IN_PROGRESS: { label: 'Proses', bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', icon: Loader2 },
  COMPLETED: { label: 'Selesai', bg: 'rgba(34,197,94,0.15)', color: '#22c55e', icon: CheckCircle2 },
  REJECTED: { label: 'Ditolak', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', icon: XCircle },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
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
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">Permintaan Anime</h1>
                <p className="text-sm text-[var(--foreground)]/70">Kelola permintaan anime dari pengguna</p>
              </div>
            </div>
            <button
              onClick={() => loadList()}
              disabled={loadingList}
              className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-3 font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px]"
              style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)', borderColor: 'var(--panel-border)' }}
            >
              <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {REQUEST_STATUSES.map((s) => {
              const meta = STATUS_META[s];
              const count = items.filter((it) => it.status === s).length;
              const Icon = meta.icon;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(status === s ? '' : s)}
                  className={`rounded-xl border-2 p-4 text-left transition-all hover:translate-y-[-2px] ${status === s ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                  style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: meta.bg, borderColor: 'var(--panel-border)' }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: meta.color }} />
                    <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
                  </div>
                  <div className="mt-2 text-2xl font-black" style={{ color: meta.color }}>{count}</div>
                </button>
              );
            })}
          </motion.div>

          {/* Filter */}
          <motion.div variants={itemVariants} className="rounded-2xl border-2 p-4" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-[var(--foreground)]/60" />
              <span className="text-sm font-bold text-[var(--foreground)]">Filter Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border-2 px-3 py-2 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              >
                <option value="">Semua Status</option>
                {REQUEST_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
              {status && (
                <button
                  onClick={() => setStatus('')}
                  className="text-xs font-bold text-[var(--accent-primary)] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </motion.div>

          {/* List */}
          <motion.div variants={itemVariants} className="space-y-3">
            {loadingList && items.length === 0 ? (
              <div className="rounded-2xl border-2 p-8 text-center" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-[var(--accent-primary)]" />
                <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">Memuat permintaan...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border-2 p-12 text-center" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                <Inbox className="w-16 h-16 mx-auto text-[var(--foreground)]/30" />
                <p className="mt-4 text-lg font-bold text-[var(--foreground)]">Belum ada permintaan</p>
                <p className="text-sm text-[var(--foreground)]/60">Permintaan anime dari pengguna akan muncul di sini</p>
              </div>
            ) : (
              items.map((item) => {
                const meta = STATUS_META[item.status] || STATUS_META.ALL;
                const Icon = meta.icon || Clock;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border-2 p-4 sm:p-5 transition-all hover:translate-y-[-2px]"
                    style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            <Icon className="w-3.5 h-3.5" /> {meta.label}
                          </span>
                          <span className="text-xs text-[var(--foreground)]/50">
                            {new Date(item.created_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg font-bold text-[var(--foreground)] truncate">{item.title}</h3>
                        <p className="text-sm text-[var(--foreground)]/70 line-clamp-2">{item.description || '-'}</p>
                        {item.requested_by && (
                          <p className="mt-2 text-xs text-[var(--foreground)]/50">
                            Oleh: {item.requested_by}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {canManage && item.status === 'PENDING' && (
                          <button
                            onClick={() => onTake(item.id)}
                            className="rounded-lg border-2 px-3 py-2 text-sm font-bold transition-all hover:translate-y-[-2px]"
                            style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.15)', background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)', borderColor: 'var(--panel-border)' }}
                          >
                            Ambil
                          </button>
                        )}
                        {canManage && (
                          <select
                            value={item.status}
                            onChange={(e) => onUpdateStatus(item.id, e.target.value)}
                            className="rounded-lg border-2 px-2 py-2 text-sm font-semibold"
                            style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                          >
                            {REQUEST_STATUSES.map((s) => (
                              <option key={s} value={s}>{STATUS_META[s].label}</option>
                            ))}
                          </select>
                        )}
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
