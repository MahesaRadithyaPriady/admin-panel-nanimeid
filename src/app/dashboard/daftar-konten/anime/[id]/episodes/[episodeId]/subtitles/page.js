'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Upload, Trash2, Star, FileText, Loader2, Play, AlertCircle, CheckCircle2, Download, Edit3, FileEdit } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getAnimeDetail, listEpisodes, listEpisodeSubtitles, uploadEpisodeSubtitle, deleteEpisodeSubtitle, setDefaultEpisodeSubtitle } from '@/lib/api';
import { SubtitleEditor } from '@/components/SubtitleEditor';
import { CustomVideoPlayer } from '@/components/CustomVideoPlayer';

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

const SUBTITLE_FORMATS = [
  { ext: 'ass', label: 'ASS', desc: 'Advanced SubStation Alpha — support styling & positioning', recommended: true },
  { ext: 'srt', label: 'SRT', desc: 'SubRip — format paling umum, plain text' },
  { ext: 'vtt', label: 'VTT', desc: 'WebVTT — format web standard, support cues' },
];

// Parse subtitle file content into cues [{id, start, end, text}]
function parseSRT(content) {
  const cues = [];
  const blocks = content.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;
    const timeMatch = lines[1]?.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    if (!timeMatch) continue;
    const start = (+timeMatch[1]) * 3600 + (+timeMatch[2]) * 60 + (+timeMatch[3]) + (+timeMatch[4]) / 1000;
    const end = (+timeMatch[5]) * 3600 + (+timeMatch[6]) * 60 + (+timeMatch[7]) + (+timeMatch[8]) / 1000;
    const text = lines.slice(2).join('\n').trim();
    cues.push({ id: `srt_${cues.length}`, start, end, text });
  }
  return cues;
}

function parseVTT(content) {
  const cues = [];
  const blocks = content.replace(/\r\n/g, '\n').replace(/^WEBVTT.*\n/i, '').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const timeLineIdx = lines.findIndex(l => l.includes('-->'));
    if (timeLineIdx < 0) continue;
    const timeMatch = lines[timeLineIdx].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    if (!timeMatch) continue;
    const start = (+timeMatch[1]) * 3600 + (+timeMatch[2]) * 60 + (+timeMatch[3]) + (+timeMatch[4]) / 1000;
    const end = (+timeMatch[5]) * 3600 + (+timeMatch[6]) * 60 + (+timeMatch[7]) + (+timeMatch[8]) / 1000;
    const text = lines.slice(timeLineIdx + 1).join('\n').trim();
    cues.push({ id: `vtt_${cues.length}`, start, end, text });
  }
  return cues;
}

function parseASSTime(t) {
  const m = t.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
  if (!m) return 0;
  return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 100;
}

function parseASS(content) {
  const cues = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let inEvents = false;
  let formatFields = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      inEvents = trimmed.toLowerCase() === '[events]';
      continue;
    }
    if (!inEvents) continue;
    if (trimmed.startsWith('Format:')) {
      formatFields = trimmed.slice(8).split(',').map(f => f.trim().toLowerCase());
      continue;
    }
    if (trimmed.startsWith('Dialogue:')) {
      const parts = trimmed.slice(9).split(',');
      const startIdx = formatFields.indexOf('start');
      const endIdx = formatFields.indexOf('end');
      const textIdx = formatFields.indexOf('text');
      if (startIdx < 0 || endIdx < 0 || textIdx < 0) continue;
      if (parts.length < Math.max(startIdx + 1, endIdx + 1, textIdx + 1)) continue;
      const start = parseASSTime(parts[startIdx]);
      const end = parseASSTime(parts[endIdx]);
      const text = parts.slice(textIdx).join(',').replace(/\{[^}]*\}/g, '').replace(/\\N/gi, '\n').trim();
      cues.push({ id: `ass_${cues.length}`, start, end, text });
    }
  }
  return cues;
}

