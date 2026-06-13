'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Edit, Trash2, Plus, Play, List, Info, Clock, Star, Calendar, Eye, ChevronDown, ChevronUp, ExternalLink, Save, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getAnimeDetail, deleteAnime, listEpisodes, createEpisode, deleteEpisode, updateEpisode, checkEpisodeQuality } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// API imported from @/lib/api

const STATUS_COLORS = {
  ONGOING: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Berlangsung' },
  COMPLETED: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Selesai' },
  HIATUS: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Hiatus' },
  UPCOMING: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', label: 'Segera' },
};

export default function AnimeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const id = params?.id;

  const [activeTab, setActiveTab] = useState('overview');
  const [loadingData, setLoadingData] = useState(true);
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [expandedEpisode, setExpandedEpisode] = useState(null);
  const [showAddEpisode, setShowAddEpisode] = useState(false);
  const [newEpisode, setNewEpisode] = useState({ nomor_episode: '', judul_episode: '', durasi_episode: 24 });
  const [editingEpisode, setEditingEpisode] = useState(null);
  const [savingEpisode, setSavingEpisode] = useState(null);
  const [qualityStatus, setQualityStatus] = useState({});
  const [checkingQuality, setCheckingQuality] = useState(null);

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

  // Load anime and episodes (REAL API)
  useEffect(() => {
    if (!id || !user) return;
    const loadData = async () => {
      setLoadingData(true);
      try {
        const token = getSession()?.token;
        // Load anime detail
        const animeRes = await getAnimeDetail({ token, id });
        const animeData = animeRes?.item || animeRes?.data || animeRes;
        setAnime(animeData);
        // Load episodes - prioritize from anime detail if available
        if (Array.isArray(animeData?.episodes) && animeData.episodes.length > 0) {
          setEpisodes(animeData.episodes);
        } else {
          const episodesRes = await listEpisodes({ token, animeId: id, page: 1, limit: 100 });
          const episodesData = episodesRes?.items || episodesRes?.data || episodesRes || [];
          setEpisodes(Array.isArray(episodesData) ? episodesData : []);
        }
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat data');
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [id, user]);

  const onDelete = async () => {
    if (!confirm('Yakin ingin menghapus anime ini? Semua episode akan ikut terhapus.')) return;
    try {
      const token = getSession()?.token;
      await deleteAnime({ token, id });
      toast.success('Anime dihapus!');
      router.push('/dashboard/daftar-konten/anime');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus anime');
    }
  };

  const onAddEpisode = async (e) => {
    e.preventDefault();
    try {
      const token = getSession()?.token;
      const payload = {
        nomor_episode: Number(newEpisode.nomor_episode),
        judul_episode: newEpisode.judul_episode,
        durasi_episode: Number(newEpisode.durasi_episode) || 24,
      };
      await createEpisode({ token, animeId: id, payload });
      toast.success('Episode ditambahkan!');
      setShowAddEpisode(false);
      setNewEpisode({ nomor_episode: '', judul_episode: '', durasi_episode: 24 });
      // Refresh episodes list
      const episodesRes = await listEpisodes({ token, animeId: id, page: 1, limit: 100 });
      setEpisodes(episodesRes?.items || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal menambahkan episode');
    }
  };

  const onDeleteEpisode = async (epId) => {
    if (!confirm('Hapus episode ini?')) return;
    try {
      const token = getSession()?.token;
      await deleteEpisode({ token, id: epId });
      toast.success('Episode dihapus!');
      setEpisodes(episodes.filter((e) => e.id !== epId));
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus episode');
    }
  };

  const startEditEpisode = (ep) => {
    setEditingEpisode({
      ...ep,
      qualities: ep.qualities || [],
    });
    // Auto check quality saat edit
    if (ep.qualities?.length > 0) {
      checkEpisodeQualityStatus(ep.id);
    }
  };

  const checkEpisodeQualityStatus = async (epId) => {
    setCheckingQuality(epId);
    try {
      const token = getSession()?.token;
      const result = await checkEpisodeQuality({ token, id: epId });
      setQualityStatus((prev) => ({ ...prev, [epId]: result }));
      const summary = result?.summary;
      if (summary?.has_issues) {
        toast.error(`${summary.working}/${summary.total} quality berfungsi, ${summary.failed} gagal`);
      } else {
        toast.success(`✓ Semua ${summary?.total || 0} quality berfungsi normal`);
      }
    } catch (err) {
      toast.error(err?.message || 'Gagal memeriksa quality');
    } finally {
      setCheckingQuality(null);
    }
  };

  const updateEditingField = (field, value) => {
    setEditingEpisode((prev) => ({ ...prev, [field]: value }));
  };

  const updateQualityLink = (qualityId, newUrl) => {
    setEditingEpisode((prev) => ({
      ...prev,
      qualities: prev.qualities.map((q) =>
        q.id === qualityId ? { ...q, source_quality: newUrl } : q
      ),
    }));
  };

  const removeQuality = (qualityId) => {
    if (!confirm('Hapus quality ini?')) return;
    setEditingEpisode((prev) => ({
      ...prev,
      qualities: prev.qualities.filter((q) => q.id !== qualityId),
    }));
    toast.success('Quality dihapus (simpan episode untuk konfirmasi)');
  };

  const addQuality = () => {
    const qualitiesList = ['360p', '480p', '720p', '1080p'];
    const existing = editingEpisode.qualities.map(q => q.nama_quality);
    const available = qualitiesList.find(q => !existing.includes(q));
    
    if (!available) {
      toast.error('Semua quality sudah ada (360p, 480p, 720p, 1080p)');
      return;
    }
    
    setEditingEpisode((prev) => ({
      ...prev,
      qualities: [
        ...prev.qualities,
        { id: `temp_${Date.now()}`, nama_quality: available, source_quality: '' }
      ],
    }));
  };

  // Helper: validasi URL bisa di-play (format yang ketat)
  const isValidVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    // Cek harus http/https
    if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      
      // Cek extension valid di akhir path (sebelum query params)
      const validExtensions = ['.mp4', '.m3u8', '.webm', '.mkv', '.avi', '.mov'];
      const hasValidExt = validExtensions.some(ext => pathname.endsWith(ext));
      
      // Cek path tidak kosong dan tidak hanya /
      const hasPath = pathname.length > 1;
      
      // Cek hostname valid (ada titik, bukan IP sembarang)
      const hasValidHost = urlObj.hostname.includes('.') && urlObj.hostname.length > 3;
      
      return hasValidExt && hasPath && hasValidHost;
    } catch {
      return false;
    }
  };

  const saveEpisode = async () => {
    if (!editingEpisode) return;
    setSavingEpisode(editingEpisode.id);
    try {
      const token = getSession()?.token;
      
      // Filter hanya qualities dengan URL valid
      const validQualities = editingEpisode.qualities
        .filter((q) => isValidVideoUrl(q.source_quality))
        .map((q) => ({
          nama_quality: q.nama_quality,
          source_quality: q.source_quality.trim(),
        }));
      
      if (validQualities.length === 0) {
        toast.error('Minimal 1 link video valid diperlukan (format: https://.../file.mp4)');
        setSavingEpisode(null);
        return;
      }
      
      const payload = {
        judul_episode: editingEpisode.judul_episode,
        durasi_episode: Number(editingEpisode.durasi_episode) || 24,
        deskripsi_episode: editingEpisode.deskripsi_episode || null,
        intro_start_seconds: editingEpisode.intro_start_seconds ?? 0,
        intro_duration_seconds: editingEpisode.intro_duration_seconds ?? 90,
        outro_start_seconds: editingEpisode.outro_start_seconds ?? null,
        outro_duration_seconds: editingEpisode.outro_duration_seconds ?? 90,
        qualities: validQualities,
      };
      
      // Handle thumbnail: file upload atau URL
      if (editingEpisode.thumbnailFile instanceof File) {
        payload.image = editingEpisode.thumbnailFile;
      } else if (editingEpisode.thumbnail_episode && editingEpisode.thumbnail_episode.startsWith('http')) {
        payload.thumbnail_episode = editingEpisode.thumbnail_episode;
      }
      
      // Submit ke backend - backend akan cek URL accessibility otomatis
      const result = await updateEpisode({ token, id: editingEpisode.id, payload });
      
      // Tampilkan hasil URL check dari backend
      const urlCheckSummary = result?.url_check_summary;
      if (urlCheckSummary?.has_issues) {
        const failedCount = urlCheckSummary.failed || 0;
        const failedChecks = result?.url_checks?.filter(c => !c.accessible) || [];
        const errorDetails = failedChecks.slice(0, 2).map(c => `${c.nama_quality}: ${c.error || 'Not accessible'}`).join('; ');
        toast.success(`Episode diperbarui! Tapi ${failedCount} URL tidak accessible (${errorDetails})`);
      } else {
        toast.success(`Episode diperbarui! ${urlCheckSummary?.accessible || validQualities.length} quality OK`);
      }
      // Refresh episodes
      const episodesRes = await listEpisodes({ token, animeId: id, page: 1, limit: 100 });
      setEpisodes(episodesRes?.items || []);
      setEditingEpisode(null);
    } catch (err) {
      toast.error(err?.message || 'Gagal memperbarui episode');
    } finally {
      setSavingEpisode(null);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-3 border-[var(--accent-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!anime) return null;

  const statusMeta = STATUS_COLORS[anime.status_anime] || STATUS_COLORS.ONGOING;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 min-w-0">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/dashboard/daftar-konten/anime')}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{typeof anime.nama_anime === 'string' ? anime.nama_anime : JSON.stringify(anime.nama_anime)}</h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: statusMeta.bg, color: statusMeta.color }}>
                {statusMeta.label}
              </span>
              <span className="text-sm text-[var(--foreground)]/60">{typeof anime.content_type === 'string' ? anime.content_type : JSON.stringify(anime.content_type)}</span>
              <span className="text-sm text-[var(--foreground)]/60">•</span>
              <span className="text-sm text-[var(--foreground)]/60">{(Array.isArray(anime.episodes) ? anime.episodes.length : (typeof anime.episode_count === 'number' ? anime.episode_count : typeof anime.episode_count === 'string' ? anime.episode_count : '0'))} Episode</span>
              {anime.is_21_plus === true && (
                <span className="rounded-full px-2 py-0.5 text-xs font-bold bg-red-500/20 text-red-500">21+</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/daftar-konten/anime/${id}/batch-upload`)}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)', borderColor: 'var(--panel-border)' }}
          >
            <Upload className="w-4 h-4" /> Batch Upload
          </button>
          <button
            onClick={() => router.push(`/dashboard/daftar-konten/anime/${id}/edit`)}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}
          >
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold text-red-500 transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'rgba(239,68,68,0.1)', borderColor: 'var(--panel-border)' }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-1 rounded-xl border-2 p-1" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
        {[
          { key: 'overview', label: 'Overview', icon: Info },
          { key: 'episodes', label: 'Episodes', icon: List },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${isActive ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
              style={{ background: isActive ? 'var(--accent-primary)' : 'transparent', color: isActive ? 'var(--accent-primary-foreground)' : 'var(--foreground)' }}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid lg:grid-cols-[300px_1fr] gap-6"
          >
            {/* Cover */}
            <div className="rounded-2xl border-2 overflow-hidden" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', borderColor: 'var(--panel-border)' }}>
              <img src={anime.cover_anime || anime.gambar_anime || ''} alt={typeof anime.nama_anime === 'string' ? anime.nama_anime : 'Anime'} className="w-full aspect-[3/4] object-cover" />
            </div>

            {/* Info */}
            <div className="space-y-4">
              <div className="rounded-2xl border-2 p-5" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5" /> Informasi
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--foreground)]/60">Studio</span>
                    <p className="font-bold text-[var(--foreground)]">{Array.isArray(anime.studio_anime) ? anime.studio_anime.join(', ') : (anime.studio_anime || '-')}</p>
                  </div>
                  <div>
                    <span className="text-[var(--foreground)]/60">Genre</span>
                    <p className="font-bold text-[var(--foreground)]">{Array.isArray(anime.genre_anime) ? anime.genre_anime.join(', ') : (anime.genre_anime || '-')}</p>
                  </div>
                  <div>
                    <span className="text-[var(--foreground)]/60">Rating</span>
                    <p className="font-bold text-[var(--foreground)] flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {typeof anime.rating_anime === 'number' ? anime.rating_anime : typeof anime.rating_anime === 'string' ? anime.rating_anime : '-'}/10
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--foreground)]/60">Tanggal Rilis</span>
                    <p className="font-bold text-[var(--foreground)] flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> {(anime.tanggal_rilis_anime && typeof anime.tanggal_rilis_anime === 'string' && anime.tanggal_rilis_anime !== '[object Object]' && !anime.tanggal_rilis_anime.startsWith('{')) ? anime.tanggal_rilis_anime : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--foreground)]/60">Total Views</span>
                    <p className="font-bold text-[var(--foreground)] flex items-center gap-1">
                      <Eye className="w-4 h-4" /> {typeof anime.views_count === 'number' ? anime.views_count.toLocaleString() : typeof anime.views_count === 'string' ? anime.views_count : '0'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--foreground)]/60">Tags</span>
                    <p className="font-bold text-[var(--foreground)]">{Array.isArray(anime.tags_anime) ? anime.tags_anime.join(', ') : (anime.tags_anime || '-')}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 p-5" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-3">Sinopsis</h2>
                <p className="text-sm text-[var(--foreground)]/80 leading-relaxed">{(anime.sinopsis_anime && typeof anime.sinopsis_anime === 'string' && anime.sinopsis_anime !== '[object Object]') ? anime.sinopsis_anime : 'Tidak ada sinopsis.'}</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="episodes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Add Episode Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-[var(--foreground)]">Daftar Episode ({episodes.length})</h2>
              <button
                onClick={() => setShowAddEpisode(true)}
                className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold transition-all hover:translate-y-[-2px]"
                style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
              >
                <Plus className="w-4 h-4" /> Tambah Episode
              </button>
            </div>

            {/* Add Episode Form */}
            <AnimatePresence>
              {showAddEpisode && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={onAddEpisode}
                  className="rounded-2xl border-2 p-5 overflow-hidden"
                  style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[var(--foreground)]">Tambah Episode Baru</h3>
                    <button type="button" onClick={() => setShowAddEpisode(false)} className="p-1 hover:bg-[var(--background)] rounded">
                      <X className="w-5 h-5 text-[var(--foreground)]" />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <input
                      type="number"
                      placeholder="No. Episode"
                      value={newEpisode.nomor_episode}
                      onChange={(e) => setNewEpisode({ ...newEpisode, nomor_episode: e.target.value })}
                      className="rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                      style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Judul Episode"
                      value={newEpisode.judul_episode}
                      onChange={(e) => setNewEpisode({ ...newEpisode, judul_episode: e.target.value })}
                      className="rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                      style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Durasi (menit)"
                      value={newEpisode.durasi_episode}
                      onChange={(e) => setNewEpisode({ ...newEpisode, durasi_episode: Number(e.target.value) })}
                      className="rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                      style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                    />
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddEpisode(false)}
                      className="rounded-lg border-2 px-4 py-2 font-bold"
                      style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-bold"
                      style={{ background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
                    >
                      <Save className="w-4 h-4" /> Simpan
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Episodes List */}
            <div className="space-y-3">
              {Array.isArray(episodes) && episodes.length > 0 ? episodes.map((ep, idx) => (
                <div
                  key={typeof ep.id === 'number' ? ep.id : typeof ep.id === 'string' ? ep.id : `ep-${idx}`}
                  className="rounded-2xl border-2 overflow-hidden"
                  style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg" style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}>
                      {typeof ep.nomor_episode === 'number' ? ep.nomor_episode : typeof ep.nomor_episode === 'string' ? ep.nomor_episode : '-'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[var(--foreground)] truncate">{typeof ep.judul_episode === 'string' ? ep.judul_episode : JSON.stringify(ep.judul_episode)}</h3>
                      <div className="flex items-center gap-3 text-xs text-[var(--foreground)]/60">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {typeof ep.durasi_episode === 'number' ? ep.durasi_episode : typeof ep.durasi_episode === 'string' ? ep.durasi_episode : '-'}m</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {typeof ep.views === 'number' ? ep.views.toLocaleString() : typeof ep.views === 'string' ? ep.views : '0'}</span>
                        {Array.isArray(ep.qualities) && ep.qualities.length > 0 && (
                          <>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}>
                              {ep.qualities.length} quality
                            </span>
                            {/* Quality Status Badge */}
                            {qualityStatus[ep.id]?.summary && (
                              <span 
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); checkEpisodeQualityStatus(ep.id); }}
                                style={{ 
                                  background: qualityStatus[ep.id].summary.has_issues ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', 
                                  color: qualityStatus[ep.id].summary.has_issues ? '#ef4444' : '#22c55e'
                                }}
                                title={qualityStatus[ep.id].summary.has_issues ? 'Ada masalah quality' : 'Semua quality OK'}
                              >
                                {qualityStatus[ep.id].summary.working}/{qualityStatus[ep.id].summary.total} OK
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedEpisode(expandedEpisode === ep.id ? null : ep.id)}
                        className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                      >
                        {expandedEpisode === ep.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => onDeleteEpisode(ep.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

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
                          {/* Edit Mode Check */}
                          {editingEpisode?.id === ep.id ? (
                            // EDIT MODE - Form seperti batch upload
                            <>
                              {/* Video Preview Player */}
                              {editingEpisode.qualities?.length > 0 && editingEpisode.qualities[0]?.source_quality ? (
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-[var(--foreground)]/60">Preview Video (Live)</label>
                                  <video
                                    controls
                                    className="w-full rounded-lg"
                                    style={{ maxHeight: '250px' }}
                                    poster={editingEpisode.thumbnail_episode || ''}
                                  >
                                    <source src={editingEpisode.qualities[0].source_quality} type="video/mp4" />
                                  </video>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const currentTime = document.querySelector('video')?.currentTime || 0;
                                        updateEditingField('intro_start_seconds', Math.floor(currentTime));
                                        toast.success(`Intro Start di set ke ${Math.floor(currentTime)}s`);
                                      }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                                      style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}
                                    >
                                      Ambil Detik (Intro Start)
                                    </button>
                                    <button
                                      onClick={() => {
                                        const currentTime = document.querySelector('video')?.currentTime || 0;
                                        updateEditingField('outro_start_seconds', Math.floor(currentTime));
                                        toast.success(`Outro Start di set ke ${Math.floor(currentTime)}s`);
                                      }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                                      style={{ background: 'var(--accent-add)', color: 'var(--accent-add-foreground)' }}
                                    >
                                      Ambil Detik (Outro Start)
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-[var(--foreground)]/50">
                                    Play video lalu klik tombol untuk mengambil posisi detik saat ini
                                  </p>
                                </div>
                              ) : null}

                              {/* Thumbnail Upload */}
                              <div className="space-y-2">
                                <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-2">Thumbnail Episode</label>
                                <div className="flex items-center gap-3">
                                  {(editingEpisode.thumbnail_episode || editingEpisode.thumbnailPreview) && (
                                    <img 
                                      src={editingEpisode.thumbnailPreview || editingEpisode.thumbnail_episode} 
                                      alt="Thumbnail"
                                      className="w-20 h-14 object-cover rounded-lg border-2"
                                      style={{ borderColor: 'var(--panel-border)' }}
                                    />
                                  )}
                                  <div className="flex-1 space-y-2">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setEditingEpisode(prev => ({
                                            ...prev,
                                            thumbnailFile: file,
                                            thumbnailPreview: URL.createObjectURL(file)
                                          }));
                                        }
                                      }}
                                      className="hidden"
                                      id={`thumbnail-upload-${editingEpisode.id}`}
                                    />
                                    <div className="flex gap-2">
                                      <label
                                        htmlFor={`thumbnail-upload-${editingEpisode.id}`}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                        style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}
                                      >
                                        <Upload className="w-3 h-3" /> Upload File
                                      </label>
                                      <span className="text-[10px] text-[var(--foreground)]/50 self-center">atau</span>
                                      <input
                                        type="url"
                                        value={editingEpisode.thumbnail_episode || ''}
                                        onChange={(e) => updateEditingField('thumbnail_episode', e.target.value)}
                                        placeholder="https://.../thumbnail.jpg"
                                        className="flex-1 rounded-lg border-2 px-3 py-1.5 text-xs"
                                        style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-[var(--foreground)]/50">
                                      Upload file (max 10MB) atau paste URL. Server akan re-upload ke CDN.
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Video Links Edit dengan Status */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-xs font-bold text-[var(--foreground)]/60">Edit Link Video</label>
                                  <button
                                    onClick={addQuality}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
                                    style={{ background: 'var(--accent-add)', color: 'var(--accent-add-foreground)' }}
                                  >
                                    <Plus className="w-3 h-3" /> Tambah Quality
                                  </button>
                                </div>
                                
                                {/* Quality Status Summary dari API */}
                                {qualityStatus[editingEpisode.id]?.summary && (
                                  <div className="mb-3 p-2 rounded-lg text-xs" 
                                    style={{ 
                                      background: qualityStatus[editingEpisode.id].summary.has_issues ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                                      border: `1px solid ${qualityStatus[editingEpisode.id].summary.has_issues ? '#f59e0b' : '#22c55e'}`
                                    }}
                                  >
                                    <span className={qualityStatus[editingEpisode.id].summary.has_issues ? 'text-amber-600' : 'text-green-600'}>
                                      {qualityStatus[editingEpisode.id].summary.working}/{qualityStatus[editingEpisode.id].summary.total} berfungsi, 
                                      {qualityStatus[editingEpisode.id].summary.pending > 0 && ` ${qualityStatus[editingEpisode.id].summary.pending} pending,`}
                                      {qualityStatus[editingEpisode.id].summary.failed > 0 && ` ${qualityStatus[editingEpisode.id].summary.failed} gagal`}
                                    </span>
                                  </div>
                                )}
                                
                                <div className="space-y-2">
                                  {editingEpisode.qualities?.map((q, qIdx) => {
                                    const isValid = isValidVideoUrl(q.source_quality);
                                    const isFilled = !!q.source_quality;
                                    // Cek status dari API check
                                    const apiQuality = qualityStatus[editingEpisode.id]?.qualities?.find(aq => aq.nama_quality === q.nama_quality);
                                    const isWorking = apiQuality?.is_working;
                                    const hlsStatus = apiQuality?.hls_status;
                                    const hasIssues = apiQuality?.issues?.length > 0;
                                    
                                    return (
                                      <div key={qIdx} className="flex items-center gap-2">
                                        <span className="px-2 py-1 rounded text-xs font-bold w-16 text-center" 
                                          style={{ 
                                            background: isWorking === true ? 'rgba(34,197,94,0.2)' : 
                                                       isWorking === false ? 'rgba(239,68,68,0.2)' :
                                                       isValid ? 'rgba(34,197,94,0.2)' : isFilled ? 'rgba(245,158,11,0.2)' : 'var(--panel-bg)', 
                                            color: isWorking === true ? '#22c55e' : 
                                                  isWorking === false ? '#ef4444' :
                                                  isValid ? '#22c55e' : isFilled ? '#f59e0b' : 'var(--foreground)',
                                            border: `1px solid ${isWorking === true ? '#22c55e' : 
                                                               isWorking === false ? '#ef4444' :
                                                               isValid ? '#22c55e' : isFilled ? '#f59e0b' : 'var(--panel-border)'}`
                                          }}
                                          title={hasIssues ? apiQuality.issues.join(', ') : ''}
                                        >
                                          {q.nama_quality}
                                          {hasIssues && ' ⚠'}
                                        </span>
                                        <input
                                          type="url"
                                          value={q.source_quality || ''}
                                          onChange={(e) => updateQualityLink(q.id, e.target.value)}
                                          placeholder={`https://.../${q.nama_quality}.mp4`}
                                          className="flex-1 rounded-lg border-2 px-3 py-2 text-sm"
                                          style={{ 
                                            background: 'var(--background)', 
                                            color: 'var(--foreground)', 
                                            borderColor: isWorking === true ? '#22c55e' : 
                                                        isWorking === false ? '#ef4444' :
                                                        isValid ? '#22c55e' : isFilled ? '#f59e0b' : 'var(--panel-border)'
                                          }}
                                        />
                                        {isWorking === true ? (
                                          <span className="text-green-500 text-xs font-bold">✓ OK</span>
                                        ) : isWorking === false ? (
                                          <span className="text-red-500 text-xs font-bold" title={apiQuality?.issues?.join(', ') || 'Tidak berfungsi'}>✗ Error</span>
                                        ) : isValid ? (
                                          <span className="text-green-500 text-xs font-bold">✓ Valid</span>
                                        ) : isFilled ? (
                                          <span className="text-amber-500 text-xs" title="Format: https://.../file.mp4">⚠ Format</span>
                                        ) : null}
                                        <button
                                          onClick={() => removeQuality(q.id)}
                                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"
                                          title="Hapus quality"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="mt-2 text-xs">
                                  {(() => {
                                    const apiSummary = qualityStatus[editingEpisode.id]?.summary;
                                    if (apiSummary) {
                                      if (apiSummary.has_issues) {
                                        return <span className="text-amber-500">⚠ {apiSummary.working}/{apiSummary.total} berfungsi, cek detail di atas</span>;
                                      }
                                      return <span className="text-green-500">✓ Semua {apiSummary.total} quality berfungsi normal</span>;
                                    }
                                    const validCount = editingEpisode.qualities?.filter(q => isValidVideoUrl(q.source_quality)).length || 0;
                                    const filledCount = editingEpisode.qualities?.filter(q => q.source_quality).length || 0;
                                    const totalCount = editingEpisode.qualities?.length || 0;
                                    if (filledCount === 0) return <span className="text-red-500">⚠ Belum ada link video</span>;
                                    if (validCount === 0) return <span className="text-red-500">⚠ {filledCount} link tapi format tidak valid (harus https://.../file.mp4)</span>;
                                    if (validCount < filledCount) return <span className="text-yellow-500">⚠ {validCount} valid, {filledCount - validCount} format salah dari {totalCount}</span>;
                                    if (validCount < totalCount) return <span className="text-green-500">✓ {validCount} quality valid (dari {totalCount})</span>;
                                    return <span className="text-green-500">✓ Semua {totalCount} quality valid</span>;
                                  })()}
                                </div>
                              </div>

                              {/* Intro/Outro Edit */}
                              <div>
                                <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-2">Edit Intro & Outro (detik)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div>
                                    <span className="text-[10px] text-[var(--foreground)]/50">Intro Start</span>
                                    <input
                                      type="number"
                                      value={editingEpisode.intro_start_seconds ?? 0}
                                      onChange={(e) => updateEditingField('intro_start_seconds', Number(e.target.value))}
                                      className="w-full rounded-lg border-2 px-2 py-1.5 text-sm"
                                      style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[var(--foreground)]/50">Intro Durasi</span>
                                    <input
                                      type="number"
                                      value={editingEpisode.intro_duration_seconds ?? 90}
                                      onChange={(e) => updateEditingField('intro_duration_seconds', Number(e.target.value))}
                                      className="w-full rounded-lg border-2 px-2 py-1.5 text-sm"
                                      style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[var(--foreground)]/50">Outro Start</span>
                                    <input
                                      type="number"
                                      value={editingEpisode.outro_start_seconds ?? ''}
                                      placeholder="Auto"
                                      onChange={(e) => updateEditingField('outro_start_seconds', e.target.value ? Number(e.target.value) : null)}
                                      className="w-full rounded-lg border-2 px-2 py-1.5 text-sm"
                                      style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[var(--foreground)]/50">Outro Durasi</span>
                                    <input
                                      type="number"
                                      value={editingEpisode.outro_duration_seconds ?? 90}
                                      onChange={(e) => updateEditingField('outro_duration_seconds', Number(e.target.value))}
                                      className="w-full rounded-lg border-2 px-2 py-1.5 text-sm"
                                      style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Judul, Durasi & Deskripsi Edit */}
                              <div className="space-y-3">
                                <div className="grid sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-1">Judul Episode</label>
                                    <input
                                      type="text"
                                      value={editingEpisode.judul_episode || ''}
                                      onChange={(e) => updateEditingField('judul_episode', e.target.value)}
                                      className="w-full rounded-lg border-2 px-3 py-2 text-sm"
                                      style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-1">Durasi (menit)</label>
                                    <input
                                      type="number"
                                      value={editingEpisode.durasi_episode || 24}
                                      onChange={(e) => updateEditingField('durasi_episode', Number(e.target.value))}
                                      className="w-full rounded-lg border-2 px-3 py-2 text-sm"
                                      style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-1">Deskripsi Episode</label>
                                  <textarea
                                    rows={2}
                                    value={editingEpisode.deskripsi_episode || ''}
                                    onChange={(e) => updateEditingField('deskripsi_episode', e.target.value)}
                                    placeholder="Deskripsi singkat episode..."
                                    className="w-full rounded-lg border-2 px-3 py-2 text-sm resize-none"
                                    style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                                  />
                                </div>
                              </div>

                              {/* Save/Cancel Buttons */}
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={saveEpisode}
                                  disabled={savingEpisode === ep.id}
                                  className="inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-bold text-sm"
                                  style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)', borderColor: 'var(--panel-border)' }}
                                >
                                  {savingEpisode === ep.id ? (
                                    <span className="animate-pulse">Menyimpan...</span>
                                  ) : (
                                    <><Save className="w-4 h-4" /> Simpan</>
                                  )}
                                </button>
                                <button
                                  onClick={() => setEditingEpisode(null)}
                                  disabled={savingEpisode === ep.id}
                                  className="inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-bold text-sm"
                                  style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                                >
                                  <X className="w-4 h-4" /> Batal
                                </button>
                              </div>
                            </>
                          ) : (
                            // VIEW MODE - Player & Info
                            <>
                              {/* Video Player */}
                              {Array.isArray(ep.qualities) && ep.qualities.length > 0 && ep.qualities[0]?.source_quality ? (
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-[var(--foreground)]/60">Preview Video</label>
                                  <video
                                    controls
                                    className="w-full rounded-lg"
                                    style={{ maxHeight: '300px' }}
                                    poster={ep.thumbnail_episode || ''}
                                  >
                                    <source src={ep.qualities[0].source_quality} type="video/mp4" />
                                    Browser tidak support video.
                                  </video>
                                </div>
                              ) : ep.hls_master_url ? (
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-[var(--foreground)]/60">HLS Stream</label>
                                  <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                                    <p className="text-xs text-[var(--foreground)]/60 mb-2">HLS Master URL</p>
                                    <input
                                      type="text"
                                      value={ep.hls_master_url}
                                      readOnly
                                      className="w-full rounded-lg border-2 px-3 py-2 text-xs mb-2"
                                      style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-[var(--foreground)]/50">Belum ada video</div>
                              )}

                              {/* Qualities List */}
                              {Array.isArray(ep.qualities) && ep.qualities.length > 0 && (
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-[var(--foreground)]/60">Available Qualities</label>
                                  <div className="flex flex-wrap gap-2">
                                    {ep.qualities.map((q, qIdx) => (
                                      <span key={qIdx} className="px-2 py-1 rounded text-xs font-bold" style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}>
                                        {q.nama_quality || '-'}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Intro/Outro Info */}
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-2 rounded-lg" style={{ background: 'var(--background)' }}>
                                  <span className="text-[var(--foreground)]/60">Intro:</span>
                                  <span className="ml-1 font-bold">{ep.intro_start_seconds || 0}s - {(ep.intro_start_seconds || 0) + (ep.intro_duration_seconds || 90)}s</span>
                                </div>
                                <div className="p-2 rounded-lg" style={{ background: 'var(--background)' }}>
                                  <span className="text-[var(--foreground)]/60">Outro:</span>
                                  <span className="ml-1 font-bold">{ep.outro_start_seconds || '-'}s - {(ep.outro_start_seconds || 0) + (ep.outro_duration_seconds || 90)}s</span>
                                </div>
                              </div>

                              {/* Quality Check Section */}
                              {Array.isArray(ep.qualities) && ep.qualities.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-[var(--foreground)]/60">Status Quality</label>
                                    <button
                                      onClick={() => checkEpisodeQualityStatus(ep.id)}
                                      disabled={checkingQuality === ep.id}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold disabled:opacity-50"
                                      style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}
                                    >
                                      {checkingQuality === ep.id ? (
                                        <span className="animate-pulse">Mengecek...</span>
                                      ) : (
                                        <><Play className="w-3 h-3" /> Cek Quality</>
                                      )}
                                    </button>
                                  </div>
                                  
                                  {/* Quality Detail dari Backend */}
                                  {qualityStatus[ep.id]?.qualities && (
                                    <div className="space-y-1">
                                      {qualityStatus[ep.id].qualities.map((q, qIdx) => (
                                        <div 
                                          key={qIdx} 
                                          className="flex items-center justify-between p-2 rounded-lg text-xs"
                                          style={{ 
                                            background: q.is_working ? 'rgba(34,197,94,0.1)' : q.has_source_url ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                            border: `1px solid ${q.is_working ? '#22c55e' : q.has_source_url ? '#f59e0b' : '#ef4444'}`
                                          }}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="px-1.5 py-0.5 rounded font-bold" 
                                              style={{ 
                                                background: q.is_working ? '#22c55e' : q.has_source_url ? '#f59e0b' : '#ef4444',
                                                color: 'white'
                                              }}
                                            >
                                              {q.nama_quality}
                                            </span>
                                            <span className={q.is_working ? 'text-green-600' : 'text-red-500'}>
                                              {q.is_working ? '✓ Bisa diputar' : '✗ Tidak berfungsi'}
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-[var(--foreground)]/60">
                                            HLS: {q.hls_status || 'N/A'}
                                          </div>
                                        </div>
                                      ))}
                                      
                                      {/* Issues List */}
                                      {qualityStatus[ep.id].qualities.some(q => q.issues?.length > 0) && (
                                        <div className="mt-2 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                          <span className="text-xs font-bold text-red-500">Masalah yang ditemukan:</span>
                                          <ul className="mt-1 text-[10px] text-red-400 list-disc list-inside">
                                            {qualityStatus[ep.id].qualities.flatMap(q => q.issues || []).map((issue, i) => (
                                              <li key={i}>{issue}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Edit Button */}
                              <div className="pt-2">
                                <button
                                  onClick={() => startEditEpisode(ep)}
                                  className="inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-bold text-sm"
                                  style={{ background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}
                                >
                                  <Edit className="w-4 h-4" /> Edit Episode
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )) : (
                <div className="rounded-2xl border-2 p-8 text-center" style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                  <p className="text-[var(--foreground)]/60">Belum ada episode</p>
                  <button
                    onClick={() => setShowAddEpisode(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold"
                    style={{ background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
                  >
                    <Plus className="w-4 h-4" /> Tambah Episode Pertama
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
