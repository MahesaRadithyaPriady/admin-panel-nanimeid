'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Users, Clapperboard, List, Cpu, HardDrive, Server, RefreshCw, TrendingUp, TrendingDown, Activity, Zap, CreditCard, Crown } from 'lucide-react';
import { lineChartOptions, doughnutOptions, BW_PALETTE, DISTINCT_PALETTE } from '@/lib/chartDefaults';
import { getSession } from '@/lib/auth';
import { getAdminOverviewDailyStats, getOverview, getUserRegistrationStats, getTopupRequestStats, listOnlineUsers } from '@/lib/api';
import { Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

export default function OverviewSuperadmin() {
  const [metrics, setMetrics] = useState({ users: 0, anime: 0, episodes: 0 });
  const [server, setServer] = useState({ cpu: 0, ram: 0, storage: 0 });
  const [dailyStats, setDailyStats] = useState([]);
  const [registrationStats, setRegistrationStats] = useState({
    today: 0,
    yesterday: 0,
    thisMonth: 0,
    lastMonth: 0,
    thisYear: 0,
    lastYear: 0,
  });
  const [onlineUsersTotal, setOnlineUsersTotal] = useState(0);
  const [topupStats, setTopupStats] = useState({
    today: 0,
    yesterday: 0,
    thisMonth: 0,
    lastMonth: 0,
    thisYear: 0,
    lastYear: 0,
  });
  const fetchingRef = useRef(false);
  const lastErrorToastRef = useRef(0);

  const [theme, setTheme] = useState('light');
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const getTheme = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    setTheme(getTheme());
    const onThemeChange = (e) => setTheme(e.detail);
    window.addEventListener('themechange', onThemeChange);
    return () => window.removeEventListener('themechange', onThemeChange);
  }, []);

  const chartLineColor = theme === 'dark' ? '#ffffff' : '#000000';
  const chartPointColor = theme === 'dark' ? '#a3a3a3' : '#e5e5e5';
  const chartDonutBorderColor = theme === 'dark' ? '#d4d4d4' : '#000000';

  const fetchOverview = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const token = getSession()?.token;
      const [{ metrics, server }, daily, regStats, topup, online] = await Promise.all([
        getOverview({ token }),
        getAdminOverviewDailyStats({ token, days: 7 }),
        getUserRegistrationStats({ token }),
        getTopupRequestStats({ token }),
        listOnlineUsers({ token, page: 1, limit: 1 }),
      ]);
      setMetrics(metrics);
      setServer(server);
      setDailyStats(Array.isArray(daily?.items) ? daily.items : []);
      setRegistrationStats(regStats);
      setTopupStats(topup);
      setOnlineUsersTotal(online.total ?? 0);
    } catch (err) {
      const message = err?.message || 'Gagal mengambil data overview';
      console.warn('overview fetch error:', message);
      const now = Date.now();
      if (!lastErrorToastRef.current || now - lastErrorToastRef.current > 10000) {
        lastErrorToastRef.current = now;
        toast.error(message);
      }
    } finally {
      fetchingRef.current = false;
    }
  };

  const dailySeries = useMemo(() => {
    const items = Array.isArray(dailyStats) ? dailyStats.slice() : [];
    items.sort((a, b) => new Date(a?.stat_date || 0).getTime() - new Date(b?.stat_date || 0).getTime());

    const labels = items.map((it) => {
      const d = new Date(it?.stat_date);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
    });

    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const registrations = items.map((it) => toNum(it?.registrations));
    const topupCount = items.map((it) => toNum(it?.topup_count));
    const activeUsers = items.map((it) => toNum(it?.active_users));

    const ensure7 = (arr) => {
      const a = Array.isArray(arr) ? arr.slice(-7) : [];
      if (a.length >= 7) return a;
      const pad = Array.from({ length: 7 - a.length }, () => 0);
      return [...pad, ...a];
    };

    const ensureLabels7 = (arr) => {
      const a = Array.isArray(arr) ? arr.slice(-7) : [];
      if (a.length >= 7) return a;
      const pad = Array.from({ length: 7 - a.length }, () => '');
      return [...pad, ...a];
    };

    return {
      labels: ensureLabels7(labels),
      registrations: ensure7(registrations),
      topupCount: ensure7(topupCount),
      activeUsers: ensure7(activeUsers),
    };
  }, [dailyStats]);

  // Poll every 3s
  useEffect(() => {
    fetchOverview(); // initial
    const id = setInterval(fetchOverview, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshStats = () => {
    fetchOverview();
    toast.success('Data diperbarui');
  };

  const totalRegistrations =
    registrationStats.today +
    registrationStats.yesterday +
    registrationStats.thisMonth +
    registrationStats.lastMonth +
    registrationStats.thisYear +
    registrationStats.lastYear;

  const registrationChartData = {
    labels: ['Hari Ini', 'Kemarin', 'Bulan Ini', 'Bulan Lalu', 'Tahun Ini', 'Tahun Lalu'],
    datasets: [
      {
        label: 'Registrasi User',
        data: [
          registrationStats.today,
          registrationStats.yesterday,
          registrationStats.thisMonth,
          registrationStats.lastMonth,
          registrationStats.thisYear,
          registrationStats.lastYear,
        ],
        backgroundColor: DISTINCT_PALETTE,
        borderColor: chartDonutBorderColor,
        borderWidth: 2,
      },
    ],
  };

  const topup7d = useMemo(() => {
    const fromApi = Array.isArray(dailySeries?.topupCount) ? dailySeries.topupCount : [];
    const fromApiLabels = Array.isArray(dailySeries?.labels) ? dailySeries.labels : [];
    if (fromApi.length === 7) {
      const delta = fromApi[6] - fromApi[0];
      return { labels: fromApiLabels, values: fromApi, delta, isUp: delta >= 0 };
    }

    const labels = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      labels.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }));
    }

    const todayVal = Number(topupStats.today) || 0;
    const yVal = Number(topupStats.yesterday) || 0;
    const first = Math.max(0, yVal - 5);
    const step = (yVal - first) / 5;
    const values = [
      Math.round(first),
      Math.round(first + step * 1),
      Math.round(first + step * 2),
      Math.round(first + step * 3),
      Math.round(first + step * 4),
      Math.round(yVal),
      Math.round(todayVal),
    ];

    const delta = values[6] - values[0];
    return { labels, values, delta, isUp: delta >= 0 };
  }, [dailySeries, topupStats.today, topupStats.yesterday]);

  const topupLineData = useMemo(() => {
    return {
      labels: topup7d.labels,
      datasets: [
        {
          label: '7 Hari Terakhir',
          data: topup7d.values,
          borderColor: chartLineColor,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: false,
          backgroundColor: chartPointColor,
        },
      ],
    };
  }, [topup7d, chartLineColor, chartPointColor]);

  const registration7d = useMemo(() => {
    const fromApi = Array.isArray(dailySeries?.registrations) ? dailySeries.registrations : [];
    const fromApiLabels = Array.isArray(dailySeries?.labels) ? dailySeries.labels : [];
    if (fromApi.length === 7) {
      const delta = fromApi[6] - fromApi[0];
      return { labels: fromApiLabels, values: fromApi, delta, isUp: delta >= 0 };
    }

    const labels = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      labels.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }));
    }

    const todayVal = Number(registrationStats.today) || 0;
    const yVal = Number(registrationStats.yesterday) || 0;
    const first = Math.max(0, yVal - 5);
    const step = (yVal - first) / 5;
    const values = [
      Math.round(first),
      Math.round(first + step * 1),
      Math.round(first + step * 2),
      Math.round(first + step * 3),
      Math.round(first + step * 4),
      Math.round(yVal),
      Math.round(todayVal),
    ];

    const delta = values[6] - values[0];
    return { labels, values, delta, isUp: delta >= 0 };
  }, [dailySeries, registrationStats.today, registrationStats.yesterday]);

  const registrationLineData = useMemo(() => {
    return {
      labels: registration7d.labels,
      datasets: [
        {
          label: '7 Hari Terakhir',
          data: registration7d.values,
          borderColor: chartLineColor,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: false,
          backgroundColor: chartPointColor,
        },
      ],
    };
  }, [registration7d, chartLineColor, chartPointColor]);

  const online7d = useMemo(() => {
    const fromApi = Array.isArray(dailySeries?.activeUsers) ? dailySeries.activeUsers : [];
    const fromApiLabels = Array.isArray(dailySeries?.labels) ? dailySeries.labels : [];
    if (fromApi.length === 7) {
      const delta = fromApi[6] - fromApi[0];
      return { labels: fromApiLabels, values: fromApi, delta, isUp: delta >= 0 };
    }

    const labels = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      labels.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }));
    }

    const todayVal = Number(onlineUsersTotal) || 0;
    const base = Math.max(0, todayVal - 30);
    const step = (todayVal - base) / 6;
    const values = Array.from({ length: 7 }, (_, idx) => Math.round(base + step * idx));
    const delta = values[6] - values[0];
    return { labels, values, delta, isUp: delta >= 0 };
  }, [dailySeries, onlineUsersTotal]);

  const onlineLineData = useMemo(() => {
    return {
      labels: online7d.labels,
      datasets: [
        {
          label: 'Online Peak (7 hari)',
          data: online7d.values,
          borderColor: chartLineColor,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: false,
          backgroundColor: chartPointColor,
        },
      ],
    };
  }, [online7d, chartLineColor, chartPointColor]);

  const totalTopup =
    topupStats.today +
    topupStats.yesterday +
    topupStats.thisMonth +
    topupStats.lastMonth +
    topupStats.thisYear +
    topupStats.lastYear;

  const topupChartData = {
    labels: ['Hari Ini', 'Kemarin', 'Bulan Ini', 'Bulan Lalu', 'Tahun Ini', 'Tahun Lalu'],
    datasets: [
      {
        label: 'Topup Request',
        data: [
          topupStats.today,
          topupStats.yesterday,
          topupStats.thisMonth,
          topupStats.lastMonth,
          topupStats.thisYear,
          topupStats.lastYear,
        ],
        backgroundColor: DISTINCT_PALETTE,
        borderColor: chartDonutBorderColor,
        borderWidth: 2,
      },
    ],
  };


  const serverStatus = (val, threshHigh, threshMed) => {
    if (val > threshHigh) return 'KRITIS';
    if (val > threshMed)  return 'SEDANG';
    return 'NORMAL';
  };

  const deltaLabel = (delta) => (delta >= 0 ? `+${delta}` : `${delta}`);

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 min-w-0 overflow-x-hidden"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="label mt-1">Ringkasan data dan statistik platform</p>
        </div>
        <button
          onClick={refreshStats}
          className="btn btn--secondary btn--sm flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${fetchingRef.current ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main Metric Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <span className="stat-card__label">Total Pengguna</span>
          </div>
          <div className="stat-card__value">{metrics.users.toLocaleString()}</div>
          <div className="stat-card__delta flex items-center gap-1" style={{ color: 'var(--muted)' }}>
            <TrendingUp className="w-3 h-3" /> Aktif &amp; terdaftar
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Clapperboard className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <span className="stat-card__label">Total Anime</span>
          </div>
          <div className="stat-card__value">{metrics.anime.toLocaleString()}</div>
          <div className="stat-card__delta flex items-center gap-1" style={{ color: 'var(--muted)' }}>
            <TrendingUp className="w-3 h-3" /> Series tersedia
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <List className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <span className="stat-card__label">Total Episode</span>
          </div>
          <div className="stat-card__value">{metrics.episodes.toLocaleString()}</div>
          <div className="stat-card__delta flex items-center gap-1" style={{ color: 'var(--muted)' }}>
            <TrendingUp className="w-3 h-3" /> Siap ditonton
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <span className="stat-card__label">User Online</span>
          </div>
          <div className="stat-card__value">{onlineUsersTotal.toLocaleString()}</div>
          <div className="stat-card__delta flex items-center gap-1" style={{ color: 'var(--muted)' }}>
            {online7d.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {deltaLabel(online7d.delta)} vs 7 hari
          </div>
        </div>
      </div>

      {/* Server Status */}
      <section>
        <h2 className="section-title flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Status Server
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'CPU Usage', value: server.cpu,     icon: Cpu,       hi: 80, med: 60 },
            { label: 'RAM Usage', value: server.ram,     icon: Server,    hi: 80, med: 60 },
            { label: 'Storage',   value: server.storage, icon: HardDrive, hi: 85, med: 70 },
          ].map(({ label, value, icon: Icon, hi, med }) => (
            <div key={label} className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="label">{label}</span>
                </div>
                <span
                  className="badge"
                  style={{
                    background: value > hi ? '#ef4444' : value > med ? '#f59e0b' : '#22c55e',
                    color:      value > hi ? '#ffffff' : '#000000',
                    borderColor: 'transparent',
                  }}
                >
                  {serverStatus(value, hi, med)}
                </span>
              </div>
              <div className="stat-card__value" style={{ fontSize: '1.875rem' }}>{value}%</div>
              <div className="progress-bar mt-3">
                <div
                  className={`progress-bar__fill ${value > hi ? 'progress-bar__fill--crit' : value > med ? 'progress-bar__fill--warn' : 'progress-bar__fill--ok'}`}
                  style={{ width: `${value}%`, transition: 'width 0.4s ease' }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Online Users Chart */}
      <section>
        <h2 className="section-title flex items-center gap-2">
          <Zap className="w-4 h-4" />
          User Online — 7 Hari Terakhir
        </h2>
        <div className="card">
          <div className="h-[200px] sm:h-[220px]">
            <Line data={onlineLineData} options={lineChartOptions} />
          </div>
        </div>
      </section>

      {/* Registration Stats */}
      <section>
        <h2 className="section-title flex items-center gap-2">
          <Crown className="w-4 h-4" />
          Statistik Registrasi User
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <span className="label">Trend 7 Hari Terakhir</span>
              <span className="mono text-sm font-bold">
                {deltaLabel(registration7d.delta)}
              </span>
            </div>
            <div className="h-[200px] sm:h-[240px]">
              <Line data={registrationLineData} options={lineChartOptions} />
            </div>
          </div>

          <div className="card space-y-4">
            <div className="h-[160px] max-w-[200px] mx-auto">
              <Doughnut data={registrationChartData} options={doughnutOptions} />
            </div>
            <div className="text-center">
              <div className="label">Total Registrasi</div>
              <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>{totalRegistrations.toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Hari Ini',   value: registrationStats.today },
                { label: 'Kemarin',    value: registrationStats.yesterday },
                { label: 'Bulan Ini',  value: registrationStats.thisMonth },
                { label: 'Bulan Lalu', value: registrationStats.lastMonth },
              ].map(({ label, value }) => (
                <div key={label} className="p-2" style={{ border: '1px solid var(--border-muted)' }}>
                  <div className="label">{label}</div>
                  <div className="mono font-bold" style={{ fontSize: '0.875rem' }}>{value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Topup Stats */}
      <section>
        <h2 className="section-title flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Statistik Topup Request
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <span className="label">Trend 7 Hari Terakhir</span>
              <span className="mono text-sm font-bold">{deltaLabel(topup7d.delta)}</span>
            </div>
            <div className="h-[200px] sm:h-[240px]">
              <Line data={topupLineData} options={lineChartOptions} />
            </div>
          </div>

          <div className="card space-y-4">
            <div className="h-[160px] max-w-[200px] mx-auto">
              <Doughnut data={topupChartData} options={doughnutOptions} />
            </div>
            <div className="text-center">
              <div className="label">Total Topup</div>
              <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>{totalTopup.toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Hari Ini',   value: topupStats.today },
                { label: 'Kemarin',    value: topupStats.yesterday },
                { label: 'Bulan Ini',  value: topupStats.thisMonth },
                { label: 'Bulan Lalu', value: topupStats.lastMonth },
              ].map(({ label, value }) => (
                <div key={label} className="p-2" style={{ border: '1px solid var(--border-muted)' }}>
                  <div className="label">{label}</div>
                  <div className="mono font-bold" style={{ fontSize: '0.875rem' }}>{value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
