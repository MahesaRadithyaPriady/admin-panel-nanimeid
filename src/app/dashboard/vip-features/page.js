"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Crown, Save, RefreshCw, Plus, Pencil, Trash2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { getSession } from "@/lib/auth";
import {
  listVipPlans,
  listVipTiers,
  createVipTier,
  updateVipTier,
  deleteVipTier,
  toggleVipTierStatus,
  listVipFeatureRequirements,
  updateVipFeatureRequirement,
  toggleVipFeatureRequirement,
} from "@/lib/api";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn btn--sm ${active ? 'btn--primary' : 'btn--secondary'}`}
    >
      {children}
    </button>
  );
}

export default function VipFeaturesPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canTier = permissions.includes("vip-tiers") || String(user?.role || "").toLowerCase() === "superadmin";
  const canRequirement =
    permissions.includes("vip-feature-requirements") || String(user?.role || "").toLowerCase() === "superadmin";

  const [activeSection, setActiveSection] = useState("tier");

  // VIP Plans state (source for tier name dropdown)
  const [plans, setPlans] = useState([]);
  const [includeInactivePlans, setIncludeInactivePlans] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // VIP Tiers state
  const [tiers, setTiers] = useState([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [tierMode, setTierMode] = useState("add"); // add | edit
  const [tierForm, setTierForm] = useState({ id: null, name: "", rank: "", is_active: true });
  const [submittingTier, setSubmittingTier] = useState(false);
  const [togglingTierId, setTogglingTierId] = useState(null);
  const [deletingTierId, setDeletingTierId] = useState(null);

  // Requirement state
  const [requirements, setRequirements] = useState([]);
  const [loadingReq, setLoadingReq] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!canTier && canRequirement) setActiveSection("requirement");
    if (!canRequirement && canTier) setActiveSection("tier");
  }, [canTier, canRequirement]);

  const activePlanNames = useMemo(() => {
    const items = Array.isArray(plans) ? plans : [];
    return items
      .filter((p) => p && p.is_active)
      .map((p) => String(p.name || "").trim())
      .filter(Boolean);
  }, [plans]);

  const activeTierNames = useMemo(() => {
    const items = Array.isArray(tiers) ? tiers : [];
    return items
      .filter((t) => t && t.is_active)
      .map((t) => String(t.name || "").trim())
      .filter(Boolean);
  }, [tiers]);

  const loadPlans = async (opts = {}) => {
    setLoadingPlans(true);
    try {
      const token = getSession()?.token;
      const data = await listVipPlans({ token, page: 1, pageSize: 100, includeInactive: includeInactivePlans, ...opts });
      setPlans(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      toast.error(err?.message || "Gagal memuat VIP plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadTiers = async () => {
    setLoadingTiers(true);
    try {
      const token = getSession()?.token;
      const data = await listVipTiers({ token, page: 1, limit: 200 });
      setTiers(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      toast.error(err?.message || "Gagal memuat VIP tiers");
    } finally {
      setLoadingTiers(false);
    }
  };

  const loadRequirements = async () => {
    setLoadingReq(true);
    try {
      const token = getSession()?.token;
      const data = await listVipFeatureRequirements({ token, page: 1, limit: 200 });
      const items = Array.isArray(data.items) ? data.items : [];
      setRequirements(
        items.map((it) => ({
          ...it,
          _draft_min_tier_name: it.min_tier_name ?? "",
        }))
      );
    } catch (err) {
      toast.error(err?.message || "Gagal memuat VIP feature requirements");
    } finally {
      setLoadingReq(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (canTier) loadPlans();
    if (canTier) loadTiers();
    if (canRequirement) loadRequirements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canTier, canRequirement, includeInactivePlans]);

  const resetTierForm = () => {
    setTierMode("add");
    setTierForm({ id: null, name: "", rank: "", is_active: true });
  };

  const onSubmitTier = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");
    if (!tierForm.name) return toast.error("Nama tier wajib dipilih");
    if (tierForm.rank === "" || tierForm.rank === null || tierForm.rank === undefined) return toast.error("Rank wajib diisi");

    const payload = {
      name: String(tierForm.name).trim(),
      rank: Number(tierForm.rank),
      is_active: !!tierForm.is_active,
    };

    try {
      setSubmittingTier(true);
      if (tierMode === "add") {
        const res = await createVipTier({ token, payload });
        toast.success(res?.message || "VIP tier dibuat");
      } else {
        const res = await updateVipTier({ token, id: tierForm.id, payload });
        toast.success(res?.message || "VIP tier diupdate");
      }
      resetTierForm();
      await loadTiers();
    } catch (err) {
      toast.error(err?.message || "Gagal menyimpan VIP tier");
    } finally {
      setSubmittingTier(false);
    }
  };

  const onEditTier = (t) => {
    setTierMode("edit");
    setTierForm({
      id: t.id,
      name: t.name || "",
      rank: typeof t.rank === "number" ? String(t.rank) : t.rank || "",
      is_active: !!t.is_active,
    });
  };

  const onToggleTier = async (t) => {
    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");
    try {
      setTogglingTierId(t.id);
      const res = await toggleVipTierStatus({ token, id: t.id, is_active: !t.is_active });
      toast.success(res?.message || "Status VIP tier diupdate");
      await loadTiers();
    } catch (err) {
      toast.error(err?.message || "Gagal mengubah status VIP tier");
    } finally {
      setTogglingTierId(null);
    }
  };

  const onDeleteTier = async (t) => {
    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");
    try {
      setDeletingTierId(t.id);
      const res = await deleteVipTier({ token, id: t.id });
      toast.success(res?.message || "VIP tier dihapus");
      if (tierMode === "edit" && tierForm.id === t.id) resetTierForm();
      await loadTiers();
    } catch (err) {
      toast.error(err?.message || "Gagal menghapus VIP tier");
    } finally {
      setDeletingTierId(null);
    }
  };

  const onSaveRequirement = async (row) => {
    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");
    if (!row?.id) return toast.error("ID requirement tidak valid");

    const minTier = String(row._draft_min_tier_name || "").trim();
    if (!minTier) return toast.error("Min tier wajib dipilih");

    try {
      setSavingId(row.id);
      const res = await updateVipFeatureRequirement({
        token,
        id: row.id,
        payload: { min_tier_name: minTier, is_enabled: !!row.is_enabled },
      });
      toast.success(res?.message || "Requirement diupdate");
      await loadRequirements();
    } catch (err) {
      toast.error(err?.message || "Gagal update requirement");
    } finally {
      setSavingId(null);
    }
  };

  const onToggleRequirement = async (row) => {
    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");
    if (!row?.id) return toast.error("ID requirement tidak valid");

    try {
      setTogglingId(row.id);
      const res = await toggleVipFeatureRequirement({ token, id: row.id, is_enabled: !row.is_enabled });
      toast.success(res?.message || "Status diupdate");
      await loadRequirements();
    } catch (err) {
      toast.error(err?.message || "Gagal toggle requirement");
    } finally {
      setTogglingId(null);
    }
  };

  if (loading || !user) return null;

  const availableSections = [
    canTier ? "tier" : null,
    canRequirement ? "requirement" : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <Crown className="size-5" /> VIP Tier & Requirement
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {availableSections.includes("tier") && (
          <Chip active={activeSection === "tier"} onClick={() => setActiveSection("tier")}>Tier</Chip>
        )}
        {availableSections.includes("requirement") && (
          <Chip active={activeSection === "requirement"} onClick={() => setActiveSection("requirement")}>Requirement</Chip>
        )}
      </div>

      {availableSections.length === 0 ? (
        <div className="card p-4 text-sm font-semibold">
          Kamu tidak punya permission untuk mengakses menu ini.
        </div>
      ) : null}

      {activeSection === "tier" && canTier ? (
        <section className="space-y-4">
          <div className="card p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-extrabold">VIP Tiers</div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={includeInactivePlans}
                    onChange={(e) => setIncludeInactivePlans(e.target.checked)}
                  />
                  <span>Termasuk nonaktif</span>
                </label>
                <button
                  type="button"
                  onClick={async () => { await loadPlans(); await loadTiers(); }}
                  className="btn btn--secondary inline-flex items-center gap-2"
                >
                  <RefreshCw className="size-4" /> Refresh
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs font-semibold opacity-80">
              Saat tambah/edit VIP tier, pilihan nama tier diambil dari VIP Plan.
            </div>
          </div>

          <div className="card p-3 space-y-3">
            <div className="text-sm font-extrabold">{tierMode === "add" ? "Tambah VIP Tier" : "Edit VIP Tier"}</div>
            <form onSubmit={onSubmitTier} className="grid sm:grid-cols-[1fr_140px_140px_200px] gap-3 items-center">
              <select
                value={tierForm.name}
                onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))}
                className="select w-full"
              >
                <option value="">Pilih nama tier (dari VIP Plan aktif)</option>
                {activePlanNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={tierForm.rank}
                onChange={(e) => setTierForm((f) => ({ ...f, rank: e.target.value }))}
                placeholder="Rank"
                className="input w-full"
              />

              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!tierForm.is_active}
                  onChange={(e) => setTierForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                <span>Aktif</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submittingTier}
                  className={`btn disabled:opacity-60 inline-flex items-center gap-2 ${tierMode === 'add' ? 'btn--primary' : 'btn--secondary'}`}
                >
                  {tierMode === "add" ? <Plus className="size-4" /> : <Pencil className="size-4" />}
                  {submittingTier ? (tierMode === "add" ? "Menambah..." : "Menyimpan...") : tierMode === "add" ? "Tambah" : "Simpan"}
                </button>
                {tierMode === "edit" ? (
                  <button type="button" onClick={resetTierForm} className="btn btn--secondary">Batal</button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="overflow-auto">
            <table
              className="min-w-full border-4 border-[var(--border)] text-sm"
              style={{ boxShadow: 'var(--shadow-lg)' }}
            >
              <thead className="bg-[var(--panel-bg)]">
                <tr>
                  <th className="text-left px-3 py-2 font-extrabold border-b-4 border-[var(--border)]">Name</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-4 border-[var(--border)]">Rank</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-4 border-[var(--border)]">Active</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-4 border-[var(--border)]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 border-b-4 border-[var(--border)] font-semibold">{t.name}</td>
                    <td className="px-3 py-2 border-b-4 border-[var(--border)] font-semibold">{t.rank}</td>
                    <td className="px-3 py-2 border-b-4 border-[var(--border)] font-semibold">
                      <button
                        type="button"
                        disabled={togglingTierId === t.id}
                        onClick={() => onToggleTier(t)}
                        className="btn btn--secondary btn--sm disabled:opacity-60"
                      >
                        {togglingTierId === t.id ? "..." : t.is_active ? "On" : "Off"}
                      </button>
                    </td>
                    <td className="px-3 py-2 border-b-4 border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => onEditTier(t)} className="btn btn--secondary btn--sm">
                          <Pencil className="size-4" />
                        </button>
                        <button type="button" disabled={deletingTierId === t.id} onClick={() => onDeleteTier(t)} className="btn btn--danger btn--sm disabled:opacity-60">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tiers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm opacity-70">
                      {loadingTiers ? "Memuat..." : "Belum ada VIP tier."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeSection === "requirement" && canRequirement ? (
        <section className="space-y-4">
          <div className="card p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-extrabold">VIP Feature Requirements</div>
              <button type="button" onClick={() => loadRequirements()} className="btn btn--secondary inline-flex items-center gap-2">
                <RefreshCw className="size-4" /> Refresh
              </button>
            </div>
            <div className="mt-2 text-xs font-semibold opacity-80">
              Min tier harus cocok dengan VIP Tier yang aktif.
            </div>
          </div>

          <div className="overflow-auto">
            <table
              className="min-w-full border-4 border-[var(--border)] text-sm"
              style={{ boxShadow: 'var(--shadow-lg)' }}
            >
              <thead className="bg-[var(--panel-bg)]">
                <tr>
                  <th className="text-left px-3 py-2 font-extrabold border-b-4 border-[var(--border)]">Feature</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-4 border-[var(--border)]">Min Tier</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-4 border-[var(--border)]">Enabled</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-4 border-[var(--border)]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 border-b-4 border-[var(--border)] font-semibold">{r.feature}</td>
                    <td className="px-3 py-2 border-b-4 border-[var(--border)] font-semibold">
                      <select
                        value={r._draft_min_tier_name}
                        onChange={(e) =>
                          setRequirements((prev) =>
                            prev.map((x) => (x.id === r.id ? { ...x, _draft_min_tier_name: e.target.value } : x))
                          )
                        }
                        className="select w-full"
                      >
                        <option value="">Pilih tier</option>
                        {activeTierNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 border-b-4 border-[var(--border)] font-semibold">
                      <button
                        type="button"
                        disabled={togglingId === r.id}
                        onClick={() => onToggleRequirement(r)}
                        className="btn btn--secondary btn--sm disabled:opacity-60"
                      >
                        {togglingId === r.id ? "..." : r.is_enabled ? "On" : "Off"}
                      </button>
                    </td>
                    <td className="px-3 py-2 border-b-4 border-[var(--border)]">
                      <button
                        type="button"
                        disabled={savingId === r.id}
                        onClick={() => onSaveRequirement(r)}
                        className="btn btn--primary btn--sm disabled:opacity-60 inline-flex items-center gap-2"
                      >
                        <Save className="size-4" /> {savingId === r.id ? "Menyimpan..." : "Simpan"}
                      </button>
                    </td>
                  </tr>
                ))}
                {requirements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm opacity-70">
                      {loadingReq ? "Memuat..." : "Belum ada requirement."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {!canTier ? (
            <div className="card p-4 text-xs font-semibold">
              Catatan: kamu tidak punya permission untuk melihat section Tier. Dropdown min tier tetap mencoba pakai VIP Plan aktif yang sempat dimuat.
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
