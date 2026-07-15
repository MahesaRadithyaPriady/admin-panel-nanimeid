"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { List, Plus, Pencil, Trash2, RefreshCcw, Search, RotateCcw, Image as ImageIcon, FolderOpen, Loader2, CheckCircle, XCircle } from "lucide-react";
import { listWaifu, createWaifu, updateWaifu, deleteWaifu, resetWaifuVotes, listWaifuGroups, createWaifuGroup, updateWaifuGroup, deleteWaifuGroup } from "@/lib/api";

function createEmptyForm() {
  return {
    id: null,
    name: "",
    anime_title: "",
    image_mode: "upload",
    image_url: "",
    description: "",
    group_id: "",
    file: null,
    preview_url: "",
    existing_image_url: "",
  };
}

function createEmptyGroupForm() {
  return { id: null, name: "", description: "", sort_order: 0, is_active: true };
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

  // groups state
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [filterGroupId, setFilterGroupId] = useState("");
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [groupForm, setGroupForm] = useState(createEmptyGroupForm());
  const [groupMode, setGroupMode] = useState("add");
  const [submittingGroup, setSubmittingGroup] = useState(false);
  const [groupDeleteTarget, setGroupDeleteTarget] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

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
      const data = await listWaifu({ token, page, limit, q, group_id: filterGroupId || undefined });
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
  }, [page, limit, filterGroupId]);

  async function loadGroups() {
    setLoadingGroups(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      const data = await listWaifuGroups({ token, include_inactive: true });
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("loadGroups error", e);
      toast.error(e?.message || "Gagal memuat daftar grup");
    } finally {
      setLoadingGroups(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

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
      group_id: it.group_id != null ? String(it.group_id) : "",
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
        group_id: form.group_id ? Number(form.group_id) : undefined,
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

  async function onResetVotes(groupId) {
    if (resetting) return;
    const msg = groupId
      ? `Reset vote untuk grup ini? Tindakan ini tidak dapat dibatalkan.`
      : "Reset semua vote? Tindakan ini tidak dapat dibatalkan.";
    const ok = confirm(msg);
    if (!ok) return;
    setResetting(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      if (!token) {
        return toast.error('Token tidak tersedia. Silakan login ulang.');
      }
      await resetWaifuVotes({ token, group_id: groupId || undefined });
      toast.success(groupId ? 'Vote grup berhasil direset' : 'Semua vote waifu berhasil direset');
      await loadList();
      await loadGroups();
    } catch (e) {
      console.error("reset error", e);
      toast.error(e?.message || 'Gagal mereset vote waifu');
    } finally {
      setResetting(false);
    }
  }

  // ===== Group CRUD =====
  function openAddGroup() {
    setGroupMode("add");
    setGroupForm(createEmptyGroupForm());
    setGroupFormOpen(true);
  }

  function openEditGroup(g) {
    setGroupMode("edit");
    setGroupForm({ id: g.id, name: g.name || "", description: g.description || "", sort_order: g.sort_order ?? 0, is_active: g.is_active ?? true });
    setGroupFormOpen(true);
  }

  async function onSubmitGroup(e) {
    e.preventDefault();
    if (submittingGroup) return;
    if (!String(groupForm.name || '').trim()) return toast.error('Nama grup wajib diisi');
    setSubmittingGroup(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      if (!token) return toast.error('Token tidak tersedia. Silakan login ulang.');
      const payload = {
        name: String(groupForm.name).trim(),
        description: String(groupForm.description || '').trim() || undefined,
        sort_order: Number(groupForm.sort_order) || 0,
        is_active: !!groupForm.is_active,
      };
      if (groupMode === 'add') {
        await createWaifuGroup({ token, payload });
        toast.success('Grup berhasil dibuat');
      } else {
        await updateWaifuGroup({ token, id: groupForm.id, payload });
        toast.success('Grup berhasil diperbarui');
      }
      setGroupFormOpen(false);
      await loadGroups();
    } catch (e) {
      toast.error(e?.message || 'Gagal menyimpan grup');
    } finally {
      setSubmittingGroup(false);
    }
  }

  async function onConfirmDeleteGroup() {
    if (!groupDeleteTarget) return;
    setDeletingGroup(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      if (!token) return toast.error('Token tidak tersedia. Silakan login ulang.');
      await deleteWaifuGroup({ token, id: groupDeleteTarget.id });
      toast.success('Grup berhasil dihapus');
      setGroupDeleteTarget(null);
      await loadGroups();
    } catch (e) {
      toast.error(e?.message || 'Gagal menghapus grup');
    } finally {
      setDeletingGroup(false);
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
          <div className="inline-flex w-fit items-center gap-2 px-3 py-2 border-2 rounded-full font-extrabold text-sm" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <List className="size-4" /> Waifu Vote Management
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">Kelola daftar waifu, pantau vote, dan rapikan performa event dalam satu halaman.</h2>
            <p className="text-sm sm:text-base opacity-80 mt-2 max-w-3xl">Tampilan ini dirapikan supaya browsing daftar waifu lebih cepat, aksi edit lebih jelas, dan ringkasan performa vote langsung terlihat tanpa terasa seperti tabel admin yang kaku.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
          <button onClick={() => loadList()} disabled={loadingList} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
            <RefreshCcw className="size-4 inline-block mr-1" /> {loadingList ? 'Memuat...' : 'Refresh'}
          </button>
          <button onClick={() => onResetVotes()} disabled={resetting} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>
            <RotateCcw className="size-4 inline-block mr-1" /> {resetting ? 'Mereset...' : 'Reset Semua Vote'}
          </button>
          <button onClick={openAddGroup} className="px-3 py-2 border-2 rounded-lg font-extrabold" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <FolderOpen className="size-4 inline-block mr-1" /> Tambah Grup
          </button>
          <button onClick={openAdd} className="px-3 py-2 border-2 rounded-lg font-extrabold" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>
            <Plus className="size-4 inline-block mr-1" /> Tambah Waifu
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="stat-card">
          <div className="label">Waifu di halaman ini</div>
          <div className="mt-2 text-3xl font-black">{items.length}</div>
          <div className="text-sm text-[var(--muted)] mt-1">Dari total {total} data yang tersedia.</div>
        </div>
        <div className="stat-card">
          <div className="label">Akumulasi vote halaman</div>
          <div className="mt-2 text-3xl font-black">{totalVotesOnPage}</div>
          <div className="text-sm text-[var(--muted)] mt-1">Intensitas persaingan halaman aktif.</div>
        </div>
        <div className="stat-card">
          <div className="label">Paling unggul saat ini</div>
          <div className="mt-2 text-xl font-black truncate">{topWaifuOnPage?.name || 'Belum ada data'}</div>
          <div className="text-sm text-[var(--muted)] mt-1">{topWaifuOnPage ? `${Number(topWaifuOnPage.total_votes) || 0} vote • ${topWaifuOnPage.anime_title || 'Tanpa anime'}` : 'Tambahkan waifu untuk melihat performa.'}</div>
        </div>
      </div>

      {/* Groups Section */}
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-4 border-b-2 border-[var(--border)]">
          <div>
            <div className="text-lg font-black flex items-center gap-2"><FolderOpen className="size-4" /> Grup Waifu</div>
            <div className="text-sm opacity-80">Kelola grup voting waifu. User dapat vote 1x per grup dalam 24 jam.</div>
          </div>
          <button onClick={openAddGroup} className="btn btn--primary btn--sm">
            <Plus className="w-4 h-4" /> Tambah Grup
          </button>
        </div>
        {groups.length > 0 ? (
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead style={{ background: 'var(--surface)' }}>
                <tr>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Nama Grup</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Deskripsi</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Sort</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Waifu</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Votes</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Status</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td className="px-4 py-3 border-b-2 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{g.id}</td>
                    <td className="px-4 py-3 border-b-2 font-black" style={{ borderColor: 'var(--panel-border)' }}>{g.name}</td>
                    <td className="px-4 py-3 border-b-2 text-sm opacity-80 max-w-xs truncate" style={{ borderColor: 'var(--panel-border)' }}>{g.description || '-'}</td>
                    <td className="px-4 py-3 border-b-2 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{g.sort_order ?? 0}</td>
                    <td className="px-4 py-3 border-b-2 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{g.waifus_count ?? 0}</td>
                    <td className="px-4 py-3 border-b-2 font-black" style={{ borderColor: 'var(--panel-border)' }}>{Number(g.total_votes ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
                      {g.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#22c55e' }}><CheckCircle className="size-3" /> Aktif</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#ef4444' }}><XCircle className="size-3" /> Nonaktif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="flex flex-wrap items-center gap-1">
                        <button type="button" onClick={() => openEditGroup(g)} className="btn btn--secondary btn--sm btn--icon" title="Edit Grup"><Pencil className="size-4" /></button>
                        <button type="button" onClick={() => onResetVotes(g.id)} disabled={resetting} className="btn btn--secondary btn--sm btn--icon" title="Reset Vote Grup"><RotateCcw className="size-4" /></button>
                        <button type="button" onClick={() => setGroupDeleteTarget(g)} className="btn btn--danger btn--sm btn--icon" title="Hapus Grup"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm opacity-70">
            {loadingGroups ? <Loader2 className="size-5 animate-spin mx-auto" /> : 'Belum ada grup. Klik "Tambah Grup" untuk membuat grup voting.'}
          </div>
        )}
      </div>

      <div className="card p-4 sm:p-5 grid gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-lg font-black">Cari dan atur tampilan daftar</div>
          <div className="text-sm opacity-80">Filter berdasarkan grup, cari nama waifu, atau atur jumlah item per halaman.</div>
        </div>
        <form onSubmit={onSearch} className="grid lg:grid-cols-[minmax(0,1fr)_200px_180px_140px] gap-3 items-center">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input type="text" placeholder="Cari nama waifu, anime, atau isi deskripsi..." value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" />
          </div>
          <select value={filterGroupId} onChange={(e) => { setFilterGroupId(e.target.value); setPage(1); }} className="select">
            <option value="">Semua Grup</option>
            {groups.map((g) => (
              <option key={g.id} value={String(g.id)}>{g.name}</option>
            ))}
          </select>
          <select value={String(limit)} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="select">
            <option value="10">10 per halaman</option>
            <option value="20">20 per halaman</option>
            <option value="30">30 per halaman</option>
            <option value="50">50 per halaman</option>
          </select>
          <button type="submit" className="btn btn--primary">
            <Search className="w-4 h-4" /> Cari
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-4 border-b-2 border-[var(--border)]">
          <div>
            <div className="text-lg font-black">Daftar Waifu</div>
            <div className="text-sm opacity-80">Menampilkan {visibleStart}-{visibleEnd} dari {total} waifu.</div>
          </div>
          <div className="text-sm font-semibold opacity-80">Page {page} / {totalPages}</div>
        </div>
        {items.length > 0 ? (
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead style={{ background: 'var(--surface)' }}>
                <tr>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Rank</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Waifu</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Anime</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Grup</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Votes</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id} style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <td className="px-4 py-4 border-b-2 align-top" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="inline-flex min-w-12 justify-center px-3 py-2 border-2 rounded-xl font-black" style={{ background: idx === 0 ? '#FFD803' : 'var(--panel-bg)', color: idx === 0 ? '#111827' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}>
                        #{((page - 1) * limit) + idx + 1}
                      </div>
                    </td>
                    <td className="px-4 py-4 border-b-2 align-top" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="flex items-start gap-3 min-w-[260px]">
                        {it.image_url ? (
                          <img src={it.image_url} alt={it.name} className="w-16 h-16 object-cover border-2 border-[var(--border)] shrink-0" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-16 h-16 shrink-0 grid place-items-center border-2 border-[var(--border)] text-xs font-black" style={{ background: 'var(--surface)' }}>No Img</div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="font-black text-base leading-tight break-words">{it.name}</div>
                          <div className="text-xs font-semibold opacity-70">ID #{it.id}</div>
                          <div className="text-sm opacity-80 break-words line-clamp-2">{it.description || 'Belum ada deskripsi untuk waifu ini.'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 border-b-2 align-top font-semibold min-w-[180px]" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="px-3 py-2 border-2 rounded-xl inline-flex" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                        {it.anime_title || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 border-b-2 align-top" style={{ borderColor: 'var(--panel-border)' }}>
                      {it.group_id != null ? (
                        <span className="inline-flex px-2 py-1 text-xs font-bold border-2 rounded-lg" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                          {groups.find((g) => g.id === it.group_id)?.name || `#${it.group_id}`}
                        </span>
                      ) : (
                        <span className="text-xs opacity-50">Tanpa grup</span>
                      )}
                    </td>
                    <td className="px-4 py-4 border-b-2 align-top" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="inline-flex items-center px-3 py-2 border-2 rounded-xl font-black text-lg" style={{ background: '#FFD803', color: '#111827', borderColor: 'var(--panel-border)' }}>
                        {Number(it.total_votes) || 0}
                      </div>
                    </td>
                    <td className="px-4 py-4 border-b-2 align-top" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="flex flex-wrap items-center gap-2 min-w-[170px]">
                        <button type="button" onClick={() => openEdit(it)} className="btn btn--secondary btn--sm">
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                        <button type="button" onClick={() => requestDelete(it)} className="btn btn--danger btn--sm">
                          <Trash2 className="w-4 h-4" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-14 grid place-items-center text-center">
            <div className="max-w-md grid gap-3">
              <div className="mx-auto size-16 border-2 border-[var(--border)] grid place-items-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <ImageIcon className="size-7" />
              </div>
              <div className="text-xl font-black">{loadingList ? 'Sedang memuat daftar waifu...' : 'Belum ada waifu yang cocok dengan pencarianmu'}</div>
              <div className="text-sm opacity-80">{loadingList ? 'Tunggu sebentar, data sedang disiapkan.' : 'Coba ubah kata kunci pencarian atau tambahkan waifu baru supaya halaman ini terasa lebih hidup.'}</div>
              {!loadingList && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button type="button" onClick={openAdd} className="btn btn--primary btn--sm">
                    <Plus className="w-4 h-4" /> Tambah Waifu
                  </button>
                  <button type="button" onClick={() => { setQ(''); setPage(1); loadList(); }} className="btn btn--secondary btn--sm">
                    Reset Pencarian
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold text-[var(--muted)]">Menampilkan <span className="font-black text-[var(--foreground)]">{visibleStart}-{visibleEnd}</span> dari <span className="font-black text-[var(--foreground)]">{total}</span> data.</div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn btn--secondary btn--sm disabled:opacity-60">Prev</button>
          <span className="badge">Page {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn btn--secondary btn--sm disabled:opacity-60">Next</button>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setFormOpen(false)} />
          <form onSubmit={onSubmit} className="relative z-10 w-[92%] max-w-3xl border-2 rounded-xl p-4 sm:p-6 grid gap-4" style={{ boxShadow: 'var(--shadow-xl)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="grid gap-1">
              <div className="text-lg font-extrabold">{mode === 'add' ? 'Tambah Waifu' : 'Edit Waifu'}</div>
              <div className="text-sm opacity-80">Atur identitas waifu, pilih sumber gambar, lalu cek preview sebelum simpan.</div>
            </div>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_260px] gap-4 items-start">
              <div className="grid gap-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama waifu (wajib)" className="px-3 py-2 border-2 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
                  <input type="text" value={form.anime_title} onChange={(e) => setForm((f) => ({ ...f, anime_title: e.target.value }))} placeholder="Judul anime (wajib)" className="px-3 py-2 border-2 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
                </div>
                <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] items-start">
                  <select
                    value={form.image_mode}
                    onChange={(e) => setForm((f) => ({ ...f, image_mode: e.target.value, image_url: e.target.value === 'url' ? f.image_url : '', file: e.target.value === 'upload' ? f.file : null, preview_url: e.target.value === 'upload' ? f.preview_url : '' }))}
                    className="px-3 py-2 border-2 rounded-lg font-semibold"
                    style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  >
                    <option value="upload">Upload file</option>
                    <option value="url">Gunakan URL</option>
                  </select>
                  {form.image_mode === 'upload' ? (
                    <label className="px-3 py-2 border-2 rounded-lg font-extrabold cursor-pointer w-fit" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                      <input type="file" accept="image/*" onChange={onSelectImageFile} className="hidden" />
                      <span className="flex items-center gap-2"><ImageIcon className="size-4" /> Pilih Gambar</span>
                    </label>
                  ) : (
                    <input type="url" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value, preview_url: '' }))} placeholder="https://..." className="px-3 py-2 border-2 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  )}
                </div>
                <select value={form.group_id} onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))} className="px-3 py-2 border-2 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <option value="">Tanpa Grup</option>
                  {groups.map((g) => (
                    <option key={g.id} value={String(g.id)}>{g.name}</option>
                  ))}
                </select>
                <textarea rows={5} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Deskripsi waifu" className="px-3 py-2 border-2 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>
              <div className="border-2 rounded-xl p-4 grid gap-3" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <div className="text-sm font-extrabold">Preview Gambar</div>
                <div className="aspect-square border-2 rounded-xl overflow-hidden grid place-items-center" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                  {getPreviewUrl() ? (
                    <img src={getPreviewUrl()} alt="preview" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="text-center px-4 text-sm opacity-70">Belum ada gambar dipilih</div>
                  )}
                </div>
                <div className="text-xs opacity-80 break-all">{getPreviewUrl() || (form.image_mode === 'upload' ? 'Upload file gambar waifu untuk preview.' : 'Masukkan URL gambar untuk preview.')}</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" disabled={submitting} onClick={() => setFormOpen(false)} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
              <button type="submit" disabled={submitting} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: mode === 'add' ? 'var(--accent-add)' : 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: mode === 'add' ? 'var(--accent-add-foreground)' : 'var(--accent-edit-foreground)' }}>{submitting ? (mode === 'add' ? 'Menambah...' : 'Menyimpan...') : (mode === 'add' ? 'Tambah' : 'Simpan')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Group Form Modal */}
      {groupFormOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submittingGroup && setGroupFormOpen(false)} />
          <form onSubmit={onSubmitGroup} className="relative z-10 w-[92%] max-w-lg border-2 rounded-xl p-4 sm:p-6 grid gap-4" style={{ boxShadow: 'var(--shadow-xl)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="grid gap-1">
              <div className="text-lg font-extrabold">{groupMode === 'add' ? 'Tambah Grup' : 'Edit Grup'}</div>
              <div className="text-sm opacity-80">Buat grup voting waifu. User vote 1x per grup dalam 24 jam.</div>
            </div>
            <div className="grid gap-3">
              <input type="text" value={groupForm.name} onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama grup (wajib)" className="px-3 py-2 border-2 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
              <textarea rows={3} value={groupForm.description} onChange={(e) => setGroupForm((f) => ({ ...f, description: e.target.value }))} placeholder="Deskripsi grup" className="px-3 py-2 border-2 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold opacity-70">Urutan Tampil</span>
                  <input type="number" value={groupForm.sort_order} onChange={(e) => setGroupForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))} className="px-3 py-2 border-2 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold opacity-70">Status</span>
                  <label className="px-3 py-2 border-2 rounded-lg font-semibold flex items-center gap-2 cursor-pointer" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    <input type="checkbox" checked={groupForm.is_active} onChange={(e) => setGroupForm((f) => ({ ...f, is_active: e.target.checked }))} />
                    Aktif
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" disabled={submittingGroup} onClick={() => setGroupFormOpen(false)} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
              <button type="submit" disabled={submittingGroup} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: groupMode === 'add' ? 'var(--accent-add)' : 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: groupMode === 'add' ? 'var(--accent-add-foreground)' : 'var(--accent-edit-foreground)' }}>{submittingGroup ? 'Menyimpan...' : (groupMode === 'add' ? 'Tambah' : 'Simpan')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Waifu Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setConfirmOpen(false)} />
          <div className="relative z-10 w-[92%] max-w-md border-2 rounded-xl p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="grid place-items-center size-10 border-2 rounded-md" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Hapus Waifu?</h3>
                <p className="text-sm opacity-80 break-words">{confirmTarget?.name}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} disabled={deleting} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
              <button onClick={onConfirmDelete} disabled={deleting} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>{deleting ? 'Menghapus...' : 'Ya, Hapus'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Modal */}
      {groupDeleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deletingGroup && setGroupDeleteTarget(null)} />
          <div className="relative z-10 w-[92%] max-w-md border-2 rounded-xl p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="grid place-items-center size-10 border-2 rounded-md" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Hapus Grup?</h3>
                <p className="text-sm opacity-80 break-words">{groupDeleteTarget?.name}</p>
                <p className="text-xs opacity-70 mt-1">Waifu dan vote pada grup ini akan di-set tanpa grup (group_id = null).</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setGroupDeleteTarget(null)} disabled={deletingGroup} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
              <button onClick={onConfirmDeleteGroup} disabled={deletingGroup} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>{deletingGroup ? 'Menghapus...' : 'Ya, Hapus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
