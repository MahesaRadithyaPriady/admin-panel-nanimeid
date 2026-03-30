'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Activity, BadgeCheck, BookOpen, Clock3, LoaderCircle, RefreshCcw, Sparkles, AlertTriangle, CheckCircle2, XCircle, Wrench } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listGlobalMangaGrabStatus, continueMangaKomikuGrabJob } from '@/lib/api';

const STATUS_OPTIONS = ['', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL'];
const LIMIT_OPTIONS = [10, 20, 30, 50, 100];

export default function MangaGrabListPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [status, setStatus] = useState('RUNNING');
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fixingKey, setFixingKey] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadItems = async ({ silent = false } = {}) => {
    const token = getSession()?.token;
    try {
      if (!silent) setLoadingList(true);
      const res = await listGlobalMangaGrabStatus({ token, status: status || undefined, limit });
      setItems(Array.isArray(res?.items) ? res.items : []);
      setLastUpdated(new Date());
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat list grab manga');
    } finally {
      if (!silent) setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadItems();
  }, [user, status, limit]);

  useEffect(() => {
    if (!user || !autoRefresh) return;
    const timer = setInterval(() => {
      loadItems({ silent: true });
    }, 3000);
    return () => clearInterval(timer);
  }, [user, autoRefresh, status, limit]);

  const summary = useMemo(() => {
    return items.reduce((acc, entry) => {
      const key = String(entry?.job?.status || 'UNKNOWN').toUpperCase();
      acc.total += 1;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, { total: 0, RUNNING: 0, PENDING: 0, COMPLETED: 0, FAILED: 0, PARTIAL: 0 });
  }, [items]);

  const onFixGrabStack = async ({ mangaId, jobId, status: jobStatus }) => {
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');
    if (!mangaId && mangaId !== 0) return toast.error('manga_id tidak valid');
    if (!jobId && jobId !== 0) return toast.error('job_id tidak valid');
    const statusUpper = String(jobStatus || '').toUpperCase();
    const retry_failed = statusUpper === 'FAILED' || statusUpper === 'PARTIAL';
    const key = `${mangaId}:${jobId}`;
    try {
      setFixingKey(key);
      const res = await continueMangaKomikuGrabJob({ token, mangaId, jobId, retry_failed });
      toast.success(res?.message || 'Job dimasukkan kembali ke antrean');
      await loadItems({ silent: true });
    } catch (err) {
      toast.error(err?.message || 'Gagal menjalankan perbaikan job');
    } finally {
      setFixingKey('');
    }
  };

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[28px] border-4 p-5 md:p-6" style={{ boxShadow: '10px 10px 0 #000', background: 'linear-gradient(135deg, var(--panel-bg) 0%, #dbeafe 100%)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-1 text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: '#fff7ed', color: '#9a3412' }}>
                    <Sparkles className="size-4" /> Monitoring Grab Manga
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3">
                      <BookOpen className="size-7" />
                      List Grab
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm md:text-base font-semibold opacity-80">
                      Pantau semua proses grab manga lintas judul secara real-time. Admin bisa melihat job yang sedang antre, chapter yang sedang diproses, sampai hasil akhirnya tanpa perlu bolak-balik ke halaman detail manga.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => loadItems()}
                  disabled={loadingList}
                  className="inline-flex items-center gap-2 rounded-2xl border-4 px-4 py-3 font-black disabled:opacity-60"
                  style={{ boxShadow: '6px 6px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
                >
                  <RefreshCcw className={`size-4 ${loadingList ? 'animate-spin' : ''}`} />
                  {loadingList ? 'Menyegarkan...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border-4 p-5" style={{ boxShadow: '10px 10px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="text-sm font-black opacity-70">Sinkronisasi</div>
              <div className="mt-2 text-xl font-black flex items-center gap-2">
                <Clock3 className="size-5" />
                {lastUpdated ? formatDateTime(lastUpdated) : 'Belum pernah refresh'}
              </div>
              <label className="mt-4 flex items-center gap-3 rounded-2xl border-4 px-4 py-3 font-bold" style={{ borderColor: 'var(--panel-border)', background: autoRefresh ? '#dcfce7' : 'var(--background)', color: autoRefresh ? '#14532d' : 'var(--foreground)' }}>
                <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                Auto refresh tiap 3 detik
              </label>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-4 rounded-[28px] border-4 p-5" style={{ boxShadow: '10px 10px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div>
                <div className="text-sm font-black opacity-70">Filter</div>
                <div className="mt-1 text-lg font-black">Atur tampilan job</div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-black opacity-70">Status</div>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-2xl border-4 px-3 py-3 font-bold" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)', color: 'var(--foreground)' }}>
                  <option value="">Semua Status</option>
                  {STATUS_OPTIONS.filter(Boolean).map((it) => (
                    <option key={it} value={it}>{it}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-black opacity-70">Limit</div>
                <select value={limit} onChange={(e) => setLimit(Number(e.target.value) || 20)} className="w-full rounded-2xl border-4 px-3 py-3 font-bold" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)', color: 'var(--foreground)' }}>
                  {LIMIT_OPTIONS.map((it) => (
                    <option key={it} value={it}>{it} item</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <SummaryMiniCard label="Total" value={summary.total} tone="neutral" />
                <SummaryMiniCard label="Running" value={summary.RUNNING} tone="running" />
                <SummaryMiniCard label="Pending" value={summary.PENDING} tone="pending" />
                <SummaryMiniCard label="Done" value={summary.COMPLETED} tone="success" />
                <SummaryMiniCard label="Partial" value={summary.PARTIAL} tone="partial" />
                <SummaryMiniCard label="Failed" value={summary.FAILED} tone="failed" />
              </div>
            </div>

            <div className="space-y-4">
              {loadingList && items.length === 0 ? (
                <div className="rounded-[28px] border-4 p-8" style={{ boxShadow: '10px 10px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <div className="inline-flex items-center gap-3 text-lg font-black">
                    <LoaderCircle className="size-5 animate-spin" /> Memuat status grab...
                  </div>
                </div>
              ) : null}

              {!loadingList && items.length === 0 ? (
                <div className="rounded-[28px] border-4 p-8 text-center" style={{ boxShadow: '10px 10px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <div className="mx-auto mb-3 inline-flex size-14 items-center justify-center rounded-2xl border-4" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                    <BadgeCheck className="size-7" />
                  </div>
                  <div className="text-xl font-black">Belum ada job grab</div>
                  <p className="mt-2 text-sm font-semibold opacity-70">Saat job baru dibuat, statusnya akan muncul di sini dan terus diperbarui otomatis.</p>
                </div>
              ) : null}

              {items.map((entry, index) => {
                const manga = entry?.manga || {};
                const job = entry?.job || {};
                const progress = computeProgress(job);
                const tone = getStatusTone(job?.status);
                const canFix = ['FAILED', 'PARTIAL', 'COMPLETED'].includes(String(job?.status || '').toUpperCase());
                const fixKey = `${manga?.id}:${job?.id}`;
                return (
                  <div key={`${job?.id || 'job'}-${manga?.id || index}`} className="rounded-[28px] border-4 overflow-hidden" style={{ boxShadow: '10px 10px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
                      <div className="relative min-h-[220px] border-b-4 lg:border-b-0 lg:border-r-4" style={{ borderColor: 'var(--panel-border)', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
                        {manga?.cover_manga ? (
                          <img src={manga.cover_manga} alt={manga?.judul_manga || 'manga'} className="absolute inset-0 h-full w-full object-cover opacity-80" />
                        ) : null}
                        <div className="absolute inset-0 bg-black/40" />
                        <div className="relative flex h-full flex-col justify-between p-4 text-white">
                          <div className="inline-flex w-fit items-center gap-2 rounded-full border-4 px-3 py-1 text-xs font-black" style={{ borderColor: 'rgba(255,255,255,0.35)', background: tone.bg, color: tone.fg }}>
                            {renderStatusIcon(job?.status)}
                            {String(job?.status || 'UNKNOWN').toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-black uppercase tracking-[0.2em] opacity-80">{manga?.type_manga || 'MANGA'}</div>
                            <div className="mt-2 text-xl font-black leading-tight">{manga?.judul_manga || `Manga #${manga?.id || '-'}`}</div>
                            <div className="mt-2 text-sm font-semibold opacity-80">{job?.current_chapter_label ? `Sedang di chapter ${job.current_chapter_label}` : 'Menunggu chapter aktif'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 md:p-6 space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-black opacity-60">Stage aktif</div>
                            <div className="mt-1 text-lg font-black">{formatStage(job?.current_stage)}</div>
                            <div className="mt-1 text-sm font-semibold opacity-70">{formatHumanStatus(job)}</div>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {canFix && manga?.id && job?.id ? (
                              <button
                                type="button"
                                onClick={() => onFixGrabStack({ mangaId: manga.id, jobId: job.id, status: job?.status })}
                                disabled={fixingKey === fixKey || loadingList}
                                className="inline-flex items-center gap-2 rounded-2xl border-4 px-4 py-2 font-black disabled:opacity-60"
                                style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)', background: '#fef3c7', color: '#92400e' }}
                              >
                                <Wrench className={`size-4 ${fixingKey === fixKey ? 'animate-spin' : ''}`} />
                                {fixingKey === fixKey ? 'Memperbaiki...' : 'Fix grab stack'}
                              </button>
                            ) : null}
                            {manga?.id ? (
                              <button
                                type="button"
                                onClick={() => router.push(`/dashboard/manga-admin/${manga.id}`)}
                                className="rounded-2xl border-4 px-4 py-2 font-black"
                                style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)', background: 'var(--background)', color: 'var(--foreground)' }}
                              >
                                Buka Manga
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm font-black">
                            <span>Progress chapter</span>
                            <span>{progress.label}</span>
                          </div>
                          <div className="h-4 rounded-full border-4 overflow-hidden" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress.percent}%`, background: tone.bar }} />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <MetricCard label="Diproses" value={job?.processed_chapters ?? 0} />
                          <MetricCard label="Berhasil" value={job?.success_chapters ?? 0} success />
                          <MetricCard label="Gagal" value={job?.failed_chapters ?? 0} danger />
                          <MetricCard label="Total" value={job?.total_chapters ?? 0} />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <InfoPill title="URL Sample" value={job?.sample_url || '-'} />
                          <InfoPill title="Admin" value={job?.admin?.username ? `${job.admin.username} (#${job.admin.id})` : '-'} />
                          <InfoPill title="Rentang" value={formatRange(job)} />
                          <InfoPill title="Diupdate" value={formatDateTime(job?.updatedAt)} />
                        </div>

                        {job?.error_message ? (
                          <div className="rounded-2xl border-4 px-4 py-3 text-sm font-bold" style={{ borderColor: 'var(--panel-border)', background: '#fee2e2', color: '#7f1d1d' }}>
                            {job.error_message}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryMiniCard({ label, value, tone = 'neutral' }) {
  const meta = getMiniTone(tone);
  return (
    <div className="rounded-2xl border-4 px-3 py-4" style={{ borderColor: 'var(--panel-border)', background: meta.bg, color: meta.fg }}>
      <div className="text-[11px] font-black uppercase tracking-[0.15em] opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

function MetricCard({ label, value, success = false, danger = false }) {
  const bg = success ? '#dcfce7' : danger ? '#fee2e2' : 'var(--background)';
  const fg = success ? '#166534' : danger ? '#991b1b' : 'var(--foreground)';
  return (
    <div className="rounded-2xl border-4 px-4 py-3" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)', background: bg, color: fg }}>
      <div className="text-xs font-black opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

function InfoPill({ title, value }) {
  return (
    <div className="rounded-2xl border-4 px-4 py-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="text-[11px] font-black uppercase tracking-[0.15em] opacity-60">{title}</div>
      <div className="mt-1 text-sm font-bold break-words">{value}</div>
    </div>
  );
}

function computeProgress(job) {
  const processed = Number(job?.processed_chapters ?? 0) || 0;
  const total = Number(job?.total_chapters ?? 0) || 0;
  const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((processed / total) * 100))) : 0;
  return {
    percent,
    label: total > 0 ? `${processed}/${total} chapter` : `${processed} chapter`,
  };
}

function formatHumanStatus(job) {
  const status = String(job?.status || '').toUpperCase();
  const currentLabel = String(job?.current_chapter_label || job?.current_chapter_number || '').trim();
  if (status === 'RUNNING') return currentLabel ? `Sedang grab chapter ${currentLabel}` : 'Sedang diproses backend';
  if (status === 'PENDING') return 'Masuk antrean, menunggu worker';
  if (status === 'COMPLETED') return 'Semua chapter selesai diproses';
  if (status === 'FAILED') return 'Job berhenti karena error';
  if (status === 'PARTIAL') return 'Sebagian chapter berhasil diproses';
  return 'Status belum diketahui';
}

function formatStage(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Menunggu status';
  return raw
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatRange(job) {
  const start = job?.start_chapter;
  const end = job?.end_chapter;
  if ((start === undefined || start === null || start === '') && (end === undefined || end === null || end === '')) return '-';
  if (start === end) return String(start);
  return `${start ?? '-'} → ${end ?? '-'}`;
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function getMiniTone(tone) {
  if (tone === 'running') return { bg: '#dbeafe', fg: '#1d4ed8' };
  if (tone === 'pending') return { bg: '#fef3c7', fg: '#92400e' };
  if (tone === 'success') return { bg: '#dcfce7', fg: '#166534' };
  if (tone === 'failed') return { bg: '#fee2e2', fg: '#991b1b' };
  if (tone === 'partial') return { bg: '#fde68a', fg: '#92400e' };
  return { bg: 'var(--background)', fg: 'var(--foreground)' };
}

function getStatusTone(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'RUNNING') return { bg: '#dbeafe', fg: '#1e3a8a', bar: '#2563eb' };
  if (s === 'PENDING') return { bg: '#fef3c7', fg: '#92400e', bar: '#f59e0b' };
  if (s === 'COMPLETED') return { bg: '#bbf7d0', fg: '#14532d', bar: '#16a34a' };
  if (s === 'FAILED') return { bg: '#fecaca', fg: '#7f1d1d', bar: '#dc2626' };
  if (s === 'PARTIAL') return { bg: '#fde68a', fg: '#78350f', bar: '#d97706' };
  return { bg: '#e5e7eb', fg: '#111827', bar: '#6b7280' };
}

function renderStatusIcon(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'RUNNING') return <Activity className="size-4" />;
  if (s === 'PENDING') return <Clock3 className="size-4" />;
  if (s === 'COMPLETED') return <CheckCircle2 className="size-4" />;
  if (s === 'FAILED') return <XCircle className="size-4" />;
  if (s === 'PARTIAL') return <AlertTriangle className="size-4" />;
  return <BadgeCheck className="size-4" />;
}
