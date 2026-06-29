'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ShoppingBag, Plus, Trash2, ListFilter, ExternalLink } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listStoreItems, createStoreItem, deleteStoreItem, listBadges, listStickers, listAvatarBorders } from '@/lib/api';

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
    avatar_border_id: '',
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

  // Master avatar borders untuk AVATAR_BORDER
  const [avatarBorders, setAvatarBorders] = useState([]);
  const [loadingAvatarBorders, setLoadingAvatarBorders] = useState(false);

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

  const loadAvatarBorders = async () => {
    try {
      setLoadingAvatarBorders(true);
      const token = getSession()?.token;
      if (!token) return;
      const data = await listAvatarBorders({ token, page: 1, limit: 200, q: '', active: 'true' });
      setAvatarBorders(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar avatar border');
    } finally {
      setLoadingAvatarBorders(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (form.item_type !== 'BORDER') return;
    if (avatarBorders.length > 0 || loadingAvatarBorders) return;
    loadAvatarBorders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.item_type, user, avatarBorders.length, loadingAvatarBorders]);

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
      setForm({ sku: '', title: '', description: '', item_type: 'COIN', coin_price: '', coin_amount: '', vip_days: '', badge_name: '', badge_icon: '', badge_id: '', sticker_id: '', avatar_border_id: '', title_color: '', is_active: true, sort_order: '' });
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
          <form onSubmit={onCreate} className="card p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <L label="SKU"><input value={form.sku} onChange={(e)=>updateForm('sku', e.target.value)} required className="input w-full" /></L>
              <L label="Judul"><input value={form.title} onChange={(e)=>updateForm('title', e.target.value)} required className="input w-full" /></L>
              <L label="Deskripsi"><input value={form.description} onChange={(e)=>updateForm('description', e.target.value)} className="input w-full" /></L>
              <L label="Tipe">
                <select value={form.item_type} onChange={(e)=>updateForm('item_type', e.target.value)} className="select w-full">
                  <option value="COIN">COIN</option>
                  <option value="VIP">VIP</option>
                  <option value="BADGE">BADGE</option>
                  <option value="SUPERBADGE">SUPERBADGE</option>
                  <option value="STICKER">STICKER</option>
                  <option value="BORDER">BORDER</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </L>

              {form.item_type === 'COIN' && (
                <>
                  <L label="Coin Amount"><input type="number" value={form.coin_amount} onChange={(e)=>updateForm('coin_amount', e.target.value)} className="input w-full" /></L>
                </>
              )}
              {form.item_type === 'VIP' && (
                <>
                  <L label="Hari VIP"><input type="number" value={form.vip_days} onChange={(e)=>updateForm('vip_days', e.target.value)} className="input w-full" /></L>
                </>
              )}
              {form.item_type === 'BADGE' && (
                <>
                  <L label="Nama Badge"><input value={form.badge_name} onChange={(e)=>updateForm('badge_name', e.target.value)} className="input w-full" /></L>
                  <L label="Icon URL"><input value={form.badge_icon} onChange={(e)=>updateForm('badge_icon', e.target.value)} className="input w-full" /></L>
                  <L label="Title Color"><input value={form.title_color} onChange={(e)=>updateForm('title_color', e.target.value)} className="input w-full" /></L>
                </>
              )}

              {form.item_type === 'SUPERBADGE' && (
                <>
                  <L label="Super Badge">
                    <select
                      value={form.badge_id}
                      onChange={(e)=>updateForm('badge_id', e.target.value)}
                      className="select w-full"
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
                      className="select w-full"
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

              {form.item_type === 'BORDER' && (
                <>
                  <L label="Avatar Border">
                    <select
                      value={form.avatar_border_id}
                      onChange={(e)=>updateForm('avatar_border_id', e.target.value)}
                      className="select w-full"
                    >
                      <option value="">Pilih Avatar Border...</option>
                      {avatarBorders.map((ab) => (
                        <option key={ab.id} value={ab.id}>
                          {ab.title || ab.code} (#{ab.id})
                        </option>
                      ))}
                    </select>
                  </L>
                  {loadingAvatarBorders && (
                    <div className="text-xs font-semibold opacity-70">Memuat daftar avatar border...</div>
                  )}
                </>
              )}

              <L label="Harga Koin"><input type="number" value={form.coin_price} onChange={(e)=>updateForm('coin_price', e.target.value)} className="input w-full" /></L>
              <L label="Aktif?">
                <select value={String(form.is_active)} onChange={(e)=>updateForm('is_active', e.target.value === 'true')} className="select w-full">
                  <option value="true">Ya</option>
                  <option value="false">Tidak</option>
                </select>
              </L>
              <L label="Urutan"><input type="number" value={form.sort_order} onChange={(e)=>updateForm('sort_order', e.target.value)} className="input w-full" /></L>
            </div>
            <div>
              <button disabled={creating} type="submit" className="btn btn--primary disabled:opacity-60 inline-flex items-center gap-2">
                {creating ? 'Membuat...' : (<><Plus className="size-4" /> Buat Item</>)}
              </button>
            </div>
          </form>

          {/* Filters */}
          <form onSubmit={onSearch} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)_minmax(0,120px)] gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-[120px_minmax(0,1fr)] gap-2 items-center">
              <label className="text-sm font-extrabold flex items-center gap-2"><ListFilter className="size-4" /> Pencarian</label>
              <input type="text" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari judul/sku/tipe..." className="input w-full" />
            </div>
            <select value={active} onChange={(e)=>setActive(e.target.value)} className="select w-full">
              <option value="">Aktif: Semua</option>
              <option value="true">Aktif: Ya</option>
              <option value="false">Aktif: Tidak</option>
            </select>
            <button type="submit" disabled={loadingList} className="btn btn--primary disabled:opacity-60">{loadingList ? 'Memuat...' : 'Terapkan'}</button>
          </form>

          {/* Table */}
          <div className="overflow-auto">
            <table className="w-full border-2 border-[var(--border)] text-sm" style={{ boxShadow: 'var(--shadow-lg)' }}>
              <thead className="bg-[var(--panel-bg)]">
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
                        <a href={`/dashboard/store-admin/${it.id}`} className="btn btn--secondary" title="Detail/Edit"><ExternalLink className="size-4" /></a>
                        <button onClick={() => onDelete(it.id)} className="btn btn--danger" title="Hapus"><Trash2 className="size-4" /></button>
                      </div>
                    </Td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Tidak ada data.'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={()=>setPage((p)=>Math.max(1,p-1))} className="btn btn--secondary disabled:opacity-60">Sebelumnya</button>
            <div className="text-sm font-extrabold">Halaman {page} / {Math.max(1, Math.ceil(total / limit))}</div>
            <button disabled={page >= Math.ceil(total/limit)} onClick={()=>setPage((p)=>p+1)} className="btn btn--secondary disabled:opacity-60">Berikutnya</button>
          </div>
        </>
      )}
    </div>
  );
}

function L({ label, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[120px_minmax(0,1fr)] gap-2 items-center">
      <label className="text-sm font-extrabold">{label}</label>
      {children}
    </div>
  );
}
function Th({ children }) { return <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">{children}</th>; }
function Td({ children, className='' }) { return <td className={`px-3 py-2 font-semibold border-b-2 border-[var(--border)] ${className}`}>{children}</td>; }

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
  } else if (form.item_type === 'BORDER') {
    if (form.avatar_border_id !== '') p.avatar_border_id = Number(form.avatar_border_id);
  }
  return p;
}

