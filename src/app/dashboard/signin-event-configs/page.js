"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { CalendarCheck2, Coins, Gift, ListChecks, Plus, Pencil, Trash2, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { getSession } from "@/lib/auth";
import {
  listSigninEventConfigs,
  createSigninEventConfig,
  updateSigninEventConfig,
  toggleSigninEventConfig,
  deleteSigninEventConfig,
  listAvatarBorders,
  listStickers,
  listBadges,
} from "@/lib/api";

const REWARD_TYPES = ["NONE", "BORDER", "STICKER", "SUPERBADGE"];

function normalizeToLength(arr, len, fillValue) {
  const out = Array.isArray(arr) ? [...arr] : [];
  while (out.length < len) out.push(fillValue);
  if (out.length > len) out.length = len;
  return out;
}

function toIsoOrNull(v) {
  const s = String(v || "").trim();
  if (!s) return null;
  // Expect input type datetime-local (no timezone). Convert to ISO with local timezone offset.
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

export function SigninEventConfigsContent({ embedded = false } = {}) {
  const router = useRouter();
  const { user, loading } = useSession();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canAccess =
    permissions.includes("signin-event-configs") || String(user?.role || "").toLowerCase() === "superadmin";

  // list
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [filterActive, setFilterActive] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  // lookup master items
  const [borders, setBorders] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // form
  const [mode, setMode] = useState("add"); // add | edit
  const [form, setForm] = useState({
    id: null,
    is_active: false,
    days_total: 7,
    daily_coin_rewards: [],
    daily_reward_types: [],
    daily_reward_ids: [],
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
      toast.error("Kamu tidak punya izin untuk Konfigurasi Event Masuk");
      router.replace("/dashboard");
    }
  }, [embedded, loading, user, canAccess, router]);

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const data = await listSigninEventConfigs({
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

  const loadLookups = async () => {
    setLoadingLookups(true);
    try {
      const token = getSession()?.token;
      const [b, s, bd] = await Promise.all([
        listAvatarBorders({ token, page: 1, limit: 200, q: "", active: true }),
        listStickers({ token, page: 1, limit: 200, q: "" }),
        listBadges({ token, page: 1, limit: 200, q: "", active: true }),
      ]);

      setBorders(Array.isArray(b?.items) ? b.items : []);
      setStickers(Array.isArray(s?.items) ? s.items : []);
      setBadges(Array.isArray(bd?.items) ? bd.items : []);
    } catch (err) {
      toast.error(err?.message || "Gagal memuat lookup items");
    } finally {
      setLoadingLookups(false);
    }
  };

  useEffect(() => {
    if (!user || !canAccess) return;
    loadList();
    loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canAccess, page, limit, filterActive]);

  const normalizedDaysTotal = Math.max(1, Number(form.days_total || 1));

  const normalizedCoins = useMemo(
    () => normalizeToLength(form.daily_coin_rewards, normalizedDaysTotal, 0).map((x) => Number(x || 0)),
    [form.daily_coin_rewards, normalizedDaysTotal]
  );
  const normalizedTypes = useMemo(
    () => normalizeToLength(form.daily_reward_types, normalizedDaysTotal, "NONE").map((x) => String(x || "NONE")),
    [form.daily_reward_types, normalizedDaysTotal]
  );
  const normalizedIds = useMemo(
    () => normalizeToLength(form.daily_reward_ids, normalizedDaysTotal, 0).map((x) => Number(x || 0)),
    [form.daily_reward_ids, normalizedDaysTotal]
  );

  const setDayField = (index, patch) => {
    const nextCoins = [...normalizedCoins];
    const nextTypes = [...normalizedTypes];
    const nextIds = [...normalizedIds];

    if (patch.coin !== undefined) nextCoins[index] = Number(patch.coin || 0);
    if (patch.type !== undefined) {
      nextTypes[index] = patch.type;
      if (patch.type === "NONE") nextIds[index] = 0;
      if (["BORDER", "STICKER", "SUPERBADGE"].includes(patch.type) && !Number.isFinite(nextIds[index])) nextIds[index] = 0;
    }
    if (patch.id !== undefined) nextIds[index] = Number(patch.id || 0);

    setForm((f) => ({
      ...f,
      daily_coin_rewards: nextCoins,
      daily_reward_types: nextTypes,
      daily_reward_ids: nextIds,
    }));
  };

  const resetForm = () => {
    setMode("add");
    setForm({
      id: null,
      is_active: false,
      days_total: 7,
      daily_coin_rewards: [],
      daily_reward_types: [],
      daily_reward_ids: [],
      starts_at: "",
      ends_at: "",
    });
  };

  const onEdit = (it) => {
    setMode("edit");
    setForm({
      id: it.id,
      is_active: !!it.is_active,
      days_total: Number(it.days_total || 1),
      daily_coin_rewards: Array.isArray(it.daily_coin_rewards) ? it.daily_coin_rewards : [],
      daily_reward_types: Array.isArray(it.daily_reward_types) ? it.daily_reward_types : [],
      daily_reward_ids: Array.isArray(it.daily_reward_ids) ? it.daily_reward_ids : [],
      starts_at: fromIsoToDateTimeLocal(it.starts_at),
      ends_at: fromIsoToDateTimeLocal(it.ends_at),
    });
  };

  const buildPayload = () => {
    const startsAt = toIsoOrNull(form.starts_at);
    const endsAt = toIsoOrNull(form.ends_at);

    return {
      is_active: !!form.is_active,
      days_total: normalizedDaysTotal,
      daily_coin_rewards: normalizedCoins,
      daily_reward_types: normalizedTypes,
      daily_reward_ids: normalizedTypes.map((t, i) => (t === "NONE" ? 0 : Number(normalizedIds[i] || 0))),
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

      if (mode === "add") {
        const res = await createSigninEventConfig({ token, payload });
        toast.success(res?.message || "Config dibuat");
      } else {
        const res = await updateSigninEventConfig({ token, id: form.id, payload });
        toast.success(res?.message || "Config diupdate");
      }

      resetForm();
      setPage(1);
      await loadList({ page: 1 });
    } catch (err) {
      const msg = err?.message || "Gagal menyimpan config";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onToggle = async (it) => {
    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");
    try {
      setTogglingId(it.id);
      const res = await toggleSigninEventConfig({ token, id: it.id });
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
      const res = await deleteSigninEventConfig({ token, id: it.id });
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
    if (type === "BORDER") return borderOptions;
    if (type === "STICKER") return stickerOptions;
    if (type === "SUPERBADGE") return badgeOptions;
    return [];
  };

  const activeCount = useMemo(() => items.filter((it) => !!it?.is_active).length, [items]);

  const renderDateTime = (value) => {
    if (!value) return "-";
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? "-" : dt.toLocaleString();
  };

  const renderRewardPreview = (it) => {
    const coins = Array.isArray(it?.daily_coin_rewards) ? it.daily_coin_rewards : [];
    const types = Array.isArray(it?.daily_reward_types) ? it.daily_reward_types : [];
    const ids = Array.isArray(it?.daily_reward_ids) ? it.daily_reward_ids : [];
    const totalDays = Math.max(1, Number(it?.days_total || 1));

    return Array.from({ length: Math.min(totalDays, 3) }).map((_, idx) => {
      const type = String(types[idx] || "NONE").toUpperCase();
      const rewardId = Number(ids[idx] || 0);
      const rewardLabel = type === "NONE" ? "Tanpa item" : rewardId > 0 ? `${type} #${rewardId}` : type;

      return {
        day: idx + 1,
        coin: Number(coins[idx] || 0),
        rewardLabel,
      };
    });
  };

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className="rounded-[28px] border-4 p-5 md:p-6"
          style={{
            boxShadow: "10px 10px 0 #000",
            background: "linear-gradient(135deg, var(--panel-bg) 0%, #fef3c7 100%)",
            borderColor: "var(--panel-border)",
            color: "var(--foreground)",
          }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-1 text-xs font-black" style={{ borderColor: "var(--panel-border)", background: "#fff7cc", color: "#92400e" }}>
            <CalendarCheck2 className="size-4" /> Sign-In Event
          </div>
          <h2 className="mt-4 text-2xl md:text-3xl font-black flex items-center gap-3">
            <ListChecks className="size-7" /> Konfigurasi Event Masuk
          </h2>
          <p className="mt-3 max-w-3xl text-sm md:text-base font-semibold opacity-80">
            Atur login streak harian, reward coin, hadiah item, dan periode aktif event dalam satu panel yang lebih mudah dipantau.
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
            <div className="text-xs font-black uppercase tracking-wide opacity-70">Hari Event</div>
            <div className="mt-2 text-2xl font-black">{normalizedDaysTotal}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-2 text-xs font-black" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}>
          <Gift className="size-4" /> Event login, reward item, dan coin harian
        </div>
        <button
          type="button"
          onClick={async () => {
            await loadList();
            await loadLookups();
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

      {/* Filters */}
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

      {/* Form */}
      <div
        className="p-4 border-4 rounded-[24px] space-y-4"
        style={{
          boxShadow: "8px 8px 0 #000",
          background: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
          color: "var(--foreground)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold">{mode === "add" ? "Tambah Config" : `Edit Config #${form.id}`}</div>
            <div className="mt-1 text-xs font-semibold opacity-70">Tentukan jumlah hari, reward coin, tipe hadiah, dan periode event.</div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-2 text-xs font-black" style={{ borderColor: "var(--panel-border)", background: "#fff7cc", color: "#92400e" }}>
            <Coins className="size-4" /> Lookup siap: {loadingLookups ? "memuat..." : `${borderOptions.length + stickerOptions.length + badgeOptions.length} item`}
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3 min-w-0">
          <div className="grid gap-3 min-w-0">
            <div className="rounded-[22px] border-4 p-4 grid gap-3 content-start min-w-0" style={{ boxShadow: "6px 6px 0 #000", background: "#fff7cc", borderColor: "var(--panel-border)", color: "#92400e" }}>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                <span>Config aktif</span>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-extrabold">Jumlah hari</span>
                <input
                  type="number"
                  min={1}
                  value={form.days_total}
                  onChange={(e) => setForm((f) => ({ ...f, days_total: e.target.value }))}
                  placeholder="Contoh: 7"
                  className="w-full max-w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold"
                  style={{ boxShadow: "4px 4px 0 #000", background: "#fff", borderColor: "var(--panel-border)", color: "var(--foreground)" }}
                />
              </label>

              <div className="rounded-2xl border-4 px-3 py-2 text-xs font-black" style={{ borderColor: "var(--panel-border)", background: "rgba(255,255,255,0.7)", color: "#92400e" }}>
                {normalizedDaysTotal} hari reward login akan ditampilkan di editor.
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-2 min-w-0">
              <label className="grid gap-1 rounded-[22px] border-4 p-4 min-w-0" style={{ boxShadow: "6px 6px 0 #000", background: "var(--background)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}>
                <span className="text-xs font-extrabold">Mulai (opsional)</span>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                  className="block w-full max-w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold text-sm"
                  style={{ boxShadow: "4px 4px 0 #000", background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}
                />
              </label>
              <label className="grid gap-1 rounded-[22px] border-4 p-4 min-w-0" style={{ boxShadow: "6px 6px 0 #000", background: "var(--background)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}>
                <span className="text-xs font-extrabold">Selesai (opsional)</span>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                  className="block w-full max-w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold text-sm"
                  style={{ boxShadow: "4px 4px 0 #000", background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}
                />
              </label>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-2 min-w-0">
            {Array.from({ length: normalizedDaysTotal }).map((_, idx) => {
              const t = normalizedTypes[idx] || "NONE";
              const opts = rewardOptionsForType(t);
              const needsId = t !== "NONE";

              return (
                <div key={idx} className="rounded-[22px] border-4 p-4 space-y-3 min-w-0 overflow-hidden" style={{ boxShadow: "6px 6px 0 #000", background: idx % 2 === 0 ? "var(--background)" : "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}>
                  <div className="flex items-center justify-between gap-2 min-w-0 flex-wrap">
                    <div className="text-sm font-black min-w-0">Hari #{idx + 1}</div>
                    <div className="text-[11px] font-black rounded-full border-4 px-2 py-1" style={{ borderColor: "var(--panel-border)", background: "#fff7cc", color: "#92400e" }}>
                      Login reward
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 min-w-0">
                    <label className="grid gap-1 min-w-0">
                      <span className="text-xs font-extrabold">Coin reward</span>
                      <input
                        type="number"
                        min={0}
                        value={normalizedCoins[idx]}
                        onChange={(e) => setDayField(idx, { coin: e.target.value })}
                        className="w-full max-w-full min-w-0 px-3 py-2 border-4 rounded-xl font-semibold"
                        style={{ boxShadow: "4px 4px 0 #000", background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}
                      />
                    </label>

                    <label className="grid gap-1 min-w-0">
                      <span className="text-xs font-extrabold">Tipe hadiah</span>
                      <select
                        value={t}
                        onChange={(e) => setDayField(idx, { type: e.target.value })}
                        className="w-full max-w-full min-w-0 px-3 py-2 border-4 rounded-xl font-extrabold"
                        style={{ boxShadow: "4px 4px 0 #000", background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}
                      >
                        {REWARD_TYPES.map((rt) => (
                          <option key={rt} value={rt}>
                            {rt}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-1 min-w-0">
                    <span className="text-xs font-extrabold">Item hadiah</span>
                    {needsId ? (
                      <select
                        value={normalizedIds[idx]}
                        onChange={(e) => setDayField(idx, { id: e.target.value })}
                        className="w-full max-w-full min-w-0 px-3 py-2 border-4 rounded-xl font-extrabold"
                        style={{ boxShadow: "4px 4px 0 #000", background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}
                      >
                        <option value={0}>Pilih item</option>
                        {opts.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="rounded-xl border-4 px-3 py-2 text-xs font-semibold opacity-80" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
                        Tidak ada item tambahan untuk hari ini.
                      </div>
                    )}
                  </label>
                </div>
              );
            })}
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
                Batal Edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {/* List table */}
      <div className="rounded-[24px] border-4 p-4" style={{ boxShadow: "8px 8px 0 #000", background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold">Daftar Config</div>
            <div className="mt-1 text-xs font-semibold opacity-70">Lihat config aktif/nonaktif, edit, toggle, atau hapus langsung dari satu panel.</div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border-4 px-3 py-2 text-xs font-black" style={{ borderColor: "var(--panel-border)", background: "#dbeafe", color: "#1d4ed8" }}>
            <ListChecks className="size-4" /> {items.length} item ditampilkan
          </div>
        </div>
        <div className="grid gap-3">
          {items.map((it) => {
            const preview = renderRewardPreview(it);

            return (
              <div key={it.id} className="rounded-[22px] border-4 p-4" style={{ boxShadow: "6px 6px 0 #000", background: "var(--background)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-black">Config #{it.id}</div>
                      <div className="rounded-full border-4 px-2 py-1 text-[11px] font-black" style={{ borderColor: "var(--panel-border)", background: it.is_active ? "#dcfce7" : "#f3f4f6", color: it.is_active ? "#166534" : "#374151" }}>
                        {it.is_active ? "Aktif" : "Nonaktif"}
                      </div>
                    </div>
                    <div className="text-sm font-semibold opacity-80">{it.days_total} hari reward login</div>
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
                      disabled={togglingId === it.id}
                      onClick={() => onToggle(it)}
                      className="px-3 py-2 border-4 rounded-xl font-extrabold disabled:opacity-60"
                      style={{ boxShadow: "4px 4px 0 #000", background: it.is_active ? "#FFD803" : "#FFF", color: "var(--foreground)", borderColor: "var(--panel-border)" }}
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
                      disabled={deletingId === it.id}
                      onClick={() => onDelete(it)}
                      className="px-3 py-2 border-4 rounded-xl font-extrabold disabled:opacity-60"
                      style={{ boxShadow: "4px 4px 0 #000", background: "var(--panel-bg)", color: "var(--foreground)", borderColor: "var(--panel-border)" }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Trash2 className="size-4" /> Hapus
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {preview.map((day) => (
                      <div key={`${it.id}-${day.day}`} className="rounded-[18px] border-4 p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
                        <div className="text-xs font-black opacity-70">Hari {day.day}</div>
                        <div className="mt-1 text-sm font-black">{day.coin} coin</div>
                        <div className="mt-1 text-xs font-semibold opacity-80">{day.rewardLabel}</div>
                      </div>
                    ))}
                    {Number(it?.days_total || 0) > preview.length ? (
                      <div className="rounded-[18px] border-4 p-3 flex items-center justify-center text-sm font-black" style={{ borderColor: "var(--panel-border)", background: "#ede9fe", color: "#6d28d9" }}>
                        +{Number(it.days_total || 0) - preview.length} hari lainnya
                      </div>
                    ) : null}
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
            );
          })}

          {items.length === 0 ? (
            <div className="rounded-[22px] border-4 px-4 py-8 text-center text-sm font-semibold opacity-70" style={{ borderColor: "var(--panel-border)", background: "var(--background)" }}>
              {loadingList ? "Memuat..." : "Belum ada config."}
            </div>
          ) : null}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold"
          style={{
            boxShadow: "4px 4px 0 #000",
            background: "var(--panel-bg)",
            borderColor: "var(--panel-border)",
            color: "var(--foreground)",
          }}
        >
          Sebelumnya
        </button>
        <div className="text-sm font-extrabold">
          Halaman {page} / {totalPages}
        </div>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold"
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
  );
}

 export default function SigninEventConfigsPage() {
   return <SigninEventConfigsContent />;
 }
