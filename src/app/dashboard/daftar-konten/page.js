'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Plus, Pencil, Trash2, List, ChevronDown, ChevronRight, ChevronUp, Film, ListChecks, BadgeCheck, Save } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAnime, createAnime, updateAnime, deleteAnime, listEpisodes, createEpisode, updateEpisode, deleteEpisode, searchAnime, listAnimeAliases, getAnimeDetail, listAnimeRequests, deleteAnimeRequest, takeAnimeRequest, listEpisodeVideoIssueReasons, createEpisodeVideoIssueReason, updateEpisodeVideoIssueReason, deleteEpisodeVideoIssueReason, listEpisodeVideoIssueReports, updateEpisodeVideoIssueReport, updateEpisodeVideoIssueReportStatus, deleteEpisodeVideoIssueReport } from '@/lib/api';

function parseAliasNamesForUi(val) {
  const raw = String(val || '').trim();
  if (!raw) return [];

  const pushAlias = (bucket, input) => {
    if (!input) return;
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (trimmed) bucket.push(trimmed);
      return;
    }
    if (input && typeof input === 'object') {
      const alias = String(input.alias || '').trim();
      if (alias) bucket.push(alias);
    }
  };

  try {
    if (raw.startsWith('[') || raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const out = [];
        parsed.forEach((item) => pushAlias(out, item));
        return [...new Set(out)];
      }
      const out = [];
      pushAlias(out, parsed);
      return [...new Set(out)];
    }
  } catch {}

  const out = [];
  raw
    .split(/\n|,/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      if ((part.startsWith('{') && part.endsWith('}')) || (part.startsWith('[') && part.endsWith(']'))) {
        try {
          const parsed = JSON.parse(part);
          if (Array.isArray(parsed)) parsed.forEach((item) => pushAlias(out, item));
          else pushAlias(out, parsed);
          return;
        } catch {}
      }
      pushAlias(out, part);
    });

  return [...new Set(out)];
}

function stringifyAliasNamesForUi(list) {
  return [...new Set((Array.isArray(list) ? list : []).map((item) => String(item || '').trim()).filter(Boolean))].join('\n');
}

