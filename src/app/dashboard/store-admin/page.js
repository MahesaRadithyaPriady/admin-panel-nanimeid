'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ShoppingBag, Plus, Trash2, ListFilter, ExternalLink } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listStoreItems, createStoreItem, deleteStoreItem, listBadges, listStickers } from '@/lib/api';

export default function StoreAdminPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  // List state
  const [q, setQ] = useState('');
  const [active, setActive] = useState(''); // '', 'true', 'false'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  // Create form state
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    sku: '',
    title: '',
    description: '',
    item_type: 'COIN',
    coin_price: '',
    coin_amount: '',
    vip_days: '',
    badge_name: '',
    badge_icon: '',
    badge_id: '',
    sticker_id: '',
    title_color: '',
    is_active: true,
    sort_order: '',
  });

  // Master badges untuk SUPERBADGE
  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);

  // Master stickers untuk STICKER
  const [stickers, setStickers] = useState([]);
  const [loadingStickers, setLoadingStickers] = useState(false);

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = { q: q.trim(), active: active === '' ? '' : active, page, limit, ...opts };
      const data = await listStoreItems({ token, ...params });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar item');
    } finally {
      setLoadingList(false);
    }
  };

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

  useEffect(() => {
    if (!user) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, active, user]);

  useEffect(() => {
    if (!user) return;
    if (form.item_type !== 'SUPERBADGE') return;
    if (badges.length > 0 || loadingBadges) return;
    loadBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.item_type, user, badges.length, loadingBadges]);

  useEffect(() => {
    if (!user) return;
    if (form.item_type !== 'STICKER') return;
    if (stickers.length > 0 || loadingStickers) return;
    loadStickers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.item_type, user, stickers.length, loadingStickers]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadList({ page: 1 });
  };

  const updateForm = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onCreate = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setCreating(true);
      const payload = buildItemPayload(form);
      await createStoreItem({ token, payload });
      toast.success('Item store dibuat');
      setForm({ sku: '', title: '', description: '', item_type: 'COIN', coin_price: '', coin_amount: '', vip_days: '', badge_name: '', badge_icon: '', badge_id: '', sticker_id: '', title_color: '', is_active: true, sort_order: '' });
      await loadList({ page: 1 });
      setPage(1);
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat item');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id) => {
    const token = getSession()?.token;
    try {
      await deleteStoreItem({ token, id });
      toast.success('Item dihapus');
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus item');
    }
  };

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <ShoppingBag className="size-5" /> Store Admin
            </h2>
          </div>

          {/* Create Form */}
          <form onSubmit={onCreate} className="space-y-3 p-4 border-4 rounded-lg" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="grid sm:grid-cols-2 gap-3">
              <L label="SKU"><input value={form.sku} onChange={(e)=>updateForm('sku', e.target.value)} required className="inp" /></L>
              <L label="Judul"><input value={form.title} onChange={(e)=>updateForm('title', e.target.value)} required className="inp" /></L>
              <L label="Deskripsi"><input value={form.description} onChange={(e)=>updateForm('description', e.target.value)} className="inp" /></L>
              <L label="Tipe">
                <select value={form.item_type} onChange={(e)=>updateForm('item_type', e.target.value)} className="sel">
                  <option value="COIN">COIN</option>
                  <option value="VIP">VIP</option>
                  <option value="BADGE">BADGE</option>
                  <option value="SUPERBADGE">SUPERBADGE</option>
                  <option value="STICKER">STICKER</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </L>

              {form.item_type === 'COIN' && (
                <>
                  <L label="Coin Amount"><input type="number" value={form.coin_amount} onChange={(e)=>updateForm('coin_amount', e.target.value)} className="inp" /></L>
                </>
              )}
              {form.item_type === 'VIP' && (
                <>
                  <L label="Hari VIP"><input type="number" value={form.vip_days} onChange={(e)=>updateForm('vip_days', e.target.value)} className="inp" /></L>
                </>
              )}
              {form.item_type === 'BADGE' && (
                <>
                  <L label="Nama Badge"><input value={form.badge_name} onChange={(e)=>updateForm('badge_name', e.target.value)} className="inp" /></L>
                  <L label="Icon URL"><input value={form.badge_icon} onChange={(e)=>updateForm('badge_icon', e.target.value)} className="inp" /></L>
                  <L label="Title Color"><input value={form.title_color} onChange={(e)=>updateForm('title_color', e.target.value)} className="inp" /></L>
                </>
              )}

              {form.item_type === 'SUPERBADGE' && (
                <>
                  <L label="Super Badge">
                    <select
                      value={form.badge_id}
                      onChange={(e)=>updateForm('badge_id', e.target.value)}
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
                      onChange={(e)=>updateForm('sticker_id', e.target.value)}
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

              <L label="Harga Koin"><input type="number" value={form.coin_price} onChange={(e)=>updateForm('coin_price', e.target.value)} className="inp" /></L>
              <L label="Aktif?">
                <select value={String(form.is_active)} onChange={(e)=>updateForm('is_active', e.target.value === 'true')} className="sel">
                  <option value="true">Ya</option>
                  <option value="false">Tidak</option>
                </select>
              </L>
              <L label="Urutan"><input type="number" value={form.sort_order} onChange={(e)=>updateForm('sort_order', e.target.value)} className="inp" /></L>
            </div>
            <div>
              <button disabled={creating} type="submit" className="btn-add">
                {creating ? 'Membuat...' : (<><Plus className="size-4" /> Buat Item</>)}
              </button>
            </div>
          </form>

          {/* Filters */}
          <form onSubmit={onSearch} className="grid sm:grid-cols-[1fr_180px_120px] gap-3">
            <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
              <label className="lbl flex items-center gap-2"><ListFilter className="size-4" /> Pencarian</label>
              <input type="text" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari judul/sku/tipe..." className="inp bg-panel" />
            </div>
            <select value={active} onChange={(e)=>setActive(e.target.value)} className="sel">
              <option value="">Aktif: Semua</option>
              <option value="true">Aktif: Ya</option>
              <option value="false">Aktif: Tidak</option>
            </select>
            <button type="submit" disabled={loadingList} className="btn-pri">{loadingList ? 'Memuat...' : 'Terapkan'}</button>
          </form>

          {/* Table */}
          <div className="overflow-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>SKU</Th>
                  <Th>Judul</Th>
                  <Th>Tipe</Th>
                  <Th>Harga</Th>
                  <Th>Aktif</Th>
                  <Th>Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <Td>{it.id}</Td>
                    <Td className="font-extrabold">{it.sku}</Td>
                    <Td>{it.title}</Td>
                    <Td>{it.item_type}</Td>
                    <Td>{it.coin_price ?? 0}</Td>
                    <Td>{String(it.is_active)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <a href={`/dashboard/store-admin/${it.id}`} className="btn-link" title="Detail/Edit"><ExternalLink className="size-4" /></a>
                        <button onClick={() => onDelete(it.id)} className="btn-act" title="Hapus"><Trash2 className="size-4" /></button>
                      </div>
                    </Td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="td-empty">{loadingList ? 'Memuat...' : 'Tidak ada data.'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={()=>setPage((p)=>Math.max(1,p-1))} className="btn-pg">Sebelumnya</button>
            <div className="text-sm font-extrabold">Halaman {page} / {Math.max(1, Math.ceil(total / limit))}</div>
            <button disabled={page >= Math.ceil(total/limit)} onClick={()=>setPage((p)=>p+1)} className="btn-pg">Berikutnya</button>
          </div>
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
function Th({ children }) { return <th className="th">{children}</th>; }
function Td({ children, className='' }) { return <td className={`td ${className}`}>{children}</td>; }

function buildItemPayload(form) {
  const p = {
    sku: form.sku,
    title: form.title,
    description: form.description || undefined,
    item_type: form.item_type,
    is_active: !!form.is_active,
  };
  if (form.coin_price !== '') p.coin_price = Number(form.coin_price);
  if (form.sort_order !== '') p.sort_order = Number(form.sort_order);
  if (form.item_type === 'COIN') {
    if (form.coin_amount !== '') p.coin_amount = Number(form.coin_amount);
  } else if (form.item_type === 'VIP') {
    if (form.vip_days !== '') p.vip_days = Number(form.vip_days);
  } else if (form.item_type === 'BADGE') {
    if (form.badge_name) p.badge_name = form.badge_name;
    if (form.badge_icon) p.badge_icon = form.badge_icon;
    if (form.title_color) p.title_color = form.title_color;
  } else if (form.item_type === 'SUPERBADGE') {
    if (form.badge_id !== '') p.badge_id = Number(form.badge_id);
  } else if (form.item_type === 'STICKER') {
    if (form.sticker_id !== '') p.sticker_id = Number(form.sticker_id);
  }
  return p;
}

// Styles helpers
const baseBox = { boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' };

const styles = `
.inp { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 600; }
.sel { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 800; }
.lbl { font-size: 0.875rem; font-weight: 800; }
.btn-add { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:4px 4px 0 #000; background: var(--accent-add); color: var(--accent-add-foreground); border-color: var(--panel-border); }
.btn-pri { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:4px 4px 0 #000; background: var(--accent-primary); color: var(--accent-primary-foreground); border-color: var(--panel-border); }
.btn-act { padding:0.25rem 0.5rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:3px 3px 0 #000; background: var(--panel-bg); color: var(--foreground); border-color: var(--panel-border); }
.btn-link { padding:0.25rem 0.5rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:3px 3px 0 #000; background: var(--accent-edit); color: var(--accent-edit-foreground); border-color: var(--panel-border); }
.tbl { min-width: 100%; border-width:4px; border-radius:0.5rem; overflow:hidden; box-shadow:6px 6px 0 #000; border-color: var(--panel-border); color: var(--foreground); }
.tbl thead { background: var(--panel-bg); }
.th { text-align:left; padding:0.5rem 0.75rem; border-bottom-width:4px; border-color: var(--panel-border); }
.td { padding:0.5rem 0.75rem; border-bottom-width:4px; border-color: var(--panel-border); font-weight:600; }
.td-empty { padding:1.5rem; text-align:center; font-size:0.875rem; opacity:0.7; }
.btn-pg { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; background:#fff; font-weight:800; box-shadow:4px 4px 0 #000; }
.bg-panel { background: var(--panel-bg); }
`;

if (typeof document !== 'undefined' && !document.getElementById('store-admin-styles')) {
  const style = document.createElement('style');
  style.id = 'store-admin-styles';
  style.innerHTML = styles;
  document.head.appendChild(style);
}
