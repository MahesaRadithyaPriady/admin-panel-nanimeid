'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  Activity,
  AlertTriangle,
  Timer,
  Route,
  RefreshCcw,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import {
  getTrackingSlowRoutes,
  getTrackingSlowFunctions,
  getTrackingErrorsRecent,
} from '@/lib/api';

const HOUR_OPTIONS = [
  { value: 6, label: '6 Jam' },
  { value: 24, label: '24 Jam' },
  { value: 72, label: '3 Hari' },
  { value: 168, label: '7 Hari' },
];

const METHOD_BADGE = {
  GET: 'badge--info',
  POST: 'badge--success',
  PUT: 'badge--warning',
  PATCH: 'badge--warning',
  DELETE: 'badge--error',
};

function msLabel(ms) {
  const n = Number(ms) || 0;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.round(n)}ms`;
}

function fmtTime(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(avgMs, maxMs) {
  if (avgMs >= 3000 || maxMs >= 10000) return <span className="badge badge--error">KRITIS</span>;
  if (avgMs >= 1500) return <span className="badge badge--warning">LAMBAT</span>;
  return <span className="badge badge--success">NORMAL</span>;
}

export default function TrackingEndpointPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const [tab, setTab] = useState('routes');
  const [hours, setHours] = useState(24);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [errType, setErrType] = useState('');
  const [page, setPage] = useState(1);

  // Baca ?tab=errors dari URL (dipakai link di dashboard)
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('tab') === 'errors') setTab('errors');
    } catch {}
  }, []);

  const [routes, setRoutes] = useState([]);
  const [routesMeta, setRoutesMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [functions, setFunctions] = useState([]);
  const [fnMeta, setFnMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [errors, setErrors] = useState([]);
  const [errMeta, setErrMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loadingData, setLoadingData] = useState(false);
  const [expandedErr, setExpandedErr] = useState(null);
  const [summary, setSummary] = useState(null);

  // Ringkasan tipe error untuk dropdown filter
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getTrackingSummaryData();
    async function getTrackingSummaryData() {
      try {
        const token = getSession()?.token;
        const data = await getTrackingSummary({ token, hours: 168 });
        if (!cancelled) setSummary(data);
      } catch {}
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  // Debounce search input → query
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadRoutes = async () => {
    setLoadingData(true);
    try {
      const token = getSession()?.token;
      const data = await getTrackingSlowRoutes({ token, hours, page, limit: 20, q: search });
      setRoutes(Array.isArray(data?.routes) ? data.routes : []);
      setRoutesMeta({
        total: data?.total || 0,
        page: data?.page || 1,
        totalPages: data?.totalPages || 1,
      });
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat route lambat');
      setRoutes([]);
    } finally {
      setLoadingData(false);
    }
  };

  const loadFunctions = async () => {
    setLoadingData(true);
    try {
      const token = getSession()?.token;
      const data = await getTrackingSlowFunctions({ token, hours, page, limit: 20, q: search });
      setFunctions(Array.isArray(data?.functions) ? data.functions : []);
      setFnMeta({ total: data?.total || 0, page: data?.page || 1, totalPages: data?.totalPages || 1 });
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat fungsi lambat');
      setFunctions([]);
    } finally {
      setLoadingData(false);
    }
  };

  const loadErrors = async () => {
    setLoadingData(true);
    try {
      const token = getSession()?.token;
      const data = await getTrackingErrorsRecent({ token, hours, page, limit: 20, q: search, type: errType || undefined });
      setErrors(Array.isArray(data?.data) ? data.data : []);
      setErrMeta({ total: data?.total || 0, page: data?.page || 1, totalPages: data?.totalPages || 1 });
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat error');
      setErrors([]);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (tab === 'routes') loadRoutes();
    else if (tab === 'functions') loadFunctions();
    else loadErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, hours, search, errType, page, user?.token]);

  const activeMeta = tab === 'routes' ? routesMeta : tab === 'functions' ? fnMeta : errMeta;
  const rowCount = tab === 'routes' ? routes.length : tab === 'functions' ? functions.length : errors.length;

  if (loading || !user) return null;

  return (
    <div className="space-y-4 min-w-0 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Endpoint Tracking</h1>
          <p className="label mt-1">Rekap route/fungsi lambat dan error server</p>
        </div>
        <button
          onClick={() => {
            if (tab === 'routes') loadRoutes();
            else if (tab === 'functions') loadFunctions();
            else loadErrors();
            toast.success('Data diperbarui');
          }}
          className="btn btn--secondary btn--sm flex-shrink-0"
        >
          <RefreshCcw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { key: 'routes', label: 'Route Lambat', icon: Route },
          { key: 'functions', label: 'Fungsi Lambat', icon: Timer },
          { key: 'errors', label: 'Error', icon: AlertTriangle },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`tab ${tab === t.key ? 'tab--active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label uppercase block mb-1">Periode</label>
            <select
              value={hours}
              onChange={(e) => { setHours(parseInt(e.target.value) || 24); setPage(1); }}
              className="select w-full"
            >
              <option value={6}>6 Jam</option>
              <option value={24}>24 Jam</option>
              <option value={72}>3 Hari</option>
              <option value={168}>7 Hari</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label uppercase block mb-1">Search</label>
            <div className="input-icon">
              <Search className="input-icon__icon" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={tab === 'errors' ? 'Cari type, scope, route, message...' : 'Cari route / fungsi...'}
                className="input w-full"
              />
            </div>
          </div>
          {tab === 'errors' && (
            <div>
              <label className="label uppercase block mb-1">Tipe Error</label>
              <select
                value={errType}
                onChange={(e) => { setErrType(e.target.value); setPage(1); }}
                className="select w-full"
              >
                <option value="">Semua</option>
                {(Array.isArray(summary?.errors_by_type) ? summary.errors_by_type : []).map((e) => (
                  <option key={e.type} value={e.type}>{e.type || 'unknown'}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Routes table */}
      {tab === 'routes' && (
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th>Method</th>
                <th>Route</th>
                <th className="text-right">Avg</th>
                <th className="text-right">Max</th>
                <th className="text-right">Min</th>
                <th className="text-right">Hit</th>
                <th className="text-right">5xx</th>
                <th>Terakhir</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr><td colSpan="9" className="px-4 py-8 text-center opacity-70">Memuat...</td></tr>
              ) : routes.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-8 text-center opacity-70">Tidak ada route lambat pada periode ini</td></tr>
              ) : (
                routes.map((r, i) => (
                  <tr key={`${r.method}-${r.route}-${i}`} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                    <td className="px-4 py-2">
                      <span className={`badge ${METHOD_BADGE[r.method] || 'badge--neutral'}`}>{r.method}</span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs max-w-[380px] truncate" title={r.route}>{r.route}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{msLabel(r.avg_ms)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{msLabel(r.max_ms)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{msLabel(r.min_ms)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{r.count}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{r.err5xx || 0}</td>
                    <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{fmtTime(r.last_seen)}</td>
                    <td className="px-4 py-2 text-center">{statusBadge(r.avg_ms, r.max_ms)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Functions tab */}
      {tab === 'functions' && (
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th>Fungsi</th>
                <th className="text-right">Avg</th>
                <th className="text-right">Max</th>
                <th className="text-right">Hit</th>
                <th>Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center opacity-70">Memuat...</td></tr>
              ) : functions.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center opacity-70">Tidak ada fungsi lambat pada periode ini</td></tr>
              ) : (
                functions.map((r, i) => (
                  <tr key={`${r.fn}-${i}`} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                    <td className="px-4 py-2 font-mono text-xs max-w-[420px] truncate" title={r.fn}>{r.fn}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{msLabel(r.avg_ms)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{msLabel(r.max_ms)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{r.count}</td>
                    <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{fmtTime(r.last_seen)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Errors tab */}
      {tab === 'errors' && (
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Tipe</th>
                <th>Code</th>
                <th>Scope / Route</th>
                <th>Pesan</th>
                <th className="text-right">Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center opacity-70">Memuat...</td></tr>
              ) : errors.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center opacity-70">Tidak ada error pada periode ini</td></tr>
              ) : (
                errors.map((e) => (
                  <React.Fragment key={String(e.id)}>
                    <tr className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                      <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{fmtTime(e.createdAt)}</td>
                      <td className="px-4 py-2"><span className="badge badge--error">{e.type || 'error'}</span></td>
                      <td className="px-4 py-2 font-mono text-xs max-w-[140px] truncate" title={e.code || '-'}>
                        {e.code ? <span className="badge badge--warning">{e.code}</span> : '-'}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs max-w-[260px] truncate" title={e.scope || e.route}>{e.scope || e.route || '-'}</td>
                      <td className="px-4 py-2 text-xs max-w-[320px] truncate" title={e.message}>{e.message}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{e.status || '-'}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => setExpandedErr(expandedErr === e.id ? null : e.id)}
                          className="pagination__btn"
                          aria-label="Detail error"
                        >
                          {expandedErr === e.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {expandedErr === e.id && (
                      <tr>
                        <td colSpan="7" className="px-4 py-3" style={{ background: 'var(--muted-bg)' }}>
                          <div className="space-y-2 text-xs">
                            <div><strong>Tipe:</strong> <span className="font-mono">{e.type || '-'}</span></div>
                            <div><strong>Code:</strong> <span className="font-mono">{e.code || '-'}</span></div>
                            <div><strong>Scope:</strong> <span className="font-mono">{e.scope || '-'}</span></div>
                            <div><strong>Route:</strong> <span className="font-mono">{e.method} {e.route || '-'}</span></div>
                            <div><strong>User ID:</strong> <span className="font-mono">{e.userId ?? '-'}</span></div>
                            <div><strong>Instance:</strong> <span className="font-mono">{e.instance || '-'}</span></div>
                            {e.stack && (
                              <div>
                                <strong>Stack:</strong>
                                <pre className="font-mono text-[11px] whitespace-pre-wrap p-2 mt-1 overflow-x-auto" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>{e.stack}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {activeMeta.total > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm opacity-70">
            Halaman {page} dari {activeMeta.totalPages} — {activeMeta.total} data
          </div>
          <div className="pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="pagination__btn"
              aria-label="Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-2 text-sm font-semibold">{page} / {activeMeta.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(activeMeta.totalPages, p + 1))}
              disabled={page >= activeMeta.totalPages}
              className="pagination__btn"
              aria-label="Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
