'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Cpu, Server, HardDrive, Zap, Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { getSession } from '@/lib/auth';
import { getServerMetrics } from '@/lib/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

const RANGES = [
  { key: '1h',  label: '1 Jam' },
  { key: '6h',  label: '6 Jam' },
  { key: '24h', label: '24 Jam' },
  { key: '7d',  label: '7 Hari' },
  { key: '30d', label: '30 Hari' },
];

const METRIC_COLORS = {
  cpu: '#ef4444',
  ram: '#f59e0b',
  storage: '#3b82f6',
  online: '#22c55e',
};

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

function formatTime(dateStr, range) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  if (range === '1h' || range === '6h') {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } else if (range === '24h') {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } else {
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}

function formatPeakTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ServerMetricsChart() {
  const [range, setRange] = useState('24h');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const [visibleMetrics, setVisibleMetrics] = useState({ cpu: true, ram: true, storage: false, online: true });
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const getTheme = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    setTheme(getTheme());
    const onThemeChange = (e) => setTheme(e.detail);
    window.addEventListener('themechange', onThemeChange);
    return () => window.removeEventListener('themechange', onThemeChange);
  }, []);

  const chartLineColor = theme === 'dark' ? '#ffffff' : '#000000';

  const fetchData = useCallback(async (selectedRange) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const token = getSession()?.token;
      const result = await getServerMetrics({ token, range: selectedRange });
      setData(result);
    } catch (err) {
      const message = err?.message || 'Gagal mengambil server metrics';
      console.warn('server metrics fetch error:', message);
      toast.error(message);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
    // Auto-refresh setiap 30 detik untuk range pendek
    const intervalMs = (range === '1h' || range === '6h' || range === '24h') ? 30000 : 120000;
    const id = setInterval(() => fetchData(range), intervalMs);
    return () => clearInterval(id);
  }, [range, fetchData]);

  const chartData = useMemo(() => {
    const items = Array.isArray(data?.items) ? data.items : [];
    const labels = items.map((it) => formatTime(it.recorded_at, range));

    const datasets = [];

    if (visibleMetrics.cpu) {
      datasets.push({
        label: 'CPU %',
        data: items.map((it) => it.cpu_percent ?? 0),
        borderColor: METRIC_COLORS.cpu,
        backgroundColor: METRIC_COLORS.cpu + '20',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: false,
        yAxisID: 'y',
      });
    }

    if (visibleMetrics.ram) {
      datasets.push({
        label: 'RAM %',
        data: items.map((it) => it.ram_percent ?? 0),
        borderColor: METRIC_COLORS.ram,
        backgroundColor: METRIC_COLORS.ram + '20',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: false,
        yAxisID: 'y',
      });
    }

    if (visibleMetrics.storage) {
      datasets.push({
        label: 'Storage %',
        data: items.map((it) => it.storage_percent ?? 0),
        borderColor: METRIC_COLORS.storage,
        backgroundColor: METRIC_COLORS.storage + '20',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: false,
        yAxisID: 'y',
      });
    }

    if (visibleMetrics.online) {
      datasets.push({
        label: 'User Online',
        data: items.map((it) => it.online_users ?? 0),
        borderColor: METRIC_COLORS.online,
        backgroundColor: METRIC_COLORS.online + '20',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: false,
        yAxisID: 'y1',
      });
    }

    return { labels, datasets };
  }, [data, range, visibleMetrics]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#000000',
        titleColor: '#FFFFFF',
        bodyColor: '#A3A3A3',
        borderColor: '#D4D4D4',
        borderWidth: 1,
        cornerRadius: 0,
        padding: 10,
        titleFont: { family: "'Inter', sans-serif", weight: 'bold', size: 11 },
        callbacks: {
          label: (ctx) => {
            const label = ctx.dataset.label || '';
            const val = ctx.parsed.y;
            if (label.includes('Online')) return `${label}: ${val} users`;
            return `${label}: ${val}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: chartLineColor, width: 1 },
        ticks: { color: '#737373', font: { family: "'Inter', sans-serif", size: 10 }, maxRotation: 0, maxTicksLimit: 12 },
      },
      y: {
        type: 'linear',
        position: 'left',
        grid: { color: theme === 'dark' ? '#262626' : '#E5E5E5' },
        border: { color: '#737373', width: 1 },
        ticks: { color: '#737373', font: { family: "'Inter', sans-serif", size: 10 }, callback: (v) => `${v}%` },
        beginAtZero: true,
        max: 100,
        title: { display: true, text: 'Usage %', color: '#737373', font: { size: 10 } },
      },
      y1: {
        type: 'linear',
        position: 'right',
        grid: { display: false },
        border: { color: '#737373', width: 1 },
        ticks: { color: '#737373', font: { family: "'Inter', sans-serif", size: 10 }, precision: 0 },
        beginAtZero: true,
        title: { display: true, text: 'Online Users', color: '#737373', font: { size: 10 } },
      },
    },
  }), [theme, chartLineColor]);

  const summary = data?.summary;

  const toggleMetric = (key) => {
    setVisibleMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const SummaryCard = ({ icon: Icon, label, data: s, color, unit = '%' }) => {
    if (!s) return null;
    return (
      <div className="card p-3" style={{ borderLeft: `3px solid ${color}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="label">{label}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="label" style={{ fontSize: '0.7rem' }}>Avg</div>
            <div className="mono font-bold" style={{ fontSize: '0.9rem' }}>{s.avg}{unit}</div>
          </div>
          <div>
            <div className="label" style={{ fontSize: '0.7rem' }}>Min</div>
            <div className="mono" style={{ fontSize: '0.9rem', color: '#22c55e' }}>{s.min}{unit}</div>
          </div>
          <div>
            <div className="label" style={{ fontSize: '0.7rem' }}>Max</div>
            <div className="mono" style={{ fontSize: '0.9rem', color: '#ef4444' }}>{s.max}{unit}</div>
          </div>
        </div>
        <div className="mt-2 text-center">
          <div className="label" style={{ fontSize: '0.7rem' }}>Peak at</div>
          <div className="mono" style={{ fontSize: '0.75rem' }}>{formatPeakTime(s.peak_at)}</div>
        </div>
      </div>
    );
  };

  const MetricToggle = ({ metricKey, label, color }) => (
    <button
      onClick={() => toggleMetric(metricKey)}
      className="btn btn--sm"
      style={{
        background: visibleMetrics[metricKey] ? color : 'transparent',
        color: visibleMetrics[metricKey] ? '#fff' : '#737373',
        borderColor: color,
        borderWidth: 1,
        borderStyle: 'solid',
        opacity: visibleMetrics[metricKey] ? 1 : 0.5,
      }}
    >
      {label}
    </button>
  );

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible">
      {/* Range selector + metric toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          <span className="label">Range:</span>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className="btn btn--sm"
                style={{
                  background: range === r.key ? 'var(--accent-primary)' : 'transparent',
                  color: range === r.key ? 'var(--accent-primary-foreground)' : 'var(--muted)',
                  borderColor: range === r.key ? 'var(--accent-primary)' : 'var(--border-muted)',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  fontWeight: range === r.key ? 700 : 400,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="label">Tampilkan:</span>
          <MetricToggle metricKey="cpu" label="CPU" color={METRIC_COLORS.cpu} />
          <MetricToggle metricKey="ram" label="RAM" color={METRIC_COLORS.ram} />
          <MetricToggle metricKey="storage" label="Storage" color={METRIC_COLORS.storage} />
          <MetricToggle metricKey="online" label="Online" color={METRIC_COLORS.online} />
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <SummaryCard icon={Cpu} label="CPU" data={summary.cpu} color={METRIC_COLORS.cpu} />
          <SummaryCard icon={Server} label="RAM" data={summary.ram} color={METRIC_COLORS.ram} />
          <SummaryCard icon={HardDrive} label="Storage" data={summary.storage} color={METRIC_COLORS.storage} />
          <SummaryCard icon={Zap} label="User Online" data={summary.online_users} color={METRIC_COLORS.online} unit="" />
        </div>
      )}

      {/* Main chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="label">Server Metrics — {RANGES.find((r) => r.key === range)?.label}</span>
          </div>
          {loading && (
            <span className="label" style={{ fontSize: '0.75rem' }}>Loading...</span>
          )}
        </div>
        <div className="h-[300px] sm:h-[380px]">
          {chartData.datasets.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="label">Tidak ada data. Aktifkan minimal 1 metrik di atas.</span>
            </div>
          )}
        </div>
        {data && data.count === 0 && (
          <div className="mt-3 p-3" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border-muted)' }}>
            <span className="label" style={{ fontSize: '0.8rem' }}>
              Belum ada data snapshot untuk range ini. Data mulai terkumpul setiap 5 menit setelah server berjalan.
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
