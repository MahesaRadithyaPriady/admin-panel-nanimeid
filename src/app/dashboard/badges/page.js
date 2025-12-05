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
  const role = (user?.role || '').toLowerCase();
  const canAccess = role === 'superadmin';

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
    badge_url: '',
    is_active: true,
    sort_order: '',
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
    if (!canAccess) return;
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
    if (!canAccess) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, activeFilter, canAccess]);

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
      badge_url: '',
      is_active: true,
      sort_order: '',
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
      previewUrl: file ? URL.createObjectURL(file) : f.previewUrl,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name) {
      return toast.error('Code dan name wajib diisi');
    }
    if (mode === 'add' && !form.file && !form.badge_url) {
      return toast.error('URL gambar atau file gambar wajib diisi saat membuat badge baru');
    }

    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    const payloadForm = {
      code: form.code,
      name: form.name,
      description: form.description,
      badge_url: form.badge_url,
      is_active: !!form.is_active,
      sort_order: form.sort_order === '' ? '' : Number(form.sort_order) || 0,
      file: form.file || undefined,
    };

    try {
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
      badge_url: it.badge_url || '',
      is_active: !!it.is_active,
      sort_order: typeof it.sort_order === 'number' ? String(it.sort_order) : it.sort_order || '',
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
  if (!canAccess) {
    return (
      <div className="text-sm font-semibold">
        Halaman ini khusus superadmin. Anda login sebagai{' '}
        <span
          className="px-2 py-1 border-2 rounded"
          style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
        >
          {user.role}
        </span>
        .
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <List className="size-5" /> Badges
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="btn-pg flex items-center gap-2"
          >
            <ArrowLeft className="size-4" /> Kembali
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div
        className="p-3 border-4 rounded-lg"
        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
      >
        <form onSubmit={onSearch} className="grid sm:grid-cols-[2fr_1fr_140px] gap-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kode/nama/description"
            className="px-3 py-2 border-4 rounded-lg font-semibold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          />
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 border-4 rounded-lg font-semibold text-sm"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <option value="">Semua status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
          <button
            type="submit"
            disabled={loadingList}
            className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}
          >
            {loadingList ? 'Memuat...' : 'Cari'}
          </button>
        </form>
      </div>

      {/* Form Tambah / Edit */}
      <div
        className="p-3 border-4 rounded-lg space-y-3"
        style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
      >
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="Code (wajib, unik)"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            />
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name (wajib)"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            />
          </div>

          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (opsional)"
            rows={2}
            className="px-3 py-2 border-4 rounded-lg font-semibold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          />

          <input
            type="text"
            value={form.badge_url}
            onChange={(e) => setForm((f) => ({ ...f, badge_url: e.target.value }))}
            placeholder="Badge URL (opsional jika upload file)"
            className="px-3 py-2 border-4 rounded-lg font-semibold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          />

          <div className="grid sm:grid-cols-2 gap-3 items-start">
            <div className="space-y-2">
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                placeholder="Sort order (opsional)"
                className="w-full px-3 py-2 border-4 rounded-lg font-semibold"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label
                  className="px-3 py-2 border-4 rounded-lg font-extrabold cursor-pointer"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                >
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <span className="flex items-center gap-2">
                    <ImageIcon className="size-4" /> Pilih Gambar
                  </span>
                </label>
                {(form.previewUrl || form.existingImageUrl) && (
                  <div className="flex items-center gap-2 text-xs">
                    <span>Preview:</span>
                    <img
                      src={form.previewUrl || form.existingImageUrl}
                      alt="preview"
                      className="w-10 h-10 object-contain border-2 rounded"
                      style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2 text-xs sm:text-[11px] font-semibold opacity-90">
                <Info className="size-4 flex-shrink-0" />
                <span>
                  Gambar badge <strong>WAJIB</strong> sudah di-remove background (PNG transparan) sebelum diupload.
                </span>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-[160px_auto] gap-3 items-center">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #000', background: mode === 'add' ? 'var(--accent-add)' : 'var(--accent-edit)', color: mode === 'add' ? 'var(--accent-add-foreground)' : 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}
            >
              {submitting ? (
                mode === 'add' ? 'Menambah...' : 'Menyimpan...'
              ) : mode === 'add' ? (
                <>
                  <Plus className="size-4" /> Tambah
                </>
              ) : (
                <>
                  <Pencil className="size-4" /> Simpan
                </>
              )}
            </button>
            {mode === 'edit' && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2 border-4 rounded-lg font-extrabold"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                Batal Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tabel List Badges */}
      <div className="overflow-auto">
        <table
          className="min-w-full border-4 rounded-lg overflow-hidden"
          style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
        >
          <thead style={{ background: 'var(--panel-bg)' }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                ID
              </th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                Preview
              </th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                Code
              </th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                Name
              </th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                Active
              </th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                Sort
              </th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                Size
              </th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>
                  {it.id}
                </td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                  {it.badge_url ? (
                    <img
                      src={it.badge_url}
                      alt={it.name || it.code}
                      className="w-10 h-10 object-contain border-2 rounded"
                      style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
                    />
                  ) : (
                    <span className="text-xs opacity-60">-</span>
                  )}
                </td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>
                  {it.code}
                </td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>
                  {it.name}
                </td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>
                  {it.is_active ? 'Ya' : 'Tidak'}
                </td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>
                  {it.sort_order ?? '-'}
                </td>
                <td className="px-3 py-2 border-b-4 font-semibold text-xs" style={{ borderColor: 'var(--panel-border)' }}>
                  {it.width && it.height ? `${it.width}x${it.height}` : '-'}
                </td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(it)}
                      className="px-2 py-1 border-4 rounded font-extrabold"
                      style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(it)}
                      className="px-2 py-1 border-4 rounded font-extrabold"
                      style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <Link
                      href={`/dashboard/badges/${it.id}/owners`}
                      className="px-2 py-1 border-4 rounded font-extrabold"
                      style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                      title="Lihat pemilik badge"
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-sm opacity-70"
                >
                  {loadingList ? 'Memuat...' : 'Belum ada badge.'}
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
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
        >
          Prev
        </button>
        <div className="text-sm font-extrabold">
          Page {page} / {totalPages}
        </div>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
        >
          Next
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete} />
          <div
            className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6"
            style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="grid place-items-center size-10 bg-[#FEB2B2] border-4 rounded-md"
                style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}
              >
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Hapus Badge?</h3>
                <p className="text-sm opacity-80 break-words">
                  {confirmTarget?.name} ({confirmTarget?.code})
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={onCancelDelete}
                className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={onConfirmDelete}
                className="px-3 py-2 border-4 rounded-lg bg-[#FFD803] hover:brightness-95 font-extrabold disabled:opacity-60"
                style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
