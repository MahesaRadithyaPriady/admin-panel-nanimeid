'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, Save, Trash2, Film, CheckCircle2, Loader2, AlertCircle, Copy, ChevronDown, ChevronUp, Upload, Play, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { batchCreateEpisodes, getAnimeDetail, listEpisodes } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

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
  judul_episode: `Episode ${startNumber}`, // Auto-generate
  durasi_episode: 24,
  deskripsi_episode: '',
  intro_start_seconds: 0,
  intro_duration_seconds: 90,
  outro_start_seconds: null,
  outro_duration_seconds: 90,
  thumbnailUrl: '', // URL only (batch tidak support file upload)
  qualities: {
    '360p': '',
    '480p': '',
    '720p': '',
    '1080p': '',
  },
  status: 'pending',
});

// DUMMY ANIME DATA
const DUMMY_ANIME = {
  id: '1',
  nama_anime: 'Attack on Titan',
  status_anime: 'COMPLETED',
  episode_count: 87,
};

export default function BatchUploadPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const animeId = params?.id;

  const [anime, setAnime] = useState(null);
  const [loadingAnime, setLoadingAnime] = useState(true);
  const [episodes, setEpisodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [expandedEpisode, setExpandedEpisode] = useState(null);

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

  // Load anime data dan episode terakhir dari API
  useEffect(() => {
    if (!animeId || !user) return;
    const loadData = async () => {
      setLoadingAnime(true);
      try {
        const token = getSession()?.token;
        // Load anime detail
        const animeRes = await getAnimeDetail({ token, id: animeId });
        const animeData = animeRes?.item || animeRes?.data || animeRes;
        setAnime(animeData);
        
        // Load episodes untuk ambil nomor terakhir
        const episodesRes = await listEpisodes({ token, animeId, page: 1, limit: 100 });
        const eps = episodesRes?.items || episodesRes?.data || [];
        const lastEp = Array.isArray(eps) && eps.length > 0 
          ? Math.max(...eps.map(e => Number(e.nomor_episode) || 0))
          : 0;
        
        // Auto-generate 1 episode baru setelah yang terakhir
        setEpisodes([createEmptyEpisode(lastEp + 1)]);
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat data anime');
      } finally {
        setLoadingAnime(false);
      }
    };
    loadData();
  }, [animeId, user]);

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
        thumbnailUrl: prev.thumbnailUrl || '', // Copy URL only (batch tidak support file)
        qualities: { ...prev.qualities },
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
      const hasAnyQuality = Object.values(ep.qualities).some(q => q.trim() !== '');
      if (!hasAnyQuality) {
        errors.push(`Episode ${ep.nomor_episode}: Minimal 1 link video wajib diisi`);
      }
    });
    return errors;
  };

  const onSubmit = async () => {
    console.log('SUBMIT DEBUG - episodes:', episodes);
    console.log('SUBMIT DEBUG - episodes.length:', episodes?.length);
    console.log('SUBMIT DEBUG - filledCount:', filledCount);
    
    const errors = validateEpisodes();
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      console.log('Validation errors:', errors);
      return;
    }

    if (!confirm(`Yakin ingin menyimpan ${episodes.length} episode sekaligus?`)) return;

    setSaving(true);
    setProgress({ current: 0, total: episodes.length });

    try {
      const token = getSession()?.token;

      // Format episodes untuk API (hanya support URL thumbnail di batch)
      console.log('Formatting episodes:', episodes);
      
      const formattedEpisodes = episodes.map((ep, idx) => {
        const epData = {
          nomor_episode: Number(ep.nomor_episode),
          judul_episode: ep.judul_episode,
          durasi_episode: Number(ep.durasi_episode) || 24,
          deskripsi_episode: ep.deskripsi_episode || null,
          intro_start_seconds: ep.intro_start_seconds ?? 0,
          intro_duration_seconds: ep.intro_duration_seconds ?? 90,
          outro_start_seconds: ep.outro_start_seconds ?? null,
          outro_duration_seconds: ep.outro_duration_seconds ?? 90,
          qualities: Object.entries(ep.qualities)
            .filter(([_, url]) => url.trim() !== '')
            .map(([quality, url]) => ({
              nama_quality: quality,
              source_quality: url.trim(),
            })),
        };
        
        // Hanya support URL thumbnail di batch API (tidak support file upload)
        if (ep.thumbnailUrl?.trim()) {
          epData.thumbnail_episode = ep.thumbnailUrl.trim();
        }
        
        return epData;
      });
      
      console.log('Formatted episodes:', formattedEpisodes);
      
      if (formattedEpisodes.length === 0) {
        toast.error('Tidak ada episode yang valid untuk disimpan');
        setSaving(false);
        return;
      }

      // Update all status to uploading
      setEpisodes(prev => prev.map(e => ({ ...e, status: 'uploading' })));

      // Call batch API - backend akan cek URL accessibility otomatis
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

      // Tampilkan hasil dengan URL check summary
      if (result?.failed > 0) {
        toast.success(`✅ ${result.success} episode berhasil, ❌ ${result.failed} gagal`);
        if (result.errors) {
          result.errors.forEach(err => toast.error(`Ep ${err.nomor_episode}: ${err.error}`));
        }
      } else {
        // Cek URL checks untuk setiap episode
        let hasUrlIssues = false;
        result?.items?.forEach((item, idx) => {
          const urlSummary = item?.url_check_summary;
          if (urlSummary?.has_issues) {
            hasUrlIssues = true;
            const failedCount = urlSummary.failed || 0;
            const epNum = formattedEpisodes[idx]?.nomor_episode || (idx + 1);
            const failedChecks = item?.url_checks?.filter(c => !c.accessible) || [];
            const errorDetails = failedChecks.slice(0, 2).map(c => `${c.nama_quality}: ${c.error || 'Not accessible'}`).join(', ');
            toast.error(`Ep ${epNum}: ${failedCount} URL tidak accessible (${errorDetails})`, { duration: 5000 });
          }
        });
        
        if (!hasUrlIssues) {
          toast.success(`✅ ${result?.success || episodes.length} episode berhasil disimpan! Semua URL accessible`);
        } else {
          toast.success(`✅ ${result?.success || episodes.length} episode tersimpan, tapi ada URL yang bermasalah`);
        }
      }

      // Redirect setelah 2 detik
      setTimeout(() => {
        router.push(`/dashboard/daftar-konten/anime/${animeId}`);
      }, 2000);
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan episode');
      setEpisodes(prev => prev.map(e => ({ ...e, status: 'error' })));
    } finally {
      setSaving(false);
    }
  };

  console.log('DEBUG episodes array:', episodes);
  console.log('DEBUG episodes.length:', episodes?.length);
  
  const filledCount = episodes.filter(ep => {
    console.log('DEBUG ep:', ep);
    const hasJudul = ep.judul_episode?.trim?.() || false;
    const qualitiesObj = ep.qualities || {};
    const hasQuality = Object.values(qualitiesObj).some(q => q?.trim?.() !== '');
    const isFilled = hasJudul && hasQuality;
    console.log(`Ep ${ep.nomor_episode}: judul=${hasJudul}, quality=${hasQuality}, filled=${isFilled}`);
    console.log('  qualities:', qualitiesObj);
    return isFilled;
  }).length;
  console.log('Total filledCount:', filledCount, 'episodes:', episodes.length);

  if (loadingAnime) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 min-w-0 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push(`/dashboard/daftar-konten/anime/${animeId}`)}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">Batch Upload Episode</h1>
            <p className="text-sm text-[var(--foreground)]/70">
              {anime?.nama_anime} • {filledCount}/{episodes.length} episode siap disimpan
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={addOneEpisode}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
          >
            <Plus className="w-4 h-4" /> Tambah Episode
          </button>
          <button
            onClick={onSubmit}
            disabled={saving || filledCount === 0}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? `Menyimpan ${progress.current}/${progress.total}...` : `Simpan ${filledCount} Episode`}
          </button>
        </div>
      </motion.div>

      {/* Progress Bar (saat saving) */}
      {saving && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-xl border-2 p-4"
          style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[var(--foreground)]">Progress Upload</span>
            <span className="text-sm font-bold text-[var(--accent-primary)]">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
            <motion.div 
              className="h-full rounded-full"
              style={{ background: 'var(--accent-primary)' }}
              initial={{ width: 0 }}
              animate={{ width: `${(progress.current / progress.total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}

      {/* Episode List */}
      <motion.div variants={itemVariants} className="space-y-4">
        <AnimatePresence mode="popLayout">
          {episodes.map((ep, index) => (
            <motion.div
              key={ep.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, x: -100 }}
              className="rounded-2xl border-2 overflow-hidden"
              style={{ 
                boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', 
                borderColor: ep.status === 'done' ? '#22c55e' : ep.status === 'uploading' ? '#3b82f6' : 'var(--panel-border)',
                background: 'var(--panel-bg)',
              }}
            >
              {/* Episode Header */}
              <div className="flex items-center gap-4 p-4">
                {/* Status Icon (Click to expand) */}
                <button
                  onClick={() => setExpandedEpisode(expandedEpisode === ep.id ? null : ep.id)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
                  style={{ 
                    background: ep.status === 'done' ? 'rgba(34,197,94,0.15)' : ep.status === 'uploading' ? 'rgba(59,130,246,0.15)' : 'var(--accent-primary)',
                    color: ep.status === 'done' ? '#22c55e' : ep.status === 'uploading' ? '#3b82f6' : 'var(--accent-primary-foreground)',
                  }}
                >
                  {ep.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : 
                   ep.status === 'uploading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                   ep.nomor_episode}
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
                  <div className="flex items-center gap-2 text-xs text-[var(--foreground)]/50">
                    <span>Ep #{ep.nomor_episode}</span>
                    <span>•</span>
                    <span>{Object.values(ep.qualities).filter(q => q.trim()).length} quality</span>
                    {ep.durasi_episode && <span>• {ep.durasi_episode} menit</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <button
                      onClick={() => copyFromPrevious(index)}
                      className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                      title="Salin data dari episode sebelumnya"
                    >
                      <Copy className="w-4 h-4 text-[var(--foreground)]/60" />
                    </button>
                  )}
                  <button
                    onClick={() => removeEpisode(ep.id)}
                    disabled={saving}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
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
                        {/* Thumbnail URL (Batch hanya support URL, tidak support file upload) */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-1.5">Thumbnail URL (opsional)</label>
                          <div className="flex items-center gap-3">
                            {ep.thumbnailUrl && (
                              <img 
                                src={ep.thumbnailUrl} 
                                alt="Preview"
                                className="w-16 h-12 object-cover rounded-lg border-2"
                                style={{ borderColor: 'var(--panel-border)' }}
                                onError={(e) => e.target.style.display = 'none'}
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
                                Paste URL thumbnail. Batch upload tidak support file upload.
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
                          {Object.values(ep.qualities).some(url => url?.trim() && isValidVideoUrl(url)) && (
                            <EpisodeVideoPreview
                              qualities={ep.qualities}
                              episodeId={ep.id}
                              setEpisodes={setEpisodes}
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
                        </div>
                      </div>

                      {/* Intro / Outro Settings */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-bold text-[var(--foreground)]/60">Intro & Outro (detik)</label>
                          {/* Detect Intro Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const firstQualityUrl = Object.values(ep.qualities).find(url => url?.trim());
                              if (firstQualityUrl && isValidVideoUrl(firstQualityUrl)) {
                                window.open(firstQualityUrl, '_blank', 'width=800,height=600');
                                toast.success('Player dibuka! Tentukan waktu intro kemudian isi manual di form.');
                              } else {
                                toast.error('Isi URL video valid terlebih dahulu');
                              }
                            }}
                            disabled={!Object.values(ep.qualities).some(url => url?.trim() && isValidVideoUrl(url))}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              background: 'var(--accent-primary)',
                              color: 'var(--accent-primary-foreground)',
                            }}
                          >
                            <Play className="w-3 h-3" /> Deteksi Intro dari Player
                          </button>
                        </div>
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
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Add More Button (Bottom) */}
      <motion.div variants={itemVariants} className="flex justify-center">
        <button
          onClick={addOneEpisode}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border-2 px-6 py-3 font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px]"
          style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
        >
          <Plus className="w-5 h-5" /> Tambah Episode Lagi
        </button>
      </motion.div>

      {/* Tips Card */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border-2 p-5"
        style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'rgba(59,130,246,0.1)', borderColor: 'var(--panel-border)' }}
      >
        <h3 className="font-bold text-[var(--foreground)] mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-500" /> Tips Upload Batch
        </h3>
        <ul className="text-sm text-[var(--foreground)]/80 space-y-1 list-disc list-inside">
          <li>Klik episode untuk expand dan isi detail</li>
          <li>Gunakan icon <Copy className="w-3 h-3 inline" /> untuk salin data dari episode sebelumnya (termasuk intro/outro)</li>
          <li>Minimal 1 link video (360p/480p/720p/1080p) wajib diisi per episode</li>
          <li>Intro/Outro default: Intro 0s-90s, Outro auto (dihitung dari durasi)</li>
          <li>Klik "Tambah Episode" untuk menambah episode baru satu per satu</li>
          <li>Episode dengan border hijau = sudah tersimpan</li>
          <li>Semua episode akan diproses sekaligus saat klik Simpan</li>
        </ul>
      </motion.div>
    </motion.div>
  );
}

// Episode Video Preview Component with Intro Capture
function EpisodeVideoPreview({ qualities, episodeId, setEpisodes, introStart }) {
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const availableQualities = Object.entries(qualities)
    .filter(([_, url]) => url?.trim() && isValidVideoUrl(url))
    .map(([quality, url]) => ({ quality, url }));

  if (availableQualities.length === 0) return null;

  const currentQuality = selectedQuality || availableQualities[0];
  const videoId = `preview-video-${episodeId}`;

  const updateEpisode = (epId, field, value) => {
    setEpisodes(prev => prev.map(ep => {
      if (ep.id !== epId) return ep;
      return { ...ep, [field]: value };
    }));
  };

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
