'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, Upload, Image as ImageIcon, X, Plus, Film, CheckCircle2, Loader2, Trash2, Copy, ChevronDown, ChevronUp, AlertCircle, Tag as TagIcon, Clock, Calendar, Play, Link, Star, Layers, BookOpen, Hash, Building2, LayoutList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { createAnime, batchCreateEpisodes } from '@/lib/api';

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

const CONTENT_TYPES = ['ANIME', 'DONGHUA', 'MOVIE'];
const STATUS_OPTIONS = ['ONGOING', 'COMPLETED', 'HIATUS', 'UPCOMING'];

const QUALITIES = [
  { key: '360p', label: '360p', placeholder: 'Link video 360p' },
  { key: '480p', label: '480p', placeholder: 'Link video 480p' },
  { key: '720p', label: '720p', placeholder: 'Link video 720p' },
  { key: '1080p', label: '1080p', placeholder: 'Link video 1080p' },
];

// Buat template episode kosong
const createEmptyEpisode = (startNumber) => ({
  id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  nomor_episode: startNumber,
  judul_episode: `Episode ${startNumber}`,
  durasi_episode: 24,
  deskripsi_episode: '',
  intro_start_seconds: 0,
  intro_duration_seconds: 90,
  outro_start_seconds: null,
  outro_duration_seconds: 90,
  thumbnailUrl: '',
  qualities: {
    '360p': '',
    '480p': '',
    '720p': '',
    '1080p': '',
  },
  customQualities: [],
  status: 'pending',
});

