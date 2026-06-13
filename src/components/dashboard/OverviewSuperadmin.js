'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Users, Clapperboard, List, Cpu, HardDrive, Server, RefreshCw, PieChart, TrendingUp, TrendingDown, Activity, Zap, CreditCard, Crown } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getAdminOverviewDailyStats, getOverview, getUserRegistrationStats, getTopupRequestStats, listOnlineUsers } from '@/lib/api';
import { Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
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
        backgroundColor: ['#FFD803', '#C0E8FF', '#C6F6D5', '#FBB6CE', '#FEEBC8', '#E9D8FD'],
        borderColor: '#000000',
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
          borderColor: '#000000',
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: false,
          backgroundColor: topup7d.isUp ? '#C6F6D5' : '#FED7E2',
        },
      ],
    };
  }, [topup7d]);

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
          borderColor: '#000000',
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: false,
          backgroundColor: registration7d.isUp ? '#C6F6D5' : '#FED7E2',
        },
      ],
    };
  }, [registration7d]);

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
          borderColor: '#000000',
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: false,
          backgroundColor: online7d.isUp ? '#C6F6D5' : '#FED7E2',
        },
      ],
    };
  }, [online7d]);

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
        backgroundColor: ['#C6F6D5', '#BEE3F8', '#FEFCBF', '#FED7E2', '#E9D8FD', '#FBD38D'],
        borderColor: '#000000',
        borderWidth: 2,
      },
    ],
  };

  // Chart options modern
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: 'var(--foreground)',
          maxRotation: 0,
          autoSkip: true,
          font: { size: 10, family: 'system-ui' },
        },
      },
      y: {
        grid: { color: 'var(--panel-border)', drawBorder: false },
        ticks: {
          color: 'var(--foreground)',
          precision: 0,
          font: { size: 10, family: 'system-ui' },
        },
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    maintainAspectRatio: false,
    cutout: '65%',
  };

  // Modern color palette
  const chartColors = {
    primary: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'],
    background: ['rgba(99, 102, 241, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(244, 63, 94, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(16, 185, 129, 0.8)'],
  };

  // Update chart data with modern colors
  const modernRegistrationChartData = {
    ...registrationChartData,
    datasets: [{
      ...registrationChartData.datasets[0],
      backgroundColor: chartColors.background,
      borderColor: chartColors.primary,
      borderWidth: 0,
    }],
  };

  const modernTopupChartData = {
    ...topupChartData,
    datasets: [{
      ...topupChartData.datasets[0],
      backgroundColor: chartColors.background,
      borderColor: chartColors.primary,
      borderWidth: 0,
    }],
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 min-w-0 overflow-x-hidden"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
            Overview
          </h1>
          <p className="text-sm text-[var(--foreground)]/60 mt-1">
            Ringkasan data dan statistik platform
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={refreshStats}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-medium shadow-lg shadow-[var(--accent-primary)]/25 hover:shadow-[var(--accent-primary)]/40 transition-all duration-200"
        >
          <RefreshCw className={`w-4 h-4 ${fetchingRef.current ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </motion.button>
      </motion.div>

      {/* Main Metrics Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Users Card */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)]/70">Total Pengguna</span>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
              {metrics.users.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
              <TrendingUp className="w-3 h-3" />
              <span>Aktif & terdaftar</span>
            </div>
          </div>
        </div>

        {/* Anime Card */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                <Clapperboard className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)]/70">Total Anime</span>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
              {metrics.anime.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
              <TrendingUp className="w-3 h-3" />
              <span>Series tersedia</span>
            </div>
          </div>
        </div>

        {/* Episodes Card */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <List className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)]/70">Total Episode</span>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
              {metrics.episodes.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
              <TrendingUp className="w-3 h-3" />
              <span>Siap ditonton</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Server Status + Online Users */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--accent-primary)]" />
          Status Server & Online
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Server Stats */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* CPU */}
            <div className="glass-card rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-[var(--foreground)]/70">CPU Usage</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">{server.cpu}%</span>
                <div className={`text-xs ${server.cpu > 80 ? 'text-rose-500' : server.cpu > 60 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {server.cpu > 80 ? 'High' : server.cpu > 60 ? 'Moderate' : 'Normal'}
                </div>
              </div>
              <div className="mt-3 h-2 bg-[var(--panel-border)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${server.cpu}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${server.cpu > 80 ? 'bg-rose-500' : server.cpu > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
              </div>
            </div>

            {/* RAM */}
            <div className="glass-card rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Server className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-[var(--foreground)]/70">RAM Usage</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">{server.ram}%</span>
                <div className={`text-xs ${server.ram > 80 ? 'text-rose-500' : server.ram > 60 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {server.ram > 80 ? 'High' : server.ram > 60 ? 'Moderate' : 'Normal'}
                </div>
              </div>
              <div className="mt-3 h-2 bg-[var(--panel-border)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${server.ram}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${server.ram > 80 ? 'bg-rose-500' : server.ram > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
              </div>
            </div>

            {/* Storage */}
            <div className="glass-card rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <HardDrive className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-[var(--foreground)]/70">Storage</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">{server.storage}%</span>
                <div className={`text-xs ${server.storage > 85 ? 'text-rose-500' : server.storage > 70 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {server.storage > 85 ? 'Critical' : server.storage > 70 ? 'Warning' : 'Good'}
                </div>
              </div>
              <div className="mt-3 h-2 bg-[var(--panel-border)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${server.storage}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${server.storage > 85 ? 'bg-rose-500' : server.storage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
              </div>
            </div>
          </div>

          {/* Online Users Chart */}
          <div className="glass-card rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--accent-primary)]" />
                <span className="text-sm font-medium text-[var(--foreground)]">User Online</span>
              </div>
              <div className="text-2xl font-bold text-[var(--foreground)]">{onlineUsersTotal.toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs flex items-center gap-1 ${online7d.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                {online7d.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {online7d.delta >= 0 ? '+' : ''}{online7d.delta} vs 7 hari lalu
              </span>
            </div>
            <div className="h-[140px]">
              <Line data={onlineLineData} options={lineChartOptions} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Registration Stats */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-[var(--accent-primary)]" />
          Statistik Registrasi User
        </h3>
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Line Chart */}
            <div className="xl:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[var(--foreground)]/70">Trend 7 Hari Terakhir</span>
                <span className={`text-xs flex items-center gap-1 ${registration7d.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {registration7d.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {registration7d.delta >= 0 ? '+' : ''}{registration7d.delta}
                </span>
              </div>
              <div className="h-[200px] sm:h-[240px]">
                <Line data={registrationLineData} options={lineChartOptions} />
              </div>
            </div>

            {/* Doughnut + Stats */}
            <div className="space-y-4">
              <div className="h-[160px] max-w-[200px] mx-auto">
                <Doughnut data={modernRegistrationChartData} options={doughnutOptions} />
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--foreground)]/50 mb-1">Total Registrasi</div>
                <div className="text-2xl font-bold text-[var(--foreground)]">{totalRegistrations.toLocaleString()}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Hari Ini', value: registrationStats.today, color: chartColors.primary[0] },
                  { label: 'Kemarin', value: registrationStats.yesterday, color: chartColors.primary[1] },
                  { label: 'Bulan Ini', value: registrationStats.thisMonth, color: chartColors.primary[2] },
                  { label: 'Bulan Lalu', value: registrationStats.lastMonth, color: chartColors.primary[3] },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--panel-bg)]/50">
                    <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--foreground)]/50 text-[10px]">{item.label}</div>
                      <div className="font-semibold text-[var(--foreground)]">{item.value.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Topup Stats */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[var(--accent-primary)]" />
          Statistik Topup Request
        </h3>
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Line Chart */}
            <div className="xl:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[var(--foreground)]/70">Trend 7 Hari Terakhir</span>
                <span className={`text-xs flex items-center gap-1 ${topup7d.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {topup7d.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {topup7d.delta >= 0 ? '+' : ''}{topup7d.delta}
                </span>
              </div>
              <div className="h-[200px] sm:h-[240px]">
                <Line data={topupLineData} options={lineChartOptions} />
              </div>
            </div>

            {/* Doughnut + Stats */}
            <div className="space-y-4">
              <div className="h-[160px] max-w-[200px] mx-auto">
                <Doughnut data={modernTopupChartData} options={doughnutOptions} />
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--foreground)]/50 mb-1">Total Topup</div>
                <div className="text-2xl font-bold text-[var(--foreground)]">{totalTopup.toLocaleString()}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Hari Ini', value: topupStats.today, color: chartColors.primary[0] },
                  { label: 'Kemarin', value: topupStats.yesterday, color: chartColors.primary[1] },
                  { label: 'Bulan Ini', value: topupStats.thisMonth, color: chartColors.primary[2] },
                  { label: 'Bulan Lalu', value: topupStats.lastMonth, color: chartColors.primary[3] },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--panel-bg)]/50">
                    <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--foreground)]/50 text-[10px]">{item.label}</div>
                      <div className="font-semibold text-[var(--foreground)]">{item.value.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
