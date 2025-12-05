'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { LayoutDashboard, Coins, Upload, Settings, Users as UsersIcon, Shield, ListChecks, BadgeCheck, List, CreditCard, Image, Heart, Crown, Wallet, Gift, ShoppingBag, Megaphone, BookOpen, Award } from 'lucide-react';
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
      { key: 'topup-manual', label: 'Topup Manual', icon: CreditCard, roles: ['superadmin'], href: '/dashboard/topup' },
      { key: 'avatar-borders', label: 'Avatar Borders', icon: Image, roles: ['superadmin'], href: '/dashboard/avatar-borders' },
      { key: 'badges', label: 'Super Badge', icon: Award, roles: ['superadmin'], href: '/dashboard/badges' },
      { key: 'stickers', label: 'Stikers', icon: Image, roles: ['superadmin'], href: '/dashboard/stikers' },
      { key: 'uploader', label: 'Upload Konten', icon: Upload, roles: ['superadmin', 'uploader'], href: '/dashboard/uploader' },
      { key: 'status-konten', label: 'Status Konten', icon: BadgeCheck, roles: ['superadmin', 'uploader'], href: '/dashboard/status-konten' },
      { key: 'daftar-konten', label: 'Daftar Konten', icon: List, roles: ['superadmin', 'uploader'], href: '/dashboard/daftar-konten' },
      { key: 'waifu-vote', label: 'Waifu Vote', icon: Heart, roles: ['superadmin'], href: '/dashboard/waifu-vote' },
      { key: 'vip-plans', label: 'VIP Plans', icon: Crown, roles: ['superadmin'], href: '/dashboard/vip-plans' },
      { key: 'admin-vip', label: 'Admin VIP', icon: Crown, roles: ['superadmin'], href: '/dashboard/admin-vip' },
      { key: 'admin-wallet', label: 'Admin Wallet', icon: Wallet, roles: ['superadmin'], href: '/dashboard/admin-wallet' },
      { key: 'redeem-codes', label: 'Kode Redeem', icon: Gift, roles: ['superadmin'], href: '/dashboard/redeem' },
      { key: 'store-admin', label: 'Store Admin', icon: ShoppingBag, roles: ['superadmin'], href: '/dashboard/store-admin' },
      { key: 'prime-store', label: 'Prime Store', icon: ShoppingBag, roles: ['superadmin'], href: '/dashboard/prime-store' },
      { key: 'sponsor-admin', label: 'Sponsor Admin', icon: Megaphone, roles: ['superadmin'], href: '/dashboard/sponsor-admin' },
      { key: 'manga-admin', label: 'Manga Admin', icon: BookOpen, roles: ['superadmin', 'uploader'], href: '/dashboard/manga-admin' },
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
      <main className="min-h-screen grid place-items-center p-6" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="text-sm">Memuat...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <Header user={user} role={role} onLogout={onLogout} />

      <div className="mx-auto grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <Sidebar menus={visibleMenus} currentPath={pathname} />

        <section
          className="border-4 rounded-xl p-4 sm:p-6"
          style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
        >
          {children}
        </section>
      </div>
    </main>
  );
}
