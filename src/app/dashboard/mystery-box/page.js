'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Gift, Settings2, Plus, Save, RefreshCw, Trash2, Pencil, Copy } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import {
  listMysteryBoxes,
  createMysteryBox,
  updateMysteryBox,
  deleteMysteryBox,
  listMysteryBoxTiers,
  createMysteryBoxTier,
  updateMysteryBoxTier,
  deleteMysteryBoxTier,
  getMysteryBoxRewardOptions,
} from '@/lib/api';

const TIER_TYPES = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
const REWARD_TYPES = ['COIN', 'XP', 'SUPER_BADGE', 'STICKER', 'VIP', 'AVATAR_BORDER'];

export default function MysteryBoxAdminPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const [boxes, setBoxes] = useState([]);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);

  // Box form
  const [boxMode, setBoxMode] = useState('add');
  const [boxForm, setBoxForm] = useState({
    id: null,
    code: '',
    name: '',
    description: '',
    image_url: '',
    is_active: true,
    cost_coins: '0',
  });
  const [savingBox, setSavingBox] = useState(false);

  // Tier form
  const [tiers, setTiers] = useState([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [tierMode, setTierMode] = useState('add');
  const [tierForm, setTierForm] = useState({
    id: null,
    box_id: '',
    tier_type: 'COMMON',
    label: '',
    weight: '1',
    reward_type: 'COIN',
    coin_min: '0',
    coin_max: '0',
    xp_min: '0',
    xp_max: '0',
    badge_id: '',
    border_id: '',
    sticker_id: '',
    vip_plan_id: '',
    vip_days: '',
    vip_days_min: '',
    vip_days_max: '',
    vip_use_range: false,
    image_url: '',
    is_active: true,
  });
  const [savingTier, setSavingTier] = useState(false);

  // Reward options
  const [rewardOptions, setRewardOptions] = useState(null);
  const [loadingRewardOptions, setLoadingRewardOptions] = useState(false);

  // Delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmType, setConfirmType] = useState('box');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadBoxes = async () => {
    setLoadingBoxes(true);
    try {
      const token = getSession()?.token;
      const list = await listMysteryBoxes({ token });
      setBoxes(list);
      if (!selectedBoxId && list.length) {
        handleSelectBox(list[0].id);
      }
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat mystery box');
    } finally {
      setLoadingBoxes(false);
    }
  };

  const loadRewardOptions = async () => {
    if (rewardOptions || loadingRewardOptions) return;
    setLoadingRewardOptions(true);
    try {
      const token = getSession()?.token;
      const data = await getMysteryBoxRewardOptions({ token });
      setRewardOptions(data || { badges: [], borders: [], stickers: [], vip_plans: [], vip_days_options: [] });
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat reward options');
    } finally {
      setLoadingRewardOptions(false);
    }
  };

  const loadTiers = async (boxId) => {
    if (!boxId) {
      setTiers([]);
      return;
    }
    setLoadingTiers(true);
    try {
      const token = getSession()?.token;
      const list = await listMysteryBoxTiers({ token, box_id: boxId });
      setTiers(list);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat tier');
    } finally {
      setLoadingTiers(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadBoxes();
    loadRewardOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSelectBox = (boxId) => {
    setSelectedBoxId(boxId);
    const found = boxes.find((b) => b.id === boxId) || null;
    setSelectedBox(found);
    if (found) {
      setBoxMode('edit');
      setBoxForm({
        id: found.id,
        code: found.code || '',
        name: found.name || '',
        description: found.description || '',
        image_url: found.image_url || '',
        is_active: !!found.is_active,
        cost_coins: found.cost_coins != null ? String(found.cost_coins) : '0',
      });
    }
    loadTiers(boxId);
    resetTierForm(boxId);
  };

  const handleNewBox = () => {
    setSelectedBoxId(null);
    setSelectedBox(null);
    setBoxMode('add');
    setBoxForm({
      id: null,
      code: '',
      name: '',
      description: '',
      image_url: '',
      is_active: true,
      cost_coins: '0',
    });
    setTiers([]);
  };

  const updateBoxField = (k, v) => {
    setBoxForm((f) => ({ ...f, [k]: v }));
  };

  const onSubmitBox = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!boxForm.code || !boxForm.name) {
      toast.error('code dan name wajib diisi');
      return;
    }
    try {
      setSavingBox(true);
      const payload = {
        code: String(boxForm.code).trim(),
        name: boxForm.name,
        description: boxForm.description || undefined,
        image_url: boxForm.image_url || undefined,
        is_active: !!boxForm.is_active,
        cost_coins: boxForm.cost_coins !== '' ? Number(boxForm.cost_coins) : 0,
      };
      if (boxMode === 'add') {
        const res = await createMysteryBox({ token, payload });
        toast.success('Mystery Box berhasil dibuat');
        await loadBoxes();
        if (res?.id) handleSelectBox(res.id);
      } else {
        await updateMysteryBox({ token, id: boxForm.id, payload });
        toast.success('Mystery Box diperbarui');
        await loadBoxes();
        if (boxForm.id) handleSelectBox(boxForm.id);
      }
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan mystery box');
    } finally {
      setSavingBox(false);
    }
  };

  const onRequestDeleteBox = (box) => {
    setConfirmType('box');
    setConfirmTarget(box);
    setConfirmOpen(true);
  };

  const onRequestDeleteTier = (tier) => {
    setConfirmType('tier');
    setConfirmTarget(tier);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!confirmTarget) return;
    const token = getSession()?.token;
    try {
      setDeleting(true);
      if (confirmType === 'box') {
        await deleteMysteryBox({ token, id: confirmTarget.id });
        toast.success('Mystery Box dihapus');
        if (selectedBoxId === confirmTarget.id) handleNewBox();
        await loadBoxes();
      } else {
        await deleteMysteryBoxTier({ token, id: confirmTarget.id });
        toast.success('Tier dihapus');
        if (selectedBoxId) await loadTiers(selectedBoxId);
      }
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus');
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  // Tier form helpers
  const resetTierForm = (boxId = selectedBoxId) => {
    setTierMode('add');
    setTierForm({
      id: null,
      box_id: boxId || '',
      tier_type: 'COMMON',
      label: '',
      weight: '1',
      reward_type: 'COIN',
      coin_min: '0',
      coin_max: '0',
      xp_min: '0',
      xp_max: '0',
      badge_id: '',
      border_id: '',
      sticker_id: '',
      vip_plan_id: '',
      vip_days: '',
      vip_days_min: '',
      vip_days_max: '',
      vip_use_range: false,
      image_url: '',
      is_active: true,
    });
  };

  const startEditTier = (t) => {
    setTierMode('edit');
    setTierForm({
      id: t.id,
      box_id: t.box_id || selectedBoxId || '',
      tier_type: t.tier_type || 'COMMON',
      label: t.label || '',
      weight: t.weight != null ? String(t.weight) : '1',
      reward_type: t.reward_type || 'COIN',
      coin_min: t.coin_min != null ? String(t.coin_min) : '0',
      coin_max: t.coin_max != null ? String(t.coin_max) : '0',
      xp_min: t.xp_min != null ? String(t.xp_min) : '0',
      xp_max: t.xp_max != null ? String(t.xp_max) : '0',
      badge_id: t.badge_id != null ? String(t.badge_id) : '',
      border_id: t.border_id != null ? String(t.border_id) : '',
      sticker_id: t.sticker_id != null ? String(t.sticker_id) : '',
      vip_plan_id: t.vip_plan_id != null ? String(t.vip_plan_id) : '',
      vip_days: t.vip_days != null ? String(t.vip_days) : '',
      vip_days_min: t.vip_days_min != null ? String(t.vip_days_min) : '',
      vip_days_max: t.vip_days_max != null ? String(t.vip_days_max) : '',
      vip_use_range: t.vip_days_min != null || t.vip_days_max != null,
      image_url: t.image_url || '',
      is_active: !!t.is_active,
    });
  };

  const updateTierField = (k, v) => {
    setTierForm((f) => ({ ...f, [k]: v }));
  };

  const onSelectBadge = (id) => {
    const found = (rewardOptions?.badges || []).find((b) => String(b.id) === String(id));
    if (!found) {
      updateTierField('badge_id', '');
      return;
    }
    setTierForm((f) => ({
      ...f,
      badge_id: String(found.id),
      label: f.label || found.name || found.code || '',
      image_url: f.image_url || found.badge_url || '',
    }));
  };

  const onSelectSticker = (id) => {
    const found = (rewardOptions?.stickers || []).find((s) => String(s.id) === String(id));
    if (!found) {
      updateTierField('sticker_id', '');
      return;
    }
    setTierForm((f) => ({
      ...f,
      sticker_id: String(found.id),
      label: f.label || found.name || found.code || '',
      image_url: f.image_url || found.image_url || '',
    }));
  };

  const onSelectBorder = (id) => {
    const found = (rewardOptions?.borders || []).find((b) => String(b.id) === String(id));
    if (!found) {
      updateTierField('border_id', '');
      return;
    }
    setTierForm((f) => ({
      ...f,
      border_id: String(found.id),
      label: f.label || found.title || found.code || '',
      image_url: f.image_url || found.image_url || '',
    }));
  };

  const onSelectVipPlan = (id) => {
    if (!id) {
      setTierForm((f) => ({ ...f, vip_plan_id: '', vip_days: '' }));
      return;
    }
    const found = (rewardOptions?.vip_plans || []).find((p) => String(p.id) === String(id));
    if (!found) {
      setTierForm((f) => ({ ...f, vip_plan_id: '' }));
      return;
    }
    setTierForm((f) => ({
      ...f,
      vip_plan_id: String(found.id),
      vip_days: found.duration_days != null ? String(found.duration_days) : '',
      label: f.label || `${found.name} VIP`,
    }));
  };

  const onToggleVipRange = (checked) => {
    setTierForm((f) => ({
      ...f,
      vip_use_range: checked,
      vip_days_min: checked ? f.vip_days_min : '',
      vip_days_max: checked ? f.vip_days_max : '',
    }));
  };

  const onSubmitTier = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!selectedBoxId && !tierForm.box_id) {
      toast.error('Pilih mystery box terlebih dahulu');
      return;
    }
    if (!tierForm.label) {
      toast.error('label wajib diisi');
      return;
    }
    try {
      setSavingTier(true);
      const payload = {
        box_id: Number(tierForm.box_id || selectedBoxId),
        tier_type: tierForm.tier_type,
        label: tierForm.label,
        weight: tierForm.weight !== '' ? Number(tierForm.weight) : 1,
        reward_type: tierForm.reward_type,
        is_active: !!tierForm.is_active,
      };

      if (tierForm.reward_type === 'COIN') {
        payload.coin_min = tierForm.coin_min !== '' ? Number(tierForm.coin_min) : 0;
        payload.coin_max = tierForm.coin_max !== '' ? Number(tierForm.coin_max) : 0;
      } else if (tierForm.reward_type === 'XP') {
        const xpMin = tierForm.xp_min !== '' ? Number(tierForm.xp_min) : 0;
        const xpMax = tierForm.xp_max !== '' ? Number(tierForm.xp_max) : 0;
        if (xpMin < 0 || xpMax < 0 || xpMin > xpMax) {
          toast.error('xp_min dan xp_max wajib >= 0 dan min <= max untuk reward_type XP');
          setSavingTier(false);
          return;
        }
        payload.xp_min = xpMin;
        payload.xp_max = xpMax;
      } else if (tierForm.reward_type === 'SUPER_BADGE') {
        if (!tierForm.badge_id) {
          toast.error('badge_id wajib untuk reward_type SUPER_BADGE');
          setSavingTier(false);
          return;
        }
        payload.badge_id = Number(tierForm.badge_id);
      } else if (tierForm.reward_type === 'STICKER') {
        if (!tierForm.sticker_id) {
          toast.error('sticker_id wajib untuk reward_type STICKER');
          setSavingTier(false);
          return;
        }
        payload.sticker_id = Number(tierForm.sticker_id);
      } else if (tierForm.reward_type === 'AVATAR_BORDER') {
        if (!tierForm.border_id) {
          toast.error('border_id wajib untuk reward_type AVATAR_BORDER');
          setSavingTier(false);
          return;
        }
        payload.border_id = Number(tierForm.border_id);
      } else if (tierForm.reward_type === 'VIP') {
        if (!tierForm.vip_plan_id) {
          toast.error('vip_plan_id wajib untuk reward_type VIP (pilih VIP Plan)');
          setSavingTier(false);
          return;
        }
        payload.vip_plan_id = Number(tierForm.vip_plan_id);
        if (tierForm.vip_use_range) {
          const minN = Number(tierForm.vip_days_min);
          const maxN = Number(tierForm.vip_days_max);
          if (!minN || minN <= 0 || !maxN || maxN <= 0 || minN > maxN) {
            toast.error('vip_days_min & vip_days_max wajib > 0 dan min <= max untuk random range');
            setSavingTier(false);
            return;
          }
          payload.vip_days_min = minN;
          payload.vip_days_max = maxN;
        }
      }

      if (tierForm.image_url) payload.image_url = tierForm.image_url;

      if (tierMode === 'add') {
        await createMysteryBoxTier({ token, payload });
        toast.success('Tier berhasil dibuat');
      } else {
        await updateMysteryBoxTier({ token, id: tierForm.id, payload });
        toast.success('Tier diperbarui');
      }
      resetTierForm();
      await loadTiers(selectedBoxId);
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan tier');
    } finally {
      setSavingTier(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      toast.success('URL disalin');
    } catch {
      toast.error('Gagal menyalin');
    }
  };

  if (loading || !user) return null;

  const badges = rewardOptions?.badges || [];
  const borders = rewardOptions?.borders || [];
  const stickers = rewardOptions?.stickers || [];
  const vipPlans = rewardOptions?.vip_plans || [];
  const vipDaysOptions = rewardOptions?.vip_days_options || [1, 3, 7, 14, 30, 60, 90, 365];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <Gift className="size-5" />
          Mystery Box Admin
        </h2>
        <button
          type="button"
          onClick={() => {
            loadBoxes();
            loadRewardOptions();
          }}
          className="btn-pg flex items-center gap-2"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar Box List */}
        <div className="space-y-3">
          <div className="text-sm font-extrabold flex items-center gap-2">
            <Settings2 className="size-4" />
            Mystery Box
          </div>
          <div
            className="border-2 rounded-lg p-3"
            style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
          >
            {loadingBoxes ? (
              <div className="text-sm">Memuat...</div>
            ) : (
              <div className="space-y-2">
                {boxes.map((b) => {
                  const active = selectedBoxId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBox(b.id)}
                      className="w-full text-left px-3 py-2 border-2 rounded-lg text-sm font-extrabold"
                      style={{
                        boxShadow: 'var(--shadow-sm)',
                        background: active ? '#FFD803' : 'var(--panel-bg)',
                        borderColor: 'var(--panel-border)',
                      }}
                    >
                      <div>{b.code}</div>
                      <div className="text-[11px] font-semibold opacity-80">{b.name || '-'}</div>
                      <div className="text-[10px] font-semibold opacity-60 mt-0.5">
                        {b.is_active ? 'Aktif' : 'Nonaktif'} | {b.cost_coins ?? 0} coins
                      </div>
                    </button>
                  );
                })}
                {boxes.length === 0 && <div className="text-xs opacity-70">Belum ada mystery box.</div>}
                <button
                  type="button"
                  onClick={handleNewBox}
                  className="w-full mt-2 flex items-center justify-center gap-2 border-2 rounded-lg px-3 py-2 text-xs font-extrabold"
                  style={{
                    boxShadow: 'var(--shadow-sm)',
                    background: 'var(--accent-add)',
                    color: 'var(--accent-add-foreground)',
                    borderColor: 'var(--panel-border)',
                  }}
                >
                  <Plus className="size-3" /> Box Baru
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Box Form */}
          <form
            onSubmit={onSubmitBox}
            className="space-y-3 p-4 border-2 rounded-lg"
            style={{
              boxShadow: 'var(--shadow-lg)',
              background: 'var(--panel-bg)',
              borderColor: 'var(--panel-border)',
              color: 'var(--foreground)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold">
                {boxMode === 'add' ? 'Buat Mystery Box' : 'Edit Mystery Box'}
              </div>
              {boxMode === 'edit' && selectedBox?.fe_url && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold opacity-70">FE URL:</span>
                  <code className="font-extrabold break-all">{selectedBox.fe_url}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedBox.fe_url)}
                    className="btn-act text-xs flex items-center gap-1"
                  >
                    <Copy className="size-3" /> Salin
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <F label="Code (unik)">
                <input
                  value={boxForm.code}
                  onChange={(e) => updateBoxField('code', e.target.value)}
                  className="inp"
                  placeholder="BASIC_BOX"
                  required
                />
              </F>
              <F label="Name">
                <input
                  value={boxForm.name}
                  onChange={(e) => updateBoxField('name', e.target.value)}
                  className="inp"
                  placeholder="Basic Mystery Box"
                  required
                />
              </F>
              <F label="Description">
                <input
                  value={boxForm.description}
                  onChange={(e) => updateBoxField('description', e.target.value)}
                  className="inp"
                  placeholder="Deskripsi box (opsional)"
                />
              </F>
              <F label="Image URL">
                <input
                  value={boxForm.image_url}
                  onChange={(e) => updateBoxField('image_url', e.target.value)}
                  className="inp"
                  placeholder="https://... (opsional)"
                />
              </F>
              <div className="grid sm:grid-cols-2 gap-3">
                <F label="Cost Coins">
                  <input
                    type="number"
                    min="0"
                    value={boxForm.cost_coins}
                    onChange={(e) => updateBoxField('cost_coins', e.target.value)}
                    className="inp"
                  />
                </F>
                <F label="Aktif?">
                  <label className="inline-flex items-center gap-2 text-xs font-extrabold">
                    <input
                      type="checkbox"
                      checked={boxForm.is_active}
                      onChange={(e) => updateBoxField('is_active', e.target.checked)}
                    />
                    Aktif
                  </label>
                </F>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={savingBox} className="btn-add flex items-center gap-2">
                {savingBox ? (
                  'Menyimpan...'
                ) : (
                  <>
                    <Save className="size-4" />
                    {boxMode === 'add' ? 'Buat Box' : 'Simpan Box'}
                  </>
                )}
              </button>
              {boxMode === 'edit' && (
                <button
                  type="button"
                  onClick={() => onRequestDeleteBox(selectedBox)}
                  className="btn-act text-xs flex items-center gap-1"
                  style={{ background: '#FEB2B2' }}
                >
                  <Trash2 className="size-3" /> Hapus Box
                </button>
              )}
            </div>
          </form>

          {/* Tier Management */}
          {selectedBoxId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-lg font-extrabold">Tier & Hadiah</div>
                <div className="text-xs font-semibold opacity-70">
                  Box: {selectedBox?.code || '-'} | {tiers.length} tier
                </div>
              </div>

              {/* Tier Form */}
              <form
                onSubmit={onSubmitTier}
                className="space-y-3 p-4 border-2 rounded-lg"
                style={{
                  boxShadow: 'var(--shadow-lg)',
                  background: 'var(--panel-bg)',
                  borderColor: 'var(--panel-border)',
                  color: 'var(--foreground)',
                }}
              >
                <div className="text-sm font-extrabold">
                  {tierMode === 'add' ? 'Tambah Tier' : 'Edit Tier'}
                </div>
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <F label="Tier Type">
                      <select
                        value={tierForm.tier_type}
                        onChange={(e) => updateTierField('tier_type', e.target.value)}
                        className="sel"
                      >
                        {TIER_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </F>
                    <F label="Reward Type">
                      <select
                        value={tierForm.reward_type}
                        onChange={(e) => updateTierField('reward_type', e.target.value)}
                        className="sel"
                      >
                        {REWARD_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </F>
                  </div>

                  <F label="Label">
                    <input
                      value={tierForm.label}
                      onChange={(e) => updateTierField('label', e.target.value)}
                      className="inp"
                      placeholder="Common Coins"
                      required
                    />
                  </F>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <F label="Weight (probabilitas)">
                      <input
                        type="number"
                        min="0"
                        value={tierForm.weight}
                        onChange={(e) => updateTierField('weight', e.target.value)}
                        className="inp"
                      />
                    </F>
                    <F label="Image URL (opsional)">
                      <input
                        value={tierForm.image_url}
                        onChange={(e) => updateTierField('image_url', e.target.value)}
                        className="inp"
                        placeholder="https://..."
                      />
                    </F>
                  </div>

                  {/* Conditional fields by reward_type */}
                  {tierForm.reward_type === 'COIN' && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <F label="Coin Min">
                        <input
                          type="number"
                          min="0"
                          value={tierForm.coin_min}
                          onChange={(e) => updateTierField('coin_min', e.target.value)}
                          className="inp"
                        />
                      </F>
                      <F label="Coin Max">
                        <input
                          type="number"
                          min="0"
                          value={tierForm.coin_max}
                          onChange={(e) => updateTierField('coin_max', e.target.value)}
                          className="inp"
                        />
                      </F>
                    </div>
                  )}

                  {tierForm.reward_type === 'XP' && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <F label="XP Min">
                        <input
                          type="number"
                          min="0"
                          value={tierForm.xp_min}
                          onChange={(e) => updateTierField('xp_min', e.target.value)}
                          className="inp"
                        />
                      </F>
                      <F label="XP Max">
                        <input
                          type="number"
                          min="0"
                          value={tierForm.xp_max}
                          onChange={(e) => updateTierField('xp_max', e.target.value)}
                          className="inp"
                        />
                      </F>
                    </div>
                  )}

                  {tierForm.reward_type === 'SUPER_BADGE' && (
                    <F label="Pilih Badge">
                      {loadingRewardOptions ? (
                        <div className="text-xs opacity-70">Memuat badge...</div>
                      ) : (
                        <select
                          className="sel"
                          value={tierForm.badge_id}
                          onChange={(e) => onSelectBadge(e.target.value)}
                        >
                          <option value="">Pilih badge...</option>
                          {badges.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.code} - {b.name}{b.is_active === false ? ' (nonaktif)' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </F>
                  )}

                  {tierForm.reward_type === 'STICKER' && (
                    <F label="Pilih Sticker">
                      {loadingRewardOptions ? (
                        <div className="text-xs opacity-70">Memuat stiker...</div>
                      ) : (
                        <select
                          className="sel"
                          value={tierForm.sticker_id}
                          onChange={(e) => onSelectSticker(e.target.value)}
                        >
                          <option value="">Pilih stiker...</option>
                          {stickers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name || s.code}{s.is_active === false ? ' (nonaktif)' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </F>
                  )}

                  {tierForm.reward_type === 'AVATAR_BORDER' && (
                    <F label="Pilih Border">
                      {loadingRewardOptions ? (
                        <div className="text-xs opacity-70">Memuat border...</div>
                      ) : (
                        <select
                          className="sel"
                          value={tierForm.border_id}
                          onChange={(e) => onSelectBorder(e.target.value)}
                        >
                          <option value="">Pilih border...</option>
                          {borders.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.code} - {b.title}{b.is_active === false ? ' (nonaktif)' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </F>
                  )}

                  {tierForm.reward_type === 'VIP' && (
                    <div className="space-y-3">
                      <F label="VIP Plan (wajib — pilih dari plan eksisting, termasuk nonaktif)">
                        {loadingRewardOptions ? (
                          <div className="text-xs opacity-70">Memuat VIP plan...</div>
                        ) : (
                          <select
                            className="sel"
                            value={tierForm.vip_plan_id}
                            onChange={(e) => onSelectVipPlan(e.target.value)}
                          >
                            <option value="">Pilih plan...</option>
                            {vipPlans.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.duration_days} hari){p.is_active === false ? ' (nonaktif)' : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </F>

                      {tierForm.vip_plan_id && (
                        <div className="text-xs font-semibold opacity-70">
                          Default durasi: {tierForm.vip_days || '?'} hari (dari plan)
                        </div>
                      )}

                      <F label="Random Range Durasi (opsional)">
                        <label className="inline-flex items-center gap-2 text-xs font-extrabold">
                          <input
                            type="checkbox"
                            checked={tierForm.vip_use_range}
                            onChange={(e) => onToggleVipRange(e.target.checked)}
                          />
                          Override durasi dengan random range (mis. 1-5 hari)
                        </label>
                      </F>

                      {tierForm.vip_use_range && (
                        <div className="grid sm:grid-cols-2 gap-3">
                          <F label="VIP Days Min">
                            <input
                              type="number"
                              min="1"
                              value={tierForm.vip_days_min}
                              onChange={(e) => updateTierField('vip_days_min', e.target.value)}
                              className="inp"
                              placeholder="1"
                            />
                          </F>
                          <F label="VIP Days Max">
                            <input
                              type="number"
                              min="1"
                              value={tierForm.vip_days_max}
                              onChange={(e) => updateTierField('vip_days_max', e.target.value)}
                              className="inp"
                              placeholder="5"
                            />
                          </F>
                        </div>
                      )}
                    </div>
                  )}

                  <F label="Aktif?">
                    <label className="inline-flex items-center gap-2 text-xs font-extrabold">
                      <input
                        type="checkbox"
                        checked={tierForm.is_active}
                        onChange={(e) => updateTierField('is_active', e.target.checked)}
                      />
                      Aktif
                    </label>
                  </F>
                </div>

                <div className="flex items-center gap-2">
                  <button type="submit" disabled={savingTier} className="btn-add flex items-center gap-2">
                    {savingTier ? (
                      'Menyimpan...'
                    ) : (
                      <>
                        <Save className="size-4" />
                        {tierMode === 'add' ? 'Tambah Tier' : 'Update Tier'}
                      </>
                    )}
                  </button>
                  {tierMode === 'edit' && (
                    <button type="button" onClick={() => resetTierForm()} className="btn-act text-xs">
                      Batal Edit
                    </button>
                  )}
                </div>
              </form>

              {/* Tier List */}
              <div className="overflow-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <Th>ID</Th>
                      <Th>Tier</Th>
                      <Th>Label</Th>
                      <Th>Weight</Th>
                      <Th>Reward</Th>
                      <Th>Detail</Th>
                      <Th>Aktif</Th>
                      <Th>Aksi</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTiers ? (
                      <tr>
                        <td colSpan={8} className="td-empty">
                          Memuat...
                        </td>
                      </tr>
                    ) : (
                      tiers.map((t) => (
                        <tr key={t.id}>
                          <Td>{t.id}</Td>
                          <Td className="font-extrabold">{t.tier_type}</Td>
                          <Td>{t.label}</Td>
                          <Td>{t.weight}</Td>
                          <Td>{t.reward_type}</Td>
                          <Td className="text-xs">
                            {t.reward_type === 'COIN' && `${t.coin_min ?? 0} - ${t.coin_max ?? 0} coins`}
                            {t.reward_type === 'XP' && `${t.xp_min ?? 0} - ${t.xp_max ?? 0} XP`}
                            {t.reward_type === 'SUPER_BADGE' &&
                              (t.badge ? `${t.badge.code} (${t.badge.name})` : `badge #${t.badge_id}`)}
                            {t.reward_type === 'STICKER' &&
                              (t.sticker ? `${t.sticker.name || t.sticker.code}` : `sticker #${t.sticker_id}`)}
                            {t.reward_type === 'AVATAR_BORDER' &&
                              (t.border ? `${t.border.code} (${t.border.title})` : `border #${t.border_id}`)}
                            {t.reward_type === 'VIP' &&
                              (t.vip_plan
                                ? t.vip_days_min != null && t.vip_days_max != null
                                  ? `${t.vip_plan.name} (Random ${t.vip_days_min}-${t.vip_days_max} hari)`
                                  : `${t.vip_plan.name} (${t.vip_days ?? t.vip_plan.duration_days} hari)`
                                : `plan #${t.vip_plan_id}`)}
                          </Td>
                          <Td>{t.is_active ? 'Ya' : 'Tidak'}</Td>
                          <Td>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditTier(t)}
                                className="btn-act text-xs flex items-center gap-1"
                              >
                                <Pencil className="size-3" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onRequestDeleteTier(t)}
                                className="btn-act text-xs flex items-center gap-1"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </Td>
                        </tr>
                      ))
                    )}
                    {!loadingTiers && tiers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="td-empty">
                          Belum ada tier.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)} />
          <div
            className="relative z-10 w-[92%] max-w-md border-2 rounded-xl p-4 sm:p-6"
            style={{
              boxShadow: 'var(--shadow-xl)',
              background: 'var(--panel-bg)',
              borderColor: 'var(--panel-border)',
              color: 'var(--foreground)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="grid place-items-center size-10 bg-[#FEB2B2] border-2 rounded-md"
                style={{ boxShadow: 'var(--shadow-md)', borderColor: 'var(--panel-border)' }}
              >
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">
                  Hapus {confirmType === 'box' ? 'Mystery Box?' : 'Tier?'}
                </h3>
                <p className="text-sm opacity-80 break-words">
                  {confirmType === 'box'
                    ? `${confirmTarget?.name} (${confirmTarget?.code})`
                    : `${confirmTarget?.tier_type} - ${confirmTarget?.label}`}
                </p>
                {confirmType === 'box' && (
                  <p className="text-xs opacity-60 mt-1">
                    Semua tier dan pull records akan ikut terhapus.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmOpen(false)}
                className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60"
                style={{
                  boxShadow: 'var(--shadow-md)',
                  background: 'var(--panel-bg)',
                  borderColor: 'var(--panel-border)',
                  color: 'var(--foreground)',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={onConfirmDelete}
                className="px-3 py-2 border-2 rounded-lg bg-[#FFD803] hover:brightness-95 font-extrabold disabled:opacity-60"
                style={{ boxShadow: 'var(--shadow-md)', borderColor: 'var(--panel-border)' }}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
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
.inp { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 600; box-shadow: 4px 4px 0 #000; background: var(--background); border-color: var(--panel-border); color: var(--foreground); }
.sel { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 800; box-shadow: 4px 4px 0 #000; background: var(--background); border-color: var(--panel-border); color: var(--foreground); }
.lbl { font-size: 0.875rem; font-weight: 800; }
.btn-add { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:4px 4px 0 #000; background: var(--accent-add); color: var(--accent-add-foreground); border-color: var(--panel-border); }
.btn-act { padding:0.25rem 0.5rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:3px 3px 0 #000; background: var(--panel-bg); color: var(--foreground); border-color: var(--panel-border); }
.btn-pg { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; background:#fff; font-weight:800; box-shadow:4px 4px 0 #000; border-color: var(--panel-border); }
.tbl { min-width: 100%; border-width:4px; border-radius:0.5rem; overflow:hidden; box-shadow:6px 6px 0 #000; border-color: var(--panel-border); color: var(--foreground); }
.tbl thead { background: var(--panel-bg); }
.th { text-align:left; padding:0.5rem 0.75rem; border-bottom-width:4px; border-color: var(--panel-border); }
.td { padding:0.5rem 0.75rem; border-bottom-width:4px; border-color: var(--panel-border); font-weight:600; }
.td-empty { padding:1.5rem; text-align:center; font-size:0.875rem; opacity:0.7; }
`;

if (typeof document !== 'undefined' && !document.getElementById('mystery-box-admin-styles')) {
  const style = document.createElement('style');
  style.id = 'mystery-box-admin-styles';
  style.innerHTML = styles;
  document.head.appendChild(style);
}
