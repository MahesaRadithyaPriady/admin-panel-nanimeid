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
      <div
        className="p-3 border-4 rounded-lg"
        style={{
          boxShadow: "4px 4px 0 #000",
          background: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
          color: "var(--foreground)",
        }}
      >
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
      <div
        className="p-3 border-4 rounded-lg space-y-3"
        style={{
          boxShadow: "4px 4px 0 #000",
          background: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
          color: "var(--foreground)",
        }}
      >
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nama paket (wajib, unik)"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{
                boxShadow: "4px 4px 0 #000",
                background: "var(--panel-bg)",
                borderColor: "var(--panel-border)",
                color: "var(--foreground)",
              }}
            />
            <input
              type="number"
              value={form.price_coins}
              onChange={(e) => setForm((f) => ({ ...f, price_coins: e.target.value }))}
              placeholder="Harga koin (wajib)"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{
                boxShadow: "4px 4px 0 #000",
                background: "var(--panel-bg)",
                borderColor: "var(--panel-border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Deskripsi (opsional)"
            rows={2}
            className="px-3 py-2 border-4 rounded-lg font-semibold"
            style={{
              boxShadow: "4px 4px 0 #000",
              background: "var(--background)",
              borderColor: "var(--panel-border)",
              color: "var(--foreground)",
            }}
          />

          <textarea
            value={form.benefits}
            onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))}
            placeholder={"Benefits, satu per baris (misal: \nNo ads\n1080p\nEarly access)"}
            rows={3}
            className="px-3 py-2 border-4 rounded-lg font-semibold text-sm"
            style={{
              boxShadow: "4px 4px 0 #000",
              background: "var(--background)",
              borderColor: "var(--panel-border)",
              color: "var(--foreground)",
            }}
          />

          <div className="grid sm:grid-cols-2 gap-3 items-center">
            <input
              type="text"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              placeholder="Warna hex, contoh #FFD700 (wajib)"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{
                boxShadow: "4px 4px 0 #000",
                background: "var(--panel-bg)",
                borderColor: "var(--panel-border)",
                color: "var(--foreground)",
              }}
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={!!form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <span>Aktif</span>
            </label>
          </div>

          <div className="grid sm:grid-cols-[160px_auto] gap-3 items-center">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
              style={{
                boxShadow: "4px 4px 0 #000",
                background: mode === "add" ? "var(--accent-add)" : "var(--accent-edit)",
                color:
                  mode === "add"
                    ? "var(--accent-add-foreground)"
                    : "var(--accent-edit-foreground)",
                borderColor: "var(--panel-border)",
              }}
            >
              {submitting ? (
                mode === "add" ? "Menambah..." : "Menyimpan..."
              ) : mode === "add" ? (
                <>
                  <Plus className="size-4" /> Tambah
                </>
              ) : (
                <>
                  <Pencil className="size-4" /> Simpan
                </>
              )}
            </button>
            {mode === "edit" && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2 border-4 rounded-lg font-extrabold"
                style={{
                  boxShadow: "4px 4px 0 #000",
                  background: "var(--background)",
                  borderColor: "var(--panel-border)",
                  color: "var(--foreground)",
                }}
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
          className="min-w-full border-4 rounded-lg overflow-hidden"
          style={{
            boxShadow: "6px 6px 0 #000",
            borderColor: "var(--panel-border)",
            color: "var(--foreground)",
          }}
        >
          <thead style={{ background: "var(--panel-bg)" }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>
                ID
              </th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>
                Name
              </th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>
                Price (coins)
              </th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>
                Color
              </th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>
                Active
              </th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: "var(--panel-border)" }}>
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: "var(--panel-border)" }}>
                  {it.id}
                </td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: "var(--panel-border)" }}>
                  {it.name}
                </td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: "var(--panel-border)" }}>
                  {it.price_coins}
                </td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: "var(--panel-border)" }}>
                  <span
                    className="inline-flex items-center gap-2 px-2 py-1 border-2 rounded text-xs"
                    style={{
                      borderColor: "var(--panel-border)",
                      background: it.color || "#FFF",
                      color: "#000",
                    }}
                  >
                    <span
                      className="inline-block w-3 h-3 rounded-full border"
                      style={{ background: it.color || "#FFF" }}
                    />
                    {it.color}
                  </span>
                </td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: "var(--panel-border)" }}>
                  {it.is_active ? "Ya" : "Tidak"}
                </td>
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
                      onClick={() => onToggleActive(it)}
                      className="px-2 py-1 border-4 rounded font-extrabold"
                      style={{
                        boxShadow: "3px 3px 0 #000",
                        background: "var(--panel-bg)",
                        color: "var(--foreground)",
                        borderColor: "var(--panel-border)",
                      }}
                    >
                      {it.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(it)}
                      className="px-2 py-1 border-4 rounded font-extrabold"
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
          className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold"
          style={{
            boxShadow: "4px 4px 0 #000",
            background: "var(--panel-bg)",
            color: "var(--foreground)",
            borderColor: "var(--panel-border)",
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
            color: "var(--foreground)",
            borderColor: "var(--panel-border)",
          }}
        >
          Next
        </button>
      </div>

      {/* Konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div
            className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6"
            style={{
              boxShadow: "8px 8px 0 #000",
              background: "var(--panel-bg)",
              borderColor: "var(--panel-border)",
              color: "var(--foreground)",
            }}
          >
            <div className="mb-3 text-sm font-semibold">
              Hapus VIP plan {deleteTarget?.name}?
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
                style={{
                  boxShadow: "4px 4px 0 #000",
                  background: "var(--panel-bg)",
                  borderColor: "var(--panel-border)",
                  color: "var(--foreground)",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={onConfirmDelete}
                className="px-3 py-2 border-4 rounded-lg bg-[#FFD803] hover:brightness-95 font-extrabold disabled:opacity-60"
                style={{ boxShadow: "4px 4px 0 #000", borderColor: "var(--panel-border)" }}
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
