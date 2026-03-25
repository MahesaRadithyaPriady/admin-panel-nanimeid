'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { MessageSquareText, RefreshCw } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAdminLivechatQueue } from '@/lib/api';

function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleString('id-ID');
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
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <MessageSquareText className="size-5" /> Live Chat (Queue)
        </h2>
        <button
          type="button"
          onClick={() => {
            setSkip(0);
            setItems([]);
            setHasMore(true);
            loadQueue({ reset: true });
          }}
          disabled={loadingList}
          className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="size-4" /> Refresh
          </span>
        </button>
      </div>

      <div className="p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-3 items-center min-w-0">
          <label className="grid gap-1">
            <span className="text-xs font-extrabold">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(String(e.target.value || 'QUEUED'))}
              className="px-3 py-2 border-4 rounded-lg font-extrabold w-full"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              <option value="QUEUED">QUEUED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </label>
          <div className="text-sm font-extrabold min-w-0 break-words">
            Total: {total || 0} (loaded: {items.length})
          </div>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-hidden min-w-0">
        <table className="min-w-[780px] w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <thead className="sticky top-0 z-10" style={{ background: 'var(--panel-bg)' }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-4 whitespace-nowrap" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
              <th className="text-left px-3 py-2 border-b-4 whitespace-nowrap" style={{ borderColor: 'var(--panel-border)' }}>User</th>
              <th className="text-left px-3 py-2 border-b-4 whitespace-nowrap" style={{ borderColor: 'var(--panel-border)' }}>Status</th>
              <th className="text-left px-3 py-2 border-b-4 min-w-[360px]" style={{ borderColor: 'var(--panel-border)' }}>Issue</th>
              <th className="text-left px-3 py-2 border-b-4 whitespace-nowrap" style={{ borderColor: 'var(--panel-border)' }}>Dibuat</th>
              <th className="text-left px-3 py-2 border-b-4 whitespace-nowrap" style={{ borderColor: 'var(--panel-border)' }}>Assigned</th>
              <th className="text-left px-3 py-2 border-b-4 whitespace-nowrap" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((it) => {
              const ticketId = it?.id;
              const issueText = it?.issue_text ?? it?.issueText ?? it?.issue ?? it?.content ?? '-';
              const userDisplay = it?.user_display ?? it?.userDisplay ?? it?.user ?? null;
              const userName =
                userDisplay?.full_name ||
                userDisplay?.fullName ||
                userDisplay?.username ||
                it?.username ||
                '-';
              const createdAt = formatDate(it?.created_at ?? it?.createdAt);
              const assignedObj = it?.assigned_admin ?? it?.assignedAdmin ?? null;
              const assigned =
                assignedObj?.full_name ||
                assignedObj?.fullName ||
                assignedObj?.username ||
                it?.assigned_admin_id ||
                it?.assignedAdminId ||
                '-';

              return (
                <tr key={ticketId}>
                  <td className="px-3 py-2 border-b-4 font-extrabold" style={{ borderColor: 'var(--panel-border)' }}>
                    #{ticketId}
                  </td>
                  <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>
                    <div className="max-w-[220px] break-words">{userName}</div>
                  </td>
                  <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it?.status ?? '-'}</td>
                  <td className="px-3 py-2 border-b-4 text-xs max-w-[520px]" style={{ borderColor: 'var(--panel-border)' }}>
                    <div className="break-words whitespace-pre-wrap line-clamp-3">{issueText}</div>
                  </td>
                  <td className="px-3 py-2 border-b-4 text-xs font-semibold whitespace-nowrap" style={{ borderColor: 'var(--panel-border)' }}>
                    {createdAt}
                  </td>
                  <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>
                    {assigned === null || assigned === undefined ? '-' : assigned}
                  </td>
                  <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                    <button
                      type="button"
                      onClick={() => onOpen(ticketId)}
                      className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
                      style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}
                    >
                      Buka
                    </button>
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm opacity-70">
                  {loadingList ? 'Memuat...' : 'Tidak ada ticket'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {items.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-extrabold opacity-70">
            Loaded {items.length} / {total || '-'}
          </div>
          <button
            type="button"
            onClick={() => loadQueue({ reset: false })}
            disabled={loadingList || !hasMore}
            className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            {loadingList ? 'Memuat...' : hasMore ? 'Load more' : 'Tidak ada lagi'}
          </button>
        </div>
      )}
    </div>
  );
}

