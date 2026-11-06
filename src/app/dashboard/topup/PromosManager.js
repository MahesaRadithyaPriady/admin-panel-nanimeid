'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Gift, Plus, Pencil, Trash2, RefreshCcw } from 'lucide-react';
import { getSession } from '@/lib/auth';
import {
  listTopupPromos,
  createTopupPromo,
  updateTopupPromo,
  deleteTopupPromo,
  listAvatarBorders,
  listBadges,
} from '@/lib/api';

const VIP_LEVELS = ['BRONZE', 'GOLD', 'DIAMOND', 'MASTER'];
const APPLIES_OPTIONS = [
  { value: 'COIN', label: 'Coin' },
  { value: 'VIP', label: 'VIP' },
  { value: 'ALL', label: 'Semua' },
];

const emptyForm = {
  id: null,
  title: '',
  description: '',
  banner_url: '',
  applies_to: 'COIN',
  sort_order: '0',
  min_amount_rp: '',
  min_coins: '',
  max_per_user: '',
  is_active: true,
  starts_at: '',
  ends_at: '',
  coin_double: false,
  double_chance: '',
  bonus_coin: '',
  bonus_coin_percent: '',
  xp: '',
  border_id: '',
  vip_days: '',
  vip_level: 'BRONZE',
  super_badge_id: '',
  kode_redeem: '',
};

const num = (v) => (v === '' || v == null ? null : Number(v));
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

function rewardChips(p) {
  const out = [];
  if (p.coin_double) out.push(p.double_chance != null && p.double_chance < 100 ? `Coin x2 (${p.double_chance}%)` : 'Coin x2');
  if (p.bonus_coin) out.push(`+${Number(p.bonus_coin).toLocaleString('id-ID')} coin`);
  if (p.bonus_coin_percent) out.push(`+${p.bonus_coin_percent}% coin`);
  if (p.xp) out.push(`+${Number(p.xp).toLocaleString('id-ID')} XP`);
  if (p.border) out.push(`Border ${p.border.title}`);
  else if (p.border_id) out.push(`Border #${p.border_id}`);
  if (p.vip_days) out.push(`VIP ${p.vip_level || ''} ${p.vip_days}h`.trim());
  if (p.badge_name) out.push(`Badge ${p.badge_name}`);
  if (p.super_badge) out.push(`SB ${p.super_badge.name}`);
  else if (p.super_badge_id) out.push(`SB #${p.super_badge_id}`);
  if (p.kode_redeem) out.push(`Kode ${p.kode_redeem}`);
  return out;
}

