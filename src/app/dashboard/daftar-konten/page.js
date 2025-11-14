'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Plus, Pencil, Trash2, List, ChevronDown, ChevronRight, ChevronUp, Film } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAnime, createAnime, updateAnime, deleteAnime, listEpisodes, createEpisode, updateEpisode, deleteEpisode, searchAnime } from '@/lib/api';

export default function DaftarKontenPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const role = (user?.role || '').toLowerCase();
  const canAccess = role === 'superadmin' || role === 'uploader';

  // List state
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set()); // anime ids expanded

  // Form state (add/edit)
  const [mode, setMode] = useState('add'); // add | edit
  const [activeTab, setActiveTab] = useState('anime'); // anime | episode
  const [form, setForm] = useState({
    id: null,
    nama_anime: '',
    gambar_anime: '',
    rating_anime: '',
    status_anime: '',
    sinopsis_anime: '',
    label_anime: '',
    tags_anime: '',
    genre_anime: '',
    studio_anime: '',
    fakta_menarik: '',
    tanggal_rilis_anime: '',
  });
  // (HAPUS) Bulk Sync state dan fitur dihilangkan
  const [submittingTabEpisode, setSubmittingTabEpisode] = useState(false);
  const resetForm = () => setForm({
    id: null,
    nama_anime: '',
    gambar_anime: '',
    rating_anime: '',
    status_anime: '',
    sinopsis_anime: '',
    label_anime: '',
    tags_anime: '',
    genre_anime: '',
    studio_anime: '',
    fakta_menarik: '',
    tanggal_rilis_anime: '',
  });

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadList = async (opts = {}) => {
    if (!canAccess) return;
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = { page, limit, q, ...opts };
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
    thumbnail_episode: '',
    deskripsi_episode: '',
    durasi_episode: 0,
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
      thumbnail_episode: latest?.thumbnail_episode || '',
      deskripsi_episode: latest?.deskripsi_episode || '',
      durasi_episode: Number(latest?.durasi_episode) || 0,
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
  const onSubmitCreateEpisodeFromTab = async () => {
    if (!tabEpisode?.animeId) {
      toast.error('Pilih anime terlebih dahulu');
      return;
    }
    const token = getSession()?.token;
    const payload = {
      judul_episode: tabEpisode.judul_episode,
      nomor_episode: Number(tabEpisode.nomor_episode),
      thumbnail_episode: tabEpisode.thumbnail_episode,
      deskripsi_episode: tabEpisode.deskripsi_episode || null,
      durasi_episode: Number(tabEpisode.durasi_episode) || 0,
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
      await loadEpisodes(tabEpisode.animeId);
      // reset form values (keep anime selection) and set default qualities again
      setTabEpisode((s) => ({ ...s, judul_episode: '', nomor_episode: 1, thumbnail_episode: '', deskripsi_episode: '', durasi_episode: 0, tanggal_rilis_episode: '', qualities: defaultQualities }));
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
        const nextEpisodes = reset ? (data.items || []) : [...existing, ...(data.items || [])];
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
      thumbnail_episode: ep.thumbnail_episode || '',
      deskripsi_episode: ep.deskripsi_episode || '',
      durasi_episode: ep.durasi_episode || 0,
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
    const payload = {
      judul_episode: editingEpisode.judul_episode,
      nomor_episode: editingEpisode.nomor_episode,
      thumbnail_episode: editingEpisode.thumbnail_episode,
      deskripsi_episode: editingEpisode.deskripsi_episode ?? null,
      durasi_episode: editingEpisode.durasi_episode,
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
      await loadEpisodes(animeId);
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
      await loadEpisodes(animeId);
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
      thumbnail_episode: latest?.thumbnail_episode || '',
      deskripsi_episode: latest?.deskripsi_episode || '',
      durasi_episode: Number(latest?.durasi_episode) || 0,
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
    const token = getSession()?.token;
    const payload = {
      judul_episode: newEpisode.judul_episode,
      nomor_episode: Number(newEpisode.nomor_episode),
      thumbnail_episode: newEpisode.thumbnail_episode,
      deskripsi_episode: newEpisode.deskripsi_episode ?? null,
      durasi_episode: Number(newEpisode.durasi_episode) || 0,
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
      await loadEpisodes(creatingForAnime);
      cancelCreateEpisode();
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat episode');
    } finally {
      setSubmittingNewEpisode(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, canAccess]);

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
    const payload = {
      nama_anime: form.nama_anime,
      gambar_anime: form.gambar_anime,
      rating_anime: form.rating_anime,
      status_anime: normalizeStatus(form.status_anime),
      sinopsis_anime: form.sinopsis_anime,
      label_anime: form.label_anime,
    };
    const optional = {
      tags_anime: parseMaybeArray(form.tags_anime),
      genre_anime: parseMaybeArray(form.genre_anime),
      studio_anime: parseMaybeArray(form.studio_anime),
      fakta_menarik: parseMaybeArray(form.fakta_menarik),
      tanggal_rilis_anime: form.tanggal_rilis_anime || undefined,
    };
    Object.keys(optional).forEach((k) => optional[k] === undefined || optional[k] === '' ? delete optional[k] : null);
    return { ...payload, ...optional };
  };

  const [submittingAnime, setSubmittingAnime] = useState(false);
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama_anime || !form.gambar_anime || !form.rating_anime || !form.status_anime || !form.sinopsis_anime || !form.label_anime) {
      return toast.error('Field wajib belum lengkap');
    }
    const token = getSession()?.token;
    try {
      setSubmittingAnime(true);
      if (mode === 'add') {
        const res = await createAnime({ token, payload: buildPayload() });
        toast.success(res?.message || 'Anime dibuat');
        resetForm();
        setPage(1);
        await loadList({ page: 1 });
      } else {
        const res = await updateAnime({ token, id: form.id, payload: buildPayload() });
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
    setForm({
      id: it.id,
      nama_anime: it.nama_anime || '',
      gambar_anime: it.gambar_anime || '',
      rating_anime: it.rating_anime || '',
      status_anime: normalizeStatus(it.status_anime || ''),
      sinopsis_anime: it.sinopsis_anime || '',
      label_anime: it.label_anime || '',
      tags_anime: Array.isArray(it.tags_anime) ? it.tags_anime.join(', ') : (it.tags_anime || ''),
      genre_anime: Array.isArray(it.genre_anime) ? it.genre_anime.join(', ') : (it.genre_anime || ''),
      studio_anime: Array.isArray(it.studio_anime) ? it.studio_anime.join(', ') : (it.studio_anime || ''),
      fakta_menarik: Array.isArray(it.fakta_menarik) ? it.fakta_menarik.join(', ') : (it.fakta_menarik || ''),
      tanggal_rilis_anime: it.tanggal_rilis_anime ? new Date(it.tanggal_rilis_anime).toISOString().slice(0, 10) : '', // yyyy-mm-dd
    });
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
      {loading || !user ? null : !canAccess ? (
        <div className="text-sm font-semibold">
          Halaman ini khusus superadmin/uploader. Anda login sebagai{' '}
          <span className="px-2 py-1 border-2 rounded" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}>{user.role}</span>.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2"><List className="size-5" /> Daftar Konten</h2>
          </div>

          {/* Search */}
          <form onSubmit={onSearch} className="grid sm:grid-cols-[1fr_140px] gap-3">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari (nama/genre/tag)"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            />
            <button type="submit" disabled={loadingList} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
              {loadingList ? 'Memuat...' : 'Cari'}
            </button>
          </form>

          {/* Tabs: Tambah Anime | Tambah Episode */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setActiveTab('anime')} className={`px-3 py-2 border-4 rounded-lg font-extrabold`} style={{ boxShadow: '4px 4px 0 #000', background: activeTab === 'anime' ? 'var(--accent-edit)' : 'var(--panel-bg)', color: activeTab === 'anime' ? 'var(--accent-edit-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Tambah Anime</button>
            <button type="button" onClick={() => setActiveTab('episode')} className={`px-3 py-2 border-4 rounded-lg font-extrabold`} style={{ boxShadow: '4px 4px 0 #000', background: activeTab === 'episode' ? 'var(--accent-edit)' : 'var(--panel-bg)', color: activeTab === 'episode' ? 'var(--accent-edit-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Tambah Episode</button>
          </div>

          {/* Form Tambah / Edit Anime */}
          {activeTab === 'anime' && (
          <form onSubmit={onSubmit} className="grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input type="text" value={form.nama_anime} onChange={(e) => setForm((f) => ({ ...f, nama_anime: e.target.value }))} placeholder="Nama anime (wajib)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              <input type="url" value={form.gambar_anime} onChange={(e) => setForm((f) => ({ ...f, gambar_anime: e.target.value }))} placeholder="URL gambar (wajib)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              <input type="text" value={form.rating_anime} onChange={(e) => setForm((f) => ({ ...f, rating_anime: e.target.value }))} placeholder="Rating (wajib)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              <select value={form.status_anime} onChange={(e) => setForm((f) => ({ ...f, status_anime: e.target.value }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <option value="" disabled>Pilih Status (wajib)</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Hiatus">Hiatus</option>
                <option value="Upcoming">Upcoming</option>
              </select>
              <select value={form.label_anime} onChange={(e) => setForm((f) => ({ ...f, label_anime: e.target.value }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <option value="" disabled>Pilih Label (wajib)</option>
                <option value="TV">TV</option>
                <option value="Movie">Movie</option>
                <option value="OVA">OVA</option>
                <option value="ONA">ONA</option>
                <option value="Special">Special</option>
              </select>
              <input type="date" value={form.tanggal_rilis_anime} onChange={(e) => setForm((f) => ({ ...f, tanggal_rilis_anime: e.target.value }))} placeholder="Tanggal rilis (opsional)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
            </div>
            <textarea value={form.sinopsis_anime} onChange={(e) => setForm((f) => ({ ...f, sinopsis_anime: e.target.value }))} placeholder="Sinopsis (wajib)" rows={3} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
            <div className="grid sm:grid-cols-2 gap-3">
              <input type="text" value={form.tags_anime} onChange={(e) => setForm((f) => ({ ...f, tags_anime: e.target.value }))} placeholder="Tags (pisahkan dengan koma)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              <input type="text" value={form.genre_anime} onChange={(e) => setForm((f) => ({ ...f, genre_anime: e.target.value }))} placeholder="Genre (pisahkan dengan koma)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              <input type="text" value={form.studio_anime} onChange={(e) => setForm((f) => ({ ...f, studio_anime: e.target.value }))} placeholder="Studio (pisahkan dengan koma)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              <input type="text" value={form.fakta_menarik} onChange={(e) => setForm((f) => ({ ...f, fakta_menarik: e.target.value }))} placeholder="Fakta menarik (pisahkan dengan koma)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
            </div>
            <div className="grid sm:grid-cols-[160px]">
              <button type="submit" disabled={submittingAnime} className={`flex items-center justify-center gap-2 border-4 rounded-lg font-extrabold disabled:opacity-60`} style={{ boxShadow: '4px 4px 0 #000', background: mode === 'add' ? 'var(--accent-add)' : 'var(--accent-edit)', color: mode === 'add' ? 'var(--accent-add-foreground)' : 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>
                {submittingAnime ? (mode === 'add' ? 'Menambah...' : 'Menyimpan...') : (mode === 'add' ? (<><Plus className="size-4" /> Tambah</>) : (<><Pencil className="size-4" /> Simpan</>))}
              </button>
            </div>
          </form>
          )}

          {/* (HAPUS) Form Bulk dihilangkan */}

          {/* Form Tambah Episode (Global) */}
          {activeTab === 'episode' && (
            <form onSubmit={(e) => { e.preventDefault(); onSubmitCreateEpisodeFromTab(); }} className="grid gap-3 p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="font-extrabold">Tambah Episode</div>
              <div className="grid sm:grid-cols-2 gap-2">
                <div className="relative">
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
                    <div className="absolute z-10 mt-1 w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
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
                              className="w-full text-left px-3 py-2 hover:opacity-90 font-semibold"
                              style={{ color: 'var(--foreground)' }}
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
                <input type="text" value={tabEpisode?.judul_episode || ''} onChange={(e) => setTabEpisode((s) => ({ ...s, judul_episode: e.target.value }))} placeholder="Judul episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                <input type="number" value={tabEpisode?.nomor_episode || 1} onChange={(e) => setTabEpisode((s) => ({ ...s, nomor_episode: Number(e.target.value) }))} placeholder="Nomor episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                <input type="url" value={tabEpisode?.thumbnail_episode || ''} onChange={(e) => setTabEpisode((s) => ({ ...s, thumbnail_episode: e.target.value }))} placeholder="URL thumbnail" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                <input type="number" value={tabEpisode?.durasi_episode || 0} onChange={(e) => setTabEpisode((s) => ({ ...s, durasi_episode: Number(e.target.value) }))} placeholder="Durasi (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                <input type="datetime-local" value={tabEpisode?.tanggal_rilis_episode || ''} onChange={(e) => setTabEpisode((s) => ({ ...s, tanggal_rilis_episode: e.target.value }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>
              <div className="pt-1">
                <div className="font-extrabold mb-2">Qualities</div>
                <div className="space-y-2">
                  {(tabEpisode?.qualities || []).map((q, idx) => (
                    <div key={idx} className="grid sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-2">
                      <input type="text" value={q.nama_quality} onChange={(e) => updateTabQualityField(idx, 'nama_quality', e.target.value)} placeholder="Nama quality (480p/720p/1080p)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                      <input type="url" value={q.source_quality} onChange={(e) => updateTabQualityField(idx, 'source_quality', e.target.value)} placeholder="Source URL" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
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
              <textarea rows={3} value={tabEpisode?.deskripsi_episode || ''} onChange={(e) => setTabEpisode((s) => ({ ...s, deskripsi_episode: e.target.value }))} placeholder="Deskripsi episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              <div className="grid sm:grid-cols-[160px]">
                <button type="submit" disabled={submittingTabEpisode} className="flex items-center justify-center gap-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}>
                  {submittingTabEpisode ? 'Menambah...' : (<><Plus className="size-4" /> Tambah Episode</>)}
                </button>
              </div>
            </form>
          )}

          {/* Table */}
          <div className="overflow-auto">
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
                              <form onSubmit={onSubmitCreateEpisode} className="p-3 border-4 rounded-lg space-y-2" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                                <div className="font-extrabold">Tambah Episode</div>
                                <div className="grid sm:grid-cols-2 gap-2">
                                  <input type="text" value={newEpisode.judul_episode} onChange={(e) => setNewEpisode((s) => ({ ...s, judul_episode: e.target.value }))} placeholder="Judul episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                  <input type="number" value={newEpisode.nomor_episode} onChange={(e) => setNewEpisode((s) => ({ ...s, nomor_episode: Number(e.target.value) }))} placeholder="Nomor episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                  <input type="url" value={newEpisode.thumbnail_episode} onChange={(e) => setNewEpisode((s) => ({ ...s, thumbnail_episode: e.target.value }))} placeholder="URL thumbnail" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                  <input type="number" value={newEpisode.durasi_episode} onChange={(e) => setNewEpisode((s) => ({ ...s, durasi_episode: Number(e.target.value) }))} placeholder="Durasi (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                  <input type="datetime-local" value={newEpisode.tanggal_rilis_episode} onChange={(e) => setNewEpisode((s) => ({ ...s, tanggal_rilis_episode: e.target.value }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                </div>
                                <div className="pt-1">
                                  <div className="font-extrabold mb-2">Qualities</div>
                                  <div className="space-y-2">
                                    {(newEpisode.qualities || []).map((q, idx) => (
                                      <div key={idx} className="grid sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-2">
                                        <input type="text" value={q.nama_quality} onChange={(e) => updateNewQualityField(idx, 'nama_quality', e.target.value)} placeholder="Nama quality (480p/720p/1080p)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                        <input type="url" value={q.source_quality} onChange={(e) => updateNewQualityField(idx, 'source_quality', e.target.value)} placeholder="Source URL" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
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
                                <textarea rows={3} value={newEpisode.deskripsi_episode} onChange={(e) => setNewEpisode((s) => ({ ...s, deskripsi_episode: e.target.value }))} placeholder="Deskripsi episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                <div className="flex items-center gap-2">
                                  <button type="button" disabled={submittingNewEpisode} onClick={cancelCreateEpisode} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Batal</button>
                                  <button type="submit" disabled={submittingNewEpisode} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}>{submittingNewEpisode ? 'Menyimpan...' : 'Simpan'}</button>
                                </div>
                              </form>
                            )}
                            {editingEpisode && editingEpisode.animeId === it.id && (
                              <form onSubmit={onSubmitEpisode} className="p-3 border-4 rounded-lg space-y-2" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                                <div className="font-extrabold">Edit Episode (Mockup)</div>
                                <div className="grid sm:grid-cols-2 gap-2">
                                  <input type="text" value={editingEpisode.judul_episode} onChange={(e) => setEditingEpisode((s) => ({ ...s, judul_episode: e.target.value }))} placeholder="Judul episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                  <input type="number" value={editingEpisode.nomor_episode} onChange={(e) => setEditingEpisode((s) => ({ ...s, nomor_episode: Number(e.target.value) }))} placeholder="Nomor episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                  <input type="url" value={editingEpisode.thumbnail_episode} onChange={(e) => setEditingEpisode((s) => ({ ...s, thumbnail_episode: e.target.value }))} placeholder="URL thumbnail" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                  <input type="number" value={editingEpisode.durasi_episode} onChange={(e) => setEditingEpisode((s) => ({ ...s, durasi_episode: Number(e.target.value) }))} placeholder="Durasi (detik)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                  <input type="datetime-local" value={editingEpisode.tanggal_rilis_episode} onChange={(e) => setEditingEpisode((s) => ({ ...s, tanggal_rilis_episode: e.target.value }))} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                </div>
                                <div className="pt-1">
                                  <div className="font-extrabold mb-2">Qualities</div>
                                  <div className="space-y-2">
                                    {(editingEpisode.qualities || []).map((q, idx) => (
                                      <div key={idx} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
                                        <input type="text" value={q.nama_quality} onChange={(e) => updateQualityField(idx, 'nama_quality', e.target.value)} placeholder="Nama quality (480p/720p/1080p)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                        <input type="url" value={q.source_quality} onChange={(e) => updateQualityField(idx, 'source_quality', e.target.value)} placeholder="Source URL" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                                        <button type="button" onClick={() => removeQuality(idx)} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Hapus</button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2">
                                    <button type="button" onClick={addQuality} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>+ Tambah Quality</button>
                                  </div>
                                </div>
                                <textarea rows={3} value={editingEpisode.deskripsi_episode} onChange={(e) => setEditingEpisode((s) => ({ ...s, deskripsi_episode: e.target.value }))} placeholder="Deskripsi episode" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
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
                                      <div className="font-extrabold">Ep {ep.nomor_episode}: {ep.judul_episode}</div>
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
