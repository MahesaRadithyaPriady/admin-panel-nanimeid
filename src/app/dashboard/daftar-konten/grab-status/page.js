'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Zap, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listActiveGrabs } from '@/lib/api';

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

const PHASE_META = {
  init:        { label: 'Persiapan',   color: 'var(--foreground)' },
  fetching:    { label: 'Ambil Stream', color: 'var(--foreground)' },
  downloading: { label: 'Download',    color: '#3b82f6' },
  uploading:   { label: 'Upload CDN',  color: '#a855f7' },
  uploaded:    { label: 'Ter-upload',  color: '#22c55e' },
  done:        { label: 'Selesai',     color: '#22c55e' },
  failed:      { label: 'Gagal',       color: '#ef4444' },
  idle:        { label: 'Idle',        color: 'var(--foreground)' },
};

function fmtBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function fmtAgo(ts) {
  if (!ts) return '-';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}d lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m lalu`;
  return `${Math.floor(m / 60)}j ${m % 60}m lalu`;
}

export default function GrabStatusPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [grabs, setGrabs] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

  const load = async () => {
    if (!user) return;
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const res = await listActiveGrabs({ token });
      setGrabs(Array.isArray(res?.grabs) ? res.grabs : []);
      setLastRefresh(Date.now());
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar grab');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    timerRef.current = setInterval(load, 4000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const running = grabs.filter((g) => g.phase !== 'done' && g.phase !== 'failed');
  const finished = grabs.filter((g) => g.phase === 'done' || g.phase === 'failed');

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6 min-w-0">
      {loading || !user ? null : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard/daftar-konten/anime')} className="btn btn--secondary btn--sm">
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">Grab Berjalan</h1>
                <p className="text-sm opacity-70">
                  Monitor episode yang sedang di-grab dari provider
                  {lastRefresh ? ` · refresh ${fmtAgo(lastRefresh)}` : ''}
                </p>
              </div>
            </div>
            <button onClick={load} disabled={loadingList} className="btn btn--secondary btn--sm disabled:opacity-60">
              {loadingList ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card border-2 border-[var(--border)]">
              <div className="text-xs font-extrabold uppercase tracking-wide label">Berjalan</div>
              <div className="mt-1 text-2xl font-black">{running.length}</div>
            </div>
            <div className="stat-card border-2 border-[var(--border)]">
              <div className="text-xs font-extrabold uppercase tracking-wide label">Selesai</div>
              <div className="mt-1 text-2xl font-black">{finished.filter((g) => g.phase === 'done').length}</div>
            </div>
            <div className="stat-card border-2 border-[var(--border)]">
              <div className="text-xs font-extrabold uppercase tracking-wide label">Gagal</div>
              <div className="mt-1 text-2xl font-black">{finished.filter((g) => g.phase === 'failed').length}</div>
            </div>
          </div>

          {/* List */}
          <div className="rounded-2xl border-2 overflow-hidden" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            {grabs.length === 0 ? (
              <div className="p-10 text-center">
                <Zap className="w-10 h-10 mx-auto opacity-30" />
                <p className="mt-3 font-bold">Tidak ada grab yang berjalan</p>
                <p className="text-sm opacity-60 mt-1">
                  Auto-grab berjalan otomatis sesuai jadwal anime, atau trigger manual lewat tombol ⚡ di Daftar Anime.
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--panel-border)' }}>
                {grabs.map((g) => {
                  const meta = PHASE_META[g.phase] || PHASE_META.idle;
                  const isActive = g.phase !== 'done' && g.phase !== 'failed';
                  const pct = Math.min(100, Math.max(0, Number(g.percent) || 0));
                  return (
                    <div key={g.key} className="p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="font-extrabold truncate">
                            {g.animeTitle || `Anime #${g.animeId}`}
                            <span className="opacity-60 font-bold"> · EP {g.epNum}</span>
                          </div>
                          <div className="text-xs opacity-60 flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="uppercase">{g.provider}</span>
                            <span>·</span>
                            <span>{g.source === 'auto' ? 'Auto (jadwal/panel)' : 'Manual'}</span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtAgo(g.updatedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {g.phase === 'done' && <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} />}
                          {g.phase === 'failed' && <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />}
                          {isActive && <Loader2 className="w-4 h-4 animate-spin" style={{ color: meta.color }} />}
                          <span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: meta.color }}>
                            {meta.label}{g.quality ? ` · ${g.quality}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: g.phase === 'failed' ? '#ef4444' : g.phase === 'done' ? '#22c55e' : 'var(--accent-primary, #3b82f6)',
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs opacity-70">
                        <span className="truncate">{g.message || '-'}</span>
                        <span className="flex-shrink-0 ml-3 font-bold">
                          {pct}%
                          {g.totalBytes ? ` · ${fmtBytes(g.downloadedBytes)}/${fmtBytes(g.totalBytes)}` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
