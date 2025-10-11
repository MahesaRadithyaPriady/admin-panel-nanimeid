"use client";

import { useEffect, useMemo, useState } from "react";
import { List, Plus, Pencil, Trash2, RefreshCcw, Search, RotateCcw } from "lucide-react";
import { listWaifu, createWaifu, updateWaifu, deleteWaifu, resetWaifuVotes, createWaifuWithFile, updateWaifuWithFile } from "@/lib/api";

export default function WaifuVotePage() {
  // list state
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  // form state
  const [mode, setMode] = useState("add"); // add | edit
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", anime_title: "", image_url: "", description: "", file: null, preview_url: "" });
  const [submitting, setSubmitting] = useState(false);

  // delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // reset votes
  const [resetting, setResetting] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // Try to resolve token from various storage shapes
  function getToken() {
    try {
      // direct token key
      const t = localStorage.getItem('access_token');
      if (t) return t;
      // session blob used across dashboard
      const raw = localStorage.getItem('nanimeid_admin_session');
      if (raw) {
        const session = JSON.parse(raw);
        // common fields that may store access token
        if (typeof session?.access_token === 'string' && session.access_token) return session.access_token;
        if (typeof session?.token === 'string' && session.token) return session.token;
        if (typeof session?.auth?.access_token === 'string' && session.auth.access_token) return session.auth.access_token;
      }
    } catch {}
    return '';
  }

  async function loadList({ signal } = {}) {
    setLoadingList(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      const data = await listWaifu({ token, page, limit, q });
      setItems(data.items || []);
      setTotal(data.pagination?.total ?? 0);
    } catch (e) {
      console.error("loadList error", e);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    loadList({ signal: ctrl.signal });
    return () => ctrl.abort();
  }, [page, limit]);

  function openAdd() {
    setMode("add");
    setForm({ id: null, name: "", anime_title: "", image_url: "", description: "", file: null, preview_url: "" });
    setFormOpen(true);
  }

  function openEdit(it) {
    setMode("edit");
    setForm({ id: it.id, name: it.name || "", anime_title: it.anime_title || "", image_url: it.image_url || "", description: it.description || "", file: null, preview_url: it.image_url || "" });
    setFormOpen(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      if (!token) {
        alert('Token tidak tersedia. Silakan login ulang.');
        setSubmitting(false);
        return;
      }
      if (mode === "add") {
        if (form.file) {
          await createWaifuWithFile({ token, form: { name: form.name, anime_title: form.anime_title, description: form.description, file: form.file } });
        } else {
          const payload = { name: form.name, anime_title: form.anime_title, image_url: form.image_url, description: form.description };
          await createWaifu({ token, payload });
        }
      } else {
        if (form.file) {
          await updateWaifuWithFile({ token, id: form.id, form: { name: form.name, anime_title: form.anime_title, description: form.description, file: form.file } });
        } else {
          const payload = { name: form.name, anime_title: form.anime_title, image_url: form.image_url, description: form.description };
          await updateWaifu({ token, id: form.id, payload });
        }
      }
      setFormOpen(false);
      await loadList();
    } catch (e) {
      console.error("submit error", e);
    } finally {
      setSubmitting(false);
    }
  }

  function requestDelete(it) {
    setConfirmTarget(it);
    setConfirmOpen(true);
  }

  async function onConfirmDelete() {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      if (!token) {
        alert('Token tidak tersedia. Silakan login ulang.');
        setDeleting(false);
        return;
      }
      await deleteWaifu({ token, id: confirmTarget.id });
      setConfirmOpen(false);
      setConfirmTarget(null);
      await loadList();
    } catch (e) {
      console.error("delete error", e);
    } finally {
      setDeleting(false);
    }
  }

  async function onResetVotes() {
    if (resetting) return;
    const ok = confirm("Reset semua vote? Tindakan ini tidak dapat dibatalkan.");
    if (!ok) return;
    setResetting(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      if (!token) {
        alert('Token tidak tersedia. Silakan login ulang.');
        setResetting(false);
        return;
      }
      await resetWaifuVotes({ token });
      await loadList();
    } catch (e) {
      console.error("reset error", e);
    } finally {
      setResetting(false);
    }
  }

  // handle file upload (multipart) per docs
  function onSelectImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setForm((f) => ({ ...f, file: null, preview_url: '' }));
      return;
    }
    const preview = URL.createObjectURL(file);
    setForm((f) => ({ ...f, file, preview_url: preview }));
  }

  function onSearch(e) {
    e.preventDefault();
    setPage(1);
    loadList();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2"><List className="size-5" /> Waifu Vote</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => loadList()} disabled={loadingList} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
            <RefreshCcw className="size-4 inline-block mr-1" /> {loadingList ? 'Memuat...' : 'Refresh'}
          </button>
          <button onClick={onResetVotes} disabled={resetting} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>
            <RotateCcw className="size-4 inline-block mr-1" /> {resetting ? 'Mereset...' : 'Reset Semua Vote'}
          </button>
          <button onClick={openAdd} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>
            <Plus className="size-4 inline-block mr-1" /> Tambah Waifu
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={onSearch} className="grid sm:grid-cols-[1fr_140px] gap-3">
        <input type="text" placeholder="Cari (name/anime_title/description)" value={q} onChange={(e) => setQ(e.target.value)} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
        <button type="submit" className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
          <Search className="size-4 inline-block mr-1" /> Cari
        </button>
      </form>

      {/* Table */}
      <div className="overflow-auto">
        <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <thead style={{ background: 'var(--panel-bg)' }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>&nbsp;</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Nama</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Anime</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Total Votes</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.name} className="w-14 h-14 object-cover border-4 rounded" style={{ borderColor: 'var(--panel-border)' }} />
                  ) : (
                    <div className="w-14 h-14 grid place-items-center border-4 rounded text-xs" style={{ borderColor: 'var(--panel-border)' }}>No Img</div>
                  )}
                </td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.name}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.anime_title}</td>
                <td className="px-3 py-2 border-b-4 font-extrabold" style={{ borderColor: 'var(--panel-border)' }}>{it.total_votes}</td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => requestDelete(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Belum ada waifu.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Prev</button>
        <div className="text-sm font-extrabold">Page {page} / {totalPages}</div>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Next</button>
      </div>

      {/* Add/Edit Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setFormOpen(false)} />
          <form onSubmit={onSubmit} className="relative z-10 w-[92%] max-w-lg border-4 rounded-xl p-4 sm:p-6 grid gap-3" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="text-lg font-extrabold mb-1">{mode === 'add' ? 'Tambah Waifu' : 'Edit Waifu'}</div>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama waifu (wajib)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
            <input type="text" value={form.anime_title} onChange={(e) => setForm((f) => ({ ...f, anime_title: e.target.value }))} placeholder="Judul anime (wajib)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
            <input type="text" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="Image URL (opsional bila upload file)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
            <div className="grid gap-2">
              <label className="text-xs opacity-80">Atau upload file gambar (disarankan)</label>
              <input type="file" accept="image/*" onChange={onSelectImageFile} className="px-3 py-2 border-4 rounded-lg" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              {(form.preview_url || form.image_url) ? (
                <div className="mt-1 flex items-center gap-3">
                  <img src={form.preview_url || form.image_url} alt="preview" className="w-20 h-20 object-cover border-4 rounded" style={{ borderColor: 'var(--panel-border)' }} />
                  {form.image_url ? <div className="text-xs opacity-80 break-all">{form.image_url}</div> : null}
                </div>
              ) : null}
            </div>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Deskripsi" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" disabled={submitting} onClick={() => setFormOpen(false)} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
              <button type="submit" disabled={submitting} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: mode === 'add' ? 'var(--accent-add)' : 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: mode === 'add' ? 'var(--accent-add-foreground)' : 'var(--accent-edit-foreground)' }}>{submitting ? (mode === 'add' ? 'Menambah...' : 'Menyimpan...') : (mode === 'add' ? 'Tambah' : 'Simpan')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setConfirmOpen(false)} />
          <div className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="grid place-items-center size-10 border-4 rounded-md" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Hapus Waifu?</h3>
                <p className="text-sm opacity-80 break-words">{confirmTarget?.name}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} disabled={deleting} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
              <button onClick={onConfirmDelete} disabled={deleting} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>{deleting ? 'Menghapus...' : 'Ya, Hapus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
