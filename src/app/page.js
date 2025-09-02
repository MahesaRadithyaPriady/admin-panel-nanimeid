'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Shield, LogIn } from "lucide-react";
import { loginAdmin } from "@/lib/auth";

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
      router.push("/dashboard");
    } catch (err) {
      toast.error(err?.message || "Login gagal", { icon: "⚠️" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-[#F7F7F0] p-6 relative">
      <div
        className="w-full max-w-md bg-white border-4 border-black rounded-xl p-6 sm:p-8 relative"
        style={{ boxShadow: "10px 10px 0 #000" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="grid place-items-center size-10 bg-[#FFD803] border-4 border-black rounded-md"
               style={{ boxShadow: "4px 4px 0 #000" }}>
            <Shield className="size-5" />
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
              className="w-full rounded-lg px-4 py-3 border-4 border-black outline-none focus:bg-yellow-100"
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
              className="w-full rounded-lg px-4 py-3 border-4 border-black outline-none focus:bg-green-100"
              placeholder="••••••••"
            />
          </label>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="size-4 border-4 border-black rounded-sm" />
              Ingat saya
            </label>
            <span className="text-sm font-semibold opacity-50 select-none">Lupa password?</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FFD803] hover:bg-[#F1C40F] active:translate-x-[2px] active:translate-y-[2px] transition-transform border-4 border-black rounded-lg px-4 py-3 font-extrabold tracking-wide flex items-center justify-center gap-2"
            style={{ boxShadow: "6px 6px 0 #000" }}
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