const getEpisodeQualities = (ep) => {
  const all = { ...ep.qualities };
  ep.customQualities?.forEach((cq) => {
    if (cq.name?.trim()) {
      all[cq.name.trim()] = cq.url || '';
    }
  });
  return all;
};

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
  });

  // Schedule state for ONGOING anime
  const [schedules, setSchedules] = useState([{ hari: 'Senin', jam: '20:00', is_active: true }]);

  // Episode batch upload states
  const [addEpisodesAfter, setAddEpisodesAfter] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [savingEpisodes, setSavingEpisodes] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [expandedEpisode, setExpandedEpisode] = useState(null);

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

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
      const payload = {
        nama_anime: form.nama_anime,
        sinopsis_anime: form.sinopsis_anime,
        genre_anime: form.genre_anime,
        status_anime: form.status_anime,
        content_type: form.content_type,
        studio_anime: form.studio_anime,
        rating_anime: form.rating_anime ? Number(form.rating_anime) : undefined,
        is_21_plus: form.is_21_plus,
        tags_anime: form.tags_anime,
        label_anime: form.label_anime,
        tanggal_rilis_anime: form.tanggal_rilis_anime || undefined,
        fakta_menarik: form.fakta_menarik || undefined,
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

      // Step 1: Create Anime
      const result = await createAnime({ token, payload });
      const animeData = result?.item ?? result?.data ?? result;

      if (!animeData?.id) {
        throw new Error('Gagal mendapatkan ID anime dari response');
      }

      toast.success('Anime berhasil dibuat!');
      
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
            durasi_episode: (Number(ep.durasi_episode) || 24) * 60,
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
          
          if (ep.thumbnailUrl?.trim()) {
            epData.thumbnail_episode = ep.thumbnailUrl.trim();
          }
          
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

  const updateEpisode = (tempId, field, value) => {
    setEpisodes(episodes.map(ep => {
      if (ep.id !== tempId) return ep;
      if (field.startsWith('qualities.')) {
        const quality = field.split('.')[1];
        return { ...ep, qualities: { ...ep.qualities, [quality]: value } };
      }
      return { ...ep, [field]: value };
    }));
  };

  const addCustomQuality = (tempId) => {
    setEpisodes(episodes.map(ep => {
      if (ep.id !== tempId) return ep;
      return { ...ep, customQualities: [...ep.customQualities, { name: '', url: '' }] };
    }));
  };

  const updateCustomQuality = (tempId, index, field, value) => {
    setEpisodes(episodes.map(ep => {
      if (ep.id !== tempId) return ep;
      const updated = ep.customQualities.map((cq, i) => i === index ? { ...cq, [field]: value } : cq);
      return { ...ep, customQualities: updated };
    }));
  };

  const removeCustomQuality = (tempId, index) => {
    setEpisodes(episodes.map(ep => {
      if (ep.id !== tempId) return ep;
      return { ...ep, customQualities: ep.customQualities.filter((_, i) => i !== index) };
    }));
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
        durasi_episode: prev.durasi_episode,
        intro_start_seconds: prev.intro_start_seconds,
        intro_duration_seconds: prev.intro_duration_seconds,
        outro_start_seconds: prev.outro_start_seconds,
        outro_duration_seconds: prev.outro_duration_seconds,
        thumbnailUrl: prev.thumbnailUrl || '',
        qualities: { ...prev.qualities },
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
          durasi_episode: (Number(ep.durasi_episode) || 24) * 60,
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
        
        if (ep.thumbnailUrl?.trim()) {
          epData.thumbnail_episode = ep.thumbnailUrl.trim();
        }
        
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
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onCoverChange}
                      className="input"
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
                  <div className="input-icon">
                    <Layers className="input-icon__icon" />
                    <input type="text" value={form.genre_anime} onChange={(e) => updateField('genre_anime', e.target.value)} placeholder="Action, Comedy, Romance" className="input" />
                  </div>
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
                  <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Label</label>
                  <div className="input-icon">
                    <LayoutList className="input-icon__icon" />
                    <input type="text" value={form.label_anime} onChange={(e) => updateField('label_anime', e.target.value)} placeholder="Featured, Trending" className="input" />
                  </div>
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
                <TagIcon className="w-5 h-5" /> Alias / Judul Lain
              </h2>
              <textarea
                rows={3}
                value={form.aliases}
                onChange={(e) => updateField('aliases', e.target.value)}
                placeholder="Masukkan alias anime (pisahkan dengan koma atau baris baru)&#10;Contoh: Naruto Shippuden, Boruto, Naruto TV"
                className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold resize-none"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
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
                addCustomQuality={addCustomQuality}
                updateCustomQuality={updateCustomQuality}
                removeCustomQuality={removeCustomQuality}
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
  addCustomQuality,
  updateCustomQuality,
  removeCustomQuality,
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
                    {ep.durasi_episode && <span>• {ep.durasi_episode} menit</span>}
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
                    <div className="p-4 space-y-4">
                      {/* Basic Info */}
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-1.5">Nomor Episode</label>
                          <input
                            type="number"
                            value={ep.nomor_episode}
                            onChange={(e) => updateEpisode(ep.id, 'nomor_episode', Number(e.target.value))}
                            className="w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold"
                            style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-1.5">Durasi (menit)</label>
                          <input
                            type="number"
                            value={ep.durasi_episode}
                            onChange={(e) => updateEpisode(ep.id, 'durasi_episode', Number(e.target.value))}
                            className="w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold"
                            style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                          />
                        </div>
                        {/* Thumbnail URL */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-1.5">Thumbnail URL (opsional)</label>
                          <div className="flex items-center gap-3">
                            {ep.thumbnailUrl && (
                              <img src={ep.thumbnailUrl} 
                                alt="Preview"
                                className="w-16 h-12 object-cover rounded-lg border-2"
                                style={{ borderColor: 'var(--panel-border)' }}
                                loading="lazy"
                                decoding="async"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            )}
                            <div className="flex-1">
                              <input
                                type="url"
                                placeholder="https://.../thumbnail.jpg"
                                value={ep.thumbnailUrl}
                                onChange={(e) => updateEpisode(ep.id, 'thumbnailUrl', e.target.value)}
                                className="w-full rounded-lg border-2 px-3 py-2 text-sm"
                                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                              />
                              <p className="text-[10px] text-[var(--foreground)]/50 mt-1">
                                Paste URL thumbnail
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Video Links */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-bold text-[var(--foreground)]/60">Link Video (isi minimal 1)</label>
                          {/* Preview Button - Opens popup with video player */}
                          {Object.values(getEpisodeQualities(ep)).some(url => url?.trim() && isValidVideoUrl(url)) && (
                            <EpisodeVideoPreview
                              qualities={getEpisodeQualities(ep)}
                              episodeId={ep.id}
                              updateEpisode={updateEpisode}
                              introStart={ep.intro_start_seconds}
                            />
                          )}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {QUALITIES.map((q) => (
                            <div key={q.key} className="relative">
                              <span
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-0.5 rounded"
                                style={{
                                  background: ep.qualities[q.key] ? 'rgba(34,197,94,0.2)' : 'var(--background)',
                                  color: ep.qualities[q.key] ? '#22c55e' : 'var(--foreground)',
                                  border: `1px solid ${ep.qualities[q.key] ? '#22c55e' : 'var(--panel-border)'}`,
                                }}
                              >
                                {q.label}
                              </span>
                              <input
                                type="url"
                                placeholder={q.placeholder}
                                value={ep.qualities[q.key]}
                                onChange={(e) => updateEpisode(ep.id, `qualities.${q.key}`, e.target.value)}
                                className="w-full rounded-lg border-2 pl-16 pr-3 py-2.5 text-sm font-semibold"
                                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                              />
                            </div>
                          ))}
                          {ep.customQualities.map((cq, idx) => (
                            <div key={idx} className="relative">
                              <input
                                type="text"
                                placeholder="Resolusi"
                                value={cq.name}
                                onChange={(e) => updateCustomQuality(ep.id, idx, 'name', e.target.value)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-16 text-xs font-bold px-2 py-0.5 rounded text-center z-10"
                                style={{
                                  background: cq.url ? 'rgba(34,197,94,0.2)' : 'var(--background)',
                                  color: cq.url ? '#22c55e' : 'var(--foreground)',
                                  border: `1px solid ${cq.url ? '#22c55e' : 'var(--panel-border)'}`,
                                }}
                              />
                              <input
                                type="url"
                                placeholder="Link video custom"
                                value={cq.url}
                                onChange={(e) => updateCustomQuality(ep.id, idx, 'url', e.target.value)}
                                className="w-full rounded-lg border-2 pl-20 pr-10 py-2.5 text-sm font-semibold"
                                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                              />
                              <button
                                type="button"
                                onClick={() => removeCustomQuality(ep.id, idx)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-70"
                                title="Hapus resolusi"
                              >
                                <X className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => addCustomQuality(ep.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border-2"
                            style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                          >
                            <Plus className="w-3 h-3" /> Tambah Resolusi
                          </button>
                        </div>
                      </div>

                      {/* Intro / Outro Settings */}
                      <div>
                        <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-2">Intro & Outro (detik)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="text-[10px] text-[var(--foreground)]/50">Intro Start</span>
                            <input
                              type="number"
                              value={ep.intro_start_seconds ?? 0}
                              onChange={(e) => updateEpisode(ep.id, 'intro_start_seconds', e.target.value === '' ? null : Number(e.target.value))}
                              className="w-full rounded-lg border-2 px-2 py-1.5 text-sm"
                              style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--foreground)]/50">Intro Durasi</span>
                            <input
                              type="number"
                              value={ep.intro_duration_seconds ?? 90}
                              onChange={(e) => updateEpisode(ep.id, 'intro_duration_seconds', e.target.value === '' ? null : Number(e.target.value))}
                              className="w-full rounded-lg border-2 px-2 py-1.5 text-sm"
                              style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--foreground)]/50">Outro Start</span>
                            <input
                              type="number"
                              value={ep.outro_start_seconds ?? ''}
                              placeholder="Auto"
                              onChange={(e) => updateEpisode(ep.id, 'outro_start_seconds', e.target.value ? Number(e.target.value) : null)}
                              className="w-full rounded-lg border-2 px-2 py-1.5 text-sm"
                              style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--foreground)]/50">Outro Durasi</span>
                            <input
                              type="number"
                              value={ep.outro_duration_seconds ?? 90}
                              onChange={(e) => updateEpisode(ep.id, 'outro_duration_seconds', e.target.value === '' ? null : Number(e.target.value))}
                              className="w-full rounded-lg border-2 px-2 py-1.5 text-sm"
                              style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-[10px] text-[var(--foreground)]/40">
                            Outro Start kosong = otomatis dihitung dari durasi episode
                          </p>
                          {ep.intro_start_seconds !== null && ep.intro_duration_seconds !== null && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded">
                              Intro: {ep.intro_start_seconds}s - {ep.intro_start_seconds + ep.intro_duration_seconds}s
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-1.5">Deskripsi (opsional)</label>
                        <textarea
                          rows={2}
                          placeholder="Deskripsi singkat episode..."
                          value={ep.deskripsi_episode}
                          onChange={(e) => updateEpisode(ep.id, 'deskripsi_episode', e.target.value)}
                          className="w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold resize-none"
                          style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                        />
                      </div>
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

// Episode Video Preview Component with Intro Capture
function EpisodeVideoPreview({ qualities, episodeId, updateEpisode, introStart }) {
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const availableQualities = Object.entries(qualities)
    .filter(([_, url]) => url?.trim() && isValidVideoUrl(url))
    .map(([quality, url]) => ({ quality, url }));

  if (availableQualities.length === 0) return null;

  const currentQuality = selectedQuality || availableQualities[0];
  const videoId = `preview-video-${episodeId}`;

  const captureTime = (type) => {
    const video = document.getElementById(videoId);
    if (!video) return;

    const currentTime = Math.floor(video.currentTime);

    switch (type) {
      case 'intro_start':
        updateEpisode(episodeId, 'intro_start_seconds', currentTime);
        toast.success(`Intro Start = ${currentTime}d`);
        break;
      case 'intro_end':
        const introEnd = currentTime;
        const introDuration = introEnd - (introStart ?? 0);
        if (introDuration > 0) {
          updateEpisode(episodeId, 'intro_duration_seconds', introDuration);
          toast.success(`Intro Durasi = ${introDuration}d`);
        } else {
          toast.error('Durasi intro harus > 0');
        }
        break;
      case 'outro_start':
        updateEpisode(episodeId, 'outro_start_seconds', currentTime);
        toast.success(`Outro Start = ${currentTime}d`);
        break;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPlayer(true)}
        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg"
        style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}
      >
        <Play className="w-3 h-3" /> Preview & Deteksi
      </button>

      <AnimatePresence>
        {showPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={() => setShowPlayer(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl rounded-2xl overflow-hidden border-2"
              style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">Preview Video</span>
                  <select
                    value={currentQuality.quality}
                    onChange={(e) => {
                      const q = availableQualities.find(aq => aq.quality === e.target.value);
                      setSelectedQuality(q);
                    }}
                    className="text-xs rounded-lg border-2 px-2 py-1"
                    style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                  >
                    {availableQualities.map(({ quality }) => (
                      <option key={quality} value={quality}>{quality}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlayer(false)}
                  className="p-2 rounded-lg hover:bg-[var(--background)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Player */}
              <div className="aspect-video bg-black">
                <video
                  id={videoId}
                  src={currentQuality.url}
                  controls
                  className="w-full h-full"
                  preload="metadata"
                />
              </div>

              {/* Capture Controls */}
              <div className="p-4 border-t-2" style={{ borderColor: 'var(--panel-border)' }}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-bold text-[var(--foreground)]/60">Ambil Detik:</span>
                  <button
                    type="button"
                    onClick={() => captureTime('intro_start')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}
                  >
                    <Clock className="w-3 h-3" /> Intro Start
                  </button>
                  <button
                    type="button"
                    onClick={() => captureTime('intro_end')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}
                  >
                    <Clock className="w-3 h-3" /> Intro End (Auto Durasi)
                  </button>
                  <button
                    type="button"
                    onClick={() => captureTime('outro_start')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--accent-add)', color: 'var(--accent-add-foreground)' }}
                  >
                    <Clock className="w-3 h-3" /> Outro Start
                  </button>
                </div>
                <p className="mt-2 text-xs text-[var(--foreground)]/50">
                  Play video, pause di posisi yang diinginkan, lalu klik tombol untuk mengambil detik saat ini
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Helper: validasi URL video
function isValidVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    const validExtensions = ['.mp4', '.m3u8', '.webm', '.mkv', '.avi', '.mov'];
    const hasValidExt = validExtensions.some(ext => pathname.endsWith(ext));
    const hasPath = pathname.length > 1;
    const hasValidHost = urlObj.hostname.includes('.') && urlObj.hostname.length > 3;

    return hasValidExt && hasPath && hasValidHost;
  } catch {
    return false;
  }
}
