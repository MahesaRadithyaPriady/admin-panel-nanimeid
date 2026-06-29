'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Ban, CheckCircle2, CreditCard, ListFilter, RefreshCcw, Search, UserRound, Coins, Link as LinkIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listTopupRequests, setTopupStatus } from '@/lib/api';

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'PAID', label: 'Dibayar' },
  { value: 'CANCELED', label: 'Dibatalkan' },
];

function SummaryCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const key = String(status || 'PENDING').toUpperCase();
  return <span className="badge">{key}</span>;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export default function TopupModerationPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  // Filters & pagination
  const [status, setStatus] = useState('PENDING');
  const [userId, setUserId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Data
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = {
        userId: userId.trim(),
        status: status === 'ALL' ? '' : status,
        q: q.trim(),
        page,
        limit,
        ...opts,
      };
      const data = await listTopupRequests({ token, ...params });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar topup');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status, user]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadList({ page: 1 });
  };

  const updateStatus = async (id, newStatus) => {
    const token = getSession()?.token;
    try {
      setActingId(id);
      const res = await setTopupStatus({ token, id, status: newStatus });
      toast.success(res?.message || `Status diupdate ke ${newStatus}`);
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal mengubah status');
    } finally {
      setActingId(null);
    }
  };

  const summary = useMemo(() => {
    return items.reduce((acc, item) => {
      const currentStatus = String(item?.status || 'PENDING').toUpperCase();
      acc.total += 1;
      acc[currentStatus] = (acc[currentStatus] || 0) + 1;
      return acc;
    }, { total: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 });
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 min-w-0"
    >
      {loading || !user ? null : (
        <>
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-5 h-5" />
                <span className="label uppercase">Moderasi Topup</span>
              </div>
              <h1 className="page-title">Topup Manual</h1>
              <p className="label mt-1">Tinjau permintaan topup manual dengan pencarian yang lebih fleksibel.</p>
            </div>
            <button type="button" onClick={() => loadList()} disabled={loadingList} className="btn btn--secondary btn--sm flex-shrink-0">
              <RefreshCcw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
              {loadingList ? 'Memuat...' : 'Refresh'}
            </button>
          </div>

          {/* Summary Stats */}
          <div className="stat-grid">
            <SummaryCard label="Tampil" value={summary.total} />
            <SummaryCard label="Pending" value={summary.PENDING} />
            <SummaryCard label="Approved" value={summary.APPROVED} />
            <SummaryCard label="Rejected" value={summary.REJECTED} />
            <SummaryCard label="Halaman" value={`${page}/${totalPages}`} />
            <SummaryCard label="Total Data" value={total} />
          </div>

          {/* Filter Bar */}
          <form onSubmit={onSearch} className="filter-bar">
            <div className="flex items-center gap-2 label mb-3">
              <ListFilter className="w-4 h-4" /> Filter &amp; Pencarian
            </div>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_200px_220px_120px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari ref, username, email, nama, metode..."
                  className="input w-full pl-11"
                />
              </div>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Filter user ID"
                className="input w-full"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="select w-full"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button type="submit" className="btn btn--primary btn--sm">Terapkan</button>
            </div>
          </form>

          {/* Item Cards */}
          <div className="space-y-4">
            {items.map((it) => {
              const userInfo = it.user || {};
              const fullName = userInfo?.profile?.full_name || '-';
              const reference = String(it.payment_ref || '').trim();
              const canApprove = String(it.status || '').toUpperCase() !== 'APPROVED';
              const canReject = String(it.status || '').toUpperCase() !== 'REJECTED';

              return (
                <div key={it.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-4 flex-1">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="grid place-items-center w-12 h-12 flex-shrink-0" style={{ border: '2px solid var(--border)', background: 'var(--muted-bg)' }}>
                          <UserRound className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-base">{fullName}</span>
                            <StatusBadge status={it.status} />
                          </div>
                          <div className="label break-all">@{userInfo?.username || '-'}</div>
                          <div className="label break-all">{userInfo?.email || '-'}</div>
                          {userInfo?.google_email && <div className="label break-all">Google: {userInfo.google_email}</div>}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div className="p-3" style={{ border: '1px solid var(--border-muted)' }}>
                          <div className="label uppercase mb-2">Request</div>
                          <div className="mono text-xs">ID: {it.id}</div>
                          <div className="mono text-xs">User ID: {userInfo?.userID || userInfo?.id || it.user_id || '-'}</div>
                          <div className="mono text-xs">Dibuat: {formatDateTime(it.created_at || it.createdAt)}</div>
                        </div>
                        <div className="p-3" style={{ border: '1px solid var(--border-muted)' }}>
                          <div className="label uppercase mb-2">Pembayaran</div>
                          <div className="flex items-center gap-2 font-bold"><Coins className="w-4 h-4" /> {it.amount_coins || 0} koin</div>
                          <div className="mono text-xs mt-1">Metode: {it.payment_method || '-'}</div>
                        </div>
                        <div className="p-3 md:col-span-2 xl:col-span-1" style={{ border: '1px solid var(--border-muted)' }}>
                          <div className="label uppercase mb-2">Referensi</div>
                          <div className="mono text-xs break-all">{reference || '-'}</div>
                          {reference && (
                            <a href={reference} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold underline mt-1">
                              <LinkIcon className="w-3 h-3" /> Buka referensi
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="p-3" style={{ border: '1px solid var(--border-muted)' }}>
                        <div className="label uppercase mb-1">Catatan</div>
                        <div className="text-sm break-words">{it.note || '-'}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={actingId === it.id || !canApprove}
                        onClick={() => updateStatus(it.id, 'APPROVED')}
                        className="btn btn--primary btn--sm"
                        title="Setujui"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Setujui
                      </button>
                      <button
                        type="button"
                        disabled={actingId === it.id || !canReject}
                        onClick={() => updateStatus(it.id, 'REJECTED')}
                        className="btn btn--secondary btn--sm"
                        title="Tolak"
                      >
                        <Ban className="w-4 h-4" /> Tolak
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="card p-8 text-center">
                <div className="section-title">{loadingList ? 'Memuat topup...' : 'Tidak ada data topup.'}</div>
                <div className="label mt-2">Coba ubah kata kunci pencarian, user ID, atau filter status.</div>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn btn--secondary btn--sm"
            >
              <ChevronLeft className="w-4 h-4" /> Sebelumnya
            </button>
            <span className="mono text-sm font-bold">Halaman {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn--secondary btn--sm"
            >
              Berikutnya <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
