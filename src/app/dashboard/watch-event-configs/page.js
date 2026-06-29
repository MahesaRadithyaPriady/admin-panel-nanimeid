'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Clapperboard, Film, Gift, Plus, Trash2, RefreshCw, Power, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import {
  listWatchEventConfigs,
  createWatchEventConfig,
  updateWatchEventConfig,
  toggleWatchEventConfig,
  deleteWatchEventConfig,
  listAvatarBorders,
  listStickers,
  listBadges,
} from '@/lib/api';
import { ANIMATIONS, STYLES, REWARD_TYPES, LABELS } from './constants';

// ============================================
// DUMMY DATA - Hapus saat API sudah siap
// ============================================
const USE_DUMMY_DATA = true;

const DUMMY_CONFIGS = [
  {
    id: 1,
    is_active: true,
    daily_reset: true,
    starts_at: null,
    ends_at: null,
    thresholds: [
      { id: 'T25', minutes: 30, episodes: null, coin_reward: 25, reward_type: 'NONE', reward_id: 0 },
      { id: 'T50', minutes: 60, episodes: null, coin_reward: 50, reward_type: 'NONE', reward_id: 0 },
      { id: 'T100', minutes: 120, episodes: null, coin_reward: 100, reward_type: 'STICKER', reward_id: 1 },
    ]
  },
  {
    id: 2,
    is_active: false,
    daily_reset: false,
    starts_at: '2024-12-01T00:00',
    ends_at: '2024-12-31T23:59',
    thresholds: [
      { id: 'EP3', minutes: null, episodes: 3, coin_reward: 30, reward_type: 'BADGE', reward_id: 1 },
      { id: 'EP10', minutes: null, episodes: 10, coin_reward: 200, reward_type: 'BORDER', reward_id: 1 },
    ]
  }
];

const DUMMY_REWARD_OPTIONS = {
  BADGE: [{ value: 1, label: 'Badge Pemula' }, { value: 2, label: 'Badge Pro' }],
  STICKER: [{ value: 1, label: 'Sticker Anime' }, { value: 2, label: 'Sticker Emoji' }],
  BORDER: [{ value: 1, label: 'Border Emas' }, { value: 2, label: 'Border Perak' }],
  ITEM: [{ value: 1, label: 'Item Spesial' }]
};

