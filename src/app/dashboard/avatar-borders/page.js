"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Image as ImageIcon, Pencil, Trash2, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { createAvatarBorder, createAvatarBorderWithFile, listAvatarBorders, updateAvatarBorder, updateAvatarBorderWithFile, deleteAvatarBorder } from '@/lib/api';

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
    file: null,
    preview_url: '',
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
      file: null,
      preview_url: '',
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
    if (mode === 'add' && !form.file) {
      toast.error('File gambar wajib saat membuat border baru');
      return false;
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
      preview_url: file ? URL.createObjectURL(file) : (mode === 'edit' ? f.preview_url : ''),
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const token = getSession()?.token;
      if (mode === 'add') {
        const res = await createAvatarBorderWithFile({
          token,
          form: {
            code: form.code.trim(),
            title: form.title.trim(),
            coin_price: form.coin_price === '' ? null : Number(form.coin_price),
            is_active: !!form.is_active,
            starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : '',
            ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : '',
            is_limited: !!form.is_limited,
            total_supply: form.total_supply === '' ? '' : Number(form.total_supply),
            per_user_limit: Number(form.per_user_limit || 1),
            tier: form.tier,
            file: form.file,
          },
        });
        toast.success(res?.message || 'Avatar border dibuat');
        resetForm();
        setPage(1);
        await loadList({ page: 1 });
      } else {
        if (form.file) {
          const res = await updateAvatarBorderWithFile({
            token,
            id: editingId,
            form: {
              code: form.code.trim(),
              title: form.title.trim(),
              coin_price: form.coin_price === '' ? '' : Number(form.coin_price),
              is_active: !!form.is_active,
              starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : '',
              ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : '',
              is_limited: !!form.is_limited,
              total_supply: form.total_supply === '' ? '' : Number(form.total_supply),
              per_user_limit: form.per_user_limit === '' ? '' : Number(form.per_user_limit || 1),
              tier: form.tier,
              file: form.file,
            },
          });
          toast.success(res?.message || 'Avatar border diupdate');
        } else {
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
          };
          const res = await updateAvatarBorder({ token, id: editingId, payload });
          toast.success(res?.message || 'Avatar border diupdate');
        }
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
      file: null,
      preview_url: it.image_url || '',
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
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/dashboard')} className="btn-pg flex items-center gap-2">
                <ArrowLeft className="size-4" /> Kembali
              </button>
            </div>
          </div>

          {/* Filters */}
          <form onSubmit={onSearch} className="grid sm:grid-cols-[1fr_160px_120px] gap-3 mb-4">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari (kode/judul)"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            />
            <select
              value={active}
              onChange={(e) => setActive(e.target.value)}
              className="px-3 py-2 border-4 rounded-lg bg-white font-extrabold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              <option value="">Semua</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
            <button type="submit" className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>Terapkan</button>
          </form>

          {/* Form Add/Edit */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-extrabold">Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={onChange('code')}
                  placeholder="ELAINA_WHITE"
                  className="w-full px-3 py-2 border-4 rounded-lg font-semibold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-extrabold">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={onChange('title')}
                  placeholder="Elaina White"
                  className="w-full px-3 py-2 border-4 rounded-lg font-semibold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-extrabold">Gambar Border {mode === 'add' ? '*' : '(biarkan kosong jika tidak diubah)'}</label>
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="w-full px-3 py-2 border-4 rounded-lg font-semibold"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              />
              {form.preview_url ? (
                <div className="mt-2">
                  <img src={form.preview_url} alt="Preview" className="max-h-40 border-4 rounded-lg" style={{ borderColor: 'var(--panel-border)' }} />
                </div>
              ) : null}
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-extrabold">Harga Koin (kosongkan untuk null)</label>
                <input
                  type="number"
                  value={form.coin_price}
                  onChange={onChange('coin_price')}
                  placeholder="500"
                  className="w-full px-3 py-2 border-4 rounded-lg font-semibold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-extrabold">Batas per Pengguna</label>
                <input
                  type="number"
                  value={form.per_user_limit}
                  onChange={onChange('per_user_limit')}
                  placeholder="1"
                  className="w-full px-3 py-2 border-4 rounded-lg font-semibold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-extrabold">Tier</label>
                <select
                  value={form.tier}
                  onChange={onChange('tier')}
                  className="w-full px-3 py-2 border-4 rounded-lg font-extrabold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                >
                  <option value="C">C</option>
                  <option value="B">B</option>
                  <option value="A">A</option>
                  <option value="S">S</option>
                  <option value="S+">S+</option>
                  <option value="SS+">SS+</option>
                  <option value="SSS+">SSS+</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 font-extrabold">
                  <input type="checkbox" checked={form.is_active} onChange={onChange('is_active')} /> Aktif
                </label>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-extrabold">Starts At (opsional)</label>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={onChange('starts_at')}
                  className="w-full px-3 py-2 border-4 rounded-lg font-semibold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-extrabold">Ends At (opsional)</label>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={onChange('ends_at')}
                  className="w-full px-3 py-2 border-4 rounded-lg font-semibold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 font-extrabold">
                  <input type="checkbox" checked={form.is_limited} onChange={onChange('is_limited')} /> Limited Supply
                </label>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-extrabold">Total Stok (isi angka jika terbatas)</label>
                <input
                  type="number"
                  value={form.total_supply}
                  onChange={onChange('total_supply')}
                  placeholder="contoh: 250"
                  className="w-full px-3 py-2 border-4 rounded-lg font-semibold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60`}
                style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)', background: mode === 'add' ? 'var(--accent-add)' : 'var(--accent-edit)', color: mode === 'add' ? 'var(--accent-add-foreground)' : 'var(--accent-edit-foreground)' }}
              >
                {submitting ? 'Menyimpan...' : mode === 'add' ? (<><Plus className="inline size-4" /> Simpan Baru</>) : (<><Pencil className="inline size-4" /> Simpan Perubahan</>)}
              </button>
              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={() => { setMode('add'); setEditingId(null); }}
                  className="px-4 py-2 border-4 rounded-lg font-extrabold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                >
                  Batal Edit
                </button>
              )}
            </div>
          </form>

          {/* Table */}
          <div className="overflow-auto">
            <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <thead style={{ background: 'var(--panel-bg)' }}>
                <tr>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Code</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Title</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Harga</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aktif</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Terbatas</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Stok</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2 border-b-4 font-extrabold" style={{ borderColor: 'var(--panel-border)' }}>{it.code}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.title}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.coin_price == null ? '-' : it.coin_price}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.is_active ? 'Ya' : 'Tidak'}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.is_limited ? 'Ya' : 'Tidak'}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.total_supply == null ? '-' : it.total_supply}</td>
                    <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onEdit(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>
                          <Pencil className="size-4" />
                        </button>
                        <button onClick={() => onRequestDelete(it)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>
                          <Trash2 className="size-4" />
                        </button>
                        <Link href={`/dashboard/avatar-borders/${it.id}/owners`} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }} title="Lihat pemilik border">
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Tidak ada data.'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Sebelumnya</button>
            <div className="text-sm font-extrabold">Halaman {page} / {Math.max(1, Math.ceil(total / limit))}</div>
            <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Berikutnya</button>
          </div>

          {/* Confirm Delete Modal */}
          {confirmOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center">
              <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete} />
              <div className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid place-items-center size-10 bg-[#FEB2B2] border-4 rounded-md" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>
                    <Trash2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">Hapus Avatar Border?</h3>
                    <p className="text-sm opacity-80 break-words">{confirmTarget?.title} ({confirmTarget?.code})</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={onCancelDelete} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                    Batal
                  </button>
                  <button onClick={onConfirmDelete} disabled={deleting} className="px-3 py-2 border-4 rounded-lg bg-[#FFD803] hover:brightness-95 font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
