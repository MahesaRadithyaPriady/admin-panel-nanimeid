'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, Save, Trash2, Film, CheckCircle2, Loader2, AlertCircle, Copy, ChevronDown, ChevronUp, Upload, Play, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { batchCreateEpisodes, getAnimeDetail, listEpisodes } from '@/lib/api';
import { EpisodeForm, getEpisodeQualities, createEmptyEpisode } from '@/components/EpisodeForm';

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};


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
      const hasQuality = Object.values(allQualities).some(q => q?.trim() !== '');
      if (!hasQuality) {
        errors.push(`Episode ${ep.nomor_episode}: Minimal 1 link video wajib diisi`);
      }
    });
    return errors;
  };

  const onSubmit = async () => {
    
    const errors = validateEpisodes();
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    if (!confirm(`Yakin ingin menyimpan ${episodes.length} episode sekaligus?`)) return;

    setSaving(true);
    setProgress({ current: 0, total: episodes.length });

    try {
      const token = getSession()?.token;

      // Format episodes untuk API (hanya support URL thumbnail di batch)
      
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
            .filter(([_, url]) => url?.trim())
            .map(([quality, url]) => ({ nama_quality: quality, source_quality: url.trim() })),
        };
        
        return epData;
      });
      
      
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

  
  const filledCount = episodes.filter(ep => {
    const hasJudul = ep.judul_episode?.trim?.() || false;
    const allQualities = getEpisodeQualities(ep);
    const hasQuality = Object.values(allQualities).some(q => q?.trim?.() !== '');
    return hasJudul && hasQuality;
  }).length;

  if (loadingAnime) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6 min-w-0 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push(`/dashboard/daftar-konten/anime/${animeId}`)}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
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
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={addOneEpisode}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
          >
            <Plus className="w-4 h-4" /> Tambah Episode
          </button>
          <button
            onClick={onSubmit}
            disabled={saving || filledCount === 0}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '6px 6px 0 rgba(212,212,212,0.15)', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? `Menyimpan ${progress.current}/${progress.total}...` : `Simpan ${filledCount} Episode`}
          </button>
        </div>
      </div>

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
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {episodes.map((ep, index) => (
            <div
              key={ep.id}
              className="rounded-2xl border-2 overflow-hidden"
              style={{ 
                boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', 
                borderColor: ep.status === 'done' ? '#22c55e' : ep.status === 'uploading' ? '#3b82f6' : 'var(--panel-border)',
                background: 'var(--panel-bg)',
              }}
            >
              {/* Episode Header */}
              <div className="flex items-center gap-4 p-4 flex-wrap sm:flex-nowrap">
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
                    onChange={(e) => updateEpisode(ep.id, { ...ep, judul_episode: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-lg font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-[var(--foreground)]/30 text-[var(--foreground)]"
                  />
                  <div className="flex items-center gap-2 text-xs text-[var(--foreground)]/50 flex-wrap">
                    <span>Ep #{ep.nomor_episode}</span>
                    <span>•</span>
                    <span>{Object.values(getEpisodeQualities(ep)).filter(q => q?.trim()).length} quality</span>
                    {ep.durasi_episode && <span>• {Math.round(ep.durasi_episode / 60)} menit</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
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

      {/* Add More Button (Bottom) */}
      <div className="flex justify-center">
        <button
          onClick={addOneEpisode}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border-2 px-6 py-3 font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px]"
          style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
        >
          <Plus className="w-5 h-5" /> Tambah Episode Lagi
        </button>
      </div>

      {/* Tips Card */}
      <div className="card p-5">
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
      </div>
    </motion.div>
  );
}
