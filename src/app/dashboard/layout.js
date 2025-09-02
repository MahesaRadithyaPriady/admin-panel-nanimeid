'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { LayoutDashboard, Coins, Upload, Settings, Users as UsersIcon, Shield, ListChecks, BadgeCheck, List } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import Header from '@/components/dashboard/Header';
import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const role = user?.role ?? 'guest';

  // Define all menus with href and visibility per role
  const allMenus = useMemo(
    () => [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['superadmin', 'keuangan', 'uploader'], href: '/dashboard' },
      { key: 'kelola-user', label: 'Kelola User', icon: UsersIcon, roles: ['superadmin'], href: '/dashboard/kelola-user' },
      { key: 'kelola-admin', label: 'Kelola Admin', icon: Shield, roles: ['superadmin'], href: '/dashboard/kelola-admin' },
      { key: 'keuangan', label: 'Keuangan', icon: Coins, roles: ['superadmin', 'keuangan'], href: '/dashboard/keuangan' },
      { key: 'uploader', label: 'Upload Konten', icon: Upload, roles: ['superadmin', 'uploader'], href: '/dashboard/uploader' },
      { key: 'status-konten', label: 'Status Konten', icon: BadgeCheck, roles: ['superadmin', 'uploader'], href: '/dashboard/status-konten' },
      { key: 'daftar-konten', label: 'Daftar Konten', icon: List, roles: ['superadmin', 'uploader'], href: '/dashboard/daftar-konten' },
      { key: 'validasi-konten', label: 'Validasi Konten', icon: ListChecks, roles: ['superadmin'], href: '/dashboard/validasi-konten' },
      { key: 'settings', label: 'Pengaturan', icon: Settings, roles: ['superadmin'], href: '/dashboard/pengaturan' },
    ],
    []
  );

  const visibleMenus = useMemo(
    () => allMenus.filter((m) => m.roles.includes(role)),
    [allMenus, role]
  );

  const onLogout = () => {
    try {
      localStorage.removeItem('nanimeid_admin_session');
    } catch {}
    toast.success('Berhasil keluar');
    setTimeout(() => router.replace('/'), 500);
  };

  if (loading || !user) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#F7F7F0] p-6">
        <div className="text-sm">Memuat...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F0] p-6">
      <Header user={user} role={role} onLogout={onLogout} />

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <Sidebar menus={visibleMenus} currentPath={pathname} />

        <section
          className="bg-white border-4 border-black rounded-xl p-4 sm:p-6"
          style={{ boxShadow: '8px 8px 0 #000' }}
        >
          {children}
        </section>
      </div>
    </main>
  );
}
