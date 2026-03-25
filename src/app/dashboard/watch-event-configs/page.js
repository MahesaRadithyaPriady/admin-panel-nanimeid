"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Clapperboard, Film, Gift, Plus, Pencil, Trash2, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { getSession } from "@/lib/auth";
import {
  listWatchEventConfigs,
  createWatchEventConfig,
  updateWatchEventConfig,
  toggleWatchEventConfig,
  deleteWatchEventConfig,
  listAvatarBorders,
  listStickers,
  listBadges,
} from "@/lib/api";

const REWARD_TYPES = ["NONE", "BORDER", "STICKER", "SUPERBADGE"];

function toIsoOrNull(v) {
  const s = String(v || "").trim();
  if (!s) return null;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function fromIsoToDateTimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function randomThresholdId() {
  return `T${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function WatchEventConfigsContent({ embedded = false } = {}) {
  const router = useRouter();
  const { user, loading } = useSession();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canAccess =
    permissions.includes("watch-event-configs") || String(user?.role || "").toLowerCase() === "superadmin";

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [filterActive, setFilterActive] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  const [borders, setBorders] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState({ borders: false, stickers: false, badges: false });

  const [mode, setMode] = useState("add");
  const [form, setForm] = useState({
    id: null,
    is_active: false,
    daily_reset: true,
    thresholds: [{ id: "T25", minutes: 25, episodes: "", coin_reward: 10, reward_type: "NONE", reward_id: 0 }],
    starts_at: "",
    ends_at: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!embedded && !loading && user && !canAccess) {
      toast.error("Kamu tidak punya izin untuk Konfigurasi Event Tonton");
      router.replace("/dashboard");
    }
  }, [embedded, loading, user, canAccess, router]);

  const ensureLookupsLoaded = async (rewardType) => {
    const type = String(rewardType || "NONE").toUpperCase();
    const token = getSession()?.token;
    if (!token) return;

    if (type === "BORDER") {
      if (loadingLookups.borders || borders.length > 0) return;
      setLoadingLookups((s) => ({ ...s, borders: true }));
      try {
        const res = await listAvatarBorders({ token, page: 1, limit: 200, q: "", active: true });
        setBorders(Array.isArray(res?.items) ? res.items : []);
      } catch (err) {
        toast.error(err?.message || "Gagal memuat Bingkai Avatar");
      } finally {
        setLoadingLookups((s) => ({ ...s, borders: false }));
      }
    }

    if (type === "STICKER") {
      if (loadingLookups.stickers || stickers.length > 0) return;
      setLoadingLookups((s) => ({ ...s, stickers: true }));
      try {
        const res = await listStickers({ token, page: 1, limit: 200, q: "" });
        setStickers(Array.isArray(res?.items) ? res.items : []);
      } catch (err) {
        toast.error(err?.message || "Gagal memuat Stiker");
      } finally {
        setLoadingLookups((s) => ({ ...s, stickers: false }));
      }
    }

    if (type === "SUPERBADGE") {
      if (loadingLookups.badges || badges.length > 0) return;
      setLoadingLookups((s) => ({ ...s, badges: true }));
      try {
        const res = await listBadges({ token, page: 1, limit: 200, q: "", active: true });
        setBadges(Array.isArray(res?.items) ? res.items : []);
      } catch (err) {
        toast.error(err?.message || "Gagal memuat Lencana");
      } finally {
        setLoadingLookups((s) => ({ ...s, badges: false }));
      }
    }
  };

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const data = await listWatchEventConfigs({
        token,
        page,
        limit,
        is_active: filterActive === "" ? undefined : filterActive === "true",
        ...opts,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || "Gagal memuat configs");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user || !canAccess) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canAccess, page, limit, filterActive]);

  const resetForm = () => {
    setMode("add");
    setForm({
      id: null,
      is_active: false,
      daily_reset: true,
      thresholds: [{ id: "T25", minutes: 25, episodes: "", coin_reward: 10, reward_type: "NONE", reward_id: 0 }],
      starts_at: "",
      ends_at: "",
    });
  };

  const onEdit = (it) => {
    const hasThresholds = Array.isArray(it.thresholds) && it.thresholds.length > 0;

    setMode("edit");

    if (hasThresholds) {
      for (const t of it.thresholds) {
        const rt = String(t?.reward_type || "NONE").toUpperCase();
        if (["BORDER", "STICKER", "SUPERBADGE"].includes(rt)) {
          ensureLookupsLoaded(rt);
        }
      }
    }

    setForm({
      id: it.id,
      is_active: !!it.is_active,
      daily_reset: it.daily_reset === undefined ? true : !!it.daily_reset,
      thresholds: hasThresholds
        ? it.thresholds.map((t) => ({
            id: String(t?.id || randomThresholdId()),
            minutes: t?.minutes === null || t?.minutes === undefined ? "" : Number(t.minutes),
            episodes: t?.episodes === null || t?.episodes === undefined ? "" : Number(t.episodes),
            coin_reward: Number(t?.coin_reward || 0),
            reward_type: String(t?.reward_type || "NONE").toUpperCase(),
            reward_id: Number(t?.reward_id || 0),
          }))
        : [{ id: randomThresholdId(), minutes: 25, episodes: "", coin_reward: 10, reward_type: "NONE", reward_id: 0 }],
      starts_at: fromIsoToDateTimeLocal(it.starts_at),
      ends_at: fromIsoToDateTimeLocal(it.ends_at),
    });
  };

  const normalizedThresholds = useMemo(() => {
    const raw = Array.isArray(form.thresholds) ? form.thresholds : [];
    return raw.map((t, idx) => ({
      key: `${t?.id || "IDX"}${idx}`,
      id: String(t?.id || ""),
      minutes: t?.minutes === "" || t?.minutes === null || t?.minutes === undefined ? "" : Number(t.minutes),
      episodes: t?.episodes === "" || t?.episodes === null || t?.episodes === undefined ? "" : Number(t.episodes),
      coin_reward: Number(t?.coin_reward || 0),
      reward_type: String(t?.reward_type || "NONE").toUpperCase(),
      reward_id: Number(t?.reward_id || 0),
    }));
  }, [form.thresholds]);

  const borderOptions = useMemo(() => {
    return borders
      .filter((b) => b && b.is_active)
      .map((b) => ({
        id: b.id,
        label: `${b.title || b.code || "Border"} (#${b.id})`,
      }));
  }, [borders]);

  const stickerOptions = useMemo(() => {
    return stickers
      .filter((s) => s && (s.is_active === undefined ? true : !!s.is_active))
      .map((s) => ({
        id: s.id,
        label: `${s.name || s.code || "Sticker"} (#${s.id})`,
      }));
  }, [stickers]);

  const badgeOptions = useMemo(() => {
    return badges
      .filter((b) => b && b.is_active)
      .map((b) => ({
        id: b.id,
        label: `${b.name || b.code || "Badge"} (#${b.id})`,
      }));
  }, [badges]);

  const rewardOptionsForType = (type) => {
    const t = String(type || "NONE").toUpperCase();
    if (t === "BORDER") return borderOptions;
    if (t === "STICKER") return stickerOptions;
    if (t === "SUPERBADGE") return badgeOptions;
    return [];
  };

  const buildPayload = () => {
    const startsAt = toIsoOrNull(form.starts_at);
    const endsAt = toIsoOrNull(form.ends_at);

    const thresholds = normalizedThresholds.map((t) => {
      const minutes = t.minutes === "" ? undefined : Number(t.minutes);
      const episodes = t.episodes === "" ? undefined : Number(t.episodes);

      const rewardType = String(t.reward_type || "NONE").toUpperCase();
      const rewardId = rewardType === "NONE" ? 0 : Number(t.reward_id || 0);

      return {
        id: String(t.id || ""),
        ...(minutes !== undefined ? { minutes } : {}),
        ...(episodes !== undefined ? { episodes } : {}),
        coin_reward: Number(t.coin_reward || 0),
        reward_type: rewardType,
        reward_id: rewardId,
      };
    });

    return {
      is_active: !!form.is_active,
      daily_reset: !!form.daily_reset,
      thresholds,
      starts_at: startsAt,
      ends_at: endsAt,
    };
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");

    try {
      setSubmitting(true);
      const payload = buildPayload();

      const errs = [];
      const seen = new Set();

      for (const t of payload.thresholds || []) {
        const id = String(t.id || "").trim();
        if (!id) errs.push("Threshold id wajib diisi");
        if (id && seen.has(id)) errs.push(`Threshold id duplikat: ${id}`);
        if (id) seen.add(id);
        if (t.minutes === undefined && t.episodes === undefined) errs.push(`Threshold ${id || "(tanpa id)"} wajib punya minutes atau episodes`);

        const rt = String(t.reward_type || "NONE").toUpperCase();
        if (!REWARD_TYPES.includes(rt)) errs.push(`Reward type tidak valid untuk threshold ${id || "(tanpa id)"}`);
        if (rt !== "NONE") {
          if (!Number.isFinite(Number(t.reward_id)) || Number(t.reward_id) <= 0) {
            errs.push(`Reward id wajib > 0 untuk threshold ${id || "(tanpa id)"}`);
          }
        }
      }

      if (errs.length > 0) {
        toast.error(errs[0]);
        return;
      }

      if (mode === "add") {
        const res = await createWatchEventConfig({ token, payload });
        toast.success(res?.message || "Config dibuat");
      } else {
        const res = await updateWatchEventConfig({ token, id: form.id, payload });
        toast.success(res?.message || "Config diupdate");
      }

      resetForm();
      setPage(1);
      await loadList({ page: 1 });
    } catch (err) {
      toast.error(err?.message || "Gagal menyimpan config");
    } finally {
      setSubmitting(false);
    }
  };

  const onToggle = async (it) => {
    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");
    try {
      setTogglingId(it.id);
      const res = await toggleWatchEventConfig({ token, id: it.id });
      toast.success(res?.message || "Config ditoggle");
      await loadList();
    } catch (err) {
      toast.error(err?.message || "Gagal toggle config");
    } finally {
      setTogglingId(null);
    }
  };

  const onDelete = async (it) => {
    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");
    try {
      setDeletingId(it.id);
      const res = await deleteWatchEventConfig({ token, id: it.id });
      toast.success(res?.message || "Config dihapus");
      if (mode === "edit" && form.id === it.id) resetForm();
      await loadList();
    } catch (err) {
      toast.error(err?.message || "Gagal menghapus config");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  const renderWindow = (it) => {
    const s = it?.starts_at ? new Date(it.starts_at).toLocaleString() : "-";
    const e = it?.ends_at ? new Date(it.ends_at).toLocaleString() : "-";
    return `${s} → ${e}`;
  };

  const renderConfigSummary = (it) => {
    const raw = Array.isArray(it?.thresholds) ? it.thresholds : [];
    if (raw.length === 0) return <span className="opacity-70">-</span>;

    const formatReward = (t) => {
      const rt = String(t?.reward_type || "NONE").toUpperCase();
      const rid = Number(t?.reward_id || 0);
      if (rt === "NONE") return "-";
      if (!rid) return rt;
      return `${rt} #${rid}`;
    };

    const formatReq = (t) => {
      const mm = t?.minutes ? `${t.minutes}m` : "";
      const ep = t?.episodes ? `${t.episodes}ep` : "";
      return [mm, ep].filter(Boolean).join("/") || "-";
    };

    const maxShow = 2;
    const shown = raw.slice(0, maxShow);
    const remaining = Math.max(0, raw.length - shown.length);

    return (
      <div className="space-y-1">
        <div className="text-[11px] font-extrabold">Tingkat: {raw.length}</div>
        <div className="space-y-1">
          {shown.map((t, idx) => (
            <div key={`${t?.id || "IDX"}-${idx}`} className="text-[11px] leading-snug">
              <span className="font-extrabold">{t?.id || "?"}</span>
              <span className="opacity-80"> · </span>
              <span>{formatReq(t)}</span>
              <span className="opacity-80"> · </span>
              <span className="font-extrabold">{Number(t?.coin_reward || 0)} koin</span>
              <span className="opacity-80"> · </span>
              <span>{formatReward(t)}</span>
            </div>
          ))}
          {remaining > 0 ? <div className="text-[11px] opacity-70">+{remaining} lainnya</div> : null}
        </div>
      </div>
    );
  };

  const renderDateTime = (value) => {
    if (!value) return "-";
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? "-" : dt.toLocaleString();
  };

  const activeCount = useMemo(() => items.filter((it) => !!it?.is_active).length, [items]);
  const totalThresholds = useMemo(
    () => items.reduce((sum, it) => sum + (Array.isArray(it?.thresholds) ? it.thresholds.length : 0), 0),
    [items]
  );

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className="rounded-[28px] border-4 p-5 md:p-6"
          style={{
            boxShadow: "10px 10px 0 #000",
            background: "linear-gradient(135deg, var(--panel-bg) 0%, #dbeafe 100%)",
            borderColor: "var(--panel-border)",
            color: "var(--foreground)",
          }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-1 text-xs font-black" style={{ borderColor: "var(--panel-border)", background: "#e0f2fe", color: "#1d4ed8" }}>
            <Clapperboard className="size-4" /> Watch Event
          </div>
          <h2 className="mt-4 text-2xl md:text-3xl font-black flex items-center gap-3">
            <Film className="size-7" /> Konfigurasi Event Tonton
          </h2>
          <p className="mt-3 max-w-3xl text-sm md:text-base font-semibold opacity-80">
            Atur reward berdasarkan ambang menit atau episode, coin bonus, hadiah item, serta jadwal aktif event tonton dengan tampilan yang lebih rapi.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-[28px] border-4 p-5" style={{ boxShadow: "10px 10px 0 #000", background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}>
          <div className="rounded-[20px] border-4 p-4" style={{ borderColor: "var(--panel-border)", background: "#f3f4f6" }}>
            <div className="text-xs font-black uppercase tracking-wide opacity-70">Total Config</div>
            <div className="mt-2 text-2xl font-black">{total}</div>
          </div>
          <div className="rounded-[20px] border-4 p-4" style={{ borderColor: "var(--panel-border)", background: "#dcfce7", color: "#166534" }}>
            <div className="text-xs font-black uppercase tracking-wide opacity-70">Aktif</div>
            <div className="mt-2 text-2xl font-black">{activeCount}</div>
          </div>
          <div className="rounded-[20px] border-4 p-4" style={{ borderColor: "var(--panel-border)", background: "#ede9fe", color: "#6d28d9" }}>
            <div className="text-xs font-black uppercase tracking-wide opacity-70">Mode Form</div>
            <div className="mt-2 text-sm font-black">{mode === "add" ? "Tambah Baru" : `Edit #${form.id}`}</div>
          </div>
          <div className="rounded-[20px] border-4 p-4" style={{ borderColor: "var(--panel-border)", background: "#dbeafe", color: "#1d4ed8" }}>
            <div className="text-xs font-black uppercase tracking-wide opacity-70">Threshold</div>
            <div className="mt-2 text-2xl font-black">{totalThresholds}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-2 text-xs font-black" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}>
          <Gift className="size-4" /> Reward menonton berdasarkan progress dan threshold
        </div>
        <button
          type="button"
          onClick={async () => {
            await loadList();
          }}
          className="px-4 py-3 border-4 rounded-2xl font-extrabold"
          style={{
            boxShadow: "6px 6px 0 #000",
            background: "var(--panel-bg)",
            borderColor: "var(--panel-border)",
            color: "var(--foreground)",
          }}
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="size-4" /> Muat Ulang
          </span>
        </button>
      </div>

      <div
        className="p-4 border-4 rounded-[24px]"
        style={{
          boxShadow: "8px 8px 0 #000",
          background: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
          color: "var(--foreground)",
        }}
      >
        <div className="mb-3 text-sm font-black opacity-75">Filter Config</div>
        <div className="grid sm:grid-cols-[220px_1fr] gap-3 items-center">
          <select
            value={filterActive}
            onChange={(e) => {
              setPage(1);
              setFilterActive(e.target.value);
            }}
            className="px-3 py-2 border-4 rounded-lg font-extrabold"
            style={{
              boxShadow: "4px 4px 0 #000",
              background: "var(--panel-bg)",
              borderColor: "var(--panel-border)",
              color: "var(--foreground)",
            }}
          >
            <option value="">Semua</option>
            <option value="true">Aktif saja</option>
            <option value="false">Nonaktif saja</option>
          </select>
          <div className="text-sm font-extrabold">Total: {total}</div>
        </div>
      </div>

      <div
        className="p-4 border-4 rounded-[24px] space-y-4"
        style={{
          boxShadow: "8px 8px 0 #000",
          background: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
          color: "var(--foreground)",
        }}
      >
        <div>
          <div className="text-sm font-extrabold">{mode === "add" ? "Tambah Config" : `Edit Config #${form.id}`}</div>
          <div className="mt-1 text-xs font-semibold opacity-70">Tentukan reset harian, periode event, serta daftar threshold reward menonton.</div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="rounded-[22px] border-4 p-4 grid gap-3 content-start" style={{ boxShadow: "6px 6px 0 #000", background: "#dbeafe", borderColor: "var(--panel-border)", color: "#1d4ed8" }}>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                <span>Config aktif</span>
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!form.daily_reset}
                  onChange={(e) => setForm((f) => ({ ...f, daily_reset: e.target.checked }))}
                />
                <span>Reset harian</span>
              </label>

              <div className="rounded-2xl border-4 px-3 py-2 text-xs font-black" style={{ borderColor: "var(--panel-border)", background: "rgba(255,255,255,0.7)", color: "#1d4ed8" }}>
                {normalizedThresholds.length} threshold aktif di editor.
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 rounded-[22px] border-4 p-4" style={{ boxShadow: "6px 6px 0 #000", background: "var(--background)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}>
                <span className="text-xs font-extrabold">Mulai (opsional)</span>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                  className="px-3 py-2 border-4 rounded-xl font-semibold"
                  style={{ boxShadow: "4px 4px 0 #000", background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}
                />
              </label>
              <label className="grid gap-1 rounded-[22px] border-4 p-4" style={{ boxShadow: "6px 6px 0 #000", background: "var(--background)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}>
                <span className="text-xs font-extrabold">Selesai (opsional)</span>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                  className="px-3 py-2 border-4 rounded-xl font-semibold"
                  style={{ boxShadow: "4px 4px 0 #000", background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-extrabold">Ambang</div>

              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    thresholds: [
                      ...(Array.isArray(f.thresholds) ? f.thresholds : []),
                      { id: randomThresholdId(), minutes: "", episodes: "", coin_reward: 0, reward_type: "NONE", reward_id: 0 },
                    ],
                  }))
                }
                className="px-3 py-2 border-4 rounded-lg font-extrabold"
                style={{
                  boxShadow: "4px 4px 0 #000",
                  background: "var(--panel-bg)",
                  borderColor: "var(--panel-border)",
                  color: "var(--foreground)",
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="size-4" /> Tambah ambang
                </span>
              </button>
            </div>

            <div className="grid gap-3">
              {normalizedThresholds.map((t, idx) => {
                const rt = String(t.reward_type || "NONE").toUpperCase();
                const needsRewardId = rt !== "NONE";
                const opts = rewardOptionsForType(rt);

                return (
                  <div
                    key={t.key}
                    className="p-4 border-4 rounded-[22px] space-y-4"
                    style={{
                      boxShadow: "6px 6px 0 #000",
                      background: idx % 2 === 0 ? "var(--background)" : "var(--panel-bg)",
                      borderColor: "var(--panel-border)",
                      color: "var(--foreground)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-extrabold">Tingkat #{idx + 1}</div>
                        <div className="rounded-full border-4 px-2 py-1 text-[11px] font-black" style={{ borderColor: "var(--panel-border)", background: "#e0f2fe", color: "#1d4ed8" }}>
                          Threshold reward
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setForm((f) => {
                            const next = [...(Array.isArray(f.thresholds) ? f.thresholds : [])];
                            next.splice(idx, 1);
                            return {
                              ...f,
                              thresholds:
                                next.length > 0
                                  ? next
                                  : [{ id: randomThresholdId(), minutes: "", episodes: "", coin_reward: 0, reward_type: "NONE", reward_id: 0 }],
                            };
                          });
                        }}
                        className="px-3 py-2 border-4 rounded-xl font-extrabold"
                        style={{
                          boxShadow: "4px 4px 0 #000",
                          background: "#fee2e2",
                          borderColor: "var(--panel-border)",
                          color: "#991b1b",
                        }}
                      >
                        Hapus
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <label className="grid gap-1">
                        <span className="text-xs font-extrabold">ID</span>
                        <input
                          value={t.id}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((f) => {
                              const next = [...(Array.isArray(f.thresholds) ? f.thresholds : [])];
                              next[idx] = { ...next[idx], id: v };
                              return { ...f, thresholds: next };
                            });
                          }}
                          className="px-3 py-2 border-4 rounded-xl font-semibold"
                          style={{
                            boxShadow: "4px 4px 0 #000",
                            background: "var(--panel-bg)",
                            borderColor: "var(--panel-border)",
                            color: "var(--foreground)",
                          }}
                        />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-xs font-extrabold">Hadiah koin</span>
                        <input
                          type="number"
                          min={0}
                          value={t.coin_reward}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((f) => {
                              const next = [...(Array.isArray(f.thresholds) ? f.thresholds : [])];
                              next[idx] = { ...next[idx], coin_reward: Number(v || 0) };
                              return { ...f, thresholds: next };
                            });
                          }}
                          className="px-3 py-2 border-4 rounded-lg font-semibold"
                          style={{
                            boxShadow: "4px 4px 0 #000",
                            background: "var(--panel-bg)",
                            borderColor: "var(--panel-border)",
                            color: "var(--foreground)",
                          }}
                        />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-xs font-extrabold">Menit (opsional)</span>
                        <input
                          type="number"
                          min={0}
                          value={t.minutes}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((f) => {
                              const next = [...(Array.isArray(f.thresholds) ? f.thresholds : [])];
                              next[idx] = { ...next[idx], minutes: v === "" ? "" : Number(v) };
                              return { ...f, thresholds: next };
                            });
                          }}
                          className="px-3 py-2 border-4 rounded-lg font-semibold"
                          style={{
                            boxShadow: "4px 4px 0 #000",
                            background: "var(--panel-bg)",
                            borderColor: "var(--panel-border)",
                            color: "var(--foreground)",
                          }}
                        />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-xs font-extrabold">Episode (opsional)</span>
                        <input
                          type="number"
                          min={0}
                          value={t.episodes}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((f) => {
                              const next = [...(Array.isArray(f.thresholds) ? f.thresholds : [])];
                              next[idx] = { ...next[idx], episodes: v === "" ? "" : Number(v) };
                              return { ...f, thresholds: next };
                            });
                          }}
                          className="px-3 py-2 border-4 rounded-lg font-semibold"
                          style={{
                            boxShadow: "4px 4px 0 #000",
                            background: "var(--panel-bg)",
                            borderColor: "var(--panel-border)",
                            color: "var(--foreground)",
                          }}
                        />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-xs font-extrabold">Tipe hadiah</span>
                        <select
                          value={rt}
                          onChange={(e) => {
                            const v = String(e.target.value || "NONE").toUpperCase();
                            ensureLookupsLoaded(v);
                            setForm((f) => {
                              const next = [...(Array.isArray(f.thresholds) ? f.thresholds : [])];
                              next[idx] = { ...next[idx], reward_type: v, reward_id: v === "NONE" ? 0 : Number(next[idx]?.reward_id || 0) };
                              return { ...f, thresholds: next };
                            });
                          }}
                          className="px-3 py-2 border-4 rounded-xl font-extrabold"
                          style={{
                            boxShadow: "4px 4px 0 #000",
                            background: "var(--panel-bg)",
                            borderColor: "var(--panel-border)",
                            color: "var(--foreground)",
                          }}
                        >
                          {REWARD_TYPES.map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-1">
                        <span className="text-xs font-extrabold">Item hadiah</span>
                        {needsRewardId ? (
                          <select
                            value={Number(t.reward_id || 0)}
                            onChange={(e) => {
                              const v = Number(e.target.value || 0);
                              setForm((f) => {
                                const next = [...(Array.isArray(f.thresholds) ? f.thresholds : [])];
                                next[idx] = { ...next[idx], reward_id: v };
                                return { ...f, thresholds: next };
                              });
                            }}
                            className="px-3 py-2 border-4 rounded-xl font-extrabold"
                            style={{
                              boxShadow: "4px 4px 0 #000",
                              background: "var(--panel-bg)",
                              borderColor: "var(--panel-border)",
                              color: "var(--foreground)",
                            }}
                          >
                            <option value={0}>
                              {loadingLookups.borders || loadingLookups.stickers || loadingLookups.badges ? "Memuat..." : "Pilih item"}
                            </option>
                            {opts.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value="NONE"
                            disabled
                            className="px-3 py-2 border-4 rounded-xl font-semibold opacity-70"
                            style={{
                              boxShadow: "4px 4px 0 #000",
                              background: "var(--panel-bg)",
                              borderColor: "var(--panel-border)",
                              color: "var(--foreground)",
                            }}
                          />
                        )}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
              style={{
                boxShadow: "4px 4px 0 #000",
                background: mode === "add" ? "var(--accent-add)" : "var(--accent-edit)",
                color: mode === "add" ? "var(--accent-add-foreground)" : "var(--accent-edit-foreground)",
                borderColor: "var(--panel-border)",
              }}
            >
              <span className="inline-flex items-center gap-2">
                {mode === "add" ? <Plus className="size-4" /> : <Pencil className="size-4" />}
                {submitting ? (mode === "add" ? "Menambah..." : "Menyimpan...") : mode === "add" ? "Tambah" : "Simpan"}
              </span>
            </button>

            {mode === "edit" ? (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2 border-4 rounded-lg font-extrabold"
                style={{
                  boxShadow: "4px 4px 0 #000",
                  background: "var(--panel-bg)",
                  borderColor: "var(--panel-border)",
                  color: "var(--foreground)",
                }}
              >
                Batal
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="rounded-[24px] border-4 p-4" style={{ boxShadow: "8px 8px 0 #000", background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold">Daftar Config</div>
            <div className="mt-1 text-xs font-semibold opacity-70">Pantau periode event, threshold reward, serta aksi edit, toggle, dan hapus dari satu panel.</div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-2 text-xs font-black" style={{ borderColor: "var(--panel-border)", background: "#dbeafe", color: "#1d4ed8" }}>
            <Film className="size-4" /> {items.length} item ditampilkan
          </div>
        </div>
        <div className="grid gap-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-[22px] border-4 p-4" style={{ boxShadow: "6px 6px 0 #000", background: "var(--background)", borderColor: "var(--panel-border)", color: "var(--foreground)", opacity: loadingList ? 0.7 : 1 }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-base font-black">Config #{it.id}</div>
                    <div className="rounded-full border-4 px-2 py-1 text-[11px] font-black" style={{ borderColor: "var(--panel-border)", background: it.is_active ? "#dcfce7" : "#f3f4f6", color: it.is_active ? "#166534" : "#374151" }}>
                      {it.is_active ? "Aktif" : "Nonaktif"}
                    </div>
                    <div className="rounded-full border-4 px-2 py-1 text-[11px] font-black" style={{ borderColor: "var(--panel-border)", background: it.daily_reset ? "#dbeafe" : "#fef3c7", color: it.daily_reset ? "#1d4ed8" : "#92400e" }}>
                      {it.daily_reset ? "Reset harian" : "Tanpa reset harian"}
                    </div>
                  </div>
                  <div className="text-sm font-semibold opacity-80">{Array.isArray(it?.thresholds) ? it.thresholds.length : 0} threshold reward</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(it)}
                    className="px-3 py-2 border-4 rounded-xl font-extrabold"
                    style={{ boxShadow: "4px 4px 0 #000", background: "var(--accent-edit)", color: "var(--accent-edit-foreground)", borderColor: "var(--panel-border)" }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Pencil className="size-4" /> Edit
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggle(it)}
                    disabled={togglingId === it.id}
                    className="px-3 py-2 border-4 rounded-xl font-extrabold disabled:opacity-60"
                    style={{ boxShadow: "4px 4px 0 #000", background: it.is_active ? "#FFD803" : "#FFF", color: "#111", borderColor: "var(--panel-border)" }}
                  >
                    {togglingId === it.id ? "..." : it.is_active ? (
                      <span className="inline-flex items-center gap-2">
                        <ToggleRight className="size-4" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <ToggleLeft className="size-4" /> Nonaktif
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(it)}
                    disabled={deletingId === it.id}
                    className="px-3 py-2 border-4 rounded-xl font-extrabold disabled:opacity-60"
                    style={{ boxShadow: "4px 4px 0 #000", background: "var(--accent-delete)", color: "var(--accent-delete-foreground)", borderColor: "var(--panel-border)" }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Trash2 className="size-4" /> {deletingId === it.id ? "Menghapus..." : "Hapus"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-[20px] border-4 p-3 text-xs" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
                  {renderConfigSummary(it)}
                </div>

                <div className="grid gap-2">
                  <div className="rounded-[18px] border-4 p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
                    <div className="text-xs font-black opacity-70">Mulai</div>
                    <div className="mt-1 text-sm font-semibold">{renderDateTime(it.starts_at)}</div>
                  </div>
                  <div className="rounded-[18px] border-4 p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
                    <div className="text-xs font-black opacity-70">Selesai</div>
                    <div className="mt-1 text-sm font-semibold">{renderDateTime(it.ends_at)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 ? (
            <div className="rounded-[22px] border-4 px-4 py-8 text-center text-sm font-semibold opacity-70" style={{ borderColor: "var(--panel-border)", background: "var(--background)" }}>
              Tidak ada data
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-extrabold">
          Halaman {page} / {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
            style={{
              boxShadow: "4px 4px 0 #000",
              background: "var(--panel-bg)",
              borderColor: "var(--panel-border)",
              color: "var(--foreground)",
            }}
          >
            Sebelumnya
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
            style={{
              boxShadow: "4px 4px 0 #000",
              background: "var(--panel-bg)",
              borderColor: "var(--panel-border)",
              color: "var(--foreground)",
            }}
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}

 export default function WatchEventConfigsPage() {
   return <WatchEventConfigsContent />;
 }
