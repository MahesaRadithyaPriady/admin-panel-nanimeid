'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Play, Pause, Clock, Volume2, VolumeX, Maximize2, SkipBack, SkipForward, X, Check } from 'lucide-react';

function formatTime(sec) {
  if (sec == null || isNaN(sec)) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function CustomVideoPlayer({
  videoRef,
  src,
  poster,
  onDoubleClick,
  subtitleOverlay,
  overlayStyle,
  cueRanges = [],
  activeCueId,
  onCreateCueAtTime,
  onUpdateCueText,
  onSeekToCue,
}) {
  const containerRef = useRef(null);
  const progressBarRef = useRef(null);
  const textInputRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const controlsTimeoutRef = useRef(null);

  // Text input overlay state (double-click to type subtitle)
  const [textInputState, setTextInputState] = useState(null);
  const [liveText, setLiveText] = useState('');

  const v = videoRef?.current;

  // Sync video events
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (!isDragging) setCurrentTime(video.currentTime);
    };
    const onLoadedMeta = () => setDuration(video.duration);
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMeta);
    video.addEventListener('progress', onProgress);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMeta);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [videoRef, isDragging]);

  const togglePlay = useCallback(() => {
    const video = videoRef?.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [videoRef]);

  const seek = useCallback((time) => {
    const video = videoRef?.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, duration || video.duration || 0));
    setCurrentTime(video.currentTime);
  }, [videoRef, duration]);

  const skip = useCallback((delta) => {
    const video = videoRef?.current;
    if (!video) return;
    seek(video.currentTime + delta);
  }, [videoRef, seek]);

  const toggleMute = useCallback(() => {
    const video = videoRef?.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, [videoRef]);

  const changeVolume = useCallback((vol) => {
    const video = videoRef?.current;
    if (!video) return;
    video.volume = vol;
    video.muted = vol === 0;
    setVolume(vol);
    setMuted(vol === 0);
  }, [videoRef]);

  const changePlaybackRate = useCallback((rate) => {
    const video = videoRef?.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  }, [videoRef]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen().catch(() => {});
    }
  }, []);

  // Progress bar drag
  const getProgressFromEvent = useCallback((clientX) => {
    const bar = progressBarRef.current;
    if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  }, [duration]);

  const onProgressMouseDown = useCallback((e) => {
    setIsDragging(true);
    const time = getProgressFromEvent(e.clientX);
    seek(time);
  }, [getProgressFromEvent, seek]);

  const onProgressTouchStart = useCallback((e) => {
    setIsDragging(true);
    const time = getProgressFromEvent(e.touches[0].clientX);
    seek(time);
  }, [getProgressFromEvent, seek]);

  // Global mouse/touch move while dragging
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (clientX) => {
      const time = getProgressFromEvent(clientX);
      setCurrentTime(time);
    };
    const onMouseMove = (e) => onMove(e.clientX);
    const onTouchMove = (e) => onMove(e.touches[0].clientX);
    const onEnd = () => {
      const video = videoRef?.current;
      if (video) video.currentTime = currentTime;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, getProgressFromEvent, currentTime, videoRef]);

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && !textInputState) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying, textInputState]);

  useEffect(() => {
    showControlsTemporarily();
  }, [isPlaying, showControlsTemporarily]);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  // Find active subtitle for overlay
  const activeSubtitle = subtitleOverlay?.find(
    c => currentTime >= c.start && currentTime <= c.end
  );

  // Double-click on video creates cue + shows text input overlay
  const onVideoDoubleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const video = videoRef?.current;
    if (!video) return;
    const time = Math.floor(video.currentTime * 100) / 100;

    // If capture mode is active (onDoubleClick from editor), use old behavior
    if (onDoubleClick) {
      onDoubleClick(time);
      return;
    }

    // New behavior: double-click to create cue + type text on video
    if (onCreateCueAtTime) {
      const cueId = onCreateCueAtTime(time);
      if (cueId) {
        setTextInputState({ cueId, value: '' });
        setLiveText('');
        setTimeout(() => textInputRef.current?.focus(), 50);
      }
    }
  }, [videoRef, onDoubleClick, onCreateCueAtTime]);

  // Text input handlers
  const onTextInputChange = useCallback((val) => {
    setLiveText(val);
    if (textInputState?.cueId && onUpdateCueText) {
      onUpdateCueText(textInputState.cueId, val);
    }
  }, [textInputState, onUpdateCueText]);

  const onTextInputConfirm = useCallback(() => {
    if (textInputState?.cueId && liveText.trim() && onUpdateCueText) {
      onUpdateCueText(textInputState.cueId, liveText);
      toast.success('Subtitle ditambahkan', { duration: 1500 });
    }
    setTextInputState(null);
    setLiveText('');
  }, [textInputState, liveText, onUpdateCueText]);

  const onTextInputCancel = useCallback(() => {
    if (textInputState?.cueId && onUpdateCueText) {
      onUpdateCueText(textInputState.cueId, liveText);
    }
    setTextInputState(null);
    setLiveText('');
  }, [textInputState, liveText, onUpdateCueText]);

  // Click on cue marker to seek
  const onCueMarkerClick = useCallback((e, cue) => {
    e.stopPropagation();
    if (onSeekToCue) {
      onSeekToCue(cue.id);
    } else {
      seek(cue.start);
    }
  }, [onSeekToCue, seek]);

  // Display text: live input overrides active subtitle
  const displayText = textInputState ? liveText : activeSubtitle?.text;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black group select-none"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && !textInputState && setShowControls(false)}
    >
      {/* Video */}
      <div
        className="relative aspect-video bg-black overflow-hidden"
        onDoubleClick={onVideoDoubleClick}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          preload="metadata"
          className="w-full h-full object-contain cursor-pointer"
          onClick={textInputState ? undefined : togglePlay}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Subtitle Overlay (live preview + active cue) */}
        {displayText && (
          <div
            className="absolute left-0 right-0 px-[5%] pointer-events-none flex"
            style={{
              bottom: textInputState ? '20%' : '8%',
              justifyContent:
                overlayStyle?.alignment === 1 || overlayStyle?.alignment === 4 || overlayStyle?.alignment === 7 ? 'flex-start' :
                overlayStyle?.alignment === 3 || overlayStyle?.alignment === 6 || overlayStyle?.alignment === 9 ? 'flex-end' :
                'center',
            }}
          >
            <span
              style={{
                fontFamily: overlayStyle?.fontName || 'Arial',
                fontSize: `${Math.min((overlayStyle?.fontSize || 48) * 0.6, 32)}px`,
                color: overlayStyle?.primaryColor || '#ffffff',
                fontWeight: overlayStyle?.bold ? 'bold' : 'normal',
                fontStyle: overlayStyle?.italic ? 'italic' : 'normal',
                textShadow: overlayStyle?.outline
                  ? `-${overlayStyle.outline / 3}px 0 ${overlayStyle.outlineColor || '#000'}, ${overlayStyle.outline / 3}px 0 ${overlayStyle.outlineColor || '#000'}, 0 -${overlayStyle.outline / 3}px ${overlayStyle.outlineColor || '#000'}, 0 ${overlayStyle.outline / 3}px ${overlayStyle.outlineColor || '#000'}, ${overlayStyle.outline / 4}px ${overlayStyle.outline / 4}px ${(overlayStyle?.shadow || 1)}px ${overlayStyle.outlineColor || '#000'}`
                  : '2px 2px 4px rgba(0,0,0,0.8)',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                textAlign: 'center',
                transition: 'all 0.1s',
              }}
            >
              {displayText}
              {textInputState && <span className="animate-pulse">|</span>}
            </span>
          </div>
        )}

        {/* Text Input Overlay (appears on double-click) */}
        {textInputState && (
          <div
            className="absolute pointer-events-auto z-20"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(80%, 500px)',
            }}
          >
            <div className="bg-black/80 backdrop-blur-sm rounded-xl border-2 border-amber-500/50 p-3 shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">
                  Ketik subtitle untuk waktu ini
                </span>
              </div>
              <textarea
                ref={textInputRef}
                value={liveText}
                onChange={(e) => onTextInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onTextInputConfirm();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    onTextInputCancel();
                  }
                }}
                onBlur={onTextInputConfirm}
                placeholder="Ketik teks subtitle di sini..."
                rows={2}
                className="w-full bg-black/60 text-white text-sm rounded-lg border border-white/20 px-3 py-2 outline-none focus:border-amber-500 resize-none"
                style={{ fontSize: '14px' }}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-white/40">
                  Enter = simpan • Esc = batal • Shift+Enter = baris baru
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onTextInputCancel(); }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    title="Batal"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onTextInputConfirm(); }}
                    className="p-1.5 rounded-lg hover:bg-green-500/20 transition-colors"
                    title="Simpan"
                  >
                    <Check className="w-4 h-4 text-green-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Play/Pause overlay hint (only when not typing) */}
        {!isPlaying && !textInputState && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 rounded-2xl px-6 py-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Play className="w-10 h-10 text-white/80" />
              </div>
              <p className="text-xs text-white/60">
                Klik = play/pause • Double-klik = buat subtitle langsung
              </p>
            </div>
          </div>
        )}

        {/* Double-click create subtitle badge */}
        {onCreateCueAtTime && !textInputState && (
          <div className="absolute top-3 right-3 pointer-events-none z-10">
            <span className="text-[10px] px-2 py-1 rounded font-bold bg-black/60 text-amber-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Double-click = buat subtitle
            </span>
          </div>
        )}

        {/* Capture mode badge (old behavior) */}
        {onDoubleClick && !onCreateCueAtTime && (
          <div className="absolute top-3 right-3 pointer-events-none z-10">
            <span className="text-[10px] px-2 py-1 rounded font-bold bg-black/60 text-amber-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Double-click = capture
            </span>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-opacity duration-200"
        style={{ opacity: showControls || textInputState ? 1 : 0, pointerEvents: showControls || textInputState ? 'auto' : 'none' }}
      >
        {/* Progress Bar (draggable) with cue markers */}
        <div
          ref={progressBarRef}
          className="relative h-1.5 hover:h-3 transition-all cursor-pointer group/bar"
          onMouseDown={onProgressMouseDown}
          onTouchStart={onProgressTouchStart}
        >
          {/* Buffered */}
          <div
            className="absolute h-full bg-white/20 rounded-full"
            style={{ width: `${bufferedPct}%` }}
          />

          {/* Cue duration markers */}
          {duration > 0 && cueRanges.map((cue) => {
            const startPct = (cue.start / duration) * 100;
            const endPct = (cue.end / duration) * 100;
            const width = Math.max(endPct - startPct, 0.5);
            const isActive = cue.id === activeCueId;
            return (
              <div
                key={cue.id}
                onMouseDown={(e) => onCueMarkerClick(e, cue)}
                className="absolute h-full rounded-sm cursor-pointer transition-all hover:opacity-100"
                style={{
                  left: `${startPct}%`,
                  width: `${width}%`,
                  background: isActive ? 'rgba(245,158,11,0.7)' : 'rgba(34,197,94,0.45)',
                  opacity: isActive ? 1 : 0.8,
                  top: 0,
                  borderLeft: isActive ? '2px solid #f59e0b' : '1px solid rgba(34,197,94,0.8)',
                  borderRight: isActive ? '2px solid #f59e0b' : '1px solid rgba(34,197,94,0.8)',
                  zIndex: isActive ? 4 : 3,
                }}
                title={`${formatTime(cue.start)} - ${formatTime(cue.end)}${cue.text ? ': ' + cue.text.slice(0, 30) : ''}`}
              />
            );
          })}

          {/* Progress (playhead) */}
          <div
            className="absolute h-full rounded-full pointer-events-none"
            style={{
              width: `${progressPct}%`,
              background: 'var(--accent-primary, #6366f1)',
              zIndex: 5,
            }}
          />

          {/* Drag Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none"
            style={{
              left: `${progressPct}%`,
              background: 'var(--accent-primary, #6366f1)',
              boxShadow: '0 0 6px rgba(0,0,0,0.4)',
              zIndex: 6,
            }}
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-t from-black/90 to-transparent">
          {/* Skip Back */}
          <button
            type="button"
            onClick={() => skip(-10)}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            title="-10s"
          >
            <SkipBack className="w-4 h-4 text-white" />
          </button>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="p-2 rounded hover:bg-white/10 transition-colors"
          >
            {isPlaying
              ? <Pause className="w-5 h-5 text-white" />
              : <Play className="w-5 h-5 text-white" />}
          </button>

          {/* Skip Forward */}
          <button
            type="button"
            onClick={() => skip(10)}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            title="+10s"
          >
            <SkipForward className="w-4 h-4 text-white" />
          </button>

          {/* Time + active cue range */}
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs font-mono text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            {(() => {
              const activeCue = cueRanges.find(c => c.id === activeCueId);
              if (!activeCue) return null;
              return (
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  Cue: {formatTime(activeCue.start)}-{formatTime(activeCue.end)}
                </span>
              );
            })()}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Cue count indicator */}
          {cueRanges.length > 0 && (
            <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
              {cueRanges.length} cues
            </span>
          )}

          {/* Playback Rate */}
          <button
            type="button"
            onClick={() => {
              const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
              const idx = rates.indexOf(playbackRate);
              const next = rates[(idx + 1) % rates.length];
              changePlaybackRate(next);
              toast.success(`Speed: ${next}x`, { duration: 1000 });
            }}
            className="text-xs font-bold text-white/80 px-2 py-1 rounded hover:bg-white/10 transition-colors"
            title="Playback speed"
          >
            {playbackRate}x
          </button>

          {/* Volume */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
          >
            {muted || volume === 0
              ? <VolumeX className="w-4 h-4 text-white" />
              : <Volume2 className="w-4 h-4 text-white" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="w-16 h-1 accent-white cursor-pointer"
            style={{ accentColor: 'var(--accent-primary, #6366f1)' }}
          />

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
