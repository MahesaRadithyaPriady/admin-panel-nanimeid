"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ListChecks, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
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

export default function SigninEventConfigsPage() {
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
    if (!loading && user && !canAccess) {
      toast.error("Kamu tidak punya permission untuk Sign-In Event Configs");
      router.replace("/dashboard");
    }
  }, [loading, user, canAccess, router]);

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

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <ListChecks className="size-5" /> Sign-In Event Configs
        </h2>
        <button
          type="button"
          onClick={async () => {
            await loadList();
            await loadLookups();
          }}
          className="px-3 py-2 border-4 rounded-lg font-extrabold"
          style={{
            boxShadow: "4px 4px 0 #000",
            background: "var(--panel-bg)",
            borderColor: "var(--panel-border)",
            color: "var(--foreground)",
          }}
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="size-4" /> Refresh
          </span>
        </button>
      </div>

      {/* Filters */}
      <div
        className="p-3 border-4 rounded-lg"
        style={{
          boxShadow: "4px 4px 0 #000",
          background: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
          color: "var(--foreground)",
        }}
      >
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
        className="p-3 border-4 rounded-lg space-y-3"
        style={{
          boxShadow: "4px 4px 0 #000",
          background: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
          color: "var(--foreground)",
        }}
      >
        <div className="text-sm font-extrabold">{mode === "add" ? "Tambah Config" : `Edit Config #${form.id}`}</div>

        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid sm:grid-cols-3 gap-3 items-center">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={!!form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <span>Aktif</span>
            </label>

            <input
              type="number"
              min={1}
              value={form.days_total}
              onChange={(e) => setForm((f) => ({ ...f, days_total: e.target.value }))}
              placeholder="days_total"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{
                boxShadow: "4px 4px 0 #000",
                background: "var(--panel-bg)",
                borderColor: "var(--panel-border)",
                color: "var(--foreground)",
              }}
            />

            <div className="text-xs font-semibold opacity-80">
              {loadingLookups ? "Memuat item lookup..." : "Lookup: border/sticker/badge siap"}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-extrabold">Starts at (opsional)</span>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
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
              <span className="text-xs font-extrabold">Ends at (opsional)</span>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                className="px-3 py-2 border-4 rounded-lg font-semibold"
                style={{
                  boxShadow: "4px 4px 0 #000",
                  background: "var(--panel-bg)",
                  borderColor: "var(--panel-border)",
                  color: "var(--foreground)",
                }}
              />
            </label>
          </div>

          <div className="overflow-auto">
            <table
              className="min-w-full border-4 rounded-lg overflow-hidden"
              style={{
                boxShadow: "6px 6px 0 #000",
                borderColor: "var(--panel-border)",
                color: "var(--foreground)",
              }}
            >
              <thead style={{ background: "var(--panel-bg)" }}>
                <tr>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>Day</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>Coin</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>Reward Type</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>Reward Item</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: normalizedDaysTotal }).map((_, idx) => {
                  const t = normalizedTypes[idx] || "NONE";
                  const opts = rewardOptionsForType(t);
                  const needsId = t !== "NONE";

                  return (
                    <tr key={idx}>
                      <td className="px-3 py-2 border-b-4 font-extrabold" style={{ borderColor: "var(--panel-border)" }}>
                        #{idx + 1}
                      </td>
                      <td className="px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>
                        <input
                          type="number"
                          min={0}
                          value={normalizedCoins[idx]}
                          onChange={(e) => setDayField(idx, { coin: e.target.value })}
                          className="w-[120px] px-3 py-2 border-4 rounded-lg font-semibold"
                          style={{
                            boxShadow: "4px 4px 0 #000",
                            background: "var(--panel-bg)",
                            borderColor: "var(--panel-border)",
                            color: "var(--foreground)",
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>
                        <select
                          value={t}
                          onChange={(e) => setDayField(idx, { type: e.target.value })}
                          className="px-3 py-2 border-4 rounded-lg font-extrabold"
                          style={{
                            boxShadow: "4px 4px 0 #000",
                            background: "var(--panel-bg)",
                            borderColor: "var(--panel-border)",
                            color: "var(--foreground)",
                          }}
                        >
                          {REWARD_TYPES.map((rt) => (
                            <option key={rt} value={rt}>
                              {rt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>
                        {needsId ? (
                          <select
                            value={normalizedIds[idx]}
                            onChange={(e) => setDayField(idx, { id: e.target.value })}
                            className="min-w-[260px] px-3 py-2 border-4 rounded-lg font-extrabold"
                            style={{
                              boxShadow: "4px 4px 0 #000",
                              background: "var(--panel-bg)",
                              borderColor: "var(--panel-border)",
                              color: "var(--foreground)",
                            }}
                          >
                            <option value={0}>Pilih item</option>
                            {opts.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-xs font-semibold opacity-70">(NONE)</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
      <div className="overflow-auto">
        <table
          className="min-w-full border-4 rounded-lg overflow-hidden"
          style={{
            boxShadow: "6px 6px 0 #000",
            borderColor: "var(--panel-border)",
            color: "var(--foreground)",
          }}
        >
          <thead style={{ background: "var(--panel-bg)" }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>ID</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>Active</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>Days</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>Starts</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>Ends</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: "var(--panel-border)" }}>{it.id}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: "var(--panel-border)" }}>{it.is_active ? "Ya" : "Tidak"}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: "var(--panel-border)" }}>{it.days_total}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: "var(--panel-border)" }}>{it.starts_at ? new Date(it.starts_at).toLocaleString() : "-"}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: "var(--panel-border)" }}>{it.ends_at ? new Date(it.ends_at).toLocaleString() : "-"}</td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(it)}
                      className="px-2 py-1 border-4 rounded font-extrabold"
                      style={{
                        boxShadow: "3px 3px 0 #000",
                        background: "var(--accent-edit)",
                        color: "var(--accent-edit-foreground)",
                        borderColor: "var(--panel-border)",
                      }}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={togglingId === it.id}
                      onClick={() => onToggle(it)}
                      className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60"
                      style={{
                        boxShadow: "3px 3px 0 #000",
                        background: "var(--panel-bg)",
                        color: "var(--foreground)",
                        borderColor: "var(--panel-border)",
                      }}
                    >
                      {togglingId === it.id ? "..." : "Toggle"}
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === it.id}
                      onClick={() => onDelete(it)}
                      className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60"
                      style={{
                        boxShadow: "3px 3px 0 #000",
                        background: "var(--panel-bg)",
                        color: "var(--foreground)",
                        borderColor: "var(--panel-border)",
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm opacity-70">
                  {loadingList ? "Memuat..." : "Belum ada config."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
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
          Prev
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
          Next
        </button>
      </div>
    </div>
  );
}
