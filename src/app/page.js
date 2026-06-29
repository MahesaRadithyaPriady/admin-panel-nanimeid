'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { LogIn, Lock, Loader2 } from "lucide-react";
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
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--background)' }}
    >
      <div className="w-full max-w-md">
        <div className="login-card">
          {/* Logo Mark */}
          <div className="login-logo-mark">N/A</div>

          {/* Title */}
          <h1 className="page-title mb-1">Admin Panel</h1>
          <p
            className="text-sm mb-8"
            style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
          >
            NanimeID — Masuk untuk mengelola platform
          </p>

          {/* Login Form */}
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="form-group">
              <label className="label">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username Anda"
                disabled={loading}
                className="modern-input"
              />
            </div>

            <div className="form-group">
              <label className="label flex items-center gap-2">
                <Lock className="w-3 h-3" />
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password Anda"
                disabled={loading}
                className="modern-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn--primary btn--lg w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Masuk ke Panel
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
              Panel ini hanya untuk admin &amp; superadmin NanimeID.
              <br />
              Registrasi tidak tersedia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

