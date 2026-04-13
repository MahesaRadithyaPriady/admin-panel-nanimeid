'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { LayoutDashboard, Upload, Settings, Users as UsersIcon, Shield, ListChecks, BadgeCheck, List, CreditCard, Image, Heart, Crown, Wallet, Gift, ShoppingBag, Megaphone, BookOpen, Award, MessageSquareText, Activity } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import Header from '@/components/dashboard/Header';
import Sidebar from '@/components/dashboard/Sidebar';
import nacl from 'tweetnacl';
import { getAdminLivechatStats, getAnimeRequestStats, listMyAdminPublicKeys, upsertMyAdminPublicKey } from '@/lib/api';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSession();

  const publicKeyInitRef = useRef(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [livechatStats, setLivechatStats] = useState({ queued: 0, active: 0, closed: 0 });
  const [animeRequestStats, setAnimeRequestStats] = useState({ pending: 0, under_review: 0, upload_in_progress: 0, completed: 0, rejected: 0 });

  useEffect(() => {
    try {
      const v = localStorage.getItem('nanimeid_admin_sidebar_collapsed');
      if (v === '1') setSidebarCollapsed(true);
    } catch {}
  }, []);

  const onToggleSidebar = () => {
    setSidebarCollapsed((s) => {
      const next = !s;
      try {
        localStorage.setItem('nanimeid_admin_sidebar_collapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.token) return;
    if (publicKeyInitRef.current) return;
    publicKeyInitRef.current = true;

    const getDeviceId = () => {
      if (user?.device_id) return String(user.device_id);
      try {
        const v = localStorage.getItem('nanimeid_livechat_device_id');
        if (v) return String(v);
      } catch {}
      return 'admin-web-1';
    };

    const b64 = (u8) => {
      try {
        let bin = '';
        for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
        return btoa(bin);
      } catch {
        return '';
      }
    };

    const loadOrCreateKeypair = (deviceId) => {
      const storageKey = `nanimeid_admin_e2e_keypair_${deviceId}`;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.public_key && parsed?.secret_key) return parsed;
        }
      } catch {}

      const kp = nacl.box.keyPair();
      const next = {
        alg: 'x25519',
        public_key: b64(kp.publicKey),
        secret_key: b64(kp.secretKey),
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    };

    const init = async () => {
      const token = user.token;
      const deviceId = getDeviceId();
      const kp = loadOrCreateKeypair(deviceId);
      if (!kp?.public_key) return;

      try {
        const listed = await listMyAdminPublicKeys({ token });
        const items = Array.isArray(listed?.items) ? listed.items : [];
        const already = items.some((it) => String(it?.device_id || it?.deviceId || '') === String(deviceId));
        if (already) return;

        await upsertMyAdminPublicKey({
          token,
          payload: { device_id: deviceId, alg: 'x25519', public_key: kp.public_key },
        });
      } catch (err) {
        toast.error(err?.message || 'Gagal init public key');
      }
    };

    init();
  }, [user]);

  useEffect(() => {
    if (!user?.token) return;

    let cancelled = false;

    const loadStats = async () => {
      try {
        const data = await getAdminLivechatStats({ token: user.token });
        if (!cancelled) {
          setLivechatStats({
            queued: Number(data?.queued ?? 0) || 0,
            active: Number(data?.active ?? 0) || 0,
            closed: Number(data?.closed ?? 0) || 0,
          });
        }
      } catch {}
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token) return;

    let cancelled = false;

    const loadRequestStats = async () => {
      try {
        const data = await getAnimeRequestStats({ token: user.token });
        if (!cancelled) {
          setAnimeRequestStats({
            pending: Number(data?.pending ?? 0) || 0,
            under_review: Number(data?.under_review ?? 0) || 0,
            upload_in_progress: Number(data?.upload_in_progress ?? 0) || 0,
            completed: Number(data?.completed ?? 0) || 0,
            rejected: Number(data?.rejected ?? 0) || 0,
          });
        }
      } catch {}
    };

    loadRequestStats();

    return () => {
      cancelled = true;
    };
  }, [user?.token]);

  const role = user?.role ?? 'guest';
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  // Define all menus with href dan mapping ke permission key.
  // Visibility akan ditentukan berdasarkan user.permissions.
  const allMenus = useMemo(
    () => [
      { key: 'overview', label: 'Ringkasan', icon: LayoutDashboard, roles: ['superadmin', 'keuangan', 'uploader'], href: '/dashboard' },
      
      // Kelola Dropdown
      { 
        key: 'kelola', 
        label: 'Kelola', 
        icon: UsersIcon, 
        roles: ['superadmin'],
        children: [
          { key: 'kelola-user', label: 'Kelola User', icon: UsersIcon, roles: ['superadmin'], href: '/dashboard/kelola-user' },
          { key: 'kelola-admin', label: 'Kelola Admin', icon: Shield, roles: ['superadmin'], href: '/dashboard/kelola-admin' },
          { key: 'topup-manual', label: 'Topup Manual', icon: CreditCard, roles: ['superadmin'], href: '/dashboard/topup' },
          { key: 'moderation', permissionKey: 'moderation', label: 'Moderasi', icon: Shield, roles: ['superadmin'], href: '/dashboard/moderation' },
          { key: 'livechat', permissionKey: 'livechat', label: 'Live Chat', icon: MessageSquareText, roles: ['superadmin'], href: '/dashboard/livechat' },
          { key: 'konfigurasi-event', permissionKey: 'event-configs', label: 'Konfigurasi Event', icon: ListChecks, roles: ['superadmin'], href: '/dashboard/konfigurasi-event' },
          { key: 'analytics-logs', label: 'Analytics Logs', icon: Activity, roles: ['superadmin'], href: '/dashboard/analytics-logs' },
        ]
      },

      // Store Dropdown
      { 
        key: 'store-group', 
        label: 'Toko', 
        icon: ShoppingBag, 
        roles: ['superadmin'],
        children: [
          { key: 'store-admin', label: 'Admin Toko', icon: ShoppingBag, roles: ['superadmin'], href: '/dashboard/store-admin' },
          { key: 'prime-store', label: 'Toko Prime', icon: ShoppingBag, roles: ['superadmin'], href: '/dashboard/prime-store' },
          { key: 'sponsor-admin', label: 'Admin Sponsor', icon: Megaphone, roles: ['superadmin'], href: '/dashboard/sponsor-admin' },
        ]
      },

      // VIP & Items Dropdown
      { 
        key: 'vip-items', 
        label: 'VIP & Item', 
        icon: Crown, 
        roles: ['superadmin'],
        children: [
          { key: 'vip-plans', label: 'Paket VIP', icon: Crown, roles: ['superadmin'], href: '/dashboard/vip-plans' },
          { key: 'vip-features', permissionKey: 'vip-tiers', label: 'Tingkat VIP & Syarat', icon: Crown, roles: ['superadmin'], href: '/dashboard/vip-features' },
          { key: 'admin-vip', label: 'Admin VIP', icon: Crown, roles: ['superadmin'], href: '/dashboard/admin-vip' },
          { key: 'admin-wallet', label: 'Admin Dompet', icon: Wallet, roles: ['superadmin'], href: '/dashboard/admin-wallet' },
          { key: 'redeem-codes', label: 'Kode Redeem', icon: Gift, roles: ['superadmin'], href: '/dashboard/redeem' },
          { key: 'avatar-borders', label: 'Bingkai Avatar', icon: Image, roles: ['superadmin'], href: '/dashboard/avatar-borders' },
          { key: 'badges', label: 'Lencana Super', icon: Award, roles: ['superadmin'], href: '/dashboard/badges' },
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
          { key: 'manga-grab-list', label: 'List Grab', icon: BadgeCheck, roles: ['superadmin'], href: '/dashboard/manga-admin/list-grab' },
          { key: 'manga-admin', label: 'Manga Admin', icon: BookOpen, roles: ['superadmin', 'uploader'], href: '/dashboard/manga-admin' },
          { key: 'uploader-legacy', label: 'Upload Episode (Legacy)', icon: Upload, roles: ['superadmin', 'uploader'], href: '/dashboard/uploader' },
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

    const hasPermission = (permissionKeyOrKey) => {
      const k = String(permissionKeyOrKey || '');
      if (k === 'event-configs') {
        return permissions.includes('signin-event-configs') || permissions.includes('watch-event-configs');
      }
      return permissions.includes(k);
    };

    // Superadmin: tampilkan semua menu tanpa cek permissions
    if (roleKey === 'superadmin') {
      return allMenus;
    }

    // Role lain: tetap filter berdasarkan permissions
    return allMenus
      .map((m) => {
        if (m.children) {
          const filteredChildren = m.children.filter((child) => hasPermission(child.permissionKey ?? child.key));
          return { ...m, children: filteredChildren };
        }
        return m;
      })
      .filter((m) => {
        if (m.children) {
          return m.children.length > 0;
        }
        return hasPermission(m.permissionKey ?? m.key);
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
    <main className="min-h-screen p-3 sm:p-6 overflow-x-hidden" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="hidden md:block">
        <Header user={user} role={role} onLogout={onLogout} />
      </div>

      <div
        className={`mx-auto grid grid-cols-1 gap-6 min-w-0 transition-[grid-template-columns] duration-300 ease-in-out ${sidebarCollapsed ? 'md:grid-cols-[76px_1fr]' : 'md:grid-cols-[240px_1fr]'}`}
      >
        <Sidebar
          menus={visibleMenus}
          currentPath={pathname}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={onToggleSidebar}
          animeRequestStats={animeRequestStats}
          livechatStats={livechatStats}
          user={user}
          role={role}
          onLogout={onLogout}
        />

        <section
          className="border-4 rounded-xl p-4 sm:p-6 min-w-0 overflow-x-hidden"
          style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
        >
          {children}
        </section>
      </div>
    </main>
  );
}
