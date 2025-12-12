'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ShoppingBag, Save, Trash2, ArrowLeft } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getStoreItem, updateStoreItem, deleteStoreItem, listBadges, listStickers } from '@/lib/api';

export default function StoreItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const id = params?.id;

  const [loadingItem, setLoadingItem] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sku: '', title: '', description: '', item_type: 'COIN', coin_price: '', coin_amount: '', vip_days: '', badge_name: '', badge_icon: '', badge_id: '', sticker_id: '', title_color: '', is_active: true, sort_order: ''
  });

  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);

  const [stickers, setStickers] = useState([]);
  const [loadingStickers, setLoadingStickers] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoadingItem(true);
      try {
        const token = getSession()?.token;
        const res = await getStoreItem({ token, id });
        const it = res?.data || res?.item || res; // tolerate shape
        setForm({
          sku: it?.sku || '',
          title: it?.title || '',
          description: it?.description || '',
          item_type: (it?.item_type || 'COIN').toUpperCase(),
          coin_price: it?.coin_price ?? '',
          coin_amount: it?.coin_amount ?? '',
          vip_days: it?.vip_days ?? '',
          badge_name: it?.badge_name || '',
          badge_icon: it?.badge_icon || '',
          badge_id: it?.badge_id ?? '',
          sticker_id: it?.sticker_id ?? '',
          title_color: it?.title_color || '',
          is_active: !!it?.is_active,
          sort_order: it?.sort_order ?? '',
        });
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat item');
      } finally {
        setLoadingItem(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const loadBadges = async () => {
      try {
        setLoadingBadges(true);
        const token = getSession()?.token;
        if (!token) return;
        const data = await listBadges({ token, page: 1, limit: 200, q: '', active: 'true' });
        setBadges(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat daftar badge');
      } finally {
        setLoadingBadges(false);
      }
    };

    if (form.item_type !== 'SUPERBADGE') return;
    if (badges.length > 0 || loadingBadges) return;
    loadBadges();
  }, [form.item_type, isSuperAdmin, badges.length, loadingBadges]);

  useEffect(() => {
    const loadStickers = async () => {
      try {
        setLoadingStickers(true);
        const token = getSession()?.token;
        if (!token) return;
        const data = await listStickers({ token, page: 1, limit: 200, q: '' });
        setStickers(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat daftar stiker');
      } finally {
        setLoadingStickers(false);
      }
    };

    if (form.item_type !== 'STICKER') return;
    if (stickers.length > 0 || loadingStickers) return;
    loadStickers();
  }, [form.item_type, isSuperAdmin, stickers.length, loadingStickers]);

  const updateField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setSaving(true);
      const payload = buildUpdatePayload(form);
      await updateStoreItem({ token, id, payload });
      toast.success('Item disimpan');
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan item');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const token = getSession()?.token;
    try {
      await deleteStoreItem({ token, id });
      toast.success('Item dihapus');
      router.push('/dashboard/store-admin');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus item');
    }
  };

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2"><ShoppingBag className="size-5" /> Detail Item Store</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/dashboard/store-admin')} className="btn-pg flex items-center gap-2"><ArrowLeft className="size-4" /> Kembali</button>
            </div>
          </div>

          {loadingItem ? (
            <div className="text-sm">Memuat...</div>
          ) : (
            <form onSubmit={onSave} className="space-y-3 p-4 border-4 rounded-lg" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <L label="SKU"><input value={form.sku} onChange={(e)=>updateField('sku', e.target.value)} required className="inp" /></L>
                <L label="Judul"><input value={form.title} onChange={(e)=>updateField('title', e.target.value)} required className="inp" /></L>
                <L label="Deskripsi"><input value={form.description} onChange={(e)=>updateField('description', e.target.value)} className="inp" /></L>
                <L label="Tipe">
                  <select value={form.item_type} onChange={(e)=>updateField('item_type', e.target.value)} className="sel">
                    <option value="COIN">COIN</option>
                    <option value="VIP">VIP</option>
                    <option value="BADGE">BADGE</option>
                    <option value="SUPERBADGE">SUPERBADGE</option>
                    <option value="STICKER">STICKER</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </L>

                {form.item_type === 'COIN' && (<L label="Coin Amount"><input type="number" value={form.coin_amount} onChange={(e)=>updateField('coin_amount', e.target.value)} className="inp" /></L>)}
                {form.item_type === 'VIP' && (<L label="Hari VIP"><input type="number" value={form.vip_days} onChange={(e)=>updateField('vip_days', e.target.value)} className="inp" /></L>)}
                {form.item_type === 'BADGE' && (
                  <>
                    <L label="Nama Badge"><input value={form.badge_name} onChange={(e)=>updateField('badge_name', e.target.value)} className="inp" /></L>
                    <L label="Icon URL"><input value={form.badge_icon} onChange={(e)=>updateField('badge_icon', e.target.value)} className="inp" /></L>
                    <L label="Title Color"><input value={form.title_color} onChange={(e)=>updateField('title_color', e.target.value)} className="inp" /></L>
                  </>
                )}

                {form.item_type === 'SUPERBADGE' && (
                  <>
                    <L label="Super Badge">
                      <select
                        value={form.badge_id}
                        onChange={(e)=>updateField('badge_id', e.target.value)}
                        className="sel"
                      >
                        <option value="">Pilih Super Badge...</option>
                        {badges.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name || b.code} (#{b.id})
                          </option>
                        ))}
                      </select>
                    </L>
                    {loadingBadges && (
                      <div className="text-xs font-semibold opacity-70">Memuat daftar badge...</div>
                    )}
                  </>
                )}

                {form.item_type === 'STICKER' && (
                  <>
                    <L label="Sticker">
                      <select
                        value={form.sticker_id}
                        onChange={(e)=>updateField('sticker_id', e.target.value)}
                        className="sel"
                      >
                        <option value="">Pilih Sticker...</option>
                        {stickers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name || s.code} (#{s.id})
                          </option>
                        ))}
                      </select>
                    </L>
                    {loadingStickers && (
                      <div className="text-xs font-semibold opacity-70">Memuat daftar stiker...</div>
                    )}
                  </>
                )}

                <L label="Harga Koin"><input type="number" value={form.coin_price} onChange={(e)=>updateField('coin_price', e.target.value)} className="inp" /></L>
                <L label="Aktif?">
                  <select value={String(form.is_active)} onChange={(e)=>updateField('is_active', e.target.value === 'true')} className="sel">
                    <option value="true">Ya</option>
                    <option value="false">Tidak</option>
                  </select>
                </L>
                <L label="Urutan"><input type="number" value={form.sort_order} onChange={(e)=>updateField('sort_order', e.target.value)} className="inp" /></L>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={saving} type="submit" className="btn-add flex items-center gap-2"><Save className="size-4" /> Simpan</button>
                <button type="button" onClick={onDelete} className="btn-act flex items-center gap-2"><Trash2 className="size-4" /> Hapus</button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function L({ label, children }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
      <label className="lbl">{label}</label>
      {children}
    </div>
  );
}

