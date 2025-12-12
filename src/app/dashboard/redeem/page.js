'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Gift, Plus, Trash2, ListFilter } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listRedeemCodes, createRedeemCode, deleteRedeemCode, listAvatarBorders } from '@/lib/api';

export default function RedeemCodesPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  // List state
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  // Create form state
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: '',
    type: 'COIN',
    is_active: true,
    max_uses: '',
    per_user_limit: '',
    starts_at: '',
    expires_at: '',
    // COIN
    coins_amount: '',
    // VIP
    vip_days: '',
    vip_level: '',
    // BADGE
    badge_name: '',
    badge_icon: '',
    title_color: '',
    // VOUCHER
    voucher_discount_percent: '',
    voucher_discount_amount: '',
    voucher_valid_days: '',
    // BORDER
    border_id: '',
  });

  // Avatar borders for BORDER type
  const [borders, setBorders] = useState([]);
  const [loadingBorders, setLoadingBorders] = useState(false);

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = { q: q.trim(), page, limit, ...opts };
      const data = await listRedeemCodes({ token, ...params });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar kode');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, user]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadList({ page: 1 });
  };

  const updateForm = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-load avatar borders when BORDER type selected
  useEffect(() => {
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

    if (form.type !== 'BORDER') return;
    if (borders.length > 0 || loadingBorders) return;
    loadBorders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type, isSuperAdmin]);

  const onCreate = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setCreating(true);
      const payload = buildPayload(form);
      await createRedeemCode({ token, payload });
      toast.success('Kode redeem dibuat');
      // reset minimal
      setForm((f) => ({
        ...f,
        code: '',
        max_uses: '',
        per_user_limit: '',
        starts_at: '',
        expires_at: '',
        coins_amount: '',
        vip_days: '',
        vip_level: '',
        badge_name: '',
        badge_icon: '',
        title_color: '',
        voucher_discount_percent: '',
        voucher_discount_amount: '',
        voucher_valid_days: '',
        border_id: '',
      }));
      await loadList({ page: 1 });
      setPage(1);
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat kode redeem');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id) => {
    const token = getSession()?.token;
    try {
      await deleteRedeemCode({ token, id });
      toast.success('Kode dihapus');
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus kode');
    }
  };

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <Gift className="size-5" /> Kode Redeem
            </h2>
          </div>

          {/* Create Form */}
          <form onSubmit={onCreate} className="space-y-3 p-4 border-4 rounded-lg" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                <label className="text-sm font-extrabold">Kode</label>
                <input value={form.code} onChange={(e) => updateForm('code', e.target.value)} required className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                <label className="text-sm font-extrabold">Tipe</label>
                <select value={form.type} onChange={(e) => updateForm('type', e.target.value)} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <option value="COIN">COIN</option>
                  <option value="VIP">VIP</option>
                  <option value="BADGE">BADGE</option>
                  <option value="VOUCHER">VOUCHER</option>
                  <option value="BORDER">BORDER</option>
                </select>
              </div>

              {form.type === 'COIN' && (
                <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                  <label className="text-sm font-extrabold">Jumlah Koin</label>
                  <input type="number" value={form.coins_amount} onChange={(e) => updateForm('coins_amount', e.target.value)} placeholder="mis. 100" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </div>
              )}

              {form.type === 'VIP' && (
                <>
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                    <label className="text-sm font-extrabold">Hari VIP</label>
                    <input type="number" value={form.vip_days} onChange={(e) => updateForm('vip_days', e.target.value)} placeholder="mis. 7" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                    <label className="text-sm font-extrabold">Level VIP</label>
                    <input value={form.vip_level} onChange={(e) => updateForm('vip_level', e.target.value)} placeholder="Opsional, mis. Gold" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                </>
              )}

              {form.type === 'BADGE' && (
                <>
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                    <label className="text-sm font-extrabold">Nama Badge</label>
                    <input value={form.badge_name} onChange={(e) => updateForm('badge_name', e.target.value)} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                    <label className="text-sm font-extrabold">Icon URL</label>
                    <input value={form.badge_icon} onChange={(e) => updateForm('badge_icon', e.target.value)} placeholder="https://..." className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                    <label className="text-sm font-extrabold">Title Color</label>
                    <input value={form.title_color} onChange={(e) => updateForm('title_color', e.target.value)} placeholder="#FF8800" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                  </div>
                </>
              )}

              {form.type === 'VOUCHER' && (
                <>
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                    <label className="text-sm font-extrabold">Diskon (%)</label>
                    <input
                      type="number"
                      value={form.voucher_discount_percent}
                      onChange={(e) => updateForm('voucher_discount_percent', e.target.value)}
                      placeholder="Opsional, mis. 10"
                      className="px-3 py-2 border-4 rounded-lg font-semibold"
                      style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                    />
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                    <label className="text-sm font-extrabold">Diskon Nominal</label>
                    <input
                      type="number"
                      value={form.voucher_discount_amount}
                      onChange={(e) => updateForm('voucher_discount_amount', e.target.value)}
                      placeholder="Opsional, mis. 10000"
                      className="px-3 py-2 border-4 rounded-lg font-semibold"
                      style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                    />
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                    <label className="text-sm font-extrabold">Masa Berlaku (hari)</label>
                    <input
                      type="number"
                      value={form.voucher_valid_days}
                      onChange={(e) => updateForm('voucher_valid_days', e.target.value)}
                      placeholder="mis. 7"
                      className="px-3 py-2 border-4 rounded-lg font-semibold"
                      style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                    />
                  </div>
                </>
              )}

              {form.type === 'BORDER' && (
                <>
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                    <label className="text-sm font-extrabold">Avatar Border</label>
                    <select
                      value={form.border_id}
                      onChange={(e) => updateForm('border_id', e.target.value)}
                      className="px-3 py-2 border-4 rounded-lg font-extrabold"
                      style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                    >
                      <option value="">Pilih border...</option>
                      {borders.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title || b.code} (#{b.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  {loadingBorders && (
                    <div className="text-xs font-semibold opacity-70 col-span-2 ml-[120px]">Memuat avatar borders...</div>
                  )}
                </>
              )}

              <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                <label className="text-sm font-extrabold">Aktif?</label>
                <select value={String(form.is_active)} onChange={(e) => updateForm('is_active', e.target.value === 'true')} className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  <option value="true">Ya</option>
                  <option value="false">Tidak</option>
                </select>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                <label className="text-sm font-extrabold">Kuota Global</label>
                <input type="number" value={form.max_uses} onChange={(e) => updateForm('max_uses', e.target.value)} placeholder="Opsional" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                <label className="text-sm font-extrabold">Limit / User</label>
                <input type="number" value={form.per_user_limit} onChange={(e) => updateForm('per_user_limit', e.target.value)} placeholder="Opsional" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                <label className="text-sm font-extrabold">Mulai</label>
                <input type="datetime-local" value={form.starts_at} onChange={(e) => updateForm('starts_at', e.target.value)} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                <label className="text-sm font-extrabold">Berakhir</label>
                <input type="datetime-local" value={form.expires_at} onChange={(e) => updateForm('expires_at', e.target.value)} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>
            </div>
            <div>
              <button disabled={creating} type="submit" className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60 flex items-center gap-2" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}>
                <Plus className="size-4" /> Buat Kode
              </button>
            </div>
          </form>

          {/* Filters */}
          <form onSubmit={onSearch} className="grid sm:grid-cols-[1fr_120px] gap-3">
            <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
              <label className="text-sm font-extrabold flex items-center gap-2">
                <ListFilter className="size-4" /> Pencarian
              </label>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari kode..."
                className="px-3 py-2 border-4 rounded-lg font-semibold"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              />
            </div>
            <button type="submit" className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
              Terapkan
            </button>
          </form>

          {/* Table */}
          <div className="overflow-auto">
            <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <thead style={{ background: 'var(--panel-bg)' }}>
                <tr>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Kode</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Tipe</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aktif</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Dipakai</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Kuota</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Per User</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Rentang</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.id}</td>
                    <td className="px-3 py-2 border-b-4 font-extrabold" style={{ borderColor: 'var(--panel-border)' }}>{it.code}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.type}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{String(it.is_active)}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.used_count ?? '-'}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.max_uses ?? '-'}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.per_user_limit ?? '-'}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold max-w-[260px] break-words" style={{ borderColor: 'var(--panel-border)' }}>
                      {(it.starts_at ? new Date(it.starts_at).toLocaleString() : '-') + ' → ' + (it.expires_at ? new Date(it.expires_at).toLocaleString() : '-')}
                    </td>
                    <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onDelete(it.id)} className="px-2 py-1 border-4 rounded font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }} title="Hapus">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Tidak ada data.'}</td>
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
              className="px-3 py-2 border-4 border-black rounded-lg bg-white disabled:opacity-60 font-extrabold"
              style={{ boxShadow: '4px 4px 0 #000' }}
            >
              Sebelumnya
            </button>
            <div className="text-sm font-extrabold">Halaman {page} / {Math.max(1, Math.ceil(total / limit))}</div>
            <button
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 border-4 border-black rounded-lg bg-white disabled:opacity-60 font-extrabold"
              style={{ boxShadow: '4px 4px 0 #000' }}
            >
              Berikutnya
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function buildPayload(form) {
  const base = {
    code: form.code,
    type: form.type,
    is_active: !!form.is_active,
  };
  if (form.max_uses !== '') base.max_uses = Number(form.max_uses);
  if (form.per_user_limit !== '') base.per_user_limit = Number(form.per_user_limit);
  if (form.starts_at) base.starts_at = new Date(form.starts_at).toISOString();
  if (form.expires_at) base.expires_at = new Date(form.expires_at).toISOString();

  if (form.type === 'COIN') {
    if (form.coins_amount === '' || Number(form.coins_amount) <= 0) throw new Error('Jumlah koin wajib diisi (>0)');
    base.coins_amount = Number(form.coins_amount);
  } else if (form.type === 'VIP') {
    if (form.vip_days === '' || Number(form.vip_days) <= 0) throw new Error('Hari VIP wajib diisi (>0)');
    base.vip_days = Number(form.vip_days);
    if (form.vip_level) base.vip_level = form.vip_level;
  } else if (form.type === 'BADGE') {
    if (!form.badge_name) throw new Error('Nama badge wajib diisi');
    base.badge_name = form.badge_name;
    if (form.badge_icon) base.badge_icon = form.badge_icon;
    if (form.title_color) base.title_color = form.title_color;
  } else if (form.type === 'VOUCHER') {
    // Minimalnya salah satu jenis diskon atau masa berlaku harus diisi, tapi validasi detail bisa ditambah sesuai kebutuhan
    if (form.voucher_discount_percent !== '') base.voucher_discount_percent = Number(form.voucher_discount_percent);
    if (form.voucher_discount_amount !== '') base.voucher_discount_amount = Number(form.voucher_discount_amount);
    if (form.voucher_valid_days !== '') base.voucher_valid_days = Number(form.voucher_valid_days);
  } else if (form.type === 'BORDER') {
    if (!form.border_id) throw new Error('Avatar border wajib dipilih');
    base.border_id = Number(form.border_id);
  }
  return base;
}
