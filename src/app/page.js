'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Shield, LogIn } from "lucide-react";
import { loginAdmin } from "@/lib/auth";

// Prioritas redirect dashboard berdasarkan permission
const PERMISSION_ROUTE_PRIORITY = [
  // Overview
  { key: 'overview', href: '/dashboard' },

  // Kelola
  { key: 'kelola-user', href: '/dashboard/kelola-user' },
  { key: 'kelola-admin', href: '/dashboard/kelola-admin' },

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

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await loginAdmin({ username: username.trim(), password });
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
    <main className="min-h-screen grid place-items-center bg-[var(--background)] text-[var(--foreground)] p-6 relative">
      <div
        className="w-full max-w-md bg-[var(--panel-bg)] border-4 border-[var(--panel-border)] rounded-xl p-6 sm:p-8 relative"
        style={{ boxShadow: "10px 10px 0 var(--panel-border)" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="grid place-items-center size-10 bg-[var(--accent-edit)] border-4 border-[var(--panel-border)] rounded-md"
               style={{ boxShadow: "4px 4px 0 var(--panel-border)" }}>
            <Shield className="size-5 text-[var(--accent-edit-foreground)]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">NanimeID Admin</h1>
        </div>
        <p className="text-sm mb-6 font-medium">
          Login untuk masuk ke panel admin. Registrasi tidak tersedia.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold mb-1">Username</span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg px-4 py-3 border-4 border-[var(--panel-border)] outline-none focus:bg-[var(--accent-primary)]"
              placeholder="Kasih Username Disini"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-semibold mb-1">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg px-4 py-3 border-4 border-[var(--panel-border)] outline-none focus:bg-[var(--accent-add)]"
              placeholder="••••••••"
            />
          </label>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="size-4 border-4 border-[var(--panel-border)] rounded-sm" />
              Ingat saya
            </label>
            <span className="text-sm font-semibold opacity-50 select-none">Lupa password?</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent-edit)] text-[var(--accent-edit-foreground)] hover:opacity-90 active:translate-x-[2px] active:translate-y-[2px] transition-transform border-4 border-[var(--panel-border)] rounded-lg px-4 py-3 font-extrabold tracking-wide flex items-center justify-center gap-2"
            style={{ boxShadow: "6px 6px 0 var(--panel-border)" }}
          >
            {loading ? "Memproses..." : (
              <>
                <LogIn className="size-4" />
                <span>Masuk</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-xs font-semibold text-center">
          Akses terbatas admin. Tidak ada registrasi pengguna.
        </div>

        {/* Info tambahan dapat diletakkan di sini bila diperlukan */}
      </div>
    </main>
  );
}