// Normalize form into update payload
function buildUpdatePayload(form) {
  const out = {};
  const setStr = (k) => {
    const v = form?.[k];
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (s !== '') out[k] = s;
  };
  const setNum = (k) => {
    const v = form?.[k];
    if (v === undefined || v === null || v === '') return;
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  };

  setStr('sku');
  setStr('title');
  setStr('description');
  if (typeof form?.item_type === 'string') out.item_type = form.item_type.toUpperCase();
  setNum('coin_price');
  setNum('coin_amount');
  setNum('vip_days');
  setNum('badge_id');
  setNum('sticker_id');
  setStr('badge_name');
  setStr('badge_icon');
  setStr('title_color');
  if (typeof form?.is_active === 'boolean') out.is_active = form.is_active;
  setNum('sort_order');

  return out;
}

// Styles (re-use from store-admin page if present)
const styles = `
.inp { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 600; }
.sel { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 800; }
.lbl { font-size: 0.875rem; font-weight: 800; }
.btn-add { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:4px 4px 0 #000; background: var(--accent-add); color: var(--accent-add-foreground); border-color: var(--panel-border); }
.btn-act { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:3px 3px 0 #000; background: var(--panel-bg); color: var(--foreground); border-color: var(--panel-border); }
.btn-pg { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; background:#fff; font-weight:800; box-shadow:4px 4px 0 #000; }
`;
if (typeof document !== 'undefined' && !document.getElementById('store-admin-detail-styles')) {
  const style = document.createElement('style');
  style.id = 'store-admin-detail-styles';
  style.innerHTML = styles;
  document.head.appendChild(style);
}
