'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Users, Clapperboard, List, Cpu, HardDrive, Server, RefreshCw, PieChart } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getAdminOverviewDailyStats, getOverview, getUserRegistrationStats, getTopupRequestStats, listOnlineUsers } from '@/lib/api';
import { Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

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

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">Overview Superadmin</h2>
        <button
          onClick={refreshStats}
          className="px-3 py-2 border-4 rounded-lg font-extrabold hover:brightness-95"
          style={{ background: '#FFD803', borderColor: 'var(--panel-border)', boxShadow: '4px 4px 0 #000' }}
        >
          Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid sm:grid-cols-3 gap-4 min-w-0">
        <div className="p-4 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <div className="flex items-center gap-2 text-xs font-bold mb-1"><Users className="size-4" /> Jumlah Pengguna</div>
          <div className="text-2xl font-extrabold">{metrics.users.toLocaleString()}</div>
        </div>
        <div className="p-4 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <div className="flex items-center gap-2 text-xs font-bold mb-1"><Clapperboard className="size-4" /> Jumlah Anime</div>
          <div className="text-2xl font-extrabold">{metrics.anime.toLocaleString()}</div>
        </div>
        <div className="p-4 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <div className="flex items-center gap-2 text-xs font-bold mb-1"><List className="size-4" /> Jumlah Episode</div>
          <div className="text-2xl font-extrabold">{metrics.episodes.toLocaleString()}</div>
        </div>
      </div>

      {/* Server stats + Registrasi */}
      <div className="grid lg:grid-cols-[1.2fr_1.1fr] gap-6 items-stretch min-w-0">
        {/* Server stats */}
        <div className="h-full flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-extrabold mb-3">Status Server</h3>
            <div className="grid sm:grid-cols-3 gap-4 min-w-0">
              <div className="p-4 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <div className="flex items-center gap-2 text-xs font-bold mb-1"><Cpu className="size-4" /> CPU</div>
                <div className="text-2xl font-extrabold">{server.cpu}%</div>
              </div>
              <div className="p-4 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <div className="flex items-center gap-2 text-xs font-bold mb-1"><Server className="size-4" /> RAM</div>
                <div className="text-2xl font-extrabold">{server.ram}%</div>
              </div>
              <div className="p-4 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <div className="flex items-center gap-2 text-xs font-bold mb-1"><HardDrive className="size-4" /> Storage</div>
                <div className="text-2xl font-extrabold">{server.storage}%</div>
              </div>
            </div>
          </div>

          <div className="p-4 border-4 rounded-lg min-w-0 overflow-hidden flex-1 flex flex-col" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
              <div className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide min-w-0">
                <span>User Online Sekarang</span>
                <span className="text-[11px] font-bold opacity-70 normal-case">7 hari terakhir (placeholder)</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold">{onlineUsersTotal.toLocaleString()}</div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wide opacity-70">Peak Online 7 Hari</div>
              <div className="text-xs font-extrabold">
                {online7d.isUp ? 'Naik' : 'Turun'} ({online7d.delta >= 0 ? '+' : ''}{online7d.delta})
              </div>
            </div>
            <div className="mt-2 flex-1 min-h-[140px] min-w-0">
              <Line
                data={onlineLineData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: '#111', maxRotation: 0, autoSkip: true, font: { size: 10 } },
                    },
                    y: {
                      grid: { color: 'rgba(0,0,0,0.12)' },
                      ticks: { color: '#111', precision: 0, font: { size: 10 } },
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Registrasi User */}
        <div className="h-full flex flex-col">
          <h3 className="text-lg font-extrabold mb-3 flex items-center gap-2">
            <PieChart className="size-4" />
            Statistik Registrasi User
          </h3>
          <div
            className="border-4 rounded-xl p-4 sm:p-5 flex flex-col xl:flex-row xl:flex-wrap gap-4 xl:gap-6 items-center xl:items-start min-w-0 overflow-x-hidden"
            style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
          >
            <div
              className="w-full xl:flex-[1_1_420px] flex flex-col gap-2 min-w-0 overflow-x-hidden"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wide opacity-70">7 Hari Terakhir</div>
                <div className="text-xs font-extrabold">
                  {registration7d.isUp ? 'Naik' : 'Turun'} ({registration7d.delta >= 0 ? '+' : ''}{registration7d.delta})
                </div>
              </div>
              <div className="h-[160px] min-w-0">
                <Line
                  data={registrationLineData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { enabled: true },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { color: '#111', maxRotation: 0, autoSkip: true, font: { size: 10 } },
                      },
                      y: {
                        grid: { color: 'rgba(0,0,0,0.12)' },
                        ticks: { color: '#111', precision: 0, font: { size: 10 } },
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div
              className="w-full max-w-[220px] xl:flex-[0_0_220px] mx-auto min-w-0 overflow-x-hidden"
            >
              <Doughnut
                data={registrationChartData}
                options={{
                  plugins: {
                    legend: { display: false },
                  },
                  maintainAspectRatio: false,
                }}
              />
            </div>

            <div
              className="w-full xl:flex-[1_1_260px] space-y-2 text-xs min-w-0 overflow-x-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <span className="font-bold uppercase tracking-wide opacity-70">Total</span>
                <span className="text-lg font-extrabold">{totalRegistrations.toLocaleString()}</span>
              </div>
              <div className="h-px bg-black/20" />
              {[{
                key: 'today',
                label: 'Hari Ini',
                color: '#FFD803',
                value: registrationStats.today,
              }, {
                key: 'yesterday',
                label: 'Kemarin',
                color: '#C0E8FF',
                value: registrationStats.yesterday,
              }, {
                key: 'thisMonth',
                label: 'Bulan Ini',
                color: '#C6F6D5',
                value: registrationStats.thisMonth,
              }, {
                key: 'lastMonth',
                label: 'Bulan Lalu',
                color: '#FBB6CE',
                value: registrationStats.lastMonth,
              }, {
                key: 'thisYear',
                label: 'Tahun Ini',
                color: '#FEEBC8',
                value: registrationStats.thisYear,
              }, {
                key: 'lastYear',
                label: 'Tahun Lalu',
                color: '#E9D8FD',
                value: registrationStats.lastYear,
              }].map((row) => (
                <div key={row.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block w-3 h-3 rounded-full border-2"
                      style={{ background: row.color, borderColor: '#000000' }}
                    />
                    <span className="font-semibold">{row.label}</span>
                  </div>
                  <span className="font-extrabold sm:text-right">{row.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Topup Requests */}
      <div>
        <h3 className="text-lg font-extrabold mb-3 flex items-center gap-2">
          <PieChart className="size-4" />
          Statistik Topup Request
        </h3>
        <div
          className="border-4 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-stretch min-w-0 overflow-hidden"
          style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
        >
          <div className="w-full md:w-[52%] flex flex-col gap-2 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wide opacity-70">7 Hari Terakhir</div>
              <div className="text-xs font-extrabold">
                {topup7d.isUp ? 'Naik' : 'Turun'} ({topup7d.delta >= 0 ? '+' : ''}{topup7d.delta})
              </div>
            </div>
            <div className="h-[160px] min-w-0">
              <Line
                data={topupLineData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: '#111', maxRotation: 0, autoSkip: true, font: { size: 10 } },
                    },
                    y: {
                      grid: { color: 'rgba(0,0,0,0.12)' },
                      ticks: { color: '#111', precision: 0, font: { size: 10 } },
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="w-full max-w-[220px] mx-auto min-w-0">
            <Doughnut
              data={topupChartData}
              options={{
                plugins: {
                  legend: { display: false },
                },
                maintainAspectRatio: false,
              }}
            />
          </div>

          <div className="flex-1 space-y-2 text-xs min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-wide opacity-70">Total</span>
              <span className="text-lg font-extrabold">{totalTopup.toLocaleString()}</span>
            </div>
            <div className="h-px bg-black/20" />
            {[{
              key: 'today',
              label: 'Hari Ini',
              color: '#C6F6D5',
              value: topupStats.today,
            }, {
              key: 'yesterday',
              label: 'Kemarin',
              color: '#BEE3F8',
              value: topupStats.yesterday,
            }, {
              key: 'thisMonth',
              label: 'Bulan Ini',
              color: '#FEFCBF',
              value: topupStats.thisMonth,
            }, {
              key: 'lastMonth',
              label: 'Bulan Lalu',
              color: '#FED7E2',
              value: topupStats.lastMonth,
            }, {
              key: 'thisYear',
              label: 'Tahun Ini',
              color: '#E9D8FD',
              value: topupStats.thisYear,
            }, {
              key: 'lastYear',
              label: 'Tahun Lalu',
              color: '#FBD38D',
              value: topupStats.lastYear,
            }].map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block w-3 h-3 rounded-full border-2"
                    style={{ background: row.color, borderColor: '#000000' }}
                  />
                  <span className="font-semibold">{row.label}</span>
                </div>
                <span className="font-extrabold">{row.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
