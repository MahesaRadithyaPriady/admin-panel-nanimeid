"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Image as ImageIcon, Pencil, Trash2, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { createAvatarBorder, createAvatarBorderWithFile, listAvatarBorders, updateAvatarBorder, updateAvatarBorderWithFile, deleteAvatarBorder } from '@/lib/api';
import FileInput from '@/components/dashboard/FileInput';

export default function AvatarBordersPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  // List & filters
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(''); // '' | 'true' | 'false'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  // Form add/edit
  const [mode, setMode] = useState('add'); // add | edit
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    code: '',
    title: '',
    coin_price: '', // string to allow empty -> null
    is_active: true,
    starts_at: '',
    ends_at: '',
    is_limited: false,
    total_supply: '', // string to allow empty -> null
    per_user_limit: '1',
    tier: 'C',
    image_mode: 'upload',
    image_url: '',
    file: null,
    preview_url: '',
    existing_image_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const resetForm = () => {
    setForm({
      code: '',
      title: '',
      coin_price: '',
      is_active: true,
      starts_at: '',
      ends_at: '',
      is_limited: false,
      total_supply: '',
      per_user_limit: '1',
      tier: 'C',
      image_mode: 'upload',
      image_url: '',
      file: null,
      preview_url: '',
      existing_image_url: '',
    });
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const onChange = (key) => (e) => {
    const val = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const validate = () => {
    if (!form.code.trim() || !form.title.trim()) {
      toast.error('code dan title wajib');
      return false;
    }
    const imageMode = (form.image_mode || 'upload').toString();
    const imageUrl = (form.image_url || '').trim();
    if (mode === 'add') {
      if (imageMode === 'upload' && !(form.file instanceof File)) {
        toast.error('File gambar wajib saat membuat border baru');
        return false;
      }
      if (imageMode !== 'upload' && !imageUrl) {
        toast.error('URL gambar wajib saat membuat border baru');
        return false;
      }
    }
    if (form.is_limited && form.total_supply !== '' && Number.isNaN(Number(form.total_supply))) {
      toast.error('total_supply harus angka');
      return false;
    }
    if (form.coin_price !== '' && Number.isNaN(Number(form.coin_price))) {
      toast.error('coin_price harus angka atau kosong');
      return false;
    }
    if (form.per_user_limit === '' || Number.isNaN(Number(form.per_user_limit))) {
      toast.error('per_user_limit wajib angka');
      return false;
    }
    return true;
  };

  const onFileChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setForm((f) => ({
      ...f,
      file,
      preview_url: file ? URL.createObjectURL(file) : '',
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const token = getSession()?.token;
      if (!token) throw new Error('Token tidak tersedia');
      const imageMode = (form.image_mode || 'upload').toString();
      const imageUrl = (form.image_url || '').trim();

      const payload = {
        code: form.code.trim(),
        title: form.title.trim(),
        coin_price: form.coin_price === '' ? null : Number(form.coin_price),
        is_active: !!form.is_active,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_limited: !!form.is_limited,
        total_supply: form.total_supply === '' ? null : Number(form.total_supply),
        per_user_limit: Number(form.per_user_limit || 1),
        tier: form.tier,
        ...(imageMode !== 'upload' && imageUrl ? { image_url: imageUrl } : {}),
      };

      if (mode === 'add') {
        const res = imageMode === 'upload'
          ? await createAvatarBorderWithFile({ token, form: { ...payload, file: form.file } })
          : await createAvatarBorder({ token, payload });
        toast.success(res?.message || 'Avatar border dibuat');
        resetForm();
        setPage(1);
        await loadList({ page: 1 });
      } else {
        const res = imageMode === 'upload' && form.file instanceof File
          ? await updateAvatarBorderWithFile({ token, id: editingId, form: { ...payload, file: form.file } })
          : await updateAvatarBorder({ token, id: editingId, payload });
        toast.success(res?.message || 'Avatar border diupdate');
        setMode('add');
        setEditingId(null);
        resetForm();
        await loadList();
      }
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat avatar border');
    } finally {
      setSubmitting(false);
    }
  };

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = { page, limit, q, active: active === '' ? '' : active };
      const data = await listAvatarBorders({ token, ...params, ...opts });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat avatar borders');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, active, user]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadList({ page: 1 });
  };

  const onEdit = (it) => {
    setMode('edit');
    setEditingId(it.id);
    setForm({
      code: it.code || '',
      title: it.title || '',
      coin_price: it.coin_price == null ? '' : String(it.coin_price),
      is_active: !!it.is_active,
      starts_at: it.starts_at ? new Date(it.starts_at).toISOString().slice(0, 16) : '',
      ends_at: it.ends_at ? new Date(it.ends_at).toISOString().slice(0, 16) : '',
      is_limited: !!it.is_limited,
      total_supply: it.total_supply == null ? '' : String(it.total_supply),
      per_user_limit: it.per_user_limit == null ? '1' : String(it.per_user_limit),
      tier: it.tier || 'C',
      image_mode: 'upload',
      image_url: '',
      file: null,
      preview_url: '',
      existing_image_url: it.image_url || '',
    });
  };

  const onRequestDelete = (it) => {
    setConfirmTarget(it);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!confirmTarget) return;
    const token = getSession()?.token;
    try {
      setDeleting(true);
      await deleteAvatarBorder({ token, id: confirmTarget.id });
      toast.success('Avatar border dihapus');
      if (mode === 'edit' && editingId === confirmTarget.id) {
        setMode('add');
        setEditingId(null);
      }
      setConfirmOpen(false);
      setConfirmTarget(null);
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus avatar border');
    } finally {
      setDeleting(false);
    }
  };

  const onCancelDelete = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <ImageIcon className="size-5" /> {mode === 'add' ? 'Tambah Avatar Border' : 'Ubah Avatar Border'}
            </h2>
            <button onClick={() => router.push('/dashboard')} className="btn btn--secondary inline-flex items-center gap-2">
              <ArrowLeft className="size-4" /> Kembali
            </button>
          </div>

          {/* Filters */}
          <form onSubmit={onSearch} className="card p-3 grid sm:grid-cols-[1fr_160px_120px] gap-3">
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari (kode/judul)" className="input w-full" />
            <select value={active} onChange={(e) => setActive(e.target.value)} className="select w-full">
              <option value="">Semua</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
            <button type="submit" className="btn btn--primary">Terapkan</button>
          </form>

          {/* Main layout: form left, table right */}
          <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start">

            {/* Form Add/Edit — sticky on large screens */}
            <div className="lg:sticky lg:top-4">
              <form onSubmit={onSubmit} className="card p-4 space-y-3">
                <div className="text-sm font-extrabold border-b-2 border-[var(--border)] pb-2 mb-1">
                  {mode === 'add' ? '+ Tambah Border Baru' : '✎ Edit Border'}
                </div>

                <div className="grid gap-1">
                  <label className="text-xs font-extrabold">Code *</label>
                  <input type="text" value={form.code} onChange={onChange('code')} placeholder="ELAINA_WHITE" className="input w-full" />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-extrabold">Title *</label>
                  <input type="text" value={form.title} onChange={onChange('title')} placeholder="Elaina White" className="input w-full" />
                </div>

                <div className="grid gap-1">
                  <label className="text-xs font-extrabold">Gambar {mode === 'add' ? '*' : '(kosong = tidak diubah)'}</label>
                  <select value={form.image_mode} onChange={onChange('image_mode')} className="select w-full">
                    <option value="upload">Upload file</option>
                    <option value="url">Gunakan URL</option>
                  </select>
                  {form.image_mode === 'upload' ? (
                    <FileInput accept="image/*" onChange={onFileChange} placeholder="Pilih gambar border..." />
                  ) : (
                    <input type="url" value={form.image_url} onChange={onChange('image_url')} placeholder="https://..." className="input w-full" />
                  )}
                  {(form.preview_url || form.image_url || form.existing_image_url) && (
                    <img src={form.preview_url || form.image_url || form.existing_image_url} alt="Preview" className="mt-1 max-h-32 border-2 border-[var(--border)]" loading="lazy" decoding="async" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <label className="text-xs font-extrabold">Harga Koin</label>
                    <input type="number" value={form.coin_price} onChange={onChange('coin_price')} placeholder="500" className="input w-full" />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-extrabold">Batas / User</label>
                    <input type="number" value={form.per_user_limit} onChange={onChange('per_user_limit')} placeholder="1" className="input w-full" />
                  </div>
                </div>

                <div className="grid gap-1">
                  <label className="text-xs font-extrabold">Tier</label>
                  <select value={form.tier} onChange={onChange('tier')} className="select w-full">
                    <option value="C">C</option>
                    <option value="B">B</option>
                    <option value="A">A</option>
                    <option value="S">S</option>
                    <option value="S_PLUS">S_PLUS</option>
                    <option value="SS_PLUS">SS_PLUS</option>
                    <option value="SSS_PLUS">SSS_PLUS</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1 min-w-0">
                    <label className="text-xs font-extrabold">Mulai</label>
                    <input type="datetime-local" value={form.starts_at} onChange={onChange('starts_at')} className="input w-full min-w-0 text-xs" />
                  </div>
                  <div className="grid gap-1 min-w-0">
                    <label className="text-xs font-extrabold">Berakhir</label>
                    <input type="datetime-local" value={form.ends_at} onChange={onChange('ends_at')} className="input w-full min-w-0 text-xs" />
                  </div>
                </div>

                <div className="grid gap-1">
                  <label className="text-xs font-extrabold">Total Stok (opsional)</label>
                  <input type="number" value={form.total_supply} onChange={onChange('total_supply')} placeholder="contoh: 250" className="input w-full" />
                </div>

                <div className="flex items-center gap-4 text-sm font-semibold">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.is_active} onChange={onChange('is_active')} /> Aktif
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.is_limited} onChange={onChange('is_limited')} /> Limited Supply
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button type="submit" disabled={submitting} className={`btn disabled:opacity-60 inline-flex items-center gap-2 ${mode === 'add' ? 'btn--primary' : 'btn--secondary'}`}>
                    {submitting ? 'Menyimpan...' : mode === 'add' ? <><Plus className="size-4" /> Simpan Baru</> : <><Pencil className="size-4" /> Simpan Perubahan</>}
                  </button>
                  {mode === 'edit' && (
                    <button type="button" onClick={() => { setMode('add'); setEditingId(null); resetForm(); }} className="btn btn--secondary">Batal</button>
                  )}
                </div>
              </form>
            </div>

            {/* Table + Pagination */}
            <div className="space-y-4">
              <div className="overflow-auto">
                <table className="min-w-full border-2 border-[var(--border)] text-sm" style={{ boxShadow: 'var(--shadow-lg)' }}>
                  <thead className="bg-[var(--panel-bg)]">
                    <tr>
                      <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Code</th>
                      <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Title</th>
                      <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Harga</th>
                      <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Aktif</th>
                      <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Terbatas</th>
                      <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Stok</th>
                      <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-3 py-2 border-b-2 border-[var(--border)] font-extrabold">{it.code}</td>
                        <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.title}</td>
                        <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.coin_price == null ? '-' : it.coin_price}</td>
                        <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.is_active ? 'Ya' : 'Tidak'}</td>
                        <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.is_limited ? 'Ya' : 'Tidak'}</td>
                        <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.total_supply == null ? '-' : it.total_supply}</td>
                        <td className="px-3 py-2 border-b-2 border-[var(--border)]">
                          <div className="flex items-center gap-2">
                            <button onClick={() => onEdit(it)} className="btn btn--secondary btn--sm"><Pencil className="size-4" /></button>
                            <button onClick={() => onRequestDelete(it)} className="btn btn--danger btn--sm"><Trash2 className="size-4" /></button>
                            <Link href={`/dashboard/avatar-borders/${it.id}/owners`} className="btn btn--secondary btn--sm" title="Lihat pemilik border"><ArrowRight className="size-4" /></Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Tidak ada data.'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn btn--secondary disabled:opacity-60">Sebelumnya</button>
                <div className="text-sm font-extrabold">Halaman {page} / {Math.max(1, Math.ceil(total / limit))}</div>
                <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)} className="btn btn--secondary disabled:opacity-60">Berikutnya</button>
              </div>
            </div>
          </div>

          {/* Confirm Delete Modal */}
          {confirmOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center">
              <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete} />
              <div className="relative z-10 w-[92%] max-w-md card p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid place-items-center size-10 bg-[#FEB2B2] border-2 border-[var(--border)]" style={{ boxShadow: 'var(--shadow-md)' }}>
                    <Trash2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">Hapus Avatar Border?</h3>
                    <p className="text-sm opacity-80 break-words">{confirmTarget?.title} ({confirmTarget?.code})</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={onCancelDelete} className="btn btn--secondary">Batal</button>
                  <button onClick={onConfirmDelete} disabled={deleting} className="btn btn--danger disabled:opacity-60">{deleting ? 'Menghapus...' : 'Ya, Hapus'}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
