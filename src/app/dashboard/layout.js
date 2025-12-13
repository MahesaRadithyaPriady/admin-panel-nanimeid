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
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  // Define all menus with href dan mapping ke permission key.
  // Visibility akan ditentukan berdasarkan user.permissions.
  const allMenus = useMemo(
    () => [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['superadmin', 'keuangan', 'uploader'], href: '/dashboard' },
      
      // Kelola Dropdown
      { 
        key: 'kelola', 
        label: 'Kelola', 
        icon: UsersIcon, 
        roles: ['superadmin'],
        children: [
          { key: 'kelola-user', label: 'Kelola User', icon: UsersIcon, roles: ['superadmin'], href: '/dashboard/kelola-user' },
          { key: 'kelola-admin', label: 'Kelola Admin', icon: Shield, roles: ['superadmin'], href: '/dashboard/kelola-admin' },
        ]
      },

      // Keuangan Dropdown
      { 
        key: 'keuangan-group', 
        label: 'Keuangan', 
        icon: Coins, 
        roles: ['superadmin', 'keuangan'],
        children: [
          { key: 'keuangan', label: 'Keuangan', icon: Coins, roles: ['superadmin', 'keuangan'], href: '/dashboard/keuangan' },
          { key: 'topup-manual', label: 'Topup Manual', icon: CreditCard, roles: ['superadmin'], href: '/dashboard/topup' },
        ]
      },

      // Store Dropdown
      { 
        key: 'store-group', 
        label: 'Store', 
        icon: ShoppingBag, 
        roles: ['superadmin'],
        children: [
          { key: 'store-admin', label: 'Store Admin', icon: ShoppingBag, roles: ['superadmin'], href: '/dashboard/store-admin' },
          { key: 'prime-store', label: 'Prime Store', icon: ShoppingBag, roles: ['superadmin'], href: '/dashboard/prime-store' },
          { key: 'sponsor-admin', label: 'Sponsor Admin', icon: Megaphone, roles: ['superadmin'], href: '/dashboard/sponsor-admin' },
        ]
      },

      // VIP & Items Dropdown
      { 
        key: 'vip-items', 
        label: 'VIP & Items', 
        icon: Crown, 
        roles: ['superadmin'],
        children: [
          { key: 'vip-plans', label: 'VIP Plans', icon: Crown, roles: ['superadmin'], href: '/dashboard/vip-plans' },
          { key: 'admin-vip', label: 'Admin VIP', icon: Crown, roles: ['superadmin'], href: '/dashboard/admin-vip' },
          { key: 'admin-wallet', label: 'Admin Wallet', icon: Wallet, roles: ['superadmin'], href: '/dashboard/admin-wallet' },
          { key: 'redeem-codes', label: 'Kode Redeem', icon: Gift, roles: ['superadmin'], href: '/dashboard/redeem' },
          { key: 'avatar-borders', label: 'Avatar Borders', icon: Image, roles: ['superadmin'], href: '/dashboard/avatar-borders' },
          { key: 'badges', label: 'Super Badge', icon: Award, roles: ['superadmin'], href: '/dashboard/badges' },
          { key: 'stickers', label: 'Stikers', icon: Image, roles: ['superadmin'], href: '/dashboard/stikers' },
        ]
      },

      // Gacha Dropdown
      {
        key: 'gacha-group',
        label: 'Gacha',
        icon: Gift,
        roles: ['superadmin'],
        children: [
          { key: 'gacha-admin', label: 'Gacha Admin', icon: Gift, roles: ['superadmin'], href: '/dashboard/gacha-admin' },
        ],
      },

      // Konten Dropdown
      { 
        key: 'konten-group', 
        label: 'Konten', 
        icon: BookOpen, 
        roles: ['superadmin', 'uploader'],
        children: [
          { key: 'daftar-konten', label: 'Daftar Konten', icon: List, roles: ['superadmin', 'uploader'], href: '/dashboard/daftar-konten' },
          { key: 'manga-admin', label: 'Manga Admin', icon: BookOpen, roles: ['superadmin', 'uploader'], href: '/dashboard/manga-admin' },
        ]
      },

      // Lainnya Dropdown
      { 
        key: 'lainnya', 
        label: 'Lainnya', 
        icon: Heart, 
        roles: ['superadmin'],
        children: [
          { key: 'waifu-vote', label: 'Waifu Vote', icon: Heart, roles: ['superadmin'], href: '/dashboard/waifu-vote' },
        ]
      },

      { key: 'settings', label: 'Pengaturan', icon: Settings, roles: ['superadmin'], href: '/dashboard/pengaturan' },
    ],
    []
  );

  const visibleMenus = useMemo(() => {
    const roleKey = String(role || '').toLowerCase();

    // Superadmin: tampilkan semua menu tanpa cek permissions
    if (roleKey === 'superadmin') {
      return allMenus;
    }

    // Role lain: tetap filter berdasarkan permissions
    return allMenus
      .map((m) => {
        if (m.children) {
          const filteredChildren = m.children.filter((child) => permissions.includes(child.key));
          return { ...m, children: filteredChildren };
        }
        return m;
      })
      .filter((m) => {
        if (m.children) {
          return m.children.length > 0;
        }
        return permissions.includes(m.key);
      });
  }, [allMenus, permissions, role]);

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
