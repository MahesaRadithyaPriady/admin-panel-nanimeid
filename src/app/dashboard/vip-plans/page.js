"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Crown, Plus, Pencil, Trash2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { getSession } from "@/lib/auth";
import {
  listVipPlans,
  createVipPlan,
  updateVipPlan,
  deleteVipPlan,
  toggleVipPlanStatus,
} from "@/lib/api";

export default function VipPlansPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [mode, setMode] = useState("add"); // add | edit
  const [form, setForm] = useState({
    id: null,
    name: "",
    description: "",
    benefits: "",
    price_coins: "",
    color: "#FFD700",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = { page, pageSize, includeInactive, ...opts };
      const data = await listVipPlans({ token, ...params });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(data.page || 1);
      setPageSize(data.pageSize || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || "Gagal memuat VIP plans");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, includeInactive, user]);

  const resetForm = () => {
    setMode("add");
    setForm({
      id: null,
      name: "",
      description: "",
      benefits: "",
      price_coins: "",
      color: "#FFD700",
      is_active: true,
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error("Name wajib diisi");
    if (!form.price_coins) return toast.error("Harga koin wajib diisi");
    if (!form.color) return toast.error("Color wajib diisi");

    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");

    const payload = {
      name: form.name,
      description: form.description || undefined,
      benefits:
        form.benefits
          .split("\n")
          .map((b) => b.trim())
          .filter(Boolean) || [],
      price_coins: Number(form.price_coins),
      color: form.color,
      is_active: !!form.is_active,
    };

    try {
      setSubmitting(true);
      if (mode === "add") {
        const res = await createVipPlan({ token, payload });
        toast.success(res?.message || "VIP plan dibuat");
      } else {
        const res = await updateVipPlan({ token, id: form.id, payload });
        toast.success(res?.message || "VIP plan diupdate");
      }
      resetForm();
      setPage(1);
      await loadList({ page: 1 });
    } catch (err) {
      toast.error(err?.message || "Gagal menyimpan VIP plan");
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = (it) => {
    setMode("edit");
    setForm({
      id: it.id,
      name: it.name || "",
      description: it.description || "",
      benefits: Array.isArray(it.benefits) ? it.benefits.join("\n") : "",
      price_coins:
        typeof it.price_coins === "number" ? String(it.price_coins) : it.price_coins || "",
      color: it.color || "#FFD700",
      is_active: !!it.is_active,
    });
  };

  const onToggleActive = async (it) => {
    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");
    try {
      const res = await toggleVipPlanStatus({ token, id: it.id, is_active: !it.is_active });
      toast.success(res?.message || "Status VIP plan diupdate");
      await loadList();
    } catch (err) {
      toast.error(err?.message || "Gagal mengubah status VIP plan");
    }
  };

  const onRequestDelete = (it) => {
    setDeleteTarget(it);
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    const token = getSession()?.token;
    if (!token) return toast.error("Token tidak tersedia");
    try {
      setDeleting(true);
      const res = await deleteVipPlan({ token, id: deleteTarget.id });
      toast.success(res?.message || "VIP plan dihapus");
      setDeleteTarget(null);
      await loadList();
    } catch (err) {
      toast.error(err?.message || "Gagal menghapus VIP plan");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !user) return null;

  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <Crown className="size-5" /> VIP Plans
        </h2>
      </div>

      {/* Filter */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => {
                  setPage(1);
                  setIncludeInactive(e.target.checked);
                }}
              />
              <span>Termasuk yang nonaktif</span>
            </label>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>Total: {total}</span>
          </div>
        </div>
      </div>

      {/* Form Tambah / Edit VIP Plan */}
      <div className="card p-3 space-y-3">
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1">
              <div className="text-xs font-extrabold">Name</div>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nama paket (wajib, unik)"
                className="input w-full"
              />
            </div>
            <div className="grid gap-1">
              <div className="text-xs font-extrabold">Price (coins)</div>
              <input
                type="number"
                value={form.price_coins}
                onChange={(e) => setForm((f) => ({ ...f, price_coins: e.target.value }))}
                placeholder="Harga koin (wajib)"
                className="input w-full"
              />
            </div>
          </div>

          <div className="grid gap-1">
            <div className="text-xs font-extrabold">Description</div>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Deskripsi (opsional)"
              rows={2}
              className="input w-full resize-none"
            />
          </div>

          <div className="grid gap-1">
            <div className="text-xs font-extrabold">Benefits</div>
            <textarea
              value={form.benefits}
              onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))}
              placeholder={"Benefits, satu per baris (misal: \nNo ads\n1080p\nEarly access)"}
              rows={3}
              className="input w-full resize-none text-sm"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 items-center">
            <div className="grid gap-1">
              <div className="text-xs font-extrabold">Color</div>
              <input
                type="text"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                placeholder="Warna hex, contoh #FFD700 (wajib)"
                className="input w-full"
              />
            </div>
            <div className="grid gap-1">
              <div className="text-xs font-extrabold">Status</div>
              <label className="flex items-center gap-2 text-sm font-semibold px-3 py-2 border-2 border-[var(--border)]" style={{ boxShadow: 'var(--shadow-md)' }}>
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                <span>Aktif</span>
              </label>
            </div>
          </div>

          <div className="grid sm:grid-cols-[160px_auto] gap-3 items-center">
            <button
              type="submit"
              disabled={submitting}
              className={`btn disabled:opacity-60 inline-flex items-center gap-2 ${mode === 'add' ? 'btn--primary' : 'btn--secondary'}`}
            >
              {submitting ? (
                mode === "add" ? "Menambah..." : "Menyimpan..."
              ) : mode === "add" ? (
                <><Plus className="size-4" /> Tambah</>
              ) : (
                <><Pencil className="size-4" /> Simpan</>
              )}
            </button>
            {mode === "edit" && (
              <button
                type="button"
                onClick={resetForm}
                className="btn btn--secondary"
              >
                Batal Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tabel List VIP Plans */}
      <div className="overflow-auto">
        <table
          className="min-w-full border-2 border-[var(--border)] text-sm"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          <thead className="bg-[var(--panel-bg)]">
            <tr>
              <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">ID</th>
              <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Name</th>
              <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Price (coins)</th>
              <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Color</th>
              <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Active</th>
              <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.id}</td>
                <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.name}</td>
                <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.price_coins}</td>
                <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">
                  <span
                    className="inline-flex items-center gap-2 px-2 py-1 border-2 border-[var(--border)] text-xs font-bold"
                    style={{ background: it.color || "#FFF", color: "#000" }}
                  >
                    <span className="inline-block w-3 h-3 border border-[var(--border)]/20" style={{ background: it.color || "#FFF" }} />
                    {it.color}
                  </span>
                </td>
                <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.is_active ? "Ya" : "Tidak"}</td>
                <td className="px-3 py-2 border-b-2 border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onEdit(it)} className="btn btn--secondary btn--sm">
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" onClick={() => onToggleActive(it)} className="btn btn--secondary btn--sm">
                      {it.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button type="button" onClick={() => onRequestDelete(it)} className="btn btn--danger btn--sm">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-sm opacity-70"
                >
                  {loadingList ? "Memuat..." : "Belum ada VIP plan."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="btn btn--secondary disabled:opacity-60"
        >
          Prev
        </button>
        <div className="text-sm font-extrabold">
          Halaman {page} / {totalPages}
        </div>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="btn btn--secondary disabled:opacity-60"
        >
          Next
        </button>
      </div>

      {/* Konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 w-[92%] max-w-md card p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)' }}>
            <div className="mb-3 text-sm font-semibold">
              Hapus VIP plan {deleteTarget?.name}?
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="btn btn--secondary disabled:opacity-60">Batal</button>
              <button type="button" disabled={deleting} onClick={onConfirmDelete} className="btn btn--danger disabled:opacity-60">
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
