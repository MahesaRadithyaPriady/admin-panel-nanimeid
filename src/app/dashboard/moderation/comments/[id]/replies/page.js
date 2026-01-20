'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, MessageCircle, Trash2, RefreshCw, Search } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listModerationCommentReplies, softDeleteCommentReply } from '@/lib/api';

function Badge({ tone = 'neutral', children }) {
  const bg = tone === 'warn' ? '#FF4D4D' : '#FFD803';
  const fg = '#111';
  return (
    <span
      className="inline-flex items-center px-2 py-1 border-4 rounded-full text-[10px] font-extrabold"
      style={{
        boxShadow: '2px 2px 0 #000',
        background: bg,
        borderColor: 'var(--panel-border)',
        color: fg,
      }}
    >
      {children}
    </span>
  );
}

function TextInput({ value, onChange, placeholder, icon: Icon }) {
  return (
    <div
      className="flex items-center gap-2 border-4 rounded-lg px-3 py-2"
      style={{
        boxShadow: '4px 4px 0 #000',
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        color: 'var(--foreground)',
      }}
    >
      {Icon ? <Icon className="size-4" /> : null}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none text-sm font-bold"
      />
    </div>
  );
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-4 rounded-lg px-3 py-2 text-sm font-extrabold"
      style={{
        boxShadow: '4px 4px 0 #000',
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        color: 'var(--foreground)',
      }}
    >
      {children}
    </select>
  );
}

function StickerPreview({ sticker }) {
  const url = sticker?.image_url;
  if (!url) return null;
  return (
    <div
      className="mt-3 border-4 rounded-xl p-2 inline-block"
      style={{
        boxShadow: '4px 4px 0 #000',
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
      }}
    >
      <img src={url} alt="sticker" className="w-24 h-24 object-contain" />
    </div>
  );
}

function ActionButton({ disabled, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-4 py-2 border-4 rounded-lg font-extrabold text-sm hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
      style={{
        boxShadow: '4px 4px 0 #000',
        background: '#FF4D4D',
        borderColor: 'var(--panel-border)',
        color: '#111',
      }}
    >
      <Trash2 className="size-4" />
      {children}
    </button>
  );
}

