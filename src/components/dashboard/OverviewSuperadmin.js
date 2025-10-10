'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Users, Clapperboard, List, Cpu, HardDrive, Server, Terminal, AlertTriangle, Info, Bug, RefreshCw, Trash2 } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getOverview, getHttpLogs } from '@/lib/api';

export default function OverviewSuperadmin() {
  const [metrics, setMetrics] = useState({ users: 0, anime: 0, episodes: 0 });
  const [server, setServer] = useState({ cpu: 0, ram: 0, storage: 0 });
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('all'); // all | info | warn | error
  const fetchingRef = useRef(false);

  const fetchOverview = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const token = getSession()?.token;
      const { metrics, server } = await getOverview({ token });
      setMetrics(metrics);
      setServer(server);
    } catch (err) {
      // Hindari spam toast terlalu sering, tampilkan sesekali
      console.warn('overview fetch error:', err?.message || err);
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

  // Logs: fetch from API with optional level param
  const fetchLogs = async (level) => {
    try {
      const token = getSession()?.token;
      const items = await getHttpLogs({ token, level });
      setLogs(items);
    } catch (err) {
      console.warn('logs fetch error:', err?.message || err);
    }
  };

  const addLog = () => setLogs((l) => l); // no-op add in API mode
  const refreshLogs = () => {
    fetchLogs(logFilter);
    toast.success('Log diperbarui');
  };
  useEffect(() => {
    fetchLogs('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const clearLogs = () => {
    setLogs([]);
    toast.success('Log dibersihkan');
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

      {/* Server stats */}
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

      {/* Server Logs */}
      <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-lg font-extrabold flex items-center gap-2"><Terminal className="size-4" /> Server Logs</h3>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                {['all','info','warn','error'].map((k) => (
                  <button
                    key={k}
                    onClick={() => { setLogFilter(k); fetchLogs(k); }}
                    className={`px-2 py-1 border-4 rounded-md font-extrabold`}
                    style={{ boxShadow: '3px 3px 0 #000', background: logFilter===k ? '#FFD803' : 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
                  >
                    {k.toUpperCase()}
                  </button>
                ))}
              </div>
              <button onClick={refreshLogs} className="px-2 py-1 border-4 rounded-md font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: '#C0E8FF', borderColor: 'var(--panel-border)' }}>
                <RefreshCw className="size-4" />
              </button>
              <button onClick={addLog} className="px-2 py-1 border-4 rounded-md font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: '#C6F6D5', borderColor: 'var(--panel-border)' }}>
                +
              </button>
              <button onClick={clearLogs} className="px-2 py-1 border-4 rounded-md font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

        <div className="border-4 rounded-xl p-3 max-h-64 overflow-auto" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <ul className="space-y-2">
            {logs
              .filter((l) => logFilter === 'all' ? true : l.level === logFilter)
              .map((l) => (
                <li key={l.id} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5">
                    {l.level === 'info' && <Info className="size-4 text-[#9AE6B4]" />}
                    {l.level === 'warn' && <AlertTriangle className="size-4 text-[#F6E05E]" />}
                    {l.level === 'error' && <Bug className="size-4 text-[#FEB2B2]" />}
                  </span>
                  <span className="opacity-70">[{new Date(l.ts).toLocaleTimeString()}]</span>
                  <span className={`px-1 rounded-sm border-2 ${l.level==='info' ? 'bg-[#1F4731]' : l.level==='warn' ? 'bg-[#4A3F18]' : 'bg-[#4A1F1F]' }`} style={{ borderColor: 'var(--panel-border)' }}>
                    {l.level.toUpperCase()}
                  </span>
                  <span className="break-words">{l.msg}</span>
                </li>
              ))}
            {logs.length === 0 && (
              <li className="text-xs opacity-70">Belum ada log.</li>
            )}
          </ul>
        </div>
      </div>

     
    </div>
  );
}
