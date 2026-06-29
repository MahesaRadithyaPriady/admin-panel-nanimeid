"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { List, Plus, Pencil, Trash2, Image as ImageIcon, Info, ArrowLeft, ArrowRight } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listBadges, createBadge, updateBadge, deleteBadge } from '@/lib/api';

export default function BadgesPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [activeFilter, setActiveFilter] = useState(''); // '', 'true', 'false'
  const [loadingList, setLoadingList] = useState(false);

  const [mode, setMode] = useState('add'); // add | edit
  const [form, setForm] = useState({
    id: null,
    code: '',
    name: '',
    description: '',
    poin_collection: '500',
    is_active: true,
    sort_order: '',
    image_mode: 'upload',
    image_url: '',
    file: null,
    previewUrl: '',
    existingImageUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = { page, limit, q, active: activeFilter, ...opts };
      const data = await listBadges({ token, ...params });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(data.page || 1);
      setLimit(data.limit || 50);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat badges');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, activeFilter, user]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadList({ page: 1 });
  };

  const resetForm = () => {
    setMode('add');
    setForm({
      id: null,
      code: '',
      name: '',
      description: '',
      poin_collection: '500',
      is_active: true,
      sort_order: '',
      image_mode: 'upload',
      image_url: '',
      file: null,
      previewUrl: '',
      existingImageUrl: '',
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((f) => ({
      ...f,
      file,
      previewUrl: file ? URL.createObjectURL(file) : '',
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name) {
      return toast.error('Code dan name wajib diisi');
    }
    const imageMode = (form.image_mode || 'upload').toString();
    const imageUrl = (form.image_url || '').trim();
    if (mode === 'add') {
      if (imageMode === 'upload') {
        if (!(form.file instanceof File)) {
          return toast.error('File gambar wajib diisi saat membuat badge baru');
        }
      } else if (!imageUrl) {
        return toast.error('URL badge wajib diisi');
      }
    }

    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    try {
      const payloadForm = {
        code: form.code,
        name: form.name,
        description: form.description,
        poin_collection: form.poin_collection === '' ? '' : Number(form.poin_collection) || 500,
        is_active: !!form.is_active,
        sort_order: form.sort_order === '' ? '' : Number(form.sort_order) || 0,
        badge_url: imageMode !== 'upload' && imageUrl ? imageUrl : undefined,
        file: imageMode === 'upload' && form.file instanceof File ? form.file : undefined,
      };

      setSubmitting(true);
      if (mode === 'add') {
        const res = await createBadge({ token, form: payloadForm });
        toast.success(res?.message || 'Badge dibuat');
      } else {
        const res = await updateBadge({ token, id: form.id, form: payloadForm });
        toast.success(res?.message || 'Badge diperbarui');
      }
      resetForm();
      setPage(1);
      await loadList({ page: 1 });
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan badge');
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = (it) => {
    setMode('edit');
    setForm({
      id: it.id,
      code: it.code || '',
      name: it.name || '',
      description: it.description || '',
      poin_collection:
        it.poin_collection === null || it.poin_collection === undefined
          ? '500'
          : String(it.poin_collection),
      is_active: !!it.is_active,
      sort_order: typeof it.sort_order === 'number' ? String(it.sort_order) : it.sort_order || '',
      image_mode: 'upload',
      image_url: '',
      file: null,
      previewUrl: '',
      existingImageUrl: it.badge_url || '',
    });
  };

  const onRequestDelete = (it) => {
    setConfirmTarget(it);
    setConfirmOpen(true);
  };

  const onCancelDelete = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const onConfirmDelete = async () => {
    if (!confirmTarget) return;
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');
    try {
      setDeleting(true);
      const res = await deleteBadge({ token, id: confirmTarget.id });
      toast.success(res?.message || 'Badge dihapus');
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus badge');
    } finally {
      setDeleting(false);
      setConfirmTarget(null);
      setConfirmOpen(false);
    }
  };

  if (loading || !user) return null;

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <List className="size-5" /> Badges
        </h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.push('/dashboard')} className="btn btn--secondary inline-flex items-center gap-2">
            <ArrowLeft className="size-4" /> Kembali
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <form onSubmit={onSearch} className="card p-3 grid sm:grid-cols-[2fr_1fr_140px] gap-3">
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode/nama/description" className="input w-full" />
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="select w-full">
          <option value="">Semua status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
        <button type="submit" disabled={loadingList} className="btn btn--primary disabled:opacity-60">{loadingList ? 'Memuat...' : 'Cari'}</button>
      </form>

      {/* Main layout: form left sticky, table right */}
      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">

        {/* Form sticky panel */}
        <div className="lg:sticky lg:top-4">
          <form onSubmit={onSubmit} className="card p-4 space-y-3">
            <div className="text-sm font-extrabold border-b-2 border-[var(--border)] pb-2 mb-1">
              {mode === 'add' ? '+ Tambah Badge Baru' : '✎ Edit Badge'}
            </div>

            <div className="grid gap-1">
              <div className="text-xs font-extrabold">Code *</div>
              <input type="text" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="Code (wajib, unik)" className="input w-full" />
            </div>
            <div className="grid gap-1">
              <div className="text-xs font-extrabold">Name *</div>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name (wajib)" className="input w-full" />
            </div>
            <div className="grid gap-1">
              <div className="text-xs font-extrabold">Description</div>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description (opsional)" rows={2} className="input w-full resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <div className="text-xs font-extrabold">Poin Collection</div>
                <input type="number" value={form.poin_collection} onChange={(e) => setForm((f) => ({ ...f, poin_collection: e.target.value }))} placeholder="500" className="input w-full" />
              </div>
              <div className="grid gap-1">
                <div className="text-xs font-extrabold">Sort Order</div>
                <input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} placeholder="Opsional" className="input w-full" />
              </div>
            </div>

            <div className="grid gap-1">
              <div className="text-xs font-extrabold">Gambar</div>
              <select value={form.image_mode} onChange={(e) => setForm((f) => ({ ...f, image_mode: e.target.value, image_url: e.target.value === 'url' ? f.image_url : '', file: e.target.value === 'upload' ? f.file : null, previewUrl: e.target.value === 'upload' ? f.previewUrl : '' }))} className="select w-full">
                <option value="upload">Upload file</option>
                <option value="url">Gunakan URL</option>
              </select>
              {form.image_mode === 'upload' ? (
                <label className="btn btn--secondary cursor-pointer inline-flex items-center gap-2 mt-1">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <ImageIcon className="size-4" /> Pilih Gambar
                </label>
              ) : (
                <input type="url" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value, previewUrl: '' }))} placeholder="https://..." className="input w-full mt-1" />
              )}
              {(form.previewUrl || form.existingImageUrl || (form.image_mode === 'url' && form.image_url)) && (
                <div className="flex items-center gap-2 text-xs mt-1">
                  <span className="font-semibold">Preview:</span>
                  <img src={form.previewUrl || form.image_url || form.existingImageUrl} alt="preview" className="w-12 h-12 object-contain border-2 border-[var(--border)]" loading="lazy" decoding="async" />
                </div>
              )}
              <div className="flex items-start gap-2 text-xs font-semibold opacity-80 mt-1">
                <Info className="size-4 flex-shrink-0" />
                <span>Gambar badge <strong>WAJIB</strong> PNG transparan (remove BG).</span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
              Aktif
            </label>

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={submitting} className={`btn disabled:opacity-60 inline-flex items-center gap-2 ${mode === 'add' ? 'btn--primary' : 'btn--secondary'}`}>
                {submitting ? (mode === 'add' ? 'Menambah...' : 'Menyimpan...') : mode === 'add' ? <><Plus className="size-4" /> Tambah</> : <><Pencil className="size-4" /> Simpan</>}
              </button>
              {mode === 'edit' && <button type="button" onClick={resetForm} className="btn btn--secondary">Batal</button>}
            </div>
          </form>
        </div>

        {/* Table + Pagination */}
        <div className="space-y-4">
          <div className="overflow-auto">
            <table className="min-w-full border-2 border-[var(--border)] text-sm" style={{ boxShadow: 'var(--shadow-lg)' }}>
              <thead className="bg-[var(--panel-bg)]">
                <tr>
                  <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">ID</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Preview</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Code</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Name</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Poin</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Active</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Sort</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Size</th>
                  <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.id}</td>
                    <td className="px-3 py-2 border-b-2 border-[var(--border)]">
                      {it.badge_url ? <img src={it.badge_url} alt={it.name || it.code} className="w-10 h-10 object-contain border-2 border-[var(--border)]" loading="lazy" decoding="async" /> : <span className="text-xs opacity-60">-</span>}
                    </td>
                    <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.code}</td>
                    <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.name}</td>
                    <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.poin_collection ?? 500}</td>
                    <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.is_active ? 'Ya' : 'Tidak'}</td>
                    <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.sort_order ?? '-'}</td>
                    <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold text-xs">{it.width && it.height ? `${it.width}x${it.height}` : '-'}</td>
                    <td className="px-3 py-2 border-b-2 border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => onEdit(it)} className="btn btn--secondary btn--sm"><Pencil className="size-4" /></button>
                        <button type="button" onClick={() => onRequestDelete(it)} className="btn btn--danger btn--sm"><Trash2 className="size-4" /></button>
                        <Link href={`/dashboard/badges/${it.id}/owners`} className="btn btn--secondary btn--sm" title="Lihat pemilik badge"><ArrowRight className="size-4" /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Belum ada badge.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn btn--secondary disabled:opacity-60">Prev</button>
            <div className="text-sm font-extrabold">Page {page} / {totalPages}</div>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn btn--secondary disabled:opacity-60">Next</button>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete} />
          <div className="relative z-10 w-[92%] max-w-md card p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="grid place-items-center size-10 bg-[#FEB2B2] border-2 border-[var(--border)]" style={{ boxShadow: 'var(--shadow-md)' }}>
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Hapus Badge?</h3>
                <p className="text-sm opacity-80 break-words">{confirmTarget?.name} ({confirmTarget?.code})</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" disabled={deleting} onClick={onCancelDelete} className="btn btn--secondary disabled:opacity-60">Batal</button>
              <button type="button" disabled={deleting} onClick={onConfirmDelete} className="btn btn--danger disabled:opacity-60">{deleting ? 'Menghapus...' : 'Ya, Hapus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
