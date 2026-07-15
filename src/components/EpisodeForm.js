'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Play, Clock } from 'lucide-react';

export const QUALITIES = [
  { key: '360p', label: '360p', placeholder: 'Link video 360p' },
  { key: '480p', label: '480p', placeholder: 'Link video 480p' },
  { key: '720p', label: '720p', placeholder: 'Link video 720p' },
  { key: '1080p', label: '1080p', placeholder: 'Link video 1080p' },
];

export function isValidVideoUrl(url) {
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

export function getEpisodeQualities(ep) {
  const all = { ...(ep.qualities || {}) };
  ep.customQualities?.forEach((cq) => {
    if (cq.name?.trim()) {
      all[cq.name.trim()] = cq.url || '';
    }
  });
  return all;
}

export function createEmptyEpisode(startNumber) {
  return {
    id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    nomor_episode: startNumber,
    judul_episode: `Episode ${startNumber}`,
    deskripsi_episode: '',
    intro_start_seconds: 0,
    intro_duration_seconds: 90,
    outro_start_seconds: null,
    outro_duration_seconds: 90,
    qualities: { '360p': '', '480p': '', '720p': '', '1080p': '' },
    hiddenQualities: [],
    customQualities: [],
    status: 'pending',
  };
}

export function EpisodeForm({ episode, onChange, showVideoPreview = false }) {
  if (!episode) return null;

  const updateField = (field, value) => onChange({ ...episode, [field]: value });

  const updateQuality = (key, value) =>
    onChange({ ...episode, qualities: { ...episode.qualities, [key]: value } });

  const removeStandardQuality = (key) =>
    onChange({
      ...episode,
      qualities: { ...episode.qualities, [key]: '' },
      hiddenQualities: [...(episode.hiddenQualities || []), key],
    });

  const restoreStandardQuality = (key) =>
    onChange({ ...episode, hiddenQualities: (episode.hiddenQualities || []).filter(q => q !== key) });

  const addCustomQuality = () =>
    onChange({ ...episode, customQualities: [...(episode.customQualities || []), { name: '', url: '' }] });

  const updateCustomQuality = (index, field, value) =>
    onChange({
      ...episode,
      customQualities: (episode.customQualities || []).map((cq, i) => (i === index ? { ...cq, [field]: value } : cq)),
    });

  const removeCustomQuality = (index) =>
    onChange({ ...episode, customQualities: (episode.customQualities || []).filter((_, i) => i !== index) });

  const allQualities = getEpisodeQualities(episode);
  const hasValidVideo = Object.values(allQualities).some(url => url?.trim() && isValidVideoUrl(url));

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-1.5">Nomor Episode</label>
          <input
            type="number"
            value={episode.nomor_episode}
            onChange={(e) => updateField('nomor_episode', Number(e.target.value))}
            className="w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold"
            style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[var(--foreground)]/60 mb-1.5">Judul Episode</label>
          <input
            type="text"
            placeholder={`Episode ${episode.nomor_episode}`}
            value={episode.judul_episode}
            onChange={(e) => updateField('judul_episode', e.target.value)}
            className="w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold"
            style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
          />
        </div>
      </div>

      {/* Video Links */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold text-[var(--foreground)]/60">Link Video (isi minimal 1)</label>
          {showVideoPreview && hasValidVideo && (
            <EpisodeVideoPreview
              qualities={allQualities}
              onCapture={(field, value) => updateField(field, value)}
              introStart={episode.intro_start_seconds}
            />
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {QUALITIES.filter(q => !(episode.hiddenQualities || []).includes(q.key)).map((q) => (
            <div key={q.key} className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-0.5 rounded"
                style={{
                  background: episode.qualities[q.key] ? 'rgba(34,197,94,0.2)' : 'var(--background)',
                  color: episode.qualities[q.key] ? '#22c55e' : 'var(--foreground)',
                  border: `1px solid ${episode.qualities[q.key] ? '#22c55e' : 'var(--panel-border)'}`,
                }}
              >
                {q.label}
              </span>
              <input
                type="url"
                placeholder={q.placeholder}
                value={episode.qualities[q.key]}
                onChange={(e) => updateQuality(q.key, e.target.value)}
                className="w-full rounded-lg border-2 pl-16 pr-10 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
              <button
                type="button"
                onClick={() => removeStandardQuality(q.key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-70"
                title="Hapus resolusi"
              >
                <X className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
              </button>
            </div>
          ))}
          {(episode.customQualities || []).map((cq, idx) => (
            <div key={`cq_${idx}`} className="relative">
              <input
                type="text"
                placeholder="Resolusi"
                value={cq.name}
                onChange={(e) => updateCustomQuality(idx, 'name', e.target.value)}
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
                onChange={(e) => updateCustomQuality(idx, 'url', e.target.value)}
                className="w-full rounded-lg border-2 pl-20 pr-10 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
              <button
                type="button"
                onClick={() => removeCustomQuality(idx)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-70"
                title="Hapus resolusi"
              >
                <X className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {(episode.hiddenQualities || []).length > 0 && (
            <>
              <span className="text-xs text-[var(--foreground)]/50 font-bold">Tambah kembali:</span>
              {(episode.hiddenQualities || []).map((hq) => (
                <button
                  key={hq}
                  type="button"
                  onClick={() => restoreStandardQuality(hq)}
                  className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border-2"
                  style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                >
                  <Plus className="w-3 h-3" /> {hq}
                </button>
              ))}
              <span className="text-xs text-[var(--foreground)]/30">|</span>
            </>
          )}
          <button
            type="button"
            onClick={addCustomQuality}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border-2"
            style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
          >
            <Plus className="w-3 h-3" /> Tambah Resolusi Custom
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
              value={episode.intro_start_seconds ?? 0}
              onChange={(e) => updateField('intro_start_seconds', e.target.value === '' ? null : Number(e.target.value))}
              className="w-full rounded-lg border-2 px-2 py-1.5 text-sm"
              style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
            />
          </div>
          <div>
            <span className="text-[10px] text-[var(--foreground)]/50">Intro Durasi</span>
            <input
              type="number"
              value={episode.intro_duration_seconds ?? 90}
              onChange={(e) => updateField('intro_duration_seconds', e.target.value === '' ? null : Number(e.target.value))}
              className="w-full rounded-lg border-2 px-2 py-1.5 text-sm"
              style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
            />
          </div>
          <div>
            <span className="text-[10px] text-[var(--foreground)]/50">Outro Start</span>
            <input
              type="number"
              value={episode.outro_start_seconds ?? ''}
              placeholder="Auto"
              onChange={(e) => updateField('outro_start_seconds', e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border-2 px-2 py-1.5 text-sm"
              style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
            />
          </div>
          <div>
            <span className="text-[10px] text-[var(--foreground)]/50">Outro Durasi</span>
            <input
              type="number"
              value={episode.outro_duration_seconds ?? 90}
              onChange={(e) => updateField('outro_duration_seconds', e.target.value === '' ? null : Number(e.target.value))}
              className="w-full rounded-lg border-2 px-2 py-1.5 text-sm"
              style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-[10px] text-[var(--foreground)]/40">
            Outro Start kosong = otomatis dihitung dari durasi episode
          </p>
          {episode.intro_start_seconds !== null && episode.intro_duration_seconds !== null && (
            <span className="text-[10px] bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded">
              Intro: {episode.intro_start_seconds}s - {(episode.intro_start_seconds ?? 0) + (episode.intro_duration_seconds ?? 0)}s
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
          value={episode.deskripsi_episode}
          onChange={(e) => updateField('deskripsi_episode', e.target.value)}
          className="w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold resize-none"
          style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
        />
      </div>
    </div>
  );
}

function EpisodeVideoPreview({ qualities, onCapture, introStart }) {
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const availableQualities = Object.entries(qualities)
    .filter(([_, url]) => url?.trim() && isValidVideoUrl(url))
    .map(([quality, url]) => ({ quality, url }));

  if (availableQualities.length === 0) return null;

  const currentQuality = selectedQuality || availableQualities[0];
  const videoId = `preview-video-${Date.now()}`;

  const captureTime = (type) => {
    const video = document.getElementById(videoId);
    if (!video) return;
    const currentTime = Math.floor(video.currentTime);
    switch (type) {
      case 'intro_start':
        onCapture('intro_start_seconds', currentTime);
        toast.success(`Intro Start = ${currentTime}d`);
        break;
      case 'intro_end': {
        const introEnd = currentTime;
        const introDuration = introEnd - (introStart ?? 0);
        if (introDuration > 0) {
          onCapture('intro_duration_seconds', introDuration);
          toast.success(`Intro Durasi = ${introDuration}d`);
        } else {
          toast.error('Durasi intro harus > 0');
        }
        break;
      }
      case 'outro_start':
        onCapture('outro_start_seconds', currentTime);
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
                <button type="button" onClick={() => setShowPlayer(false)} className="p-2 rounded-lg hover:bg-[var(--background)]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="aspect-video bg-black">
                <video id={videoId} src={currentQuality.url} controls className="w-full h-full" preload="metadata" />
              </div>
              <div className="p-4 border-t-2" style={{ borderColor: 'var(--panel-border)' }}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-bold text-[var(--foreground)]/60">Ambil Detik:</span>
                  <button type="button" onClick={() => captureTime('intro_start')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}>
                    <Clock className="w-3 h-3" /> Intro Start
                  </button>
                  <button type="button" onClick={() => captureTime('intro_end')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                    <Clock className="w-3 h-3" /> Intro End (Auto Durasi)
                  </button>
                  <button type="button" onClick={() => captureTime('outro_start')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--accent-add)', color: 'var(--accent-add-foreground)' }}>
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
