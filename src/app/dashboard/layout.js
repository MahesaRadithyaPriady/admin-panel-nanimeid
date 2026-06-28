'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LayoutDashboard, Upload, Settings, Users as UsersIcon, Shield, ListChecks, BadgeCheck, List, CreditCard, Image, Heart, Crown, Wallet, Gift, ShoppingBag, Megaphone, BookOpen, Award, MessageSquareText, Activity, Terminal, Trophy, Menu, Sparkles, Inbox, AlertTriangle, Film } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import Sidebar from '@/components/dashboard/Sidebar';
import nacl from 'tweetnacl';
import { getAdminLivechatStats, getAnimeRequestStats, listMyAdminPublicKeys, upsertMyAdminPublicKey } from '@/lib/api';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSession();

  const publicKeyInitRef = useRef(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [livechatStats, setLivechatStats] = useState({ queued: 0, active: 0, closed: 0 });
  const [animeRequestStats, setAnimeRequestStats] = useState({ pending: 0, under_review: 0, upload_in_progress: 0, completed: 0, rejected: 0 });

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

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
      { key: 'overview', label: 'Dashboard', icon: LayoutDashboard, roles: ['superadmin', 'keuangan', 'uploader'], href: '/dashboard' },
      { key: 'leaderboard', permissionKey: 'overview', label: 'Peringkat', icon: Trophy, roles: ['superadmin'], href: '/dashboard/leaderboard' },
      
      // Manajemen Dropdown
      { 
        key: 'kelola', 
        label: 'Manajemen', 
        icon: UsersIcon, 
        roles: ['superadmin'],
        children: [
          { key: 'kelola-user', label: 'Pengguna', icon: UsersIcon, roles: ['superadmin'], href: '/dashboard/kelola-user' },
          { key: 'kelola-admin', label: 'Administrator', icon: Shield, roles: ['superadmin'], href: '/dashboard/kelola-admin' },
          { key: 'topup-manual', label: 'Top Up', icon: CreditCard, roles: ['superadmin'], href: '/dashboard/topup' },
          { key: 'moderation', permissionKey: 'moderation', label: 'Moderasi', icon: Shield, roles: ['superadmin'], href: '/dashboard/moderation' },
          { key: 'livechat', permissionKey: 'livechat', label: 'Live Chat', icon: MessageSquareText, roles: ['superadmin'], href: '/dashboard/livechat' },
          { key: 'konfigurasi-event', permissionKey: 'event-configs', label: 'Event & Reward', icon: ListChecks, roles: ['superadmin'], href: '/dashboard/konfigurasi-event' },
          { key: 'analytics-logs', label: 'Log Analitik', icon: Activity, roles: ['superadmin'], href: '/dashboard/analytics-logs' },
          { key: 'client-logs', permissionKey: 'client-logs', label: 'Log Klien', icon: Terminal, roles: ['superadmin'], href: '/dashboard/client-logs' },
        ]
      },

      // Toko Dropdown
      { 
        key: 'store-group', 
        label: 'Toko', 
        icon: ShoppingBag, 
        roles: ['superadmin'],
        children: [
          { key: 'store-admin', label: 'Pengaturan Toko', icon: ShoppingBag, roles: ['superadmin'], href: '/dashboard/store-admin' },
          { key: 'prime-store', label: 'Toko Prime', icon: ShoppingBag, roles: ['superadmin'], href: '/dashboard/prime-store' },
          { key: 'sponsor-admin', label: 'Pengaturan Sponsor', icon: Megaphone, roles: ['superadmin'], href: '/dashboard/sponsor-admin' },
        ]
      },

      // VIP & Item Dropdown
      { 
        key: 'vip-items', 
        label: 'VIP & Item', 
        icon: Crown, 
        roles: ['superadmin'],
        children: [
          { key: 'vip-plans', label: 'Paket Langganan', icon: Crown, roles: ['superadmin'], href: '/dashboard/vip-plans' },
          { key: 'vip-features', permissionKey: 'vip-tiers', label: 'Level & Syarat VIP', icon: Crown, roles: ['superadmin'], href: '/dashboard/vip-features' },
          { key: 'admin-vip', label: 'Pengaturan VIP', icon: Crown, roles: ['superadmin'], href: '/dashboard/admin-vip' },
          { key: 'admin-wallet', label: 'Manajemen Dompet', icon: Wallet, roles: ['superadmin'], href: '/dashboard/admin-wallet' },
          { key: 'redeem-codes', label: 'Kode Tukar', icon: Gift, roles: ['superadmin'], href: '/dashboard/redeem' },
          { key: 'avatar-borders', label: 'Bingkai Profil', icon: Image, roles: ['superadmin'], href: '/dashboard/avatar-borders' },
          { key: 'badges', label: 'Lencana', icon: Award, roles: ['superadmin'], href: '/dashboard/badges' },
          { key: 'stickers', label: 'Stiker', icon: Image, roles: ['superadmin'], href: '/dashboard/stikers' },
        ]
      },

      // Gacha Dropdown
      {
        key: 'gacha-group',
        label: 'Gacha',
        icon: Gift,
        roles: ['superadmin'],
        children: [
          { key: 'gacha-admin', label: 'Pengaturan Gacha', icon: Gift, roles: ['superadmin'], href: '/dashboard/gacha-admin' },
          { key: 'mystery-box', label: 'Mystery Box', icon: Gift, roles: ['superadmin'], href: '/dashboard/mystery-box' },
        ],
      },

      // Konten Dropdown
      {
        key: 'konten-group',
        label: 'Konten',
        icon: BookOpen,
        roles: ['superadmin', 'uploader'],
        children: [
          { key: 'daftar-konten', label: 'Manajemen Konten', icon: Film, roles: ['superadmin', 'uploader'], href: '/dashboard/daftar-konten' },
          { key: 'anime-requests', label: 'Permintaan Anime', icon: Inbox, roles: ['superadmin', 'uploader'], href: '/dashboard/anime-requests' },
          { key: 'episode-issue', label: 'Issue Episode', icon: AlertTriangle, roles: ['superadmin', 'uploader'], href: '/dashboard/episode-issue' },
          { key: 'manga-grab-list', label: 'Daftar Grab', icon: BadgeCheck, roles: ['superadmin'], href: '/dashboard/manga-admin/list-grab' },
          { key: 'manga-admin', label: 'Manajemen Manga', icon: BookOpen, roles: ['superadmin', 'uploader'], href: '/dashboard/manga-admin' },
          { key: 'uploader-legacy', label: 'Unggah Episode', icon: Upload, roles: ['superadmin', 'uploader'], href: '/dashboard/uploader' },
        ]
      },

      // Lainnya Dropdown
      { 
        key: 'lainnya', 
        label: 'Lainnya', 
        icon: Heart, 
        roles: ['superadmin'],
        children: [
          { key: 'waifu-vote', label: 'Voting Waifu', icon: Heart, roles: ['superadmin'], href: '/dashboard/waifu-vote' },
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
      <main className="min-h-screen grid place-items-center gradient-bg" style={{ color: 'var(--foreground)' }}>
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] p-0.5 shadow-lg animate-pulse">
            <img
              src="/icon.png"
              alt="NanimeID"
              className="w-full h-full object-contain rounded-lg bg-white"
            />
          </div>
          <div className="text-sm font-medium">Memuat...</div>
        </div>
      </main>
    );
  }

  // Mobile Header Component
  const MobileHeader = () => (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="md:hidden fixed top-0 left-0 right-0 z-30 px-4 py-3 glass-card border-b border-[var(--panel-border)]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] p-0.5 shadow-lg">
            <img
              src="/icon.png"
              alt="NanimeID"
              className="w-full h-full object-contain rounded-lg bg-white"
            />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-[var(--foreground)]">NanimeID</span>
              <Sparkles className="w-3 h-3 text-[var(--accent-secondary)]" />
            </div>
            <span className="text-[10px] text-[var(--foreground)]/50">
              {user?.username || user?.email?.split('@')[0] || '-'}
            </span>
          </div>
        </div>

        {/* Hamburger Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleMobileMenu}
          className="p-2.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--foreground)] hover:bg-[var(--accent-primary)]/10 transition-colors"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.header>
  );

  return (
    <main className="min-h-screen overflow-x-hidden gradient-bg" style={{ color: 'var(--foreground)' }}>
      {/* Mobile Header */}
      {!loading && user && <MobileHeader />}

      <div
        className={`min-h-screen md:h-screen grid min-w-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed
            ? 'grid-cols-1 md:grid-cols-[80px_1fr]'
            : 'grid-cols-1 md:grid-cols-[280px_1fr]'
        } ${!loading && user ? 'pt-[72px] md:pt-0' : ''}`}
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
          mobileOpen={mobileMenuOpen}
          onMobileClose={closeMobileMenu}
        />

        <section className="overflow-y-auto p-4 sm:p-6 w-full">
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 min-w-0 overflow-x-hidden w-full">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
