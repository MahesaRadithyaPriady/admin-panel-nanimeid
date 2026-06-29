'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Flame, Gift, Plus, Pencil, Trash2, RefreshCw, Power, ChevronLeft, ChevronRight, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import {
  listSigninEventConfigs,
  createSigninEventConfig,
  updateSigninEventConfig,
  toggleSigninEventConfig,
  deleteSigninEventConfig,
  listAvatarBorders,
  listStickers,
  listBadges,
} from '@/lib/api';
import { ANIMATIONS, STYLES } from '../konfigurasi-event/constants';

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
    <motion.div variants={ANIMATIONS.container} initial="hidden" animate="visible" className="space-y-5">
      {/* Header & Stats */}
      <motion.div variants={ANIMATIONS.item} className="space-y-4">
        <div className={`${STYLES.card} p-5 sm:p-6`} style={STYLES.cardShadow}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium text-[var(--foreground)]/50 uppercase tracking-wide">Login Streak</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)] flex items-center gap-2">
                <Calendar className="w-6 h-6" /> Konfigurasi Event Masuk
              </h2>
              <p className="mt-2 text-sm text-[var(--foreground)]/60 max-w-lg">
                Atur login streak harian, reward coin, hadiah item, dan periode aktif event.
              </p>
            </div>
            <button onClick={async () => { await loadList(); await loadLookups(); }} disabled={loadingList}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-bg)] border-2 border-[var(--panel-border)] text-[var(--foreground)] font-bold text-sm hover:bg-[var(--accent-primary)]/10 transition-colors disabled:opacity-50"
              style={{ boxShadow: '4px 4px 0 rgba(212,212,212,0.15)' }}>
              <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{loadingList ? 'Memuat...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Config" value={total} />
          <StatCard label="Aktif" value={activeCount} tone="active" />
          <StatCard label="Mode" value={mode === 'add' ? 'Tambah' : `Edit #${form.id}`} />
          <StatCard label="Hari Event" value={normalizedDaysTotal} />
        </div>
      </motion.div>

      {/* Filter */}
      <motion.div variants={ANIMATIONS.item} className={`${STYLES.card} p-4`} style={STYLES.cardShadow}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-sm font-bold text-[var(--foreground)]/70">Filter Config</div>
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <select value={filterActive} onChange={(e) => { setPage(1); setFilterActive(e.target.value); }}
              className="px-3 py-2 rounded-xl border-2 bg-[var(--panel-bg)] text-[var(--foreground)] text-sm font-bold"
              style={{ boxShadow: '3px 3px 0 rgba(212,212,212,0.15)', borderColor: 'var(--panel-border)' }}>
              <option value="">Semua</option>
              <option value="true">Aktif saja</option>
              <option value="false">Nonaktif saja</option>
            </select>
            <div className="text-sm font-bold text-[var(--foreground)]/60">
              Total: <span className="text-[var(--accent-primary)]">{total}</span> config
            </div>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div variants={ANIMATIONS.item} className={`${STYLES.card} p-4 sm:p-5`} style={STYLES.cardShadow}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold">{mode === "add" ? "Tambah Config" : `Edit Config #${form.id}`}</div>
            <div className="mt-1 text-xs font-semibold opacity-70">Tentukan jumlah hari, reward coin, tipe hadiah, dan periode event.</div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border-2 px-3 py-2 text-xs font-bold" style={{ borderColor: 'var(--panel-border)', background: '#dbeafe', color: '#1e40af' }}>
            <Gift className="w-4 h-4" /> {loadingLookups ? 'memuat...' : `${borderOptions.length + stickerOptions.length + badgeOptions.length} item`}
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3 min-w-0">
          <div className="grid gap-3 min-w-0">
            <div className={`${STYLES.card} p-4 grid gap-3 content-start min-w-0`} style={STYLES.cardShadow}>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                <span>Config aktif</span>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-extrabold text-[var(--foreground)]">Jumlah hari</span>
                <input
                  type="number"
                  min={1}
                  value={form.days_total}
                  onChange={(e) => setForm((f) => ({ ...f, days_total: e.target.value }))}
                  placeholder="Contoh: 7"
                  className="w-full max-w-full min-w-0 px-3 py-2 border-2 rounded-xl font-bold text-sm"
                  style={{ boxShadow: '3px 3px 0 rgba(212,212,212,0.15)', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </label>

              <div className="rounded-xl border-2 px-3 py-2 text-xs font-bold" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)', color: 'var(--foreground)' }}>
                {normalizedDaysTotal} hari reward login akan ditampilkan di editor.
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-2 min-w-0">
              <label className={`${STYLES.card} p-4 grid gap-1 min-w-0`} style={STYLES.cardShadow}>
                <span className="text-xs font-bold text-[var(--foreground)]/70">Mulai (opsional)</span>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                  className="block w-full max-w-full min-w-0 px-3 py-2 border-2 rounded-xl font-bold text-sm"
                  style={{ boxShadow: '3px 3px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </label>
              <label className={`${STYLES.card} p-4 grid gap-1 min-w-0`} style={STYLES.cardShadow}>
                <span className="text-xs font-bold text-[var(--foreground)]/70">Selesai (opsional)</span>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                  className="block w-full max-w-full min-w-0 px-3 py-2 border-2 rounded-xl font-bold text-sm"
                  style={{ boxShadow: '3px 3px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
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
                <div key={idx} className="rounded-[22px] border-4 p-4 space-y-3 min-w-0 overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)', background: idx % 2 === 0 ? "var(--background)" : "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}>
                  <div className="flex items-center justify-between gap-2 min-w-0 flex-wrap">
                    <div className="text-sm font-black min-w-0">Hari #{idx + 1}</div>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[11px] font-bold">
                      Login reward
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 min-w-0">
                    <label className="grid gap-1 min-w-0">
                      <span className="text-xs font-bold text-[var(--foreground)]/70">Coin reward</span>
                      <input
                        type="number"
                        min={0}
                        value={normalizedCoins[idx]}
                        onChange={(e) => setDayField(idx, { coin: e.target.value })}
                        className="w-full max-w-full min-w-0 px-3 py-2 border-2 rounded-xl font-bold text-sm"
                        style={{ boxShadow: '3px 3px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                      />
                    </label>

                    <label className="grid gap-1 min-w-0">
                      <span className="text-xs font-bold text-[var(--foreground)]/70">Tipe hadiah</span>
                      <select
                        value={t}
                        onChange={(e) => setDayField(idx, { type: e.target.value })}
                        className="w-full max-w-full min-w-0 px-3 py-2 border-2 rounded-xl font-bold text-sm"
                        style={{ boxShadow: '3px 3px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
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
                    <span className="text-xs font-bold text-[var(--foreground)]/70">Item hadiah</span>
                    {needsId ? (
                      <select
                        value={normalizedIds[idx]}
                        onChange={(e) => setDayField(idx, { id: e.target.value })}
                        className="w-full max-w-full min-w-0 px-3 py-2 border-2 rounded-xl font-bold text-sm"
                        style={{ boxShadow: '3px 3px 0 rgba(212,212,212,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
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
                boxShadow: 'var(--shadow-md)',
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
                  boxShadow: 'var(--shadow-md)',
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
      </motion.div>

      {/* Config List */}
      <motion.div variants={ANIMATIONS.item} className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-[var(--foreground)]/70">Daftar Config ({items.length} item)</h3>
          <p className="text-xs text-[var(--foreground)]/50">Lihat, edit, toggle, atau hapus config</p>
        </div>
        <div className="grid gap-3">
          {items.map((it) => {
            const preview = renderRewardPreview(it);

            return (
              <div key={it.id} className="rounded-[22px] border-4 p-4" style={{ boxShadow: 'var(--shadow-lg)', background: "var(--background)", borderColor: "var(--panel-border)", color: "var(--foreground)" }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-black">Config #{it.id}</span>
                      {it.is_active ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center gap-1"><Power className="w-3 h-3" /> Aktif</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-400/10 text-gray-500 text-xs font-bold flex items-center gap-1"><Power className="w-3 h-3" /> Nonaktif</span>
                      )}
                    </div>
                    <div className="text-sm font-semibold opacity-80">{it.days_total} hari reward login</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(it)}
                      className="px-3 py-2 border-4 rounded-xl font-extrabold"
                      style={{ boxShadow: 'var(--shadow-md)', background: "var(--accent-edit)", color: "var(--accent-edit-foreground)", borderColor: "var(--panel-border)" }}
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
                      style={{ boxShadow: 'var(--shadow-md)', background: it.is_active ? "#22c55e" : "var(--panel-bg)", color: it.is_active ? "#fff" : "var(--foreground)", borderColor: "var(--panel-border)" }}
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
                      style={{ boxShadow: 'var(--shadow-md)', background: "var(--panel-bg)", color: "var(--foreground)", borderColor: "var(--panel-border)" }}
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
                      <div className="rounded-[18px] border-2 p-3 flex items-center justify-center text-sm font-bold" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}>
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

          {items.length === 0 && !loadingList && (
            <div className={`${STYLES.card} p-8 text-center`} style={STYLES.cardShadow}>
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--panel-bg)] flex items-center justify-center">
                <Gift className="w-8 h-8 text-[var(--foreground)]/30" />
              </div>
              <div className="text-lg font-bold text-[var(--foreground)]">Belum ada config</div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Pagination */}
      <motion.div variants={ANIMATIONS.item} className="flex items-center justify-between gap-3">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold"
          style={{
            boxShadow: 'var(--shadow-md)',
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
            boxShadow: 'var(--shadow-md)',
            background: "var(--panel-bg)",
            borderColor: "var(--panel-border)",
            color: "var(--foreground)",
          }}
        >
          Berikutnya
        </button>
      </motion.div>
    </motion.div>
  );
}

// StatCard Component
function StatCard({ label, value, tone }) {
  const toneStyles = {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    default: 'bg-[var(--panel-bg)] text-[var(--foreground)] border-[var(--panel-border)]'
  };

  return (
    <div className={`${STYLES.card} p-3 ${tone === 'active' ? toneStyles.active : toneStyles.default}`} style={STYLES.cardShadow}>
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-lg sm:text-xl font-black">{value}</div>
    </div>
  );
}

export default function SigninEventConfigsPage() {
  return <SigninEventConfigsContent />;
}
