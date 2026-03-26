'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Shield, MessageCircle, Globe2, Trash2, RefreshCw, Search, Image, Eye, CheckCircle2, XCircle, Ban, ShieldCheck, Clock3, User } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import {
  listModerationComments,
  listModerationGlobalChat,
  listNsfwQuarantineUploads,
  getNsfwQuarantineUploadDetail,
  reviewNsfwQuarantineUpload,
  deleteNsfwQuarantineUpload,
  banUserFromNsfwQuarantineUpload,
  suspendUserFromNsfwQuarantineUpload,
  clearWarnedFromNsfwQuarantineUpload,
  softDeleteComment,
  softDeleteGlobalChat,
} from '@/lib/api';

const QUARANTINE_STATUS_OPTIONS = [
  { value: 'PENDING_REVIEW', label: 'Menunggu peninjauan' },
  { value: 'REVIEWED', label: 'Sudah ditinjau' },
  { value: 'DELETED', label: 'Sudah dihapus' },
  { value: '', label: 'Semua status' },
];

const QUARANTINE_VERDICT_OPTIONS = [
  { value: '', label: 'Semua keputusan' },
  { value: 'APPROVED', label: 'Diizinkan' },
  { value: 'REJECTED', label: 'Ditolak' },
];

const QUARANTINE_ACTION_OPTIONS = [
  { value: '', label: 'Semua area gambar' },
  { value: 'PROFILE_AVATAR', label: 'Avatar profil' },
  { value: 'PROFILE_BANNER', label: 'Banner profil' },
  { value: 'PROFILE_COMMENT_BACKGROUND', label: 'Latar komentar profil' },
  { value: 'GLOBAL_CHAT_IMAGE', label: 'Gambar global chat' },
];

const DUMMY_QUARANTINE_UPLOADS = [
  {
    id: 101,
    user_id: 123,
    action: 'PROFILE_AVATAR',
    source: 'profile_avatar',
    storage_key: 'moderation/quarantine/profile_avatar/123/dummy-101.jpg',
    url: 'https://placehold.co/800x600/png?text=Quarantine+Avatar',
    mimetype: 'image/jpeg',
    size_bytes: 183421,
    vision_result: {
      context: 'profile_avatar',
      safeSearch: { adult: 'LIKELY', violence: 'VERY_UNLIKELY', racy: 'POSSIBLE' },
    },
    status: 'PENDING_REVIEW',
    verdict: null,
    reviewed_at: null,
    reviewed_by_admin_id: null,
    notes: null,
    createdAt: '2026-03-20T08:10:00.000Z',
    updatedAt: '2026-03-20T08:10:00.000Z',
    user: {
      id: 123,
      username: 'foo',
      account_status: 'WARNED',
      account_status_reason: 'UPLOAD_NSFw_IMAGE',
      profile: { avatar_url: 'https://placehold.co/128x128/png?text=User' },
    },
  },
  {
    id: 102,
    user_id: 88,
    action: 'GLOBAL_CHAT_IMAGE',
    source: 'global_chat_image',
    storage_key: 'moderation/quarantine/global_chat_image/88/dummy-102.jpg',
    url: 'https://placehold.co/800x600/png?text=Quarantine+Chat',
    mimetype: 'image/png',
    size_bytes: 423901,
    vision_result: {
      context: 'global_chat_image',
      safeSearch: { adult: 'UNLIKELY', violence: 'VERY_UNLIKELY', racy: 'POSSIBLE' },
    },
    status: 'REVIEWED',
    verdict: 'APPROVED',
    reviewed_at: '2026-03-21T11:10:00.000Z',
    reviewed_by_admin_id: 1,
    notes: 'Tidak ada konten sensitif',
    createdAt: '2026-03-21T10:55:00.000Z',
    updatedAt: '2026-03-21T11:10:00.000Z',
    user: {
      id: 88,
      username: 'bar',
      account_status: 'ACTIVE',
      profile: { avatar_url: 'https://placehold.co/128x128/png?text=User' },
    },
  },
  {
    id: 103,
    user_id: 999,
    action: 'PROFILE_BANNER',
    source: 'profile_banner',
    storage_key: 'moderation/quarantine/profile_banner/999/dummy-103.jpg',
    url: 'https://placehold.co/800x600/png?text=Quarantine+Banner',
    mimetype: 'image/jpeg',
    size_bytes: 982341,
    vision_result: {
      context: 'profile_banner',
      safeSearch: { adult: 'VERY_LIKELY', violence: 'POSSIBLE', racy: 'LIKELY' },
    },
    status: 'PENDING_REVIEW',
    verdict: null,
    reviewed_at: null,
    reviewed_by_admin_id: null,
    notes: null,
    createdAt: '2026-03-22T02:35:00.000Z',
    updatedAt: '2026-03-22T02:35:00.000Z',
    user: {
      id: 999,
      username: 'baz',
      account_status: 'SUSPENDED',
      profile: { avatar_url: 'https://placehold.co/128x128/png?text=User' },
    },
  },
];

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

function formatLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  return raw
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBytes(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return '-';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  return `${(num / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getBadgePalette(value, kind = 'status') {
  const key = String(value || '').toUpperCase();
  if (kind === 'status') {
    if (key === 'PENDING_REVIEW') return { background: '#FEF3C7', color: '#92400E' };
    if (key === 'REVIEWED') return { background: '#DCFCE7', color: '#166534' };
    if (key === 'DELETED') return { background: '#FEE2E2', color: '#991B1B' };
  }
  if (kind === 'verdict') {
    if (key === 'APPROVED') return { background: '#DCFCE7', color: '#166534' };
    if (key === 'REJECTED') return { background: '#FECACA', color: '#991B1B' };
  }
  if (kind === 'account') {
    if (key === 'ACTIVE') return { background: '#DBEAFE', color: '#1D4ED8' };
    if (key === 'WARNED') return { background: '#FEF3C7', color: '#92400E' };
    if (key === 'SUSPENDED') return { background: '#FDE68A', color: '#78350F' };
    if (key === 'BANNED') return { background: '#FECACA', color: '#991B1B' };
  }
  if (kind === 'risk') {
    if (key === 'VERY_LIKELY') return { background: '#FECACA', color: '#991B1B' };
    if (key === 'LIKELY') return { background: '#FDE68A', color: '#78350F' };
    if (key === 'POSSIBLE') return { background: '#FEF3C7', color: '#92400E' };
    if (key === 'UNLIKELY' || key === 'VERY_UNLIKELY') return { background: '#DCFCE7', color: '#166534' };
  }
  return { background: 'var(--panel-bg)', color: 'var(--foreground)' };
}

function getSafeSearchEntries(upload) {
  const safeSearch = upload?.vision_result?.safeSearch;
  if (!safeSearch || typeof safeSearch !== 'object') return [];
  return Object.entries(safeSearch).map(([key, value]) => ({
    key,
    label: formatLabel(key),
    value: String(value || '-').toUpperCase(),
  }));
}

function Badge({ children, tone = 'neutral', background, color }) {
  const bg = background ?? (tone === 'warn' ? '#FFD803' : 'var(--panel-bg)');
  const fg = color ?? (tone === 'warn' ? '#111' : 'var(--foreground)');
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

  const [tab, setTab] = useState('comment');

  const [q, setQ] = useState('');
  const [isDeleted, setIsDeleted] = useState('false');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(undefined);
  const [loadingList, setLoadingList] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [quarantineStatus, setQuarantineStatus] = useState('PENDING_REVIEW');
  const [quarantineVerdict, setQuarantineVerdict] = useState('');
  const [quarantineAction, setQuarantineAction] = useState('');
  const [quarantineUserId, setQuarantineUserId] = useState('');
  const [selectedUploadId, setSelectedUploadId] = useState(null);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [selectedUploadLoading, setSelectedUploadLoading] = useState(false);
  const [reviewVerdict, setReviewVerdict] = useState('REJECTED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [banDays, setBanDays] = useState('365');
  const [banPermanent, setBanPermanent] = useState(false);
  const [suspendDays, setSuspendDays] = useState('30');
  const [quarantineActionLoading, setQuarantineActionLoading] = useState('');

  const dummyMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search || '');
    return params.get('dummy') === '1';
  }, []);

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setPage(1);
    if (nextTab === 'quarantine') {
      setLimit(20);
      return;
    }
    setLimit(50);
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && !canAccess) {
      toast.error('Kamu tidak punya permission untuk Moderation');
      router.replace('/dashboard');
    }
  }, [loading, user, canAccess, router]);

  const subtitle = useMemo(() => {
    if (tab === 'comment') return 'Pantau komentar yang masuk dan tindak lanjuti yang perlu dibersihkan.';
    if (tab === 'global') return 'Rapikan percakapan global agar tetap nyaman dilihat pengguna.';
    return 'Periksa gambar yang tertahan otomatis lalu putuskan tindak lanjut yang paling tepat.';
  }, [tab]);

  const quarantineSummary = useMemo(() => {
    if (tab !== 'quarantine') return { warnedUsers: 0, pending: 0, withPreview: 0 };
    return {
      warnedUsers: items.filter((it) => String(it?.user?.account_status || '').toUpperCase() === 'WARNED').length,
      pending: items.filter((it) => String(it?.status || '').toUpperCase() === 'PENDING_REVIEW').length,
      withPreview: items.filter((it) => !!String(it?.url || '').trim()).length,
    };
  }, [items, tab]);

  const selectedSafeSearchEntries = useMemo(() => getSafeSearchEntries(selectedUpload), [selectedUpload]);

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

      if (tab === 'global') {
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
        return;
      }

      if (dummyMode) {
        const activeStatus = opts.status !== undefined ? String(opts.status || '') : String(quarantineStatus || '');
        const activeVerdict = opts.verdict !== undefined ? String(opts.verdict || '') : String(quarantineVerdict || '');
        const activeAction = opts.action !== undefined ? String(opts.action || '') : String(quarantineAction || '');
        const activeUserId = opts.user_id !== undefined ? String(opts.user_id || '') : String(quarantineUserId || '');
        const filtered = DUMMY_QUARANTINE_UPLOADS.filter((it) => {
          if (activeStatus && String(it.status || '') !== activeStatus) return false;
          if (activeVerdict && String(it.verdict || '') !== activeVerdict) return false;
          if (activeAction && String(it.action || '') !== activeAction) return false;
          if (activeUserId && String(it.user_id || '') !== activeUserId) return false;
          return true;
        });
        const nextLimit = Number(opts.limit ?? limit) || limit;
        const nextPage = Number(opts.page ?? page) || 1;
        const totalCount = filtered.length;
        const totalPageCount = Math.max(1, Math.ceil(totalCount / Math.max(1, nextLimit)));
        const sliceStart = (Math.max(1, nextPage) - 1) * Math.max(1, nextLimit);
        const nextItems = filtered.slice(sliceStart, sliceStart + Math.max(1, nextLimit));
        setItems(nextItems);
        setTotal(totalCount);
        setTotalPages(totalPageCount);
        setPage(Math.max(1, nextPage));
        setLimit(nextLimit);
        setSelectedUploadId((prev) => {
          const hasPrev = nextItems.some((item) => String(item?.id) === String(prev));
          if (hasPrev) return prev;
          return nextItems[0]?.id ?? null;
        });
        return;
      }

      const data = await listNsfwQuarantineUploads({
        token,
        page,
        limit,
        status: quarantineStatus,
        verdict: quarantineVerdict,
        action: quarantineAction,
        user_id: quarantineUserId,
        ...opts,
      });
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages);
      setPage(data.page || 1);
      setLimit(data.limit || limit);
      setSelectedUploadId((prev) => {
        const hasPrev = nextItems.some((item) => String(item?.id) === String(prev));
        if (hasPrev) return prev;
        return nextItems[0]?.id ?? null;
      });
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
  }, [user, canAccess, tab, page, limit, isDeleted, quarantineStatus, quarantineVerdict, quarantineAction, quarantineUserId]);

  useEffect(() => {
    if (tab !== 'quarantine' || selectedUploadId === null || selectedUploadId === undefined) {
      if (tab !== 'quarantine') {
        setSelectedUpload(null);
        setSelectedUploadLoading(false);
      }
      return;
    }

    if (dummyMode) {
      const found = DUMMY_QUARANTINE_UPLOADS.find((it) => String(it?.id) === String(selectedUploadId));
      setSelectedUpload(found || null);
      setSelectedUploadLoading(false);
      setReviewVerdict(String(found?.verdict || 'REJECTED').toUpperCase());
      setReviewNotes(String(found?.notes || ''));
      return;
    }

    let cancelled = false;
    const run = async () => {
      setSelectedUploadLoading(true);
      try {
        const token = getSession()?.token;
        const data = await getNsfwQuarantineUploadDetail({ token, id: selectedUploadId });
        if (cancelled) return;
        setSelectedUpload(data || null);
        setReviewVerdict(String(data?.verdict || 'REJECTED').toUpperCase());
        setReviewNotes(String(data?.notes || ''));
      } catch (err) {
        if (!cancelled) toast.error(err?.message || 'Gagal mengambil detail gambar');
      } finally {
        if (!cancelled) setSelectedUploadLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [tab, selectedUploadId]);

  const onSearch = async (e) => {
    e.preventDefault();
    setPage(1);
  };

  const refreshSelectedUpload = async (forcedId) => {
    const currentId = forcedId ?? selectedUploadId;
    if (currentId === null || currentId === undefined || currentId === '') return null;
    const token = getSession()?.token;
    const data = await getNsfwQuarantineUploadDetail({ token, id: currentId });
    setSelectedUpload(data || null);
    setReviewVerdict(String(data?.verdict || 'REJECTED').toUpperCase());
    setReviewNotes(String(data?.notes || ''));
    return data;
  };

  const runQuarantineAction = async ({ key, action, successMessage, reloadList = true, refreshDetail = true }) => {
    if (dummyMode) {
      toast.success('Mode dummy: tindakan disimulasikan.');
      return;
    }
    setQuarantineActionLoading(key);
    try {
      await action();
      toast.success(successMessage);
      if (reloadList) await loadList();
      if (!reloadList && refreshDetail && selectedUploadId !== null && selectedUploadId !== undefined) {
        await refreshSelectedUpload();
      }
    } catch (err) {
      toast.error(err?.message || 'Tindakan gagal dijalankan');
    } finally {
      setQuarantineActionLoading('');
    }
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

  const onSubmitQuarantineReview = async (e) => {
    e.preventDefault();
    if (!selectedUpload?.id && selectedUpload?.id !== 0) return;
    await runQuarantineAction({
      key: `review:${selectedUpload.id}`,
      successMessage: reviewVerdict === 'APPROVED' ? 'Gambar ditandai aman.' : 'Keputusan peninjauan berhasil disimpan.',
      action: async () => {
        const token = getSession()?.token;
        const next = await reviewNsfwQuarantineUpload({
          token,
          id: selectedUpload.id,
          payload: {
            verdict: reviewVerdict,
            notes: reviewNotes,
          },
        });

        setSelectedUpload((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: next?.status ?? 'REVIEWED',
            verdict: next?.verdict ?? reviewVerdict,
            notes: reviewNotes,
            reviewed_at: prev?.reviewed_at ?? new Date().toISOString(),
          };
        });
      },
    });
  };

  const onDeleteQuarantineUpload = async () => {
    if (!selectedUpload?.id && selectedUpload?.id !== 0) return;
    await runQuarantineAction({
      key: `delete:${selectedUpload.id}`,
      successMessage: 'File tertahan berhasil dibersihkan dari antrian.',
      refreshDetail: false,
      action: async () => {
        const token = getSession()?.token;
        await deleteNsfwQuarantineUpload({ token, id: selectedUpload.id });
      },
    });
  };

  const onBanUser = async () => {
    if (!selectedUpload?.id && selectedUpload?.id !== 0) return;
    await runQuarantineAction({
      key: `ban:${selectedUpload.id}`,
      successMessage: banPermanent ? 'Akun berhasil diblokir permanen.' : 'Akun berhasil diblokir sementara.',
      action: async () => {
        const token = getSession()?.token;
        await banUserFromNsfwQuarantineUpload({
          token,
          id: selectedUpload.id,
          days: banPermanent ? undefined : Number(banDays || 365),
          permanent: banPermanent || undefined,
        });
      },
    });
  };

  const onSuspendUser = async () => {
    if (!selectedUpload?.id && selectedUpload?.id !== 0) return;
    await runQuarantineAction({
      key: `suspend:${selectedUpload.id}`,
      successMessage: 'Akun berhasil ditangguhkan sementara.',
      action: async () => {
        const token = getSession()?.token;
        await suspendUserFromNsfwQuarantineUpload({
          token,
          id: selectedUpload.id,
          days: Number(suspendDays || 30),
        });
      },
    });
  };

  const onClearWarnedUser = async () => {
    if (!selectedUpload?.id && selectedUpload?.id !== 0) return;
    await runQuarantineAction({
      key: `clear:${selectedUpload.id}`,
      successMessage: 'Status peringatan akun berhasil dipulihkan.',
      action: async () => {
        const token = getSession()?.token;
        await clearWarnedFromNsfwQuarantineUpload({ token, id: selectedUpload.id });
      },
    });
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
          <Chip active={tab === 'comment'} onClick={() => switchTab('comment')} icon={MessageCircle}>
            Komentar
          </Chip>
          <Chip active={tab === 'global'} onClick={() => switchTab('global')} icon={Globe2}>
            Global
          </Chip>
          <Chip active={tab === 'quarantine'} onClick={() => switchTab('quarantine')} icon={Image}>
            Pemeriksaan Gambar
          </Chip>
        </div>
      </div>

      <form onSubmit={onSearch} className="grid gap-3 rounded-xl border-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
        {tab === 'quarantine' ? (
          <>
            <div className="grid gap-3 lg:grid-cols-4">
              <div>
                <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">Status antrian</div>
                <Select value={quarantineStatus} onChange={setQuarantineStatus}>
                  {QUARANTINE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value || 'all-status'} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">Hasil peninjauan</div>
                <Select value={quarantineVerdict} onChange={setQuarantineVerdict}>
                  {QUARANTINE_VERDICT_OPTIONS.map((option) => (
                    <option key={option.value || 'all-verdict'} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">Area upload</div>
                <Select value={quarantineAction} onChange={setQuarantineAction}>
                  {QUARANTINE_ACTION_OPTIONS.map((option) => (
                    <option key={option.value || 'all-action'} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">User ID</div>
                <TextInput value={quarantineUserId} onChange={setQuarantineUserId} placeholder="Contoh: 123" icon={User} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <div className="w-full sm:w-[140px]">
                <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">Limit</div>
                <Select value={String(limit)} onChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </Select>
              </div>
              <div className="flex gap-2 items-end">
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
                  <Search className="size-4" /> Tampilkan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuarantineStatus('PENDING_REVIEW');
                    setQuarantineVerdict('');
                    setQuarantineAction('');
                    setQuarantineUserId('');
                    setPage(1);
                    setLimit(20);
                  }}
                  className="px-4 py-2 border-4 rounded-lg font-extrabold text-sm hover:brightness-95 inline-flex items-center gap-2"
                  style={{
                    boxShadow: '4px 4px 0 #000',
                    background: 'var(--background)',
                    borderColor: 'var(--panel-border)',
                    color: 'var(--foreground)',
                  }}
                >
                  Reset
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
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_160px]">
              <div>
                <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">Pencarian</div>
                <TextInput value={q} onChange={setQ} placeholder="Cari content, username, atau nama pengguna..." icon={Search} />
              </div>

              <div>
                <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">Status hapus</div>
                <Select value={isDeleted} onChange={(v) => { setIsDeleted(v); setPage(1); }}>
                  <option value="false">Masih aktif</option>
                  <option value="true">Sudah dihapus</option>
                  <option value="">Semua</option>
                </Select>
              </div>

              <div>
                <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">Limit</div>
                <Select value={String(limit)} onChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 lg:justify-end">
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
          </>
        )}
      </form>

      {tab === 'comment' ? (
        <Panel
          title="Moderasi Komentar"
          icon={MessageCircle}
          description="Gunakan filter untuk menemukan komentar yang perlu dirapikan. Konten bisa disembunyikan langsung per item."
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
      ) : tab === 'global' ? (
        <Panel
          title="Moderasi Global Chat"
          icon={Globe2}
          description="Pantau percakapan global dan sembunyikan pesan yang mengganggu kenyamanan pengguna."
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
      ) : (
        <Panel
          title="Pemeriksaan Gambar Sensitif"
          icon={Image}
          description="Admin bisa melihat gambar yang tertahan otomatis, menilai ulang hasil deteksi, lalu menentukan tindakan lanjutan untuk file maupun akun terkait."
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border-4 p-4" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <div className="text-[11px] font-black uppercase tracking-wide opacity-70">Item di halaman ini</div>
                <div className="mt-2 text-2xl font-black">{items.length}</div>
                <div className="mt-1 text-xs font-semibold opacity-70">Dari total {total} gambar yang cocok dengan filter saat ini.</div>
              </div>
              <div className="rounded-xl border-4 p-4" style={{ boxShadow: '4px 4px 0 #000', background: '#FEF3C7', borderColor: 'var(--panel-border)', color: '#92400E' }}>
                <div className="text-[11px] font-black uppercase tracking-wide opacity-70">Perlu perhatian cepat</div>
                <div className="mt-2 text-2xl font-black">{quarantineSummary.pending}</div>
                <div className="mt-1 text-xs font-semibold opacity-80">Masih menunggu keputusan admin pada halaman ini.</div>
              </div>
              <div className="rounded-xl border-4 p-4" style={{ boxShadow: '4px 4px 0 #000', background: '#DBEAFE', borderColor: 'var(--panel-border)', color: '#1D4ED8' }}>
                <div className="text-[11px] font-black uppercase tracking-wide opacity-70">Akun berstatus peringatan</div>
                <div className="mt-2 text-2xl font-black">{quarantineSummary.warnedUsers}</div>
                <div className="mt-1 text-xs font-semibold opacity-80">Bisa dipulihkan jika hasil pemeriksaan sudah aman.</div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_380px] items-start">
              <div className="space-y-3 min-w-0">
                <div className="text-xs text-zinc-500 font-bold">
                  Total: {total} {totalPages ? `• Pages: ${totalPages}` : ''}
                </div>

                {loadingList ? (
                  <div className="rounded-xl border-4 p-6 text-sm font-semibold" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)' }}>Memuat daftar gambar...</div>
                ) : items.length === 0 ? (
                  <div className="rounded-xl border-4 p-6 text-sm font-semibold" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)' }}>Belum ada item yang cocok dengan filter saat ini.</div>
                ) : (
                  items.map((it) => {
                    const isActive = String(selectedUploadId) === String(it?.id);
                    const statusPalette = getBadgePalette(it?.status, 'status');
                    const verdictPalette = getBadgePalette(it?.verdict, 'verdict');
                    const accountPalette = getBadgePalette(it?.user?.account_status, 'account');
                    const safeSearchEntries = getSafeSearchEntries(it);
                    return (
                      <button
                        key={String(it?.id)}
                        type="button"
                        onClick={() => setSelectedUploadId(it?.id ?? null)}
                        className="w-full text-left rounded-[22px] border-4 p-4 transition hover:brightness-95"
                        style={{
                          boxShadow: '6px 6px 0 #000',
                          background: isActive ? 'rgba(255, 216, 3, 0.18)' : 'var(--background)',
                          borderColor: 'var(--panel-border)',
                          color: 'var(--foreground)',
                        }}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start">
                          <div className="w-full md:w-40 shrink-0">
                            {it?.url ? (
                              <img src={it.url} alt={`upload-${it.id}`} className="h-36 w-full rounded-xl border-4 object-cover" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }} />
                            ) : (
                              <div className="grid h-36 place-items-center rounded-xl border-4 text-sm font-semibold opacity-70" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>Preview belum tersedia</div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-black">#{it?.id} • {it?.user?.username || `User #${it?.user_id}`}</div>
                                <div className="mt-1 text-xs font-semibold opacity-70">{formatLabel(it?.action)} • {formatDateTime(it?.createdAt)}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge background={statusPalette.background} color={statusPalette.color}>{formatLabel(it?.status)}</Badge>
                                {it?.verdict ? <Badge background={verdictPalette.background} color={verdictPalette.color}>{formatLabel(it?.verdict)}</Badge> : <Badge>Belum diputuskan</Badge>}
                                {it?.user?.account_status ? <Badge background={accountPalette.background} color={accountPalette.color}>{formatLabel(it.user.account_status)}</Badge> : null}
                              </div>
                            </div>

                            <div className="grid gap-2 text-xs font-semibold md:grid-cols-2 xl:grid-cols-3">
                              <div className="rounded-xl border-4 px-3 py-2" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>User ID: {it?.user_id ?? '-'}</div>
                              <div className="rounded-xl border-4 px-3 py-2" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>Ukuran: {formatBytes(it?.size_bytes)}</div>
                              <div className="rounded-xl border-4 px-3 py-2" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>Format: {it?.mimetype || '-'}</div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {safeSearchEntries.length > 0 ? safeSearchEntries.map((entry) => {
                                const riskPalette = getBadgePalette(entry.value, 'risk');
                                return <Badge key={`${it?.id}-${entry.key}`} background={riskPalette.background} color={riskPalette.color}>{entry.label}: {entry.value}</Badge>;
                              }) : <Badge>Analisis visual belum tersedia</Badge>}
                            </div>

                            <div className="inline-flex items-center gap-2 text-xs font-black opacity-80">
                              <Eye className="size-3.5" /> Buka detail untuk meninjau penuh dan ambil tindakan.
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}

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
                    disabled={loadingList || (typeof totalPages === 'number' ? page >= totalPages : items.length < limit)}
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

              <div className="rounded-[24px] border-4 p-4 xl:sticky xl:top-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                {selectedUploadLoading ? (
                  <div className="text-sm font-semibold">Memuat detail gambar...</div>
                ) : !selectedUpload ? (
                  <div className="space-y-2">
                    <div className="text-sm font-black">Belum ada item dipilih</div>
                    <div className="text-xs font-semibold opacity-70">Pilih salah satu kartu di kiri untuk melihat preview besar, detail user, hasil analisis, dan tindakan admin.</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-lg font-black">Detail Pemeriksaan</div>
                      <div className="mt-1 text-xs font-semibold opacity-70">#{selectedUpload.id} • {formatLabel(selectedUpload.action)} • {formatDateTime(selectedUpload.createdAt)}</div>
                    </div>

                    {selectedUpload?.url ? (
                      <img src={selectedUpload.url} alt={`selected-${selectedUpload.id}`} className="w-full rounded-[20px] border-4 object-cover max-h-[340px]" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }} />
                    ) : (
                      <div className="grid h-52 place-items-center rounded-[20px] border-4 text-sm font-semibold opacity-70" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>Preview belum tersedia</div>
                    )}

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border-4 p-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                        <div className="text-[11px] font-black uppercase tracking-wide opacity-70">Status item</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(() => {
                            const palette = getBadgePalette(selectedUpload?.status, 'status');
                            return <Badge background={palette.background} color={palette.color}>{formatLabel(selectedUpload?.status)}</Badge>;
                          })()}
                          {selectedUpload?.verdict ? (() => {
                            const palette = getBadgePalette(selectedUpload?.verdict, 'verdict');
                            return <Badge background={palette.background} color={palette.color}>{formatLabel(selectedUpload?.verdict)}</Badge>;
                          })() : <Badge>Belum diputuskan</Badge>}
                        </div>
                      </div>
                      <div className="rounded-xl border-4 p-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                        <div className="text-[11px] font-black uppercase tracking-wide opacity-70">Status akun</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedUpload?.user?.account_status ? (() => {
                            const palette = getBadgePalette(selectedUpload.user.account_status, 'account');
                            return <Badge background={palette.background} color={palette.color}>{formatLabel(selectedUpload.user.account_status)}</Badge>;
                          })() : <Badge>Tidak tersedia</Badge>}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border-4 p-4 space-y-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                      <div className="font-black text-sm">Ringkasan upload</div>
                      <div className="grid gap-2 text-xs font-semibold">
                        <div>User: {selectedUpload?.user?.username || `#${selectedUpload?.user_id}`}</div>
                        <div>Area: {formatLabel(selectedUpload?.action)}</div>
                        <div>Storage key: <span className="break-all">{selectedUpload?.storage_key || '-'}</span></div>
                        <div>Ukuran file: {formatBytes(selectedUpload?.size_bytes)}</div>
                        <div>Tipe file: {selectedUpload?.mimetype || '-'}</div>
                        <div>Ditinjau pada: {formatDateTime(selectedUpload?.reviewed_at)}</div>
                        <div>Admin peninjau: {selectedUpload?.reviewed_by_admin_id ?? '-'}</div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border-4 p-4 space-y-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                      <div className="font-black text-sm">Analisis visual</div>
                      {selectedSafeSearchEntries.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedSafeSearchEntries.map((entry) => {
                            const palette = getBadgePalette(entry.value, 'risk');
                            return <Badge key={`detail-${entry.key}`} background={palette.background} color={palette.color}>{entry.label}: {entry.value}</Badge>;
                          })}
                        </div>
                      ) : (
                        <div className="text-xs font-semibold opacity-70">Belum ada data analisis visual yang bisa ditampilkan.</div>
                      )}
                    </div>

                    <form onSubmit={onSubmitQuarantineReview} className="rounded-[20px] border-4 p-4 space-y-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                      <div className="font-black text-sm">Simpan hasil pemeriksaan</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Select value={reviewVerdict} onChange={setReviewVerdict}>
                          <option value="APPROVED">Izinkan</option>
                          <option value="REJECTED">Tolak</option>
                        </Select>
                        <button
                          type="submit"
                          disabled={quarantineActionLoading === `review:${selectedUpload.id}`}
                          className="px-4 py-2 border-4 rounded-lg font-extrabold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
                          style={{ boxShadow: '4px 4px 0 #000', background: reviewVerdict === 'APPROVED' ? '#DCFCE7' : '#FECACA', borderColor: 'var(--panel-border)', color: reviewVerdict === 'APPROVED' ? '#166534' : '#991B1B' }}
                        >
                          {reviewVerdict === 'APPROVED' ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                          {quarantineActionLoading === `review:${selectedUpload.id}` ? 'Menyimpan...' : 'Simpan keputusan'}
                        </button>
                      </div>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                        placeholder="Tambahkan catatan singkat bila diperlukan"
                        className="w-full border-4 rounded-xl px-3 py-2 text-sm font-semibold"
                        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                      />
                    </form>

                    <div className="rounded-[20px] border-4 p-4 space-y-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                      <div className="font-black text-sm">Tindakan lanjutan</div>

                      <button
                        type="button"
                        disabled={quarantineActionLoading === `delete:${selectedUpload.id}`}
                        onClick={onDeleteQuarantineUpload}
                        className="w-full px-4 py-2 border-4 rounded-lg font-extrabold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
                        style={{ boxShadow: '4px 4px 0 #000', background: '#FECACA', borderColor: 'var(--panel-border)', color: '#991B1B' }}
                      >
                        <Trash2 className="size-4" />
                        {quarantineActionLoading === `delete:${selectedUpload.id}` ? 'Menghapus...' : 'Hapus file dari antrian'}
                      </button>

                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <div>
                          <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">Tangguhkan akun (hari)</div>
                          <TextInput value={suspendDays} onChange={setSuspendDays} placeholder="30" icon={Clock3} />
                        </div>
                        <button
                          type="button"
                          disabled={quarantineActionLoading === `suspend:${selectedUpload.id}`}
                          onClick={onSuspendUser}
                          className="px-4 py-2 border-4 rounded-lg font-extrabold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
                          style={{ boxShadow: '4px 4px 0 #000', background: '#FDE68A', borderColor: 'var(--panel-border)', color: '#78350F' }}
                        >
                          <Clock3 className="size-4" />
                          {quarantineActionLoading === `suspend:${selectedUpload.id}` ? 'Memproses...' : 'Tangguhkan akun'}
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <div className="space-y-2">
                          <div>
                            <div className="text-xs font-bold tracking-wide text-zinc-500 mb-1">Blokir akun (hari)</div>
                            <TextInput value={banDays} onChange={setBanDays} placeholder="365" icon={Ban} />
                          </div>
                          <label className="flex items-center gap-2 text-xs font-semibold">
                            <input type="checkbox" checked={banPermanent} onChange={(e) => setBanPermanent(e.target.checked)} />
                            <span>Blokir permanen</span>
                          </label>
                        </div>
                        <button
                          type="button"
                          disabled={quarantineActionLoading === `ban:${selectedUpload.id}`}
                          onClick={onBanUser}
                          className="px-4 py-2 border-4 rounded-lg font-extrabold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
                          style={{ boxShadow: '4px 4px 0 #000', background: '#FECACA', borderColor: 'var(--panel-border)', color: '#991B1B' }}
                        >
                          <Ban className="size-4" />
                          {quarantineActionLoading === `ban:${selectedUpload.id}` ? 'Memproses...' : 'Blokir akun'}
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={quarantineActionLoading === `clear:${selectedUpload.id}` || String(selectedUpload?.user?.account_status || '').toUpperCase() !== 'WARNED'}
                        onClick={onClearWarnedUser}
                        className="w-full px-4 py-2 border-4 rounded-lg font-extrabold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
                        style={{ boxShadow: '4px 4px 0 #000', background: '#DBEAFE', borderColor: 'var(--panel-border)', color: '#1D4ED8' }}
                      >
                        <ShieldCheck className="size-4" />
                        {quarantineActionLoading === `clear:${selectedUpload.id}` ? 'Memulihkan...' : 'Pulihkan status peringatan'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Panel>
      )}

      <div className="text-xs text-zinc-500 font-bold">
        {tab === 'quarantine'
          ? 'Gunakan panel pemeriksaan untuk memastikan keputusan terhadap file dan akun selaras dengan konteks pelanggarannya.'
          : 'Konten yang dihapus dari sini akan disamarkan sebagai pelanggaran sesuai aturan backend.'}
      </div>
    </div>
  );
}
