'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { MessageSquareText, RefreshCw, Clock, CheckCircle2, XCircle, Users, MessageCircle, ChevronLeft, ChevronRight, Filter, Search, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAdminLivechatQueue } from '@/lib/api';

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

const STATUS_CONFIG = {
  QUEUED: { label: 'Queued', icon: Clock,          desc: 'Menunggu' },
  ACTIVE: { label: 'Active', icon: MessageCircle,  desc: 'Sedang Berlangsung' },
  CLOSED: { label: 'Closed', icon: CheckCircle2,   desc: 'Selesai' },
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
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 min-w-0"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquareText className="w-5 h-5" />
            <span className="label uppercase">Live Chat Moderation</span>
          </div>
          <h1 className="page-title">Live Chat Queue</h1>
          <p className="label mt-1">Kelola tiket live chat, monitor status antrian, dan tangani issue user.</p>
        </div>
        <button
          type="button"
          onClick={() => { setSkip(0); setItems([]); setHasMore(true); loadQueue({ reset: true }); }}
          disabled={loadingList}
          className="btn btn--secondary btn--sm flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
          {loadingList ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const count = statusCounts[key] || 0;
          const isActive = status === key;
          return (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={isActive ? 'tab tab--active' : 'tab'}
            >
              <Icon className="w-4 h-4" />
              {config.label}
              <span className="mono text-xs font-bold ml-1">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Ticket Cards */}
      <div className="space-y-3">
        {sortedItems.length === 0 ? (
          <div className="card p-8 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
            <div className="section-title">
              {loadingList ? 'Memuat tiket...' : 'Tidak ada tiket'}
            </div>
            <div className="label mt-1">
              {loadingList ? 'Mohon tunggu sebentar' : 'Tidak ada tiket dengan status ini'}
            </div>
          </div>
        ) : (
          sortedItems.map((it) => {
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
              <div key={ticketId} className="card p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Left: ID & Status */}
                  <div className="flex items-center gap-3 lg:w-48">
                    <span className="mono text-sm font-bold" style={{ color: 'var(--foreground)' }}>#{ticketId}</span>
                    <span className="badge">
                      <StatusIcon className="w-3 h-3" />
                      {it?.status}
                    </span>
                  </div>

                  {/* Middle: User & Issue */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                      <span className="font-bold" style={{ color: 'var(--foreground)' }}>{userName}</span>
                      <span className="text-sm" style={{ color: 'var(--muted)' }}>({userEmail})</span>
                    </div>
                    <div className="p-3" style={{ background: 'var(--muted-bg)', border: '1px solid var(--border-muted)' }}>
                      <div className="flex items-start gap-2">
                        <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--foreground)' }}>{issueText}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{createdAt}</span>
                      {assigned !== '-' && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />Assigned: {assigned}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Action */}
                  <div className="flex items-center lg:justify-end">
                    <button type="button" onClick={() => onOpen(ticketId)} className="btn btn--primary btn--sm">
                      Buka <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <div className="label">Menampilkan {items.length} dari {total || '?'} tiket</div>
          <button
            type="button"
            onClick={() => loadQueue({ reset: false })}
            disabled={loadingList || !hasMore}
            className="btn btn--secondary btn--sm"
          >
            {loadingList ? (<><RefreshCw className="w-4 h-4 animate-spin" />Memuat...</>) :
             hasMore   ? (<>Load More <ChevronRight className="w-4 h-4" /></>) :
             (<><CheckCircle2 className="w-4 h-4" />Semua tiket dimuat</>)}
          </button>
        </div>
      )}
    </motion.div>
  );
}