function parseSubtitleContent(content, format) {
  if (!content) return [];
  if (format === 'srt') return parseSRT(content);
  if (format === 'vtt') return parseVTT(content);
  if (format === 'ass') return parseASS(content);
  return [];
}

const LANGUAGE_OPTIONS = [
  { code: 'id', label: 'Indonesia' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'th', label: 'ไทย' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'ar', label: 'العربية' },
];

function isValidVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  try {
    const u = new URL(url);
    const pathname = u.pathname.toLowerCase();
    const validExtensions = ['.mp4', '.m3u8', '.webm', '.mkv', '.avi', '.mov'];
    return validExtensions.some(ext => pathname.endsWith(ext)) && u.hostname.includes('.') && u.hostname.length > 3;
  } catch {
    return false;
  }
}

export default function SubtitleEditorPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const animeId = params?.id;
  const episodeId = params?.episodeId;

  const [anime, setAnime] = useState(null);
  const [episode, setEpisode] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'upload' | 'list'
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);
  const videoRef = useRef(null);
  const [editorCues, setEditorCues] = useState([]);
  const [editorStyles, setEditorStyles] = useState(null);
  const [editorActiveCueId, setEditorActiveCueId] = useState(null);
  const doubleClickRef = useRef(null);
  const createCueRef = useRef(null);
  const updateCueTextRef = useRef(null);
  const seekCueRef = useRef(null);
  const importCuesRef = useRef(null);

  // Existing subtitle preview state
  const [previewSubtitleId, setPreviewSubtitleId] = useState(null);
  const [previewCues, setPreviewCues] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [editingSource, setEditingSource] = useState(null);

  // Upload form state
  const [selectedFormat, setSelectedFormat] = useState('ass');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('id');
  const [customLanguage, setCustomLanguage] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('Indonesia');
  const [customLabel, setCustomLabel] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

  // Fetch & parse existing subtitle for preview
  useEffect(() => {
    if (!previewSubtitleId) {
      setPreviewCues([]);
      return;
    }
    const sub = subtitles.find(s => s.id === previewSubtitleId);
    if (!sub?.url) {
      console.log('[Subtitles] No URL for subtitle:', sub);
      return;
    }
    setLoadingPreview(true);
    console.log('[Subtitles] Fetching from URL:', sub.url);
    // Use proxy to bypass CORS
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(sub.url)}`;
    fetch(proxyUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(content => {
        console.log('[Subtitles] Content length:', content.length, 'first 200 chars:', content.slice(0, 200));
        const cues = parseSubtitleContent(content, sub.format);
        console.log('[Subtitles] Parsed cues:', cues.length, cues.slice(0, 3));
        setPreviewCues(cues);
        if (cues.length > 0) {
          toast.success(`${cues.length} cues dimuat dari subtitle "${sub.label}"`, { duration: 2000 });
        } else {
          toast.error('Subtitle kosong atau gagal di-parse');
        }
      })
      .catch((err) => {
        console.error('[Subtitles] Fetch error:', err);
        toast.error(`Gagal memuat subtitle: ${err.message}`);
        setPreviewCues([]);
      })
      .finally(() => setLoadingPreview(false));
  }, [previewSubtitleId, subtitles]);

  useEffect(() => {
    if (!animeId || !episodeId || !user) return;
    const loadData = async () => {
      setLoadingData(true);
      try {
        const token = getSession()?.token;
        const [animeRes, episodesRes, subsRes] = await Promise.all([
          getAnimeDetail({ token, id: animeId }),
          listEpisodes({ token, animeId, page: 1, limit: 100 }),
          listEpisodeSubtitles({ token, episodeId }),
        ]);
        setAnime(animeRes?.item || null);
        const ep = (episodesRes?.items || []).find(e => String(e.id) === String(episodeId));
        setEpisode(ep || null);
        const subsData = subsRes?.items || subsRes?.data || subsRes?.subtitles || subsRes || [];
        const subsList = Array.isArray(subsData) ? subsData : (subsData?.items || []);
        console.log('[Subtitles] API response:', subsRes);
        console.log('[Subtitles] Parsed list:', subsList);
        setSubtitles(subsList);
        // Auto-select default subtitle for preview
        const defaultSub = subsList.find(s => s.is_default) || subsList[0];
        if (defaultSub) setPreviewSubtitleId(defaultSub.id);
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat data');
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [animeId, episodeId, user]);

  const validQualities = (episode?.qualities || []).filter(q => isValidVideoUrl(q.source_quality));
  const hasValidQuality = validQualities.length > 0;
  const currentVideoUrl = selectedVideoUrl || validQualities[0]?.source_quality || null;

  // Merge editor cues + existing subtitle preview cues for video overlay
  const mergedOverlayCues = [
    ...(activeTab === 'editor' ? editorCues : []),
    ...previewCues,
  ];

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['ass', 'srt', 'vtt'].includes(ext)) {
      toast.error('Format file harus .ass, .srt, atau .vtt');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file max 5MB');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
    if (['ass', 'srt', 'vtt'].includes(ext)) {
      setSelectedFormat(ext);
    }
  };

  const onUpload = async (e) => {
    e?.preventDefault();
    if (!selectedFile) {
      toast.error('Pilih file subtitle terlebih dahulu');
      return;
    }
    const lang = customLanguage.trim() || selectedLanguage;
    const label = customLabel.trim() || selectedLabel || lang;
    if (!lang) {
      toast.error('Bahasa subtitle wajib diisi');
      return;
    }
    setUploading(true);
    try {
      const token = getSession()?.token;
      await uploadEpisodeSubtitle({ token, episodeId, file: selectedFile, language: lang, label, isDefault });
      toast.success('Subtitle berhasil diupload!');
      setSelectedFile(null);
      setCustomLanguage('');
      setCustomLabel('');
      setIsDefault(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const subsRes = await listEpisodeSubtitles({ token, episodeId });
      setSubtitles(subsRes?.items || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal upload subtitle');
    } finally {
      setUploading(false);
    }
  };

  const onUploadGenerated = async (fileObj, ext) => {
    const lang = customLanguage.trim() || selectedLanguage;
    const label = customLabel.trim() || selectedLabel || lang;
    if (!lang) {
      toast.error('Isi bahasa subtitle dulu di tab Upload');
      setActiveTab('upload');
      throw new Error('Bahasa belum diisi');
    }
    const token = getSession()?.token;
    await uploadEpisodeSubtitle({ token, episodeId, file: fileObj, language: lang, label, isDefault });
    toast.success(`Subtitle ${ext.toUpperCase()} berhasil diupload!`);
    const subsRes = await listEpisodeSubtitles({ token, episodeId });
    setSubtitles(subsRes?.items || []);
  };

  const onDelete = async (subtitleId) => {
    if (!confirm('Hapus subtitle ini?')) return;
    try {
      const token = getSession()?.token;
      await deleteEpisodeSubtitle({ token, episodeId, subtitleId });
      toast.success('Subtitle dihapus');
      setSubtitles(prev => prev.filter(s => s.id !== subtitleId));
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus subtitle');
    }
  };

  const onSetDefault = async (subtitleId) => {
    try {
      const token = getSession()?.token;
      await setDefaultEpisodeSubtitle({ token, episodeId, subtitleId });
      toast.success('Subtitle default diupdate');
      setSubtitles(prev => prev.map(s => ({ ...s, is_default: s.id === subtitleId })));
    } catch (err) {
      toast.error(err?.message || 'Gagal set default subtitle');
    }
  };

  const onEditSubtitle = async (sub) => {
    if (!sub?.url) {
      toast.error('URL subtitle tidak valid');
      return;
    }
    setActiveTab('editor');
    toast.loading('Memuat subtitle untuk editing...', { id: 'edit-sub' });
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(sub.url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();
      const cues = parseSubtitleContent(content, sub.format);
      if (cues.length === 0) {
        toast.error('Subtitle kosong atau gagal di-parse', { id: 'edit-sub' });
        return;
      }
      importCuesRef.current?.(cues, { id: sub.id, label: sub.label, format: sub.format, language: sub.language }, sub.format);
      toast.success(`${cues.length} cues dimuat untuk editing`, { id: 'edit-sub' });
    } catch (err) {
      toast.error(`Gagal memuat subtitle: ${err.message}`, { id: 'edit-sub' });
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-3 border-[var(--accent-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-[var(--foreground)]/60">Episode tidak ditemukan</p>
        <button onClick={() => router.push(`/dashboard/daftar-konten/anime/${animeId}`)}
          className="inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-bold"
          style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
      </div>
    );
  }

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push(`/dashboard/daftar-konten/anime/${animeId}`)}
          className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold transition-all hover:translate-y-[-2px]"
          style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)] truncate">
              Subtitle Editor
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
              BETA
            </span>
          </div>
          <p className="text-sm text-[var(--foreground)]/70 truncate">
            {anime?.nama_anime} • Episode {episode.nomor_episode} — {episode.judul_episode}
          </p>
        </div>
      </div>

      {/* Video Preview Requirement Check */}
      {!hasValidQuality && (
        <div className="rounded-2xl border-2 p-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.05)', borderColor: '#f59e0b' }}>
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-600">Tidak ada quality video yang valid</p>
            <p className="text-xs text-amber-500/80 mt-1">
              Minimal 1 quality dengan URL video valid (mp4, webm, mkv, dll) diperlukan untuk preview subtitle.
              Silakan tambahkan quality video di episode terlebih dahulu.
            </p>
          </div>
        </div>
      )}

      {/* Video Preview */}
      {hasValidQuality && currentVideoUrl && (
        <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
          <div className="p-4 border-b-2 flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: 'var(--panel-border)' }}>
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-[var(--accent-primary)]" />
              <span className="font-bold text-sm text-[var(--foreground)]">Preview Video</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Subtitle preview selector */}
              {subtitles.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[var(--foreground)]/50" />
                  <select
                    value={previewSubtitleId || ''}
                    onChange={(e) => setPreviewSubtitleId(e.target.value || null)}
                    disabled={loadingPreview}
                    className="text-xs rounded-lg border-2 px-2 py-1"
                    style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                  >
                    <option value="">Sub: Off</option>
                    {subtitles.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        Sub: {sub.label} ({sub.language}) .{sub.format}
                      </option>
                    ))}
                  </select>
                  {loadingPreview && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-primary)]" />}
                  {previewCues.length > 0 && !loadingPreview && (
                    <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                      {previewCues.length} cues
                    </span>
                  )}
                </div>
              )}
              {/* Video quality selector */}
              <select
                value={currentVideoUrl}
                onChange={(e) => setSelectedVideoUrl(e.target.value)}
                className="text-xs rounded-lg border-2 px-2 py-1"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              >
                {validQualities.map((q, i) => (
                  <option key={i} value={q.source_quality}>{q.nama_quality}</option>
                ))}
              </select>
            </div>
          </div>
          <CustomVideoPlayer
            videoRef={videoRef}
            src={currentVideoUrl}
            poster={episode.thumbnail_episode || ''}
            key={currentVideoUrl}
            subtitleOverlay={mergedOverlayCues.length > 0 ? mergedOverlayCues : undefined}
            overlayStyle={activeTab === 'editor' ? editorStyles : undefined}
            onDoubleClick={activeTab === 'editor' ? (time) => doubleClickRef.current?.(time) : undefined}
            cueRanges={activeTab === 'editor' ? editorCues : undefined}
            activeCueId={activeTab === 'editor' ? editorActiveCueId : undefined}
            onCreateCueAtTime={activeTab === 'editor' ? (time) => createCueRef.current?.(time) : undefined}
            onUpdateCueText={activeTab === 'editor' ? (cueId, text) => updateCueTextRef.current?.(cueId, text) : undefined}
            onSeekToCue={activeTab === 'editor' ? (cueId) => seekCueRef.current?.(cueId) : undefined}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl border-2" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={{
            background: activeTab === 'editor' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'editor' ? 'var(--accent-primary-foreground)' : 'var(--foreground)',
          }}
        >
          <Edit3 className="w-4 h-4" /> Buat Subtitle
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={{
            background: activeTab === 'upload' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'upload' ? 'var(--accent-primary-foreground)' : 'var(--foreground)',
          }}
        >
          <Upload className="w-4 h-4" /> Upload File
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={{
            background: activeTab === 'list' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'list' ? 'var(--accent-primary-foreground)' : 'var(--foreground)',
          }}
        >
          <FileText className="w-4 h-4" /> Subtitle List ({subtitles.length})
        </button>
      </div>

      {/* Tab: Editor */}
      {activeTab === 'editor' && (
        <div className="rounded-2xl border-2 p-5 space-y-4" style={{ boxShadow: '6px 6px 0 rgba(212,212,212,0.15)', borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
          <div className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-[var(--accent-primary)]" />
            <h2 className="font-bold text-[var(--foreground)]">Buat Subtitle Sendiri</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>BETA</span>
          </div>
          {!hasValidQuality ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="text-sm text-[var(--foreground)]/60">Butuh minimal 1 quality video valid untuk preview</p>
            </div>
          ) : (
            <SubtitleEditor
              videoRef={videoRef}
              videoUrl={currentVideoUrl}
              onUploadGenerated={onUploadGenerated}
              onCuesChange={setEditorCues}
              onStylesChange={setEditorStyles}
              onActiveCueChange={setEditorActiveCueId}
              onDoubleClickCapture={doubleClickRef}
              onCreateCueFromPlayer={createCueRef}
              onUpdateCueTextFromPlayer={updateCueTextRef}
              onSeekFromPlayer={seekCueRef}
              importCuesRef={importCuesRef}
              onEditingSourceChange={setEditingSource}
            />
          )}
        </div>
      )}

      {/* Tab: Upload */}
      {activeTab === 'upload' && (
        <div className="rounded-2xl border-2 p-5 space-y-4" style={{ boxShadow: '6px 6px 0 rgba(212,212,212,0.15)', borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[var(--accent-primary)]" />
            <h2 className="font-bold text-[var(--foreground)]">Upload Subtitle Baru</h2>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-2">Pilih Format Subtitle</label>
            <div className="grid sm:grid-cols-3 gap-3">
              {SUBTITLE_FORMATS.map((fmt) => (
                <button
                  key={fmt.ext}
                  type="button"
                  onClick={() => setSelectedFormat(fmt.ext)}
                  className="relative rounded-xl border-2 p-3 text-left transition-all hover:translate-y-[-2px]"
                  style={{
                    background: selectedFormat === fmt.ext ? 'rgba(34,197,94,0.05)' : 'var(--background)',
                    borderColor: selectedFormat === fmt.ext ? '#22c55e' : 'var(--panel-border)',
                  }}
                >
                  {fmt.recommended && (
                    <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                      DISARANKAN
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black" style={{ color: selectedFormat === fmt.ext ? '#22c55e' : 'var(--foreground)' }}>
                      .{fmt.ext}
                    </span>
                    {selectedFormat === fmt.ext && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  <p className="text-[10px] text-[var(--foreground)]/50 leading-tight">{fmt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-2">File Subtitle</label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ass,.srt,.vtt"
                onChange={onFileChange}
                className="hidden"
                id="subtitle-file-upload"
              />
              <label
                htmlFor="subtitle-file-upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer"
                style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}
              >
                <Upload className="w-4 h-4" /> Pilih File
              </label>
              {selectedFile && (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm font-bold text-[var(--foreground)] truncate">{selectedFile.name}</span>
                  <span className="text-xs text-[var(--foreground)]/50 flex-shrink-0">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                  <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="p-1 hover:bg-red-500/10 rounded">
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-[10px] text-[var(--foreground)]/40 mt-1">
              Format: .ass, .srt, .vtt • Max 5MB
            </p>
          </div>

          {/* Language & Label */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-1.5">Bahasa</label>
              <select
                value={selectedLanguage}
                onChange={(e) => { setSelectedLanguage(e.target.value); setCustomLanguage(''); }}
                className="w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              >
                {LANGUAGE_OPTIONS.map(opt => (
                  <option key={opt.code} value={opt.code}>{opt.label} ({opt.code})</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="atau kode bahasa custom (cth: fr, de, es)"
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                className="w-full mt-2 rounded-lg border-2 px-3 py-1.5 text-xs"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-1.5">Label Tampilan</label>
              <input
                type="text"
                placeholder={LANGUAGE_OPTIONS.find(o => o.code === selectedLanguage)?.label || 'Indonesia'}
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
              <p className="text-[10px] text-[var(--foreground)]/40 mt-1">
                Nama yang ditampilkan ke user (cth: Indonesia, English)
              </p>
            </div>
          </div>

          {/* Default Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-bold text-[var(--foreground)]">Set sebagai subtitle default</span>
          </label>

          {/* Upload Button */}
          <button
            onClick={onUpload}
            disabled={!selectedFile || uploading}
            className="inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-bold text-sm disabled:opacity-50"
            style={{ background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Mengupload...' : 'Upload Subtitle'}
          </button>
        </div>
      )}

      {/* Tab: List */}
      {activeTab === 'list' && (
        <div className="rounded-2xl border-2 p-5 space-y-3" style={{ boxShadow: '6px 6px 0 rgba(212,212,212,0.15)', borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--accent-primary)]" />
            <h2 className="font-bold text-[var(--foreground)]">Subtitle List ({subtitles.length})</h2>
          </div>

          {subtitles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 mx-auto text-[var(--foreground)]/20 mb-2" />
              <p className="text-sm text-[var(--foreground)]/50">Belum ada subtitle untuk episode ini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subtitles.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-3 p-3 rounded-xl border-2"
                  style={{ background: 'var(--background)', borderColor: sub.is_default ? '#22c55e' : 'var(--panel-border)' }}
                >
                  {/* Format Badge */}
                  <span
                    className="px-2 py-1 rounded text-xs font-bold w-14 text-center flex-shrink-0"
                    style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}
                  >
                    .{sub.format}
                  </span>

                  {/* Language & Label */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[var(--foreground)]">{sub.label}</span>
                      <span className="text-xs text-[var(--foreground)]/50">({sub.language})</span>
                      {sub.is_default && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                          <Star className="w-2.5 h-2.5" /> DEFAULT
                        </span>
                      )}
                    </div>
                    <a
                      href={sub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[var(--foreground)]/40 hover:text-[var(--accent-primary)] truncate block"
                    >
                      {sub.url}
                    </a>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onEditSubtitle(sub)}
                      className="p-1.5 rounded-lg hover:bg-blue-500/10 transition-colors"
                      title="Edit subtitle di editor"
                    >
                      <FileEdit className="w-4 h-4 text-blue-500" />
                    </button>
                    <a
                      href={sub.url}
                      download
                      className="p-1.5 rounded-lg hover:bg-[var(--panel-bg)] transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-[var(--foreground)]/60" />
                    </a>
                    {!sub.is_default && (
                      <button
                        onClick={() => onSetDefault(sub.id)}
                        className="p-1.5 rounded-lg hover:bg-green-500/10 transition-colors"
                        title="Set sebagai default"
                      >
                        <Star className="w-4 h-4 text-[var(--foreground)]/40" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(sub.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Hapus subtitle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Beta Notice */}
      <div className="rounded-xl border-2 p-3 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.3)' }}>
        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-500/80">
          <span className="font-bold">Fitur Beta:</span> Subtitle editor masih dalam pengembangan.
          Upload subtitle dengan format ASS (disarankan), SRT, atau VTT.
          Jika menemukan bug, laporkan ke developer.
        </p>
      </div>
    </motion.div>
  );
}
