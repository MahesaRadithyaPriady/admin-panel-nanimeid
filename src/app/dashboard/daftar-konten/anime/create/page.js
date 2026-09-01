'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, Upload, Image as ImageIcon, X, Plus, Film, CheckCircle2, Loader2, Trash2, Copy, ChevronDown, ChevronUp, AlertCircle, Tag as TagIcon, Clock, Calendar, Play, Link, Star, Layers, BookOpen, Hash, Building2, LayoutList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { createAnime, batchCreateEpisodes, listAnimeGenres, listProviders, searchProvider, getProviderDetail, getProviderEpisodes, grabAndSaveEpisode } from '@/lib/api';
import GenreSelect from '@/components/dashboard/GenreSelect';
import FileInput from '@/components/dashboard/FileInput';
import { EpisodeForm, getEpisodeQualities, createEmptyEpisode } from '@/components/EpisodeForm';

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


export default function CreateAnimePage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const [saving, setSaving] = useState(false);
  const [coverPreview, setCoverPreview] = useState(null);
  const [form, setForm] = useState({
    nama_anime: '',
    sinopsis_anime: '',
    genre_anime: '',
    status_anime: 'ONGOING',
    content_type: 'ANIME',
    studio_anime: '',
    rating_anime: '',
    is_21_plus: false,
    tags_anime: '',
    label_anime: '',
    tanggal_rilis_anime: '',
    cover_mode: 'upload',
    cover_url: '',
    aliases: '',
    fakta_menarik: '',
    provider_source: '',
    provider_url: '',
  });

  // Schedule state for ONGOING anime
  const [schedules, setSchedules] = useState([{ hari: 'Senin', jam: '20:00', is_active: true }]);

  // Episode batch upload states
  const [addEpisodesAfter, setAddEpisodesAfter] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [savingEpisodes, setSavingEpisodes] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [expandedEpisode, setExpandedEpisode] = useState(null);

  // Provider search state
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [providerSearchResults, setProviderSearchResults] = useState([]);
  const [providerSearching, setProviderSearching] = useState(false);
  const [providerImporting, setProviderImporting] = useState(false);
  const [providerEpisodes, setProviderEpisodes] = useState([]);
  const [providerEpisodesLoading, setProviderEpisodesLoading] = useState(false);
  const [providerUrlSaved, setProviderUrlSaved] = useState(false);
  const [providerUrlLocked, setProviderUrlLocked] = useState(false);
  // Grab status per episode number: { [epNum]: 'loading' | 'success' | 'error' }
  const [grabStatus, setGrabStatus] = useState({});
  // Track auto-created anime ID (after first grab)
  const [createdAnimeId, setCreatedAnimeId] = useState(null);

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

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

  // Import anime detail from provider (auto-fill form + fetch episodes)
  const onProviderImport = async (url) => {
    setProviderImporting(true);
    try {
      const token = getSession()?.token;
      const result = await getProviderDetail({ token, provider: form.provider_source, url });
      const data = result?.data;
      if (!data) throw new Error('Data tidak ditemukan');
      // Auto-fill form fields from provider data
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
      // Set episode list from detail
      if (data.episodes?.length > 0) {
        setProviderEpisodes(data.episodes);
      }
      toast.success('Data berhasil di-import dari provider!');
      setProviderSearchResults([]);
    } catch (err) {
      toast.error(err?.message || 'Gagal meng-import dari provider');
    } finally {
      setProviderImporting(false);
    }
  };

  // Set provider URL (save to form state, will be saved to DB on submit)
  const onSetProviderUrl = () => {
    if (!form.provider_url.trim()) {
      toast.error('URL provider tidak boleh kosong');
      return;
    }
    setProviderUrlSaved(true);
    setProviderUrlLocked(true);
    toast.success('Provider URL disimpan! Klik "Cari Episode" untuk load list episode.');
    setTimeout(() => setProviderUrlSaved(false), 2000);
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

  // Auto-create anime if not yet created (needed before grab episode)
  const ensureAnimeCreated = async () => {
    if (createdAnimeId) return createdAnimeId;
    const token = getSession()?.token;
    // Validate required fields
    if (!form.nama_anime?.trim()) {
      toast.error('Isi nama anime dulu sebelum grab episode');
      throw new Error('Nama anime wajib');
    }
    toast.success('Membuat anime terlebih dahulu...');
    const result = await createAnime({ token, data: form });
    const newId = result?.item?.id || result?.data?.id || result?.id;
    if (!newId) throw new Error('Gagal membuat anime');
    setCreatedAnimeId(newId);
    toast.success(`Anime dibuat (ID: ${newId}), lanjut grab episode...`);
    return newId;
  };

  // Ambil episode — auto-create anime + grab streams + download to CDN
  const onAmbilEpisode = async (ep) => {
    setGrabStatus((s) => ({ ...s, [ep.episode_number]: 'loading' }));
    try {
      // Ensure anime exists in DB
      const animeId = await ensureAnimeCreated();
      const token = getSession()?.token;
      const result = await grabAndSaveEpisode({
        token,
        provider: form.provider_source,
        episodeUrl: ep.url,
        animeId,
        episodeNumber: ep.episode_number,
        server: (form.provider_source === 'samehadaku') ? 'all' : (form.provider_source === 'kuronime' ? 'auto' : 'kuramadrive'),
      });
      if (result?.success) {
        setGrabStatus((s) => ({ ...s, [ep.episode_number]: 'success' }));
        toast.success(result.message || `Episode ${ep.episode_number} berhasil di-grab!`);
      } else {
        setGrabStatus((s) => ({ ...s, [ep.episode_number]: 'error' }));
        toast.error(result?.message || `Gagal grab episode ${ep.episode_number}`);
      }
    } catch (err) {
      setGrabStatus((s) => ({ ...s, [ep.episode_number]: 'error' }));
      toast.error(err?.message || `Gagal grab episode ${ep.episode_number}`);
    }
  };

  // Ambil semua episode
  const onAmbilSemuaEpisode = async () => {
    if (!providerEpisodes.length) return;
    const toGrab = providerEpisodes.filter((ep) => grabStatus[ep.episode_number] !== 'success');
    if (toGrab.length === 0) {
      toast.error('Semua episode sudah di-grab');
      return;
    }
    toast.success(`Memulai grab ${toGrab.length} episode...`);
    for (const ep of toGrab) {
      await onAmbilEpisode(ep);
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

      // Prepare payload
      const genreArr = form.genre_anime
        ? form.genre_anime.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const payload = {
        nama_anime: form.nama_anime,
        sinopsis_anime: form.sinopsis_anime,
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
        fakta_menarik: form.fakta_menarik || undefined,
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

      // Handle cover
      if (form.cover_mode === 'upload' && coverPreview) {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput?.files?.[0]) {
          payload.image = fileInput.files[0];
        }
      } else if (form.cover_mode === 'url' && form.cover_url) {
        payload.gambar_anime = form.cover_url;
      }

      // Step 1: Create Anime (or use already auto-created anime from grab)
      let animeData;
      if (createdAnimeId) {
        // Anime already created via grab episode — just update it with full form data
        animeData = { id: createdAnimeId };
        toast.success('Anime sudah dibuat via grab, lanjut simpan episode...');
      } else {
        const result = await createAnime({ token, payload });
        animeData = result?.item ?? result?.data ?? result;

        if (!animeData?.id) {
          throw new Error('Gagal mendapatkan ID anime dari response');
        }

        toast.success('Anime berhasil dibuat!');
      }

      // Step 2: Create Episodes if any filled episodes exist
      const filledEpisodes = episodes.filter(ep => {
        const hasJudul = ep.judul_episode?.trim?.() || false;
        const allQualities = getEpisodeQualities(ep);
        const hasQuality = Object.values(allQualities).some(q => q?.trim?.() !== '');
        return hasJudul && hasQuality;
      });

      if (addEpisodesAfter && filledEpisodes.length > 0) {
        setSavingEpisodes(true);
        setProgress({ current: 0, total: filledEpisodes.length });
        
        toast.success(`Memulai upload ${filledEpisodes.length} episode...`);

        // Format episodes untuk API
        const formattedEpisodes = filledEpisodes.map((ep) => {
          const epData = {
            nomor_episode: Number(ep.nomor_episode),
            judul_episode: ep.judul_episode,
            deskripsi_episode: ep.deskripsi_episode || null,
            intro_start_seconds: ep.intro_start_seconds ?? 0,
            intro_duration_seconds: ep.intro_duration_seconds ?? 90,
            outro_start_seconds: ep.outro_start_seconds ?? null,
            outro_duration_seconds: ep.outro_duration_seconds ?? 90,
            qualities: Object.entries(getEpisodeQualities(ep))
              .filter(([_, url]) => url.trim() !== '')
              .map(([quality, url]) => ({
                nama_quality: quality,
                source_quality: url.trim(),
              })),
          };
          
          return epData;
        });

        const epResult = await batchCreateEpisodes({
          token,
          animeId: animeData.id,
          episodes: formattedEpisodes,
        });

        setProgress({ current: epResult?.success || 0, total: filledEpisodes.length });

        if (epResult?.failed > 0) {
          toast.success(`✅ ${epResult.success} episode berhasil, ❌ ${epResult.failed} gagal`);
        } else {
          toast.success(`✅ ${epResult?.success || filledEpisodes.length} episode berhasil disimpan!`);
        }

        // Redirect ke halaman anime detail
        setTimeout(() => {
          router.push(`/dashboard/daftar-konten/anime/${animeData.id}`);
        }, 1500);
      } else {
        // No episodes to add, redirect to anime list
        router.push('/dashboard/daftar-konten/anime');
      }
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat anime');
    } finally {
      setSaving(false);
      setSavingEpisodes(false);
    }
  };

  // Initialize episodes when toggle is turned on
  useEffect(() => {
    if (addEpisodesAfter && episodes.length === 0) {
      setEpisodes([createEmptyEpisode(1)]);
    }
  }, [addEpisodesAfter]);

  // Episode handlers
  const addOneEpisode = () => {
    const lastEp = episodes.length > 0 
      ? Math.max(...episodes.map(e => Number(e.nomor_episode) || 0))
      : 0;
    
    const newEpisode = createEmptyEpisode(lastEp + 1);
    setEpisodes([...episodes, newEpisode]);
    toast.success('Episode baru ditambahkan!');
  };

  const removeEpisode = (tempId) => {
    setEpisodes(episodes.filter(ep => ep.id !== tempId));
  };

  const updateEpisode = (tempId, updatedEpisode) => {
    setEpisodes(episodes.map(ep => ep.id === tempId ? updatedEpisode : ep));
  };

  const copyFromPrevious = (index) => {
    if (index === 0) return;
    const prev = episodes[index - 1];
    const current = episodes[index];
    
    setEpisodes(episodes.map((ep, i) => {
      if (i !== index) return ep;
      return {
        ...ep,
        judul_episode: prev.judul_episode || `Episode ${ep.nomor_episode}`,
        intro_start_seconds: prev.intro_start_seconds,
        intro_duration_seconds: prev.intro_duration_seconds,
        outro_start_seconds: prev.outro_start_seconds,
        outro_duration_seconds: prev.outro_duration_seconds,
        qualities: { ...prev.qualities },
        hiddenQualities: prev.hiddenQualities ? [...prev.hiddenQualities] : [],
        customQualities: prev.customQualities ? [...prev.customQualities] : [],
        deskripsi_episode: prev.deskripsi_episode || '',
      };
    }));
    toast.success('Data dari episode sebelumnya disalin!');
  };

  const validateEpisodes = () => {
    const errors = [];
    episodes.forEach((ep, idx) => {
      if (!ep.judul_episode.trim()) {
        errors.push(`Episode ${ep.nomor_episode}: Judul wajib diisi`);
      }
      const allQualities = getEpisodeQualities(ep);
      const hasAnyQuality = Object.values(allQualities).some(q => q.trim() !== '');
      if (!hasAnyQuality) {
        errors.push(`Episode ${ep.nomor_episode}: Minimal 1 link video wajib diisi`);
      }
    });
    return errors;
  };

  const onSubmitEpisodes = async () => {
    const errors = validateEpisodes();
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    if (!confirm(`Yakin ingin menyimpan ${episodes.length} episode sekaligus?`)) return;

    setSavingEpisodes(true);
    setProgress({ current: 0, total: episodes.length });

    try {
      const token = getSession()?.token;
      const animeId = createdAnime.id;

      // Format episodes untuk API
      const formattedEpisodes = episodes.map((ep, idx) => {
        const epData = {
          nomor_episode: Number(ep.nomor_episode),
          judul_episode: ep.judul_episode,
          deskripsi_episode: ep.deskripsi_episode || null,
          intro_start_seconds: ep.intro_start_seconds ?? 0,
          intro_duration_seconds: ep.intro_duration_seconds ?? 90,
          outro_start_seconds: ep.outro_start_seconds ?? null,
          outro_duration_seconds: ep.outro_duration_seconds ?? 90,
          qualities: Object.entries(getEpisodeQualities(ep))
            .filter(([_, url]) => url.trim() !== '')
            .map(([quality, url]) => ({
              nama_quality: quality,
              source_quality: url.trim(),
            })),
        };
        
        return epData;
      });

      // Update all status to uploading
      setEpisodes(prev => prev.map(e => ({ ...e, status: 'uploading' })));

      // Call batch API
      const result = await batchCreateEpisodes({
        token,
        animeId,
        episodes: formattedEpisodes,
      });

      // Update status based on result
      if (result?.items) {
        result.items.forEach((item, idx) => {
          setEpisodes(prev => prev.map((e, i) =>
            i === idx ? { ...e, status: item.success ? 'done' : 'error' } : e
          ));
        });
      }

      setProgress({ current: result?.success || 0, total: episodes.length });

      if (result?.failed > 0) {
        toast.success(`✅ ${result.success} episode berhasil, ❌ ${result.failed} gagal`);
        if (result.errors) {
          result.errors.forEach(err => toast.error(`Ep ${err.nomor_episode}: ${err.error}`));
        }
      } else {
        toast.success(`✅ ${result?.success || episodes.length} episode berhasil disimpan!`);
      }

      // Redirect setelah 2 detik
      setTimeout(() => {
        router.push(`/dashboard/daftar-konten/anime/${animeId}`);
      }, 2000);
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan episode');
      setEpisodes(prev => prev.map(e => ({ ...e, status: 'error' })));
    } finally {
      setSavingEpisodes(false);
    }
  };

  const filledCount = episodes.filter(ep => {
    const hasJudul = ep.judul_episode?.trim?.() || false;
    const allQualities = getEpisodeQualities(ep);
    const hasQuality = Object.values(allQualities).some(q => q?.trim?.() !== '');
    return hasJudul && hasQuality;
  }).length;

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6 min-w-0 max-w-4xl mx-auto">
      {loading || !user ? null : (
        // Anime Creation Form with optional Episode section
        <>
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/daftar-konten/anime')}
              className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold transition-all hover:translate-y-[-2px]"
              style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">Tambah Anime Baru</h1>
              <p className="text-sm text-[var(--foreground)]/70">
                {addEpisodesAfter ? `Anime + ${filledCount} episode akan dibuat` : 'Isi detail anime di bawah ini'}
              </p>
            </div>
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
                          Ambil Semua ({providerEpisodes.filter(ep => grabStatus[ep.episode_number] !== 'success').length})
                        </button>
                      )}
                    </div>
                  )}

                  {/* Episode list from provider */}
                  {providerEpisodes.length > 0 && (
                    <div className="space-y-1 max-h-72 overflow-y-auto rounded-xl border-2 p-2" style={{ borderColor: 'var(--panel-border)' }}>
                      {providerEpisodes.map((ep, idx) => {
                        const status = grabStatus[ep.episode_number];
                        const isLoading = status === 'loading';
                        const isDone = status === 'success';
                        return (
                          <div key={idx} className="flex items-center gap-3 rounded-lg border p-2" style={{ borderColor: 'var(--panel-border)', opacity: isDone && !isLoading ? 0.6 : 1 }}>
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: isDone ? 'var(--accent-success, #22c55e)' : 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}>
                              {ep.episode_number}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[var(--foreground)] truncate">
                                {ep.label || `Episode ${ep.episode_number}`}
                                {isDone && <span className="ml-2 text-xs text-[var(--foreground)]/50">(sudah di-grab)</span>}
                              </p>
                              <p className="text-xs text-[var(--foreground)]/50 truncate">{ep.url}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onAmbilEpisode(ep)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition-all"
                              style={{
                                background: isDone ? 'var(--accent-success, #22c55e)' : status === 'error' ? 'var(--accent-danger, #ef4444)' : 'var(--accent-primary)',
                                borderColor: 'var(--panel-border)',
                                color: 'var(--accent-primary-foreground)',
                                cursor: isLoading ? 'wait' : 'pointer',
                                opacity: isLoading ? 0.7 : 1,
                              }}
                            >
                              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isDone ? <CheckCircle2 className="w-3 h-3" /> : null}
                              {isLoading ? 'Grabbing...' : isDone ? 'Done' : status === 'error' ? 'Retry' : 'Ambil'}
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
                {/* Preview */}
                <div className="w-full sm:w-48">
                  <div className="aspect-[3/4] rounded-xl border-2 overflow-hidden flex items-center justify-center" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                    {coverPreview ? (
                      <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-10 h-10 mx-auto text-[var(--foreground)]/30" />
                        <p className="mt-2 text-xs text-[var(--foreground)]/50">Preview</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Options */}
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateField('cover_mode', 'upload')}
                      className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all ${form.cover_mode === 'upload' ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                      style={{ background: form.cover_mode === 'upload' ? 'var(--accent-primary)' : 'var(--panel-bg)', color: form.cover_mode === 'upload' ? 'var(--accent-primary-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                    >
                      <Upload className="w-4 h-4 inline mr-2" /> Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('cover_mode', 'url')}
                      className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all ${form.cover_mode === 'url' ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                      style={{ background: form.cover_mode === 'url' ? 'var(--accent-primary)' : 'var(--panel-bg)', color: form.cover_mode === 'url' ? 'var(--accent-primary-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                    >
                      URL
                    </button>
                  </div>

                  {form.cover_mode === 'upload' ? (
                    <FileInput
                      accept="image/*"
                      onChange={onCoverChange}
                      placeholder="Pilih cover anime..."
                    />
                  ) : (
                    <div className="input-icon">
                      <Link className="input-icon__icon" />
                      <input
                        type="url"
                        placeholder="https://example.com/cover.jpg"
                        value={form.cover_url}
                        onChange={(e) => updateField('cover_url', e.target.value)}
                        className="input"
                      />
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
                    <input required type="text" value={form.nama_anime} onChange={(e) => updateField('nama_anime', e.target.value)} placeholder="Masukkan judul anime" className="input" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Sinopsis</label>
                  <div className="input-icon">
                    <BookOpen className="input-icon__icon input-icon__icon--top" />
                    <textarea rows={4} value={form.sinopsis_anime} onChange={(e) => updateField('sinopsis_anime', e.target.value)} placeholder="Ceritakan tentang anime ini..." className="input resize-none" />
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
                    <input type="text" value={form.studio_anime} onChange={(e) => updateField('studio_anime', e.target.value)} placeholder="Nama studio" className="input" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Tipe Konten</label>
                  <select value={form.content_type} onChange={(e) => updateField('content_type', e.target.value)} className="select">
                    {CONTENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Status</label>
                  <select value={form.status_anime} onChange={(e) => updateField('status_anime', e.target.value)} className="select">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Rating (0-10)</label>
                  <div className="input-icon">
                    <Star className="input-icon__icon" />
                    <input type="number" min="0" max="10" step="0.1" value={form.rating_anime} onChange={(e) => updateField('rating_anime', e.target.value)} placeholder="8.5" className="input" />
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
                    <input type="text" value={form.tags_anime} onChange={(e) => updateField('tags_anime', e.target.value)} placeholder="spring-2024, popular" className="input" />
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

              {/* 21+ Toggle */}
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

              {/* Add Episodes After Toggle */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAddEpisodesAfter(!addEpisodesAfter)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${addEpisodesAfter ? 'bg-green-500' : 'bg-gray-400'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${addEpisodesAfter ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm font-bold text-[var(--foreground)]">Tambahkan episode secara langsung</span>
              </div>
            </div>

            {/* Schedule Section - Only for ONGOING status */}
            {form.status_anime === 'ONGOING' && (
              <ScheduleSection 
                schedules={schedules}
                setSchedules={setSchedules}
              />
            )}

            {/* Aliases Field */}
            <div className="rounded-2xl border-2 p-5" style={{ boxShadow: '6px 6px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
              <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <TagIcon className="w-5 h-5" /> Anime Terkait
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

            {/* Episode Batch Section - Shows inline when toggle is on */}
            {addEpisodesAfter && (
              <EpisodeSection
                episodes={episodes}
                setEpisodes={setEpisodes}
                expandedEpisode={expandedEpisode}
                setExpandedEpisode={setExpandedEpisode}
                filledCount={filledCount}
                addOneEpisode={addOneEpisode}
                removeEpisode={removeEpisode}
                updateEpisode={updateEpisode}
                copyFromPrevious={copyFromPrevious}
              />
            )}

            {/* Submit */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard/daftar-konten/anime')}
                className="rounded-xl border-2 px-6 py-3 font-bold transition-all hover:translate-y-[-2px]"
                style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border-2 px-6 py-3 font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px]"
                style={{ boxShadow: '6px 6px 0 rgba(212,212,212,0.15)', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
              >
                <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
                {saving 
                  ? (addEpisodesAfter && filledCount > 0 ? `Menyimpan anime & ${filledCount} episode...` : 'Menyimpan...')
                  : (addEpisodesAfter && filledCount > 0 ? `Simpan Anime + ${filledCount} Episode` : 'Simpan Anime')
                }
              </button>
            </div>
          </form>
        </>
      )}
    </motion.div>
  );
}

// Episode Section Component for inline display in create anime form
function EpisodeSection({
  episodes,
  setEpisodes,
  expandedEpisode,
  setExpandedEpisode,
  filledCount,
  addOneEpisode,
  removeEpisode,
  updateEpisode,
  copyFromPrevious,
}) {
  return (
    <>
      {/* Episode Section Header */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Film className="w-5 h-5" /> Episode Anime
            </h2>
            <p className="text-sm text-[var(--foreground)]/70 mt-1">
              {filledCount}/{episodes.length} episode siap disimpan
            </p>
          </div>
          
          <button
            type="button"
            onClick={addOneEpisode}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
          >
            <Plus className="w-4 h-4" /> Tambah Episode
          </button>
        </div>
      </div>

      {/* Episode List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {episodes.map((ep, index) => (
            <div
              key={ep.id}
              className="card overflow-hidden"
            >
              {/* Episode Header */}
              <div className="flex items-center gap-4 p-4 flex-wrap sm:flex-nowrap">
                {/* Episode Number (Click to expand) */}
                <button
                  type="button"
                  onClick={() => setExpandedEpisode(expandedEpisode === ep.id ? null : ep.id)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
                  style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}
                >
                  {ep.nomor_episode}
                </button>

                {/* Title & Quick Info (Click to expand) */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setExpandedEpisode(expandedEpisode === ep.id ? null : ep.id)}
                >
                  <input
                    type="text"
                    placeholder={`Judul Episode ${ep.nomor_episode}`}
                    value={ep.judul_episode}
                    onChange={(e) => updateEpisode(ep.id, 'judul_episode', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-lg font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-[var(--foreground)]/30 text-[var(--foreground)]"
                  />
                  <div className="flex items-center gap-2 text-xs text-[var(--foreground)]/50 flex-wrap">
                    <span>Ep #{ep.nomor_episode}</span>
                    <span>•</span>
                    <span>{Object.values(getEpisodeQualities(ep)).filter(q => q.trim()).length} quality</span>
                    {ep.durasi_episode && <span>• {Math.round(ep.durasi_episode / 60)} menit</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => copyFromPrevious(index)}
                      className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                      title="Salin data dari episode sebelumnya"
                    >
                      <Copy className="w-4 h-4 text-[var(--foreground)]/60" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeEpisode(ep.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedEpisode(expandedEpisode === ep.id ? null : ep.id)}
                    className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                  >
                    {expandedEpisode === ep.id ? <ChevronUp className="w-5 h-5 text-[var(--foreground)]/60" /> : <ChevronDown className="w-5 h-5 text-[var(--foreground)]/60" />}
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedEpisode === ep.id && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="border-t-2 overflow-hidden"
                    style={{ borderColor: 'var(--panel-border)' }}
                  >
                    <div className="p-4">
                      <EpisodeForm
                        episode={ep}
                        onChange={(updated) => updateEpisode(ep.id, updated)}
                        showVideoPreview
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Tips Card */}
      <div className="card p-5">
        <h3 className="font-bold text-[var(--foreground)] mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-500" /> Tips Mengisi Episode
        </h3>
        <ul className="text-sm text-[var(--foreground)]/80 space-y-1 list-disc list-inside">
          <li>Klik episode untuk expand dan isi detail</li>
          <li>Gunakan icon <Copy className="w-3 h-3 inline" /> untuk salin data dari episode sebelumnya (termasuk intro/outro)</li>
          <li>Minimal 1 link video (360p/480p/720p/1080p atau resolusi custom) wajib diisi per episode</li>
          <li>Intro/Outro default: Intro 0s-90s, Outro auto (dihitung dari durasi)</li>
          <li>Semua episode akan diproses sekaligus saat klik Simpan Anime</li>
        </ul>
      </div>
    </>
  );
}

// Schedule Section Component
function ScheduleSection({ schedules, setSchedules }) {
  const HARI_OPTIONS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  const addSchedule = () => {
    setSchedules([...schedules, { hari: 'Senin', jam: '20:00', is_active: true }]);
  };

  const removeSchedule = (index) => {
    if (schedules.length === 1) return; // Minimal 1 schedule
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateSchedule = (index, field, value) => {
    setSchedules(schedules.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
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
              onChange={(e) => updateSchedule(index, 'hari', e.target.value)}
              className="w-full sm:w-auto rounded-lg border-2 px-3 py-2 text-sm font-semibold"
              style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
            >
              {HARI_OPTIONS.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Clock className="w-4 h-4 text-[var(--foreground)]/50" />
              <input
                type="time"
                value={schedule.jam}
                onChange={(e) => updateSchedule(index, 'jam', e.target.value)}
                className="flex-1 sm:flex-none rounded-lg border-2 px-3 py-2 text-sm font-semibold"
                style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>

            <button
              type="button"
              onClick={() => updateSchedule(index, 'is_active', !schedule.is_active)}
              className={`w-full sm:w-auto px-3 py-2 rounded-lg text-sm font-bold transition-colors ${schedule.is_active ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-600'}`}
            >
              {schedule.is_active ? 'Aktif' : 'Nonaktif'}
            </button>

            {schedules.length > 1 && (
              <button
                type="button"
                onClick={() => removeSchedule(index)}
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
        onClick={addSchedule}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all hover:translate-y-[-2px]"
        style={{ boxShadow: '2px 2px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
      >
        <Plus className="w-4 h-4" /> Tambah Jadwal
      </button>
    </div>
  );
}
