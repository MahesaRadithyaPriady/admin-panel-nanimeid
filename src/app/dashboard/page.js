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

  if (role === 'superadmin' || role === 'uploader') {
    return <OverviewSuperadmin />;
  }

  return (
    <div className="text-sm font-semibold">
      Overview khusus superadmin/uploader. Anda login sebagai{' '}
      <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">{role}</span>.
    </div>
  );
}
