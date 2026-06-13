'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { MessageSquareText, RefreshCw, Clock, CheckCircle2, XCircle, Users, MessageCircle, ChevronLeft, ChevronRight, Filter, Search, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAdminLivechatQueue } from '@/lib/api';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
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

const STATUS_CONFIG = {
  QUEUED: {
    label: 'Queued',
    bg: 'from-amber-500 to-orange-500',
    text: 'text-white',
    icon: Clock,
    desc: 'Menunggu'
  },
  ACTIVE: {
    label: 'Active',
    bg: 'from-blue-500 to-cyan-500',
    text: 'text-white',
    icon: MessageCircle,
    desc: 'Sedang Berlangsung'
  },
  CLOSED: {
    label: 'Closed',
    bg: 'from-emerald-500 to-teal-500',
    text: 'text-white',
    icon: CheckCircle2,
    desc: 'Selesai'
  }
};

function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
}

export default function LivechatQueuePage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const permissions = useMemo(() => (Array.isArray(user?.permissions) ? user.permissions : []), [user]);
  const canAccess = permissions.includes('livechat') || String(user?.role || '').toLowerCase() === 'superadmin';

  const [status, setStatus] = useState('QUEUED');
  const [take] = useState(50);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState({});
  const [statusCounts, setStatusCounts] = useState({ QUEUED: 0, ACTIVE: 0, CLOSED: 0 });
  const [loadingList, setLoadingList] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadQueue = async ({ reset = false } = {}) => {
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    const currentSkip = reset ? 0 : skip;
    setLoadingList(true);
    try {
      const data = await listAdminLivechatQueue({ token, status, take, skip: currentSkip });
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      setItems((prev) => (reset ? nextItems : [...prev, ...nextItems]));
      setTotal(data?.total ?? 0);
      
      // Update counts for current status
      setStatusCounts(prev => ({
        ...prev,
        [status]: data?.total ?? 0
      }));
      
      // Store items by status
      setAllItems(prev => ({
        ...prev,
        [status]: reset ? nextItems : [...(prev[status] || []), ...nextItems]
      }));
      
      setSkip(currentSkip + take);
      setHasMore(nextItems.length === take && (data?.total ?? 0) > 0 ? currentSkip + take < (data?.total ?? 0) : nextItems.length === take);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat queue livechat');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && !canAccess) {
      toast.error('Kamu tidak punya permission untuk Live Chat');
      router.replace('/dashboard');
    }
  }, [loading, user, canAccess, router]);

  useEffect(() => {
    if (!user || !canAccess) return;
    // Reload ketika status filter berubah
    setSkip(0);
    setItems([]);
    setHasMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadQueue({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canAccess, status]);

  const onOpen = (ticketId) => {
    if (!ticketId && ticketId !== 0) return;
    router.push(`/dashboard/livechat/tickets/${ticketId}`);
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const ta = new Date(a?.created_at ?? a?.createdAt ?? 0).getTime();
      const tb = new Date(b?.created_at ?? b?.createdAt ?? 0).getTime();
      return ta - tb;
    });
  }, [items]);

  if (loading || !user || !canAccess) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 min-w-0"
    >
      {/* Header - Glassbrutalism */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl sm:rounded-3xl border-2 p-5 sm:p-6 relative overflow-hidden" style={{ boxShadow: '8px 8px 0 rgba(0,0,0,0.3)', borderColor: 'var(--panel-border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <MessageSquareText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-[var(--foreground)]/60 uppercase tracking-wide">Live Chat Moderation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--foreground)] tracking-tight">
              Live Chat Queue
            </h1>
            <p className="text-sm text-[var(--foreground)]/60 mt-1 max-w-xl">
              Kelola tiket live chat, monitor status antrian, dan tangani issue user dengan cepat.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSkip(0);
              setItems([]);
              setHasMore(true);
              loadQueue({ reset: true });
            }}
            disabled={loadingList}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-bold shadow-lg shadow-[var(--accent-primary)]/25 disabled:opacity-60 transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.3)' }}
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{loadingList ? 'Memuat...' : 'Refresh'}</span>
          </button>
        </div>
      </motion.div>

      {/* Status Badge Menu */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2 sm:gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const count = statusCounts[key] || 0;
          const isActive = status === key;
          return (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                isActive
                  ? `bg-gradient-to-r ${config.bg} ${config.text}`
                  : 'bg-[var(--panel-bg)] border-2 border-[var(--panel-border)] text-[var(--foreground)] hover:bg-[var(--accent-primary)]/10'
              }`}
              style={{ 
                boxShadow: isActive ? '4px 4px 0 rgba(0,0,0,0.3)' : '3px 3px 0 rgba(0,0,0,0.2)',
                transform: isActive ? 'translateY(-2px)' : 'none'
              }}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{config.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20' : 'bg-[var(--panel-bg)]'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Ticket Cards - Mobile/Tablet/Desktop Responsive */}
      <motion.div variants={itemVariants} className="space-y-3">
        {sortedItems.length === 0 ? (
          <div className="glass-card rounded-2xl border-2 p-8 text-center" style={{ borderColor: 'var(--panel-border)', boxShadow: '6px 6px 0 rgba(0,0,0,0.2)' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div className="text-lg font-bold text-[var(--foreground)]">
              {loadingList ? 'Memuat tiket...' : 'Tidak ada tiket'}
            </div>
            <div className="text-sm text-[var(--foreground)]/60 mt-1">
              {loadingList ? 'Mohon tunggu sebentar' : 'Tidak ada tiket dengan status ini'}
            </div>
          </div>
        ) : (
          sortedItems.map((it, index) => {
            const ticketId = it?.id;
            const issueText = it?.issue_text ?? it?.issueText ?? it?.issue ?? it?.content ?? '-';
            const userDisplay = it?.user_display ?? it?.userDisplay ?? it?.user ?? null;
            const userName = userDisplay?.full_name || userDisplay?.fullName || userDisplay?.username || it?.username || '-';
            const userEmail = userDisplay?.email || it?.email || '-';
            const createdAt = formatDate(it?.created_at ?? it?.createdAt);
            const assignedObj = it?.assigned_admin ?? it?.assignedAdmin ?? null;
            const assigned = assignedObj?.full_name || assignedObj?.fullName || assignedObj?.username || it?.assigned_admin_id || '-';
            const statusConfig = STATUS_CONFIG[it?.status] || STATUS_CONFIG.QUEUED;
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={ticketId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card rounded-2xl border-2 p-4 sm:p-5 relative overflow-hidden group hover:shadow-lg transition-all"
                style={{ borderColor: 'var(--panel-border)', boxShadow: '4px 4px 0 rgba(0,0,0,0.2)' }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Left: ID & Status */}
                  <div className="flex items-start gap-3 lg:w-48">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-[var(--panel-border)] flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[var(--accent-primary)]">#{ticketId}</span>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${statusConfig.bg} ${statusConfig.text} border`} style={{ borderColor: 'rgba(0,0,0,0.2)' }}>
                      <StatusIcon className="w-3 h-3" />
                      {it?.status}
                    </div>
                  </div>

                  {/* Middle: User & Issue */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[var(--foreground)]/50" />
                      <span className="font-bold text-[var(--foreground)]">{userName}</span>
                      <span className="text-sm text-[var(--foreground)]/50">({userEmail})</span>
                    </div>
                    <div className="bg-[var(--panel-bg)]/50 rounded-xl p-3 border border-[var(--panel-border)]">
                      <div className="flex items-start gap-2">
                        <MessageCircle className="w-4 h-4 text-[var(--accent-primary)] mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-[var(--foreground)]/80 line-clamp-2">{issueText}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--foreground)]/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {createdAt}
                      </span>
                      {assigned !== '-' && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Assigned: {assigned}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Action */}
                  <div className="flex items-center lg:justify-end">
                    <button
                      type="button"
                      onClick={() => onOpen(ticketId)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all hover:translate-y-[-2px]"
                      style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.3)' }}
                    >
                      Buka
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Load More */}
      {items.length > 0 && (
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <div className="text-sm font-medium text-[var(--foreground)]/60">
            Showing {items.length} of {total || '?'} tickets
          </div>
          <button
            type="button"
            onClick={() => loadQueue({ reset: false })}
            disabled={loadingList || !hasMore}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--panel-bg)] border-2 border-[var(--panel-border)] text-[var(--foreground)] transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.2)' }}
          >
            {loadingList ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Memuat...
              </>
            ) : hasMore ? (
              <>
                Load More
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Semua tiket sudah dimuat
              </>
            )}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

