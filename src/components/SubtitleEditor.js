'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Clock, Download, Upload, Copy, ChevronUp, ChevronDown, Type, Palette, Bold, Italic, AlignCenter, AlignLeft, AlignRight, FileEdit } from 'lucide-react';

// ===== ASS helpers =====

function secondsToASSTime(sec) {
  if (sec == null || isNaN(sec)) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.round((sec - Math.floor(sec)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function secondsToSRTTime(sec) {
  if (sec == null || isNaN(sec)) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function secondsToVTTTime(sec) {
  if (sec == null || isNaN(sec)) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function assColorFromHex(hex) {
  // hex: #RRGGBB -> ASS &H00BBGGRR
  if (!hex || !hex.startsWith('#')) return '&H00FFFFFF';
  const r = hex.slice(1, 3);
  const g = hex.slice(3, 5);
  const b = hex.slice(5, 7);
  return `&H00${b}${g}${r}`.toUpperCase();
}

function generateASS(styles, cues) {
  const s = styles;
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${s.fontName},${s.fontSize},${assColorFromHex(s.primaryColor)},&H000000FF,${assColorFromHex(s.outlineColor)},&H00000000,${s.bold ? -1 : 0},${s.italic ? -1 : 0},0,0,100,100,0,0,1,${s.outline},${s.shadow},${s.alignment},${s.marginL},${s.marginR},${s.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = cues
    .filter(c => c.text.trim())
    .map(c => {
      const text = c.text.replace(/\n/g, '\\N');
      return `Dialogue: 0,${secondsToASSTime(c.start)},${secondsToASSTime(c.end)},Default,,0,0,0,,${text}`;
    })
    .join('\n');

  return header + events + (events ? '\n' : '');
}

function generateSRT(cues) {
  return cues
    .filter(c => c.text.trim())
    .map((c, i) => {
      return `${i + 1}\n${secondsToSRTTime(c.start)} --> ${secondsToSRTTime(c.end)}\n${c.text}\n`;
    })
    .join('\n');
}

function generateVTT(cues) {
  const body = cues
    .filter(c => c.text.trim())
    .map((c, i) => {
      return `${i + 1}\n${secondsToVTTTime(c.start)} --> ${secondsToVTTTime(c.end)}\n${c.text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

const FONT_OPTIONS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
  'Georgia', 'Palatino', 'Garamond', 'Comic Sans MS', 'Trebuchet MS',
  'Impact', 'Tahoma', 'Calibri', 'Consolas', 'Segoe UI',
];

const ALIGNMENT_OPTIONS = [
  { value: 2, label: 'Bottom Center', icon: AlignCenter },
  { value: 1, label: 'Bottom Left', icon: AlignLeft },
  { value: 3, label: 'Bottom Right', icon: AlignRight },
  { value: 5, label: 'Top Center', icon: AlignCenter },
  { value: 4, label: 'Top Left', icon: AlignLeft },
  { value: 6, label: 'Top Right', icon: AlignRight },
  { value: 8, label: 'Mid Center', icon: AlignCenter },
  { value: 7, label: 'Mid Left', icon: AlignLeft },
  { value: 9, label: 'Mid Right', icon: AlignRight },
];

const DEFAULT_STYLES = {
  fontName: 'Arial',
  fontSize: 48,
  primaryColor: '#ffffff',
  outlineColor: '#000000',
  bold: false,
  italic: false,
  outline: 2,
  shadow: 1,
  alignment: 2,
  marginL: 10,
  marginR: 10,
  marginV: 30,
};

function createEmptyCue() {
  return {
    id: `cue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    start: 0,
    end: 2,
    text: '',
  };
}

export function SubtitleEditor({
  videoRef,
  videoUrl,
  onUploadGenerated,
  onCuesChange,
  onStylesChange,
  onDoubleClickCapture,
  onActiveCueChange,
  onCreateCueFromPlayer,
  onUpdateCueTextFromPlayer,
  onSeekFromPlayer,
  importCuesRef,
  onEditingSourceChange,
}) {
  const [cues, setCues] = useState([]);
  const [styles, setStyles] = useState(DEFAULT_STYLES);
  const [editingCueId, setEditingCueId] = useState(null);
  const [exportFormat, setExportFormat] = useState('ass');
  const [uploading, setUploading] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(true);
  const [captureMode, setCaptureMode] = useState(null); // null | 'start' | 'end'
  const [editingSource, setEditingSource] = useState(null); // { id, label, format, language } | null

  // Expose cues, styles, and active cue to parent for video overlay
  useEffect(() => {
    onCuesChange?.(cues);
  }, [cues, onCuesChange]);

  useEffect(() => {
    onStylesChange?.(styles);
  }, [styles, onStylesChange]);

  useEffect(() => {
    onActiveCueChange?.(editingCueId);
  }, [editingCueId, onActiveCueChange]);

  // Expose editing source to parent
  useEffect(() => {
    onEditingSourceChange?.(editingSource);
  }, [editingSource, onEditingSourceChange]);

  // Handle import cues request from parent (load existing subtitle for editing)
  useEffect(() => {
    if (!importCuesRef || typeof importCuesRef !== 'object') return;
    importCuesRef.current = (importedCues, sourceInfo, format) => {
      if (!importedCues || importedCues.length === 0) {
        toast.error('Tidak ada cue untuk di-import');
        return;
      }
      const newCues = importedCues.map((c, i) => ({
        ...c,
        id: `imported_${Date.now()}_${i}`,
      }));
      setCues(newCues);
      setEditingCueId(newCues[0]?.id || null);
      if (format) setExportFormat(format);
      setEditingSource(sourceInfo || null);
      toast.success(`${newCues.length} cues dimuat untuk editing${sourceInfo ? ` dari "${sourceInfo.label}"` : ''}`);
    };
  }, [importCuesRef]);

  const getCurrentTime = useCallback(() => {
    const v = videoRef?.current;
    if (!v) return 0;
    return Math.floor(v.currentTime * 100) / 100;
  }, [videoRef]);

  const updateStyle = (key, value) => setStyles(prev => ({ ...prev, [key]: value }));

  const updateCue = (id, field, value) => {
    setCues(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // Double-click on video captures time into editing cue
  const handleVideoDoubleClick = useCallback((time) => {
    if (typeof time !== 'number' || isNaN(time)) return;
    if (!editingCueId) {
      toast.error('Pilih cue dulu, lalu double-click video untuk capture');
      return;
    }
    const field = captureMode || 'start';
    updateCue(editingCueId, field, time);
    toast.success(`${field === 'start' ? 'Start' : 'End'} = ${time.toFixed(1)}s`);
    setCaptureMode(null);
  }, [editingCueId, captureMode]);

  // Expose double-click handler to parent via ref (no setState during render)
  useEffect(() => {
    if (onDoubleClickCapture && typeof onDoubleClickCapture === 'object') {
      onDoubleClickCapture.current = handleVideoDoubleClick;
    }
  }, [handleVideoDoubleClick, onDoubleClickCapture]);

  // Handle create-cue request from video player
  useEffect(() => {
    if (!onCreateCueFromPlayer || typeof onCreateCueFromPlayer !== 'object') return;
    onCreateCueFromPlayer.current = (time) => {
      const newCue = { ...createEmptyCue(), start: time, end: time + 3 };
      setCues(prev => [...prev, newCue]);
      setEditingCueId(newCue.id);
      return newCue.id;
    };
  }, [onCreateCueFromPlayer]);

  // Handle update-cue-text request from video player
  useEffect(() => {
    if (!onUpdateCueTextFromPlayer || typeof onUpdateCueTextFromPlayer !== 'object') return;
    onUpdateCueTextFromPlayer.current = (cueId, text) => {
      setCues(prev => prev.map(c => c.id === cueId ? { ...c, text } : c));
    };
  }, [onUpdateCueTextFromPlayer]);

  // Handle seek-to-cue request from video player
  useEffect(() => {
    if (!onSeekFromPlayer || typeof onSeekFromPlayer !== 'object') return;
    onSeekFromPlayer.current = (cueId) => {
      const cue = cues.find(c => c.id === cueId);
      if (!cue) return;
      setEditingCueId(cue.id);
      const v = videoRef?.current;
      if (v) {
        v.currentTime = cue.start;
        v.play().catch(() => {});
      }
    };
  }, [onSeekFromPlayer, cues, videoRef]);

  const addCue = () => {
    const now = getCurrentTime();
    const newCue = { ...createEmptyCue(), start: now, end: now + 2 };
    setCues(prev => [...prev, newCue]);
    setEditingCueId(newCue.id);
  };

  const deleteCue = (id) => {
    setCues(prev => prev.filter(c => c.id !== id));
    if (editingCueId === id) setEditingCueId(null);
  };

  const duplicateCue = (id) => {
    const cue = cues.find(c => c.id === id);
    if (!cue) return;
    const newCue = { ...cue, id: `cue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, start: cue.end, end: cue.end + (cue.end - cue.start) };
    const idx = cues.findIndex(c => c.id === id);
    setCues(prev => [...prev.slice(0, idx + 1), newCue, ...prev.slice(idx + 1)]);
    setEditingCueId(newCue.id);
  };

  const moveCue = (id, dir) => {
    const idx = cues.findIndex(c => c.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= cues.length) return;
    setCues(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const seekTo = (time) => {
    const v = videoRef?.current;
    if (v) {
      v.currentTime = time;
      v.play().catch(() => {});
    }
  };

  const captureStart = (id) => {
    const now = getCurrentTime();
    updateCue(id, 'start', now);
    toast.success(`Start = ${now.toFixed(1)}s`);
  };

  const captureEnd = (id) => {
    const now = getCurrentTime();
    updateCue(id, 'end', now);
    toast.success(`End = ${now.toFixed(1)}s`);
  };

  const generateFile = () => {
    const sorted = [...cues].sort((a, b) => a.start - b.start);
    if (sorted.filter(c => c.text.trim()).length === 0) {
      toast.error('Belum ada cue dengan teks');
      return null;
    }
    let content = '';
    let ext = exportFormat;
    if (exportFormat === 'ass') content = generateASS(styles, sorted);
    else if (exportFormat === 'srt') content = generateSRT(sorted);
    else if (exportFormat === 'vtt') content = generateVTT(sorted);
    return { content, ext, name: `subtitle.${ext}` };
  };

  const onDownload = () => {
    const file = generateFile();
    if (!file) return;
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`File ${file.name} di-download`);
  };

  const onUpload = async () => {
    const file = generateFile();
    if (!file) return;
    setUploading(true);
    try {
      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      const fileObj = new File([blob], file.name, { type: 'text/plain' });
      await onUploadGenerated(fileObj, file.ext);
    } catch (err) {
      toast.error(err?.message || 'Gagal upload');
    } finally {
      setUploading(false);
    }
  };

  const sortedCues = [...cues].sort((a, b) => a.start - b.start);
  const editingCue = cues.find(c => c.id === editingCueId);

  return (
    <div className="space-y-4">
      {/* Editing source banner */}
      {editingSource && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2" style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.3)' }}>
          <div className="flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-blue-500">
              Editing: {editingSource.label} ({editingSource.language}) .{editingSource.format}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('Buang semua cue dan mulai baru?')) {
                setCues([]);
                setEditingCueId(null);
                setEditingSource(null);
                toast.success('Editor dibersihkan');
              }
            }}
            className="text-xs font-bold text-red-500 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={addCue}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: 'var(--accent-add)', color: 'var(--accent-add-foreground)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Cue
        </button>
        {/* Double-click capture mode */}
        <button
          type="button"
          onClick={() => setCaptureMode(captureMode === 'start' ? null : 'start')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border-2"
          style={{
            background: captureMode === 'start' ? 'rgba(245,158,11,0.15)' : 'var(--background)',
            color: captureMode === 'start' ? '#f59e0b' : 'var(--foreground)',
            borderColor: captureMode === 'start' ? '#f59e0b' : 'var(--panel-border)',
          }}
          title="Lalu double-click video untuk set start time"
        >
          <Clock className="w-3.5 h-3.5" /> ⏱ Start
        </button>
        <button
          type="button"
          onClick={() => setCaptureMode(captureMode === 'end' ? null : 'end')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border-2"
          style={{
            background: captureMode === 'end' ? 'rgba(245,158,11,0.15)' : 'var(--background)',
            color: captureMode === 'end' ? '#f59e0b' : 'var(--foreground)',
            borderColor: captureMode === 'end' ? '#f59e0b' : 'var(--panel-border)',
          }}
          title="Lalu double-click video untuk set end time"
        >
          <Clock className="w-3.5 h-3.5" /> ⏱ End
        </button>
        {captureMode && (
          <span className="text-[10px] font-bold text-amber-500 animate-pulse">
            Double-click video untuk capture {captureMode}!
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowStylePanel(!showStylePanel)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border-2"
          style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
        >
          <Type className="w-3.5 h-3.5" /> Style {showStylePanel ? '▲' : '▼'}
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="text-xs rounded-lg border-2 px-2 py-1.5 font-bold"
            style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
          >
            <option value="ass">ASS</option>
            <option value="srt">SRT</option>
            <option value="vtt">VTT</option>
          </select>
          <button
            type="button"
            onClick={onDownload}
            disabled={cues.filter(c => c.text.trim()).length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border-2 disabled:opacity-50"
            style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button
            type="button"
            onClick={onUpload}
            disabled={cues.filter(c => c.text.trim()).length === 0 || uploading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
            style={{ background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}
          >
            {uploading ? '⏳ Uploading...' : <><Upload className="w-3.5 h-3.5" /> Upload</>}
          </button>
        </div>
      </div>

      {/* Style Panel */}
      {showStylePanel && (
        <div className="rounded-xl border-2 p-4 space-y-3" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Palette className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-xs font-bold text-[var(--foreground)]/80">Style Settings (ASS)</span>
          </div>
          <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Font Family */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--foreground)]/50 mb-1">Font</label>
              <select
                value={styles.fontName}
                onChange={(e) => updateStyle('fontName', e.target.value)}
                className="w-full rounded-lg border-2 px-2 py-1.5 text-xs font-bold"
                style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              >
                {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {/* Font Size */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--foreground)]/50 mb-1">Size</label>
              <input
                type="number" min={8} max={200}
                value={styles.fontSize}
                onChange={(e) => updateStyle('fontSize', Number(e.target.value))}
                className="w-full rounded-lg border-2 px-2 py-1.5 text-xs font-bold"
                style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>
            {/* Primary Color */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--foreground)]/50 mb-1">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={styles.primaryColor}
                  onChange={(e) => updateStyle('primaryColor', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-2"
                  style={{ borderColor: 'var(--panel-border)' }}
                />
                <span className="text-xs font-mono text-[var(--foreground)]/60">{styles.primaryColor}</span>
              </div>
            </div>
            {/* Outline Color */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--foreground)]/50 mb-1">Outline Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={styles.outlineColor}
                  onChange={(e) => updateStyle('outlineColor', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-2"
                  style={{ borderColor: 'var(--panel-border)' }}
                />
                <span className="text-xs font-mono text-[var(--foreground)]/60">{styles.outlineColor}</span>
              </div>
            </div>
            {/* Bold / Italic */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateStyle('bold', !styles.bold)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 font-bold text-sm"
                style={{
                  background: styles.bold ? 'rgba(34,197,94,0.15)' : 'var(--panel-bg)',
                  borderColor: styles.bold ? '#22c55e' : 'var(--panel-border)',
                  color: styles.bold ? '#22c55e' : 'var(--foreground)',
                }}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => updateStyle('italic', !styles.italic)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 font-bold text-sm italic"
                style={{
                  background: styles.italic ? 'rgba(34,197,94,0.15)' : 'var(--panel-bg)',
                  borderColor: styles.italic ? '#22c55e' : 'var(--panel-border)',
                  color: styles.italic ? '#22c55e' : 'var(--foreground)',
                }}
              >
                <Italic className="w-4 h-4" />
              </button>
            </div>
            {/* Outline */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--foreground)]/50 mb-1">Outline</label>
              <input
                type="number" min={0} max={10} step={0.5}
                value={styles.outline}
                onChange={(e) => updateStyle('outline', Number(e.target.value))}
                className="w-full rounded-lg border-2 px-2 py-1.5 text-xs font-bold"
                style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>
            {/* Shadow */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--foreground)]/50 mb-1">Shadow</label>
              <input
                type="number" min={0} max={10} step={0.5}
                value={styles.shadow}
                onChange={(e) => updateStyle('shadow', Number(e.target.value))}
                className="w-full rounded-lg border-2 px-2 py-1.5 text-xs font-bold"
                style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>
            {/* Alignment */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--foreground)]/50 mb-1">Position</label>
              <select
                value={styles.alignment}
                onChange={(e) => updateStyle('alignment', Number(e.target.value))}
                className="w-full rounded-lg border-2 px-2 py-1.5 text-xs font-bold"
                style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              >
                {ALIGNMENT_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>
          {/* Preview */}
          <div className="rounded-lg p-3 flex items-center justify-center min-h-[60px]" style={{ background: '#000' }}>
            <span
              style={{
                fontFamily: styles.fontName,
                fontSize: `${Math.min(styles.fontSize / 2, 28)}px`,
                color: styles.primaryColor,
                fontWeight: styles.bold ? 'bold' : 'normal',
                fontStyle: styles.italic ? 'italic' : 'normal',
                textShadow: `${styles.outline / 2}px ${styles.outline / 2}px ${styles.shadow}px ${styles.outlineColor}`,
                WebkitTextStroke: `${styles.outline / 4}px ${styles.outlineColor}`,
              }}
            >
              Preview Text Subtitle
            </span>
          </div>
        </div>
      )}

      {/* Cue List */}
      <div className="space-y-2">
        {sortedCues.length === 0 && (
          <div className="text-center py-8 rounded-xl border-2 border-dashed" style={{ borderColor: 'var(--panel-border)' }}>
            <p className="text-sm text-[var(--foreground)]/50">Belum ada cue. Klik "Tambah Cue" untuk mulai.</p>
          </div>
        )}
        {sortedCues.map((cue, idx) => {
          const isEditing = cue.id === editingCueId;
          return (
            <div
              key={cue.id}
              className="rounded-xl border-2 overflow-hidden"
              style={{
                borderColor: isEditing ? 'var(--accent-primary)' : 'var(--panel-border)',
                background: 'var(--panel-bg)',
              }}
            >
              {/* Cue Header */}
              <div className="flex items-center gap-2 p-2 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
                <span className="text-xs font-black w-6 text-center flex-shrink-0" style={{ color: 'var(--accent-primary)' }}>
                  {idx + 1}
                </span>
                {/* Start */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-[var(--foreground)]/40">Start</span>
                  <input
                    type="number" step={0.1} min={0}
                    value={cue.start}
                    onChange={(e) => updateCue(cue.id, 'start', Number(e.target.value))}
                    className="w-16 rounded border-2 px-1.5 py-1 text-xs font-mono"
                    style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                  />
                  <button type="button" onClick={() => captureStart(cue.id)} title="Capture current time"
                    className="p-1 rounded hover:bg-[var(--accent-primary)]/10">
                    <Clock className="w-3 h-3 text-[var(--accent-primary)]" />
                  </button>
                  <button type="button" onClick={() => seekTo(cue.start)} title="Seek to start"
                    className="text-[10px] px-1.5 py-1 rounded font-bold hover:bg-[var(--background)]" style={{ color: 'var(--accent-primary)' }}>
                    ▶
                  </button>
                </div>
                {/* End */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-[var(--foreground)]/40">End</span>
                  <input
                    type="number" step={0.1} min={0}
                    value={cue.end}
                    onChange={(e) => updateCue(cue.id, 'end', Number(e.target.value))}
                    className="w-16 rounded border-2 px-1.5 py-1 text-xs font-mono"
                    style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                  />
                  <button type="button" onClick={() => captureEnd(cue.id)} title="Capture current time"
                    className="p-1 rounded hover:bg-[var(--accent-primary)]/10">
                    <Clock className="w-3 h-3 text-[var(--accent-primary)]" />
                  </button>
                </div>
                <span className="text-[10px] text-[var(--foreground)]/30 ml-1">
                  ({(cue.end - cue.start).toFixed(1)}s)
                </span>
                {/* Actions */}
                <div className="flex items-center gap-0.5 ml-auto">
                  <button type="button" onClick={() => moveCue(cue.id, -1)} disabled={idx === 0}
                    className="p-1 rounded hover:bg-[var(--background)] disabled:opacity-30">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => moveCue(cue.id, 1)} disabled={idx === sortedCues.length - 1}
                    className="p-1 rounded hover:bg-[var(--background)] disabled:opacity-30">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => duplicateCue(cue.id)} title="Duplicate"
                    className="p-1 rounded hover:bg-[var(--background)]">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => deleteCue(cue.id)} title="Delete"
                    className="p-1 rounded text-red-500 hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Cue Text */}
              <div className="p-2">
                <textarea
                  rows={isEditing ? 3 : 1}
                  value={cue.text}
                  onChange={(e) => updateCue(cue.id, 'text', e.target.value)}
                  onFocus={() => setEditingCueId(cue.id)}
                  placeholder="Teks subtitle di sini..."
                  className="w-full rounded-lg border-2 px-3 py-2 text-sm resize-none"
                  style={{
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    borderColor: isEditing ? 'var(--accent-primary)' : 'var(--panel-border)',
                    fontFamily: styles.fontName,
                    fontWeight: styles.bold ? 'bold' : 'normal',
                    fontStyle: styles.italic ? 'italic' : 'normal',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      {cues.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-[var(--foreground)]/50">
          <span>{cues.length} cue</span>
          <span>•</span>
          <span>{cues.filter(c => c.text.trim()).length} dengan teks</span>
          <span>•</span>
          <span>Format: {exportFormat.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
