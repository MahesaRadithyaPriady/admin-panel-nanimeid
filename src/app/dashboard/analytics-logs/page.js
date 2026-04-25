'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  Database, 
  FileText, 
  Filter, 
  HardDrive, 
  Layers, 
  Loader2, 
  RefreshCw, 
  Route, 
  Search, 
  Server, 
  TrendingUp, 
  User, 
  Zap,
  ChevronDown,
  ChevronUp,
  Download,
  X,
  Calendar,
  Clock3,
  Cpu,
  MemoryStick,
  FileCode
} from 'lucide-react';
import { 
  getDebugLogStats, 
  getDebugLogLive, 
  getDebugLogCpuRoutes,
  getDebugLogHeavy, 
  getDebugLogErrors, 
  getDebugLogSummary,
  getDebugLogFiles,
  getDebugLogFile,
  exportDebugLog
} from '@/lib/api';
import { toast } from 'react-hot-toast';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'live', label: 'Live Logs', icon: Zap },
  { key: 'cpu', label: 'CPU Routes', icon: Cpu },
  { key: 'heavy', label: 'Heavy Endpoints', icon: TrendingUp },
  { key: 'errors', label: 'Errors', icon: AlertTriangle },
  { key: 'summary', label: 'Route Summary', icon: Route },
  { key: 'files', label: 'File Logs', icon: FileText },
];

const METHOD_COLORS = {
  GET: 'bg-green-100 text-green-700 border-green-300',
  POST: 'bg-blue-100 text-blue-700 border-blue-300',
  PUT: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  DELETE: 'bg-red-100 text-red-700 border-red-300',
  PATCH: 'bg-purple-100 text-purple-700 border-purple-300',
};

const STATUS_COLORS = {
  success: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
};

function getStatusColor(status) {
  if (status >= 200 && status < 300) return STATUS_COLORS.success;
  if (status >= 300 && status < 400) return STATUS_COLORS.warning;
  if (status >= 400) return STATUS_COLORS.error;
  return '';
}

