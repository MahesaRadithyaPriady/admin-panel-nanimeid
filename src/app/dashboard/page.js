'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Upload, CheckCircle2, Clock, XCircle, HardDrive, RefreshCw } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { formatShort } from '@/lib/numberFormat';
import OverviewSuperadmin from '@/components/dashboard/OverviewSuperadmin';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  // Uploader overview states (declared unconditionally to respect Rules of Hooks)
  const [stats, setStats] = useState({
    totalUploads: 1_240,
    pending: 28,
    approved: 1_120,
    rejected: 92,
    storageGB: 356.7,
  });
  const [latest, setLatest] = useState([
    { id: 1, title: 'Episode 12 - Nanime Quest', status: 'approved', ts: Date.now() - 3600_000 * 6 },
    { id: 2, title: 'Movie: Sakura Night', status: 'pending', ts: Date.now() - 3600_000 * 20 },
    { id: 3, title: 'OVA Pack - Season 2', status: 'rejected', ts: Date.now() - 3600_000 * 32 },
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const refresh = () => {
    setRefreshing(true);
    setStats((s) => ({
      ...s,
      totalUploads: s.totalUploads + Math.floor(Math.random() * 10),
      pending: Math.max(0, s.pending + (Math.floor(Math.random() * 5) - 2)),
      approved: s.approved + Math.floor(Math.random() * 8),
      rejected: Math.max(0, s.rejected + (Math.floor(Math.random() * 3) - 1)),
      storageGB: +(s.storageGB + Math.random() * 2).toFixed(1),
    }));

    const statuses = ['approved', 'pending', 'rejected'];
    setLatest((l) => [
      {
        id: Date.now(),
        title: `Konten baru #${Math.floor(Math.random() * 9999)}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        ts: Date.now(),
      },
      ...l,
    ].slice(0, 10));

    toast.success('Overview uploader diperbarui');
    setTimeout(() => setRefreshing(false), 300);
  };

  if (loading || !user) return null;

  const role = user?.role ?? 'guest';

  // Inline uploader overview (no new file)
  if (role === 'uploader') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold flex items-center gap-2"><Upload className="size-5" /> Upload Konten</h2>
          <button onClick={refresh} disabled={refreshing} className="px-3 py-2 border-4 border-black rounded-lg bg-[#FFD803] font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000' }}>
            {refreshing ? 'Menyegarkan...' : (<><RefreshCw className="inline size-4" /> Refresh</>)}
          </button>
        </div>

        <div className="grid sm:grid-cols-5 gap-4">
          <div className="p-4 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1"><Upload className="size-4" /> Total Upload</div>
            <div className="text-2xl font-extrabold">{formatShort(stats.totalUploads)}</div>
          </div>
          <div className="p-4 border-4 rounded-lg bg-[#FFE4A1]" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1"><Clock className="size-4" /> Pending</div>
            <div className="text-2xl font-extrabold">{formatShort(stats.pending)}</div>
          </div>
          <div className="p-4 border-4 rounded-lg bg-[#C6F6D5]" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1"><CheckCircle2 className="size-4" /> Approved</div>
            <div className="text-2xl font-extrabold">{formatShort(stats.approved)}</div>
          </div>
          <div className="p-4 border-4 rounded-lg bg-[#FED7D7]" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1"><XCircle className="size-4" /> Rejected</div>
            <div className="text-2xl font-extrabold">{formatShort(stats.rejected)}</div>
          </div>
          <div className="p-4 border-4 rounded-lg bg-[#E2E8F0]" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1"><HardDrive className="size-4" /> Storage</div>
            <div className="text-2xl font-extrabold">{stats.storageGB} GB</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-extrabold mb-3">Unggahan Terbaru</h3>
          <div className="overflow-auto">
            <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <thead style={{ background: 'var(--panel-bg)' }}>
                <tr>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Waktu</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Judul</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2 border-b-4 text-sm opacity-80" style={{ borderColor: 'var(--panel-border)' }}>{new Date(it.ts).toLocaleString('id-ID')}</td>
                    <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>{it.title}</td>
                    <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                      <span className={`px-2 py-1 border-2 border-black rounded text-xs font-extrabold ${it.status==='approved' ? 'bg-[#C6F6D5]' : it.status==='pending' ? 'bg-[#FFE4A1]' : 'bg-[#FED7D7]'}`}>
                        {it.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {latest.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-sm opacity-70">Belum ada unggahan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-xs opacity-70">Halaman overview uploader (inline). Fitur upload/CRUD terpisah.</div>
      </div>
    );
  }

  return role === 'superadmin' ? (
    <OverviewSuperadmin />
  ) : (
    <div className="text-sm font-semibold">
      Overview khusus superadmin/uploader. Anda login sebagai{' '}
      <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">{role}</span>.
    </div>
  );
}
