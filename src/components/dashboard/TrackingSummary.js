'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Activity, AlertTriangle, Timer, Route, RefreshCw, ArrowRight } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getTrackingSummary } from '@/lib/api';

function msLabel(ms) {
  const n = Number(ms) || 0;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function statusBadge(avgMs, maxMs) {
  if (avgMs >= 3000 || maxMs >= 10000) return <span className="badge badge--error">KRITIS</span>;
  if (avgMs >= 1500) return <span className="badge badge--warning">LAMBAT</span>;
  return <span className="badge badge--success">NORMAL</span>;
}

export default function TrackingSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetchingRef = useRef(false);

  const fetchSummary = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const token = getSession()?.token;
      const data = await getTrackingSummary({ token, hours: 24 });
      setData(data);
    } catch (err) {
      toast.error(err?.message || 'Gagal mengambil ringkasan tracking');
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const id = setInterval(fetchSummary, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topSlowRoutes = Array.isArray(data?.slow_routes) ? data.slow_routes.slice(0, 5) : [];
  const topErrors = Array.isArray(data?.errors_by_type) ? data.errors_by_type.slice(0, 4) : [];
  const totalErrors = Number(data?.total_errors) || 0;
  const totalSlow = Number(data?.total_slow) || 0;
  const avgSlowMs = topSlowRoutes.length
    ? Math.round(topSlowRoutes.reduce((acc, r) => acc + Number(r.avg_ms || 0), 0) / topSlowRoutes.length)
    : 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="section-title flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Tracking Endpoint — 24 Jam Terakhir
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={fetchSummary} className="btn btn--secondary btn--sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link href="/dashboard/tracking-endpoint" className="btn btn--secondary btn--sm">
            Detail <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="stat-grid mb-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <span className="stat-card__label">Total Error</span>
          </div>
          <div className="stat-card__value">{data ? totalErrors.toLocaleString() : '-'}</div>
          <div className="stat-card__delta flex items-center gap-1" style={{ color: 'var(--muted)' }}>
            Error tercatat 24 jam
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <span className="stat-card__label">Request Lambat</span>
          </div>
          <div className="stat-card__value">{data ? totalSlow.toLocaleString() : '-'}</div>
          <div className="stat-card__delta flex items-center gap-1" style={{ color: 'var(--muted)' }}>
            Di atas 1 detik
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <span className="stat-card__label">Rata-rata Lambat</span>
          </div>
          <div className="stat-card__value">{msLabel(avgSlowMs)}</div>
          <div className="stat-card__delta flex items-center gap-1" style={{ color: 'var(--muted)' }}>
            Rata-rata route lambat
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <span className="stat-card__label">Route Terlambat</span>
          </div>
          <div className="stat-card__value">{data ? (Array.isArray(data.slow_routes) ? data.slow_routes.length : 0).toLocaleString() : '-'}</div>
          <div className="stat-card__delta flex items-center gap-1" style={{ color: 'var(--muted)' }}>
            Route unik terdeteksi
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="label">Route Paling Lambat</span>
            <Link href="/dashboard/tracking-endpoint" className="text-xs font-bold uppercase tracking-wide inline-flex items-center gap-1">
              Semua <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {topSlowRoutes.length === 0 ? (
            <div className="text-sm opacity-70 py-4 text-center">Belum ada data route lambat</div>
          ) : (
            <div className="table-wrapper">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Route</th>
                    <th className="text-right">Avg</th>
                    <th className="text-right">Max</th>
                    <th className="text-right">Hit</th>
                  </tr>
                </thead>
                <tbody>
                  {topSlowRoutes.map((r, i) => (
                    <tr key={`${r.method}-${r.route}-${i}`} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                      <td className="px-4 py-2 font-mono text-xs font-bold">{r.method}</td>
                      <td className="px-4 py-2 font-mono text-xs max-w-[280px] truncate" title={r.route}>{r.route}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{msLabel(r.avg_ms)}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{msLabel(r.max_ms)}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="label">Error per Tipe</span>
            <Link href="/dashboard/tracking-endpoint?tab=errors" className="text-xs font-bold uppercase tracking-wide inline-flex items-center gap-1">
              Semua <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {topErrors.length === 0 ? (
            <div className="text-sm opacity-70 py-4 text-center">Tidak ada error — server sehat</div>
          ) : (
            <div className="space-y-2">
              {topErrors.map((e) => (
                <div key={e.type} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs truncate">{e.type || 'unknown'}</span>
                  <span className="badge badge--error">{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