export default function DaftarKontenPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  // List state
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [genre, setGenre] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set()); // anime ids expanded

  // Form state (add/edit)
  const [mode, setMode] = useState('add'); // add | edit
  const [activeTab, setActiveTab] = useState('anime'); // anime | episode | requests | episode-issue
  const [form, setForm] = useState({
    id: null,
    nama_anime: '',
    cover_mode: 'upload',
    cover_url: '',
    image: null,
    previewUrl: '',
    existingImageUrl: '',
    rating_anime: '',
    content_type: 'ANIME',
    is_21_plus: false,
    status_anime: '',
    sinopsis_anime: '',
    label_anime: '',
    tags_anime: '',
    genre_anime: '',
    studio_anime: '',
    fakta_menarik: '',
    tanggal_rilis_anime: '',
    aliases: '',
    alias_priority: '',
    schedule_hari: '',
    schedule_jam: '',
    schedule_is_active: true,
  });
  const [aliasSearch, setAliasSearch] = useState('');
  const [aliasLookup, setAliasLookup] = useState([]);
  const [aliasLookupLoading, setAliasLookupLoading] = useState(false);
  const [newAliasInput, setNewAliasInput] = useState('');

  const canEpisodeIssueAccess = useMemo(() => {
    const role = String(user?.role || '').toLowerCase();
    if (role === 'superadmin') return true;
    const perms = Array.isArray(user?.permissions) ? user.permissions : [];
    return perms.includes('episode-video-issues');
  }, [user]);

  useEffect(() => {
    if (activeTab === 'episode-issue' && !canEpisodeIssueAccess) {
      setActiveTab('anime');
    }
  }, [activeTab, canEpisodeIssueAccess]);

  // Episode Issue: local UI state (reasons + reports)
  const [issueSubTab, setIssueSubTab] = useState('reports'); // reasons | reports

  // Reasons
  const [issueIncludeInactive, setIssueIncludeInactive] = useState(false);
  const [issueReasonsLoading, setIssueReasonsLoading] = useState(false);
  const [issueReasons, setIssueReasons] = useState([]);
  const [issueReasonMode, setIssueReasonMode] = useState('add');
  const [issueReasonForm, setIssueReasonForm] = useState({
    id: null,
    code: '',
    title: '',
    description: '',
    is_active: true,
    sort_order: 0,
  });
  const [issueReasonSubmitting, setIssueReasonSubmitting] = useState(false);
  const [issueReasonConfirmOpen, setIssueReasonConfirmOpen] = useState(false);
  const [issueReasonConfirmTarget, setIssueReasonConfirmTarget] = useState(null);
  const [issueReasonDeleting, setIssueReasonDeleting] = useState(false);

  // Reports
  const [issueReports, setIssueReports] = useState([]);
  const [issueReportsPagination, setIssueReportsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [issueReportsLoading, setIssueReportsLoading] = useState(false);
  const [issueReportStatus, setIssueReportStatus] = useState('');
  const [issueReportEpisodeId, setIssueReportEpisodeId] = useState('');
  const [issueReportUserId, setIssueReportUserId] = useState('');
  const [issueReportReasonId, setIssueReportReasonId] = useState('');
  const [issueEditingReport, setIssueEditingReport] = useState(null);
  const [issueReportSubmitting, setIssueReportSubmitting] = useState(false);
  const [issueReportConfirmOpen, setIssueReportConfirmOpen] = useState(false);
  const [issueReportConfirmTarget, setIssueReportConfirmTarget] = useState(null);
  const [issueReportDeleting, setIssueReportDeleting] = useState(false);

  const loadIssueReasons = async (opts = {}) => {
    setIssueReasonsLoading(true);
    try {
      const token = getSession()?.token;
      const res = await listEpisodeVideoIssueReasons({ token, include_inactive: issueIncludeInactive, ...opts });
      setIssueReasons(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat reasons');
    } finally {
      setIssueReasonsLoading(false);
    }
  };

  const resetIssueReasonForm = () => {
    setIssueReasonMode('add');
    setIssueReasonForm({ id: null, code: '', title: '', description: '', is_active: true, sort_order: 0 });
  };

  const onEditIssueReason = (it) => {
    setIssueReasonMode('edit');
    setIssueReasonForm({
      id: it.id,
      code: it.code || '',
      title: it.title || '',
      description: it.description || '',
      is_active: it.is_active !== undefined ? !!it.is_active : true,
      sort_order: typeof it.sort_order === 'number' ? it.sort_order : Number(it.sort_order) || 0,
    });
  };

  const onSubmitIssueReason = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;

    if (issueReasonMode === 'add') {
      if (!issueReasonForm.code || !issueReasonForm.title) return toast.error('code dan title wajib diisi');
    } else {
      if (!issueReasonForm.title) return toast.error('title wajib diisi');
    }

    const payload = {
      title: issueReasonForm.title,
      description: issueReasonForm.description === '' ? null : issueReasonForm.description,
      is_active: !!issueReasonForm.is_active,
      sort_order: Number(issueReasonForm.sort_order) || 0,
    };
    if (issueReasonMode === 'add') payload.code = String(issueReasonForm.code || '').trim();

    try {
      setIssueReasonSubmitting(true);
      if (issueReasonMode === 'add') {
        const res = await createEpisodeVideoIssueReason({ token, payload });
        toast.success(res?.message || 'Reason dibuat');
      } else {
        const res = await updateEpisodeVideoIssueReason({ token, id: issueReasonForm.id, payload });
        toast.success(res?.message || 'Reason diperbarui');
      }
      resetIssueReasonForm();
      await loadIssueReasons();
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan reason');
    } finally {
      setIssueReasonSubmitting(false);
    }
  };

  const onRequestDeleteIssueReason = (it) => {
    setIssueReasonConfirmTarget(it);
    setIssueReasonConfirmOpen(true);
  };

  const onCancelDeleteIssueReason = () => {
    setIssueReasonConfirmOpen(false);
    setIssueReasonConfirmTarget(null);
  };

  const onConfirmDeleteIssueReason = async () => {
    if (!issueReasonConfirmTarget) return;
    const token = getSession()?.token;
    try {
      setIssueReasonDeleting(true);
      const res = await deleteEpisodeVideoIssueReason({ token, id: issueReasonConfirmTarget.id });
      toast.success(res?.message || 'Reason dihapus');
      setIssueReasonConfirmOpen(false);
      setIssueReasonConfirmTarget(null);
      if (issueReasonMode === 'edit' && issueReasonForm.id === issueReasonConfirmTarget.id) resetIssueReasonForm();
      await loadIssueReasons();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus reason');
    } finally {
      setIssueReasonDeleting(false);
    }
  };

  const loadIssueReports = async (opts = {}) => {
    setIssueReportsLoading(true);
    try {
      const token = getSession()?.token;
      const page = opts.page ?? issueReportsPagination.page;
      const limit = opts.limit ?? issueReportsPagination.limit;
      const res = await listEpisodeVideoIssueReports({
        token,
        page,
        limit,
        status: issueReportStatus || undefined,
        episode_id: issueReportEpisodeId || undefined,
        user_id: issueReportUserId || undefined,
        reason_id: issueReportReasonId || undefined,
      });
      setIssueReports(Array.isArray(res?.items) ? res.items : []);
      setIssueReportsPagination(res?.pagination || { page, limit, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat reports');
    } finally {
      setIssueReportsLoading(false);
    }
  };

  const parseIssueReportMetadata = (text) => {
    const raw = (text || '').trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('Metadata harus JSON valid (atau kosong)');
    }
  };

  const onSearchIssueReports = (e) => {
    e.preventDefault();
    setIssueEditingReport(null);
    loadIssueReports({ page: 1 });
  };

  const onStartEditIssueReport = (it) => {
    setIssueEditingReport({
      id: it.id,
      reason_id: it.reason_id ?? '',
      note: it.note ?? '',
      metadataText: it.metadata ? JSON.stringify(it.metadata, null, 2) : '',
      status: it.status || 'PENDING',
    });
  };

  const onCancelEditIssueReport = () => setIssueEditingReport(null);

  const onSaveEditIssueReport = async (e) => {
    e.preventDefault();
    if (!issueEditingReport) return;
    const token = getSession()?.token;

    let metadata;
    try {
      metadata = parseIssueReportMetadata(issueEditingReport.metadataText);
    } catch (err) {
      return toast.error(err?.message || 'Metadata tidak valid');
    }

    const payload = {
      reason_id: issueEditingReport.reason_id === '' ? null : Number(issueEditingReport.reason_id),
      note: issueEditingReport.note === '' ? null : issueEditingReport.note,
      metadata,
      status: issueEditingReport.status,
    };

    try {
      setIssueReportSubmitting(true);
      const res = await updateEpisodeVideoIssueReport({ token, id: issueEditingReport.id, payload });
      toast.success(res?.message || 'Report diperbarui');
      setIssueEditingReport(null);
      await loadIssueReports();
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan report');
    } finally {
      setIssueReportSubmitting(false);
    }
  };

  const onQuickStatusIssueReport = async (id, nextStatus) => {
    const token = getSession()?.token;
    try {
      setIssueReportSubmitting(true);
      const res = await updateEpisodeVideoIssueReportStatus({ token, id, status: nextStatus });
      toast.success(res?.message || 'Status diperbarui');
      await loadIssueReports();
    } catch (err) {
      toast.error(err?.message || 'Gagal update status');
    } finally {
      setIssueReportSubmitting(false);
    }
  };

  const onRequestDeleteIssueReport = (it) => {
    setIssueReportConfirmTarget(it);
    setIssueReportConfirmOpen(true);
  };

  const onCancelDeleteIssueReport = () => {
    setIssueReportConfirmOpen(false);
    setIssueReportConfirmTarget(null);
  };

  const onConfirmDeleteIssueReport = async () => {
    if (!issueReportConfirmTarget) return;
    const token = getSession()?.token;
    try {
      setIssueReportDeleting(true);
      const res = await deleteEpisodeVideoIssueReport({ token, id: issueReportConfirmTarget.id });
      toast.success(res?.message || 'Report dihapus');
      setIssueReportConfirmOpen(false);
      setIssueReportConfirmTarget(null);
      if (issueEditingReport?.id === issueReportConfirmTarget.id) setIssueEditingReport(null);
      await loadIssueReports();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus report');
    } finally {
      setIssueReportDeleting(false);
    }
  };

  useEffect(() => {
    if (!user || !canEpisodeIssueAccess) return;
    if (activeTab !== 'episode-issue') return;
    loadIssueReasons({ include_inactive: true });
    loadIssueReports({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user, canEpisodeIssueAccess]);

  useEffect(() => {
    if (!user || !canEpisodeIssueAccess) return;
    if (activeTab !== 'episode-issue') return;
    if (issueSubTab !== 'reasons') return;
    loadIssueReasons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueIncludeInactive, activeTab, issueSubTab, user, canEpisodeIssueAccess]);

  useEffect(() => {
    if (!user || !canEpisodeIssueAccess) return;
    if (activeTab !== 'episode-issue') return;
    if (issueSubTab !== 'reports') return;
    if (issueReports.length > 0) return;
    loadIssueReports({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, issueSubTab, user, canEpisodeIssueAccess]);

  const onChangeAnimeImage = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setForm((f) => ({ ...f, image: null, previewUrl: '' }));
      return;
    }
    const url = URL.createObjectURL(file);
    setForm((f) => ({ ...f, image: file, previewUrl: url }));
  };
  // (HAPUS) Bulk Sync state dan fitur dihilangkan
  const [submittingTabEpisode, setSubmittingTabEpisode] = useState(false);

  // ===== Tab: Anime Requests =====
  const REQUEST_STATUSES = useMemo(() => (['PENDING', 'UNDER_REVIEW', 'UPLOAD_IN_PROGRESS', 'COMPLETED', 'REJECTED']), []);
  const REQUEST_STATUS_META = useMemo(() => ({
    ALL: { label: 'Semua', bg: 'var(--panel-bg)', fg: 'var(--foreground)' },
    PENDING: { label: 'Pending', bg: '#F59E0B', fg: '#111827' },
    UNDER_REVIEW: { label: 'Review', bg: '#60A5FA', fg: '#172554' },
    UPLOAD_IN_PROGRESS: { label: 'Upload', bg: '#FB7185', fg: '#4C0519' },
    COMPLETED: { label: 'Selesai', bg: '#22C55E', fg: '#052E16' },
    REJECTED: { label: 'Tolak', bg: '#A78BFA', fg: '#2E1065' },
  }), []);
  const [reqItems, setReqItems] = useState([]);
  const [reqPage, setReqPage] = useState(1);
  const [reqLimit, setReqLimit] = useState(20);
  const [reqTotal, setReqTotal] = useState(0);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqQ, setReqQ] = useState('');
  const [reqStatus, setReqStatus] = useState('');
  const [reqUserId, setReqUserId] = useState('');
  const [reqAdminId, setReqAdminId] = useState('');
  const [reqTakingId, setReqTakingId] = useState(null);
  const [reqConfirmOpen, setReqConfirmOpen] = useState(false);
  const [reqConfirmTarget, setReqConfirmTarget] = useState(null);
  const [reqDeleting, setReqDeleting] = useState(false);

  const loadAnimeRequests = async (opts = {}) => {
    setReqLoading(true);
    try {
      const token = getSession()?.token;
      const params = {
        page: reqPage,
        limit: reqLimit,
        q: reqQ,
        status: reqStatus || undefined,
        user_id: reqUserId || undefined,
        admin_id: reqAdminId || undefined,
        ...opts,
      };
      const data = await listAnimeRequests({ token, ...params });
      const pg = data?.pagination || {};
      setReqItems(Array.isArray(data?.items) ? data.items : []);
      setReqPage(pg.page || params.page || 1);
      setReqLimit(pg.limit || params.limit || 20);
      setReqTotal(pg.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat anime requests');
    } finally {
      setReqLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (activeTab !== 'requests') return;
    loadAnimeRequests({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  useEffect(() => {
    if (!user) return;
    if (activeTab !== 'requests') return;
    setReqPage(1);
    loadAnimeRequests({ page: 1, status: reqStatus || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqStatus]);

  const onTakeReq = async (it) => {
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');
    try {
      setReqTakingId(it.id);
      const res = await takeAnimeRequest({ token, id: it.id });
      toast.success(res?.message || 'Request diambil');
      await loadAnimeRequests();
    } catch (err) {
      toast.error(err?.message || 'Gagal mengambil request');
    } finally {
      setReqTakingId(null);
    }
  };

  const onRequestDeleteReq = (it) => {
    setReqConfirmTarget(it);
    setReqConfirmOpen(true);
  };
  const onCancelDeleteReq = () => {
    setReqConfirmOpen(false);
    setReqConfirmTarget(null);
  };
  const onConfirmDeleteReq = async () => {
    if (!reqConfirmTarget) return;
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');
    try {
      setReqDeleting(true);
      const res = await deleteAnimeRequest({ token, id: reqConfirmTarget.id });
      toast.success(res?.message || 'Request dihapus');
      setReqConfirmOpen(false);
      setReqConfirmTarget(null);
      await loadAnimeRequests();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus request');
    } finally {
      setReqDeleting(false);
    }
  };
  const resetForm = () => {
    setAliasSearch('');
    setAliasLookup([]);
    setAliasLookupLoading(false);
    setNewAliasInput('');
    setForm({
      id: null,
      nama_anime: '',
      cover_mode: 'upload',
      cover_url: '',
      image: null,
      previewUrl: '',
      existingImageUrl: '',
      rating_anime: '',
      content_type: 'ANIME',
      is_21_plus: false,
      status_anime: '',
      sinopsis_anime: '',
      label_anime: '',
      tags_anime: '',
      genre_anime: '',
      studio_anime: '',
      fakta_menarik: '',
      tanggal_rilis_anime: '',
      aliases: '',
      alias_priority: '',
      schedule_hari: '',
      schedule_jam: '',
      schedule_is_active: true,
    });
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = { page, limit, q, status: status || undefined, genre: genre || undefined, ...opts };
      const data = await listAnime({ token, ...params });
      setItems(data.items || []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat anime');
    } finally {
      setLoadingList(false);
    }
  };

  const parseAliases = (val) => {
    const raw = (val || '').trim();
    if (!raw) return undefined;
    try {
      if (raw.startsWith('[') || raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
        if (parsed && typeof parsed === 'object') return [parsed];
      }
    } catch {}
    // Parse per-line, preserve JSON objects when possible
    const tokens = raw.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const out = [];
    for (const t of tokens) {
      if (!t) continue;
      if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
        try {
          const j = JSON.parse(t);
          if (Array.isArray(j)) out.push(...j);
          else out.push(j);
          continue;
        } catch {}
      }
      // also split by comma for simple inline lists
      const parts = t.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length > 1) out.push(...parts);
      else out.push(t);
    }
    return out.length ? out : undefined;
  };
  const currentAliasList = useMemo(() => parseAliasNamesForUi(form.aliases), [form.aliases]);
  const aliasLookupNames = useMemo(() => {
    if (!Array.isArray(aliasLookup)) return [];
    return aliasLookup
      .map((item) => String(item?.alias || '').trim())
      .filter(Boolean);
  }, [aliasLookup]);
  const aliasOptions = useMemo(() => {
    const fromItems = items.flatMap((it) => {
      if (!Array.isArray(it?.aliases)) return [];
      return it.aliases
        .map((a) => (typeof a === 'string' ? a : a?.alias || ''))
        .map((alias) => String(alias || '').trim())
        .filter(Boolean);
    });
    return [...new Set([...fromItems, ...aliasLookupNames, ...currentAliasList])].sort((a, b) => a.localeCompare(b));
  }, [items, aliasLookupNames, currentAliasList]);
  const aliasLookupResults = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(aliasLookup) ? aliasLookup : []).filter((item) => {
      const alias = String(item?.alias || '').trim();
      if (!alias) return false;
      if (currentAliasList.includes(alias)) return false;
      if (seen.has(alias.toLowerCase())) return false;
      seen.add(alias.toLowerCase());
      return true;
    });
  }, [aliasLookup, currentAliasList]);
  const addAliasToForm = (alias) => {
    const normalized = String(alias || '').trim();
    if (!normalized) return;
    setForm((f) => ({
      ...f,
      aliases: stringifyAliasNamesForUi([...parseAliasNamesForUi(f.aliases), normalized]),
    }));
  };
  const removeAliasFromForm = (alias) => {
    const normalized = String(alias || '').trim();
    setForm((f) => ({
      ...f,
      aliases: stringifyAliasNamesForUi(parseAliasNamesForUi(f.aliases).filter((item) => item !== normalized)),
    }));
  };
  const onAddManualAlias = () => {
    const normalized = String(newAliasInput || '').trim();
    if (!normalized) return toast.error('Alias baru tidak boleh kosong');
    addAliasToForm(normalized);
    setNewAliasInput('');
  };

  useEffect(() => {
    if (activeTab !== 'anime') return;
    const q = String(aliasSearch || '').trim();
    if (q.length < 2) {
      setAliasLookup([]);
      setAliasLookupLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setAliasLookupLoading(true);
        const token = getSession()?.token;
        if (!token) return;
        const res = await listAnimeAliases({ token, q, limit: 8 });
        if (!cancelled) setAliasLookup(Array.isArray(res?.items) ? res.items : []);
      } catch (err) {
        if (!cancelled) toast.error(err?.message || 'Gagal mencari alias anime');
      } finally {
        if (!cancelled) setAliasLookupLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeTab, aliasSearch]);
  const replaceEpisodeToken = (text, n) => {
    if (!text) return text;
    const num = Number(n) || 0;
    // Handle padded variants like {n2}, {N2}, {ep2}, {EP2} where the digit indicates total width
    const padRegex = /\{(n|N|ep|EP)(\d+)\}/g;
    let out = text.replace(padRegex, (_, token, width) => String(num).padStart(Number(width), '0'));
    // Fallback simple replacements without padding
    out = out
      .replaceAll('{n}', String(num))
      .replaceAll('{N}', String(num))
      .replaceAll('{ep}', String(num))
      .replaceAll('{EP}', String(num));
    return out;
  };

  // Global Tab: Tambah Episode (under search)
  const [tabEpisode, setTabEpisode] = useState({
    animeId: '',
    judul_episode: '',
    nomor_episode: 1,
    thumbnail_mode: 'upload',
    thumbnail_url: '',
    image: null,
    previewUrl: '',
    existingImageUrl: '',
    deskripsi_episode: '',
    durasi_episode: 0,
    intro_start_seconds: '',
    intro_duration_seconds: 90,
    outro_start_seconds: '',
    outro_duration_seconds: 90,
    tanggal_rilis_episode: '',
    qualities: [],
  });
  const [animeFilter, setAnimeFilter] = useState('');
  const [animeSuggestions, setAnimeSuggestions] = useState([]);
  const [animeSearchLoading, setAnimeSearchLoading] = useState(false);
  const [animeInputFocused, setAnimeInputFocused] = useState(false);
  const defaultQualities = useMemo(() => ([
    { nama_quality: '1080p', source_quality: '' },
    { nama_quality: '720p', source_quality: '' },
    { nama_quality: '480p', source_quality: '' },
    { nama_quality: '360p', source_quality: '' },
  ]), []);
  const QUALITY_ORDER = useMemo(() => (['1080p', '720p', '480p', '360p']), []);
  
  const moveArrayItem = (arr, from, to) => {
    const copy = [...arr];
    if (to < 0 || to >= copy.length) return copy;
    const [spliced] = copy.splice(from, 1);
    copy.splice(to, 0, spliced);
    return copy;
  };
  const addTabQuality = () => setTabEpisode((s) => ({ ...s, qualities: [...(s?.qualities || []), { nama_quality: '', source_quality: '' }] }));
  const removeTabQuality = (i) => setTabEpisode((s) => ({ ...s, qualities: (s.qualities || []).filter((_, idx) => idx !== i) }));
  const updateTabQualityField = (index, key, value) => {
    setTabEpisode((s) => {
      const arr = Array.isArray(s.qualities) ? [...s.qualities] : [];
      arr[index] = { ...arr[index], [key]: value };
      return { ...s, qualities: arr };
    });
  };
  const moveTabQuality = (index, direction) => {
    setTabEpisode((s) => {
      const arr = Array.isArray(s.qualities) ? s.qualities : [];
      const next = moveArrayItem(arr, index, index + direction);
      return { ...s, qualities: next };
    });
  };
  // Prefill fields on anime change for global tab create-episode
  useEffect(() => {
    if (!tabEpisode?.animeId) return;
    const parent = items.find((a) => a.id === tabEpisode.animeId);
    // If episodes are not yet loaded for this anime, fetch them first
    if (parent && !Array.isArray(parent.episodes)) {
      loadEpisodes(tabEpisode.animeId);
      return;
    }
    const hasEpisodes = Array.isArray(parent?.episodes) && parent.episodes.length > 0;
    const latest = hasEpisodes
      ? parent.episodes.reduce((acc, e) => ((Number(e.nomor_episode) || 0) > (Number(acc.nomor_episode) || 0) ? e : acc), parent.episodes[0])
      : null;
    setTabEpisode((s) => ({
      ...s,
      judul_episode: '',
      nomor_episode: hasEpisodes ? ((Number(latest?.nomor_episode) || 0) + 1) : 1,
      thumbnail_mode: 'upload',
      thumbnail_url: '',
      image: null,
      previewUrl: '',
      existingImageUrl: latest?.thumbnail_episode || '',
      deskripsi_episode: latest?.deskripsi_episode || '',
      durasi_episode: Number(latest?.durasi_episode) || 0,
      intro_start_seconds: latest?.intro_start_seconds ?? 0,
      intro_duration_seconds: latest?.intro_duration_seconds ?? 90,
      outro_start_seconds: latest?.outro_start_seconds ?? 0,
      outro_duration_seconds: latest?.outro_duration_seconds ?? 90,
      tanggal_rilis_episode: '',
      qualities: defaultQualities,
    }));
  }, [tabEpisode?.animeId, items, defaultQualities]);
  // Sinkronkan tampilan input pencarian dengan pilihan animeId
  useEffect(() => {
    if (!tabEpisode?.animeId) return;
    const it = items.find((a) => a.id === tabEpisode.animeId);
    if (it && animeFilter !== it.nama_anime) {
      setAnimeFilter(it.nama_anime);
    }
  }, [tabEpisode?.animeId, items]);

  // Debounced live search for anime suggestions
  useEffect(() => {
    const q = (animeFilter || '').trim();
    if (q.length < 2) { setAnimeSuggestions([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        setAnimeSearchLoading(true);
        const token = getSession()?.token;
        const { items: sugg } = await searchAnime({ token, q, limit: 10, includeEpisodes: false });
        if (!alive) return;
        setAnimeSuggestions(Array.isArray(sugg) ? sugg : []);
      } catch (_) {
        if (!alive) return;
        setAnimeSuggestions([]);
      } finally {
        if (alive) setAnimeSearchLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [animeFilter]);

  // ===== Anime Relations (Admin) =====
  const RELATION_OPTIONS = useMemo(() => (['SEQUEL','PREQUEL','SIDE_STORY','SPINOFF','REMAKE','COMPILATION','DUB','ALT_CUT','SAME_FRANCHISE','OTHER']), []);
  const [relations, setRelations] = useState([]);
  const [relPage, setRelPage] = useState(1);
  const [relLimit, setRelLimit] = useState(20);
  const [relTotal, setRelTotal] = useState(0);
  const [relLoading, setRelLoading] = useState(false);
  const [relGroup, setRelGroup] = useState(false);
  const [relGroups, setRelGroups] = useState(undefined);
  const [relForm, setRelForm] = useState({ source_anime_id: '', related_anime_id: '', relation: 'SEQUEL', priority: 1 });
  const [relSourceQuery, setRelSourceQuery] = useState('');
  const [relRelatedQuery, setRelRelatedQuery] = useState('');
  const [relSourceSug, setRelSourceSug] = useState([]);
  const [relRelatedSug, setRelRelatedSug] = useState([]);
  const [relSrcLoading, setRelSrcLoading] = useState(false);
  const [relRelLoading, setRelRelLoading] = useState(false);
  const [editingRelation, setEditingRelation] = useState(null); // { id, relation, priority }
  const [submittingRelation, setSubmittingRelation] = useState(false);
  const [confirmRelOpen, setConfirmRelOpen] = useState(false);
  const [confirmRelTarget, setConfirmRelTarget] = useState(null); // { id }
  const relTopRef = useRef(null);
  const relConfirmRef = useRef(null);
  const episodeVideoRef = useRef(null);

  const getEpisodeVideoSrc = (ep) => {
    if (!ep) return '';
    const qualities = Array.isArray(ep.qualities) ? ep.qualities : [];
    const candidate = qualities.find((q) => q?.source_quality);
    return candidate?.source_quality || '';
  };

  const getEpisodeThumbnailPreview = (episodeForm) => {
    if (!episodeForm) return '';
    if (episodeForm.previewUrl) return episodeForm.previewUrl;
    if ((episodeForm?.thumbnail_mode || 'upload') === 'url') return String(episodeForm?.thumbnail_url || '').trim();
    return String(episodeForm?.existingImageUrl || '').trim();
  };

  const getEpisodeThumbnailStatus = (episodeForm) => {
    if (!episodeForm) return 'Belum ada thumbnail';
    if (episodeForm.previewUrl) return 'Preview file baru';
    if ((episodeForm?.thumbnail_mode || 'upload') === 'url' && String(episodeForm?.thumbnail_url || '').trim()) return 'Menggunakan URL thumbnail';
    if (String(episodeForm?.existingImageUrl || '').trim()) return 'Menggunakan thumbnail episode sebelumnya';
    return 'Belum ada thumbnail';
  };

  const loadRelations = async (opts = {}) => {
    setRelLoading(true);
    try {
      const token = getSession()?.token;
      const params = { page: relPage, limit: relLimit, group: relGroup, ...opts };
      const data = await listAnimeRelations({ token, ...params });
      setRelations(Array.isArray(data.items) ? data.items : []);
      setRelPage(data.page || 1);
      setRelLimit(data.limit || 20);
      setRelTotal(data.total || 0);
      setRelGroups(data.groups);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat relations');
    } finally {
      setRelLoading(false);
    }
  };

  useEffect(() => {
    if (!user || activeTab !== 'related') return;
    loadRelations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relPage, relLimit, relGroup, user, activeTab]);

  // Debounce search for Source
  useEffect(() => {
    const q = (relSourceQuery || '').trim();
    if (!q || q.length < 2) { setRelSourceSug([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        setRelSrcLoading(true);
        const token = getSession()?.token;
        const { items: sugg } = await searchAnime({ token, q, limit: 8, includeEpisodes: false });
        if (!alive) return;
        setRelSourceSug(Array.isArray(sugg) ? sugg : []);
      } catch (_) {
        if (!alive) return;
        setRelSourceSug([]);
      } finally {
        if (alive) setRelSrcLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [relSourceQuery]);

  // Debounce search for Related
  useEffect(() => {
    const q = (relRelatedQuery || '').trim();
    if (!q || q.length < 2) { setRelRelatedSug([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        setRelRelLoading(true);
        const token = getSession()?.token;
        const { items: sugg } = await searchAnime({ token, q, limit: 8, includeEpisodes: false });
        if (!alive) return;
        setRelRelatedSug(Array.isArray(sugg) ? sugg : []);
      } catch (_) {
        if (!alive) return;
        setRelRelatedSug([]);
      } finally {
        if (alive) setRelRelLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [relRelatedQuery]);

  const onCreateRelation = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!relForm.source_anime_id || !relForm.related_anime_id || !relForm.relation) {
      toast.error('Lengkapi form relation');
      return;
    }
    try {
      setSubmittingRelation(true);
      const payload = {
        source_anime_id: Number(relForm.source_anime_id),
        related_anime_id: Number(relForm.related_anime_id),
        relation: relForm.relation,
        priority: Number(relForm.priority) || 1,
      };
      const res = await createAnimeRelation({ token, payload });
      toast.success(res?.message || 'Relation dibuat');
      setRelForm({ source_anime_id: '', related_anime_id: '', relation: 'SEQUEL', priority: 1 });
      setRelSourceQuery('');
      setRelRelatedQuery('');
      await loadRelations({ page: 1 });
      setRelPage(1);
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat relation');
    } finally {
      setSubmittingRelation(false);
    }
  };

  const onStartEditRelation = (it) => {
    setEditingRelation({ id: it.id, relation: it.relation || 'SEQUEL', priority: it.priority ?? 1 });
    toast.success('Edit relation dibuka');
    setTimeout(() => {
      try { relTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
    }, 0);
  };
  const onCancelEditRelation = () => setEditingRelation(null);
  const onSubmitEditRelation = async (e) => {
    e.preventDefault();
    if (!editingRelation) return;
    const token = getSession()?.token;
    try {
      setSubmittingRelation(true);
      const payload = { relation: editingRelation.relation, priority: Number(editingRelation.priority) || 1 };
      const res = await updateAnimeRelation({ token, id: editingRelation.id, payload });
      toast.success(res?.message || 'Relation diperbarui');
      setEditingRelation(null);
      await loadRelations();
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan relation');
    } finally {
      setSubmittingRelation(false);
    }
  };
  const onRequestDeleteRelation = (it) => {
    setConfirmRelTarget(it);
    setConfirmRelOpen(true);
    toast('Konfirmasi hapus dibuka');
    setTimeout(() => {
      try { relConfirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
    }, 0);
  };
  const onCancelDeleteRelation = () => { setConfirmRelOpen(false); setConfirmRelTarget(null); };
  const onConfirmDeleteRelation = async () => {
    if (!confirmRelTarget) return;
    const token = getSession()?.token;
    try {
      setSubmittingRelation(true);
      const res = await deleteAnimeRelation({ token, id: confirmRelTarget.id });
      toast.success(res?.message || 'Relation dihapus');
      await loadRelations();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus relation');
    } finally {
      setSubmittingRelation(false);
      setConfirmRelOpen(false);
      setConfirmRelTarget(null);
    }
  };
  const onSubmitCreateEpisodeFromTab = async () => {
    if (!tabEpisode?.animeId) {
      toast.error('Pilih anime terlebih dahulu');
      return;
    }
    const tabThumbMode = (tabEpisode?.thumbnail_mode || 'upload').toString();
    const tabThumbUrl = (tabEpisode?.thumbnail_url || '').trim();
    const tabExistingThumb = (tabEpisode?.existingImageUrl || '').trim();
    if (tabThumbMode === 'upload') {
      if (!(tabEpisode?.image instanceof File) && !tabExistingThumb) {
        toast.error('Thumbnail episode wajib diupload');
        return;
      }
    } else {
      if (!tabThumbUrl) {
        toast.error('Thumbnail episode URL wajib diisi');
        return;
      }
    }
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    const payload = {
      judul_episode: tabEpisode.judul_episode,
      nomor_episode: Number(tabEpisode.nomor_episode),
      ...(tabThumbMode === 'upload' && tabEpisode.image instanceof File ? { image: tabEpisode.image } : {}),
      ...((tabThumbMode !== 'upload' && tabThumbUrl) ? { thumbnail_episode: tabThumbUrl } : {}),
      ...((tabThumbMode === 'upload' && !(tabEpisode.image instanceof File) && tabExistingThumb) ? { thumbnail_episode: tabExistingThumb } : {}),
      deskripsi_episode: tabEpisode.deskripsi_episode || null,
      durasi_episode: Number(tabEpisode.durasi_episode) || 0,
      intro_start_seconds: Number(tabEpisode.intro_start_seconds) || 0,
      intro_duration_seconds: Number(tabEpisode.intro_duration_seconds) || 90,
      outro_start_seconds: tabEpisode.outro_start_seconds === '' || tabEpisode.outro_start_seconds === null || tabEpisode.outro_start_seconds === undefined ? null : Number(tabEpisode.outro_start_seconds) || 0,
      outro_duration_seconds: Number(tabEpisode.outro_duration_seconds) || 90,
      tanggal_rilis_episode: tabEpisode.tanggal_rilis_episode ? new Date(tabEpisode.tanggal_rilis_episode).toISOString() : undefined,
    };
    if (Array.isArray(tabEpisode.qualities)) {
      payload.qualities = tabEpisode.qualities
        .filter((q) => (q.nama_quality || '').trim() && (q.source_quality || '').trim())
        .map((q) => ({ nama_quality: q.nama_quality, source_quality: q.source_quality }));
    }
    try {
      setSubmittingTabEpisode(true);
      const res = await createEpisode({ token, animeId: tabEpisode.animeId, payload });
      toast.success(res?.message || 'Episode dibuat');
      // reload episodes for selected anime (expand if not already)
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(tabEpisode.animeId);
        return next;
      });
      await loadEpisodes(tabEpisode.animeId, 1, true);
      // reset form values (keep anime selection) and set default qualities again
      setTabEpisode((s) => ({
        ...s,
        judul_episode: '',
        nomor_episode: 1,
        thumbnail_mode: 'upload',
        thumbnail_url: '',
        image: null,
        previewUrl: '',
        existingImageUrl: '',
        deskripsi_episode: '',
        durasi_episode: 0,
        intro_start_seconds: 0,
        intro_duration_seconds: 90,
        outro_start_seconds: '',
        outro_duration_seconds: 90,
        tanggal_rilis_episode: '',
        qualities: defaultQualities,
      }));
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat episode');
    } finally {
      setSubmittingTabEpisode(false);
    }
  };

  // (HAPUS) Handler Bulk dihapus

  const loadEpisodes = async (animeId, pageEp = 1, reset = false) => {
    try {
      const token = getSession()?.token;
      const data = await listEpisodes({ token, animeId, page: pageEp, limit: 201 });
      setItems((prev) => prev.map((a) => {
        if (a.id !== animeId) return a;
        const existing = Array.isArray(a.episodes) ? a.episodes : [];
        const existingById = new Map(existing.filter(Boolean).map((ep) => [ep.id, ep]));
        const incoming = Array.isArray(data.items) ? data.items : [];
        const mergedIncoming = incoming.map((ep) => {
          const previous = existingById.get(ep?.id);
          const hasIncomingQualities = Array.isArray(ep?.qualities) && ep.qualities.length > 0;
          const hasPreviousQualities = Array.isArray(previous?.qualities) && previous.qualities.length > 0;
          if (!previous) return ep;
          return {
            ...previous,
            ...ep,
            qualities: hasIncomingQualities ? ep.qualities : (hasPreviousQualities ? previous.qualities : ep?.qualities),
          };
        });
        const nextEpisodes = reset ? mergedIncoming : [...existing, ...mergedIncoming];
        // de-duplicate by id
        const seen = new Set();
        const dedup = [];
        for (const ep of nextEpisodes) {
          if (ep && !seen.has(ep.id)) { seen.add(ep.id); dedup.push(ep); }
        }
        const pagination = data?.page ? { page: data.page, limit: data.limit, total: data.total } : (data?.pagination || {});
        return {
          ...a,
          episodes: dedup,
          episodes_page: pagination.page || pageEp || 1,
          episodes_limit: pagination.limit || 201,
          episodes_total: pagination.total || (dedup?.length || 0),
          episodes_loading: false,
        };
      }));
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat episodes');
    }
  };

  const maybeLoadMoreEpisodes = (animeId) => {
    setItems((prev) => {
      const a = prev.find((x) => x.id === animeId);
      if (!a) return prev;
      const page = a.episodes_page || 1;
      const limitEp = a.episodes_limit || 201;
      const total = a.episodes_total || 0;
      const currentCount = Array.isArray(a.episodes) ? a.episodes.length : 0;
      const hasMore = currentCount < total;
      if (!hasMore || a.episodes_loading) return prev;
      const mapped = prev.map((x) => x.id === animeId ? { ...x, episodes_loading: true } : x);
      // trigger async load next page
      const nextPage = page + 1;
      Promise.resolve().then(() => loadEpisodes(animeId, nextPage, false));
      return mapped;
    });
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      const expanding = !next.has(id);
      if (expanding) {
        next.add(id);
        // lazy load episodes from API to ensure terbaru
        loadEpisodes(id, 1, true);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // Episode edit/delete mockup states & handlers
  const [editingEpisode, setEditingEpisode] = useState(null); // { animeId, id, judul_episode, ... }
  const [submittingEditEpisode, setSubmittingEditEpisode] = useState(false);
  const onEditEpisode = (animeId, ep) => {
    setEditingEpisode({
      animeId,
      id: ep.id,
      judul_episode: ep.judul_episode || '',
      nomor_episode: ep.nomor_episode || 0,
      thumbnail_mode: 'upload',
      thumbnail_url: '',
      image: null,
      previewUrl: '',
      existingImageUrl: ep.thumbnail_episode || '',
      deskripsi_episode: ep.deskripsi_episode || '',
      durasi_episode: ep.durasi_episode || 0,
      intro_start_seconds: ep.intro_start_seconds ?? 0,
      intro_duration_seconds: ep.intro_duration_seconds ?? 90,
      outro_start_seconds: ep.outro_start_seconds ?? 0,
      outro_duration_seconds: ep.outro_duration_seconds ?? 90,
      tanggal_rilis_episode: ep.tanggal_rilis_episode ? new Date(ep.tanggal_rilis_episode).toISOString().slice(0, 16) : '', // yyyy-mm-ddThh:mm
      qualities: Array.isArray(ep.qualities)
        ? ep.qualities.map((q) => ({ id: q.id, nama_quality: q.nama_quality || '', source_quality: q.source_quality || '' }))
        : [],
    });
  };
  const onCancelEditEpisode = () => setEditingEpisode(null);
  const onSubmitEpisode = async (e) => {
    e.preventDefault();
    if (!editingEpisode) return;
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    const editThumbMode = (editingEpisode?.thumbnail_mode || 'upload').toString();
    const editThumbUrl = (editingEpisode?.thumbnail_url || '').trim();
    if (editThumbMode === 'upload') {
      // optional saat edit; kalau user tidak pilih file maka pakai existing
    } else {
      if (!editThumbUrl) return toast.error('Thumbnail episode URL wajib diisi');
    }

    const payload = {
      judul_episode: editingEpisode.judul_episode,
      nomor_episode: editingEpisode.nomor_episode,
      ...(editThumbMode === 'upload' && editingEpisode.image instanceof File ? { image: editingEpisode.image } : {}),
      ...(editThumbMode !== 'upload' && editThumbUrl ? { thumbnail_episode: editThumbUrl } : {}),
      deskripsi_episode: editingEpisode.deskripsi_episode === '' ? null : editingEpisode.deskripsi_episode,
      durasi_episode: Number(editingEpisode.durasi_episode) || 0,
      intro_start_seconds: Number(editingEpisode.intro_start_seconds) || 0,
      intro_duration_seconds: Number(editingEpisode.intro_duration_seconds) || 90,
      outro_start_seconds: editingEpisode.outro_start_seconds === '' || editingEpisode.outro_start_seconds === null || editingEpisode.outro_start_seconds === undefined ? null : Number(editingEpisode.outro_start_seconds) || 0,
      outro_duration_seconds: Number(editingEpisode.outro_duration_seconds) || 90,
      tanggal_rilis_episode: editingEpisode.tanggal_rilis_episode ? new Date(editingEpisode.tanggal_rilis_episode).toISOString() : undefined,
    };
    if (Array.isArray(editingEpisode.qualities)) {
      payload.qualities = editingEpisode.qualities
        .filter((q) => (q.nama_quality || '').trim() && (q.source_quality || '').trim())
        .map((q) => ({ nama_quality: q.nama_quality, source_quality: q.source_quality }));
    }
    try {
      setSubmittingEditEpisode(true);
      const res = await updateEpisode({ token, id: editingEpisode.id, payload });
      toast.success(res?.message || 'Episode diperbarui');
      const animeId = editingEpisode.animeId;
      setEditingEpisode(null);
      await loadEpisodes(animeId, 1, true);
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan episode');
    } finally {
      setSubmittingEditEpisode(false);
    }
  };
  const updateQualityField = (index, key, value) => {
    setEditingEpisode((s) => {
      if (!s) return s;
      const arr = Array.isArray(s.qualities) ? [...s.qualities] : [];
      arr[index] = { ...arr[index], [key]: value };
      return { ...s, qualities: arr };
    });
  };
  const addQuality = () => {
    setEditingEpisode((s) => ({
      ...s,
      qualities: [...(s?.qualities || []), { id: undefined, nama_quality: '', source_quality: '' }],
    }));
  };
  const removeQuality = (index) => {
    setEditingEpisode((s) => {
      if (!s) return s;
      const arr = [...(s.qualities || [])];
      arr.splice(index, 1);
      return { ...s, qualities: arr };
    });
  };
  const [confirmEpOpen, setConfirmEpOpen] = useState(false);
  const [confirmEpTarget, setConfirmEpTarget] = useState(null); // {id, judul_episode}
  const [deletingEpisode, setDeletingEpisode] = useState(false);
  const onRequestDeleteEpisode = (ep) => { setConfirmEpTarget(ep); setConfirmEpOpen(true); };
  const onCancelDeleteEpisode = () => { setConfirmEpOpen(false); setConfirmEpTarget(null); };
  const onConfirmDeleteEpisode = async () => {
    if (!confirmEpTarget) return;
    const token = getSession()?.token;
    try {
      setDeletingEpisode(true);
      const res = await deleteEpisode({ token, id: confirmEpTarget.id });
      toast.success(res?.message || 'Episode dihapus');
      // find anime id to reload
      const parent = items.find((a) => Array.isArray(a.episodes) && a.episodes.some((e) => e.id === confirmEpTarget.id));
      const animeId = parent?.id || editingEpisode?.animeId;
      if (animeId) await loadEpisodes(animeId, 1, true);
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus episode');
    } finally {
      setConfirmEpOpen(false);
      setConfirmEpTarget(null);
      setDeletingEpisode(false);
    }
  };

  // Create Episode state & handlers
  const [creatingForAnime, setCreatingForAnime] = useState(null); // animeId or null
  const [newEpisode, setNewEpisode] = useState(null);
  const [submittingNewEpisode, setSubmittingNewEpisode] = useState(false);
  const startCreateEpisode = (animeId) => {
    setCreatingForAnime(animeId);
    // Cari episode terbaru untuk menentukan nomor berikutnya
    const parent = items.find((a) => a.id === animeId);
    const nextNumber = Array.isArray(parent?.episodes) && parent.episodes.length
      ? (Math.max(...parent.episodes.map((e) => Number(e.nomor_episode) || 0)) + 1)
      : 1;
    const latest = Array.isArray(parent?.episodes) && parent.episodes.length
      ? parent.episodes.reduce((acc, e) => ((Number(e.nomor_episode) || 0) > (Number(acc.nomor_episode) || 0) ? e : acc), parent.episodes[0])
      : null;
    setNewEpisode({
      judul_episode: '',
      nomor_episode: nextNumber,
      thumbnail_mode: 'upload',
      thumbnail_url: '',
      image: null,
      previewUrl: '',
      existingImageUrl: latest?.thumbnail_episode || '',
      deskripsi_episode: latest?.deskripsi_episode || '',
      durasi_episode: Number(latest?.durasi_episode) || 0,
      intro_start_seconds: latest?.intro_start_seconds ?? 0,
      intro_duration_seconds: latest?.intro_duration_seconds ?? 90,
      outro_start_seconds: latest?.outro_start_seconds ?? null,
      outro_duration_seconds: latest?.outro_duration_seconds ?? 90,
      tanggal_rilis_episode: '', // yyyy-mm-ddThh:mm
      qualities: defaultQualities,
    });
  };
  const cancelCreateEpisode = () => { setCreatingForAnime(null); setNewEpisode(null); };
  const updateNewQualityField = (index, key, value) => {
    setNewEpisode((s) => {
      if (!s) return s;
      const arr = Array.isArray(s.qualities) ? [...s.qualities] : [];
      arr[index] = { ...arr[index], [key]: value };
      return { ...s, qualities: arr };
    });
  };
  const addNewQuality = () => setNewEpisode((s) => ({ ...s, qualities: [...(s?.qualities || []), { nama_quality: '', source_quality: '' }] }));
  const removeNewQuality = (i) => setNewEpisode((s) => ({ ...s, qualities: (s.qualities || []).filter((_, idx) => idx !== i) }));
  const moveNewQuality = (index, direction) => {
    setNewEpisode((s) => {
      if (!s) return s;
      const arr = Array.isArray(s.qualities) ? s.qualities : [];
      const next = moveArrayItem(arr, index, index + direction);
      return { ...s, qualities: next };
    });
  };
  
  const onSubmitCreateEpisode = async (e) => {
    e.preventDefault();
    if (!creatingForAnime || !newEpisode) return;
    const epThumbMode = (newEpisode?.thumbnail_mode || 'upload').toString();
    const epThumbUrl = (newEpisode?.thumbnail_url || '').trim();
    const epExistingThumb = (newEpisode?.existingImageUrl || '').trim();
    if (epThumbMode === 'upload') {
      if (!(newEpisode?.image instanceof File) && !epExistingThumb) {
        toast.error('Thumbnail episode wajib diupload');
        return;
      }
    } else {
      if (!epThumbUrl) {
        toast.error('Thumbnail episode URL wajib diisi');
        return;
      }
    }
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    const payload = {
      judul_episode: newEpisode.judul_episode,
      nomor_episode: Number(newEpisode.nomor_episode),
      ...(epThumbMode === 'upload' && newEpisode.image instanceof File ? { image: newEpisode.image } : {}),
      ...((epThumbMode !== 'upload' && epThumbUrl) ? { thumbnail_episode: epThumbUrl } : {}),
      ...((epThumbMode === 'upload' && !(newEpisode.image instanceof File) && epExistingThumb) ? { thumbnail_episode: epExistingThumb } : {}),
      deskripsi_episode: newEpisode.deskripsi_episode || null,
      durasi_episode: Number(newEpisode.durasi_episode) || 0,
      intro_start_seconds: Number(newEpisode.intro_start_seconds) || 0,
      intro_duration_seconds: Number(newEpisode.intro_duration_seconds) || 90,
      outro_start_seconds: newEpisode.outro_start_seconds === '' || newEpisode.outro_start_seconds === null || newEpisode.outro_start_seconds === undefined ? null : Number(newEpisode.outro_start_seconds) || 0,
      outro_duration_seconds: Number(newEpisode.outro_duration_seconds) || 90,
      tanggal_rilis_episode: newEpisode.tanggal_rilis_episode ? new Date(newEpisode.tanggal_rilis_episode).toISOString() : undefined,
    };
    if (Array.isArray(newEpisode.qualities)) {
      payload.qualities = newEpisode.qualities
        .filter((q) => (q.nama_quality || '').trim() && (q.source_quality || '').trim())
        .map((q) => ({ nama_quality: q.nama_quality, source_quality: q.source_quality }));
    }
    try {
      setSubmittingNewEpisode(true);
      const res = await createEpisode({ token, animeId: creatingForAnime, payload });
      toast.success(res?.message || 'Episode dibuat');
      await loadEpisodes(creatingForAnime, 1, true);
      cancelCreateEpisode();
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat episode');
    } finally {
      setSubmittingNewEpisode(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, user]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadList({ page: 1 });
  };

  const parseMaybeArray = (val) => {
    if (!val) return undefined;
    // allow comma separated -> array, if already has comma; otherwise if space-only text, return string
    if (typeof val === 'string') {
      const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
      return parts.length > 1 ? parts : parts[0];
    }
    return val;
  };

  const normalizeStatus = (s) => {
    const t = (s || '').toString().trim().toLowerCase();
    if (t === 'ongoing') return 'Ongoing';
    if (t === 'completed' || t === 'complete') return 'Completed';
    if (t === 'hiatus') return 'Hiatus';
    if (t === 'upcoming') return 'Upcoming';
    // fallback: Title Case first letter
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
  };

  const buildPayload = () => {
    const normalizedStatus = normalizeStatus(form.status_anime);
    const payload = {
      nama_anime: form.nama_anime,
      image: form.image || undefined,
      rating_anime: form.rating_anime,
      status_anime: normalizedStatus,
      sinopsis_anime: form.sinopsis_anime,
      label_anime: form.label_anime,
    };
    const optional = {
      content_type: (form.content_type || '').trim() || undefined,
      is_21_plus: form.is_21_plus !== undefined ? !!form.is_21_plus : undefined,
      tags_anime: parseMaybeArray(form.tags_anime),
      genre_anime: parseMaybeArray(form.genre_anime),
      studio_anime: parseMaybeArray(form.studio_anime),
      fakta_menarik: parseMaybeArray(form.fakta_menarik),
      tanggal_rilis_anime: form.tanggal_rilis_anime || undefined,
      aliases: parseAliases(form.aliases),
    };
    // Apply default alias priority if provided
    const toInt = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : undefined;
    };
    const defaultAliasPriority = form.alias_priority !== '' ? toInt(form.alias_priority) : undefined;
    if (Array.isArray(optional.aliases)) {
      optional.aliases = optional.aliases.map((a) => {
        if (typeof a === 'string') {
          if (defaultAliasPriority !== undefined) return { alias: a, priority: defaultAliasPriority };
          return a;
        }
        if (a && typeof a === 'object') {
          const coerced = { ...a };
          if (coerced.priority !== undefined && coerced.priority !== null) {
            const pi = toInt(coerced.priority);
            coerced.priority = pi !== undefined ? pi : coerced.priority;
          } else if (defaultAliasPriority !== undefined) {
            coerced.priority = defaultAliasPriority;
          }
          return coerced;
        }
        return a;
      });
    }
    Object.keys(optional).forEach((k) => optional[k] === undefined || optional[k] === '' ? delete optional[k] : null);

    const isOngoing = (normalizedStatus || '').toString().trim().toLowerCase() === 'ongoing';
    if (isOngoing) {
      const hari = (form.schedule_hari || '').trim();
      const jam = (form.schedule_jam || '').trim();
      payload.schedule = {
        hari,
        jam,
        is_active: form.schedule_is_active !== undefined ? !!form.schedule_is_active : true,
      };
    }

    return { ...payload, ...optional };
  };

  const [submittingAnime, setSubmittingAnime] = useState(false);
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama_anime || !form.rating_anime || !form.status_anime || !form.sinopsis_anime || !form.label_anime) {
      return toast.error('Field wajib belum lengkap');
    }
    const coverMode = (form.cover_mode || 'upload').toString();
    const coverUrl = (form.cover_url || '').trim();
    if (mode === 'add') {
      if (coverMode === 'upload') {
        if (!(form.image instanceof File) && !form.existingImageUrl) return toast.error('Cover anime wajib diupload');
      } else {
        if (!coverUrl) return toast.error('Cover anime URL wajib diisi');
      }
    }
    if (normalizeStatus(form.status_anime).toLowerCase() === 'ongoing') {
      const hari = (form.schedule_hari || '').trim();
      const jam = (form.schedule_jam || '').trim();
      if (!hari || !jam) {
        return toast.error('Untuk status ongoing, jadwal hari & jam wajib diisi');
      }
    }
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');
    try {
      setSubmittingAnime(true);
      const payload = buildPayload();
      if (coverMode !== 'upload' && coverUrl) payload.gambar_anime = coverUrl;
      if (mode === 'edit' && !payload.gambar_anime) {
        payload.gambar_anime = (form.existingImageUrl || '').trim() || undefined;
      }
      if (mode === 'add') {
        const res = await createAnime({ token, payload });
        toast.success(res?.message || 'Anime dibuat');
        resetForm();
        setPage(1);
        await loadList({ page: 1 });
      } else {
        const res = await updateAnime({ token, id: form.id, payload });
        toast.success(res?.message || 'Anime diperbarui');
        setMode('add');
        resetForm();
        await loadList();
      }
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan anime');
    } finally {
      setSubmittingAnime(false);
    }
  };

  const onEdit = (it) => {
    setMode('edit');
    setAliasSearch('');
    setAliasLookup([]);
    setNewAliasInput('');
    setForm({
      id: it.id,
      nama_anime: it.nama_anime || '',
      cover_mode: 'upload',
      cover_url: '',
      image: null,
      previewUrl: '',
      existingImageUrl: it.gambar_anime || '',
      rating_anime: it.rating_anime || '',
      content_type: it.content_type || it.type || 'ANIME',
      is_21_plus: it.is_21_plus !== undefined ? !!it.is_21_plus : false,
      status_anime: normalizeStatus(it.status_anime || ''),
      sinopsis_anime: it.sinopsis_anime || '',
      label_anime: it.label_anime || '',
      tags_anime: Array.isArray(it.tags_anime) ? it.tags_anime.join(', ') : (it.tags_anime || ''),
      genre_anime: Array.isArray(it.genre_anime) ? it.genre_anime.join(', ') : (it.genre_anime || ''),
      studio_anime: Array.isArray(it.studio_anime) ? it.studio_anime.join(', ') : (it.studio_anime || ''),
      fakta_menarik: Array.isArray(it.fakta_menarik) ? it.fakta_menarik.join(', ') : (it.fakta_menarik || ''),
      tanggal_rilis_anime: it.tanggal_rilis_anime ? new Date(it.tanggal_rilis_anime).toISOString().slice(0, 10) : '', // yyyy-mm-dd
      aliases: Array.isArray(it.aliases)
        ? it.aliases.map((a) => (typeof a === 'string' ? a : (a?.alias || ''))).filter(Boolean).join('\n')
        : '',
      alias_priority: (() => {
        const prs = Array.isArray(it.aliases)
          ? it.aliases
              .map((a) => (a && typeof a === 'object' && typeof a.priority === 'number' ? a.priority : undefined))
              .filter((n) => typeof n === 'number')
          : [];
        if (!prs.length) return '';
        return String(Math.min(...prs));
      })(),
      schedule_hari: '',
      schedule_jam: '',
      schedule_is_active: true,
    });
    // Fetch latest aliases from API detail to ensure up-to-date
    (async () => {
      try {
        const token = getSession()?.token;
        if (!token) return;
        const detail = await getAnimeDetail({ token, id: it.id });
        const al = Array.isArray(detail?.item?.aliases) ? detail.item.aliases : detail?.aliases;
        if (al) {
          const aliasesStr = Array.isArray(al)
            ? al
                .map((a) => {
                  if (typeof a === 'string') return a;
                  if (a && typeof a === 'object') {
                    const obj = { alias: a.alias || '', ...(a.language ? { language: a.language } : {}), ...(a.type ? { type: a.type } : {}), ...(typeof a.priority === 'number' ? { priority: a.priority } : {}) };
                    // If has any metadata, render as JSON; else just alias string
                    if (obj.language || obj.type || Object.prototype.hasOwnProperty.call(obj, 'priority')) return JSON.stringify(obj);
                    return obj.alias;
                  }
                  return '';
                })
                .filter(Boolean)
                .join('\n')
            : '';
          setForm((f) => ({ ...f, aliases: aliasesStr, alias_priority: f.alias_priority || (() => {
            const prs = Array.isArray(al)
              ? al
                  .map((a) => (a && typeof a === 'object' && typeof a.priority === 'number' ? a.priority : undefined))
                  .filter((n) => typeof n === 'number')
              : [];
            if (!prs.length) return '';
            return String(Math.min(...prs));
          })() }));
        }

        const schedules = Array.isArray(detail?.item?.schedules) ? detail.item.schedules : detail?.schedules;
        if (Array.isArray(schedules) && schedules.length) {
          const active = schedules.find((s) => s && s.is_active) || schedules[0];
          if (active) {
            setForm((f) => ({
              ...f,
              schedule_hari: active.hari || f.schedule_hari || '',
              schedule_jam: active.jam || f.schedule_jam || '',
              schedule_is_active: active.is_active !== undefined ? !!active.is_active : f.schedule_is_active,
            }));
          }
        }
      } catch (_) {
        // Ignore fetch error for aliases, keep existing prefilled value
      }
    })();
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deletingAnime, setDeletingAnime] = useState(false);
  const onRequestDelete = (target) => { setConfirmTarget(target); setConfirmOpen(true); };
  const onCancelDelete = () => { setConfirmOpen(false); setConfirmTarget(null); };
  const onConfirmDelete = async () => {
    if (!confirmTarget) return;
    const token = getSession()?.token;
    try {
      setDeletingAnime(true);
      const res = await deleteAnime({ token, id: confirmTarget.id });
      toast.success(res?.message || 'Anime dihapus');
      if (mode === 'edit' && form.id === confirmTarget.id) { setMode('add'); resetForm(); }
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus anime');
    } finally {
      setConfirmOpen(false);
      setConfirmTarget(null);
      setDeletingAnime(false);
    }
  };

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="rounded-[28px] border-4 p-5 md:p-6" style={{ boxShadow: '10px 10px 0 #000', background: 'linear-gradient(135deg, var(--panel-bg) 0%, #dbeafe 100%)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-1 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: '#e0f2fe', color: '#1d4ed8' }}>Admin Workspace</div>
                <h2 className="mt-4 text-2xl md:text-3xl font-black flex items-center gap-3"><List className="size-7" /> Daftar Konten</h2>
                <p className="mt-2 max-w-3xl text-sm md:text-base font-semibold opacity-80">Kelola anime, episode, dan request dari halaman kerja utama yang lebih nyaman dipakai admin setiap hari.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-[22px] border-4 p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'rgba(255,255,255,0.6)', borderColor: 'var(--panel-border)' }}>
                <div className="rounded-[18px] border-4 px-3 py-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                  <div className="text-[11px] font-black uppercase opacity-70">Anime</div>
                  <div className="mt-1 text-xl font-black">{total}</div>
                </div>
                <div className="rounded-[18px] border-4 px-3 py-3" style={{ borderColor: 'var(--panel-border)', background: '#fff7cc', color: '#92400e' }}>
                  <div className="text-[11px] font-black uppercase opacity-70">Mode</div>
                  <div className="mt-1 text-sm font-black">{mode === 'add' ? 'Tambah' : `Edit #${form.id}`}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs: Tambah Anime | Tambah Episode | Request Anime */}
          <div className="flex flex-wrap items-center gap-2 rounded-[22px] border-4 p-2" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <button type="button" onClick={() => setActiveTab('anime')} className={`w-full sm:w-auto px-4 py-3 border-4 rounded-2xl font-extrabold`} style={{ boxShadow: '4px 4px 0 #000', background: activeTab === 'anime' ? '#dbeafe' : 'var(--background)', color: activeTab === 'anime' ? '#1d4ed8' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Tambah Anime</button>
            <button type="button" onClick={() => setActiveTab('episode')} className={`w-full sm:w-auto px-4 py-3 border-4 rounded-2xl font-extrabold`} style={{ boxShadow: '4px 4px 0 #000', background: activeTab === 'episode' ? '#ede9fe' : 'var(--background)', color: activeTab === 'episode' ? '#6d28d9' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Tambah Episode</button>
            <button type="button" onClick={() => setActiveTab('requests')} className={`w-full sm:w-auto px-4 py-3 border-4 rounded-2xl font-extrabold`} style={{ boxShadow: '4px 4px 0 #000', background: activeTab === 'requests' ? '#fef3c7' : 'var(--background)', color: activeTab === 'requests' ? '#92400e' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Request Anime</button>
            {canEpisodeIssueAccess && (
              <button type="button" onClick={() => setActiveTab('episode-issue')} className={`w-full sm:w-auto px-4 py-3 border-4 rounded-2xl font-extrabold`} style={{ boxShadow: '4px 4px 0 #000', background: activeTab === 'episode-issue' ? '#fee2e2' : 'var(--background)', color: activeTab === 'episode-issue' ? '#991b1b' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Masalah Episode</button>
            )}
          </div>

          {/* Search + Filters */}
          {activeTab === 'episode-issue' ? null : (activeTab === 'requests' ? (
            <div className="p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="font-extrabold mb-2">Cari Anime Requests</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {['', ...REQUEST_STATUSES].map((statusKey) => {
                  const meta = REQUEST_STATUS_META[statusKey || 'ALL'];
                  const active = reqStatus === statusKey;
                  return (
                    <button
                      key={statusKey || 'ALL'}
                      type="button"
                      onClick={() => setReqStatus(statusKey)}
                      className="px-3 py-2 border-4 rounded-lg font-extrabold"
                      style={{
                        boxShadow: '4px 4px 0 #000',
                        background: active ? meta.bg : 'var(--panel-bg)',
                        color: active ? meta.fg : 'var(--foreground)',
                        borderColor: 'var(--panel-border)',
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); setReqPage(1); loadAnimeRequests({ page: 1 }); }}
                className="grid gap-3"
              >
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Cari nama anime</div>
                    <input value={reqQ} onChange={(e) => setReqQ(e.target.value)} placeholder="Cari nama_anime" className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">User ID</div>
                    <input value={reqUserId} onChange={(e) => setReqUserId(e.target.value)} placeholder="user_id" className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Admin ID</div>
                    <input value={reqAdminId} onChange={(e) => setReqAdminId(e.target.value)} placeholder="admin_id" className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="submit" disabled={reqLoading} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>{reqLoading ? 'Memuat...' : 'Cari'}</button>
                  <button
                    type="button"
                    onClick={() => { setReqQ(''); setReqStatus(''); setReqUserId(''); setReqAdminId(''); setReqPage(1); loadAnimeRequests({ page: 1, q: '', status: undefined, user_id: undefined, admin_id: undefined }); }}
                    className="px-3 py-2 border-4 rounded-lg font-extrabold"
                    style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <form onSubmit={onSearch} className="grid gap-3 rounded-[24px] border-4 p-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold">Pencarian Konten</div>
                  <div className="mt-1 text-xs font-semibold opacity-70">Cari anime dengan cepat berdasarkan nama, genre, tag, dan status.</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-2 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: '#dbeafe', color: '#1d4ed8' }}>Total tampil: {items.length}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,140px)] gap-3">
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">Pencarian</div>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cari (nama/genre/tag)"
                    className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold"
                    style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  />
                </div>
                <button type="submit" disabled={loadingList} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
                  {loadingList ? 'Memuat...' : 'Cari'}
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">Status</div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold"
                    style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  >
                    <option value="">Semua Status</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="HIATUS">Hiatus</option>
                    <option value="UPCOMING">Upcoming</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">Genre</div>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Filter genre (exact, contoh: Action)"
                    className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold"
                    style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  />
                </div>
              </div>
            </form>
          ))}

          {activeTab === 'episode-issue' && canEpisodeIssueAccess && (
            <div className="space-y-4">
              <div className="p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIssueSubTab('reasons')}
                    className="px-3 py-2 border-4 rounded-lg font-extrabold"
                    style={{ boxShadow: '4px 4px 0 #000', background: issueSubTab === 'reasons' ? 'var(--accent-edit)' : 'var(--panel-bg)', color: issueSubTab === 'reasons' ? 'var(--accent-edit-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                  >
                    <span className="inline-flex items-center gap-2"><ListChecks className="size-4" /> Konfigurasi Alasan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIssueSubTab('reports')}
                    className="px-3 py-2 border-4 rounded-lg font-extrabold"
                    style={{ boxShadow: '4px 4px 0 #000', background: issueSubTab === 'reports' ? 'var(--accent-edit)' : 'var(--panel-bg)', color: issueSubTab === 'reports' ? 'var(--accent-edit-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                  >
                    <span className="inline-flex items-center gap-2"><BadgeCheck className="size-4" /> Laporan Episode</span>
                  </button>
                </div>
              </div>

              {issueSubTab === 'reasons' && (
                <>
                  <div className="p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input type="checkbox" checked={issueIncludeInactive} onChange={(e) => setIssueIncludeInactive(e.target.checked)} />
                        <span>Include inactive</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => loadIssueReasons()}
                        disabled={issueReasonsLoading}
                        className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
                        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}
                      >
                        {issueReasonsLoading ? 'Memuat...' : 'Refresh'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 border-4 rounded-lg space-y-3" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <div className="text-sm font-extrabold">{issueReasonMode === 'add' ? 'Tambah Alasan' : `Edit Alasan #${issueReasonForm.id}`}</div>
                    <form onSubmit={onSubmitIssueReason} className="grid gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          value={issueReasonForm.code}
                          onChange={(e) => setIssueReasonForm((f) => ({ ...f, code: e.target.value }))}
                          disabled={issueReasonMode !== 'add'}
                          placeholder="CODE (unik, contoh: NO_AUDIO)"
                          className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold"
                          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                        />
                        <input
                          value={issueReasonForm.title}
                          onChange={(e) => setIssueReasonForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="Judul alasan"
                          className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold"
                          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                        />
                      </div>
                      <textarea
                        value={issueReasonForm.description}
                        onChange={(e) => setIssueReasonForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Deskripsi (opsional)"
                        rows={2}
                        className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold"
                        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-3 items-center">
                        <input
                          type="number"
                          value={issueReasonForm.sort_order}
                          onChange={(e) => setIssueReasonForm((f) => ({ ...f, sort_order: e.target.value }))}
                          placeholder="sort_order"
                          className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold"
                          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                        />
                        <label className="flex items-center gap-2 text-sm font-semibold">
                          <input type="checkbox" checked={!!issueReasonForm.is_active} onChange={(e) => setIssueReasonForm((f) => ({ ...f, is_active: e.target.checked }))} />
                          <span>Aktif</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={issueReasonSubmitting}
                          className="flex py-2 items-center w-40 justify-center gap-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
                          style={{ boxShadow: '4px 4px 0 #000', background: issueReasonMode === 'add' ? 'var(--accent-add)' : 'var(--accent-edit)', color: issueReasonMode === 'add' ? 'var(--accent-add-foreground)' : 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}
                        >
                          {issueReasonSubmitting ? (issueReasonMode === 'add' ? 'Menambah...' : 'Menyimpan...') : (issueReasonMode === 'add' ? (<><Plus className="size-4" /> Tambah</>) : (<><Pencil className="size-4" /> Simpan</>))}
                        </button>
                        {issueReasonMode === 'edit' && (
                          <button
                            type="button"
                            onClick={resetIssueReasonForm}
                            className="px-3 py-2 border-4 rounded-lg font-extrabold"
                            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                          >
                            Batal Edit
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  <div className="overflow-auto">
                    <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                      <thead style={{ background: 'var(--panel-bg)' }}>
                        <tr>
                          <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
                          <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Code</th>
                          <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Judul</th>
                          <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aktif</th>
                          <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Sort</th>
                          <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...issueReasons].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)).map((it) => (
                          <tr key={it.id}>
                            <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.id}</td>
                            <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.code}</td>
                            <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.title}</td>
                            <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.is_active ? 'Ya' : 'Tidak'}</td>
                            <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.sort_order ?? '-'}</td>
                            <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => onEditIssueReason(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>
                                  <Pencil className="size-4" />
                                </button>
                                <button type="button" onClick={() => onRequestDeleteIssueReason(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {issueReasons.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-sm opacity-70">
                              {issueReasonsLoading ? 'Memuat...' : 'Belum ada alasan.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {issueReasonConfirmOpen && (
                    <div className="fixed inset-0 z-50 grid place-items-center">
                      <div className="absolute inset-0 bg-black/40" onClick={onCancelDeleteIssueReason} />
                      <div className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                        <div className="text-lg font-extrabold mb-1">Hapus Alasan?</div>
                        <div className="text-sm opacity-80 mb-4 break-words">{issueReasonConfirmTarget?.title} ({issueReasonConfirmTarget?.code})</div>
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" disabled={issueReasonDeleting} onClick={onCancelDeleteIssueReason} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Batal</button>
                          <button type="button" disabled={issueReasonDeleting} onClick={onConfirmDeleteIssueReason} className="px-3 py-2 border-4 rounded-lg bg-[#FFD803] hover:brightness-95 font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>{issueReasonDeleting ? 'Menghapus...' : 'Ya, Hapus'}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {issueSubTab === 'reports' && (
                <>
                  <div className="rounded-[24px] border-4 p-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <form onSubmit={onSearchIssueReports} className="grid gap-3">
                      <div>
                        <div className="text-lg font-extrabold">Laporan Masalah Episode</div>
                        <div className="mt-1 text-xs font-semibold opacity-70">Filter laporan berdasarkan status, episode, user, dan alasan supaya tindak lanjut lebih cepat.</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <select value={issueReportStatus} onChange={(e) => setIssueReportStatus(e.target.value)} className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                          <option value="">Semua status</option>
                          <option value="PENDING">PENDING</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="FIXED">FIXED</option>
                        </select>
                        <input value={issueReportEpisodeId} onChange={(e) => setIssueReportEpisodeId(e.target.value)} placeholder="episode_id" className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                        <input value={issueReportUserId} onChange={(e) => setIssueReportUserId(e.target.value)} placeholder="user_id" className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                        <select value={issueReportReasonId} onChange={(e) => setIssueReportReasonId(e.target.value)} className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                          <option value="">Semua alasan</option>
                          {issueReasons.map((r) => (
                            <option key={r.id} value={String(r.id)}>{r.code} - {r.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="submit" disabled={issueReportsLoading} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>{issueReportsLoading ? 'Memuat...' : 'Cari'}</button>
                        <button type="button" onClick={() => { setIssueReportStatus(''); setIssueReportEpisodeId(''); setIssueReportUserId(''); setIssueReportReasonId(''); setIssueEditingReport(null); loadIssueReports({ page: 1 }); }} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Reset</button>
                      </div>
                    </form>
                  </div>

                  {issueEditingReport && (
                    <div className="p-3 border-4 rounded-lg space-y-3" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                      <div className="text-sm font-extrabold">Edit Report #{issueEditingReport.id}</div>
                      <form onSubmit={onSaveEditIssueReport} className="grid gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <select value={String(issueEditingReport.reason_id ?? '')} onChange={(e) => setIssueEditingReport((s) => ({ ...s, reason_id: e.target.value }))} className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                            <option value="">(hapus reason)</option>
                            {issueReasons.map((r) => (
                              <option key={r.id} value={String(r.id)}>{r.code} - {r.title}</option>
                            ))}
                          </select>
                          <select value={issueEditingReport.status} onChange={(e) => setIssueEditingReport((s) => ({ ...s, status: e.target.value }))} className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                            <option value="PENDING">PENDING</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="FIXED">FIXED</option>
                          </select>
                        </div>
                        <textarea value={issueEditingReport.note ?? ''} onChange={(e) => setIssueEditingReport((s) => ({ ...s, note: e.target.value }))} placeholder="Note (opsional)" rows={2} className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                        <textarea value={issueEditingReport.metadataText ?? ''} onChange={(e) => setIssueEditingReport((s) => ({ ...s, metadataText: e.target.value }))} placeholder="Metadata (JSON, opsional)" rows={5} className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-mono text-xs" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                        <div className="flex items-center gap-2">
                          <button type="submit" disabled={issueReportSubmitting} className="flex w-32 py-2 items-center justify-center gap-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>{issueReportSubmitting ? 'Menyimpan...' : (<><Save className="size-4" /> Simpan</>)}</button>
                          <button type="button" onClick={onCancelEditIssueReport} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Batal</button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="rounded-[24px] border-4 p-3 overflow-auto" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <table className="min-w-full border-4 rounded-2xl overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                      <thead style={{ background: 'var(--panel-bg)' }}>
                        <tr>
                          <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
                          <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Status</th>
                          <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>User</th>
                          <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Episode</th>
                          <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Reason</th>
                          <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Note</th>
                          <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Dibuat</th>
                          <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issueReports.map((it) => (
                          <tr key={it.id} style={{ background: '#fff8f8' }}>
                            <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.id}</td>
                            <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.status}</td>
                            <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.user?.username ? `${it.user.username} (#${it.user_id})` : `#${it.user_id}`}</td>
                            <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.episode?.anime?.nama_anime ? `${it.episode.anime.nama_anime} - Ep ${it.episode.nomor_episode}` : `#${it.episode_id}`}</td>
                            <td className="px-3 py-2 border-b-4 text-xs font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.reason?.code ? `${it.reason.code}` : (it.reason_id ? `#${it.reason_id}` : '-')}</td>
                            <td className="px-3 py-2 border-b-4 text-xs" style={{ borderColor: 'var(--panel-border)' }}>{it.note || '-'}</td>
                            <td className="px-3 py-2 border-b-4 text-xs font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.createdAt ? new Date(it.createdAt).toLocaleString() : '-'}</td>
                            <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                              <div className="flex flex-wrap items-center gap-2">
                                <button type="button" onClick={() => onStartEditIssueReport(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>
                                  <Pencil className="size-4" />
                                </button>
                                <button type="button" onClick={() => onQuickStatusIssueReport(it.id, 'PENDING')} disabled={issueReportSubmitting} className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>P</button>
                                <button type="button" onClick={() => onQuickStatusIssueReport(it.id, 'IN_PROGRESS')} disabled={issueReportSubmitting} className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>IP</button>
                                <button type="button" onClick={() => onQuickStatusIssueReport(it.id, 'FIXED')} disabled={issueReportSubmitting} className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60" style={{ boxShadow: '3px 3px 0 #000', background: '#C6F6D5', color: '#111', borderColor: 'var(--panel-border)' }}>FIX</button>
                                <button type="button" onClick={() => onRequestDeleteIssueReport(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {issueReports.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-3 py-6 text-center text-sm opacity-70">{issueReportsLoading ? 'Memuat...' : 'Belum ada laporan.'}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-2">
                    <button disabled={(issueReportsPagination.page || 1) <= 1 || issueReportsLoading} onClick={() => loadIssueReports({ page: Math.max(1, (issueReportsPagination.page || 1) - 1) })} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Sebelumnya</button>
                    <div className="text-sm font-extrabold">Halaman {issueReportsPagination.page || 1} / {Math.max(1, Number(issueReportsPagination?.totalPages) || Math.ceil((issueReportsPagination?.total || 0) / (issueReportsPagination?.limit || 1)) || 1)}</div>
                    <button disabled={(issueReportsPagination.page || 1) >= Math.max(1, Number(issueReportsPagination?.totalPages) || Math.ceil((issueReportsPagination?.total || 0) / (issueReportsPagination?.limit || 1)) || 1) || issueReportsLoading} onClick={() => loadIssueReports({ page: (issueReportsPagination.page || 1) + 1 })} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Berikutnya</button>
                  </div>

                  {issueReportConfirmOpen && (
                    <div className="fixed inset-0 z-50 grid place-items-center">
                      <div className="absolute inset-0 bg-black/40" onClick={onCancelDeleteIssueReport} />
                      <div className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                        <div className="text-lg font-extrabold mb-1">Hapus Laporan?</div>
                        <div className="text-sm opacity-80 mb-4 break-words">Report #{issueReportConfirmTarget?.id}</div>
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" disabled={issueReportDeleting} onClick={onCancelDeleteIssueReport} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Batal</button>
                          <button type="button" disabled={issueReportDeleting} onClick={onConfirmDeleteIssueReport} className="px-3 py-2 border-4 rounded-lg bg-[#FFD803] hover:brightness-95 font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>{issueReportDeleting ? 'Menghapus...' : 'Ya, Hapus'}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
        </div>
      )}

      {/* Form Tambah / Edit Anime */}
      {activeTab === 'anime' && (
        <form onSubmit={onSubmit} className="grid gap-4 rounded-[26px] border-4 p-4 md:p-5" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold">{mode === 'add' ? 'Tambah Anime Baru' : `Edit Anime #${form.id}`}</div>
              <div className="mt-1 text-xs font-semibold opacity-70">Kelola metadata, cover, alias, dan jadwal tayang dari satu panel yang lebih nyaman dipakai.</div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-2 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: mode === 'add' ? '#dcfce7' : '#dbeafe', color: mode === 'add' ? '#166534' : '#1d4ed8' }}>{mode === 'add' ? 'Mode tambah' : 'Mode edit'}</div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)] items-start">
            <div className="grid gap-3 rounded-[24px] border-4 p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #dbeafe 0%, var(--panel-bg) 100%)', borderColor: 'var(--panel-border)' }}>
              <div className="grid gap-1">
                <div className="text-xs font-extrabold">Nama Anime</div>
                <input type="text" value={form.nama_anime} onChange={(e) => setForm((f) => ({ ...f, nama_anime: e.target.value }))} placeholder="Nama anime (wajib)" className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>

              <div className="grid gap-1">
                <div className="text-xs font-extrabold">Cover Anime</div>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={form.cover_mode || 'upload'}
                    onChange={(e) => setForm((f) => ({ ...f, cover_mode: e.target.value, cover_url: e.target.value === 'url' ? f.cover_url : '', image: e.target.value === 'upload' ? f.image : null, previewUrl: e.target.value === 'upload' ? f.previewUrl : '' }))}
                    className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold"
                    style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  >
                    <option value="upload">Upload cover</option>
                    <option value="url">Gunakan URL</option>
                  </select>
                  {(form.cover_mode || 'upload') === 'upload' ? (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onChangeAnimeImage}
                      className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold"
                      style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                    />
                  ) : (
                    <input
                      type="url"
                      value={form.cover_url || ''}
                      onChange={(e) => setForm((f) => ({ ...f, cover_url: e.target.value, previewUrl: '' }))}
                      placeholder="https://..."
                      className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold"
                      style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                    />
                  )}
                </div>
                <div className="mt-2 rounded-[22px] border-4 p-3" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                  <div className="text-[11px] font-black uppercase opacity-70 mb-2">Preview Cover</div>
                  {form.previewUrl || ((form.cover_mode || 'upload') === 'url' ? (form.cover_url || '').trim() : (form.existingImageUrl || '').trim()) ? (
                    <img
                      src={form.previewUrl || ((form.cover_mode || 'upload') === 'url' ? (form.cover_url || '') : form.existingImageUrl) || ''}
                      alt="cover"
                      className="w-full h-52 object-contain border-4 rounded-xl"
                      style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
                    />
                  ) : (
                    <div className="grid h-52 place-items-center text-sm font-semibold opacity-70 border-4 rounded-xl" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                      Belum ada cover
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 min-w-0">
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">Rating</div>
                  <input type="text" value={form.rating_anime} onChange={(e) => setForm((f) => ({ ...f, rating_anime: e.target.value }))} placeholder="Rating (wajib)" className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </div>
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">Type</div>
                  <select value={form.content_type} onChange={(e) => setForm((f) => ({ ...f, content_type: e.target.value }))} className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <option value="ANIME">ANIME</option>
                    <option value="FILM">FILM</option>
                    <option value="DONGHUA">DONGHUA</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">Status</div>
                  <select value={form.status_anime} onChange={(e) => setForm((f) => ({ ...f, status_anime: e.target.value }))} className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <option value="" disabled>Pilih Status (wajib)</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Hiatus">Hiatus</option>
                    <option value="Upcoming">Upcoming</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">Label</div>
                  <select value={form.label_anime} onChange={(e) => setForm((f) => ({ ...f, label_anime: e.target.value }))} className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <option value="" disabled>Pilih Label (wajib)</option>
                    <option value="TV">TV</option>
                    <option value="Movie">Movie</option>
                    <option value="OVA">OVA</option>
                    <option value="ONA">ONA</option>
                    <option value="Donghua">Donghua</option>
                    <option value="Special">Special</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">Tanggal Rilis</div>
                  <input type="date" value={form.tanggal_rilis_anime} onChange={(e) => setForm((f) => ({ ...f, tanggal_rilis_anime: e.target.value }))} className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </div>
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">21+</div>
                  <label className="flex items-center gap-2 text-sm font-semibold px-3 py-2 border-4 rounded-xl min-h-[52px]" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <input type="checkbox" checked={!!form.is_21_plus} onChange={(e) => setForm((f) => ({ ...f, is_21_plus: e.target.checked }))} />
                    <span>Konten 21+</span>
                  </label>
                </div>
              </div>

              <div className="grid gap-1">
                <div className="text-xs font-extrabold">Sinopsis</div>
                <textarea value={form.sinopsis_anime} onChange={(e) => setForm((f) => ({ ...f, sinopsis_anime: e.target.value }))} placeholder="Sinopsis (wajib)" rows={4} className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">Tags</div>
                  <input type="text" value={form.tags_anime} onChange={(e) => setForm((f) => ({ ...f, tags_anime: e.target.value }))} placeholder="Tags (pisahkan dengan koma)" className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </div>
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">Genre</div>
                  <input type="text" value={form.genre_anime} onChange={(e) => setForm((f) => ({ ...f, genre_anime: e.target.value }))} placeholder="Genre (pisahkan dengan koma)" className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </div>
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">Studio</div>
                  <input type="text" value={form.studio_anime} onChange={(e) => setForm((f) => ({ ...f, studio_anime: e.target.value }))} placeholder="Studio (pisahkan dengan koma)" className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </div>
                <div className="grid gap-1">
                  <div className="text-xs font-extrabold">Fakta Menarik</div>
                  <input type="text" value={form.fakta_menarik} onChange={(e) => setForm((f) => ({ ...f, fakta_menarik: e.target.value }))} placeholder="Fakta menarik (pisahkan dengan koma)" className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </div>
              </div>

              {form.status_anime === 'Ongoing' && (
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 items-center rounded-[22px] border-4 p-4" style={{ boxShadow: '6px 6px 0 #000', background: '#fff7cc', borderColor: 'var(--panel-border)' }}>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Jadwal Hari</div>
                    <input type="text" value={form.schedule_hari} onChange={(e) => setForm((f) => ({ ...f, schedule_hari: e.target.value }))} placeholder="Hari tayang (contoh: Senin)" className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Jadwal Jam</div>
                    <input type="text" value={form.schedule_jam} onChange={(e) => setForm((f) => ({ ...f, schedule_jam: e.target.value }))} placeholder="Jam tayang (HH:mm, contoh: 20:30)" className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={!!form.schedule_is_active} onChange={(e) => setForm((f) => ({ ...f, schedule_is_active: e.target.checked }))} />
                    <span>Jadwal aktif</span>
                  </label>
                </div>
              )}

              <div className="grid gap-3 rounded-[24px] border-4 p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold">Aliases</div>
                    <div className="mt-1 text-xs font-semibold opacity-70">Cari alias yang sudah ada dari server, pilih yang relevan, atau tambahkan alias baru manual sesuai kebutuhan.</div>
                  </div>
                  <div className="text-xs font-black rounded-full border-4 px-3 py-2" style={{ borderColor: 'var(--panel-border)', background: '#ede9fe', color: '#6d28d9' }}>{currentAliasList.length} alias dipilih</div>
                </div>

                <div className="grid lg:grid-cols-[minmax(0,1.2fr)_220px] gap-3 items-start">
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Cari Alias Existing</div>
                    <input
                      type="text"
                      value={aliasSearch}
                      onChange={(e) => setAliasSearch(e.target.value)}
                      placeholder="Cari alias atau nama anime sumber..."
                      className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold"
                      style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                    />
                  </div>

                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Default Alias Priority</div>
                    <select value={form.alias_priority} onChange={(e) => setForm((f) => ({ ...f, alias_priority: e.target.value }))} className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                      <option value="">Tanpa priority default</option>
                      {Array.from({ length: 10 }).map((_, idx) => (
                        <option key={idx + 1} value={String(idx + 1)}>Priority {idx + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 items-start">
                  <div className="grid gap-2 rounded-[20px] border-4 p-3" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-extrabold">Hasil Pencarian Alias</div>
                      <div className="text-[11px] font-black opacity-70">{aliasLookupLoading ? 'Mencari...' : `${aliasLookupResults.length} hasil`}</div>
                    </div>
                    {aliasSearch.trim().length < 2 ? (
                      <div className="text-sm font-semibold opacity-70">Mulai ketik untuk mencari alias.</div>
                    ) : aliasLookupResults.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {aliasLookupResults.map((item) => {
                          const alias = String(item?.alias || '').trim();
                          const meta = item?.source_anime_name ? `${item.source_anime_name}${item?.language ? ` • ${item.language}` : ''}${item?.type ? ` • ${item.type}` : ''}` : (item?.language || item?.type ? `${item?.language || ''}${item?.type ? ` • ${item.type}` : ''}` : 'Alias existing');
                          return (
                            <button
                              key={`${alias}-${item?.source_anime_id || 'local'}`}
                              type="button"
                              onClick={() => addAliasToForm(alias)}
                              className="px-3 py-2 text-left border-4 rounded-2xl font-extrabold"
                              style={{ boxShadow: '4px 4px 0 #000', background: '#e0f2fe', color: '#0f172a', borderColor: 'var(--panel-border)' }}
                            >
                              <div>{alias}</div>
                              <div className="text-[11px] font-semibold opacity-70">{meta}</div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm font-semibold opacity-70">Tidak ada alias yang cocok. Kamu bisa tambahkan alias baru manual di panel sebelah.</div>
                    )}
                  </div>

                  <div className="grid gap-2 rounded-[20px] border-4 p-3" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                    <div className="text-xs font-extrabold">Tambah Alias Baru</div>
                    <div className="grid sm:grid-cols-[minmax(0,1fr)_120px] gap-2">
                      <input
                        type="text"
                        value={newAliasInput}
                        onChange={(e) => setNewAliasInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onAddManualAlias();
                          }
                        }}
                        placeholder="Tulis alias baru di sini"
                        className="w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold"
                        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                      />
                      <button type="button" onClick={onAddManualAlias} className="px-3 py-2 border-4 rounded-xl font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: '#dcfce7', color: '#166534', borderColor: 'var(--panel-border)' }}>
                        <Plus className="size-4 inline-block mr-1" /> Tambah
                      </button>
                    </div>
                  </div>
                </div>

                {aliasOptions.filter((alias) => !currentAliasList.includes(alias)).length > 0 && (
                  <div className="grid gap-2">
                    <div className="text-xs font-extrabold">Saran Cepat</div>
                    <div className="flex flex-wrap gap-2">
                      {aliasOptions.filter((alias) => !currentAliasList.includes(alias)).slice(0, 12).map((alias) => (
                        <button key={alias} type="button" onClick={() => addAliasToForm(alias)} className="px-3 py-2 border-4 rounded-full font-extrabold text-sm" style={{ boxShadow: '4px 4px 0 #000', background: '#f5f3ff', color: '#5b21b6', borderColor: 'var(--panel-border)' }}>
                          + {alias}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {currentAliasList.length > 0 ? currentAliasList.map((alias) => (
                    <button key={alias} type="button" onClick={() => removeAliasFromForm(alias)} className="px-3 py-2 border-4 rounded-full font-extrabold text-sm" style={{ boxShadow: '4px 4px 0 #000', background: '#fff7cc', color: '#92400e', borderColor: 'var(--panel-border)' }}>
                      {alias} ×
                    </button>
                  )) : (
                    <div className="text-sm font-semibold opacity-70">Belum ada alias dipilih.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[160px]">
            <button type="submit" disabled={submittingAnime} className={`flex items-center justify-center gap-2 border-4 rounded-xl font-extrabold disabled:opacity-60`} style={{ boxShadow: '4px 4px 0 #000', background: mode === 'add' ? 'var(--accent-add)' : 'var(--accent-edit)', color: mode === 'add' ? 'var(--accent-add-foreground)' : 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>
              {submittingAnime ? (mode === 'add' ? 'Menambah...' : 'Menyimpan...') : (mode === 'add' ? (<><Plus className="size-4" /> Tambah</>) : (<><Pencil className="size-4" /> Simpan</>))}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Anime Related */}
      {false && (
            <div className="grid gap-4">
              <div ref={relTopRef} />
              <form onSubmit={() => {}} className="grid gap-3 p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <div className="font-extrabold">Tambah Relation</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <input type="text" value={relSourceQuery} onChange={(e) => setRelSourceQuery(e.target.value)} placeholder="Cari Source Anime..." className="w-full px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                    {(relSrcLoading || relSourceSug.length > 0) && relSourceQuery && relSourceQuery.length >= 2 && (
                      <div className="absolute z-10 mt-1 w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                        {relSrcLoading ? (
                          <div className="px-3 py-2 text-sm font-semibold">Mencari...</div>
                        ) : (
                          <>
                            {relSourceSug.map((it) => (
                              <button key={it.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setRelForm((s) => ({ ...s, source_anime_id: it.id })); setRelSourceQuery(it.nama_anime || ''); setRelSourceSug([]); }} className="w-full text-left px-3 py-2 hover:opacity-90 font-semibold" style={{ color: 'var(--foreground)' }}>{it.nama_anime}</button>
                            ))}
                            {(!relSourceSug || relSourceSug.length === 0) && (
                              <div className="px-3 py-2 text-sm font-semibold">Tidak ada hasil</div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    <div className="text-xs opacity-70 mt-1">ID: {relForm.source_anime_id || '-'}</div>
                  </div>
                  <div className="relative">
                    <input type="text" value={relRelatedQuery} onChange={(e) => setRelRelatedQuery(e.target.value)} placeholder="Cari Related Anime..." className="w-full px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                    {(relRelLoading || relRelatedSug.length > 0) && relRelatedQuery && relRelatedQuery.length >= 2 && (
                      <div className="absolute z-10 mt-1 w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                        {relRelLoading ? (
                          <div className="px-3 py-2 text-sm font-semibold">Mencari...</div>
                        ) : (
                          <>
                            {relRelatedSug.map((it) => (
                              <button key={it.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setRelForm((s) => ({ ...s, related_anime_id: it.id })); setRelRelatedQuery(it.nama_anime || ''); setRelRelatedSug([]); }} className="w-full text-left px-3 py-2 hover:opacity-90 font-semibold" style={{ color: 'var(--foreground)' }}>{it.nama_anime}</button>
                            ))}
                            {(!relRelatedSug || relRelatedSug.length === 0) && (
                              <div className="px-3 py-2 text-sm font-semibold">Tidak ada hasil</div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    <div className="text-xs opacity-70 mt-1">ID: {relForm.related_anime_id || '-'}</div>
                  </div>
                  <select value={relForm.relation} onChange={(e) => setRelForm((s) => ({ ...s, relation: e.target.value }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    {RELATION_OPTIONS.map((op) => (<option key={op} value={op}>{op}</option>))}
                  </select>
                  <input type="number" value={relForm.priority} onChange={(e) => setRelForm((s) => ({ ...s, priority: Number(e.target.value) }))} placeholder="Priority" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </div>
                <div className="grid sm:grid-cols-[180px]">
                  <button type="submit" disabled={submittingRelation} className="flex items-center justify-center gap-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}>{submittingRelation ? 'Menambah...' : (<><Plus className="size-4" /> Tambah Relation</>)}</button>
                </div>
              </form>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  <input id="rel-group-toggle" type="checkbox" checked={relGroup} onChange={(e) => { setRelGroup(e.target.checked); setRelPage(1); }} />
                  <label htmlFor="rel-group-toggle">Group berdasar base/franchise</label>
                </div>
                <div className="text-sm opacity-80">Total: {relTotal}</div>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <thead style={{ background: 'var(--panel-bg)' }}>
                    <tr>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Source ID</th>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Source Name</th>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Relation</th>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Related ID</th>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Related Name</th>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Priority</th>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relations.map((it) => (
                      <tr key={it.id}>
                        <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.source_anime_id}</td>
                        <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.source_name || '-'}</td>
                        <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.relation}</td>
                        <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.related_anime_id}</td>
                        <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.related_name || '-'}</td>
                        <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.priority ?? '-'}</td>
                        <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => onStartEditRelation(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}><Pencil className="size-4" /></button>
                            <button type="button" onClick={() => onRequestDeleteRelation(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}><Trash2 className="size-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {relations.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-sm opacity-70">{relLoading ? 'Memuat...' : 'Belum ada relation.'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {relGroup && Array.isArray(relGroups) && (
                <div className="p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <div className="font-extrabold mb-2">Groups</div>
                  <div className="space-y-2">
                    {relGroups.map((g) => (
                      <div key={g.key} className="p-2 border-4 rounded-lg" style={{ borderColor: 'var(--panel-border)' }}>
                        <div className="font-bold">{(g.titles || []).join(', ')}</div>
                        <div className="text-sm opacity-80">Key: {g.key}</div>
                        <div className="mt-1 text-sm">
                          {(g.relations || []).map((r) => (
                            <div key={r.id} className="flex items-center gap-2 py-1 border-b last:border-b-0" style={{ borderColor: 'var(--panel-border)' }}>
                              <div className="flex-1">{r.source_name} → {r.related_name}</div>
                              <div className="w-[120px] text-right font-semibold">{r.relation}</div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => onStartEditRelation(r)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }} aria-label="Edit relation"><Pencil className="size-4" /></button>
                                <button type="button" onClick={() => onRequestDeleteRelation(r)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }} aria-label="Hapus relation"><Trash2 className="size-4" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {relGroups.length === 0 && (
                      <div className="text-sm opacity-70">Tidak ada group.</div>
                    )}
                  </div>
                </div>
              )}

              {confirmRelOpen && (
                <div ref={relConfirmRef} className="p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <div className="font-extrabold">Konfirmasi Hapus Relation</div>
                  <div className="text-sm mt-1">Yakin ingin menghapus relation ID: <span className="font-bold">{confirmRelTarget?.id}</span>?</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" disabled={submittingRelation} onClick={onCancelDeleteRelation} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Batal</button>
                    <button type="button" disabled={submittingRelation} onClick={onConfirmDeleteRelation} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>{submittingRelation ? 'Menghapus...' : 'Hapus'}</button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button disabled={relPage <= 1} onClick={() => setRelPage((p) => Math.max(1, p - 1))} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Prev</button>
                <div className="text-sm font-extrabold">Page {relPage} / {Math.max(1, Math.ceil(relTotal / relLimit))}</div>
                <button disabled={relPage >= Math.ceil(relTotal / relLimit)} onClick={() => setRelPage((p) => p + 1)} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Next</button>
              </div>

              {editingRelation && (
                <form onSubmit={onSubmitEditRelation} className="p-3 border-4 rounded-lg space-y-2" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <div className="font-extrabold">Edit Relation</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <select value={editingRelation.relation} onChange={(e) => setEditingRelation((s) => ({ ...s, relation: e.target.value }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                      {RELATION_OPTIONS.map((op) => (<option key={op} value={op}>{op}</option>))}
                    </select>
                    <input type="number" value={editingRelation.priority} onChange={(e) => setEditingRelation((s) => ({ ...s, priority: Number(e.target.value) }))} placeholder="Priority" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={submittingRelation} onClick={onCancelEditRelation} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Batal</button>
                    <button type="submit" disabled={submittingRelation} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>{submittingRelation ? 'Menyimpan...' : 'Simpan'}</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* (HAPUS) Form Bulk dihilangkan */}

          {/* Form Tambah Episode (Global) */}
          {activeTab === 'episode' && (
            <form onSubmit={(e) => { e.preventDefault(); onSubmitCreateEpisodeFromTab(); }} className="grid gap-4 rounded-[26px] border-4 p-4 md:p-5" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold">Tambah Episode</div>
                  <div className="mt-1 text-xs font-semibold opacity-70">Pilih anime, lanjutkan metadata episode, dan pakai thumbnail episode sebelumnya jika belum upload thumbnail baru.</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-2 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: '#ede9fe', color: '#6d28d9' }}>
                  {tabEpisode?.animeId ? `Anime #${tabEpisode.animeId}` : 'Belum pilih anime'}
                </div>
              </div>
              <div className="grid xl:grid-cols-[minmax(0,1.2fr)_320px] gap-4 items-start">
                <div className="grid sm:grid-cols-2 gap-3 rounded-[24px] border-4 p-4" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                  <div className="relative">
                    <div className="text-xs font-extrabold mb-1">Anime</div>
                    <input
                      type="text"
                      placeholder="Cari Anime..."
                      value={animeFilter}
                      onChange={(e) => setAnimeFilter(e.target.value)}
                      onFocus={() => setAnimeInputFocused(true)}
                      onBlur={() => setTimeout(() => setAnimeInputFocused(false), 150)}
                      className="w-full px-3 py-2 border-4 rounded-lg font-semibold"
                      style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                    />
                    {(animeInputFocused && (animeSearchLoading || (animeSuggestions && animeSuggestions.length > 0))) && (
                      <div className="absolute z-10 mt-1 w-full border-4 rounded-2xl overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                        {animeSearchLoading ? (
                          <div className="px-3 py-2 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Mencari...</div>
                        ) : (
                          <>
                            {animeSuggestions.map((it) => (
                              <button
                                key={it.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setTabEpisode((s) => ({ ...s, animeId: it.id }));
                                  setAnimeFilter(it.nama_anime || '');
                                  setAnimeSuggestions([]);
                                }}
                                className="w-full text-left px-3 py-3 hover:opacity-90 font-semibold border-b-2 last:border-b-0"
                                style={{ color: 'var(--foreground)', borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
                              >
                                {it.nama_anime}
                              </button>
                            ))}
                            {(!animeSuggestions || animeSuggestions.length === 0) && (
                              <div className="px-3 py-2 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Tidak ada hasil</div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Judul Episode</div>
                    <input type="text" value={tabEpisode?.judul_episode || ''} onChange={(e) => setTabEpisode((s) => ({ ...s, judul_episode: e.target.value }))} placeholder="Judul episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Nomor Episode</div>
                    <input type="number" value={tabEpisode?.nomor_episode || 1} onChange={(e) => setTabEpisode((s) => ({ ...s, nomor_episode: Number(e.target.value) }))} placeholder="Nomor episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Thumbnail Episode</div>
                    <div className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] gap-2">
                      <select value={tabEpisode?.thumbnail_mode || 'upload'} onChange={(e) => setTabEpisode((s) => ({ ...s, thumbnail_mode: e.target.value, thumbnail_url: e.target.value === 'url' ? s.thumbnail_url : '', image: e.target.value === 'upload' ? s.image : null, previewUrl: e.target.value === 'upload' ? s.previewUrl : '' }))} className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                        <option value="upload">Upload</option>
                        <option value="url">With URL</option>
                      </select>
                      {(tabEpisode?.thumbnail_mode || 'upload') === 'upload' ? (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (!file) return setTabEpisode((s) => ({ ...s, image: null, previewUrl: '' }));
                            const url = URL.createObjectURL(file);
                            setTabEpisode((s) => ({ ...s, image: file, previewUrl: url }));
                          }}
                          className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold"
                          style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                        />
                      ) : (
                        <input type="url" value={tabEpisode?.thumbnail_url || ''} onChange={(e) => setTabEpisode((s) => ({ ...s, thumbnail_url: e.target.value }))} placeholder="https://..." className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                      )}
                    </div>
                    <div className="text-[11px] font-semibold opacity-70">Jika belum upload file baru, thumbnail episode sebelumnya akan dipakai otomatis saat simpan.</div>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Durasi Episode (detik)</div>
                    <input type="number" value={tabEpisode?.durasi_episode || 0} onChange={(e) => setTabEpisode((s) => ({ ...s, durasi_episode: Number(e.target.value) }))} placeholder="Durasi (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Intro Start (detik)</div>
                    <input type="number" value={tabEpisode?.intro_start_seconds ?? 0} onChange={(e) => setTabEpisode((s) => ({ ...s, intro_start_seconds: Number(e.target.value) }))} placeholder="Intro start (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Intro Durasi (detik)</div>
                    <input type="number" value={tabEpisode?.intro_duration_seconds ?? 90} onChange={(e) => setTabEpisode((s) => ({ ...s, intro_duration_seconds: Number(e.target.value) }))} placeholder="Intro durasi (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Outro Start (detik)</div>
                    <input type="number" value={tabEpisode?.outro_start_seconds ?? ''} onChange={(e) => setTabEpisode((s) => ({ ...s, outro_start_seconds: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="Outro start (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Outro Durasi (detik)</div>
                    <input type="number" value={tabEpisode?.outro_duration_seconds ?? 90} onChange={(e) => setTabEpisode((s) => ({ ...s, outro_duration_seconds: Number(e.target.value) }))} placeholder="Outro durasi (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold">Tanggal Rilis</div>
                    <input type="datetime-local" value={tabEpisode?.tanggal_rilis_episode || ''} onChange={(e) => setTabEpisode((s) => ({ ...s, tanggal_rilis_episode: e.target.value }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                </div>
                <div className="grid gap-3 rounded-[24px] border-4 p-4" style={{ background: 'linear-gradient(180deg, #ede9fe 0%, var(--panel-bg) 100%)', borderColor: 'var(--panel-border)' }}>
                  <div className="text-xs font-black uppercase tracking-wide opacity-70">Preview Thumbnail</div>
                  {getEpisodeThumbnailPreview(tabEpisode) ? (
                    <img src={getEpisodeThumbnailPreview(tabEpisode)} alt="thumb" className="w-full h-48 object-contain border-4 rounded-2xl" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }} />
                  ) : (
                    <div className="grid place-items-center h-48 border-4 rounded-2xl text-sm font-semibold opacity-70" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>Belum ada thumbnail siap kirim</div>
                  )}
                  <div className="text-sm font-extrabold">{getEpisodeThumbnailStatus(tabEpisode)}</div>
                  <div className="text-xs font-semibold opacity-70">Preview ini sama dengan sumber thumbnail yang akan dipakai saat submit episode.</div>
                </div>
              </div>
              <div className="grid gap-3 rounded-[24px] border-4 p-4" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-extrabold">Qualities</div>
                  <div className="text-xs font-black rounded-full border-4 px-3 py-2" style={{ borderColor: 'var(--panel-border)', background: '#dbeafe', color: '#1d4ed8' }}>{(tabEpisode?.qualities || []).length} item</div>
                </div>
                <div className="space-y-2">
                  {(tabEpisode?.qualities || []).map((q, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] gap-2 rounded-2xl border-4 p-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                      <div className="grid gap-1">
                        <div className="text-xs font-extrabold">Nama Quality</div>
                        <input type="text" value={q.nama_quality} onChange={(e) => updateTabQualityField(idx, 'nama_quality', e.target.value)} placeholder="Nama quality (480p/720p/1080p)" className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                      </div>
                      <div className="grid gap-1">
                        <div className="text-xs font-extrabold">Source URL</div>
                        <input type="url" value={q.source_quality} onChange={(e) => updateTabQualityField(idx, 'source_quality', e.target.value)} placeholder="Source URL" className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                      </div>
                      <button type="button" onClick={() => moveTabQuality(idx, -1)} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-50" disabled={idx === 0} aria-label="Naikkan urutan" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                        <ChevronUp className="size-4" />
                      </button>
                      <button type="button" onClick={() => moveTabQuality(idx, 1)} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-50" disabled={idx === (tabEpisode?.qualities?.length || 0) - 1} aria-label="Turunkan urutan" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                        <ChevronDown className="size-4" />
                      </button>
                      <button type="button" onClick={() => removeTabQuality(idx)} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Hapus</button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={() => addTabQuality()} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>+ Tambah Quality</button>
                </div>
              </div>
              <div className="grid gap-1">
                <div className="text-xs font-extrabold">Deskripsi Episode</div>
                <textarea rows={3} value={tabEpisode?.deskripsi_episode || ''} onChange={(e) => setTabEpisode((s) => ({ ...s, deskripsi_episode: e.target.value }))} placeholder="Deskripsi episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>
              <div className="grid sm:grid-cols-[160px]">
                <button type="submit" disabled={submittingTabEpisode} className="flex items-center justify-center gap-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}>
                  {submittingTabEpisode ? 'Menambah...' : (<><Plus className="size-4" /> Tambah Episode</>)}
                </button>
              </div>
            </form>
          )}

          {/* Tab: Request Anime */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="rounded-[24px] border-4 p-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-lg font-extrabold">Request Anime</div>
                    <div className="mt-1 text-xs font-semibold opacity-70">Pantau request user, ambil tiket yang belum ditangani, dan hapus entri yang tidak diperlukan.</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-2 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: '#fef3c7', color: '#92400e' }}>Total request: {reqTotal}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                {['', ...REQUEST_STATUSES].map((statusKey) => {
                  const meta = REQUEST_STATUS_META[statusKey || 'ALL'];
                  const active = reqStatus === statusKey;
                  return (
                    <button
                      key={statusKey || 'ALL'}
                      type="button"
                      onClick={() => setReqStatus(statusKey)}
                      className="px-3 py-2 border-4 rounded-lg font-extrabold"
                      style={{
                        boxShadow: '4px 4px 0 #000',
                        background: active ? meta.bg : 'var(--panel-bg)',
                        color: active ? meta.fg : 'var(--foreground)',
                        borderColor: 'var(--panel-border)',
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
                </div>
              </div>

              <div className="rounded-[24px] border-4 p-3 overflow-auto" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <table className="min-w-full border-4 rounded-2xl overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <thead style={{ background: 'var(--panel-bg)' }}>
                    <tr>
                      <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
                      <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Nama</th>
                      <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Season</th>
                      <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Status</th>
                      <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>User</th>
                      <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Admin</th>
                      <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Note</th>
                      <th className="text-left px-3 py-3 border-b-4 text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reqItems.map((it) => (
                      <tr key={it.id} style={{ background: '#fffef7' }}>
                        <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.id}</td>
                        <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.nama_anime}</td>
                        <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.season ?? '-'}</td>
                        <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.status}</td>
                        <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.user?.username ? `${it.user.username} (#${it.user_id})` : `#${it.user_id}`}</td>
                        <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.admin ? (it.admin.username || `#${it.admin_id}`) : (it.admin_id ? `#${it.admin_id}` : '-')}</td>
                        <td className="px-3 py-2 border-b-4 text-xs" style={{ borderColor: 'var(--panel-border)' }}>{it.note || '-'}</td>
                        <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onTakeReq(it)}
                              disabled={reqTakingId === it.id || !!it.admin_id}
                              className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60"
                              style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
                            >
                              {reqTakingId === it.id ? 'Mengambil...' : (it.admin_id ? 'Sudah diambil' : 'Ambil')}
                            </button>
                            <button type="button" onClick={() => onRequestDeleteReq(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}><Trash2 className="size-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reqItems.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-sm opacity-70">{reqLoading ? 'Memuat...' : 'Belum ada request.'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2">
                <button disabled={reqPage <= 1 || reqLoading} onClick={() => loadAnimeRequests({ page: Math.max(1, reqPage - 1) })} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Prev</button>
                <div className="text-sm font-extrabold">Page {reqPage} / {Math.max(1, Math.ceil((reqTotal || 0) / (reqLimit || 1)))}</div>
                <button disabled={reqPage >= Math.ceil((reqTotal || 0) / (reqLimit || 1)) || reqLoading} onClick={() => loadAnimeRequests({ page: reqPage + 1 })} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Next</button>
              </div>

              {reqConfirmOpen && (
                <div className="fixed inset-0 z-50 grid place-items-center">
                  <div className="absolute inset-0 bg-black/40" onClick={onCancelDeleteReq} />
                  <div className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="grid place-items-center size-10 border-4 rounded-md" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                        <Trash2 className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold">Hapus Request?</h3>
                        <p className="text-sm opacity-80 break-words">#{reqConfirmTarget?.id} - {reqConfirmTarget?.nama_anime}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={onCancelDeleteReq} disabled={reqDeleting} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
                      <button onClick={onConfirmDeleteReq} disabled={reqDeleting} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>{reqDeleting ? 'Menghapus...' : 'Ya, Hapus'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab !== 'requests' && activeTab !== 'episode-issue' && (
            <>
              <div className="rounded-[24px] border-4 p-4 overflow-auto" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold">Daftar Anime</div>
                    <div className="mt-1 text-xs font-semibold opacity-70">Kelola anime, buka episode, edit cepat, dan hapus dari panel utama.</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-2 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: '#dbeafe', color: '#1d4ed8' }}>Total data: {items.length}</div>
                </div>
                <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <thead style={{ background: 'var(--panel-bg)' }}>
                    <tr>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>&nbsp;</th>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Nama</th>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Rating</th>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Status</th>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Label</th>
                      <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <>
                        <tr key={`${it.id}-row`}>
                          <td className="px-2 py-2 border-b-4 align-top" style={{ borderColor: 'var(--panel-border)' }}>
                            <button onClick={() => toggleExpand(it.id)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '2px 2px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }} aria-label="Toggle episodes">
                              {expanded.has(it.id) ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </button>
                          </td>
                          <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.nama_anime}</td>
                          <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.rating_anime}</td>
                          <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.status_anime}</td>
                          <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.label_anime}</td>
                          <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                            <div className="flex items-center gap-2">
                              <button onClick={() => onEdit(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>
                                <Pencil className="size-4" />
                              </button>
                              <button onClick={() => onRequestDelete(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded.has(it.id) && (
                          <tr key={`${it.id}-episodes`}>
                            <td className="px-3 py-2 border-b-4" colSpan={6} style={{ borderColor: 'var(--panel-border)' }}>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2 font-extrabold">
                                  <div className="flex items-center gap-2"><Film className="size-4" /> Episodes</div>
                                  <button type="button" onClick={() => startCreateEpisode(it.id)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}>+ Tambah Episode</button>
                                </div>
                                {creatingForAnime === it.id && newEpisode && (
                                  <form onSubmit={onSubmitCreateEpisode} className="grid gap-3 rounded-[24px] border-4 p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(180deg, var(--panel-bg) 0%, #ede9fe 100%)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <div className="font-extrabold">Tambah Episode</div>
                                        <div className="mt-1 text-xs font-semibold opacity-70">Kalau thumbnail baru belum dipilih, sistem akan kirim thumbnail episode sebelumnya ke backend.</div>
                                      </div>
                                      <div className="text-xs font-black rounded-full border-4 px-3 py-2" style={{ borderColor: 'var(--panel-border)', background: '#fff7cc', color: '#92400e' }}>Episode #{newEpisode.nomor_episode}</div>
                                    </div>
                                    <div className="grid gap-1">
                                      <div className="text-xs font-extrabold">Video Player</div>
                                      <video
                                        key={getEpisodeVideoSrc(newEpisode) || 'no-src'}
                                        ref={episodeVideoRef}
                                        controls
                                        src={getEpisodeVideoSrc(newEpisode) || undefined}
                                        className="w-full border-4 rounded-lg"
                                        style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}
                                      />
                                    </div>
                                    <div className="grid xl:grid-cols-[minmax(0,1.2fr)_320px] gap-3 items-start">
                                      <div className="grid sm:grid-cols-2 gap-2 rounded-[20px] border-4 p-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                                        <div className="grid gap-1">
                                          <div className="text-xs font-extrabold">Judul Episode</div>
                                          <input type="text" value={newEpisode.judul_episode} onChange={(e) => setNewEpisode((s) => ({ ...s, judul_episode: e.target.value }))} placeholder="Judul episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                        </div>
                                        <div className="grid gap-1">
                                          <div className="text-xs font-extrabold">Nomor Episode</div>
                                          <input type="number" value={newEpisode.nomor_episode} onChange={(e) => setNewEpisode((s) => ({ ...s, nomor_episode: Number(e.target.value) }))} placeholder="Nomor episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                        </div>
                                        <div className="grid gap-1">
                                          <div className="text-xs font-extrabold">Thumbnail Episode</div>
                                          <div className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] gap-2">
                                            <select value={newEpisode?.thumbnail_mode || 'upload'} onChange={(e) => setNewEpisode((s) => ({ ...s, thumbnail_mode: e.target.value, thumbnail_url: e.target.value === 'url' ? s.thumbnail_url : '', image: e.target.value === 'upload' ? s.image : null, previewUrl: e.target.value === 'upload' ? s.previewUrl : '' }))} className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                                              <option value="upload">Upload</option>
                                              <option value="url">With URL</option>
                                            </select>
                                            {(newEpisode?.thumbnail_mode || 'upload') === 'upload' ? (
                                              <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                  const file = e.target.files?.[0] || null;
                                                  if (!file) return setNewEpisode((s) => ({ ...s, image: null, previewUrl: '' }));
                                                  const url = URL.createObjectURL(file);
                                                  setNewEpisode((s) => ({ ...s, image: file, previewUrl: url }));
                                                }}
                                                className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold"
                                                style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                                              />
                                            ) : (
                                              <input type="url" value={newEpisode?.thumbnail_url || ''} onChange={(e) => setNewEpisode((s) => ({ ...s, thumbnail_url: e.target.value }))} placeholder="https://..." className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                            )}
                                          </div>
                                          <div className="text-[11px] font-semibold opacity-70">Preview akan fallback ke thumbnail episode terakhir bila file baru belum dipilih.</div>
                                        </div>
                                        <div className="grid gap-1">
                                          <div className="text-xs font-extrabold">Durasi Episode (detik)</div>
                                          <input type="number" value={newEpisode.durasi_episode} onChange={(e) => setNewEpisode((s) => ({ ...s, durasi_episode: Number(e.target.value) }))} placeholder="Durasi (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                        </div>
                                        <div className="grid gap-1">
                                          <div className="text-xs font-extrabold">Intro Start (detik)</div>
                                          <input type="number" value={newEpisode.intro_start_seconds ?? 0} onChange={(e) => setNewEpisode((s) => ({ ...s, intro_start_seconds: Number(e.target.value) }))} placeholder="Intro start (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const t = Math.floor(Number(episodeVideoRef.current?.currentTime) || 0);
                                              setNewEpisode((s) => ({ ...s, intro_start_seconds: t }));
                                            }}
                                            className="px-3 py-2 border-4 rounded-lg font-extrabold"
                                            style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                                          >
                                            Track
                                          </button>
                                        </div>
                                        <div className="grid gap-1">
                                          <div className="text-xs font-extrabold">Intro Durasi (detik)</div>
                                          <input type="number" value={newEpisode.intro_duration_seconds ?? 90} onChange={(e) => setNewEpisode((s) => ({ ...s, intro_duration_seconds: Number(e.target.value) }))} placeholder="Intro durasi (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                        </div>
                                        <div className="grid gap-1">
                                          <div className="text-xs font-extrabold">Outro Start (detik)</div>
                                          <input type="number" value={newEpisode.outro_start_seconds ?? ''} onChange={(e) => setNewEpisode((s) => ({ ...s, outro_start_seconds: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="Outro start (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const t = Math.floor(Number(episodeVideoRef.current?.currentTime) || 0);
                                              setNewEpisode((s) => ({ ...s, outro_start_seconds: t }));
                                            }}
                                            className="px-3 py-2 border-4 rounded-lg font-extrabold"
                                            style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                                          >
                                            Track
                                          </button>
                                        </div>
                                        <div className="grid gap-1">
                                          <div className="text-xs font-extrabold">Outro Durasi (detik)</div>
                                          <input type="number" value={newEpisode.outro_duration_seconds ?? 90} onChange={(e) => setNewEpisode((s) => ({ ...s, outro_duration_seconds: Number(e.target.value) }))} placeholder="Outro durasi (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                        </div>
                                        <div className="grid gap-1">
                                          <div className="text-xs font-extrabold">Tanggal Rilis</div>
                                          <input type="datetime-local" value={newEpisode.tanggal_rilis_episode} onChange={(e) => setNewEpisode((s) => ({ ...s, tanggal_rilis_episode: e.target.value }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                        </div>
                                      </div>
                                      <div className="grid gap-3 rounded-[20px] border-4 p-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                                        <div className="text-xs font-black uppercase tracking-wide opacity-70">Preview Thumbnail</div>
                                        {getEpisodeThumbnailPreview(newEpisode) ? (
                                          <img src={getEpisodeThumbnailPreview(newEpisode)} alt="thumb" className="w-full h-48 object-contain border-4 rounded-2xl" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }} />
                                        ) : (
                                          <div className="grid place-items-center h-48 border-4 rounded-2xl text-sm font-semibold opacity-70" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>Belum ada thumbnail siap kirim</div>
                                        )}
                                        <div className="text-sm font-extrabold">{getEpisodeThumbnailStatus(newEpisode)}</div>
                                      </div>
                                    </div>
                                    <div className="grid gap-3 rounded-[20px] border-4 p-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="font-extrabold">Qualities</div>
                                        <div className="text-xs font-black rounded-full border-4 px-3 py-2" style={{ borderColor: 'var(--panel-border)', background: '#dbeafe', color: '#1d4ed8' }}>{(newEpisode.qualities || []).length} item</div>
                                      </div>
                                      <div className="space-y-2">
                                        {(newEpisode.qualities || []).map((q, idx) => (
                                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] gap-2 rounded-2xl border-4 p-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                                            <div className="grid gap-1">
                                              <div className="text-xs font-extrabold">Nama Quality</div>
                                              <input type="text" value={q.nama_quality} onChange={(e) => updateNewQualityField(idx, 'nama_quality', e.target.value)} placeholder="Nama quality (480p/720p/1080p)" className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                            </div>
                                            <div className="grid gap-1">
                                              <div className="text-xs font-extrabold">Source URL</div>
                                              <input type="url" value={q.source_quality} onChange={(e) => updateNewQualityField(idx, 'source_quality', e.target.value)} placeholder="Source URL" className="w-full min-w-0 px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                            </div>
                                            <button type="button" onClick={() => moveNewQuality(idx, -1)} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-50" disabled={idx === 0} aria-label="Naikkan urutan" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                                              <ChevronUp className="size-4" />
                                            </button>
                                            <button type="button" onClick={() => moveNewQuality(idx, 1)} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-50" disabled={idx === (newEpisode?.qualities?.length || 0) - 1} aria-label="Turunkan urutan" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                                              <ChevronDown className="size-4" />
                                            </button>
                                            <button type="button" onClick={() => removeNewQuality(idx)} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Hapus</button>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                                        <button type="button" onClick={addNewQuality} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>+ Tambah Quality</button>
                                      </div>
                                    </div>
                                    <div className="grid gap-1">
                                      <div className="text-xs font-extrabold">Deskripsi Episode</div>
                                      <textarea rows={3} value={newEpisode.deskripsi_episode} onChange={(e) => setNewEpisode((s) => ({ ...s, deskripsi_episode: e.target.value }))} placeholder="Deskripsi episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button type="button" disabled={submittingNewEpisode} onClick={cancelCreateEpisode} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Batal</button>
                                      <button type="submit" disabled={submittingNewEpisode} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}>{submittingNewEpisode ? 'Menyimpan...' : 'Simpan'}</button>
                                    </div>
                                  </form>
                                )}
                                {editingEpisode && editingEpisode.animeId === it.id && (
                                  <form onSubmit={onSubmitEpisode} className="p-3 border-4 rounded-lg space-y-2" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                                    <div className="font-extrabold">Edit Episode (Mockup)</div>
                                    <div className="grid gap-1">
                                      <div className="text-xs font-extrabold">Video Player</div>
                                      <video
                                        key={getEpisodeVideoSrc(editingEpisode) || 'no-src'}
                                        ref={episodeVideoRef}
                                        controls
                                        src={getEpisodeVideoSrc(editingEpisode) || undefined}
                                        className="w-full border-4 rounded-lg"
                                        style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}
                                      />
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-2">
                                      <div className="grid gap-1">
                                        <div className="text-xs font-extrabold">Judul Episode</div>
                                        <input type="text" value={editingEpisode.judul_episode} onChange={(e) => setEditingEpisode((s) => ({ ...s, judul_episode: e.target.value }))} placeholder="Judul episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                      </div>
                                      <div className="grid gap-1">
                                        <div className="text-xs font-extrabold">Nomor Episode</div>
                                        <input type="number" value={editingEpisode.nomor_episode} onChange={(e) => setEditingEpisode((s) => ({ ...s, nomor_episode: Number(e.target.value) }))} placeholder="Nomor episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                      </div>
                                      <div className="grid gap-1">
                                        <div className="text-xs font-extrabold">Thumbnail Episode</div>
                                        <div className="grid sm:grid-cols-[140px_1fr] gap-2">
                                          <select value={editingEpisode?.thumbnail_mode || 'upload'} onChange={(e) => setEditingEpisode((s) => ({ ...s, thumbnail_mode: e.target.value, thumbnail_url: e.target.value === 'url' ? s.thumbnail_url : '', image: e.target.value === 'upload' ? s.image : null, previewUrl: e.target.value === 'upload' ? s.previewUrl : '' }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                                            <option value="upload">Upload</option>
                                            <option value="url">With URL</option>
                                          </select>
                                          {(editingEpisode?.thumbnail_mode || 'upload') === 'upload' ? (
                                            <input
                                              type="file"
                                              accept="image/*"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                if (!file) return setEditingEpisode((s) => ({ ...s, image: null, previewUrl: '' }));
                                                const url = URL.createObjectURL(file);
                                                setEditingEpisode((s) => ({ ...s, image: file, previewUrl: url }));
                                              }}
                                              className="px-3 py-2 border-4 rounded-lg font-semibold"
                                              style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                                            />
                                          ) : (
                                            <input type="url" value={editingEpisode?.thumbnail_url || ''} onChange={(e) => setEditingEpisode((s) => ({ ...s, thumbnail_url: e.target.value }))} placeholder="https://..." className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                          )}
                                        </div>
                                        <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--foreground)' }}>
                                          <span className="font-extrabold">Preview:</span>
                                          <img src={editingEpisode.previewUrl || ((editingEpisode?.thumbnail_mode || 'upload') === 'url' ? (editingEpisode?.thumbnail_url || '') : editingEpisode.existingImageUrl) || ''} alt="thumb" className="w-10 h-10 object-contain border-2 rounded" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }} />
                                          {!(editingEpisode.previewUrl || editingEpisode.existingImageUrl || (((editingEpisode?.thumbnail_mode || 'upload') === 'url') && (editingEpisode?.thumbnail_url || '').trim())) && (
                                            <span className="opacity-70">-</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="grid gap-1">
                                        <div className="text-xs font-extrabold">Durasi Episode (detik)</div>
                                        <input type="number" value={editingEpisode.durasi_episode} onChange={(e) => setEditingEpisode((s) => ({ ...s, durasi_episode: Number(e.target.value) }))} placeholder="Durasi (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                      </div>
                                      <div className="grid gap-1">
                                        <div className="text-xs font-extrabold">Intro Start (detik)</div>
                                        <input type="number" value={editingEpisode.intro_start_seconds ?? 0} onChange={(e) => setEditingEpisode((s) => ({ ...s, intro_start_seconds: Number(e.target.value) }))} placeholder="Intro start (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const t = Math.floor(Number(episodeVideoRef.current?.currentTime) || 0);
                                            setEditingEpisode((s) => ({ ...s, intro_start_seconds: t }));
                                          }}
                                          className="px-3 py-2 border-4 rounded-lg font-extrabold"
                                          style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                                        >
                                          Track
                                        </button>
                                      </div>
                                      <div className="grid gap-1">
                                        <div className="text-xs font-extrabold">Intro Durasi (detik)</div>
                                        <input type="number" value={editingEpisode.intro_duration_seconds ?? 90} onChange={(e) => setEditingEpisode((s) => ({ ...s, intro_duration_seconds: Number(e.target.value) }))} placeholder="Intro durasi (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                      </div>
                                      <div className="grid gap-1">
                                        <div className="text-xs font-extrabold">Outro Start (detik)</div>
                                        <input type="number" value={editingEpisode.outro_start_seconds ?? ''} onChange={(e) => setEditingEpisode((s) => ({ ...s, outro_start_seconds: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="Outro start (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const t = Math.floor(Number(episodeVideoRef.current?.currentTime) || 0);
                                            setEditingEpisode((s) => ({ ...s, outro_start_seconds: t }));
                                          }}
                                          className="px-3 py-2 border-4 rounded-lg font-extrabold"
                                          style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                                        >
                                          Track
                                        </button>
                                      </div>
                                      <div className="grid gap-1">
                                        <div className="text-xs font-extrabold">Outro Durasi (detik)</div>
                                        <input type="number" value={editingEpisode.outro_duration_seconds ?? 90} onChange={(e) => setEditingEpisode((s) => ({ ...s, outro_duration_seconds: Number(e.target.value) }))} placeholder="Outro durasi (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                      </div>
                                      <div className="grid gap-1">
                                        <div className="text-xs font-extrabold">Tanggal Rilis</div>
                                        <input type="datetime-local" value={editingEpisode.tanggal_rilis_episode} onChange={(e) => setEditingEpisode((s) => ({ ...s, tanggal_rilis_episode: e.target.value }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                      </div>
                                    </div>
                                    <div className="pt-1">
                                      <div className="font-extrabold mb-2">Qualities</div>
                                      <div className="space-y-2">
                                        {(editingEpisode.qualities || []).map((q, idx) => (
                                          <div key={idx} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
                                            <div className="grid gap-1">
                                              <div className="text-xs font-extrabold">Nama Quality</div>
                                              <input type="text" value={q.nama_quality} onChange={(e) => updateQualityField(idx, 'nama_quality', e.target.value)} placeholder="Nama quality (480p/720p/1080p)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                            </div>
                                            <div className="grid gap-1">
                                              <div className="text-xs font-extrabold">Source URL</div>
                                              <input type="url" value={q.source_quality} onChange={(e) => updateQualityField(idx, 'source_quality', e.target.value)} placeholder="Source URL" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                            </div>
                                            <button type="button" onClick={() => removeQuality(idx)} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Hapus</button>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="mt-2">
                                        <button type="button" onClick={addQuality} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>+ Tambah Quality</button>
                                      </div>
                                    </div>
                                    <div className="grid gap-1">
                                      <div className="text-xs font-extrabold">Deskripsi Episode</div>
                                      <textarea rows={3} value={editingEpisode.deskripsi_episode} onChange={(e) => setEditingEpisode((s) => ({ ...s, deskripsi_episode: e.target.value }))} placeholder="Deskripsi episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button type="button" disabled={submittingEditEpisode} onClick={onCancelEditEpisode} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Batal</button>
                                      <button type="submit" disabled={submittingEditEpisode} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>{submittingEditEpisode ? 'Menyimpan...' : 'Simpan'}</button>
                                    </div>
                                  </form>
                                )}
                                {(it.episodes && it.episodes.length > 0) ? (
                                  <div
                                    className="space-y-2 max-h-[480px] overflow-auto no-scrollbar"
                                    onScroll={(e) => {
                                      const el = e.currentTarget;
                                      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
                                        maybeLoadMoreEpisodes(it.id);
                                      }
                                    }}
                                  >
                                    {it.episodes.map((ep) => (
                                      <div key={ep.id} className="p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-start gap-2">
                                            {ep.thumbnail_episode ? (
                                              <img
                                                src={ep.thumbnail_episode}
                                                alt="thumb"
                                                className="w-10 h-10 object-contain border-2 rounded"
                                                style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
                                              />
                                            ) : null}
                                            <div className="font-extrabold">Ep {ep.nomor_episode}: {ep.judul_episode}</div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button onClick={() => onEditEpisode(it.id, ep)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>
                                              <Pencil className="size-4" />
                                            </button>
                                            <button onClick={() => onRequestDeleteEpisode(ep)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                                              <Trash2 className="size-4" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="text-xs opacity-80">Durasi: {ep.durasi_episode} detik • Rilis: {ep.tanggal_rilis_episode ? new Date(ep.tanggal_rilis_episode).toLocaleString() : '-'}</div>
                                        {Array.isArray(ep.qualities) && ep.qualities.length > 0 && (
                                          <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                            {ep.qualities.map((q) => (
                                              <span key={q.id} className="px-2 py-0.5 border-2 rounded font-extrabold" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}>{q.nama_quality}</span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm opacity-70">Belum ada episode.</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Belum ada konten.'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Prev</button>
                <div className="text-sm font-extrabold">Page {page} / {Math.max(1, Math.ceil(total / limit))}</div>
                <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Next</button>
              </div>
            </>
          )}

          {/* Confirm Delete Modal */}
          {confirmOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center">
              <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete} />
              <div className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid place-items-center size-10 border-4 rounded-md" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                    <Trash2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">Hapus Konten?</h3>
                    <p className="text-sm opacity-80 break-words">{confirmTarget?.nama_anime}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={onCancelDelete} disabled={deletingAnime} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>
                    Batal
                  </button>
                  <button onClick={onConfirmDelete} disabled={deletingAnime} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>
                    {deletingAnime ? 'Menghapus...' : 'Ya, Hapus'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Delete Episode (Mock) */}
          {confirmEpOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center">
              <div className="absolute inset-0 bg-black/40" onClick={onCancelDeleteEpisode} />
              <div className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid place-items-center size-10 border-4 rounded-md" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                    <Trash2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">Hapus Episode?</h3>
                    <p className="text-sm opacity-80 break-words">{confirmEpTarget ? `Ep ${confirmEpTarget.nomor_episode}: ${confirmEpTarget.judul_episode}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={onCancelDeleteEpisode} disabled={deletingEpisode} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>
                    Batal
                  </button>
                  <button onClick={onConfirmDeleteEpisode} disabled={deletingEpisode} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>
                    {deletingEpisode ? 'Menghapus...' : 'Ya, Hapus'}
                  </button>
                </div>
              </div>
            </div>
          )}
          <style jsx>{`
            .no-scrollbar {
              -ms-overflow-style: none; /* IE and Edge */
              scrollbar-width: none; /* Firefox */
            }
            .no-scrollbar::-webkit-scrollbar {
              display: none; /* Safari and Chrome */
              width: 0;
              height: 0;
            }
          `}</style>
        </>
      )}
    </div>
  );
}