export default function PromosManager() {
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [mode, setMode] = useState('add');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [borders, setBorders] = useState([]);
  const [badges, setBadges] = useState([]);

  const loadList = async () => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const data = await listTopupPromos({ token });
      setItems(data.items);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat promo');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadList();
    // Dropdown reward — best effort, kalau gagal admin masih bisa isi ID manual
    const token = getSession()?.token;
    listAvatarBorders({ token, limit: 200 }).then((d) => setBorders(d?.items || [])).catch(() => {});
    listBadges({ token, limit: 200 }).then((d) => setBadges(d?.items || [])).catch(() => {});
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  const onEdit = (it) => {
    setMode('edit');
    setForm({
      id: it.id,
      title: it.title || '',
      description: it.description || '',
      banner_url: it.banner_url || '',
      applies_to: it.applies_to || 'COIN',
      sort_order: String(it.sort_order ?? 0),
      min_amount_rp: it.min_amount_rp != null ? String(it.min_amount_rp) : '',
      min_coins: it.min_coins != null ? String(it.min_coins) : '',
      max_per_user: it.max_per_user != null ? String(it.max_per_user) : '',
      is_active: !!it.is_active,
      starts_at: toLocalInput(it.starts_at),
      ends_at: toLocalInput(it.ends_at),
      coin_double: !!it.coin_double,
      double_chance: it.double_chance != null ? String(it.double_chance) : '',
      bonus_coin: it.bonus_coin != null ? String(it.bonus_coin) : '',
      bonus_coin_percent: it.bonus_coin_percent != null ? String(it.bonus_coin_percent) : '',
      xp: it.xp != null ? String(it.xp) : '',
      border_id: it.border_id != null ? String(it.border_id) : '',
      vip_days: it.vip_days != null ? String(it.vip_days) : '',
      vip_level: it.vip_level || 'BRONZE',
      super_badge_id: it.super_badge_id != null ? String(it.super_badge_id) : '',
      kode_redeem: it.kode_redeem || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setMode('add');
    setForm(emptyForm);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Judul wajib diisi');
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      banner_url: form.banner_url || null,
      applies_to: form.applies_to,
      sort_order: Number(form.sort_order) || 0,
      min_amount_rp: num(form.min_amount_rp),
      min_coins: num(form.min_coins),
      max_per_user: num(form.max_per_user),
      is_active: !!form.is_active,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      coin_double: !!form.coin_double,
      double_chance: num(form.double_chance),
      bonus_coin: num(form.bonus_coin),
      bonus_coin_percent: num(form.bonus_coin_percent),
      xp: num(form.xp),
      border_id: num(form.border_id),
      vip_days: num(form.vip_days),
      vip_level: form.vip_days ? form.vip_level : null,
      super_badge_id: num(form.super_badge_id),
      kode_redeem: form.kode_redeem || null,
    };

    try {
      setSubmitting(true);
      const res = mode === 'add'
        ? await createTopupPromo({ token, payload })
        : await updateTopupPromo({ token, id: form.id, payload });
      toast.success(res?.message || (mode === 'add' ? 'Promo dibuat' : 'Promo diupdate'));
      resetForm();
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan promo');
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleActive = async (it) => {
    const token = getSession()?.token;
    try {
      const res = await updateTopupPromo({ token, id: it.id, payload: { is_active: !it.is_active } });
      toast.success(res?.message || 'Status diupdate');
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal mengubah status');
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    const token = getSession()?.token;
    try {
      setDeleting(true);
      await deleteTopupPromo({ token, id: deleteTarget.id });
      toast.success('Promo dihapus');
      setDeleteTarget(null);
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus promo');
    } finally {
      setDeleting(false);
    }
  };

  const field = (label, node, hint) => (
    <div className="grid gap-1">
      <div className="text-xs font-extrabold">{label}</div>
      {node}
      {hint && <div className="text-xs opacity-60">{hint}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Form Tambah / Edit */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            <span className="text-sm font-extrabold uppercase">{mode === 'add' ? 'Buat Promo Baru' : `Edit Promo #${form.id}`}</span>
          </div>
          {mode === 'edit' && (
            <button type="button" onClick={resetForm} className="btn btn--secondary btn--sm">Batal Edit</button>
          )}
        </div>

        <form onSubmit={onSubmit} className="grid gap-4">
          {/* Info dasar */}
          <div className="grid sm:grid-cols-2 gap-3">
            {field('Judul *', (
              <input type="text" value={form.title} onChange={set('title')} placeholder="cth: Double Coin Weekend" className="input w-full" />
            ))}
            {field('Banner URL', (
              <input type="text" value={form.banner_url} onChange={set('banner_url')} placeholder="Opsional" className="input w-full" />
            ))}
          </div>
          {field('Deskripsi', (
            <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Teks yang tampil di halaman top up" className="input w-full resize-none" />
          ))}

          {/* Target & syarat */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {field('Berlaku Untuk', (
              <select value={form.applies_to} onChange={set('applies_to')} className="select w-full">
                {APPLIES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ))}
            {field('Min. Topup (Rp)', (
              <input type="number" min="0" value={form.min_amount_rp} onChange={set('min_amount_rp')} placeholder="Kosong = semua" className="input w-full" />
            ))}
            {field('Min. Coin', (
              <input type="number" min="0" value={form.min_coins} onChange={set('min_coins')} placeholder="Kosong = semua" className="input w-full" />
            ))}
            {field('Maks. per User', (
              <input type="number" min="1" value={form.max_per_user} onChange={set('max_per_user')} placeholder="Kosong = unlimited" className="input w-full" />
            ), '1 = cuma 1x per user')}
            {field('Urutan Tampil', (
              <input type="number" value={form.sort_order} onChange={set('sort_order')} className="input w-full" />
            ))}
          </div>

          {/* Jadwal */}
          <div className="grid sm:grid-cols-3 gap-3">
            {field('Mulai', (
              <input type="datetime-local" value={form.starts_at} onChange={set('starts_at')} className="input w-full" />
            ), 'Kosong = langsung aktif')}
            {field('Berakhir', (
              <input type="datetime-local" value={form.ends_at} onChange={set('ends_at')} className="input w-full" />
            ), 'Kosong = tanpa batas')}
            {field('Status', (
              <label className="flex items-center gap-2 text-sm font-semibold px-3 py-2 border-2 border-[var(--border)]" style={{ boxShadow: 'var(--shadow-md)' }}>
                <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                <span>Aktif</span>
              </label>
            ))}
          </div>

          {/* Reward */}
          <div className="p-3 space-y-3" style={{ border: '1px solid var(--border-muted)' }}>
            <div className="label uppercase">Reward</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {field('Double Coin', (
                <label className="flex items-center gap-2 text-sm font-semibold px-3 py-2 border-2 border-[var(--border)]" style={{ boxShadow: 'var(--shadow-md)' }}>
                  <input type="checkbox" checked={!!form.coin_double} onChange={(e) => setForm((f) => ({ ...f, coin_double: e.target.checked }))} />
                  <span>Coin x2</span>
                </label>
              ))}
              {field('Chance Double (%)', (
                <input type="number" min="1" max="100" value={form.double_chance} onChange={set('double_chance')} placeholder="Kosong = selalu" className="input w-full" disabled={!form.coin_double} />
              ), '1–100, kosong = 100%')}
              {field('Bonus Coin Flat', (
                <input type="number" min="0" value={form.bonus_coin} onChange={set('bonus_coin')} placeholder="cth: 2000" className="input w-full" />
              ))}
              {field('Bonus Coin (%)', (
                <input type="number" min="0" max="500" value={form.bonus_coin_percent} onChange={set('bonus_coin_percent')} placeholder="cth: 10" className="input w-full" />
              ))}
              {field('Bonus XP', (
                <input type="number" min="0" value={form.xp} onChange={set('xp')} className="input w-full" />
              ))}
              {field('Avatar Border', (
                <select value={form.border_id} onChange={set('border_id')} className="select w-full">
                  <option value="">— Tidak ada —</option>
                  {borders.map((b) => <option key={b.id} value={b.id}>{b.title || `Border #${b.id}`}</option>)}
                </select>
              ))}
              {field('VIP (hari)', (
                <input type="number" min="0" value={form.vip_days} onChange={set('vip_days')} placeholder="cth: 1" className="input w-full" />
              ))}
              {field('VIP Level', (
                <select value={form.vip_level} onChange={set('vip_level')} className="select w-full" disabled={!form.vip_days}>
                  {VIP_LEVELS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ))}
              {field('Super Badge', (
                <select value={form.super_badge_id} onChange={set('super_badge_id')} className="select w-full">
                  <option value="">— Tidak ada —</option>
                  {badges.map((b) => <option key={b.id} value={b.id}>{b.name || b.code || `Badge #${b.id}`}</option>)}
                </select>
              ), 'Dari katalog badge (menu Lencana)')}
              {field('Kode Redeem', (
                <input type="text" value={form.kode_redeem} onChange={set('kode_redeem')} placeholder="Opsional" className="input w-full" />
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-[160px_auto] gap-3 items-center">
            <button type="submit" disabled={submitting} className={`btn disabled:opacity-60 inline-flex items-center gap-2 ${mode === 'add' ? 'btn--primary' : 'btn--secondary'}`}>
              {submitting ? (mode === 'add' ? 'Menambah...' : 'Menyimpan...') : mode === 'add' ? (<><Plus className="size-4" /> Tambah</>) : (<><Pencil className="size-4" /> Simpan</>)}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold">{items.length} promo</div>
        <button type="button" onClick={loadList} disabled={loadingList} className="btn btn--secondary btn--sm">
          <RefreshCcw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border-2 border-[var(--border)] text-sm" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <thead className="bg-[var(--panel-bg)]">
            <tr>
              {['ID', 'Promo', 'Target', 'Syarat', 'Reward', 'Jadwal', 'Aktif', 'Aksi'].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const rewards = rewardChips(it);
              const req = [
                it.min_coins ? `min ${Number(it.min_coins).toLocaleString('id-ID')} coin` : null,
                it.min_amount_rp ? `min Rp ${Number(it.min_amount_rp).toLocaleString('id-ID')}` : null,
                it.max_per_user ? `maks ${it.max_per_user}x/user` : null,
              ].filter(Boolean).join(' · ');
              return (
                <tr key={it.id}>
                  <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.id}</td>
                  <td className="px-3 py-2 border-b-2 border-[var(--border)]">
                    <div className="font-bold">{it.title}</div>
                    {it.description && <div className="text-xs opacity-60 max-w-[220px] truncate">{it.description}</div>}
                  </td>
                  <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">{it.applies_to}</td>
                  <td className="px-3 py-2 border-b-2 border-[var(--border)] text-xs">{req || 'Semua'}</td>
                  <td className="px-3 py-2 border-b-2 border-[var(--border)]">
                    <div className="flex flex-wrap gap-1 max-w-[260px]">
                      {rewards.map((r) => (
                        <span key={r} className="px-1.5 py-0.5 border border-[var(--border)] text-[10px] font-bold">{r}</span>
                      ))}
                      {rewards.length === 0 && <span className="opacity-40 text-xs">-</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 border-b-2 border-[var(--border)] text-xs whitespace-nowrap">
                    {it.starts_at || it.ends_at ? `${fmtDate(it.starts_at)} → ${fmtDate(it.ends_at)}` : 'Selalu'}
                  </td>
                  <td className="px-3 py-2 border-b-2 border-[var(--border)] font-semibold">
                    {it.is_active ? <span className="text-green-600">Ya</span> : <span className="text-red-500">Tidak</span>}
                  </td>
                  <td className="px-3 py-2 border-b-2 border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onEdit(it)} className="btn btn--secondary btn--sm" title="Edit"><Pencil className="size-4" /></button>
                      <button type="button" onClick={() => onToggleActive(it)} className="btn btn--secondary btn--sm">
                        {it.is_active ? 'Off' : 'On'}
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(it)} className="btn btn--danger btn--sm" title="Hapus"><Trash2 className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm opacity-70">
                  {loadingList ? 'Memuat...' : 'Belum ada promo.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 w-[92%] max-w-md card p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)' }}>
            <div className="mb-3 text-sm font-semibold">Hapus promo &quot;{deleteTarget?.title}&quot;?</div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="btn btn--secondary disabled:opacity-60">Batal</button>
              <button type="button" disabled={deleting} onClick={onConfirmDelete} className="btn btn--danger disabled:opacity-60">
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
