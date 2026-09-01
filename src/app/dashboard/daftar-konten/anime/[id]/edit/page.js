'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, Upload, Image as ImageIcon, Film, Trash2, AlertTriangle, Tag as TagIcon, Clock, Calendar, Plus, X, Link, Star, Layers, BookOpen, Hash, Building2, LayoutList, Loader2, CheckCircle2, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getAnimeDetail, updateAnime, deleteAnime, listAnimeGenres, searchProvider, getProviderDetail, getProviderEpisodes, grabAndSaveEpisode } from '@/lib/api';
import GenreSelect from '@/components/dashboard/GenreSelect';
import FileInput from '@/components/dashboard/FileInput';

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

const CONTENT_TYPES = ['ANIME', 'FILM', 'DONGHUA', 'TOKUSATSU'];
const STATUS_OPTIONS = ['ONGOING', 'COMPLETED', 'HIATUS', 'UPCOMING'];
const PROVIDER_OPTIONS = [
  { value: '', label: 'Tidak ada (manual)' },
  { value: 'kuramanime', label: 'Kuramanime' },
  { value: 'kuronime', label: 'Kuronime' },
  { value: 'samehadaku', label: 'Samehadaku' },
];

// API functions imported from @/lib/api

export default function EditAnimePage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const id = params?.id;

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [coverPreview, setCoverPreview] = useState(null);
  const [form, setForm] = useState({
    nama_anime: '',
    sinopsis_anime: '',
    fakta_menarik: '',
    genre_anime: '',
    status_anime: 'ONGOING',
    content_type: 'ANIME',
    studio_anime: '',
    rating_anime: '',
    is_21_plus: false,
    tags_anime: '',
    label_anime: '',
    tanggal_rilis_anime: '',
    cover_mode: 'existing',
    cover_url: '',
    aliases: '',
    provider_source: '',
    provider_url: '',
  });

  // Schedule state for ONGOING anime
  const [schedules, setSchedules] = useState([{ hari: 'Senin', jam: '20:00', is_active: true }]);

  // Provider search state
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [providerSearchResults, setProviderSearchResults] = useState([]);
  const [providerSearching, setProviderSearching] = useState(false);
  const [providerImporting, setProviderImporting] = useState(false);
  const [providerEpisodes, setProviderEpisodes] = useState([]);
  const [providerEpisodesLoading, setProviderEpisodesLoading] = useState(false);
  const [providerUrlSaved, setProviderUrlSaved] = useState(false);
  const [providerUrlLocked, setProviderUrlLocked] = useState(false);
  // Existing episode numbers from DB (for edit page — to block "Ambil" on already-existing episodes)
  const [existingEpisodeNumbers, setExistingEpisodeNumbers] = useState(new Set());
  // Grab status per episode number: { [epNum]: 'loading' | 'success' | 'error' }
  const [grabStatus, setGrabStatus] = useState({});

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

  // Load anime data (REAL API)
  useEffect(() => {
    if (!id || !user) return;
    const loadAnime = async () => {
      setLoadingData(true);
      try {
        const token = getSession()?.token;
        const res = await getAnimeDetail({ token, id });
        const anime = res?.item || res?.data || res;
        if (anime) {
          setForm({
            nama_anime: anime.nama_anime || '',
            sinopsis_anime: anime.sinopsis_anime || '',
            fakta_menarik: anime.fakta_menarik || '',
            genre_anime: Array.isArray(anime.genre_anime) ? anime.genre_anime.join(', ') : (anime.genre_anime || ''),
            status_anime: anime.status_anime || 'ONGOING',
            content_type: anime.content_type || anime.type || 'ANIME',
            studio_anime: anime.studio_anime || '',
            rating_anime: anime.rating_anime || '',
            is_21_plus: anime.is_21_plus || false,
            tags_anime: anime.tags_anime || '',
            label_anime: anime.label_anime || '',
            tanggal_rilis_anime: anime.tanggal_rilis_anime || '',
            cover_mode: 'existing',
            cover_url: '',
            aliases: Array.isArray(anime.aliases)
              ? anime.aliases.map(a => typeof a === 'object' ? a.alias : a).filter(Boolean).join(', ')
              : (anime.aliases || ''),
            provider_source: anime.provider_source || '',
            provider_url: anime.provider_url || '',
          });
          // Auto-lock provider URL if already set in DB
          if (anime.provider_url) setProviderUrlLocked(true);
          // Load schedules if exists for ONGOING anime
          if (anime.schedules?.length > 0) {
            setSchedules(anime.schedules.map(s => ({
              hari: s.hari || 'Senin',
              jam: s.jam || '20:00',
              is_active: s.is_active !== false
            })));
          } else if (anime.status_anime === 'ONGOING') {
            setSchedules([{ hari: 'Senin', jam: '20:00', is_active: true }]);
          }
          setCoverPreview(anime.cover_anime || anime.gambar_anime || null);
          // Save existing episode numbers from DB
          if (Array.isArray(anime.episodes)) {
            setExistingEpisodeNumbers(new Set(anime.episodes.map(e => Number(e.nomor_episode)).filter(n => !isNaN(n))));
          }
        }
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat anime');
      } finally {
        setLoadingData(false);
      }
    };
    loadAnime();
  }, [id, user]);

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // Provider search handler
  const onProviderSearch = async () => {
    if (!form.provider_source || !providerSearchQuery.trim()) return;
    setProviderSearching(true);
    try {
      const token = getSession()?.token;
      const result = await searchProvider({ token, provider: form.provider_source, q: providerSearchQuery.trim() });
      setProviderSearchResults(result?.items || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal mencari di provider');
    } finally {
      setProviderSearching(false);
    }
  };

  // Import anime detail from provider
  const onProviderImport = async (url) => {
    setProviderImporting(true);
    try {
      const token = getSession()?.token;
      const result = await getProviderDetail({ token, provider: form.provider_source, url });
      const data = result?.data;
      if (!data) throw new Error('Data tidak ditemukan');
      setForm((f) => ({
        ...f,
        nama_anime: data.title || f.nama_anime,
        sinopsis_anime: data.synopsis || f.sinopsis_anime,
        genre_anime: (data.genres || []).join(', '),
        status_anime: data.status ? (data.status.toUpperCase().includes('ONGOING') ? 'ONGOING' : data.status.toUpperCase().includes('COMPLETED') ? 'COMPLETED' : f.status_anime) : f.status_anime,
        studio_anime: data.studio || f.studio_anime,
        rating_anime: data.rating || f.rating_anime,
        cover_mode: data.cover_url ? 'url' : f.cover_mode,
        cover_url: data.cover_url || f.cover_url,
        provider_url: url,
      }));
      if (data.cover_url) setCoverPreview(data.cover_url);
      if (data.episodes?.length > 0) setProviderEpisodes(data.episodes);
      toast.success('Data berhasil di-import dari provider!');
      setProviderSearchResults([]);
    } catch (err) {
      toast.error(err?.message || 'Gagal meng-import dari provider');
    } finally {
      setProviderImporting(false);
    }
  };

  // Set provider URL — auto-save to DB
  const onSetProviderUrl = async () => {
    if (!form.provider_url.trim()) {
      toast.error('URL provider tidak boleh kosong');
      return;
    }
    setProviderUrlSaved(true);
    try {
      const token = getSession()?.token;
      await updateAnime({ token, id, payload: { provider_source: form.provider_source, provider_url: form.provider_url.trim() } });
      setProviderUrlLocked(true);
      toast.success('Provider URL disimpan ke database!');
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan provider URL');
    } finally {
      setTimeout(() => setProviderUrlSaved(false), 2000);
    }
  };

  // Fetch episode list from provider URL
  const onFetchEpisodes = async () => {
    if (!form.provider_source || !form.provider_url.trim()) {
      toast.error('Pilih provider dan isi URL dulu');
      return;
    }
    setProviderEpisodesLoading(true);
    try {
      const token = getSession()?.token;
      const result = await getProviderEpisodes({ token, provider: form.provider_source, url: form.provider_url.trim() });
      setProviderEpisodes(result?.episodes || []);
      if (!result?.episodes?.length) toast.error('Tidak ada episode ditemukan');
    } catch (err) {
      toast.error(err?.message || 'Gagal mengambil episode');
    } finally {
      setProviderEpisodesLoading(false);
    }
  };

  // Ambil episode — fetch streams from provider + save to DB
  const onAmbilEpisode = async (ep) => {
    setGrabStatus((s) => ({ ...s, [ep.episode_number]: 'loading' }));
    try {
      const token = getSession()?.token;
      const result = await grabAndSaveEpisode({
        token,
        provider: form.provider_source,
        episodeUrl: ep.url,
        animeId: id,
        episodeNumber: ep.episode_number,
        server: (form.provider_source === 'samehadaku') ? 'all' : (form.provider_source === 'kuronime' ? 'auto' : 'kuramadrive'),
      });
      if (result?.success) {
        setGrabStatus((s) => ({ ...s, [ep.episode_number]: 'success' }));
        // Mark episode as existing (so button becomes "Done")
        setExistingEpisodeNumbers((prev) => new Set([...prev, ep.episode_number]));
        toast.success(result.message || `Episode ${ep.episode_number} berhasil di-update!`);
      } else {
        setGrabStatus((s) => ({ ...s, [ep.episode_number]: 'error' }));
        toast.error(result?.message || `Gagal grab episode ${ep.episode_number}`);
      }
    } catch (err) {
      setGrabStatus((s) => ({ ...s, [ep.episode_number]: 'error' }));
      toast.error(err?.message || `Gagal grab episode ${ep.episode_number}`);
    }
  };

  // Ambil semua episode yang belum ada di DB
  const onAmbilSemuaEpisode = async () => {
    const toGrab = providerEpisodes.filter((ep) => !existingEpisodeNumbers.has(ep.episode_number));
    if (toGrab.length === 0) {
      toast.error('Tidak ada episode baru untuk di-grab');
      return;
    }
    toast.success(`Memulai grab ${toGrab.length} episode...`);
    for (const ep of toGrab) {
      await onAmbilEpisode(ep);
      // Small delay between grabs to avoid overwhelming Puppeteer
      await new Promise((r) => setTimeout(r, 1000));
    }
    toast.success('Selesai grab semua episode!');
  };

  const onCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, cover_mode: 'upload' }));
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = getSession()?.token;
      const genreArr = form.genre_anime
        ? form.genre_anime.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const payload = {
        nama_anime: form.nama_anime,
        sinopsis_anime: form.sinopsis_anime,
        fakta_menarik: form.fakta_menarik || undefined,
        genre_anime: genreArr.length > 0 ? genreArr : undefined,
        status_anime: form.status_anime,
        content_type: form.content_type,
        type: form.content_type,
        studio_anime: form.studio_anime,
        rating_anime: form.rating_anime ? Number(form.rating_anime) : undefined,
        is_21_plus: form.is_21_plus,
        tags_anime: form.tags_anime,
        label_anime: form.label_anime,
        tanggal_rilis_anime: form.tanggal_rilis_anime || undefined,
        provider_source: form.provider_source || undefined,
        provider_url: form.provider_url || undefined,
      };

      // Add aliases if filled
      if (form.aliases?.trim()) {
        payload.aliases = form.aliases.trim();
      }

      // Add schedules for ONGOING status
      if (form.status_anime === 'ONGOING' && schedules.length > 0) {
        const validSchedules = schedules
          .filter(s => s.hari && s.jam)
          .map(s => ({
            hari: s.hari,
            jam: s.jam,
            is_active: s.is_active !== false
          }));
        if (validSchedules.length > 0) {
          payload.schedules = validSchedules;
        }
      }
      // Handle cover update
      if (form.cover_mode === 'upload' && coverPreview) {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput?.files?.[0]) {
          payload.image = fileInput.files[0];
        }
      } else if (form.cover_mode === 'url' && form.cover_url) {
        payload.gambar_anime = form.cover_url;
      }
      await updateAnime({ token, id, payload });
      toast.success('Anime berhasil diperbarui!');
    } catch (err) {
      toast.error(err?.message || 'Gagal memperbarui anime');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm('Yakin ingin menghapus anime ini? Semua episode akan ikut terhapus. Aksi ini tidak bisa dibatalkan.')) return;
    setDeleting(true);
    try {
      const token = getSession()?.token;
      await deleteAnime({ token, id });
      toast.success('Anime dihapus!');
      router.push('/dashboard/daftar-konten/anime');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus anime');
      setDeleting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-3 border-[var(--accent-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6 min-w-0 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/daftar-konten/anime/${id}`)}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">Edit Anime</h1>
            <p className="text-sm text-[var(--foreground)]/70">{form.nama_anime}</p>
          </div>
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold text-red-500 disabled:opacity-60 transition-all hover:translate-y-[-2px]"
          style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'rgba(239,68,68,0.1)', borderColor: 'var(--panel-border)' }}
        >
          <Trash2 className={`w-4 h-4 ${deleting ? 'animate-pulse' : ''}`} />
          {deleting ? 'Menghapus...' : 'Hapus'}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Provider Section */}
        <div className="rounded-2xl border-2 p-5" style={{ boxShadow: '6px 6px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5" /> Provider (Import Otomatis)
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Provider</label>
              <select
                value={form.provider_source}
                onChange={(e) => { updateField('provider_source', e.target.value); setProviderSearchResults([]); setProviderEpisodes([]); }}
                className="input"
              >
                {PROVIDER_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Provider URL</label>
              <div className="flex gap-2">
                <div className="input-icon flex-1">
                  <Link className="input-icon__icon" />
                  <input
                    type="url"
                    placeholder="https://v20.kuramanime.ing/anime/..."
                    value={form.provider_url}
                    onChange={(e) => updateField('provider_url', e.target.value)}
                    disabled={providerUrlLocked}
                    className="input"
                    style={providerUrlLocked ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                  />
                </div>
                {providerUrlLocked ? (
                  <button
                    type="button"
                    onClick={() => { setProviderUrlLocked(false); setProviderEpisodes([]); }}
                    className="rounded-xl border-2 px-4 py-2 font-bold transition-all hover:translate-y-[-2px] whitespace-nowrap"
                    style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSetProviderUrl}
                    disabled={!form.provider_url.trim()}
                    className="rounded-xl border-2 px-4 py-2 font-bold transition-all hover:translate-y-[-2px] disabled:opacity-50 whitespace-nowrap"
                    style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: providerUrlSaved ? 'var(--accent-success, #22c55e)' : 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}
                  >
                    {providerUrlSaved ? <CheckCircle2 className="w-4 h-4" /> : 'Set'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {form.provider_source && (
            <div className="mt-4 space-y-3">
              {/* Fetch episodes button */}
              {form.provider_url && (
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={onFetchEpisodes}
                    disabled={providerEpisodesLoading}
                    className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold transition-all hover:translate-y-[-2px] disabled:opacity-50"
                    style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}
                  >
                    {providerEpisodesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Cari Episode
                  </button>
                  {providerEpisodes.length > 0 && (
                    <button
                      type="button"
                      onClick={onAmbilSemuaEpisode}
                      className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold transition-all hover:translate-y-[-2px]"
                      style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                    >
                      Ambil Semua ({providerEpisodes.filter(ep => !existingEpisodeNumbers.has(ep.episode_number)).length})
                    </button>
                  )}
                </div>
              )}

              {/* Episode list from provider */}
              {providerEpisodes.length > 0 && (
                <div className="space-y-1 max-h-72 overflow-y-auto rounded-xl border-2 p-2" style={{ borderColor: 'var(--panel-border)' }}>
                  {providerEpisodes.map((ep, idx) => {
                    const epExists = existingEpisodeNumbers.has(ep.episode_number);
                    const status = grabStatus[ep.episode_number];
                    const isLoading = status === 'loading';
                    return (
                      <div key={idx} className="flex items-center gap-3 rounded-lg border p-2" style={{ borderColor: 'var(--panel-border)', opacity: epExists && !isLoading ? 0.6 : 1 }}>
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: epExists ? 'var(--panel-border)' : 'var(--accent-primary)', color: epExists ? 'var(--foreground)' : 'var(--accent-primary-foreground)' }}>
                          {ep.episode_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[var(--foreground)] truncate">
                            {ep.label || `Episode ${ep.episode_number}`}
                            {epExists && <span className="ml-2 text-xs text-[var(--foreground)]/50">(sudah ada)</span>}
                          </p>
                          <p className="text-xs text-[var(--foreground)]/50 truncate">{ep.url}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAmbilEpisode(ep)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition-all"
                          style={{
                            background: status === 'success' || epExists ? 'var(--accent-success, #22c55e)' : status === 'error' ? 'var(--accent-danger, #ef4444)' : 'var(--accent-primary)',
                            borderColor: 'var(--panel-border)',
                            color: 'var(--accent-primary-foreground)',
                            cursor: isLoading ? 'wait' : 'pointer',
                            opacity: isLoading ? 0.7 : 1,
                          }}
                        >
                          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : status === 'success' || epExists ? <CheckCircle2 className="w-3 h-3" /> : null}
                          {isLoading ? 'Grabbing...' : status === 'success' ? 'Done' : status === 'error' ? 'Retry' : epExists ? 'Update' : 'Ambil'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cover Section */}
        <div className="rounded-2xl border-2 p-5" style={{ boxShadow: '6px 6px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" /> Cover Anime
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <div className="aspect-[3/4] rounded-xl border-2 overflow-hidden flex items-center justify-center" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                {coverPreview ? (
                  <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-10 h-10 mx-auto text-[var(--foreground)]/30" />
                    <p className="mt-2 text-xs text-[var(--foreground)]/50">No Image</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateField('cover_mode', 'existing')}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-xs font-bold transition-all ${form.cover_mode === 'existing' ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                  style={{ background: form.cover_mode === 'existing' ? 'var(--accent-primary)' : 'var(--panel-bg)', color: form.cover_mode === 'existing' ? 'var(--accent-primary-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                >
                  Existing
                </button>
                <button
                  type="button"
                  onClick={() => updateField('cover_mode', 'upload')}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-xs font-bold transition-all ${form.cover_mode === 'upload' ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                  style={{ background: form.cover_mode === 'upload' ? 'var(--accent-primary)' : 'var(--panel-bg)', color: form.cover_mode === 'upload' ? 'var(--accent-primary-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                >
                  <Upload className="w-3 h-3 inline mr-1" /> Upload
                </button>
                <button
                  type="button"
                  onClick={() => updateField('cover_mode', 'url')}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-xs font-bold transition-all ${form.cover_mode === 'url' ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                  style={{ background: form.cover_mode === 'url' ? 'var(--accent-primary)' : 'var(--panel-bg)', color: form.cover_mode === 'url' ? 'var(--accent-primary-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                >
                  URL
                </button>
              </div>

              {form.cover_mode === 'upload' && (
                <FileInput
                  accept="image/*"
                  onChange={onCoverChange}
                  placeholder="Pilih cover anime baru..."
                />
              )}
              {form.cover_mode === 'url' && (
                <div className="input-icon">
                  <Link className="input-icon__icon" />
                  <input type="url" placeholder="https://example.com/cover.jpg" value={form.cover_url} onChange={(e) => updateField('cover_url', e.target.value)} className="input" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-2xl border-2 p-5" style={{ boxShadow: '6px 6px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Film className="w-5 h-5" /> Informasi Dasar
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Judul Anime *</label>
              <div className="input-icon">
                <Film className="input-icon__icon" />
                <input required type="text" value={form.nama_anime} onChange={(e) => updateField('nama_anime', e.target.value)} className="input" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Sinopsis</label>
              <div className="input-icon">
                <BookOpen className="input-icon__icon input-icon__icon--top" />
                <textarea rows={4} value={form.sinopsis_anime} onChange={(e) => updateField('sinopsis_anime', e.target.value)} className="input resize-none" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Fakta Menarik</label>
              <div className="input-icon">
                <Star className="input-icon__icon input-icon__icon--top" />
                <textarea rows={3} value={form.fakta_menarik} onChange={(e) => updateField('fakta_menarik', e.target.value)} placeholder="Tuliskan fakta unik atau menarik tentang anime ini..." className="input resize-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Genre</label>
              <GenreSelect
                value={form.genre_anime}
                onChange={(val) => updateField('genre_anime', val)}
                fetchGenres={(params) => listAnimeGenres({ token: getSession()?.token, ...params })}
                placeholder="Cari genre anime..."
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Studio</label>
              <div className="input-icon">
                <Building2 className="input-icon__icon" />
                <input type="text" value={form.studio_anime} onChange={(e) => updateField('studio_anime', e.target.value)} className="input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Tipe Konten</label>
              <select value={form.content_type} onChange={(e) => updateField('content_type', e.target.value)} className="select">
                {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Status</label>
              <select value={form.status_anime} onChange={(e) => updateField('status_anime', e.target.value)} className="select">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Rating</label>
              <div className="input-icon">
                <Star className="input-icon__icon" />
                <input type="number" min="0" max="10" step="0.1" value={form.rating_anime} onChange={(e) => updateField('rating_anime', e.target.value)} className="input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Tanggal Rilis</label>
              <div className="input-icon">
                <Calendar className="input-icon__icon" />
                <input type="date" value={form.tanggal_rilis_anime} onChange={(e) => updateField('tanggal_rilis_anime', e.target.value)} className="input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Tags</label>
              <div className="input-icon">
                <Hash className="input-icon__icon" />
                <input type="text" value={form.tags_anime} onChange={(e) => updateField('tags_anime', e.target.value)} className="input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Format Tayang</label>
              <select value={form.label_anime} onChange={(e) => updateField('label_anime', e.target.value)} className="select">
                <option value="">Pilih format...</option>
                <option value="TV">TV</option>
                <option value="Movie">Movie</option>
                <option value="ONA">ONA</option>
                <option value="OVA">OVA</option>
                <option value="Special">Special</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateField('is_21_plus', !form.is_21_plus)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_21_plus ? 'bg-red-500' : 'bg-gray-400'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_21_plus ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm font-bold text-[var(--foreground)]">Konten 21+ (Dewasa)</span>
          </div>
        </div>

        {/* Schedule Section - Only for ONGOING status */}
        {form.status_anime === 'ONGOING' && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Jadwal Rilis <span className="text-red-500">*</span>
              </h2>
              <span className="text-xs text-[var(--foreground)]/60 bg-yellow-500/20 px-2 py-1 rounded">
                Wajib untuk anime ONGOING
              </span>
            </div>

            <div className="space-y-3">
              {schedules.map((schedule, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border-2" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                  <select
                    value={schedule.hari}
                    onChange={(e) => {
                      const newSchedules = [...schedules];
                      newSchedules[index] = { ...schedule, hari: e.target.value };
                      setSchedules(newSchedules);
                    }}
                    className="w-full sm:w-auto rounded-lg border-2 px-3 py-2 text-sm font-semibold"
                    style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                  >
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Clock className="w-4 h-4 text-[var(--foreground)]/50" />
                    <input
                      type="time"
                      value={schedule.jam}
                      onChange={(e) => {
                        const newSchedules = [...schedules];
                        newSchedules[index] = { ...schedule, jam: e.target.value };
                        setSchedules(newSchedules);
                      }}
                      className="flex-1 sm:flex-none rounded-lg border-2 px-3 py-2 text-sm font-semibold"
                      style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newSchedules = [...schedules];
                      newSchedules[index] = { ...schedule, is_active: !schedule.is_active };
                      setSchedules(newSchedules);
                    }}
                    className={`w-full sm:w-auto px-3 py-2 rounded-lg text-sm font-bold transition-colors ${schedule.is_active ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-600'}`}
                  >
                    {schedule.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>

                  {schedules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSchedules(schedules.filter((_, i) => i !== index))}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSchedules([...schedules, { hari: 'Senin', jam: '20:00', is_active: true }])}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all hover:translate-y-[-2px]"
              style={{ boxShadow: '2px 2px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
            >
              <Plus className="w-4 h-4" /> Tambah Jadwal
            </button>
          </div>
        )}

        {/* Aliases Field */}
        <div className="card p-5">
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <TagIcon className="w-5 h-5" /> Alias / Judul Lain
          </h2>
          <textarea
            rows={3}
            value={form.aliases}
            onChange={(e) => updateField('aliases', e.target.value)}
            placeholder="Masukkan alias anime (pisahkan dengan koma atau baris baru)&#10;Contoh: Naruto Shippuden, Boruto, Naruto TV"
            className="input"
          />
          <p className="text-xs text-[var(--foreground)]/60 mt-2">
            Alias membantu pencarian anime dengan nama lain
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/daftar-konten/anime/${id}`)}
            className="rounded-xl border-2 px-6 py-3 font-bold transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-6 py-3 font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '6px 6px 0 rgba(212,212,212,0.15)', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
