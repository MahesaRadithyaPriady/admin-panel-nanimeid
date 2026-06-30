'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { LogIn, Lock, Loader2, Eye, EyeOff, User, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { loginAdmin } from "@/lib/auth";

const PERMISSION_ROUTE_PRIORITY = [
  { key: 'overview', href: '/dashboard' },
  { key: 'kelola-user', href: '/dashboard/kelola-user' },
  { key: 'kelola-admin', href: '/dashboard/kelola-admin' },
  { key: 'livechat', href: '/dashboard/livechat' },
  { key: 'keuangan', href: '/dashboard/keuangan' },
  { key: 'topup-manual', href: '/dashboard/topup' },
  { key: 'store-admin', href: '/dashboard/store-admin' },
  { key: 'prime-store', href: '/dashboard/prime-store' },
  { key: 'sponsor-admin', href: '/dashboard/sponsor-admin' },
  { key: 'vip-plans', href: '/dashboard/vip-plans' },
  { key: 'admin-vip', href: '/dashboard/admin-vip' },
  { key: 'admin-wallet', href: '/dashboard/admin-wallet' },
  { key: 'redeem-codes', href: '/dashboard/redeem' },
  { key: 'avatar-borders', href: '/dashboard/avatar-borders' },
  { key: 'badges', href: '/dashboard/badges' },
  { key: 'stickers', href: '/dashboard/stikers' },
  { key: 'daftar-konten', href: '/dashboard/daftar-konten' },
  { key: 'manga-admin', href: '/dashboard/manga-admin' },
  { key: 'waifu-vote', href: '/dashboard/waifu-vote' },
  { key: 'settings', href: '/dashboard/pengaturan' },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const getOrCreateDeviceId = () => {
    if (typeof window === 'undefined') return 'admin-web-1';
    try {
      const key = 'nanimeid_livechat_device_id';
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const next = `admin-web-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(key, next);
      return next;
    } catch {
      return 'admin-web-1';
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const device_id = getOrCreateDeviceId();
      const session = await loginAdmin({ username: username.trim(), password, device_id });
      toast.success(`Login berhasil sebagai ${session.role}`);

      const permissions = Array.isArray(session?.permissions) ? session.permissions : [];

      if (permissions.includes('overview')) {
        router.push("/dashboard");
        return;
      }

      const firstAllowed = PERMISSION_ROUTE_PRIORITY.find((item) =>
        permissions.includes(item.key)
      );
      if (firstAllowed) {
        router.push(firstAllowed.href);
      }
    } catch (err) {
      toast.error(err?.message || "Login gagal", { icon: "⚠️" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-page min-h-screen flex"
      style={{ background: 'var(--background)' }}
    >
      {/* Brand Panel — desktop only */}
      <motion.div
        className="login-brand-panel hidden lg:flex"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="login-brand-content">
          <motion.div
            className="login-brand-logo"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://web.nanimeid.xyz/logo.png" alt="NanimeID" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </motion.div>
          <motion.h1
            className="login-brand-title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            NanimeID
            <br />
            Admin Panel
          </motion.h1>
          <motion.p
            className="login-brand-subtitle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            Pusat kendali untuk mengelola platform NanimeID — konten, pengguna, toko, VIP, dan lebih banyak lagi.
          </motion.p>
          <motion.div
            className="login-brand-features"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            {[
              { icon: Shield, label: 'Akses aman khusus admin' },
              { icon: User, label: 'Kelola pengguna & konten' },
              { icon: Lock, label: 'Data terenkripsi end-to-end' },
            ].map((f) => (
              <div key={f.label} className="login-brand-feature">
                <f.icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                <span>{f.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Form Panel */}
      <motion.div
        className="login-form-panel flex-1 flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
      >
        <div className="w-full max-w-md">
          {/* Mobile logo — visible only on mobile/tablet */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="login-logo-mark" style={{ marginBottom: 0, padding: 0, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://web.nanimeid.xyz/logo.png" alt="NanimeID" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }}>
                NanimeID
              </h1>
              <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                Admin Panel
              </p>
            </div>
          </div>

          <div className="login-card">
            {/* Desktop title */}
            <h2
              className="text-2xl font-bold mb-1 hidden lg:block"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
            >
              Masuk
            </h2>
            <p
              className="text-sm mb-6 lg:mb-8"
              style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
            >
              {mounted && window.innerWidth >= 1024
                ? 'Masuk untuk mengelola platform'
                : 'Masuk untuk mengelola platform NanimeID'}
            </p>

            <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
              <div className="form-group">
                <label className="label">Username</label>
                <div className="login-input-wrap">
                  <User className="login-input-icon" strokeWidth={2} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    disabled={loading}
                    className="modern-input login-input--with-icon"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  Password
                </label>
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" strokeWidth={2} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    disabled={loading}
                    className="modern-input login-input--with-icon login-input--with-action"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-input-action"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn--primary btn--lg w-full"
                suppressHydrationWarning
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Masuk
                  </>
                )}
              </button>
            </form>

            <div
              className="mt-6 pt-6"
              style={{ borderTop: '1px solid var(--border-muted)' }}
            >
              <p
                className="text-center"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                }}
              >
                Panel ini hanya untuk admin &amp; superadmin.
                <br />
                Registrasi tidak tersedia.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

