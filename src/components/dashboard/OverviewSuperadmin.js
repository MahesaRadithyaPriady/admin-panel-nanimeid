'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Users, Clapperboard, List, Cpu, HardDrive, Server, RefreshCw, PieChart } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getOverview, getUserRegistrationStats, getTopupRequestStats, listOnlineUsers } from '@/lib/api';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function OverviewSuperadmin() {
  const [metrics, setMetrics] = useState({ users: 0, anime: 0, episodes: 0 });
  const [server, setServer] = useState({ cpu: 0, ram: 0, storage: 0 });
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
      const [{ metrics, server }, regStats, topup, online] = await Promise.all([
        getOverview({ token }),
        getUserRegistrationStats({ token }),
        getTopupRequestStats({ token }),
        listOnlineUsers({ token, page: 1, limit: 1 }),
      ]);
      setMetrics(metrics);
      setServer(server);
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
    <div className="space-y-6">
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
      <div className="grid sm:grid-cols-3 gap-4">
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
      <div className="grid lg:grid-cols-[1.2fr_1.1fr] gap-6 items-stretch">
        {/* Server stats */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-extrabold mb-3">Status Server</h3>
            <div className="grid sm:grid-cols-3 gap-4">
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

          <div className="p-4 border-4 rounded-lg flex items-center justify-between" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <div className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide">
              <span>User Online Sekarang</span>
              
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold">{onlineUsersTotal.toLocaleString()}</div>
          </div>
        </div>

        {/* Registrasi User */}
        <div>
          <h3 className="text-lg font-extrabold mb-3 flex items-center gap-2">
            <PieChart className="size-4" />
            Statistik Registrasi User
          </h3>
          <div
            className="border-4 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-stretch"
            style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
          >
            <div className="w-full max-w-[220px] mx-auto">
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

            <div className="flex-1 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
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
                <div key={row.key} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
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

      {/* Topup Requests */}
      <div>
        <h3 className="text-lg font-extrabold mb-3 flex items-center gap-2">
          <PieChart className="size-4" />
          Statistik Topup Request
        </h3>
        <div
          className="border-4 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-stretch"
          style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
        >
          <div className="w-full max-w-[220px] mx-auto">
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

          <div className="flex-1 space-y-2 text-xs">
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
              <div key={row.key} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
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
