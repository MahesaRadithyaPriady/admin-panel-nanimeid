"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { CalendarCheck2, Film, ListChecks, Sparkles } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { SigninEventConfigsContent } from "@/app/dashboard/signin-event-configs/page";
import { WatchEventConfigsContent } from "@/app/dashboard/watch-event-configs/page";

export default function KonfigurasiEventPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const roleKey = String(user?.role || "").toLowerCase();
  const isSuperadmin = roleKey === "superadmin";

  const canSignin = isSuperadmin || permissions.includes("signin-event-configs");
  const canWatch = isSuperadmin || permissions.includes("watch-event-configs");

  const availableTabs = useMemo(() => {
    const out = [];
    if (canWatch) out.push("watch");
    if (canSignin) out.push("signin");
    return out;
  }, [canSignin, canWatch]);

  const [tab, setTab] = useState(() => (availableTabs[0] ? availableTabs[0] : "watch"));

  useEffect(() => {
    if (loading || !user) return;
    if (!canSignin && !canWatch) {
      toast.error("Kamu tidak punya permission untuk Konfigurasi Event");
      router.replace("/dashboard");
    }
  }, [canSignin, canWatch, loading, router, user]);

  useEffect(() => {
    if (availableTabs.length === 0) return;
    setTab((t) => (availableTabs.includes(t) ? t : availableTabs[0]));
  }, [availableTabs]);

  if (loading || !user) return null;

  if (!canSignin && !canWatch) return null;

  const activeTab = availableTabs.includes(tab) ? tab : availableTabs[0];

  return (
    <div className="space-y-6">
      <div
        className="rounded-[28px] border-4 p-5 md:p-6"
        style={{
          boxShadow: "10px 10px 0 #000",
          background: "linear-gradient(135deg, var(--panel-bg) 0%, #e9d5ff 100%)",
          borderColor: "var(--panel-border)",
          color: "var(--foreground)",
        }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-1 text-xs font-black" style={{ borderColor: "var(--panel-border)", background: "#ede9fe", color: "#6d28d9" }}>
          <Sparkles className="size-4" /> Event Center
        </div>
        <h2 className="mt-4 text-2xl md:text-3xl font-black flex items-center gap-3">
          <ListChecks className="size-7" /> Konfigurasi Event
        </h2>
        <p className="mt-3 max-w-3xl text-sm md:text-base font-semibold opacity-80">
          Kelola seluruh event reward dari satu tempat. Pilih tipe event di bawah ini untuk mengatur login streak atau reward menonton dengan tampilan yang lebih ringkas dan nyaman dipakai admin.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[22px] border-4 p-2" style={{ boxShadow: "6px 6px 0 #000", background: "rgba(255,255,255,0.5)", borderColor: "var(--panel-border)" }}>
          {canWatch ? (
            <button
              type="button"
              onClick={() => setTab("watch")}
              className="px-4 py-3 border-4 rounded-2xl font-extrabold"
              style={{
                boxShadow: "4px 4px 0 #000",
                background: activeTab === "watch" ? "#dbeafe" : "var(--background)",
                borderColor: "var(--panel-border)",
                color: activeTab === "watch" ? "#1d4ed8" : "var(--foreground)",
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Film className="size-4" /> Konfigurasi Tonton
              </span>
            </button>
          ) : null}

          {canSignin ? (
            <button
              type="button"
              onClick={() => setTab("signin")}
              className="px-4 py-3 border-4 rounded-2xl font-extrabold"
              style={{
                boxShadow: "4px 4px 0 #000",
                background: activeTab === "signin" ? "#fef3c7" : "var(--background)",
                borderColor: "var(--panel-border)",
                color: activeTab === "signin" ? "#92400e" : "var(--foreground)",
              }}
            >
              <span className="inline-flex items-center gap-2">
                <CalendarCheck2 className="size-4" /> Konfigurasi Masuk
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {activeTab === "watch" ? <WatchEventConfigsContent embedded /> : null}
      {activeTab === "signin" ? <SigninEventConfigsContent embedded /> : null}
    </div>
  );
}
