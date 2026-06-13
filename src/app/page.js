'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { LogIn, User, Lock, Sparkles, ArrowRight } from "lucide-react";
import { loginAdmin } from "@/lib/auth";

// Prioritas redirect dashboard berdasarkan permission
const PERMISSION_ROUTE_PRIORITY = [
  // Overview
  { key: 'overview', href: '/dashboard' },

  // Kelola
  { key: 'kelola-user', href: '/dashboard/kelola-user' },
  { key: 'kelola-admin', href: '/dashboard/kelola-admin' },
  { key: 'livechat', href: '/dashboard/livechat' },

  // Keuangan
  { key: 'keuangan', href: '/dashboard/keuangan' },
  { key: 'topup-manual', href: '/dashboard/topup' },

  // Store
  { key: 'store-admin', href: '/dashboard/store-admin' },
  { key: 'prime-store', href: '/dashboard/prime-store' },
  { key: 'sponsor-admin', href: '/dashboard/sponsor-admin' },

  // VIP & Items
  { key: 'vip-plans', href: '/dashboard/vip-plans' },
  { key: 'admin-vip', href: '/dashboard/admin-vip' },
  { key: 'admin-wallet', href: '/dashboard/admin-wallet' },
  { key: 'redeem-codes', href: '/dashboard/redeem' },
  { key: 'avatar-borders', href: '/dashboard/avatar-borders' },
  { key: 'badges', href: '/dashboard/badges' },
  { key: 'stickers', href: '/dashboard/stikers' },

  // Konten
  { key: 'daftar-konten', href: '/dashboard/daftar-konten' },
  { key: 'manga-admin', href: '/dashboard/manga-admin' },

  // Lainnya
  { key: 'waifu-vote', href: '/dashboard/waifu-vote' },

  // Pengaturan
  { key: 'settings', href: '/dashboard/pengaturan' },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

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

      // Jika punya overview, langsung ke dashboard utama
      if (permissions.includes('overview')) {
        router.push("/dashboard");
        return;
      }

      // Jika tidak ada overview, cari halaman pertama sesuai permission
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
    <main className="min-h-screen w-full relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 gradient-bg" />

      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">

          {/* Glass Card */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10">

            {/* Logo & Header */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] mb-4 sm:mb-6 shadow-lg animate-float p-1">
                <img
                  src="/icon.png"
                  alt="NanimeID Logo"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>

              <div className="flex items-center justify-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--foreground)] tracking-tight">
                  NanimeID
                </h1>
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent-secondary)]" />
              </div>

              <p className="text-sm sm:text-base text-[var(--foreground)]/60 font-medium">
                Panel Admin
              </p>
            </div>

            {/* Welcome Text */}
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] mb-2">
                Selamat Datang Kembali
              </h2>
              <p className="text-xs sm:text-sm text-[var(--foreground)]/50">
                Masukkan kredensial Anda untuk mengakses panel admin
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-[var(--foreground)]/80 ml-1">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <User className={`h-5 w-5 transition-colors duration-300 ${focusedInput === 'username' ? 'text-[var(--accent-primary)]' : 'text-[var(--foreground)]/40'}`} />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedInput('username')}
                    onBlur={() => setFocusedInput(null)}
                    className="modern-input w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm sm:text-base text-[var(--foreground)] placeholder:text-[var(--foreground)]/30 outline-none"
                    placeholder="Masukkan username Anda"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-[var(--foreground)]/80 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 transition-colors duration-300 ${focusedInput === 'password' ? 'text-[var(--accent-primary)]' : 'text-[var(--foreground)]/40'}`} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    className="modern-input w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm sm:text-base text-[var(--foreground)] placeholder:text-[var(--foreground)]/30 outline-none"
                    placeholder="Masukkan password Anda"
                  />
                </div>
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded-lg border-2 border-[var(--input-border)] bg-[var(--input-bg)] checked:bg-[var(--accent-primary)] checked:border-[var(--accent-primary)] transition-all cursor-pointer"
                  />
                  <span className="text-[var(--foreground)]/60 group-hover:text-[var(--foreground)]/80 transition-colors">
                    Ingat saya
                  </span>
                </label>
                <button
                  type="button"
                  className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-medium transition-colors hover:underline"
                >
                  Lupa password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full group overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] p-[2px] transition-all duration-300 hover:shadow-lg hover:shadow-[var(--accent-primary)]/25 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <div className="relative bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 transition-all duration-300 group-hover:opacity-90">
                  <div className="flex items-center justify-center gap-2 text-white font-semibold text-sm sm:text-base">
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk ke Panel</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </div>
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6 sm:my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--panel-border)]" />
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-3 sm:px-4 bg-[var(--glass-bg)] text-[var(--foreground)]/40 font-medium">
                  Akses Terbatas
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center space-y-1">
              <p className="text-xs sm:text-sm text-[var(--foreground)]/50">
                Registrasi pengguna tidak tersedia
              </p>
              <p className="text-[10px] sm:text-xs text-[var(--foreground)]/30">
                NanimeID Admin Panel v{process.env.NEXT_PUBLIC_VERSION_PANEL || '2.0'}
              </p>
            </div>
          </div>

          {/* Bottom decorative text */}
          <p className="text-center text-white/40 text-xs mt-6 sm:mt-8 font-light">
            Secure Admin Access Portal
          </p>
        </div>
      </div>
    </main>
  );
}