function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '-';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AnalyticsLogsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [liveLogs, setLiveLogs] = useState([]);
  const [cpuRoutes, setCpuRoutes] = useState([]);
  const [heavyEndpoints, setHeavyEndpoints] = useState([]);
  const [errors, setErrors] = useState([]);
  const [summary, setSummary] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileLogs, setFileLogs] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    limit: 100,
    route: '',
    method: '',
    userId: '',
    minDurationMs: '',
    status: '',
    from: '',
    to: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const token = user?.token;

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getDebugLogStats({ token });
      setStats(data);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat statistik');
    }
  }, [token]);

  const loadLiveLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = {
        token,
        limit: filters.limit || 100,
        ...(filters.route && { route: filters.route }),
        ...(filters.method && { method: filters.method }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.minDurationMs && { minDurationMs: Number(filters.minDurationMs) }),
        ...(filters.status && { status: Number(filters.status) }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      };
      const data = await getDebugLogLive(params);
      setLiveLogs(data.data || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat live logs');
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  const loadHeavy = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getDebugLogHeavy({ token, limit: filters.limit || 20 });
      setHeavyEndpoints(data.data || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat heavy endpoints');
    } finally {
      setLoading(false);
    }
  }, [token, filters.limit]);

  const loadCpuRoutes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = {
        token,
        limit: filters.limit || 100,
        ...(filters.minDurationMs && { minDurationMs: Number(filters.minDurationMs) }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      };
      const data = await getDebugLogCpuRoutes(params);
      setCpuRoutes(data.data || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat CPU routes');
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  const loadErrors = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = {
        token,
        limit: filters.limit || 100,
        ...(filters.status && { status: Number(filters.status) }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      };
      const data = await getDebugLogErrors(params);
      setErrors(data.data || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat error logs');
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  const loadSummary = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = {
        token,
        limit: filters.limit || 100,
        ...(filters.minDurationMs && { minDurationMs: Number(filters.minDurationMs) }),
      };
      const data = await getDebugLogSummary(params);
      setSummary(data.data || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat route summary');
    } finally {
      setLoading(false);
    }
  }, [token, filters.limit, filters.minDurationMs]);

  const loadFiles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getDebugLogFiles({ token });
      setFiles(data.data || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar file');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadFileLogs = useCallback(async (filename) => {
    if (!token || !filename) return;
    setLoading(true);
    try {
      const data = await getDebugLogFile({ 
        token, 
        filename, 
        tail: filters.limit || 500,
        ...(filters.route && { route: filters.route }),
        ...(filters.method && { method: filters.method }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.minDurationMs && { minDurationMs: Number(filters.minDurationMs) }),
        ...(filters.status && { status: Number(filters.status) }),
      });
      setFileLogs(data.data || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat file log');
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  const handleExport = async () => {
    if (!token) return;
    try {
      const params = {
        token,
        ...(filters.route && { route: filters.route }),
        ...(filters.method && { method: filters.method }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.minDurationMs && { minDurationMs: Number(filters.minDurationMs) }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      };
      const content = await exportDebugLog(params);
      const blob = new Blob([content], { type: 'application/x-ndjson' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `request_log_export_${new Date().toISOString().replace(/[:.]/g, '-')}.ndjson`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export berhasil');
    } catch (err) {
      toast.error(err?.message || 'Gagal export');
    }
  };

  useEffect(() => {
    if (!token) return;
    loadStats();
  }, [token, loadStats]);

  useEffect(() => {
    if (!token) return;
    switch (activeTab) {
      case 'live':
        loadLiveLogs();
        break;
      case 'cpu':
        loadCpuRoutes();
        break;
      case 'heavy':
        loadHeavy();
        break;
      case 'errors':
        loadErrors();
        break;
      case 'summary':
        loadSummary();
        break;
      case 'files':
        loadFiles();
        break;
    }
  }, [activeTab, token, loadLiveLogs, loadCpuRoutes, loadHeavy, loadErrors, loadSummary, loadFiles]);

  useEffect(() => {
    if (selectedFile && activeTab === 'files') {
      loadFileLogs(selectedFile);
    }
  }, [selectedFile, activeTab, loadFileLogs]);

  const handleRefresh = () => {
    switch (activeTab) {
      case 'overview':
        loadStats();
        break;
      case 'live':
        loadLiveLogs();
        break;
      case 'cpu':
        loadCpuRoutes();
        break;
      case 'heavy':
        loadHeavy();
        break;
      case 'errors':
        loadErrors();
        break;
      case 'summary':
        loadSummary();
        break;
      case 'files':
        if (selectedFile) loadFileLogs(selectedFile);
        else loadFiles();
        break;
    }
  };

  const renderStatsCards = () => {
    if (!stats) return null;
    const cards = [
      { 
        label: 'Buffer Size', 
        value: stats.buffered?.toLocaleString() || 0, 
        sub: `Max: ${stats.maxMemory?.toLocaleString() || '-'}`,
        icon: Database,
        color: '#3B82F6'
      },
      { 
        label: 'Heap Used', 
        value: `${stats.currentMemory?.heapUsedMB?.toFixed(1) || 0} MB`, 
        sub: `Total: ${stats.currentMemory?.heapTotalMB?.toFixed(1) || 0} MB`,
        icon: MemoryStick,
        color: '#10B981'
      },
      { 
        label: 'RSS', 
        value: `${stats.currentMemory?.rssMB?.toFixed(1) || 0} MB`, 
        sub: `External: ${stats.currentMemory?.externalMB?.toFixed(1) || 0} MB`,
        icon: HardDrive,
        color: '#8B5CF6'
      },
      { 
        label: 'CPU Usage', 
        value: `${stats.currentCpuPct?.toFixed(1) || 0}%`, 
        sub: `Uptime: ${Math.floor((stats.uptime_s || 0) / 3600)}h`,
        icon: Cpu,
        color: '#F59E0B'
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <div 
            key={card.label}
            className="border-4 rounded-xl p-4"
            style={{ 
              boxShadow: '4px 4px 0 #000', 
              background: 'var(--panel-bg)', 
              borderColor: 'var(--panel-border)' 
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold opacity-60 mb-1">{card.label}</div>
                <div className="text-2xl font-black">{card.value}</div>
                <div className="text-xs font-semibold opacity-50 mt-1">{card.sub}</div>
              </div>
              <div 
                className="p-2 rounded-lg border-2"
                style={{ background: card.color + '20', borderColor: card.color }}
              >
                <card.icon className="size-5" style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLiveTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
            <th className="text-left py-3 px-2 font-bold">Waktu</th>
            <th className="text-left py-3 px-2 font-bold">Method</th>
            <th className="text-left py-3 px-2 font-bold">Route</th>
            <th className="text-left py-3 px-2 font-bold">Status</th>
            <th className="text-left py-3 px-2 font-bold">Durasi</th>
            <th className="text-left py-3 px-2 font-bold">User</th>
            <th className="text-left py-3 px-2 font-bold">Memory</th>
            <th className="text-left py-3 px-2 font-bold">CPU</th>
          </tr>
        </thead>
        <tbody>
          {liveLogs.map((log, idx) => (
            <tr 
              key={idx} 
              className="border-b hover:brightness-95 transition-all"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              <td className="py-3 px-2 font-mono text-xs">{formatDate(log.ts)}</td>
              <td className="py-3 px-2">
                <span className={`px-2 py-1 rounded-md text-xs font-black border-2 ${METHOD_COLORS[log.method] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                  {log.method}
                </span>
              </td>
              <td className="py-3 px-2">
                <div className="font-semibold max-w-xs truncate" title={log.route}>{log.route}</div>
                <div className="text-xs opacity-60 max-w-xs truncate" title={log.path}>{log.path}</div>
              </td>
              <td className="py-3 px-2">
                <span className={`font-black ${getStatusColor(log.status)}`}>{log.status}</span>
              </td>
              <td className="py-3 px-2 font-mono">{formatDuration(log.durationMs)}</td>
              <td className="py-3 px-2">
                {log.userId ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-bold border-2 border-blue-300">
                    <User className="size-3" />
                    {log.userId}
                  </span>
                ) : (
                  <span className="text-xs opacity-50">-</span>
                )}
              </td>
              <td className="py-3 px-2 font-mono text-xs">{log.heapUsedMB?.toFixed(1)} MB</td>
              <td className="py-3 px-2 font-mono text-xs">{log.cpuPct?.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {liveLogs.length === 0 && (
        <div className="text-center py-12 opacity-50">
          <Zap className="size-12 mx-auto mb-3" />
          <p className="font-bold">Tidak ada data live log</p>
        </div>
      )}
    </div>
  );

  const renderCpuRoutesTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
            <th className="text-left py-3 px-2 font-bold">Method</th>
            <th className="text-left py-3 px-2 font-bold">Route</th>
            <th className="text-right py-3 px-2 font-bold">Count</th>
            <th className="text-right py-3 px-2 font-bold">Avg CPU</th>
            <th className="text-right py-3 px-2 font-bold">Avg (ms)</th>
            <th className="text-right py-3 px-2 font-bold">Avg Heap</th>
          </tr>
        </thead>
        <tbody>
          {cpuRoutes.map((route, idx) => (
            <tr 
              key={idx}
              className="border-b hover:brightness-95 transition-all"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              <td className="py-3 px-2">
                <span className={`px-2 py-1 rounded-md text-xs font-black border-2 ${METHOD_COLORS[route.method] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                  {route.method}
                </span>
              </td>
              <td className="py-3 px-2 font-semibold max-w-sm truncate" title={route.route}>{route.route}</td>
              <td className="py-3 px-2 text-right font-mono font-bold">{route.count?.toLocaleString()}</td>
              <td className="py-3 px-2 text-right font-mono">
                <span className={route.avgCpuPct > 70 ? 'text-red-600 font-black' : route.avgCpuPct > 30 ? 'text-yellow-600 font-black' : 'text-green-600 font-bold'}>
                  {route.avgCpuPct?.toFixed(1)}%
                </span>
              </td>
              <td className="py-3 px-2 text-right font-mono">{route.avg_ms}</td>
              <td className="py-3 px-2 text-right font-mono">{route.avgHeapMB?.toFixed(1)} MB</td>
            </tr>
          ))}
        </tbody>
      </table>
      {cpuRoutes.length === 0 && (
        <div className="text-center py-12 opacity-50">
          <Cpu className="size-12 mx-auto mb-3" />
          <p className="font-bold">Tidak ada data CPU routes</p>
        </div>
      )}
    </div>
  );

  const renderHeavyTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
            <th className="text-left py-3 px-2 font-bold">Method</th>
            <th className="text-left py-3 px-2 font-bold">Route</th>
            <th className="text-right py-3 px-2 font-bold">Count</th>
            <th className="text-right py-3 px-2 font-bold">Avg (ms)</th>
            <th className="text-right py-3 px-2 font-bold">Max (ms)</th>
            <th className="text-right py-3 px-2 font-bold">Min (ms)</th>
            <th className="text-center py-3 px-2 font-bold">4xx</th>
            <th className="text-center py-3 px-2 font-bold">5xx</th>
          </tr>
        </thead>
        <tbody>
          {heavyEndpoints.map((ep, idx) => (
            <tr 
              key={idx} 
              className="border-b hover:brightness-95 transition-all"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              <td className="py-3 px-2">
                <span className={`px-2 py-1 rounded-md text-xs font-black border-2 ${METHOD_COLORS[ep.method] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                  {ep.method}
                </span>
              </td>
              <td className="py-3 px-2 font-semibold max-w-sm truncate" title={ep.route}>{ep.route}</td>
              <td className="py-3 px-2 text-right font-mono font-bold">{ep.count?.toLocaleString()}</td>
              <td className="py-3 px-2 text-right font-mono">
                <span className={ep.avg_ms > 500 ? 'text-red-600 font-black' : ep.avg_ms > 200 ? 'text-yellow-600 font-bold' : ''}>
                  {ep.avg_ms}
                </span>
              </td>
              <td className="py-3 px-2 text-right font-mono">{ep.max_ms}</td>
              <td className="py-3 px-2 text-right font-mono">{ep.min_ms}</td>
              <td className="py-3 px-2 text-center">
                {ep.err4xx > 0 ? (
                  <span className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-700 text-xs font-black border-2 border-yellow-300">
                    {ep.err4xx}
                  </span>
                ) : (
                  <span className="text-xs opacity-50">-</span>
                )}
              </td>
              <td className="py-3 px-2 text-center">
                {ep.err5xx > 0 ? (
                  <span className="px-2 py-1 rounded-md bg-red-100 text-red-700 text-xs font-black border-2 border-red-300">
                    {ep.err5xx}
                  </span>
                ) : (
                  <span className="text-xs opacity-50">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {heavyEndpoints.length === 0 && (
        <div className="text-center py-12 opacity-50">
          <TrendingUp className="size-12 mx-auto mb-3" />
          <p className="font-bold">Tidak ada data heavy endpoints</p>
        </div>
      )}
    </div>
  );

  const renderErrorsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
            <th className="text-left py-3 px-2 font-bold">Waktu</th>
            <th className="text-left py-3 px-2 font-bold">Method</th>
            <th className="text-left py-3 px-2 font-bold">Route</th>
            <th className="text-left py-3 px-2 font-bold">Status</th>
            <th className="text-left py-3 px-2 font-bold">Durasi</th>
            <th className="text-left py-3 px-2 font-bold">User</th>
            <th className="text-left py-3 px-2 font-bold">IP</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((err, idx) => (
            <tr 
              key={idx} 
              className="border-b hover:brightness-95 transition-all"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              <td className="py-3 px-2 font-mono text-xs">{formatDate(err.ts)}</td>
              <td className="py-3 px-2">
                <span className={`px-2 py-1 rounded-md text-xs font-black border-2 ${METHOD_COLORS[err.method] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                  {err.method}
                </span>
              </td>
              <td className="py-3 px-2">
                <div className="font-semibold max-w-xs truncate" title={err.route}>{err.route}</div>
              </td>
              <td className="py-3 px-2">
                <span className={`px-2 py-1 rounded-md text-xs font-black border-2 ${err.status >= 500 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-yellow-100 text-yellow-700 border-yellow-300'}`}>
                  {err.status}
                </span>
              </td>
              <td className="py-3 px-2 font-mono">{formatDuration(err.durationMs)}</td>
              <td className="py-3 px-2">
                {err.userId ? (
                  <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-bold border-2 border-blue-300">
                    {err.userId}
                  </span>
                ) : (
                  <span className="text-xs opacity-50">-</span>
                )}
              </td>
              <td className="py-3 px-2 font-mono text-xs">{err.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {errors.length === 0 && (
        <div className="text-center py-12 opacity-50">
          <AlertTriangle className="size-12 mx-auto mb-3" />
          <p className="font-bold">Tidak ada error logs</p>
        </div>
      )}
    </div>
  );

  const renderSummaryTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
            <th className="text-left py-3 px-2 font-bold">Method</th>
            <th className="text-left py-3 px-2 font-bold">Route</th>
            <th className="text-right py-3 px-2 font-bold">Count</th>
            <th className="text-right py-3 px-2 font-bold">Avg (ms)</th>
            <th className="text-right py-3 px-2 font-bold">Avg Heap</th>
            <th className="text-right py-3 px-2 font-bold">Avg CPU</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((s, idx) => (
            <tr 
              key={idx} 
              className="border-b hover:brightness-95 transition-all"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              <td className="py-3 px-2">
                <span className={`px-2 py-1 rounded-md text-xs font-black border-2 ${METHOD_COLORS[s.method] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                  {s.method}
                </span>
              </td>
              <td className="py-3 px-2 font-semibold max-w-sm truncate" title={s.route}>{s.route}</td>
              <td className="py-3 px-2 text-right font-mono font-bold">{s.count?.toLocaleString()}</td>
              <td className="py-3 px-2 text-right font-mono">{s.avg_ms}</td>
              <td className="py-3 px-2 text-right font-mono">{s.avgHeapMB?.toFixed(1)} MB</td>
              <td className="py-3 px-2 text-right font-mono">{s.avgCpuPct?.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {summary.length === 0 && (
        <div className="text-center py-12 opacity-50">
          <Route className="size-12 mx-auto mb-3" />
          <p className="font-bold">Tidak ada data summary</p>
        </div>
      )}
    </div>
  );

  const renderFilesList = () => (
    <div className="space-y-4">
      {!selectedFile ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((f) => (
              <button
                key={f.file}
                onClick={() => setSelectedFile(f.file)}
                className="text-left border-4 rounded-xl p-4 hover:brightness-95 transition-all"
                style={{ 
                  boxShadow: '4px 4px 0 #000', 
                  background: 'var(--panel-bg)', 
                  borderColor: 'var(--panel-border)' 
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 border-2 border-blue-300">
                    <FileCode className="size-5 text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" title={f.file}>{f.file}</div>
                    <div className="text-xs opacity-60 mt-1">{formatBytes(f.sizeBytes)}</div>
                    <div className="text-xs opacity-50">{formatDate(f.mtime)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {files.length === 0 && (
            <div className="text-center py-12 opacity-50">
              <FileText className="size-12 mx-auto mb-3" />
              <p className="font-bold">Tidak ada file log</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => {
                setSelectedFile(null);
                setFileLogs([]);
              }}
              className="flex items-center gap-2 px-3 py-2 border-4 rounded-lg font-bold text-sm hover:brightness-95"
              style={{ 
                boxShadow: '3px 3px 0 #000', 
                background: 'var(--panel-bg)', 
                borderColor: 'var(--panel-border)' 
              }}
            >
              <ChevronUp className="size-4" />
              Kembali
            </button>
            <div className="font-bold">{selectedFile}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
                  <th className="text-left py-3 px-2 font-bold">Waktu</th>
                  <th className="text-left py-3 px-2 font-bold">Method</th>
                  <th className="text-left py-3 px-2 font-bold">Route</th>
                  <th className="text-left py-3 px-2 font-bold">Status</th>
                  <th className="text-left py-3 px-2 font-bold">Durasi</th>
                </tr>
              </thead>
              <tbody>
                {fileLogs.map((log, idx) => (
                  <tr 
                    key={idx} 
                    className="border-b hover:brightness-95 transition-all"
                    style={{ borderColor: 'var(--panel-border)' }}
                  >
                    <td className="py-3 px-2 font-mono text-xs">{formatDate(log.ts)}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-md text-xs font-black border-2 ${METHOD_COLORS[log.method] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-semibold max-w-sm truncate">{log.route}</td>
                    <td className="py-3 px-2">
                      <span className={`font-black ${getStatusColor(log.status)}`}>{log.status}</span>
                    </td>
                    <td className="py-3 px-2 font-mono">{formatDuration(log.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {fileLogs.length === 0 && (
              <div className="text-center py-12 opacity-50">
                <FileCode className="size-12 mx-auto mb-3" />
                <p className="font-bold">Tidak ada data di file ini</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {renderStatsCards()}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div 
          className="border-4 rounded-xl p-4"
          style={{ 
            boxShadow: '4px 4px 0 #000', 
            background: 'var(--panel-bg)', 
            borderColor: 'var(--panel-border)' 
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Server className="size-5" />
            <h3 className="font-bold">Server Info</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="opacity-60">Environment</span>
              <span className="font-bold">{stats?.env || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Node Version</span>
              <span className="font-bold">{stats?.node || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">PID</span>
              <span className="font-bold">{stats?.pid || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Profiler Enabled</span>
              <span className={`font-bold ${stats?.enabled ? 'text-green-600' : 'text-red-600'}`}>
                {stats?.enabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Flush Interval</span>
              <span className="font-bold">{stats?.flushIntervalMs}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Log Directory</span>
              <span className="font-mono text-xs">{stats?.logDir || '-'}</span>
            </div>
          </div>
        </div>

        <div 
          className="border-4 rounded-xl p-4"
          style={{ 
            boxShadow: '4px 4px 0 #000', 
            background: 'var(--panel-bg)', 
            borderColor: 'var(--panel-border)' 
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Layers className="size-5" />
            <h3 className="font-bold">Quick Stats</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setActiveTab('live')}
              className="border-4 rounded-lg p-3 text-left hover:brightness-95 transition-all"
              style={{ 
                boxShadow: '3px 3px 0 #000', 
                background: 'var(--panel-bg)', 
                borderColor: 'var(--panel-border)' 
              }}
            >
              <div className="text-xs opacity-60 mb-1">Live Buffer</div>
              <div className="text-xl font-black">{stats?.buffered?.toLocaleString() || 0}</div>
              <div className="text-xs opacity-50">entries in memory</div>
            </button>
            <button
              onClick={() => setActiveTab('heavy')}
              className="border-4 rounded-lg p-3 text-left hover:brightness-95 transition-all"
              style={{ 
                boxShadow: '3px 3px 0 #000', 
                background: 'var(--panel-bg)', 
                borderColor: 'var(--panel-border)' 
              }}
            >
              <div className="text-xs opacity-60 mb-1">Heavy Endpoints</div>
              <div className="text-xl font-black">Check</div>
              <div className="text-xs opacity-50">slow routes</div>
            </button>
            <button
              onClick={() => setActiveTab('errors')}
              className="border-4 rounded-lg p-3 text-left hover:brightness-95 transition-all"
              style={{ 
                boxShadow: '3px 3px 0 #000', 
                background: 'var(--panel-bg)', 
                borderColor: 'var(--panel-border)' 
              }}
            >
              <div className="text-xs opacity-60 mb-1">Errors</div>
              <div className="text-xl font-black">Check</div>
              <div className="text-xs opacity-50">4xx / 5xx logs</div>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className="border-4 rounded-lg p-3 text-left hover:brightness-95 transition-all"
              style={{ 
                boxShadow: '3px 3px 0 #000', 
                background: 'var(--panel-bg)', 
                borderColor: 'var(--panel-border)' 
              }}
            >
              <div className="text-xs opacity-60 mb-1">File Logs</div>
              <div className="text-xl font-black">{files.length}</div>
              <div className="text-xs opacity-50">archived files</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFilters = () => {
    if (!showFilters) return null;
    
    return (
      <div 
        className="border-4 rounded-xl p-4 mb-4"
        style={{ 
          boxShadow: '4px 4px 0 #000', 
          background: 'var(--panel-bg)', 
          borderColor: 'var(--panel-border)' 
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="size-4" />
            <span className="font-bold">Filters</span>
          </div>
          <button
            onClick={() => setShowFilters(false)}
            className="p-1 hover:opacity-70"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-bold opacity-60 block mb-1">Limit</label>
            <input
              type="number"
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) })}
              className="w-full px-3 py-2 border-2 rounded-lg text-sm font-semibold"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}
            />
          </div>
          <div>
            <label className="text-xs font-bold opacity-60 block mb-1">Route Filter</label>
            <input
              type="text"
              value={filters.route}
              onChange={(e) => setFilters({ ...filters, route: e.target.value })}
              placeholder="e.g. /v1/anime"
              className="w-full px-3 py-2 border-2 rounded-lg text-sm font-semibold"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}
            />
          </div>
          <div>
            <label className="text-xs font-bold opacity-60 block mb-1">Method</label>
            <select
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value })}
              className="w-full px-3 py-2 border-2 rounded-lg text-sm font-semibold"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}
            >
              <option value="">All</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold opacity-60 block mb-1">User ID</label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              placeholder="e.g. 88"
              className="w-full px-3 py-2 border-2 rounded-lg text-sm font-semibold"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}
            />
          </div>
          <div>
            <label className="text-xs font-bold opacity-60 block mb-1">Min Duration (ms)</label>
            <input
              type="number"
              value={filters.minDurationMs}
              onChange={(e) => setFilters({ ...filters, minDurationMs: e.target.value })}
              placeholder="e.g. 500"
              className="w-full px-3 py-2 border-2 rounded-lg text-sm font-semibold"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}
            />
          </div>
          <div>
            <label className="text-xs font-bold opacity-60 block mb-1">Status Code</label>
            <input
              type="number"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              placeholder="e.g. 500"
              className="w-full px-3 py-2 border-2 rounded-lg text-sm font-semibold"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}
            />
          </div>
          <div>
            <label className="text-xs font-bold opacity-60 block mb-1">From Date</label>
            <input
              type="datetime-local"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="w-full px-3 py-2 border-2 rounded-lg text-sm font-semibold"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}
            />
          </div>
          <div>
            <label className="text-xs font-bold opacity-60 block mb-1">To Date</label>
            <input
              type="datetime-local"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="w-full px-3 py-2 border-2 rounded-lg text-sm font-semibold"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border-4 rounded-lg font-bold text-sm hover:brightness-95 bg-[#FFD803]"
            style={{ 
              boxShadow: '3px 3px 0 #000', 
              borderColor: 'var(--panel-border)' 
            }}
          >
            <Search className="size-4" />
            Apply Filters
          </button>
          <button
            onClick={() => setFilters({ limit: 100, route: '', method: '', userId: '', minDurationMs: '', status: '', from: '', to: '' })}
            className="flex items-center gap-2 px-4 py-2 border-4 rounded-lg font-bold text-sm hover:brightness-95"
            style={{ 
              boxShadow: '3px 3px 0 #000', 
              background: 'var(--panel-bg)', 
              borderColor: 'var(--panel-border)' 
            }}
          >
            <X className="size-4" />
            Clear
          </button>
        </div>
      </div>
    );
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Activity className="size-6" />
            Analytics Logs
          </h1>
          <p className="text-sm opacity-60 mt-1">Request profiler dan debug logs</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border-4 rounded-lg font-bold text-sm hover:brightness-95 transition-all ${showFilters ? 'bg-[#FFD803]' : ''}`}
            style={{ 
              boxShadow: '3px 3px 0 #000', 
              borderColor: 'var(--panel-border)' 
            }}
          >
            <Filter className="size-4" />
            Filters
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border-4 rounded-lg font-bold text-sm hover:brightness-95 disabled:opacity-50"
            style={{ 
              boxShadow: '3px 3px 0 #000', 
              background: 'var(--panel-bg)', 
              borderColor: 'var(--panel-border)' 
            }}
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 border-4 rounded-lg font-bold text-sm hover:brightness-95 bg-green-100 text-green-700 border-green-300"
            style={{ boxShadow: '3px 3px 0 #000' }}
          >
            <Download className="size-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {renderFilters()}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 border-4 rounded-lg font-bold text-sm hover:brightness-95 transition-all ${active ? 'bg-[#FFD803]' : ''}`}
              style={{ 
                boxShadow: active ? '3px 3px 0 #000' : '2px 2px 0 #000', 
                borderColor: 'var(--panel-border)' 
              }}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div 
        className="border-4 rounded-xl p-4"
        style={{ 
          boxShadow: '4px 4px 0 #000', 
          background: 'var(--panel-bg)', 
          borderColor: 'var(--panel-border)' 
        }}
      >
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin" />
          </div>
        )}
        
        {!loading && (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'live' && renderLiveTable()}
            {activeTab === 'cpu' && renderCpuRoutesTable()}
            {activeTab === 'heavy' && renderHeavyTable()}
            {activeTab === 'errors' && renderErrorsTable()}
            {activeTab === 'summary' && renderSummaryTable()}
            {activeTab === 'files' && renderFilesList()}
          </>
        )}
      </div>
    </div>
  );
}
