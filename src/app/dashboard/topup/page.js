'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Ban, CheckCircle2, CreditCard, ListFilter, RefreshCcw, Search, UserRound, Coins, Link as LinkIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listTopupRequests, setTopupStatus } from '@/lib/api';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
};

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'PAID', label: 'Dibayar' },
  { value: 'CANCELED', label: 'Dibatalkan' },
];

const STATUS_TONES = {
  PENDING: { bg: 'from-amber-500 to-orange-500', text: 'text-white' },
  APPROVED: { bg: 'from-emerald-500 to-teal-500', text: 'text-white' },
  REJECTED: { bg: 'from-rose-500 to-pink-500', text: 'text-white' },
  PAID: { bg: 'from-blue-500 to-cyan-500', text: 'text-white' },
  CANCELED: { bg: 'from-gray-500 to-gray-600', text: 'text-white' },
};

function SummaryCard({ label, value, tone = 'neutral' }) {
  const gradients = {
    neutral: 'from-gray-500 to-gray-600',
    pending: 'from-amber-500 to-orange-500',
    approved: 'from-emerald-500 to-teal-500',
    rejected: 'from-rose-500 to-pink-500',
  };

  return (
    <div className="glass-card rounded-2xl p-4 relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-2" style={{ borderColor: 'var(--panel-border)', boxShadow: '4px 4px 0 rgba(0,0,0,0.2)' }}>
      <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${gradients[tone]} opacity-20 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500`} />
      <div className="relative z-10">
        <div className="text-xs font-bold text-[var(--foreground)]/60 uppercase tracking-wide">{label}</div>
        <div className="mt-1 text-2xl font-black text-[var(--foreground)]">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const key = String(status || 'PENDING').toUpperCase();
  const tone = STATUS_TONES[key] || { bg: 'from-gray-400 to-gray-500', text: 'text-white' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${tone.bg} ${tone.text} border-2`} style={{ borderColor: 'rgba(0,0,0,0.2)', boxShadow: '2px 2px 0 rgba(0,0,0,0.2)' }}>
      {key}
    </span>
  );
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
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 min-w-0"
    >
      {loading || !user ? null : (
        <>
          {/* Header & Stats - Glassbrutalism */}
          <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Header Card */}
            <div className="glass-card rounded-2xl sm:rounded-3xl border-2 p-5 sm:p-6 relative overflow-hidden" style={{ boxShadow: '8px 8px 0 rgba(0,0,0,0.3)', borderColor: 'var(--panel-border)' }}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-bold backdrop-blur-sm" style={{ borderColor: 'var(--panel-border)', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
                    <CreditCard className="w-4 h-4" /> Moderasi Topup
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black flex items-center gap-3 text-[var(--foreground)]">
                      <CreditCard className="w-7 h-7" /> Topup Manual
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm sm:text-base font-medium text-[var(--foreground)]/70">
                      Tinjau permintaan topup manual dengan pencarian yang lebih fleksibel.
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => loadList()} disabled={loadingList} className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-3 font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px]" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.3)', background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)', borderColor: 'var(--panel-border)' }}>
                  <RefreshCcw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{loadingList ? 'Memuat...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-[28px] border-4 p-5" style={{ boxShadow: '10px 10px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <SummaryCard label="Tampil" value={summary.total} tone="neutral" />
              <SummaryCard label="Pending" value={summary.PENDING} tone="pending" />
              <SummaryCard label="Approved" value={summary.APPROVED} tone="approved" />
              <SummaryCard label="Rejected" value={summary.REJECTED} tone="rejected" />
              <SummaryCard label="Halaman" value={`${page}/${totalPages}`} tone="neutral" />
              <SummaryCard label="Total Data" value={total} tone="neutral" />
            </div>
          </motion.div>

          <form onSubmit={onSearch} className="rounded-[24px] border-4 p-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex items-center gap-2 text-sm font-black opacity-70"><ListFilter className="size-4" /> Filter & Pencarian</div>
            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_200px_220px_130px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-60" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari ref, username, email, nama lengkap, metode, atau catatan"
                  className="w-full min-w-0 border-4 rounded-2xl py-3 pl-10 pr-3 font-semibold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </div>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Filter user ID"
                className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-semibold"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full min-w-0 px-3 py-3 border-4 rounded-2xl font-extrabold"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button type="submit" className="border-4 rounded-2xl font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
                Terapkan
              </button>
            </div>
          </form>

          <div className="space-y-4">
            {items.map((it) => {
              const userInfo = it.user || {};
              const fullName = userInfo?.profile?.full_name || '-';
              const reference = String(it.payment_ref || '').trim();
              const canApprove = String(it.status || '').toUpperCase() !== 'APPROVED';
              const canReject = String(it.status || '').toUpperCase() !== 'REJECTED';

              return (
                <div key={it.id} className="rounded-[24px] border-4 p-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-4">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="grid place-items-center size-14 rounded-2xl border-4" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                          <UserRound className="size-7" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-lg font-black break-words">{fullName}</div>
                            <StatusBadge status={it.status} />
                          </div>
                          <div className="text-sm font-semibold opacity-80 break-all">@{userInfo?.username || '-'}</div>
                          <div className="text-sm font-semibold opacity-70 break-all">{userInfo?.email || '-'}</div>
                          {userInfo?.google_email ? <div className="text-sm font-semibold opacity-70 break-all">Google: {userInfo.google_email}</div> : null}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border-4 p-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                          <div className="text-xs font-black uppercase tracking-wide opacity-70">Request</div>
                          <div className="mt-2 text-sm font-semibold">ID: {it.id}</div>
                          <div className="text-sm font-semibold">User ID: {userInfo?.userID || userInfo?.id || it.user_id || '-'}</div>
                          <div className="text-sm font-semibold">Dibuat: {formatDateTime(it.created_at || it.createdAt)}</div>
                        </div>

                        <div className="rounded-2xl border-4 p-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                          <div className="text-xs font-black uppercase tracking-wide opacity-70">Pembayaran</div>
                          <div className="mt-2 inline-flex items-center gap-2 text-lg font-black"><Coins className="size-4" /> {it.amount_coins || 0} koin</div>
                          <div className="text-sm font-semibold break-words">Metode: {it.payment_method || '-'}</div>
                        </div>

                        <div className="rounded-2xl border-4 p-3 md:col-span-2 xl:col-span-1" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                          <div className="text-xs font-black uppercase tracking-wide opacity-70">Referensi</div>
                          <div className="mt-2 text-sm font-semibold break-all">{reference || '-'}</div>
                          {reference ? (
                            <a href={reference} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-black underline">
                              <LinkIcon className="size-4" /> Buka referensi
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-2xl border-4 p-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                        <div className="text-xs font-black uppercase tracking-wide opacity-70">Catatan</div>
                        <div className="mt-2 text-sm font-semibold break-words">{it.note || '-'}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={actingId === it.id || !canApprove}
                        onClick={() => updateStatus(it.id, 'APPROVED')}
                        className="inline-flex items-center gap-2 rounded-2xl border-4 px-3 py-2 font-extrabold disabled:opacity-60"
                        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
                        title="Setujui"
                      >
                        <CheckCircle2 className="size-4" /> Setujui
                      </button>
                      <button
                        type="button"
                        disabled={actingId === it.id || !canReject}
                        onClick={() => updateStatus(it.id, 'REJECTED')}
                        className="inline-flex items-center gap-2 rounded-2xl border-4 px-3 py-2 font-extrabold disabled:opacity-60"
                        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                        title="Tolak"
                      >
                        <Ban className="size-4" /> Tolak
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {items.length === 0 ? (
              <div className="rounded-[24px] border-4 p-8 text-center" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <div className="text-lg font-black">{loadingList ? 'Memuat topup...' : 'Tidak ada data topup.'}</div>
                <div className="mt-2 text-sm font-semibold opacity-75">Coba ubah kata kunci pencarian, user ID, atau filter status.</div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 border-4 rounded-2xl disabled:opacity-60 font-extrabold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              Sebelumnya
            </button>
            <div className="text-sm font-extrabold">Halaman {page} / {totalPages}</div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 border-4 rounded-2xl disabled:opacity-60 font-extrabold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              Berikutnya
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