// ============================================
// Helper Functions
// ============================================
function toIsoOrNull(v) {
  const s = String(v || "").trim();
  if (!s) return null;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function fromIsoToDateTimeLocal(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const Y = dt.getFullYear();
  const M = pad(dt.getMonth() + 1);
  const D = pad(dt.getDate());
  const h = pad(dt.getHours());
  const m = pad(dt.getMinutes());
  return `${Y}-${M}-${D}T${h}:${m}`;
}

function randomThresholdId() {
  return `T${Math.floor(1000 + Math.random() * 9000)}`;
}

// ============================================
// Main Component
// ============================================
export function WatchEventConfigsContent({ embedded = false } = {}) {
  const router = useRouter();
  const { user, loading } = useSession();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canAccess = permissions.includes("watch-event-configs") || String(user?.role || "").toLowerCase() === "superadmin";

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [filterActive, setFilterActive] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  const [borders, setBorders] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [badges, setBadges] = useState([]);

  const [mode, setMode] = useState("add");
  const [form, setForm] = useState({
    id: null,
    is_active: false,
    daily_reset: true,
    thresholds: [{ id: "T25", minutes: 25, episodes: "", coin_reward: 10, reward_type: "NONE", reward_id: 0 }],
    starts_at: "",
    ends_at: "",
  });

  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Load data
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!embedded && !loading && user && !canAccess) {
      router.replace("/dashboard");
    }
  }, [embedded, loading, user, canAccess, router]);

  // Load lookups
  useEffect(() => {
    if (USE_DUMMY_DATA) {
      setBorders(DUMMY_REWARD_OPTIONS.BORDER);
      setStickers(DUMMY_REWARD_OPTIONS.STICKER);
      setBadges(DUMMY_REWARD_OPTIONS.BADGE);
      return;
    }
    
    const token = getSession()?.token;
    if (!token) return;

    const loadLookups = async () => {
      try {
        const [b, s, g] = await Promise.all([
          listAvatarBorders({ token }),
          listStickers({ token }),
          listBadges({ token }),
        ]);
        setBorders(Array.isArray(b) ? b : []);
        setStickers(Array.isArray(s) ? s : []);
        setBadges(Array.isArray(g) ? g : []);
      } catch {
        // silent fail
      }
    };
    loadLookups();
  }, []);

  // Load list
  const loadList = async () => {
    if (USE_DUMMY_DATA) {
      setItems(DUMMY_CONFIGS);
      setTotal(DUMMY_CONFIGS.length);
      return;
    }
    
    const token = getSession()?.token;
    if (!token) return;
    try {
      setLoadingList(true);
      const res = await listWatchEventConfigs({ token, page, limit, isActive: filterActive || undefined });
      setItems(Array.isArray(res?.data) ? res.data : []);
      setTotal(res?.meta?.total || 0);
    } catch (err) {
      toast.error(err?.message || "Gagal memuat config");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!USE_DUMMY_DATA) loadList();
  }, [page, limit, filterActive]);

  // Initial load for dummy data
  useEffect(() => {
    if (USE_DUMMY_DATA) loadList();
  }, []);

  const rewardOptionsForType = (type) => {
    if (USE_DUMMY_DATA) return DUMMY_REWARD_OPTIONS[type] || [];
    
    switch (type) {
      case "BORDER": return borders.map((x) => ({ value: x.id, label: x.name }));
      case "STICKER": return stickers.map((x) => ({ value: x.id, label: x.name }));
      case "BADGE": return badges.map((x) => ({ value: x.id, label: x.name }));
      default: return [];
    }
  };

  const normalizedThresholds = useMemo(() => {
    return (Array.isArray(form.thresholds) ? form.thresholds : []).map((t, i) => ({
      ...t,
      key: t.id || `thr-${i}-${Math.random().toString(36).slice(2, 8)}`,
    }));
  }, [form.thresholds]);

  const resetForm = () => {
    setMode("add");
    setForm({
      id: null,
      is_active: false,
      daily_reset: true,
      thresholds: [{ id: randomThresholdId(), minutes: "", episodes: "", coin_reward: 0, reward_type: "NONE", reward_id: 0 }],
      starts_at: "",
      ends_at: "",
    });
  };

  const onEdit = (it) => {
    setMode("edit");
    setForm({
      id: it.id,
      is_active: !!it.is_active,
      daily_reset: !!it.daily_reset,
      starts_at: fromIsoToDateTimeLocal(it.starts_at),
      ends_at: fromIsoToDateTimeLocal(it.ends_at),
      thresholds: Array.isArray(it.thresholds) && it.thresholds.length > 0
        ? it.thresholds.map((t) => ({ ...t, reward_type: String(t.reward_type || "NONE").toUpperCase() }))
        : [{ id: randomThresholdId(), minutes: "", episodes: "", coin_reward: 0, reward_type: "NONE", reward_id: 0 }],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");

    const payload = {
      is_active: !!form.is_active,
      daily_reset: !!form.daily_reset,
      starts_at: toIsoOrNull(form.starts_at),
      ends_at: toIsoOrNull(form.ends_at),
      thresholds: (Array.isArray(form.thresholds) ? form.thresholds : []).map((t) => ({
        id: String(t.id || "").trim(),
        minutes: t.minutes === "" || t.minutes == null ? null : Number(t.minutes),
        episodes: t.episodes === "" || t.episodes == null ? null : Number(t.episodes),
        coin_reward: Number(t.coin_reward || 0),
        reward_type: String(t.reward_type || "NONE").toUpperCase(),
        reward_id: t.reward_type && t.reward_type !== "NONE" ? Number(t.reward_id || 0) : 0,
      })),
    };

    try {
      setSaving(true);
      if (mode === "add") {
        await createWatchEventConfig({ token, ...payload });
        toast.success("Config ditambahkan");
      } else {
        await updateWatchEventConfig({ token, id: form.id, ...payload });
        toast.success("Config diperbarui");
      }
      resetForm();
      await loadList();
    } catch (err) {
      toast.error(err?.message || "Gagal menyimpan config");
    } finally {
      setSaving(false);
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

  const activeCount = useMemo(() => items.filter((it) => !!it?.is_active).length, [items]);
  const totalThresholds = useMemo(() => items.reduce((sum, it) => sum + (Array.isArray(it?.thresholds) ? it.thresholds.length : 0), 0), [items]);

  if (loading || !user) return null;

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 20)));

  return (
    <motion.div variants={ANIMATIONS.page} initial="hidden" animate="visible" className="space-y-5">
      {/* Header & Stats */}
      <div className="space-y-4">
        <div className={`${STYLES.card} p-5 sm:p-6`} style={STYLES.cardShadow}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Clapperboard className="w-5 h-5" />
                <span className="label uppercase">Watch Event</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)] flex items-center gap-2">
                <Film className="w-6 h-6" /> Konfigurasi Event Tonton
              </h2>
              <p className="mt-2 text-sm text-[var(--foreground)]/60 max-w-lg">
                Atur reward berdasarkan menit/episode nonton. User dapat klaim reward saat mencapai threshold.
              </p>
            </div>
            <button onClick={loadList} disabled={loadingList} className="btn btn--secondary btn--sm">
              <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{loadingList ? 'Memuat...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Config" value={total} />
          <StatCard label="Aktif" value={activeCount} tone="active" />
          <StatCard label="Mode" value={mode === 'add' ? 'Tambah' : `Edit #${form.id}`} />
          <StatCard label="Threshold" value={totalThresholds} />
        </div>
      </div>

      {/* Filter */}
      <div className={`${STYLES.card} p-4`} style={STYLES.cardShadow}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-sm font-bold text-[var(--foreground)]/70">Filter Config</div>
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <select value={filterActive} onChange={(e) => { setPage(1); setFilterActive(e.target.value); }} className="select">
              <option value="">Semua</option>
              <option value="true">Aktif saja</option>
              <option value="false">Nonaktif saja</option>
            </select>
            <div className="label">Total: <span className="font-bold">{total}</span> config</div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className={`${STYLES.card} p-4 sm:p-5`} style={STYLES.cardShadow}>
        <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-[var(--panel-border)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--foreground)]">{form.id ? `Edit Config #${form.id}` : 'Tambah Config Baru'}</h3>
            <p className="text-xs text-[var(--foreground)]/60 mt-0.5">{LABELS.thresholdCount(normalizedThresholds.length)}</p>
          </div>
          {form.id && (
            <button type="button" onClick={resetForm} className="btn btn--secondary btn--sm">Reset Form</button>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Settings Row */}
          <div className="grid lg:grid-cols-[200px_1fr] gap-4">
            <div className={`${STYLES.card} p-3 bg-blue-500/5`} style={{ ...STYLES.cardShadow, borderColor: 'var(--panel-border)' }}>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded border-2" />
                  <span>{LABELS.isActive}</span>
                </label>
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                  <input type="checkbox" checked={!!form.daily_reset} onChange={(e) => setForm(f => ({ ...f, daily_reset: e.target.checked }))} className="w-4 h-4 rounded border-2" />
                  <span>{LABELS.dailyReset}</span>
                </label>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <DateInput label={LABELS.startsAt} value={form.starts_at} onChange={(v) => setForm(f => ({ ...f, starts_at: v }))} />
              <DateInput label={LABELS.endsAt} value={form.ends_at} onChange={(v) => setForm(f => ({ ...f, ends_at: v }))} />
            </div>
          </div>

          {/* Threshold Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[var(--foreground)]">Threshold Reward</h4>
              <button type="button" onClick={() => setForm(f => ({ ...f, thresholds: [...(Array.isArray(f.thresholds) ? f.thresholds : []), { id: randomThresholdId(), minutes: "", episodes: "", coin_reward: 0, reward_type: "NONE", reward_id: 0 }] }))} className="btn btn--secondary btn--sm">
                <Plus className="w-3.5 h-3.5" /> {LABELS.addThreshold}
              </button>
            </div>

            <div className="space-y-2">
              {normalizedThresholds.map((t, idx) => (
                <ThresholdRow key={t.key} data={t} index={idx}
                  onChange={(field, value) => { setForm(f => { const arr = [...(Array.isArray(f.thresholds) ? f.thresholds : [])]; arr[idx] = { ...arr[idx], [field]: value }; return { ...f, thresholds: arr }; }); }}
                  onDelete={() => { setForm(f => { const arr = [...(Array.isArray(f.thresholds) ? f.thresholds : [])]; arr.splice(idx, 1); return { ...f, thresholds: arr.length > 0 ? arr : [{ id: randomThresholdId(), minutes: "", episodes: "", coin_reward: 0, reward_type: "NONE", reward_id: 0 }] }; }); }}
                  rewardOptions={rewardOptionsForType(String(t.reward_type || 'NONE').toUpperCase())} />
              ))}
              {normalizedThresholds.length === 0 && (
                <div className="text-center py-6 text-sm text-[var(--foreground)]/50 border-2 border-dashed border-[var(--panel-border)] rounded-xl">
                  Belum ada threshold. Klik "{LABELS.addThreshold}" untuk menambahkan.
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3" style={{ borderTop: '2px solid var(--border)' }}>
            <button type="submit" disabled={saving} className="btn btn--primary">
              {saving ? 'Menyimpan...' : (form.id ? 'Simpan Perubahan' : 'Tambah Config')}
            </button>
          </div>
        </form>
      </div>

      {/* Config List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-[var(--foreground)]/70">Daftar Config ({items.length} item)</h3>
        </div>

        {items.map((cfg) => (
          <ConfigCard key={cfg.id} data={cfg} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete}
            loadingList={loadingList} togglingId={togglingId} deletingId={deletingId} />
        ))}

        {items.length === 0 && !loadingList && (
          <div className={`${STYLES.card} p-8 text-center`} style={STYLES.cardShadow}>
            <Gift className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
            <div className="text-lg font-bold text-[var(--foreground)]">Belum ada config</div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn btn--secondary btn--sm">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="mono text-sm font-bold">Halaman {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn btn--secondary btn--sm">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// Sub Components
// ============================================
function DateInput({ label, value, onChange }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold text-[var(--foreground)]/70">{label}</span>
      <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border-2 bg-[var(--panel-bg)] text-[var(--foreground)] text-sm font-bold"
        style={{ boxShadow: 'var(--shadow-sm)', borderColor: 'var(--panel-border)' }} />
    </label>
  );
}

function ThresholdRow({ data, index, onChange, onDelete, rewardOptions }) {
  const rt = String(data.reward_type || 'NONE').toUpperCase();
  const needsRewardId = rt !== 'NONE';

  return (
    <div className="p-3 rounded-xl border-2 bg-[var(--panel-bg)]" style={{ borderColor: 'var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2 lg:w-24">
          <span className="px-2 py-0.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-black">#{index + 1}</span>
        </div>

        <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input type="text" placeholder="ID" value={data.id || ''} onChange={(e) => onChange('id', e.target.value)}
            className="px-2 py-1.5 rounded-lg border-2 bg-[var(--panel-bg)] text-sm font-bold" style={{ borderColor: 'var(--panel-border)' }} />
          <input type="number" placeholder="Koin" value={data.coin_reward || 0} onChange={(e) => onChange('coin_reward', parseInt(e.target.value) || 0)}
            className="px-2 py-1.5 rounded-lg border-2 bg-[var(--panel-bg)] text-sm font-bold" style={{ borderColor: 'var(--panel-border)' }} />
          <input type="number" placeholder="Menit" value={data.minutes || ''} onChange={(e) => onChange('minutes', e.target.value)}
            className="px-2 py-1.5 rounded-lg border-2 bg-[var(--panel-bg)] text-sm font-bold" style={{ borderColor: 'var(--panel-border)' }} />
          <input type="number" placeholder="Episode" value={data.episodes || ''} onChange={(e) => onChange('episodes', e.target.value)}
            className="px-2 py-1.5 rounded-lg border-2 bg-[var(--panel-bg)] text-sm font-bold" style={{ borderColor: 'var(--panel-border)' }} />
          <select value={rt} onChange={(e) => onChange('reward_type', e.target.value)}
            className="px-2 py-1.5 rounded-lg border-2 bg-[var(--panel-bg)] text-sm font-bold" style={{ borderColor: 'var(--panel-border)' }}>
            {Object.entries(REWARD_TYPES).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
          </select>
        </div>

        {needsRewardId && (
          <select value={data.reward_id || 0} onChange={(e) => onChange('reward_id', parseInt(e.target.value))}
            className="lg:w-32 px-2 py-1.5 rounded-lg border-2 bg-[var(--panel-bg)] text-sm font-bold" style={{ borderColor: 'var(--panel-border)' }}>
            <option value={0}>Pilih {REWARD_TYPES[rt]?.label}</option>
            {rewardOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        )}

        <button type="button" onClick={onDelete} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ConfigCard({ data, onEdit, onToggle, onDelete, loadingList, togglingId, deletingId }) {
  const thresholds = Array.isArray(data.thresholds) ? data.thresholds : [];
  const isActive = !!data.is_active;

  return (
    <div className="p-4 rounded-2xl border-2 bg-[var(--panel-bg)]" style={{ borderColor: 'var(--panel-border)', boxShadow: 'var(--shadow-md)', opacity: loadingList ? 0.7 : 1 }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-md bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-black">Config #{data.id}</span>
          {isActive ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center gap-1"><Power className="w-3 h-3" /> Aktif</span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-gray-400/10 text-gray-500 text-xs font-bold flex items-center gap-1"><Power className="w-3 h-3" /> Nonaktif</span>
          )}
          {data.daily_reset && <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold">Reset Harian</span>}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(data)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button onClick={() => onToggle(data)} disabled={togglingId === data.id} className={`p-1.5 rounded-lg ${isActive ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-gray-400 hover:bg-gray-400/10'}`}>
            <Power className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(data)} disabled={deletingId === data.id} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-xs text-[var(--foreground)]/60 mb-2">
        {data.starts_at ? new Date(data.starts_at).toLocaleString('id-ID') : 'Tanpa batas mulai'} → {data.ends_at ? new Date(data.ends_at).toLocaleString('id-ID') : 'Tanpa batas selesai'}
      </div>

      {thresholds.length > 0 && (
        <div className="border-t border-[var(--panel-border)] pt-2">
          <div className="flex flex-wrap gap-1.5">
            {thresholds.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--background)] border border-[var(--panel-border)] text-xs">
                <span className="font-black text-[var(--accent-primary)]">{t.id || '?'}</span>
                {t.minutes && <span className="text-[var(--foreground)]/60">{t.minutes}m</span>}
                {t.episodes && <span className="text-[var(--foreground)]/60">{t.episodes}ep</span>}
                <span className="font-bold text-emerald-600">{t.coin_reward || 0}🪙</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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

export default function WatchEventConfigsPage() {
  return <WatchEventConfigsContent />;
}
