'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Shield, MessageCircle, Globe2, Trash2, RefreshCw, Search } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import {
  listModerationComments,
  listModerationGlobalChat,
  softDeleteComment,
  softDeleteGlobalChat,
} from '@/lib/api';

function Chip({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1 border-4 rounded-full font-extrabold text-xs hover:brightness-95 flex items-center gap-2"
      style={{
        boxShadow: '3px 3px 0 #000',
        background: active ? '#FFD803' : 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        color: 'var(--foreground)',
      }}
    >
      {Icon ? <Icon className="size-3" /> : null}
      {children}
    </button>
  );
}

function LinkButton({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="px-4 py-2 border-4 rounded-lg font-extrabold text-sm hover:brightness-95 inline-flex items-center gap-2"
      style={{
        boxShadow: '4px 4px 0 #000',
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        color: 'var(--foreground)',
      }}
    >
      {children}
    </a>
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

function getImageUrlFromMessage(it) {
  if (!it) return '';
  const candidates = [
    it?.image_url,
    it?.media_url,
    it?.imageUrl,
    it?.mediaUrl,
    it?.attachment_url,
    it?.file_url,
    it?.url,
    it?.content,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const s = String(c).trim();
    if (/^https?:\/\//i.test(s)) return s;
  }
  return '';
}

function ImagePreview({ url }) {
  if (!url) return null;
  return (
    <div
      className="mt-3 border-4 rounded-xl p-2 inline-block max-w-full"
      style={{
        boxShadow: '4px 4px 0 #000',
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
      }}
    >
      <img src={url} alt="image" className="max-w-full w-[320px] h-auto object-contain rounded" />
    </div>
  );
}

function ActionButton({ disabled, onClick, children, tone = 'danger' }) {
  const bg = tone === 'neutral' ? 'var(--panel-bg)' : '#FF4D4D';
  const fg = tone === 'neutral' ? 'var(--foreground)' : '#111';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-4 py-2 border-4 rounded-lg font-extrabold text-sm hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
      style={{
        boxShadow: '4px 4px 0 #000',
        background: bg,
        borderColor: 'var(--panel-border)',
        color: fg,
      }}
    >
      <Trash2 className="size-4" />
      {children}
    </button>
  );
}

function formatDateTime(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function Badge({ children, tone = 'neutral' }) {
  const bg = tone === 'warn' ? '#FFD803' : 'var(--panel-bg)';
  const fg = tone === 'warn' ? '#111' : 'var(--foreground)';
  return (
    <span
      className="px-2 py-1 border-4 rounded-full font-extrabold text-[10px] inline-flex items-center"
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
      {Icon ? <Icon className="size-4 opacity-80" /> : null}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none font-bold text-sm"
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

export default function ModerationPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canAccess = permissions.includes('moderation') || String(user?.role || '').toLowerCase() === 'superadmin';

  const [tab, setTab] = useState('comment'); // comment | global

  const [q, setQ] = useState('');
  const [isDeleted, setIsDeleted] = useState('false'); // '' | 'true' | 'false'
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

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const subtitle = useMemo(() => {
    return tab === 'comment'
      ? 'Moderasi komentar dengan list + soft-delete per item.'
      : 'Moderasi global chat dengan list + soft-delete per item.';
  }, [tab]);

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;

      if (tab === 'comment') {
        const data = await listModerationComments({
          token,
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
        return;
      }

      const data = await listModerationGlobalChat({
        token,
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
      toast.error(err?.message || 'Gagal memuat data moderation');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user || !canAccess) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canAccess, tab, page, limit, isDeleted]);

  const onSearch = async (e) => {
    e.preventDefault();
    setPage(1);
    await loadList({ page: 1 });
  };

  const doSoftDelete = async (row) => {
    if (!row) return;
    const id = String(row.id ?? '').trim();
    if (!id) return;

    setDeletingId(id);
    try {
      const token = getSession()?.token;

      if (tab === 'comment') {
        await softDeleteComment({ token, id });
        toast.success('Komentar berhasil di-soft-delete');
      } else {
        await softDeleteGlobalChat({ token, messageId: id });
        toast.success('Global chat berhasil di-soft-delete');
      }

      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal soft-delete');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || !user) {
    return <div className="text-sm">Memuat...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="font-extrabold text-2xl flex items-center gap-2">
            <Shield className="size-6" /> Moderation
          </div>
          <div className="text-xs text-zinc-500 font-bold mt-1">{subtitle}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip active={tab === 'comment'} onClick={() => setTab('comment')} icon={MessageCircle}>
            Komentar
          </Chip>
          <Chip active={tab === 'global'} onClick={() => setTab('global')} icon={Globe2}>
            Global
          </Chip>
        </div>
      </div>

      <form onSubmit={onSearch} className="flex flex-col lg:flex-row gap-3 lg:items-end">
        <div className="flex-1">
          <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">Search</div>
          <TextInput value={q} onChange={setQ} placeholder="Cari content/username/full_name..." icon={Search} />
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
            onClick={() => loadList()}
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
      {tab === 'comment' ? (
        <Panel
          title="Moderasi Komentar"
          icon={MessageCircle}
          description="Gunakan filter/search untuk menemukan komentar. Soft-delete tersedia per item."
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
                            <div className="font-extrabold text-sm">
                              #{it?.id} • {displayName}
                            </div>
                            <div className="text-xs text-zinc-500 font-bold">
                              {formatDateTime(it?.createdAt)}
                            </div>
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

                        <div className="mt-3 whitespace-pre-wrap font-bold text-sm">
                          {String(it?.content ?? '') || '-'}
                        </div>

                        {String(it?.kind || '').toUpperCase() === 'STICKER' ? <StickerPreview sticker={it?.sticker} /> : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge>likes: {it?._count?.likes ?? 0}</Badge>
                          <Badge>replies: {it?._count?.replies ?? 0}</Badge>
                          {it?.anime_id ? <Badge>anime_id: {it.anime_id}</Badge> : null}
                          {it?.episode_id ? <Badge>episode_id: {it.episode_id}</Badge> : null}
                          {it?.user_id ? <Badge>user_id: {it.user_id}</Badge> : null}
                        </div>

                        <div className="mt-3">
                          <LinkButton href={`/dashboard/moderation/comments/${it?.id}/replies`}>Lihat Balasan</LinkButton>
                        </div>
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
      ) : (
        <Panel
          title="Moderasi Global Chat"
          icon={Globe2}
          description="Gunakan filter/search untuk menemukan message/reply. Soft-delete tersedia per item."
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
                  const isReply = it?.parent_id !== null && it?.parent_id !== undefined;
                  const msgType = String(it?.type || it?.kind || '').toUpperCase();
                  const isImage = msgType === 'IMAGE';
                  const imageUrl = isImage ? getImageUrlFromMessage(it) : '';
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
                          <div className="font-extrabold text-sm">
                            #{it?.id} • {displayName}
                          </div>
                          <div className="text-xs text-zinc-500 font-bold">
                            {formatDateTime(it?.createdAt)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isReply ? <Badge>REPLY</Badge> : <Badge>ROOT</Badge>}
                          {isDel ? <Badge tone="warn">DELETED</Badge> : <Badge>ACTIVE</Badge>}
                          <ActionButton
                            disabled={isDel || deletingId === String(it?.id)}
                            onClick={() => doSoftDelete(it)}
                          >
                            {deletingId === String(it?.id) ? 'Deleting...' : 'Soft Delete'}
                          </ActionButton>
                        </div>
                      </div>

                      <div className="mt-3 whitespace-pre-wrap font-bold text-sm">
                        {String(it?.content ?? '') || '-'}
                      </div>

                      {String(it?.kind || '').toUpperCase() === 'STICKER' ? <StickerPreview sticker={it?.sticker} /> : null}

                      {isImage ? <ImagePreview url={imageUrl} /> : null}

                      {isReply && String(it?.parent?.kind || '').toUpperCase() === 'STICKER' ? (
                        <div className="mt-3">
                          <div className="text-xs text-zinc-500 font-bold mb-1">Parent Sticker</div>
                          <StickerPreview sticker={it?.parent?.sticker} />
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {it?.kind ? <Badge>kind: {it.kind}</Badge> : null}
                        {it?.user_id ? <Badge>user_id: {it.user_id}</Badge> : null}
                        {isReply ? <Badge>parent_id: {it.parent_id}</Badge> : null}
                        <Badge>replies: {it?._count?.replies ?? 0}</Badge>
                      </div>

                      {!isReply ? (
                        <div className="mt-3">
                          <LinkButton href={`/dashboard/moderation/global-chat/${it?.id}/replies`}>Lihat Balasan</LinkButton>
                        </div>
                      ) : null}
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
      )}

      <div className="text-xs text-zinc-500 font-bold">
        Catatan: soft-delete akan memasking konten menjadi pesan pelanggaran sesuai backend.
      </div>
    </div>
  );
}
