"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { List, Plus, Pencil, Trash2, RefreshCcw, Search, RotateCcw, Image as ImageIcon } from "lucide-react";
import { listWaifu, createWaifu, updateWaifu, deleteWaifu, resetWaifuVotes } from "@/lib/api";

function createEmptyForm() {
  return {
    id: null,
    name: "",
    anime_title: "",
    image_mode: "upload",
    image_url: "",
    description: "",
    file: null,
    preview_url: "",
    existing_image_url: "",
  };
}

export default function WaifuVotePage() {
  // list state
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  // form states
  const [mode, setMode] = useState("add"); // add | edit
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [submitting, setSubmitting] = useState(false);

  // delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // reset votes
  const [resetting, setResetting] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const totalVotesOnPage = useMemo(() => items.reduce((sum, it) => sum + (Number(it?.total_votes) || 0), 0), [items]);
  const topWaifuOnPage = useMemo(() => items.reduce((best, it) => {
    if (!best) return it;
    return (Number(it?.total_votes) || 0) > (Number(best?.total_votes) || 0) ? it : best;
  }, null), [items]);
  const visibleStart = total === 0 ? 0 : ((page - 1) * limit) + 1;
  const visibleEnd = total === 0 ? 0 : Math.min(total, page * limit);

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
      toast.error(e?.message || "Gagal memuat daftar waifu");
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
    setForm(createEmptyForm());
    setFormOpen(true);
  }

  function openEdit(it) {
    setMode("edit");
    setForm({
      id: it.id,
      name: it.name || "",
      anime_title: it.anime_title || "",
      image_mode: "upload",
      image_url: "",
      description: it.description || "",
      file: null,
      preview_url: "",
      existing_image_url: it.image_url || "",
    });
    setFormOpen(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!String(form.name || '').trim() || !String(form.anime_title || '').trim()) {
      return toast.error('Nama waifu dan judul anime wajib diisi');
    }
    const imageMode = String(form.image_mode || 'upload');
    const imageUrl = String(form.image_url || '').trim();
    if (mode === 'add') {
      if (imageMode === 'upload') {
        if (!(form.file instanceof File)) return toast.error('Gambar waifu wajib diupload');
      } else if (!imageUrl) {
        return toast.error('URL gambar waifu wajib diisi');
      }
    }
    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      if (!token) {
        return toast.error('Token tidak tersedia. Silakan login ulang.');
      }

      const payload = {
        name: String(form.name || '').trim(),
        anime_title: String(form.anime_title || '').trim(),
        description: String(form.description || '').trim(),
        image_url: imageMode === 'url' && imageUrl ? imageUrl : undefined,
        file: imageMode === 'upload' && form.file instanceof File ? form.file : undefined,
      };
      if (mode === "add") {
        await createWaifu({ token, payload });
        toast.success('Waifu berhasil ditambahkan');
      } else {
        await updateWaifu({ token, id: form.id, payload });
        toast.success('Waifu berhasil diperbarui');
      }
      setFormOpen(false);
      await loadList();
    } catch (e) {
      console.error("submit error", e);
      toast.error(e?.message || 'Gagal menyimpan waifu');
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
        return toast.error('Token tidak tersedia. Silakan login ulang.');
      }
      await deleteWaifu({ token, id: confirmTarget.id });
      toast.success('Waifu berhasil dihapus');
      setConfirmOpen(false);
      setConfirmTarget(null);
      await loadList();
    } catch (e) {
      console.error("delete error", e);
      toast.error(e?.message || 'Gagal menghapus waifu');
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
        return toast.error('Token tidak tersedia. Silakan login ulang.');
      }
      await resetWaifuVotes({ token });
      toast.success('Semua vote waifu berhasil direset');
      await loadList();
    } catch (e) {
      console.error("reset error", e);
      toast.error(e?.message || 'Gagal mereset vote waifu');
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

  function getPreviewUrl() {
    if (form.preview_url) return form.preview_url;
    if (form.image_mode === 'url') return String(form.image_url || '').trim();
    return form.existing_image_url || '';
  }

  function onSearch(e) {
    e.preventDefault();
    setPage(1);
    loadList();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="grid gap-2">
          <div className="inline-flex w-fit items-center gap-2 px-3 py-2 border-4 rounded-full font-extrabold text-sm" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <List className="size-4" /> Waifu Vote Management
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">Kelola daftar waifu, pantau vote, dan rapikan performa event dalam satu halaman.</h2>
            <p className="text-sm sm:text-base opacity-80 mt-2 max-w-3xl">Tampilan ini dirapikan supaya browsing daftar waifu lebih cepat, aksi edit lebih jelas, dan ringkasan performa vote langsung terlihat tanpa terasa seperti tabel admin yang kaku.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
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

      <div className="grid gap-3 md:grid-cols-3">
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
          <div className="text-xs font-black uppercase tracking-wide opacity-80">Waifu di halaman ini</div>
          <div className="mt-2 text-3xl font-black">{items.length}</div>
          <div className="text-sm font-semibold opacity-80 mt-1">Dari total {total} data yang tersedia.</div>
        </div>
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #BFDBFE 0%, #93C5FD 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
          <div className="text-xs font-black uppercase tracking-wide opacity-80">Akumulasi vote halaman</div>
          <div className="mt-2 text-3xl font-black">{totalVotesOnPage}</div>
          <div className="text-sm font-semibold opacity-80 mt-1">Cepat buat melihat intensitas persaingan di halaman aktif.</div>
        </div>
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #FBCFE8 0%, #F9A8D4 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
          <div className="text-xs font-black uppercase tracking-wide opacity-80">Paling unggul saat ini</div>
          <div className="mt-2 text-xl font-black truncate">{topWaifuOnPage?.name || 'Belum ada data'}</div>
          <div className="text-sm font-semibold opacity-80 mt-1">{topWaifuOnPage ? `${Number(topWaifuOnPage.total_votes) || 0} vote • ${topWaifuOnPage.anime_title || 'Tanpa anime'}` : 'Tambahkan waifu untuk mulai melihat performa.'}</div>
        </div>
      </div>

      <div className="border-4 rounded-2xl p-4 sm:p-5 grid gap-4" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <div className="flex flex-col gap-1">
          <div className="text-lg font-black">Cari dan atur tampilan daftar</div>
          <div className="text-sm opacity-80">Gunakan pencarian cepat untuk nama, anime, atau deskripsi. Kamu juga bisa atur jumlah item per halaman agar proses review lebih nyaman.</div>
        </div>
        <form onSubmit={onSearch} className="grid lg:grid-cols-[minmax(0,1fr)_180px_140px] gap-3 items-center">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input type="text" placeholder="Cari nama waifu, anime, atau isi deskripsi..." value={q} onChange={(e) => setQ(e.target.value)} className="w-full pl-10 pr-3 py-3 border-4 rounded-xl font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
          </div>
          <select value={String(limit)} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="w-full px-3 py-3 border-4 rounded-xl font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <option value="10">10 per halaman</option>
            <option value="20">20 per halaman</option>
            <option value="30">30 per halaman</option>
            <option value="50">50 per halaman</option>
          </select>
          <button type="submit" className="px-3 py-3 border-4 rounded-xl font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
            <Search className="size-4 inline-block mr-1" /> Cari
          </button>
        </form>
      </div>

      <div className="border-4 rounded-[24px] overflow-hidden" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-4 border-b-4" style={{ borderColor: 'var(--panel-border)', background: 'linear-gradient(135deg, rgba(255,216,3,0.18) 0%, rgba(255,255,255,0.02) 100%)' }}>
          <div>
            <div className="text-lg font-black">Daftar Waifu</div>
            <div className="text-sm opacity-80">Menampilkan {visibleStart}-{visibleEnd} dari {total} waifu.</div>
          </div>
          <div className="text-sm font-semibold opacity-80">Page {page} / {totalPages}</div>
        </div>
        {items.length > 0 ? (
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead style={{ background: 'rgba(255,255,255,0.04)' }}>
                <tr>
                  <th className="text-left px-4 py-3 border-b-4 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Rank</th>
                  <th className="text-left px-4 py-3 border-b-4 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Waifu</th>
                  <th className="text-left px-4 py-3 border-b-4 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Anime</th>
                  <th className="text-left px-4 py-3 border-b-4 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Votes</th>
                  <th className="text-left px-4 py-3 border-b-4 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id} style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <td className="px-4 py-4 border-b-4 align-top" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="inline-flex min-w-12 justify-center px-3 py-2 border-4 rounded-xl font-black" style={{ background: idx === 0 ? '#FFD803' : 'var(--background)', color: '#111827', borderColor: 'var(--panel-border)' }}>
                        #{((page - 1) * limit) + idx + 1}
                      </div>
                    </td>
                    <td className="px-4 py-4 border-b-4 align-top" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="flex items-start gap-3 min-w-[260px]">
                        {it.image_url ? (
                          <img src={it.image_url} alt={it.name} className="w-16 h-16 object-cover border-4 rounded-2xl shrink-0" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }} />
                        ) : (
                          <div className="w-16 h-16 shrink-0 grid place-items-center border-4 rounded-2xl text-xs font-black" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>No Img</div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="font-black text-base leading-tight break-words">{it.name}</div>
                          <div className="text-xs font-semibold opacity-70">ID #{it.id}</div>
                          <div className="text-sm opacity-80 break-words line-clamp-2">{it.description || 'Belum ada deskripsi untuk waifu ini.'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 border-b-4 align-top font-semibold min-w-[180px]" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="px-3 py-2 border-4 rounded-xl inline-flex" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                        {it.anime_title || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 border-b-4 align-top" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="inline-flex items-center px-3 py-2 border-4 rounded-xl font-black text-lg" style={{ background: '#FFD803', color: '#111827', borderColor: 'var(--panel-border)' }}>
                        {Number(it.total_votes) || 0}
                      </div>
                    </td>
                    <td className="px-4 py-4 border-b-4 align-top" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="flex flex-wrap items-center gap-2 min-w-[170px]">
                        <button type="button" onClick={() => openEdit(it)} className="px-3 py-2 border-4 rounded-xl font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>
                          <Pencil className="size-4 inline-block mr-1" /> Edit
                        </button>
                        <button type="button" onClick={() => requestDelete(it)} className="px-3 py-2 border-4 rounded-xl font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                          <Trash2 className="size-4 inline-block mr-1" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-14 grid place-items-center text-center" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,216,3,0.08) 100%)' }}>
            <div className="max-w-md grid gap-3">
              <div className="mx-auto size-16 border-4 rounded-2xl grid place-items-center" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <ImageIcon className="size-7" />
              </div>
              <div className="text-xl font-black">{loadingList ? 'Sedang memuat daftar waifu...' : 'Belum ada waifu yang cocok dengan pencarianmu'}</div>
              <div className="text-sm opacity-80">{loadingList ? 'Tunggu sebentar, data sedang disiapkan.' : 'Coba ubah kata kunci pencarian atau tambahkan waifu baru supaya halaman ini terasa lebih hidup.'}</div>
              {!loadingList && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button type="button" onClick={openAdd} className="px-3 py-2 border-4 rounded-xl font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>
                    <Plus className="size-4 inline-block mr-1" /> Tambah Waifu
                  </button>
                  <button type="button" onClick={() => { setQ(''); setPage(1); loadList(); }} className="px-3 py-2 border-4 rounded-xl font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    Reset Pencarian
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-4 rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <div className="text-sm font-semibold opacity-80">Menampilkan <span className="font-black opacity-100">{visibleStart}-{visibleEnd}</span> dari <span className="font-black opacity-100">{total}</span> data.</div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 border-4 rounded-xl disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Prev</button>
          <div className="px-3 py-2 border-4 rounded-xl text-sm font-black" style={{ background: '#FFD803', color: '#111827', borderColor: 'var(--panel-border)' }}>Page {page} / {totalPages}</div>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 border-4 rounded-xl disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Next</button>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setFormOpen(false)} />
          <form onSubmit={onSubmit} className="relative z-10 w-[92%] max-w-3xl border-4 rounded-xl p-4 sm:p-6 grid gap-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="grid gap-1">
              <div className="text-lg font-extrabold">{mode === 'add' ? 'Tambah Waifu' : 'Edit Waifu'}</div>
              <div className="text-sm opacity-80">Atur identitas waifu, pilih sumber gambar, lalu cek preview sebelum simpan.</div>
            </div>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_260px] gap-4 items-start">
              <div className="grid gap-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama waifu (wajib)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
                  <input type="text" value={form.anime_title} onChange={(e) => setForm((f) => ({ ...f, anime_title: e.target.value }))} placeholder="Judul anime (wajib)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
                </div>
                <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] items-start">
                  <select
                    value={form.image_mode}
                    onChange={(e) => setForm((f) => ({ ...f, image_mode: e.target.value, image_url: e.target.value === 'url' ? f.image_url : '', file: e.target.value === 'upload' ? f.file : null, preview_url: e.target.value === 'upload' ? f.preview_url : '' }))}
                    className="px-3 py-2 border-4 rounded-lg font-semibold"
                    style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  >
                    <option value="upload">Upload file</option>
                    <option value="url">Gunakan URL</option>
                  </select>
                  {form.image_mode === 'upload' ? (
                    <label className="px-3 py-2 border-4 rounded-lg font-extrabold cursor-pointer w-fit" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                      <input type="file" accept="image/*" onChange={onSelectImageFile} className="hidden" />
                      <span className="flex items-center gap-2"><ImageIcon className="size-4" /> Pilih Gambar</span>
                    </label>
                  ) : (
                    <input type="url" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value, preview_url: '' }))} placeholder="https://..." className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  )}
                </div>
                <textarea rows={5} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Deskripsi waifu" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>
              <div className="border-4 rounded-xl p-4 grid gap-3" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <div className="text-sm font-extrabold">Preview Gambar</div>
                <div className="aspect-square border-4 rounded-xl overflow-hidden grid place-items-center" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                  {getPreviewUrl() ? (
                    <img src={getPreviewUrl()} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center px-4 text-sm opacity-70">Belum ada gambar dipilih</div>
                  )}
                </div>
                <div className="text-xs opacity-80 break-all">{getPreviewUrl() || (form.image_mode === 'upload' ? 'Upload file gambar waifu untuk preview.' : 'Masukkan URL gambar untuk preview.')}</div>
              </div>
            </div>
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