function Panel({ title, icon: Icon, description, children }) {
  return (
    <div
      className="border-4 rounded-xl p-4"
      style={{
        boxShadow: '8px 8px 0 #000',
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
      }}
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <div
            className="border-4 rounded-xl p-2"
            style={{
              boxShadow: '4px 4px 0 #000',
              background: '#FFD803',
              borderColor: 'var(--panel-border)',
              color: '#111',
            }}
          >
            <Icon className="size-5" />
          </div>
        ) : null}

        <div className="flex-1">
          <div className="font-extrabold text-lg leading-tight">{title}</div>
          {description ? <div className="text-xs text-zinc-500 font-bold mt-1">{description}</div> : null}
        </div>
      </div>

      <div className="mt-4">{children}</div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function ModerationCommentRepliesPage() {
  const router = useRouter();
  const params = useParams();
  const commentId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) return raw[0];
    return raw;
  }, [params]);

  const { user, loading } = useSession();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canAccess = permissions.includes('moderation') || String(user?.role || '').toLowerCase() === 'superadmin';

  const [q, setQ] = useState('');
  const [isDeleted, setIsDeleted] = useState('false');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(undefined);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && !canAccess) {
      toast.error('Kamu tidak punya permission untuk Moderation');
      router.replace('/dashboard');
    }
  }, [loading, user, canAccess, router]);

  const loadReplies = async (opts = {}) => {
    if (!commentId) return;
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const data = await listModerationCommentReplies({
        token,
        commentId,
        page,
        limit,
        q,
        is_deleted: isDeleted === '' ? undefined : isDeleted === 'true',
        ...opts,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages);
      setPage(data.page || 1);
      setLimit(data.limit || limit);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat comment replies');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user || !canAccess || !commentId) return;
    loadReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canAccess, commentId, page, limit, isDeleted]);

  const onSearch = async (e) => {
    e.preventDefault();
    setPage(1);
    await loadReplies({ page: 1 });
  };

  const doSoftDelete = async (row) => {
    if (!row) return;
    const id = String(row.id ?? '').trim();
    if (!id) return;

    setDeletingId(id);
    try {
      const token = getSession()?.token;
      await softDeleteCommentReply({ token, replyId: id });
      toast.success('Balasan komentar berhasil di-soft-delete');
      await loadReplies();
    } catch (err) {
      toast.error(err?.message || 'Gagal soft-delete reply');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || !user) return <div className="text-sm">Memuat...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/moderation"
            className="px-3 py-2 border-4 rounded-lg font-extrabold text-sm hover:brightness-95 inline-flex items-center gap-2"
            style={{
              boxShadow: '4px 4px 0 #000',
              background: 'var(--panel-bg)',
              borderColor: 'var(--panel-border)',
              color: 'var(--foreground)',
            }}
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>

          <div>
            <div className="font-extrabold text-2xl flex items-center gap-2">
              <MessageCircle className="size-6" /> Replies Komentar
            </div>
            <div className="text-xs text-zinc-500 font-bold mt-1">Comment ID: {String(commentId || '-')}</div>
          </div>
        </div>
      </div>

      <form onSubmit={onSearch} className="flex flex-col lg:flex-row gap-3 lg:items-end">
        <div className="flex-1">
          <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">Search</div>
          <TextInput value={q} onChange={setQ} placeholder="Cari replies..." icon={Search} />
        </div>

        <div className="w-full lg:w-[220px]">
          <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">is_deleted</div>
          <Select value={isDeleted} onChange={(v) => { setIsDeleted(v); setPage(1); }}>
            <option value="false">false</option>
            <option value="true">true</option>
            <option value="">(all)</option>
          </Select>
        </div>

        <div className="w-full lg:w-[160px]">
          <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">Limit</div>
          <Select value={String(limit)} onChange={(v) => { setLimit(Number(v)); setPage(1); }}>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 border-4 rounded-lg font-extrabold text-sm hover:brightness-95 inline-flex items-center gap-2"
            style={{
              boxShadow: '4px 4px 0 #000',
              background: '#FFD803',
              borderColor: 'var(--panel-border)',
              color: '#111',
            }}
          >
            <Search className="size-4" /> Cari
          </button>
          <button
            type="button"
            onClick={() => loadReplies()}
            className="px-4 py-2 border-4 rounded-lg font-extrabold text-sm hover:brightness-95 inline-flex items-center gap-2"
            style={{
              boxShadow: '4px 4px 0 #000',
              background: 'var(--panel-bg)',
              borderColor: 'var(--panel-border)',
              color: 'var(--foreground)',
            }}
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
        </div>
      </form>

      <Panel
        title="List Replies"
        icon={MessageCircle}
        description="Soft-delete tersedia per reply."
      >
        <div className="space-y-3">
          <div className="text-xs text-zinc-500 font-bold">
            Total: {total} {totalPages ? `• Pages: ${totalPages}` : ''}
          </div>

          <div className="space-y-2">
            {loadingList ? (
              <div className="text-sm">Memuat...</div>
            ) : items.length === 0 ? (
              <div className="text-sm">Tidak ada data</div>
            ) : (
              items.map((it) => {
                const isDel = !!it?.is_deleted;
                const u = it?.user;
                const displayName = u?.profile?.full_name || u?.username || '-';
                return (
                  <div
                    key={String(it?.id)}
                    className="border-4 rounded-xl p-4"
                    style={{
                      boxShadow: '6px 6px 0 #000',
                      background: 'var(--panel-bg)',
                      borderColor: 'var(--panel-border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-extrabold text-sm">#{it?.id} • {displayName}</div>
                        <div className="text-xs text-zinc-500 font-bold">{formatDateTime(it?.createdAt)}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isDel ? <Badge tone="warn">DELETED</Badge> : <Badge>ACTIVE</Badge>}
                        <ActionButton
                          disabled={isDel || deletingId === String(it?.id)}
                          onClick={() => doSoftDelete(it)}
                        >
                          {deletingId === String(it?.id) ? 'Deleting...' : 'Soft Delete'}
                        </ActionButton>
                      </div>
                    </div>

                    <div className="mt-3 whitespace-pre-wrap font-bold text-sm">{String(it?.content ?? '') || '-'}</div>
                    {String(it?.kind || '').toUpperCase() === 'STICKER' ? <StickerPreview sticker={it?.sticker} /> : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={loadingList || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 border-4 rounded-lg font-extrabold text-sm disabled:opacity-60"
              style={{
                boxShadow: '4px 4px 0 #000',
                background: 'var(--panel-bg)',
                borderColor: 'var(--panel-border)',
                color: 'var(--foreground)',
              }}
            >
              Prev
            </button>

            <div className="text-xs font-bold text-zinc-500">Page {page}</div>

            <button
              type="button"
              disabled={
                loadingList ||
                (typeof totalPages === 'number' ? page >= totalPages : items.length < limit)
              }
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 border-4 rounded-lg font-extrabold text-sm disabled:opacity-60"
              style={{
                boxShadow: '4px 4px 0 #000',
                background: 'var(--panel-bg)',
                borderColor: 'var(--panel-border)',
                color: 'var(--foreground)',
              }}
            >
              Next
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
