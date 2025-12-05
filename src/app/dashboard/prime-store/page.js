'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ShoppingBag, Plus, Trash2, ListFilter, Percent, CalendarDays, Edit3 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import {
  listPrimeStoreItems,
  createPrimeStoreItem,
  deletePrimeStoreItem,
  listBadges,
  listStickers,
  listAvatarBorders,
  listPrimeStoreDailyDiscounts,
  upsertPrimeStoreDailyDiscount,
  deletePrimeStoreDailyDiscount,
  listVipPlans,
} from '@/lib/api';

export default function PrimeStoreAdminPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const isSuperAdmin = (user?.role || '').toUpperCase() === 'SUPERADMIN';

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  // List items state
  const [q, setQ] = useState('');
  const [active, setActive] = useState(''); // '', 'true', 'false'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  // Create item form state
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    sku: '',
    title: '',
    description: '',
    item_type: 'VIP',
    base_coin_price: '',
    vip_days: '',
    vip_plan_id: '',
    badge_name: '',
    badge_icon: '',
    title_color: '',
    super_badge_id: '',
    border_id: '',
    sticker_id: '',
    voucher_template_code: '',
    is_active: true,
    sort_order: '',
  });

  // Masters
  const [vipPlans, setVipPlans] = useState([]);
  const [loadingVipPlans, setLoadingVipPlans] = useState(false);
  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [stickers, setStickers] = useState([]);
  const [loadingStickers, setLoadingStickers] = useState(false);
  const [borders, setBorders] = useState([]);
  const [loadingBorders, setLoadingBorders] = useState(false);

  const loadItems = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = { q: q.trim(), active: active === '' ? '' : active, page, limit, ...opts };
      const data = await listPrimeStoreItems({ token, ...params });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar item Prime Store');
    } finally {
      setLoadingList(false);
    }
  };

  const loadVipPlans = async () => {
    try {
      setLoadingVipPlans(true);
      const token = getSession()?.token;
      if (!token) return;
      const data = await listVipPlans({ token, page: 1, pageSize: 100, includeInactive: false });
      setVipPlans(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar VIP plan');
    } finally {
      setLoadingVipPlans(false);
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

  const loadBorders = async () => {
    try {
      setLoadingBorders(true);
      const token = getSession()?.token;
      if (!token) return;
      const data = await listAvatarBorders({ token, page: 1, limit: 200, q: '', active: 'true' });
      setBorders(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat avatar borders');
    } finally {
      setLoadingBorders(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, active, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (form.item_type !== 'VIP') return;
    if (vipPlans.length > 0 || loadingVipPlans) return;
    loadVipPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.item_type, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (form.item_type !== 'SUPERBADGE') return;
    if (badges.length > 0 || loadingBadges) return;
    loadBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.item_type, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (form.item_type !== 'STICKER') return;
    if (stickers.length > 0 || loadingStickers) return;
    loadStickers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.item_type, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (form.item_type !== 'BORDER') return;
    if (borders.length > 0 || loadingBorders) return;
    loadBorders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.item_type, isSuperAdmin]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadItems({ page: 1 });
  };

  const updateForm = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onCreate = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setCreating(true);
      const payload = buildPrimeItemPayload(form);
      await createPrimeStoreItem({ token, payload });
      toast.success('Prime Store item dibuat');
      setForm({
        sku: '',
        title: '',
        description: '',
        item_type: 'VIP',
        base_coin_price: '',
        vip_days: '',
        vip_plan_id: '',
        badge_name: '',
        badge_icon: '',
        title_color: '',
        super_badge_id: '',
        border_id: '',
        sticker_id: '',
        voucher_template_code: '',
        is_active: true,
        sort_order: '',
      });
      await loadItems({ page: 1 });
      setPage(1);
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat Prime Store item');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id) => {
    const token = getSession()?.token;
    try {
      await deletePrimeStoreItem({ token, id });
      toast.success('Item dihapus');
      await loadItems();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus item');
    }
  };

  // Daily discounts state
  const [discDate, setDiscDate] = useState('');
  const [discPage, setDiscPage] = useState(1);
  const [discLimit, setDiscLimit] = useState(50);
  const [discounts, setDiscounts] = useState([]);
  const [discTotal, setDiscTotal] = useState(0);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);

  const [discForm, setDiscForm] = useState({
    item_id: '',
    discount_percent: '',
    valid_date: '',
    is_active: true,
  });
  const [savingDisc, setSavingDisc] = useState(false);

  const loadDiscounts = async (opts = {}) => {
    setLoadingDiscounts(true);
    try {
      const token = getSession()?.token;
      const params = { date: discDate ? discDate : '', page: discPage, limit: discLimit, ...opts };
      const data = await listPrimeStoreDailyDiscounts({ token, ...params });
      setDiscounts(Array.isArray(data.items) ? data.items : []);
      setDiscPage(data.page || 1);
      setDiscLimit(data.limit || 50);
      setDiscTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat diskon harian');
    } finally {
      setLoadingDiscounts(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discPage, discLimit, discDate, isSuperAdmin]);

  const updateDiscForm = (k, v) => setDiscForm((f) => ({ ...f, [k]: v }));

  const onSaveDiscount = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!discForm.item_id) return toast.error('Item wajib dipilih');
    if (discForm.discount_percent === '' || Number(discForm.discount_percent) <= 0) return toast.error('Diskon (%) wajib diisi (>0)');
    if (!discForm.valid_date) return toast.error('Tanggal berlaku wajib diisi');

    try {
      setSavingDisc(true);
      const payload = {
        discount_percent: Number(discForm.discount_percent),
        valid_date: new Date(discForm.valid_date + 'T00:00:00Z').toISOString(),
        is_active: !!discForm.is_active,
      };
      await upsertPrimeStoreDailyDiscount({ token, itemId: Number(discForm.item_id), payload });
      toast.success('Diskon harian disimpan');
      setDiscForm({ item_id: '', discount_percent: '', valid_date: '', is_active: true });
      await loadDiscounts({ page: 1 });
      setDiscPage(1);
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan diskon harian');
    } finally {
      setSavingDisc(false);
    }
  };

  const onDeleteDiscount = async (id) => {
    const token = getSession()?.token;
    try {
      await deletePrimeStoreDailyDiscount({ token, id });
      toast.success('Diskon harian dihapus');
      await loadDiscounts();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus diskon harian');
    }
  };

  const onEditDiscount = (disc) => {
    const itemId =
      disc.item_id ?? (disc.item && typeof disc.item.id === 'number' ? disc.item.id : undefined);
    const d = disc.valid_date ? new Date(disc.valid_date) : null;
    const y = d ? d.getUTCFullYear() : null;
    const m = d ? String(d.getUTCMonth() + 1).padStart(2, '0') : null;
    const day = d ? String(d.getUTCDate()).padStart(2, '0') : null;
    const dateStr = y && m && day ? `${y}-${m}-${day}` : '';

    setDiscForm({
      item_id: itemId != null ? String(itemId) : '',
      discount_percent:
        disc.discount_percent !== undefined && disc.discount_percent !== null
          ? String(disc.discount_percent)
          : '',
      valid_date: dateStr,
      is_active: !!disc.is_active,
    });
  };

  if (loading || !user) return null;
  if (!isSuperAdmin) {
    return (
      <div className="text-sm font-semibold">
        Halaman ini khusus superadmin. Anda login sebagai{' '}
        <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">{user.role}</span>.
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  const discTotalPages = Math.max(1, Math.ceil((discTotal || 0) / (discLimit || 1)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <ShoppingBag className="size-5" /> Prime Store Admin
        </h2>
      </div>

      {/* Create Prime Store Item */}
      <form
        onSubmit={onCreate}
        className="space-y-3 p-4 border-4 rounded-lg"
        style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <L label="SKU">
            <input
              value={form.sku}
              onChange={(e) => updateForm('sku', e.target.value)}
              required
              placeholder="Contoh: PRIME_VIP_GOLD_30D (wajib, unik)"
              className="inp"
            />
          </L>
          <L label="Judul">
            <input
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              required
              placeholder="Nama item yang tampil ke user (wajib)"
              className="inp"
            />
          </L>
          <L label="Deskripsi">
            <input
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              placeholder="Deskripsi singkat (opsional)"
              className="inp"
            />
          </L>
          <L label="Tipe">
            <select
              value={form.item_type}
              onChange={(e) => updateForm('item_type', e.target.value)}
              className="sel"
            >
              <option value="VIP">VIP (durasi atau paket VIP)</option>
              <option value="BADGE">BADGE (nama, icon, warna)</option>
              <option value="SUPERBADGE">SUPERBADGE (pilih dari badge)</option>
              <option value="BORDER">BORDER (pilih avatar border)</option>
              <option value="STICKER">STICKER (pilih stiker)</option>
              <option value="VOUCHER">VOUCHER (kode template voucher)</option>
            </select>
          </L>

          <L label="Base Harga Koin">
            <input
              type="number"
              value={form.base_coin_price}
              onChange={(e) => updateForm('base_coin_price', e.target.value)}
              required
              placeholder="Contoh: 2500 (wajib, harga sebelum diskon)"
              className="inp"
            />
          </L>

          {form.item_type === 'VIP' && (
            <>
              <L label="VIP Plan">
                <select
                  value={form.vip_plan_id}
                  onChange={(e) => updateForm('vip_plan_id', e.target.value)}
                  className="sel"
                >
                  <option value="">Tanpa VIP Plan (custom hari)</option>
                  {vipPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.price_coins} coins (#{p.id})
                    </option>
                  ))}
                </select>
              </L>
              {loadingVipPlans && (
                <div className="text-xs font-semibold opacity-70">Memuat daftar VIP plan...</div>
              )}
              <L label="Hari VIP">
                <input
                  type="number"
                  value={form.vip_days}
                  onChange={(e) => updateForm('vip_days', e.target.value)}
                  placeholder="Contoh: 30 (opsional jika pakai VIP Plan)"
                  className="inp"
                />
              </L>
            </>
          )}

          {form.item_type === 'BADGE' && (
            <>
              <L label="Nama Badge">
                <input
                  value={form.badge_name}
                  onChange={(e) => updateForm('badge_name', e.target.value)}
                  placeholder="Nama badge yang ditampilkan (opsional)"
                  className="inp"
                />
              </L>
              <L label="Icon URL">
                <input
                  value={form.badge_icon}
                  onChange={(e) => updateForm('badge_icon', e.target.value)}
                  placeholder="URL icon badge (opsional)"
                  className="inp"
                />
              </L>
              <L label="Title Color">
                <input
                  value={form.title_color}
                  onChange={(e) => updateForm('title_color', e.target.value)}
                  placeholder="Contoh: #FFD700 (opsional)"
                  className="inp"
                />
              </L>
            </>
          )}

          {form.item_type === 'SUPERBADGE' && (
            <>
              <L label="Super Badge">
                <select
                  value={form.super_badge_id}
                  onChange={(e) => updateForm('super_badge_id', e.target.value)}
                  className="sel"
                >
                  <option value="">Pilih Super Badge... (wajib untuk SUPERBADGE)</option>
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

          {form.item_type === 'BORDER' && (
            <>
              <L label="Avatar Border">
                <select
                  value={form.border_id}
                  onChange={(e) => updateForm('border_id', e.target.value)}
                  className="sel"
                >
                  <option value="">Pilih Border... (wajib untuk BORDER)</option>
                  {borders.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title || b.code} (#{b.id})
                    </option>
                  ))}
                </select>
              </L>
              {loadingBorders && (
                <div className="text-xs font-semibold opacity-70">Memuat avatar borders...</div>
              )}
            </>
          )}

          {form.item_type === 'STICKER' && (
            <>
              <L label="Sticker">
                <select
                  value={form.sticker_id}
                  onChange={(e) => updateForm('sticker_id', e.target.value)}
                  className="sel"
                >
                  <option value="">Pilih Sticker... (wajib untuk STICKER)</option>
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

          {form.item_type === 'VOUCHER' && (
            <L label="Voucher Template Code">
              <input
                value={form.voucher_template_code}
                onChange={(e) => updateForm('voucher_template_code', e.target.value)}
                placeholder="Kode template voucher (wajib untuk VOUCHER)"
                className="inp"
              />
            </L>
          )}

          <L label="Aktif?">
            <select
              value={String(form.is_active)}
              onChange={(e) => updateForm('is_active', e.target.value === 'true')}
              className="sel"
            >
              <option value="true">Ya</option>
              <option value="false">Tidak</option>
            </select>
          </L>
          <L label="Urutan">
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => updateForm('sort_order', e.target.value)}
              placeholder="Urutan tampil (opsional, default 0)"
              className="inp"
            />
          </L>
        </div>
        <div>
          <button disabled={creating} type="submit" className="btn-add">
            {creating ? 'Membuat...' : (
              <>
                <Plus className="size-4" /> Buat Item
              </>
            )}
          </button>
        </div>
      </form>

      {/* Filters */}
      <form onSubmit={onSearch} className="grid sm:grid-cols-[1fr_180px_120px] gap-3">
        <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
          <label className="lbl flex items-center gap-2">
            <ListFilter className="size-4" /> Pencarian
          </label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul/sku/tipe..."
            className="inp bg-panel"
          />
        </div>
        <select value={active} onChange={(e) => setActive(e.target.value)} className="sel">
          <option value="">Aktif: Semua</option>
          <option value="true">Aktif: Ya</option>
          <option value="false">Aktif: Tidak</option>
        </select>
        <button type="submit" disabled={loadingList} className="btn-pri">
          {loadingList ? 'Memuat...' : 'Terapkan'}
        </button>
      </form>

      {/* Items Table */}
      <div className="overflow-auto">
        <table className="tbl">
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>SKU</Th>
              <Th>Judul</Th>
              <Th>Tipe</Th>
              <Th>Base Harga</Th>
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
                <Td>{it.base_coin_price ?? 0}</Td>
                <Td>{String(it.is_active)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDelete(it.id)}
                      className="btn-act"
                      title="Hapus"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="td-empty">
                  {loadingList ? 'Memuat...' : 'Tidak ada data.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Items */}
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="btn-pg"
        >
          Sebelumnya
        </button>
        <div className="text-sm font-extrabold">
          Halaman {page} / {totalPages}
        </div>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="btn-pg"
        >
          Berikutnya
        </button>
      </div>

      {/* Daily Discounts Section */}
      <div
        className="space-y-3 p-4 border-4 rounded-lg"
        style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-extrabold flex items-center gap-2">
            <Percent className="size-5" /> Diskon Harian Prime Store
          </h3>
        </div>

        {/* Filter tanggal diskon */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setDiscPage(1);
            loadDiscounts({ page: 1 });
          }}
          className="grid sm:grid-cols-[1fr_160px] gap-3"
        >
          <div>
            <input
              type="date"
              value={discDate}
              onChange={(e) => setDiscDate(e.target.value)}
              className="inp bg-panel w-full"
            />
          </div>
          <button type="submit" disabled={loadingDiscounts} className="btn-pri">
            {loadingDiscounts ? 'Memuat...' : 'Filter'}
          </button>
        </form>

        {/* Form tambah / update diskon */}
        <form onSubmit={onSaveDiscount} className="grid md:grid-cols-3 gap-3">
          {/* Item */}
          <div>
            <select
              value={discForm.item_id}
              onChange={(e) => updateDiscForm('item_id', e.target.value)}
              className="sel w-full"
            >
              <option value="">Pilih item...</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.title} (#{it.id})
                </option>
              ))}
            </select>
          </div>

          {/* Diskon (%) */}
          <div>
            <input
              type="number"
              value={discForm.discount_percent}
              onChange={(e) => updateDiscForm('discount_percent', e.target.value)}
              placeholder="Diskon %"
              className="inp w-full"
            />
          </div>

          {/* Tanggal */}
          <div>
            <input
              type="date"
              value={discForm.valid_date}
              onChange={(e) => updateDiscForm('valid_date', e.target.value)}
              className="inp w-full"
            />
          </div>
          <div className="md:col-span-3 flex items-center gap-2">
            <input
              id="disc-active"
              type="checkbox"
              checked={!!discForm.is_active}
              onChange={(e) => updateDiscForm('is_active', e.target.checked)}
              className="size-4 border-4 rounded"
            />
            <label htmlFor="disc-active" className="lbl">
              Aktif untuk tanggal tersebut
            </label>
          </div>
          <div className="md:col-span-3">
            <button disabled={savingDisc} type="submit" className="btn-add">
              {savingDisc ? 'Menyimpan...' : 'Simpan Diskon Harian'}
            </button>
          </div>
        </form>

        {/* Tabel diskon harian */}
        <div className="overflow-auto">
          <table className="tbl">
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Item</Th>
                <Th>Diskon (%)</Th>
                <Th>Tanggal</Th>
                <Th>Aktif</Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((d) => (
                <tr key={d.id}>
                  <Td>{d.id}</Td>
                  <Td>{d.item?.title || d.item?.sku || `#${d.item_id}`}</Td>
                  <Td>{d.discount_percent}</Td>
                  <Td>{d.valid_date ? new Date(d.valid_date).toLocaleDateString() : '-'}</Td>
                  <Td>{String(d.is_active)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditDiscount(d)}
                        className="btn-act"
                        title="Edit diskon"
                      >
                        <Edit3 className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDiscount(d.id)}
                        className="btn-act"
                        title="Hapus diskon"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              {discounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="td-empty">
                    {loadingDiscounts ? 'Memuat...' : 'Tidak ada data.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination diskon */}
        <div className="flex items-center gap-2">
          <button
            disabled={discPage <= 1}
            onClick={() => setDiscPage((p) => Math.max(1, p - 1))}
            className="btn-pg"
          >
            Sebelumnya
          </button>
          <div className="text-sm font-extrabold">
            Halaman {discPage} / {discTotalPages}
          </div>
          <button
            disabled={discPage >= discTotalPages}
            onClick={() => setDiscPage((p) => p + 1)}
            className="btn-pg"
          >
            Berikutnya
          </button>
        </div>
      </div>
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

function Th({ children }) {
  return <th className="th">{children}</th>;
}

function Td({ children, className = '' }) {
  return <td className={`td ${className}`}>{children}</td>;
}

function buildPrimeItemPayload(form) {
  const p = {
    sku: form.sku,
    title: form.title,
    description: form.description || undefined,
    item_type: form.item_type,
    is_active: !!form.is_active,
  };
  if (form.base_coin_price !== '') p.base_coin_price = Number(form.base_coin_price);
  if (form.sort_order !== '') p.sort_order = Number(form.sort_order);
  if (form.item_type === 'VIP') {
    if (form.vip_days !== '') p.vip_days = Number(form.vip_days);
  } else if (form.item_type === 'BADGE') {
    if (form.badge_name) p.badge_name = form.badge_name;
    if (form.badge_icon) p.badge_icon = form.badge_icon;
    if (form.title_color) p.title_color = form.title_color;
  } else if (form.item_type === 'SUPERBADGE') {
    if (form.super_badge_id !== '') p.super_badge_id = Number(form.super_badge_id);
  } else if (form.item_type === 'BORDER') {
    if (form.border_id !== '') p.border_id = Number(form.border_id);
  } else if (form.item_type === 'STICKER') {
    if (form.sticker_id !== '') p.sticker_id = Number(form.sticker_id);
  } else if (form.item_type === 'VOUCHER') {
    if (form.voucher_template_code) p.voucher_template_code = form.voucher_template_code;
  }
  return p;
}

const styles = `
.inp { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 600; }
.sel { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 800; }
.lbl { font-size: 0.875rem; font-weight: 800; }
.btn-add { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:4px 4px 0 #000; background: var(--accent-add); color: var(--accent-add-foreground); border-color: var(--panel-border); }
.btn-pri { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:4px 4px 0 #000; background: var(--accent-primary); color: var(--accent-primary-foreground); border-color: var(--panel-border); }
.btn-act { padding:0.25rem 0.5rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:3px 3px 0 #000; background: var(--panel-bg); color: var(--foreground); border-color: var(--panel-border); }
.tbl { min-width: 100%; border-width:4px; border-radius:0.5rem; overflow:hidden; box-shadow:6px 6px 0 #000; border-color: var(--panel-border); color: var(--foreground); }
.tbl thead { background: var(--panel-bg); }
.th { text-align:left; padding:0.5rem 0.75rem; border-bottom-width:4px; border-color: var(--panel-border); }
.td { padding:0.5rem 0.75rem; border-bottom-width:4px; border-color: var(--panel-border); font-weight:600; }
.td-empty { padding:1.5rem; text-align:center; font-size:0.875rem; opacity:0.7; }
.btn-pg { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; background:#fff; font-weight:800; box-shadow:4px 4px 0 #000; }
.bg-panel { background: var(--panel-bg); }
`;

if (typeof document !== 'undefined' && !document.getElementById('prime-store-admin-styles')) {
  const style = document.createElement('style');
  style.id = 'prime-store-admin-styles';
  style.innerHTML = styles;
  document.head.appendChild(style);
}
