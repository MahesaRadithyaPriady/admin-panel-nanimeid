"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Sparkles, Pencil, Trash2, ArrowLeft, Gift } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import FileInput from '@/components/dashboard/FileInput';
import {
  listProfileAnimations,
  createProfileAnimation,
  updateProfileAnimation,
  deleteProfileAnimation,
  grantProfileAnimation,
} from '@/lib/profileAnimationsApi';

const MIN_POIN = 500000;
const TIERS = ['C', 'B', 'A', 'S', 'S_PLUS', 'SS_PLUS', 'SSS_PLUS'];
const tierLabel = (t) => String(t || '').replace(/_PLUS/g, '+');
const fmt = (n) => Number(n || 0).toLocaleString('id-ID');
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EMPTY = {
  code: '',
  title: '',
  description: '',
  accent_color: '#FF4081',
  tier: 'S',
  poin_collection: String(MIN_POIN),
  coin_price: '',
  per_user_limit: '1',
  is_active: true,
  is_limited: false,
  total_supply: '',
  starts_at: '',
  ends_at: '',
  gif_mode: 'upload',
  gif_url: '',
  file: null,
  preview_url: '',
  existing_gif_url: '',
};

export default function ProfileAnimationsPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [mode, setMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [grantFor, setGrantFor] = useState(null);
  const [grantUser, setGrantUser] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const onChange = (key) => (e) => {
    const val = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const loadList = async () => {
    setLoadingList(true);
    try {
      const data = await listProfileAnimations({ token: getSession()?.token, q });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat animasi');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (user) loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onFile = (e) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== 'image/gif') {
      toast.error('File wajib GIF (.gif)');
      e.target.value = '';
      return;
    }
    setForm((f) => ({ ...f, file, preview_url: file ? URL.createObjectURL(file) : '' }));
  };

  const validate = () => {
    if (!form.title.trim()) return 'Judul wajib diisi';
    if (!TIERS.includes(form.tier)) return 'Tier wajib dipilih';
    const poin = Number(form.poin_collection);
    if (!Number.isInteger(poin) || poin < MIN_POIN) return `Poin koleksi minimal ${fmt(MIN_POIN)}`;
    const hasNewGif = form.gif_mode === 'upload' ? form.file instanceof File : /^https:\/\/.+\.gif(\?|#|$)/i.test(form.gif_url.trim());
    if (!hasNewGif && !form.existing_gif_url) {
      return form.gif_mode === 'upload' ? 'File GIF wajib diupload' : 'URL harus https dan berakhiran .gif';
    }
    if (form.coin_price !== '' && !(Number(form.coin_price) >= 0)) return 'Harga koin harus angka';
    if (form.is_limited && form.total_supply !== '' && !(Number(form.total_supply) > 0)) return 'Total supply harus angka > 0';
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);
    setSubmitting(true);
    try {
      const token = getSession()?.token;
      const payload = {
        ...form,
        code: form.code.trim(),
        title: form.title.trim(),
        gif_url: form.gif_mode === 'url' ? form.gif_url.trim() : '',
        file: form.gif_mode === 'upload' ? form.file : null,
      };
      const res = mode === 'add'
        ? await createProfileAnimation({ token, form: payload })
        : await updateProfileAnimation({ token, id: editingId, form: payload });
      toast.success(res?.message || 'Tersimpan');
      setMode('add');
      setEditingId(null);
      setForm(EMPTY);
      await loadList();
    } catch (er) {
      toast.error(er?.message || 'Gagal menyimpan');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (it) => {
    setMode('edit');
    setEditingId(it.id);
    setForm({
      ...EMPTY,
      code: it.code || '',
      title: it.title || '',
      description: it.description || '',
      accent_color: it.accent_color || '#FF4081',
      tier: it.tier || 'S',
      poin_collection: String(Number(it.poin_collection) >= MIN_POIN ? it.poin_collection : MIN_POIN),
      coin_price: it.coin_price == null ? '' : String(it.coin_price),
      per_user_limit: it.per_user_limit == null ? '1' : String(it.per_user_limit),
      is_active: !!it.is_active,
      is_limited: !!it.is_limited,
      total_supply: it.total_supply == null ? '' : String(it.total_supply),
      starts_at: toLocalInput(it.starts_at),
      ends_at: toLocalInput(it.ends_at),
      existing_gif_url: it.gif_url || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDelete = async (it) => {
    if (!window.confirm(`Hapus animasi "${it.title}"? Kalau sudah dimiliki user, animasi hanya dinonaktifkan.`)) return;
    try {
      const res = await deleteProfileAnimation({ token: getSession()?.token, id: it.id });
      toast.success(res?.message || 'Dihapus');
      await loadList();
    } catch (er) {
      toast.error(er?.message || 'Gagal menghapus');
    }
  };

  const onGrant = async (e) => {
    e.preventDefault();
    if (!grantFor || !Number(grantUser)) return toast.error('Isi ID user');
    try {
      const res = await grantProfileAnimation({ token: getSession()?.token, id: grantFor.id, userId: grantUser });
      toast.success(res?.message || 'Diberikan');
      setGrantFor(null);
      setGrantUser('');
      await loadList();
    } catch (er) {
      toast.error(er?.message || 'Gagal memberikan');
    }
  };

  const preview = form.preview_url || (form.gif_mode === 'url' ? form.gif_url : '') || form.existing_gif_url;

  if (loading || !user) return null;

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <Sparkles className="size-5" /> Animasi Profil (GIF)
        </h2>
        <button onClick={() => router.push('/dashboard')} className="btn btn--secondary inline-flex items-center gap-2">
          <ArrowLeft className="size-4" /> Kembali
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); loadList(); }} className="card p-3 grid sm:grid-cols-[1fr_120px] gap-3">
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari (judul/kode)" className="input w-full" />
        <button type="submit" className="btn btn--primary">Cari</button>
      </form>

      <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
        <div className="lg:sticky lg:top-4">
          <form onSubmit={onSubmit} className="card p-4 space-y-3">
            <div className="text-sm font-extrabold border-b-2 border-[var(--border)] pb-2 mb-1">
              {mode === 'add' ? '+ Animasi Baru' : `✎ Edit #${editingId}`}
            </div>
            <p className="text-xs opacity-70">
              Wajib GIF, wajib tier, poin koleksi minimal {fmt(MIN_POIN)}. GIF diputar layar penuh saat profil dibuka.
            </p>

            <div className="grid gap-1">
              <label className="text-xs font-extrabold">Judul *</label>
              <input type="text" value={form.title} onChange={onChange('title')} placeholder="Sakura Bloom" className="input w-full" />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-extrabold">Kode {mode === 'add' ? '(kosong = otomatis)' : '(tidak bisa diubah)'}</label>
              <input type="text" value={form.code} onChange={onChange('code')} disabled={mode === 'edit'} placeholder="sakura_bloom" className="input w-full" />
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-extrabold">GIF * {mode === 'edit' ? '(kosong = tidak diubah)' : ''}</label>
              <select value={form.gif_mode} onChange={onChange('gif_mode')} className="select w-full">
                <option value="upload">Upload file .gif</option>
                <option value="url">URL https .gif</option>
              </select>
              {form.gif_mode === 'upload'
                ? <FileInput accept="image/gif" onChange={onFile} placeholder="Pilih file GIF..." />
                : <input type="url" value={form.gif_url} onChange={onChange('gif_url')} placeholder="https://.../animasi.gif" className="input w-full" />}
              {preview && (
                <img src={preview} alt="Preview GIF" className="mt-1 max-h-48 w-full object-contain bg-black border-2 border-[var(--border)]" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-extrabold">Tier *</label>
                <select value={form.tier} onChange={onChange('tier')} className="select w-full">
                  {TIERS.map((t) => <option key={t} value={t}>{tierLabel(t)}</option>)}
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-extrabold">Warna aksen</label>
                <input type="color" value={form.accent_color} onChange={onChange('accent_color')} className="input w-full h-10 p-1" />
              </div>
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-extrabold">Poin koleksi * (min {fmt(MIN_POIN)})</label>
              <input type="number" min={MIN_POIN} step={1000} value={form.poin_collection} onChange={onChange('poin_collection')} className="input w-full" />
              {Number(form.poin_collection) > 0 && Number(form.poin_collection) < MIN_POIN && (
                <span className="text-xs text-red-500">Kurang dari minimal {fmt(MIN_POIN)}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-extrabold">Harga koin (kosong = tidak dijual)</label>
                <input type="number" min={0} value={form.coin_price} onChange={onChange('coin_price')} className="input w-full" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-extrabold">Batas / user</label>
                <input type="number" min={1} value={form.per_user_limit} onChange={onChange('per_user_limit')} className="input w-full" />
              </div>
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-extrabold">Deskripsi</label>
              <textarea value={form.description} onChange={onChange('description')} rows={2} className="input w-full" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-extrabold">Mulai</label>
                <input type="datetime-local" value={form.starts_at} onChange={onChange('starts_at')} className="input w-full" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-extrabold">Selesai</label>
                <input type="datetime-local" value={form.ends_at} onChange={onChange('ends_at')} className="input w-full" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={onChange('is_active')} /> Aktif</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_limited} onChange={onChange('is_limited')} /> Limited (tidak bisa dibeli)</label>
            {form.is_limited && (
              <input type="number" min={1} value={form.total_supply} onChange={onChange('total_supply')} placeholder="Total supply" className="input w-full" />
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={submitting} className="btn btn--primary flex-1">
                {submitting ? 'Menyimpan…' : mode === 'add' ? 'Buat animasi' : 'Simpan perubahan'}
              </button>
              {mode === 'edit' && (
                <button type="button" onClick={() => { setMode('add'); setEditingId(null); setForm(EMPTY); }} className="btn btn--secondary">
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card p-3 overflow-x-auto">
          {loadingList ? (
            <div className="p-6 text-center text-sm opacity-70">Memuat…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm opacity-70">Belum ada animasi. Buat yang pertama di form kiri.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs opacity-70">
                  <th className="p-2">GIF</th>
                  <th className="p-2">Animasi</th>
                  <th className="p-2">Tier</th>
                  <th className="p-2">Poin</th>
                  <th className="p-2">Harga</th>
                  <th className="p-2">Pemilik</th>
                  <th className="p-2">Status</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-[var(--border)] align-middle">
                    <td className="p-2">
                      {it.gif_url
                        ? <img src={it.gif_url} alt="" className="size-14 object-cover bg-black rounded" loading="lazy" />
                        : <span className="text-xs opacity-60" title="Animasi bawaan berbasis kode — tambahkan GIF saat edit">bawaan</span>}
                    </td>
                    <td className="p-2">
                      <div className="font-bold">{it.title}</div>
                      <div className="text-xs opacity-60">{it.code}</div>
                    </td>
                    <td className="p-2 font-bold">{tierLabel(it.tier)}</td>
                    <td className="p-2">{fmt(it.poin_collection)}</td>
                    <td className="p-2">{it.coin_price == null ? '—' : fmt(it.coin_price)}</td>
                    <td className="p-2">{fmt(it.owners_count)}</td>
                    <td className="p-2">{it.is_active ? 'Aktif' : 'Nonaktif'}</td>
                    <td className="p-2">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => { setGrantFor(it); setGrantUser(''); }} className="btn btn--secondary p-2" title="Berikan ke user"><Gift className="size-4" /></button>
                        <button onClick={() => startEdit(it)} className="btn btn--secondary p-2" title="Edit"><Pencil className="size-4" /></button>
                        <button onClick={() => onDelete(it)} className="btn btn--secondary p-2" title="Hapus"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {grantFor && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => setGrantFor(null)}>
          <form onSubmit={onGrant} onClick={(e) => e.stopPropagation()} className="card p-4 w-full max-w-sm space-y-3">
            <div className="font-extrabold">Berikan &quot;{grantFor.title}&quot;</div>
            <input type="number" autoFocus value={grantUser} onChange={(e) => setGrantUser(e.target.value)} placeholder="ID user" className="input w-full" />
            <div className="flex gap-2">
              <button type="submit" className="btn btn--primary flex-1">Berikan</button>
              <button type="button" onClick={() => setGrantFor(null)} className="btn btn--secondary">Batal</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
