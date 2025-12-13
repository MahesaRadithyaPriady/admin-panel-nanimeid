'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Gift, Settings2, Plus, Save, RefreshCw, Trash2 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listGachaConfigs, upsertGachaConfig, listGachaPrizes, createGachaPrize, updateGachaPrize, deleteGachaPrize, listAvatarBorders, listBadges, listStickers, listGachaShopItems, createGachaShopItem, updateGachaShopItem, deleteGachaShopItem, uploadGachaBanner } from '@/lib/api';

export default function GachaAdminPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const [configs, setConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');

  const [configForm, setConfigForm] = useState({
    event_code: '',
    title: '',
    description: '',
    is_active: false,
    cost_per_spin: '',
    cost_per_10: '',
    border_min_spins: '',
    border_spent_threshold: '',
    border_prob_high_spent: '',
    border_prob_low_spent: '',
    special_image_url: '',
    special_starts_at: '',
    special_ends_at: '',
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [specialEvent, setSpecialEvent] = useState(null);

  const [prizes, setPrizes] = useState([]);
  const [loadingPrizes, setLoadingPrizes] = useState(false);
  const [editingPrize, setEditingPrize] = useState(null); // null = add mode
  const [prizeForm, setPrizeForm] = useState({
    event_code: '',
    type: 'COIN',
    label: '',
    amount: '',
    tier: '',
    code: '',
    image_url: '',
    weight: '1',
    is_pity_main: false,
    sort_order: '1',
    is_active: true,
  });
  const [savingPrize, setSavingPrize] = useState(false);

  // Sharp Token Shop per event (GachaShopItem)
  const [shopItems, setShopItems] = useState([]);
  const [loadingShop, setLoadingShop] = useState(false);
  const [editingShopItem, setEditingShopItem] = useState(null);
  const [shopForm, setShopForm] = useState({
    code: '',
    type: 'BORDER',
    title: '',
    image_url: '',
    sharp_cost: '',
    border_code: '',
    event_code: '',
    sort_order: '0',
    is_active: true,
  });
  const [savingShop, setSavingShop] = useState(false);

  // Master data untuk tipe hadiah kompleks
  const [borders, setBorders] = useState([]);
  const [loadingBorders, setLoadingBorders] = useState(false);
  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [stickers, setStickers] = useState([]);
  const [loadingStickers, setLoadingStickers] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const token = getSession()?.token;
      const res = await listGachaConfigs({ token });
      const list = Array.isArray(res?.configs) ? res.configs : [];
      setConfigs(list);
      if (!selectedEvent && list.length) {
        handleSelectEvent(list[0].event_code);
      }
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat konfigurasi gacha');
    } finally {
      setLoadingConfigs(false);
    }
  };

  const onUploadBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = getSession()?.token;
    try {
      const res = await uploadGachaBanner({ token, file });
      const url = res?.url || res?.image_url || '';
      if (url) {
        setConfigForm((f) => ({ ...f, special_image_url: url }));
        toast.success('Banner diupload');
      } else {
        toast.error('Upload berhasil tapi URL tidak ditemukan');
      }
    } catch (err) {
      toast.error(err?.message || 'Gagal mengupload banner');
    } finally {
      // reset input supaya bisa pilih file yang sama lagi kalau perlu
      e.target.value = '';
    }
  };

  const onSelectShopBorder = (id) => {
    const found = borders.find((b) => String(b.id) === String(id));
    if (!found) return;
    setShopForm((f) => ({
      ...f,
      // avatar memakai katalog yang sama dengan avatar border
      type: f.type === 'AVATAR' ? 'AVATAR' : 'BORDER',
      code: found.code || f.code,
      title: f.title || found.title || found.code || '',
      image_url: found.image_url || f.image_url,
      border_code: found.code || f.border_code,
    }));
  };

  const onSelectShopBadge = (id) => {
    const found = badges.find((b) => String(b.id) === String(id));
    if (!found) return;
    setShopForm((f) => ({
      ...f,
      type: f.type === 'SUPER_BADGE' ? 'SUPER_BADGE' : 'BADGE',
      code: found.code || f.code,
      title: f.title || found.name || found.code || '',
      image_url: found.badge_url || f.image_url,
    }));
  };

  const onSelectShopSticker = (id) => {
    const found = stickers.find((s) => String(s.id) === String(id));
    if (!found) return;
    setShopForm((f) => ({
      ...f,
      type: 'STICKER',
      code: found.code || f.code,
      title: f.title || found.name || found.code || '',
      image_url: found.image_url || f.image_url,
    }));
  };

  const loadShopItems = async (eventCode) => {
    setLoadingShop(true);
    try {
      const token = getSession()?.token;
      const res = await listGachaShopItems({ token, event_code: eventCode || '' });
      const items = Array.isArray(res?.items) ? res.items : [];
      setShopItems(items);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat item shop');
    } finally {
      setLoadingShop(false);
    }
  };

  // Auto-load master data berdasarkan tipe hadiah / tipe shop yang dipilih
  useEffect(() => {
    const token = getSession()?.token;
    if (!token) return;

    const needBorders = prizeForm.type === 'BORDER' || prizeForm.type === 'AVATAR' || shopForm.type === 'BORDER' || shopForm.type === 'AVATAR';
    const needBadges = prizeForm.type === 'BADGE' || prizeForm.type === 'SUPER_BADGE' || shopForm.type === 'BADGE' || shopForm.type === 'SUPER_BADGE';
    const needStickers = prizeForm.type === 'STICKER' || shopForm.type === 'STICKER';

    if (needBorders && !borders.length && !loadingBorders) {
      const run = async () => {
        try {
          setLoadingBorders(true);
          const res = await listAvatarBorders({ token, page: 1, limit: 200, q: '', active: 'true' });
          setBorders(Array.isArray(res.items) ? res.items : []);
        } catch (err) {
          toast.error(err?.message || 'Gagal memuat avatar borders');
        } finally {
          setLoadingBorders(false);
        }
      };
      run();
    }

    if (needBadges && !badges.length && !loadingBadges) {
      const run = async () => {
        try {
          setLoadingBadges(true);
          const res = await listBadges({ token, page: 1, limit: 200, q: '', active: 'true' });
          setBadges(Array.isArray(res.items) ? res.items : []);
        } catch (err) {
          toast.error(err?.message || 'Gagal memuat badges');
        } finally {
          setLoadingBadges(false);
        }
      };
      run();
    }

    if (needStickers && !stickers.length && !loadingStickers) {
      const run = async () => {
        try {
          setLoadingStickers(true);
          const res = await listStickers({ token, page: 1, limit: 200, q: '' });
          setStickers(Array.isArray(res.items) ? res.items : []);
        } catch (err) {
          toast.error(err?.message || 'Gagal memuat stiker');
        } finally {
          setLoadingStickers(false);
        }
      };
      run();
    }
  }, [prizeForm.type, shopForm.type, borders.length, badges.length, stickers.length, loadingBorders, loadingBadges, loadingStickers]);

  useEffect(() => {
    if (!user) return;
    loadConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSelectEvent = (eventCode) => {
    setSelectedEvent(eventCode || '');
    const found = configs.find((c) => c.event_code === eventCode) || null;
    if (found) {
      const se = found.specialEvent || null;
      setSpecialEvent(se);
      const toDatetimeLocal = (value) => {
        if (!value) return '';
        try {
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);
          return d.toISOString().slice(0, 16);
        } catch {
          return String(value).slice(0, 16);
        }
      };
      setConfigForm({
        event_code: found.event_code || '',
        title: found.title || '',
        description: found.description || '',
        is_active: !!found.is_active,
        cost_per_spin: found.cost_per_spin != null ? String(found.cost_per_spin) : '',
        cost_per_10: found.cost_per_10 != null ? String(found.cost_per_10) : '',
        border_min_spins: found.border_min_spins != null ? String(found.border_min_spins) : '',
        border_spent_threshold: found.border_spent_threshold != null ? String(found.border_spent_threshold) : '',
        border_prob_high_spent: found.border_prob_high_spent != null ? String(found.border_prob_high_spent) : '',
        border_prob_low_spent: found.border_prob_low_spent != null ? String(found.border_prob_low_spent) : '',
        special_image_url: se?.image_url || '',
        special_starts_at: toDatetimeLocal(se?.starts_at),
        special_ends_at: toDatetimeLocal(se?.ends_at),
      });
    } else {
      setSpecialEvent(null);
      setConfigForm((f) => ({
        ...f,
        event_code: eventCode || '',
        special_image_url: '',
        special_starts_at: '',
        special_ends_at: '',
      }));
    }
    if (eventCode) {
      loadPrizes(eventCode);
      loadShopItems(eventCode);
    } else {
      setPrizes([]);
      setShopItems([]);
    }
  };

  const updateConfigField = (k, v) => {
    setConfigForm((f) => ({ ...f, [k]: v }));
  };

  const onSubmitConfig = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      if (!configForm.event_code) {
        toast.error('event_code wajib diisi');
        return;
      }
      setSavingConfig(true);
      const payload = {
        event_code: String(configForm.event_code).trim(),
        title: configForm.title || undefined,
        description: configForm.description || undefined,
        is_active: !!configForm.is_active,
        cost_per_spin: configForm.cost_per_spin !== '' ? Number(configForm.cost_per_spin) : undefined,
        cost_per_10: configForm.cost_per_10 !== '' ? Number(configForm.cost_per_10) : undefined,
        border_min_spins: configForm.border_min_spins !== '' ? Number(configForm.border_min_spins) : undefined,
        border_spent_threshold: configForm.border_spent_threshold !== '' ? Number(configForm.border_spent_threshold) : undefined,
        border_prob_high_spent: configForm.border_prob_high_spent !== '' ? Number(configForm.border_prob_high_spent) : undefined,
        border_prob_low_spent: configForm.border_prob_low_spent !== '' ? Number(configForm.border_prob_low_spent) : undefined,
        special_image_url: configForm.special_image_url || undefined,
        special_starts_at: configForm.special_starts_at || undefined,
        special_ends_at: configForm.special_ends_at || undefined,
        auto_special_event: true,
      };
      const res = await upsertGachaConfig({ token, payload });
      const savedConfig = res?.config || res || {};
      const effectiveEventCode = savedConfig.event_code || payload.event_code;
      if (res?.specialEvent) {
        setSpecialEvent(res.specialEvent);
      }
      toast.success('Konfigurasi gacha disimpan');
      await loadConfigs();

      setSelectedEvent(effectiveEventCode);
      setConfigForm((f) => ({
        ...f,
        event_code: effectiveEventCode,
      }));
      setPrizeForm((f) => ({
        ...f,
        event_code: effectiveEventCode || f.event_code || '',
      }));
      await loadPrizes(effectiveEventCode);
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan konfigurasi');
    } finally {
      setSavingConfig(false);
    }
  };

  const loadPrizes = async (eventCode) => {
    setLoadingPrizes(true);
    try {
      const token = getSession()?.token;
      const res = await listGachaPrizes({ token, event_code: eventCode });
      const items = Array.isArray(res?.items) ? res.items : [];
      setPrizes(items);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat hadiah gacha');
    } finally {
      setLoadingPrizes(false);
    }
  };

  const resetPrizeForm = () => {
    setEditingPrize(null);
    setPrizeForm({
      event_code: selectedEvent || '',
      type: 'COIN',
      label: '',
      amount: '',
      tier: '',
      code: '',
      image_url: '',
      weight: '1',
      is_pity_main: false,
      sort_order: '1',
      is_active: true,
    });
  };

  const startEditPrize = (p) => {
    setEditingPrize(p);
    setPrizeForm({
      event_code: p.event_code || selectedEvent || '',
      type: p.type || 'COIN',
      label: p.label || '',
      amount: p.amount != null ? String(p.amount) : '',
      tier: p.tier || '',
      code: p.code || '',
      image_url: p.image_url || '',
      weight: p.weight != null ? String(p.weight) : '1',
      is_pity_main: !!p.is_pity_main,
      sort_order: p.sort_order != null ? String(p.sort_order) : '1',
      is_active: !!p.is_active,
    });
  };

  const updatePrizeField = (k, v) => {
    setPrizeForm((f) => ({ ...f, [k]: v }));
  };

  const onSelectBorder = (id) => {
    const found = borders.find((b) => String(b.id) === String(id));
    if (!found) {
      updatePrizeField('border_id', '');
      return;
    }
    // Isi otomatis field terkait border
    setPrizeForm((f) => ({
      ...f,
      event_code: f.event_code || selectedEvent || '',
      code: found.code || f.code,
      label: f.label || found.title || found.code || '',
      image_url: found.image_url || f.image_url,
      tier: found.tier || f.tier,
      border_id: String(found.id),
    }));
  };

  const onSelectBadge = (id) => {
    const found = badges.find((b) => String(b.id) === String(id));
    if (!found) {
      updatePrizeField('badge_id', '');
      return;
    }
    setPrizeForm((f) => ({
      ...f,
      event_code: f.event_code || selectedEvent || '',
      code: found.code || f.code,
      label: f.label || found.name || found.code || '',
      image_url: found.badge_url || f.image_url,
      badge_id: String(found.id),
    }));
  };

  const onSelectSticker = (id) => {
    const found = stickers.find((s) => String(s.id) === String(id));
    if (!found) {
      updatePrizeField('sticker_id', '');
      return;
    }
    setPrizeForm((f) => ({
      ...f,
      event_code: f.event_code || selectedEvent || '',
      code: found.code || f.code,
      label: f.label || found.name || found.code || '',
      image_url: found.image_url || f.image_url,
      sticker_id: String(found.id),
    }));
  };

  const onSubmitPrize = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!selectedEvent && !prizeForm.event_code) {
      toast.error('Pilih event terlebih dahulu');
      return;
    }
    try {
      setSavingPrize(true);
      const payload = {
        event_code: (prizeForm.event_code || selectedEvent || '').trim(),
        type: prizeForm.type,
        label: prizeForm.label,
        amount: prizeForm.amount !== '' ? Number(prizeForm.amount) : undefined,
        tier: prizeForm.tier || undefined,
        code: prizeForm.code || undefined,
        image_url: prizeForm.image_url || undefined,
        weight: prizeForm.weight !== '' ? Number(prizeForm.weight) : 1,
        is_pity_main: !!prizeForm.is_pity_main,
        sort_order: prizeForm.sort_order !== '' ? Number(prizeForm.sort_order) : undefined,
        is_active: !!prizeForm.is_active,
      };

      if (editingPrize && editingPrize.id != null) {
        await updateGachaPrize({ token, id: editingPrize.id, payload });
        toast.success('Hadiah gacha diperbarui');
      } else {
        await createGachaPrize({ token, payload });
        toast.success('Hadiah gacha dibuat');
      }
      resetPrizeForm();
      await loadPrizes(payload.event_code);
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan hadiah');
    } finally {
      setSavingPrize(false);
    }
  };

  const onDeletePrize = async (p) => {
    if (!p?.id) return;
    const token = getSession()?.token;
    try {
      await deleteGachaPrize({ token, id: p.id });
      toast.success('Hadiah gacha dihapus');
      await loadPrizes(selectedEvent || p.event_code);
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus hadiah');
    }
  };

  const updateShopField = (k, v) => {
    setShopForm((f) => ({ ...f, [k]: v }));
  };

  const resetShopForm = () => {
    setEditingShopItem(null);
    setShopForm({
      code: '',
      type: 'BORDER',
      title: '',
      image_url: '',
      sharp_cost: '',
      border_code: '',
      event_code: selectedEvent || '',
      sort_order: '0',
      is_active: true,
    });
  };

  const startEditShopItem = (item) => {
    setEditingShopItem(item);
    setShopForm({
      code: item.code || '',
      type: item.type || 'BORDER',
      title: item.title || '',
      image_url: item.image_url || '',
      sharp_cost: item.sharp_cost != null ? String(item.sharp_cost) : '',
      border_code: item.border_code || '',
      event_code: item.event_code || '',
      sort_order: item.sort_order != null ? String(item.sort_order) : '0',
      is_active: !!item.is_active,
    });
  };

  const onSubmitShopItem = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!selectedEvent && !shopForm.event_code) {
      toast.error('Pilih event terlebih dahulu atau isi event_code untuk item global');
      return;
    }
    try {
      setSavingShop(true);
      const payload = {
        code: shopForm.code,
        type: shopForm.type,
        title: shopForm.title,
        image_url: shopForm.image_url || undefined,
        sharp_cost: shopForm.sharp_cost !== '' ? Number(shopForm.sharp_cost) : 0,
        border_code: shopForm.border_code || undefined,
        event_code: shopForm.event_code || selectedEvent || null,
        sort_order: shopForm.sort_order !== '' ? Number(shopForm.sort_order) : 0,
        is_active: !!shopForm.is_active,
      };

      if (editingShopItem && editingShopItem.id != null) {
        await updateGachaShopItem({ token, id: editingShopItem.id, payload });
        toast.success('Item shop diperbarui');
      } else {
        await createGachaShopItem({ token, payload });
        toast.success('Item shop dibuat');
      }
      resetShopForm();
      await loadShopItems(selectedEvent || payload.event_code || '');
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan item shop');
    } finally {
      setSavingShop(false);
    }
  };

  const onDeleteShopItem = async (item) => {
    if (!item?.id) return;
    const token = getSession()?.token;
    try {
      await deleteGachaShopItem({ token, id: item.id });
      toast.success('Item shop dihapus');
      await loadShopItems(selectedEvent || item.event_code || '');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus item shop');
    }
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <Gift className="size-5" />
          Gacha Admin
        </h2>
        <button
          type="button"
          onClick={loadConfigs}
          className="btn-pg flex items-center gap-2"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar Event List */}
        <div className="space-y-3">
          <div className="text-sm font-extrabold flex items-center gap-2">
            <Settings2 className="size-4" />
            Event Gacha
          </div>
          <div className="border-4 rounded-lg p-3" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            {loadingConfigs ? (
              <div className="text-sm">Memuat...</div>
            ) : (
              <div className="space-y-2">
                {configs.map((c) => {
                  const active = selectedEvent === c.event_code;
                  return (
                    <button
                      key={c.event_code}
                      type="button"
                      onClick={() => handleSelectEvent(c.event_code)}
                      className="w-full text-left px-3 py-2 border-4 rounded-lg text-sm font-extrabold"
                      style={{
                        boxShadow: '3px 3px 0 #000',
                        background: active ? '#FFD803' : 'var(--panel-bg)',
                        borderColor: 'var(--panel-border)',
                      }}
                    >
                      <div>{c.event_code}</div>
                      <div className="text-[11px] font-semibold opacity-80">{c.title || '-'}</div>
                    </button>
                  );
                })}
                {configs.length === 0 && (
                  <div className="text-xs opacity-70">Belum ada konfigurasi gacha.</div>
                )}
                <button
                  type="button"
                  onClick={() => handleSelectEvent('')}
                  className="w-full mt-2 flex items-center justify-center gap-2 border-4 rounded-lg px-3 py-2 text-xs font-extrabold"
                  style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
                >
                  <Plus className="size-3" /> Event Baru
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Config + Prizes + Shop */}
        <div className="space-y-6">
          {/* Config Form */}
          <form
            onSubmit={onSubmitConfig}
            className="space-y-3 p-4 border-4 rounded-lg"
            style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <div className="text-lg font-extrabold mb-1">Konfigurasi Event</div>
            <div className="space-y-3">
              <F label="Event Code">
                <input
                  value={configForm.event_code}
                  onChange={(e) => updateConfigField('event_code', e.target.value)}
                  className="inp"
                  placeholder="GACHA_BORDER_SSS_PLUS"
                  required
                />
              </F>
              <F label="Judul">
                <input
                  value={configForm.title}
                  onChange={(e) => updateConfigField('title', e.target.value)}
                  className="inp"
                />
              </F>
              <F label="Deskripsi">
                <input
                  value={configForm.description}
                  onChange={(e) => updateConfigField('description', e.target.value)}
                  className="inp"
                />
              </F>
              <F label="Aktif?">
                <label className="inline-flex items-center gap-2 text-xs font-extrabold">
                  <input
                    type="checkbox"
                    checked={configForm.is_active}
                    onChange={(e) => updateConfigField('is_active', e.target.checked)}
                  />
                  Aktif
                </label>
              </F>
              <F label="Cost per Spin">
                <input
                  type="number"
                  min="0"
                  value={configForm.cost_per_spin}
                  onChange={(e) => updateConfigField('cost_per_spin', e.target.value)}
                  className="inp"
                />
              </F>
              <F label="Cost per 10x">
                <input
                  type="number"
                  min="0"
                  value={configForm.cost_per_10}
                  onChange={(e) => updateConfigField('cost_per_10', e.target.value)}
                  className="inp"
                />
              </F>
              <F label="Border Min Spins">
                <input
                  type="number"
                  min="0"
                  value={configForm.border_min_spins}
                  onChange={(e) => updateConfigField('border_min_spins', e.target.value)}
                  className="inp"
                />
              </F>
              <F label="Border Spent Threshold">
                <input
                  type="number"
                  min="0"
                  value={configForm.border_spent_threshold}
                  onChange={(e) => updateConfigField('border_spent_threshold', e.target.value)}
                  className="inp"
                />
              </F>
              <F label="Prob High Spent">
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={configForm.border_prob_high_spent}
                  onChange={(e) => updateConfigField('border_prob_high_spent', e.target.value)}
                  className="inp"
                />
              </F>
              <F label="Prob Low Spent">
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={configForm.border_prob_low_spent}
                  onChange={(e) => updateConfigField('border_prob_low_spent', e.target.value)}
                  className="inp"
                />
              </F>
              <F label="Special Image URL (banner)">
                <input
                  value={configForm.special_image_url}
                  onChange={(e) => updateConfigField('special_image_url', e.target.value)}
                  className="inp"
                  placeholder="https://... (hasil upload-banner)"
                />
              </F>
              <F label="Special Starts At (ISO datetime)">
                <input
                  type="datetime-local"
                  value={configForm.special_starts_at}
                  onChange={(e) => updateConfigField('special_starts_at', e.target.value)}
                  className="inp"
                  placeholder="2025-12-20T00:00:00Z"
                />
              </F>
              <F label="Special Ends At (ISO datetime)">
                <input
                  type="datetime-local"
                  value={configForm.special_ends_at}
                  onChange={(e) => updateConfigField('special_ends_at', e.target.value)}
                  className="inp"
                  placeholder="2026-01-05T00:00:00Z"
                />
              </F>
              <F label="Upload Banner ">
                <input
                  type="file"
                  accept="image/*"
                  className="inp"
                  onChange={onUploadBannerChange}
                />
              </F>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={savingConfig}
                className="btn-add flex items-center gap-2"
              >
                {savingConfig ? 'Menyimpan...' : (
                  <>
                    <Save className="size-4" />
                    Simpan Konfigurasi
                  </>
                )}
              </button>
            </div>
            {specialEvent && (
              <div className="mt-3 p-3 border-4 rounded-lg text-xs font-semibold" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                <div className="font-extrabold mb-1">Special Event Terhubung</div>
                <div className="space-y-1">
                  <div>
                    <span className="opacity-70 mr-1">Code:</span>
                    <span className="font-extrabold">{specialEvent.code}</span>
                  </div>
                  {specialEvent.web_url && (
                    <div>
                      <span className="opacity-70 mr-1">Link Event:</span>
                      <a
                        href={specialEvent.web_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-extrabold break-all"
                      >
                        {specialEvent.web_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>

          {/* Prizes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold">Hadiah Gacha</div>
              <div className="text-xs font-semibold opacity-70">
                Event: {selectedEvent || prizeForm.event_code || '-'}
              </div>
            </div>

            <form
              onSubmit={onSubmitPrize}
              className="space-y-3 p-4 border-4 rounded-lg"
              style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              <div className="space-y-3">
                <F label="Event Code">
                  <input
                    value={prizeForm.event_code}
                    onChange={(e) => updatePrizeField('event_code', e.target.value)}
                    className="inp"
                    placeholder="GACHA_BORDER_SSS_PLUS"
                  />
                </F>
                {(prizeForm.type === 'BADGE' || prizeForm.type === 'SUPER_BADGE') && (
                  <F label="Badge (master)">
                    <select
                      className="sel"
                      value={prizeForm.badge_id || ''}
                      onChange={(e) => onSelectBadge(e.target.value)}
                    >
                      <option value="">Pilih badge...</option>
                      {badges.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name || b.code}
                        </option>
                      ))}
                    </select>
                    {loadingBadges && (
                      <div className="text-[11px] font-semibold opacity-70 mt-1">Memuat badges...</div>
                    )}
                  </F>
                )}
                {prizeForm.type === 'STICKER' && (
                  <F label="Sticker (master)">
                    <select
                      className="sel"
                      value={prizeForm.sticker_id || ''}
                      onChange={(e) => onSelectSticker(e.target.value)}
                    >
                      <option value="">Pilih sticker...</option>
                      {stickers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.code}
                        </option>
                      ))}
                    </select>
                    {loadingStickers && (
                      <div className="text-[11px] font-semibold opacity-70 mt-1">Memuat stiker...</div>
                    )}
                  </F>
                )}
                <F label="Type">
                  <select
                    value={prizeForm.type}
                    onChange={(e) => updatePrizeField('type', e.target.value)}
                    className="sel"
                  >
                    <option value="COIN">COIN</option>
                    <option value="TOKEN">TOKEN</option>
                    <option value="BORDER">BORDER</option>
                    <option value="ZONK">ZONK</option>
                    <option value="STICKER">STICKER</option>
                    <option value="AVATAR">AVATAR</option>
                    <option value="BADGE">BADGE</option>
                    <option value="SUPER_BADGE">SUPER_BADGE</option>
                  </select>
                </F>
                {prizeForm.type === 'BORDER' && (
                  <F label="Avatar Border (master)">
                    <select
                      className="sel"
                      value={prizeForm.border_id || ''}
                      onChange={(e) => onSelectBorder(e.target.value)}
                    >
                      <option value="">Pilih border...</option>
                      {borders.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title || b.code} ({b.tier || '-'})
                        </option>
                      ))}
                    </select>
                    {loadingBorders && (
                      <div className="text-[11px] font-semibold opacity-70 mt-1">Memuat avatar borders...</div>
                    )}
                  </F>
                )}
                <F label="Label">
                  <input
                    value={prizeForm.label}
                    onChange={(e) => updatePrizeField('label', e.target.value)}
                    className="inp"
                  />
                </F>
                <F label="Amount (COIN/TOKEN)">
                  <input
                    type="number"
                    value={prizeForm.amount}
                    onChange={(e) => updatePrizeField('amount', e.target.value)}
                    className="inp"
                  />
                </F>
                <F label="Tier (BORDER)">
                  <input
                    value={prizeForm.tier}
                    onChange={(e) => updatePrizeField('tier', e.target.value)}
                    className="inp"
                    placeholder="SSS_PLUS, SSS, SS, ..."
                  />
                </F>
                <F label="Kode Item">
                  <input
                    value={prizeForm.code}
                    onChange={(e) => updatePrizeField('code', e.target.value)}
                    className="inp"
                    placeholder="COIN_100, AVATAR_BORDER_SSS_PLUS, ..."
                  />
                </F>
                <F label="Image URL">
                  <input
                    value={prizeForm.image_url}
                    onChange={(e) => updatePrizeField('image_url', e.target.value)}
                    className="inp"
                    placeholder="https://..."
                  />
                </F>
                <F label="Weight">
                  <input
                    type="number"
                    min="1"
                    value={prizeForm.weight}
                    onChange={(e) => updatePrizeField('weight', e.target.value)}
                    className="inp"
                  />
                </F>
                <F label="Sort Order">
                  <input
                    type="number"
                    min="0"
                    value={prizeForm.sort_order}
                    onChange={(e) => updatePrizeField('sort_order', e.target.value)}
                    className="inp"
                  />
                </F>
                <F label="Pity Main?">
                  <label className="inline-flex items-center gap-2 text-xs font-extrabold">
                    <input
                      type="checkbox"
                      checked={prizeForm.is_pity_main}
                      onChange={(e) => updatePrizeField('is_pity_main', e.target.checked)}
                    />
                    is_pity_main
                  </label>
                </F>
                <F label="Aktif?">
                  <label className="inline-flex items-center gap-2 text-xs font-extrabold">
                    <input
                      type="checkbox"
                      checked={prizeForm.is_active}
                      onChange={(e) => updatePrizeField('is_active', e.target.checked)}
                    />
                    Aktif
                  </label>
                </F>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingPrize}
                  className="btn-add flex items-center gap-2"
                >
                  {savingPrize ? 'Menyimpan...' : (
                    <>
                      <Save className="size-4" />
                      {editingPrize ? 'Update Hadiah' : 'Tambah Hadiah'}
                    </>
                  )}
                </button>
                {editingPrize && (
                  <button
                    type="button"
                    onClick={resetPrizeForm}
                    className="btn-act text-xs"
                  >
                    Batal Edit
                  </button>
                )}
              </div>
            </form>

            <div className="overflow-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Label</Th>
                    <Th>Type</Th>
                    <Th>Amount</Th>
                    <Th>Weight</Th>
                    <Th>Sort</Th>
                    <Th>Aktif</Th>
                    <Th>Aksi</Th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPrizes ? (
                    <tr>
                      <td colSpan={8} className="td-empty">Memuat...</td>
                    </tr>
                  ) : (
                    prizes.map((p) => (
                      <tr key={p.id}>
                        <Td>{p.id}</Td>
                        <Td className="font-extrabold">{p.label}</Td>
                        <Td>{p.type}</Td>
                        <Td>{p.amount ?? '-'}</Td>
                        <Td>{p.weight}</Td>
                        <Td>{p.sort_order}</Td>
                        <Td>{p.is_active ? 'Ya' : 'Tidak'}</Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditPrize(p)}
                              className="btn-act text-xs flex items-center gap-1"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeletePrize(p)}
                              className="btn-act text-xs flex items-center gap-1"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))
                  )}
                  {!loadingPrizes && prizes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="td-empty">Tidak ada data.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sharp Token Shop per Event */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold">Sharp Token Shop</div>
              <div className="text-xs font-semibold opacity-70">
                Event: {selectedEvent || '-'} (item global + event ini)
              </div>
            </div>

            <form
              onSubmit={onSubmitShopItem}
              className="space-y-3 p-4 border-4 rounded-lg"
              style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              <div className="space-y-3">
                <F label="Type">
                  <select
                    value={shopForm.type}
                    onChange={(e) => updateShopField('type', e.target.value)}
                    className="sel"
                  >
                    <option value="BORDER">BORDER</option>
                    <option value="BADGE">BADGE</option>
                    <option value="SUPER_BADGE">SUPER_BADGE</option>
                    <option value="STICKER">STICKER</option>
                    <option value="AVATAR">AVATAR</option>
                    <option value="TOKEN">TOKEN</option>
                    <option value="COIN">COIN</option>
                  </select>
                </F>
                {(shopForm.type === 'BORDER' || shopForm.type === 'AVATAR') && (
                  <F label="Avatar Border (master)">
                    <select
                      className="sel"
                      onChange={(e) => onSelectShopBorder(e.target.value)}
                    >
                      <option value="">Pilih border...</option>
                      {borders.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title || b.code} ({b.tier || '-'})
                        </option>
                      ))}
                    </select>
                    {loadingBorders && (
                      <div className="text-[11px] font-semibold opacity-70 mt-1">Memuat avatar borders...</div>
                    )}
                  </F>
                )}
                {(shopForm.type === 'BADGE' || shopForm.type === 'SUPER_BADGE') && (
                  <F label="Badge (master)">
                    <select
                      className="sel"
                      value={shopForm.code || ''}
                      onChange={(e) => onSelectShopBadge(e.target.value)}
                    >
                      <option value="">Pilih badge...</option>
                      {badges.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name || b.code}
                        </option>
                      ))}
                    </select>
                    {loadingBadges && (
                      <div className="text-[11px] font-semibold opacity-70 mt-1">Memuat badges...</div>
                    )}
                  </F>
                )}
                {shopForm.type === 'STICKER' && (
                  <F label="Sticker (master)">
                    <select
                      className="sel"
                      value={shopForm.code || ''}
                      onChange={(e) => onSelectShopSticker(e.target.value)}
                    >
                      <option value="">Pilih sticker...</option>
                      {stickers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.code}
                        </option>
                      ))}
                    </select>
                    {loadingStickers && (
                      <div className="text-[11px] font-semibold opacity-70 mt-1">Memuat stiker...</div>
                    )}
                  </F>
                )}
                <F label="Kode Item Shop">
                  <input
                    value={shopForm.code}
                    onChange={(e) => updateShopField('code', e.target.value)}
                    className="inp"
                    placeholder="XMAS_BORDER_2025"
                    required
                  />
                </F>
                <F label="Title">
                  <input
                    value={shopForm.title}
                    onChange={(e) => updateShopField('title', e.target.value)}
                    className="inp"
                    required
                  />
                </F>
                <F label="Image URL">
                  <input
                    value={shopForm.image_url}
                    onChange={(e) => updateShopField('image_url', e.target.value)}
                    className="inp"
                    placeholder="https://..."
                  />
                </F>
                <F label="Sharp Cost">
                  <input
                    type="number"
                    min="0"
                    value={shopForm.sharp_cost}
                    onChange={(e) => updateShopField('sharp_cost', e.target.value)}
                    className="inp"
                    required
                  />
                </F>
                <F label="Border Code (jika type BORDER)">
                  <input
                    value={shopForm.border_code}
                    onChange={(e) => updateShopField('border_code', e.target.value)}
                    className="inp"
                    placeholder="AVATAR_BORDER_XMAS_2025"
                  />
                </F>
                <F label="Event Code (kosong = pakai event terpilih, null = global)">
                  <input
                    value={shopForm.event_code}
                    onChange={(e) => updateShopField('event_code', e.target.value)}
                    className="inp"
                    placeholder={selectedEvent || 'GLOBAL'}
                  />
                </F>
                <F label="Sort Order">
                  <input
                    type="number"
                    min="0"
                    value={shopForm.sort_order}
                    onChange={(e) => updateShopField('sort_order', e.target.value)}
                    className="inp"
                  />
                </F>
                <F label="Aktif?">
                  <label className="inline-flex items-center gap-2 text-xs font-extrabold">
                    <input
                      type="checkbox"
                      checked={shopForm.is_active}
                      onChange={(e) => updateShopField('is_active', e.target.checked)}
                    />
                    Aktif
                  </label>
                </F>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingShop}
                  className="btn-add flex items-center gap-2"
                >
                  {savingShop ? 'Menyimpan...' : (
                    <>
                      <Save className="size-4" />
                      {editingShopItem ? 'Update Item Shop' : 'Tambah Item Shop'}
                    </>
                  )}
                </button>
                {editingShopItem && (
                  <button
                    type="button"
                    onClick={resetShopForm}
                    className="btn-act text-xs"
                  >
                    Batal Edit
                  </button>
                )}
              </div>
            </form>

            <div className="overflow-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Code</Th>
                    <Th>Title</Th>
                    <Th>Type</Th>
                    <Th>Sharp Cost</Th>
                    <Th>Event Code</Th>
                    <Th>Aktif</Th>
                    <Th>Aksi</Th>
                  </tr>
                </thead>
                <tbody>
                  {loadingShop ? (
                    <tr>
                      <td colSpan={8} className="td-empty">Memuat...</td>
                    </tr>
                  ) : (
                    shopItems.map((it) => (
                      <tr key={it.id}>
                        <Td>{it.id}</Td>
                        <Td className="font-extrabold">{it.code}</Td>
                        <Td>{it.title}</Td>
                        <Td>{it.type}</Td>
                        <Td>{it.sharp_cost}</Td>
                        <Td>{it.event_code ?? 'GLOBAL'}</Td>
                        <Td>{it.is_active ? 'Ya' : 'Tidak'}</Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditShopItem(it)}
                              className="btn-act text-xs flex items-center gap-1"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteShopItem(it)}
                              className="btn-act text-xs flex items-center gap-1"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))
                  )}
                  {!loadingShop && shopItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="td-empty">Tidak ada item shop.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function F({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
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

const styles = `
.inp { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 600; }
.sel { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 800; }
.lbl { font-size: 0.875rem; font-weight: 800; }
.btn-add { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:4px 4px 0 #000; background: var(--accent-add); color: var(--accent-add-foreground); border-color: var(--panel-border); }
.btn-act { padding:0.25rem 0.5rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:3px 3px 0 #000; background: var(--panel-bg); color: var(--foreground); border-color: var(--panel-border); }
.tbl { min-width: 100%; border-width:4px; border-radius:0.5rem; overflow:hidden; box-shadow:6px 6px 0 #000; border-color: var(--panel-border); color: var(--foreground); }
.tbl thead { background: var(--panel-bg); }
.th { text-align:left; padding:0.5rem 0.75rem; border-bottom-width:4px; border-color: var(--panel-border); }
.td { padding:0.5rem 0.75rem; border-bottom-width:4px; border-color: var(--panel-border); font-weight:600; }
.td-empty { padding:1.5rem; text-align:center; font-size:0.875rem; opacity:0.7; }
.btn-pg { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; background:#fff; font-weight:800; box-shadow:4px 4px 0 #000; }
`;

if (typeof document !== 'undefined' && !document.getElementById('gacha-admin-styles')) {
  const style = document.createElement('style');
  style.id = 'gacha-admin-styles';
  style.innerHTML = styles;
  document.head.appendChild(style);
}
