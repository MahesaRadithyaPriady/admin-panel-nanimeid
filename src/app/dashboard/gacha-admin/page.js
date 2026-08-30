'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Gift, Settings2, Plus, Save, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listGachaConfigs, upsertGachaConfig, listGachaPrizes, createGachaPrize, updateGachaPrize, deleteGachaPrize, listAvatarBorders, listBadges, listStickers, listGachaShopItems, createGachaShopItem, updateGachaShopItem, deleteGachaShopItem, uploadFileViaPresignedPut, listBingoRewards, createBingoReward, updateBingoReward, deleteBingoReward, updateBingoConfig, listBingoUserProgress, resetBingoUserProgress, listBingoRewardLogs, listTopupTicketBonuses, createTopupTicketBonus, updateTopupTicketBonus, deleteTopupTicketBonus, listSpinTicketBonuses, createSpinTicketBonus, updateSpinTicketBonus, deleteSpinTicketBonus, listEventMissions, createEventMission, updateEventMission, deleteEventMission, searchAnime } from '@/lib/api';
import FileInput from '@/components/dashboard/FileInput';

function safeKeySegment(input) {
  return String(input || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '')
    .slice(0, 80);
}

function guessExtFromFile(file) {
  const name = String(file?.name || '');
  const idx = name.lastIndexOf('.');
  if (idx === -1) return '';
  const ext = name.slice(idx + 1).toLowerCase();
  if (!ext || ext.length > 10) return '';
  return ext;
}

export default function GachaAdminPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const [configs, setConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);

  const [configForm, setConfigForm] = useState({
    event_code: '',
    title: '',
    description: '',
    is_active: false,
    cost_per_spin: '',
    cost_per_10: '',
    ticket_enabled: false,
    ticket_cost_per_spin: '',
    ticket_cost_per_10: '',
    initial_tickets: '',
    ticket_exchange_rate: '',
    border_min_spins: '',
    border_spent_threshold: '',
    border_prob_high_spent: '',
    border_prob_low_spent: '',
    special_image_url: '',
    special_starts_at: '',
    special_ends_at: '',
    special_web_url: '',
    special_event_code: '',
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

  // Tab navigation: 'config' | 'prizes' | 'shop' | 'tickets' | 'bingo'
  const [activeTab, setActiveTab] = useState('config');

  // Bingo sub-tab: 'rewards' | 'config' | 'progress' | 'history'
  const [bingoSubTab, setBingoSubTab] = useState('rewards');

  // Event Ticket sub-tab: 'topup' | 'spin' | 'mission'
  const [ticketSubTab, setTicketSubTab] = useState('topup');
  const [topupBonuses, setTopupBonuses] = useState([]);
  const [loadingTopupBonuses, setLoadingTopupBonuses] = useState(false);
  const [editingTopupBonus, setEditingTopupBonus] = useState(null);
  const [topupBonusForm, setTopupBonusForm] = useState({ event_code: '', min_coins: '0', ticket_reward: '1', payment_methods: [], label: '', sort_order: '0', is_active: true, period: 'EVENT' });
  const [spinBonuses, setSpinBonuses] = useState([]);
  const [loadingSpinBonuses, setLoadingSpinBonuses] = useState(false);
  const [editingSpinBonus, setEditingSpinBonus] = useState(null);
  const [spinBonusForm, setSpinBonusForm] = useState({ event_code: '', spin_count: '1', ticket_reward: '1', label: '', sort_order: '0', is_active: true });
  const [eventMissions, setEventMissions] = useState([]);
  const [loadingEventMissions, setLoadingEventMissions] = useState(false);
  const [editingEventMission, setEditingEventMission] = useState(null);
  const [eventMissionForm, setEventMissionForm] = useState({ event_code: '', mission_type: 'WATCH_EPISODE_COUNT', title: '', subtitle: '', ticket_reward: '1', target_count: '1', target_anime_id: '', target_anime_title: '', period: 'EVENT', sort_order: '0', is_active: true });
  const [autoGenMissionTitle, setAutoGenMissionTitle] = useState(true);
  const [animeSearchQuery, setAnimeSearchQuery] = useState('');
  const [animeSearchResults, setAnimeSearchResults] = useState([]);
  const [animeSearching, setAnimeSearching] = useState(false);
  const animeSearchTimer = useRef(null);

  const doAnimeSearch = (query) => {
    setAnimeSearchQuery(query);
    if (animeSearchTimer.current) clearTimeout(animeSearchTimer.current);
    if (!query.trim() || query.trim().length < 2) {
      setAnimeSearchResults([]);
      setAnimeSearching(false);
      return;
    }
    setAnimeSearching(true);
    animeSearchTimer.current = setTimeout(async () => {
      try {
        const token = getSession()?.token;
        if (!token) { setAnimeSearching(false); return; }
        const results = await searchAnime({ token, q: query.trim(), limit: 10 });
        // API return { data: [...] } with fields: nama_anime, gambar_anime, title_en, title_jp
        const items = Array.isArray(results) ? results : (results?.items || results?.data || []);
        setAnimeSearchResults(items);
      } catch (e) {
        setAnimeSearchResults([]);
      } finally {
        setAnimeSearching(false);
      }
    }, 350);
  };

  // Helper: regenerate title & subtitle berdasarkan mission_type, target_count, period, target_anime_title.
  // Dipakai saat autoGenMissionTitle=true. Return form baru dengan title/subtitle updated.
  const regenMissionText = (form) => {
    const count = Number(form.target_count) || 1;
    const periodSuffix = form.period === 'DAILY' ? ' hari ini' : form.period === 'WEEKLY' ? ' minggu ini' : ' selama event ini';
    const animeTitle = form.target_anime_title || '';
    const out = { ...form };
    switch (form.mission_type) {
      case 'WATCH_ANIME':
        if (animeTitle) {
          out.title = `Tonton ${animeTitle}`;
          out.subtitle = `Tonton semua episode dari ${animeTitle}`;
        }
        break;
      case 'WATCH_EPISODE_COUNT':
        out.title = `Tonton ${count} Episode`;
        out.subtitle = `Tonton ${count} episode anime apa saja${periodSuffix}`;
        break;
      case 'WATCH_ANIME_COUNT':
        out.title = `Tonton ${count} Anime Berbeda`;
        out.subtitle = `Tonton episode dari ${count} anime berbeda${periodSuffix}`;
        break;
      case 'WATCH_MINUTES':
        out.title = `Tonton ${count} Menit`;
        out.subtitle = `Tonton anime selama ${count} menit${periodSuffix}`;
        break;
      default:
        break;
    }
    return out;
  };

  // Wrapper setEventMissionForm yang auto-regen title/subtitle jika autoGenMissionTitle=true.
  const updateMissionField = (patch) => {
    setEventMissionForm((f) => {
      const merged = { ...f, ...patch };
      if (!autoGenMissionTitle) return merged;
      return regenMissionText(merged);
    });
  };

  const onSelectAnime = (anime) => {
    const title = anime.nama_anime || anime.title_en || anime.title_jp || anime.title || anime.name || '';
    updateMissionField({ target_anime_id: String(anime.id), target_anime_title: title });
    setAnimeSearchQuery(title);
    setAnimeSearchResults([]);
  };

  // Bingo Rewards state
  const [bingoRewards, setBingoRewards] = useState([]);
  const [loadingBingoRewards, setLoadingBingoRewards] = useState(false);
  const [editingBingoReward, setEditingBingoReward] = useState(null);
  const [bingoRewardForm, setBingoRewardForm] = useState({
    event_code: '',
    line_index: '-1',
    reward_type: 'COIN',
    label: '',
    reward_code: '',
    reward_amount: '',
    tier: '',
    image_url: '',
    is_active: true,
    sort_order: '0',
  });
  const [savingBingoReward, setSavingBingoReward] = useState(false);

  // Bingo Config state
  const [bingoConfigForm, setBingoConfigForm] = useState({
    bingo_enabled: true,
    bingo_board_size: '3',
    bingo_coin_fallback: '25000',
    bingo_reset_on_completion: true,
  });
  const [savingBingoConfig, setSavingBingoConfig] = useState(false);

  // Bingo User Progress state
  const [bingoProgress, setBingoProgress] = useState([]);
  const [bingoProgressPage, setBingoProgressPage] = useState(1);
  const [bingoProgressTotal, setBingoProgressTotal] = useState(0);
  const [bingoProgressTotalPages, setBingoProgressTotalPages] = useState(1);
  const [loadingBingoProgress, setLoadingBingoProgress] = useState(false);
  const [bingoProgressQ, setBingoProgressQ] = useState('');

  // Bingo History Log state
  const [bingoLogs, setBingoLogs] = useState([]);
  const [bingoLogsPage, setBingoLogsPage] = useState(1);
  const [bingoLogsTotal, setBingoLogsTotal] = useState(0);
  const [bingoLogsTotalPages, setBingoLogsTotalPages] = useState(1);
  const [loadingBingoLogs, setLoadingBingoLogs] = useState(false);
  const [bingoLogsUserId, setBingoLogsUserId] = useState('');

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
      if (!token) throw new Error('Token tidak tersedia');
      const eventSeg = safeKeySegment(configForm.event_code || selectedEvent || 'event');
      const ext = guessExtFromFile(file);
      const key = `static/uploads/gacha-banners/${eventSeg}_${Date.now()}${ext ? `.${ext}` : ''}`;
      const up = await uploadFileViaPresignedPut({ token, key, file });
      const url = up?.publicUrl || '';
      if (!url) throw new Error('Upload berhasil tapi URL tidak ditemukan');
      setConfigForm((f) => ({ ...f, special_image_url: url }));
      toast.success('Banner diupload');
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
      title: found.title || found.name || found.code || '',
      image_url: found.image_url || '',
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
      title: found.name || found.code || '',
      image_url: found.badge_url || found.image_url || '',
    }));
  };

  const onSelectShopSticker = (id) => {
    const found = stickers.find((s) => String(s.id) === String(id));
    if (!found) return;
    setShopForm((f) => ({
      ...f,
      type: 'STICKER',
      code: found.code || f.code,
      title: found.name || found.code || '',
      image_url: found.image_url || '',
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
        ticket_enabled: found.ticket_cost_per_spin != null && Number(found.ticket_cost_per_spin) > 0,
        ticket_cost_per_spin: found.ticket_cost_per_spin != null ? String(found.ticket_cost_per_spin) : '',
        ticket_cost_per_10: found.ticket_cost_per_10 != null ? String(found.ticket_cost_per_10) : '',
        initial_tickets: found.initial_tickets != null ? String(found.initial_tickets) : '',
        ticket_exchange_rate: found.ticket_exchange_rate != null ? String(found.ticket_exchange_rate) : '',
        border_min_spins: found.border_min_spins != null ? String(found.border_min_spins) : '',
        border_spent_threshold: found.border_spent_threshold != null ? String(found.border_spent_threshold) : '',
        border_prob_high_spent: found.border_prob_high_spent != null ? String(found.border_prob_high_spent) : '',
        border_prob_low_spent: found.border_prob_low_spent != null ? String(found.border_prob_low_spent) : '',
        special_image_url: se?.image_url || '',
        special_starts_at: toDatetimeLocal(se?.starts_at),
        special_ends_at: toDatetimeLocal(se?.ends_at),
        special_web_url: se?.web_url || '',
        special_event_code: se?.code || '',
      });
      // Load bingo config dari GachaConfig
      setBingoConfigForm({
        bingo_enabled: found.bingo_enabled !== false,
        bingo_board_size: String(found.bingo_board_size || 3),
        bingo_coin_fallback: String(found.bingo_coin_fallback || 25000),
        bingo_reset_on_completion: found.bingo_reset_on_completion !== false,
      });
    } else {
      setSpecialEvent(null);
      setConfigForm((f) => ({
        ...f,
        event_code: eventCode || '',
        special_image_url: '',
        special_starts_at: '',
        special_ends_at: '',
        special_web_url: '',
        special_event_code: '',
      }));
      setBingoConfigForm({ bingo_enabled: true, bingo_board_size: '3', bingo_coin_fallback: '25000', bingo_reset_on_completion: true });
    }
    if (eventCode) {
      loadPrizes(eventCode);
      loadShopItems(eventCode);
      loadBingoRewards(eventCode);
      loadBingoProgress(eventCode, 1);
      loadBingoLogs(eventCode, 1);
      loadTopupBonuses(eventCode);
      loadSpinBonuses(eventCode);
      loadEventMissions(eventCode);
    } else {
      setPrizes([]);
      setShopItems([]);
      setBingoRewards([]);
      setBingoProgress([]);
      setBingoLogs([]);
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
        ticket_cost_per_spin: configForm.ticket_enabled && configForm.ticket_cost_per_spin !== '' ? Number(configForm.ticket_cost_per_spin) : 0,
        ticket_cost_per_10: configForm.ticket_enabled && configForm.ticket_cost_per_10 !== '' ? Number(configForm.ticket_cost_per_10) : 0,
        initial_tickets: configForm.ticket_enabled && configForm.initial_tickets !== '' ? Number(configForm.initial_tickets) : 0,
        ticket_exchange_rate: configForm.ticket_enabled && configForm.ticket_exchange_rate !== '' ? Number(configForm.ticket_exchange_rate) : null,
        border_min_spins: configForm.border_min_spins !== '' ? Number(configForm.border_min_spins) : undefined,
        border_spent_threshold: configForm.border_spent_threshold !== '' ? Number(configForm.border_spent_threshold) : undefined,
        border_prob_high_spent: configForm.border_prob_high_spent !== '' ? Number(configForm.border_prob_high_spent) : undefined,
        border_prob_low_spent: configForm.border_prob_low_spent !== '' ? Number(configForm.border_prob_low_spent) : undefined,
        special_image_url: configForm.special_image_url || undefined,
        special_starts_at: configForm.special_starts_at || undefined,
        special_ends_at: configForm.special_ends_at || undefined,
        special_web_url: configForm.special_web_url || undefined,
        special_event_code: configForm.special_event_code || undefined,
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
    // Isi otomatis field terkait border (selalu override saat pilih item)
    setPrizeForm((f) => ({
      ...f,
      event_code: f.event_code || selectedEvent || '',
      code: found.code || f.code,
      label: found.title || found.name || found.code || '',
      image_url: found.image_url || '',
      tier: found.tier || '',
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
      label: found.name || found.code || '',
      image_url: found.badge_url || found.image_url || '',
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
      label: found.name || found.code || '',
      image_url: found.image_url || '',
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

  // ===== Bingo Functions =====

  const loadBingoRewards = async (eventCode) => {
    if (!eventCode) return;
    setLoadingBingoRewards(true);
    try {
      const token = getSession()?.token;
      const items = await listBingoRewards({ token, event_code: eventCode });
      setBingoRewards(items);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat bingo rewards');
    } finally {
      setLoadingBingoRewards(false);
    }
  };

  const onSubmitBingoReward = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!selectedEvent) { toast.error('Pilih event gacha dulu'); return; }
    setSavingBingoReward(true);
    try {
      const payload = {
        event_code: selectedEvent,
        line_index: Number(bingoRewardForm.line_index),
        reward_type: bingoRewardForm.reward_type,
        label: bingoRewardForm.label,
        reward_code: bingoRewardForm.reward_code || null,
        reward_amount: bingoRewardForm.reward_amount ? Number(bingoRewardForm.reward_amount) : null,
        tier: bingoRewardForm.tier || null,
        image_url: bingoRewardForm.image_url || null,
        is_active: bingoRewardForm.is_active,
        sort_order: Number(bingoRewardForm.sort_order) || 0,
      };
      if (editingBingoReward) {
        await updateBingoReward({ token, id: editingBingoReward.id, payload });
        toast.success('Bingo reward diupdate');
      } else {
        await createBingoReward({ token, payload });
        toast.success('Bingo reward dibuat');
      }
      setEditingBingoReward(null);
      setBingoRewardForm({ event_code: '', line_index: '-1', reward_type: 'COIN', label: '', reward_code: '', reward_amount: '', tier: '', image_url: '', is_active: true, sort_order: '0' });
      loadBingoRewards(selectedEvent);
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan bingo reward');
    } finally {
      setSavingBingoReward(false);
    }
  };

  const onEditBingoReward = (item) => {
    setEditingBingoReward(item);
    setBingoRewardForm({
      event_code: item.event_code || '',
      line_index: String(item.line_index ?? -1),
      reward_type: item.reward_type || 'COIN',
      label: item.label || '',
      reward_code: item.reward_code || '',
      reward_amount: item.reward_amount != null ? String(item.reward_amount) : '',
      tier: item.tier || '',
      image_url: item.image_url || '',
      is_active: item.is_active !== false,
      sort_order: String(item.sort_order ?? 0),
    });
  };

  const onDeleteBingoReward = (id) => {
    setConfirmModal({
      title: 'Hapus Bingo Reward?',
      message: 'Bingo reward akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.',
      confirmLabel: 'Hapus',
      confirmColor: '#ef4444',
      onConfirm: async () => {
        setConfirmModal(null);
        const token = getSession()?.token;
        try {
          await deleteBingoReward({ token, id });
          toast.success('Bingo reward dihapus');
          loadBingoRewards(selectedEvent);
        } catch (err) {
          toast.error(err?.message || 'Gagal hapus bingo reward');
        }
      },
    });
  };

  // ===== Event Ticket: Topup Bonus =====
  const loadTopupBonuses = async (eventCode) => {
    const token = getSession()?.token;
    if (!token) return;
    setLoadingTopupBonuses(true);
    try {
      const rows = await listTopupTicketBonuses({ token, event_code: eventCode || '' });
      setTopupBonuses(rows);
    } catch (e) { setTopupBonuses([]); }
    finally { setLoadingTopupBonuses(false); }
  };

  const onSubmitTopupBonus = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!token) return;
    const payload = {
      ...topupBonusForm,
      event_code: topupBonusForm.event_code || selectedEvent,
      min_coins: Number(topupBonusForm.min_coins) || 0,
      ticket_reward: Number(topupBonusForm.ticket_reward) || 1,
      sort_order: Number(topupBonusForm.sort_order) || 0,
    };
    try {
      if (editingTopupBonus) {
        await updateTopupTicketBonus({ token, id: editingTopupBonus.id, payload });
      } else {
        await createTopupTicketBonus({ token, payload });
      }
      setEditingTopupBonus(null);
      setTopupBonusForm({ event_code: '', min_coins: '0', ticket_reward: '1', payment_methods: [], label: '', sort_order: '0', is_active: true, period: 'EVENT' });
      await loadTopupBonuses(selectedEvent);
    } catch (e) { alert(e?.message || 'Gagal menyimpan topup bonus'); }
  };

  const onEditTopupBonus = (item) => {
    setEditingTopupBonus(item);
    setTopupBonusForm({
      event_code: item.event_code || '',
      min_coins: String(item.min_coins ?? '0'),
      ticket_reward: String(item.ticket_reward ?? '1'),
      payment_methods: Array.isArray(item.payment_methods) ? item.payment_methods : [],
      label: item.label || '',
      sort_order: String(item.sort_order ?? '0'),
      is_active: !!item.is_active,
      period: item.period || 'EVENT',
    });
  };

  const onDeleteTopupBonus = (id) => {
    setConfirmModal({
      title: 'Hapus Topup Bonus?',
      message: 'Topup bonus akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.',
      confirmLabel: 'Hapus',
      confirmColor: '#ef4444',
      onConfirm: async () => {
        setConfirmModal(null);
        const token = getSession()?.token;
        if (!token) return;
        try {
          await deleteTopupTicketBonus({ token, id });
          await loadTopupBonuses(selectedEvent);
        } catch (e) { toast.error(e?.message || 'Gagal hapus'); }
      },
    });
  };

  // ===== Event Ticket: Spin Bonus =====
  const loadSpinBonuses = async (eventCode) => {
    const token = getSession()?.token;
    if (!token) return;
    setLoadingSpinBonuses(true);
    try {
      const rows = await listSpinTicketBonuses({ token, event_code: eventCode || '' });
      setSpinBonuses(rows);
    } catch (e) { setSpinBonuses([]); }
    finally { setLoadingSpinBonuses(false); }
  };

  const onSubmitSpinBonus = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!token) return;
    const payload = {
      ...spinBonusForm,
      event_code: spinBonusForm.event_code || selectedEvent,
      spin_count: Number(spinBonusForm.spin_count) || 1,
      ticket_reward: Number(spinBonusForm.ticket_reward) || 1,
      sort_order: Number(spinBonusForm.sort_order) || 0,
    };
    try {
      if (editingSpinBonus) {
        await updateSpinTicketBonus({ token, id: editingSpinBonus.id, payload });
      } else {
        await createSpinTicketBonus({ token, payload });
      }
      setEditingSpinBonus(null);
      setSpinBonusForm({ event_code: '', spin_count: '1', ticket_reward: '1', label: '', sort_order: '0', is_active: true });
      await loadSpinBonuses(selectedEvent);
    } catch (e) { alert(e?.message || 'Gagal menyimpan spin bonus'); }
  };

  const onEditSpinBonus = (item) => {
    setEditingSpinBonus(item);
    setSpinBonusForm({
      event_code: item.event_code || '',
      spin_count: String(item.spin_count ?? '1'),
      ticket_reward: String(item.ticket_reward ?? '1'),
      label: item.label || '',
      sort_order: String(item.sort_order ?? '0'),
      is_active: !!item.is_active,
    });
  };

  const onDeleteSpinBonus = (id) => {
    setConfirmModal({
      title: 'Hapus Spin Bonus?',
      message: 'Spin bonus akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.',
      confirmLabel: 'Hapus',
      confirmColor: '#ef4444',
      onConfirm: async () => {
        setConfirmModal(null);
        const token = getSession()?.token;
        if (!token) return;
        try {
          await deleteSpinTicketBonus({ token, id });
          await loadSpinBonuses(selectedEvent);
        } catch (e) { toast.error(e?.message || 'Gagal hapus'); }
      },
    });
  };

  // ===== Event Ticket: Mission =====
  const loadEventMissions = async (eventCode) => {
    const token = getSession()?.token;
    if (!token) return;
    setLoadingEventMissions(true);
    try {
      const rows = await listEventMissions({ token, event_code: eventCode || '' });
      setEventMissions(rows);
    } catch (e) { setEventMissions([]); }
    finally { setLoadingEventMissions(false); }
  };

  const onSubmitEventMission = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!token) return;
    const payload = {
      ...eventMissionForm,
      event_code: eventMissionForm.event_code || selectedEvent,
      ticket_reward: Number(eventMissionForm.ticket_reward) || 1,
      target_count: Number(eventMissionForm.target_count) || 1,
      target_anime_id: eventMissionForm.target_anime_id ? Number(eventMissionForm.target_anime_id) : null,
      sort_order: Number(eventMissionForm.sort_order) || 0,
    };
    try {
      if (editingEventMission) {
        await updateEventMission({ token, id: editingEventMission.id, payload });
      } else {
        await createEventMission({ token, payload });
      }
      setEditingEventMission(null);
      setEventMissionForm({ event_code: '', mission_type: 'WATCH_EPISODE_COUNT', title: '', subtitle: '', ticket_reward: '1', target_count: '1', target_anime_id: '', target_anime_title: '', period: 'EVENT', sort_order: '0', is_active: true });
      setAutoGenMissionTitle(true);
      setAnimeSearchQuery('');
      setAnimeSearchResults([]);
      await loadEventMissions(selectedEvent);
    } catch (e) { alert(e?.message || 'Gagal menyimpan mission'); }
  };

  const onEditEventMission = (item) => {
    setEditingEventMission(item);
    setEventMissionForm({
      event_code: item.event_code || '',
      mission_type: item.mission_type || 'WATCH_EPISODE',
      title: item.title || '',
      subtitle: item.subtitle || '',
      ticket_reward: String(item.ticket_reward ?? '1'),
      target_count: String(item.target_count ?? '1'),
      target_anime_id: item.target_anime_id ? String(item.target_anime_id) : '',
      target_anime_title: item.target_anime_title || '',
      period: item.period || 'EVENT',
      sort_order: String(item.sort_order ?? '0'),
      is_active: !!item.is_active,
    });
    setAnimeSearchQuery(item.target_anime_title || '');
    setAnimeSearchResults([]);
    // Saat edit, autoGen ON agar saat user ubah field (count/anime/periode),
    // title & subtitle ikut menyesuaikan. Initial load tidak override karena
    // setEventMissionForm langsung (tidak lewat updateMissionField).
    setAutoGenMissionTitle(true);
  };

  const onDeleteEventMission = (id) => {
    setConfirmModal({
      title: 'Hapus Mission?',
      message: 'Mission akan dihapus permanen. Progress user untuk mission ini juga akan terhapus. Tindakan ini tidak bisa dibatalkan.',
      confirmLabel: 'Hapus',
      confirmColor: '#ef4444',
      onConfirm: async () => {
        setConfirmModal(null);
        const token = getSession()?.token;
        if (!token) return;
        try {
          await deleteEventMission({ token, id });
          await loadEventMissions(selectedEvent);
        } catch (e) { toast.error(e?.message || 'Gagal hapus'); }
      },
    });
  };

  const onSubmitBingoConfig = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!selectedEvent) { toast.error('Pilih event gacha dulu'); return; }
    setSavingBingoConfig(true);
    try {
      await updateBingoConfig({
        token,
        event_code: selectedEvent,
        payload: {
          bingo_enabled: bingoConfigForm.bingo_enabled,
          bingo_board_size: Number(bingoConfigForm.bingo_board_size) || 3,
          bingo_coin_fallback: Number(bingoConfigForm.bingo_coin_fallback) || 0,
          bingo_reset_on_completion: bingoConfigForm.bingo_reset_on_completion,
        },
      });
      toast.success('Bingo config disimpan');
      loadConfigs();
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan bingo config');
    } finally {
      setSavingBingoConfig(false);
    }
  };

  const loadBingoProgress = async (eventCode, pageNum) => {
    if (!eventCode) return;
    setLoadingBingoProgress(true);
    try {
      const token = getSession()?.token;
      const res = await listBingoUserProgress({ token, event_code: eventCode, page: pageNum, limit: 50, q: bingoProgressQ });
      setBingoProgress(res.items);
      setBingoProgressPage(res.page);
      setBingoProgressTotal(res.total);
      setBingoProgressTotalPages(res.totalPages);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat progress bingo');
    } finally {
      setLoadingBingoProgress(false);
    }
  };

  const onResetBingoProgress = (userId) => {
    setConfirmModal({
      title: 'Reset Bingo Progress?',
      message: `Progress bingo user ${userId} akan direset. Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: 'Reset',
      confirmColor: '#f59e0b',
      onConfirm: async () => {
        setConfirmModal(null);
        const token = getSession()?.token;
        try {
          await resetBingoUserProgress({ token, event_code: selectedEvent, userId });
          toast.success('Bingo progress direset');
          loadBingoProgress(selectedEvent, bingoProgressPage);
        } catch (err) {
          toast.error(err?.message || 'Gagal reset bingo progress');
        }
      },
    });
  };

  const loadBingoLogs = async (eventCode, pageNum) => {
    if (!eventCode) return;
    setLoadingBingoLogs(true);
    try {
      const token = getSession()?.token;
      const res = await listBingoRewardLogs({ token, event_code: eventCode, page: pageNum, limit: 50, user_id: bingoLogsUserId });
      setBingoLogs(res.items);
      setBingoLogsPage(res.page);
      setBingoLogsTotal(res.total);
      setBingoLogsTotalPages(res.totalPages);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat bingo logs');
    } finally {
      setLoadingBingoLogs(false);
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
          className="btn btn--secondary"
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
          <div className="card p-3">
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
                      className={`w-full text-left px-3 py-2 border-2 border-[var(--border)] text-sm font-extrabold ${active ? 'bg-[#FFD803]' : ''}`}
                      style={{ boxShadow: 'var(--shadow-sm)' }}
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
                  className="btn btn--primary w-full mt-2 text-xs"
                >
                  <Plus className="size-3" /> Event Baru
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Config + Prizes + Shop + Bingo */}
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-1 border-2 border-[var(--border)] rounded-lg flex-wrap" style={{ background: 'var(--panel-bg)' }}>
            {[
              { val: 'config', label: 'Konfigurasi' },
              { val: 'prizes', label: 'Hadiah' },
              { val: 'shop', label: 'Sharp Shop' },
              { val: 'tickets', label: 'Event Tiket' },
              { val: 'bingo', label: 'Bingo Spin' },
            ].map((tab) => (
              <button
                key={tab.val}
                type="button"
                onClick={() => setActiveTab(tab.val)}
                className={`px-4 py-1.5 rounded-md text-sm font-extrabold transition-all ${activeTab === tab.val ? 'btn btn--primary' : 'opacity-60 hover:opacity-100'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Config Form */}
          {activeTab === 'config' && (
          <form
            onSubmit={onSubmitConfig}
            className="card p-4 space-y-3"
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
                  readOnly={!!selectedEvent}
                  style={selectedEvent ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                />
                {selectedEvent && (
                  <div className="text-[11px] font-semibold opacity-70 mt-1">Event code terkunci (sudah ada). Buat event baru untuk kode berbeda.</div>
                )}
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
              <F label="Izinkan Tiket">
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.ticket_enabled}
                    onChange={(e) => updateConfigField('ticket_enabled', e.target.checked)}
                  />
                  {configForm.ticket_enabled ? 'Tiket AKTIF (spin pakai tiket)' : 'Tiket NONAKTIF (spin pakai coin)'}
                </label>
              </F>
              {configForm.ticket_enabled && (
                <>
                  <F label="Tiket: Cost per Spin">
                    <input
                      type="number"
                      min="0"
                      value={configForm.ticket_cost_per_spin}
                      onChange={(e) => updateConfigField('ticket_cost_per_spin', e.target.value)}
                      className="inp"
                      placeholder="Jumlah tiket per 1x spin"
                    />
                  </F>
                  <F label="Tiket: Cost per 10x">
                    <input
                      type="number"
                      min="0"
                      value={configForm.ticket_cost_per_10}
                      onChange={(e) => updateConfigField('ticket_cost_per_10', e.target.value)}
                      className="inp"
                      placeholder="Jumlah tiket per 10x spin"
                    />
                  </F>
                  <F label="Tiket Awal User">
                    <input
                      type="number"
                      min="0"
                      value={configForm.initial_tickets}
                      onChange={(e) => updateConfigField('initial_tickets', e.target.value)}
                      className="inp"
                      placeholder="Jumlah tiket awal yang diberikan ke user"
                    />
                  </F>
                  <F label="Harga Beli Tiket (coin)">
                    <input
                      type="number"
                      min="0"
                      value={configForm.ticket_exchange_rate}
                      onChange={(e) => updateConfigField('ticket_exchange_rate', e.target.value)}
                      className="inp"
                      placeholder="Berapa coin untuk beli 1 tiket"
                    />
                  </F>
                </>
              )}
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
              <F label="Special Event Code (opsional)">
                <input
                  value={configForm.special_event_code}
                  onChange={(e) => updateConfigField('special_event_code', e.target.value)}
                  className="inp"
                  placeholder="SPIN_GACHA_BORDER_SSS_PLUS (default: SPIN_{event_code})"
                />
                <div className="text-[11px] font-semibold opacity-70 mt-1">Kode unik untuk SpecialEvent. Kosongkan untuk auto-generate.</div>
              </F>
              <F label="Special Web URL (opsional)">
                <input
                  value={configForm.special_web_url}
                  onChange={(e) => updateConfigField('special_web_url', e.target.value)}
                  className="inp"
                  placeholder="https://spin.nanimeid.xyz/?event=... (kosongkan untuk auto)"
                />
                <div className="text-[11px] font-semibold opacity-70 mt-1">URL halaman web spin-wheel. Kosongkan untuk auto-generate dari sistem.</div>
              </F>
              <F label="Upload Banner ">
                <FileInput
                  accept="image/*"
                  onChange={onUploadBannerChange}
                  placeholder="Pilih banner..."
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
              <div className="card p-3 mt-3 text-xs font-semibold">
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
          )}

          {/* Prizes */}
          {activeTab === 'prizes' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold">Hadiah Gacha</div>
              <div className="text-xs font-semibold opacity-70">
                Event: {selectedEvent || prizeForm.event_code || '-'}
              </div>
            </div>

            <form
              onSubmit={onSubmitPrize}
              className="card p-4 space-y-3"
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
          )}

          {/* Sharp Token Shop per Event */}
          {activeTab === 'shop' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold">Sharp Token Shop</div>
              <div className="text-xs font-semibold opacity-70">
                Event: {selectedEvent || '-'} (item global + event ini)
              </div>
            </div>

            <form
              onSubmit={onSubmitShopItem}
              className="card p-4 space-y-3"
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
          )}

          {/* ===== Event Ticket Management ===== */}
          {activeTab === 'tickets' && (
          <div className="space-y-6">
            {/* Ticket Sub-Tabs */}
            <div className="flex items-center gap-1 p-1 border-2 border-[var(--border)] rounded-lg flex-wrap" style={{ background: 'var(--panel-bg)' }}>
              {[
                { val: 'topup', label: 'Bonus Topup' },
                { val: 'spin', label: 'Bonus Spin' },
                { val: 'mission', label: 'Mission' },
              ].map((tab) => (
                <button
                  key={tab.val}
                  type="button"
                  onClick={() => setTicketSubTab(tab.val)}
                  className={`px-3 py-1.5 rounded-md text-xs font-extrabold transition-all ${ticketSubTab === tab.val ? 'btn btn--primary' : 'opacity-60 hover:opacity-100'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ===== Topup Bonus ===== */}
            {ticketSubTab === 'topup' && (
              <div className="space-y-4">
                {/* Form Topup Bonus */}
                <form onSubmit={onSubmitTopupBonus} className="card p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="text-lg font-extrabold">{editingTopupBonus ? '✏️ Edit Bonus Topup' : '➕ Tambah Bonus Topup'}</div>
                    {editingTopupBonus && (
                      <button type="button" onClick={() => { setEditingTopupBonus(null); setTopupBonusForm({ event_code: '', min_coins: '0', ticket_reward: '1', payment_methods: [], label: '', sort_order: '0', is_active: true, period: 'EVENT' }); }} className="text-xs font-bold opacity-60 hover:opacity-100">✕ Batal Edit</button>
                    )}
                  </div>

                  {/* Group: Info Dasar */}
                  <div className="mb-4">
                    <div className="text-xs font-extrabold opacity-50 mb-2 uppercase tracking-wider">Info Dasar</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <F label="Event Code">
                        <input value={topupBonusForm.event_code} onChange={(e) => setTopupBonusForm((f) => ({ ...f, event_code: e.target.value }))} className="inp" placeholder={selectedEvent || 'EVENT_CODE'} />
                      </F>
                      <F label="Label (opsional)">
                        <input value={topupBonusForm.label} onChange={(e) => setTopupBonusForm((f) => ({ ...f, label: e.target.value }))} className="inp" placeholder="Bonus topup 50K" />
                      </F>
                    </div>
                  </div>

                  {/* Group: Target & Reward */}
                  <div className="mb-4">
                    <div className="text-xs font-extrabold opacity-50 mb-2 uppercase tracking-wider">Target & Reward</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <F label="Min Coins">
                        <input type="number" min="0" value={topupBonusForm.min_coins} onChange={(e) => setTopupBonusForm((f) => ({ ...f, min_coins: e.target.value }))} className="inp" placeholder="50000" />
                      </F>
                      <F label="Ticket Reward">
                        <input type="number" min="1" value={topupBonusForm.ticket_reward} onChange={(e) => setTopupBonusForm((f) => ({ ...f, ticket_reward: e.target.value }))} className="inp" placeholder="1" />
                      </F>
                      <F label="Periode">
                        <select value={topupBonusForm.period} onChange={(e) => setTopupBonusForm((f) => ({ ...f, period: e.target.value }))} className="sel">
                          <option value="EVENT">EVENT</option>
                          <option value="DAILY">DAILY</option>
                          <option value="WEEKLY">WEEKLY</option>
                        </select>
                      </F>
                    </div>
                  </div>

                  {/* Group: Pengaturan */}
                  <div className="mb-4">
                    <div className="text-xs font-extrabold opacity-50 mb-2 uppercase tracking-wider">Pengaturan</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <F label="Sort Order">
                        <input type="number" value={topupBonusForm.sort_order} onChange={(e) => setTopupBonusForm((f) => ({ ...f, sort_order: e.target.value }))} className="inp" />
                      </F>
                      <label className="flex items-center gap-2 text-sm font-bold cursor-pointer pt-5">
                        <input type="checkbox" checked={topupBonusForm.is_active} onChange={(e) => setTopupBonusForm((f) => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
                        Aktif
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="btn btn--primary w-full sm:w-auto">{editingTopupBonus ? '💾 Update Bonus' : '➕ Tambah Bonus'}</button>
                </form>

                {/* Daftar Topup Bonus */}
                <div className="card p-4">
                  <div className="text-lg font-extrabold mb-3">Daftar Bonus Topup {topupBonuses.length > 0 && <span className="text-xs opacity-50">({topupBonuses.length})</span>}</div>
                  {loadingTopupBonuses ? (
                    <div className="text-sm opacity-70 py-4 text-center">Memuat...</div>
                  ) : topupBonuses.length === 0 ? (
                    <div className="text-sm opacity-50 py-8 text-center">Belum ada bonus topup. Tambahkan di form atas.</div>
                  ) : (
                    <>
                      {/* Desktop: Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="tbl">
                          <thead>
                            <tr>
                              <Th>Min Coins</Th>
                              <Th>Ticket</Th>
                              <Th>Label</Th>
                              <Th>Periode</Th>
                              <Th>Status</Th>
                              <Th>Aksi</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {topupBonuses.map((b) => (
                              <tr key={b.id} className={!b.is_active ? 'opacity-50' : ''}>
                                <td className="font-bold">{Number(b.min_coins).toLocaleString('id-ID')} 🪙</td>
                                <td><span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'var(--primary)', color: 'var(--bg-base)' }}>{b.ticket_reward} 🎟️</span></td>
                                <td className="text-sm">{b.label || <span className="opacity-40">-</span>}</td>
                                <td className="text-xs">{b.period}</td>
                                <td>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${b.is_active ? 'text-green-400' : 'text-red-400'}`} style={{ background: b.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                                    {b.is_active ? 'Aktif' : 'Nonaktif'}
                                  </span>
                                </td>
                                <td>
                                  <button onClick={() => onEditTopupBonus(b)} className="text-xs font-bold mr-2 text-blue-400 hover:underline">Edit</button>
                                  <button onClick={() => onDeleteTopupBonus(b.id)} className="text-xs font-bold text-red-400 hover:underline">Hapus</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile: Card-based */}
                      <div className="md:hidden space-y-3">
                        {topupBonuses.map((b) => (
                          <div key={b.id} className={`border-2 border-[var(--border)] rounded-lg p-3 space-y-2 ${!b.is_active ? 'opacity-50' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold">{b.label || `Topup min. ${Number(b.min_coins).toLocaleString('id-ID')}`}</div>
                                <div className="text-xs opacity-60">Min: {Number(b.min_coins).toLocaleString('id-ID')} 🪙</div>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${b.is_active ? 'text-green-400' : 'text-red-400'}`} style={{ background: b.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                                {b.is_active ? 'Aktif' : 'Off'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="font-bold px-2 py-0.5 rounded" style={{ background: 'var(--primary)', color: 'var(--bg-base)' }}>{b.ticket_reward} 🎟️</span>
                              <span className="opacity-60">{b.period}</span>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => onEditTopupBonus(b)} className="text-xs font-bold text-blue-400">✏️ Edit</button>
                              <button onClick={() => onDeleteTopupBonus(b.id)} className="text-xs font-bold text-red-400">🗑️ Hapus</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ===== Spin Bonus ===== */}
            {ticketSubTab === 'spin' && (
              <div className="space-y-4">
                {/* Form Spin Bonus */}
                <form onSubmit={onSubmitSpinBonus} className="card p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="text-lg font-extrabold">{editingSpinBonus ? '✏️ Edit Bonus Spin' : '➕ Tambah Bonus Spin'}</div>
                    {editingSpinBonus && (
                      <button type="button" onClick={() => { setEditingSpinBonus(null); setSpinBonusForm({ event_code: '', spin_count: '1', ticket_reward: '1', label: '', sort_order: '0', is_active: true }); }} className="text-xs font-bold opacity-60 hover:opacity-100">✕ Batal Edit</button>
                    )}
                  </div>

                  {/* Group: Info Dasar */}
                  <div className="mb-4">
                    <div className="text-xs font-extrabold opacity-50 mb-2 uppercase tracking-wider">Info Dasar</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <F label="Event Code">
                        <input value={spinBonusForm.event_code} onChange={(e) => setSpinBonusForm((f) => ({ ...f, event_code: e.target.value }))} className="inp" placeholder={selectedEvent || 'EVENT_CODE'} />
                      </F>
                      <F label="Label (opsional)">
                        <input value={spinBonusForm.label} onChange={(e) => setSpinBonusForm((f) => ({ ...f, label: e.target.value }))} className="inp" placeholder="Bonus 10 spin" />
                      </F>
                    </div>
                  </div>

                  {/* Group: Target & Reward */}
                  <div className="mb-4">
                    <div className="text-xs font-extrabold opacity-50 mb-2 uppercase tracking-wider">Target & Reward</div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                      <F label="Spin Count (milestone)">
                        <input type="number" min="1" value={spinBonusForm.spin_count} onChange={(e) => setSpinBonusForm((f) => ({ ...f, spin_count: e.target.value }))} className="inp" placeholder="10" />
                      </F>
                      <F label="Ticket Reward">
                        <input type="number" min="1" value={spinBonusForm.ticket_reward} onChange={(e) => setSpinBonusForm((f) => ({ ...f, ticket_reward: e.target.value }))} className="inp" placeholder="1" />
                      </F>
                    </div>
                  </div>

                  {/* Group: Pengaturan */}
                  <div className="mb-4">
                    <div className="text-xs font-extrabold opacity-50 mb-2 uppercase tracking-wider">Pengaturan</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <F label="Sort Order">
                        <input type="number" value={spinBonusForm.sort_order} onChange={(e) => setSpinBonusForm((f) => ({ ...f, sort_order: e.target.value }))} className="inp" />
                      </F>
                      <label className="flex items-center gap-2 text-sm font-bold cursor-pointer pt-5">
                        <input type="checkbox" checked={spinBonusForm.is_active} onChange={(e) => setSpinBonusForm((f) => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
                        Aktif
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="btn btn--primary w-full sm:w-auto">{editingSpinBonus ? '💾 Update Bonus' : '➕ Tambah Bonus'}</button>
                </form>

                {/* Daftar Spin Bonus */}
                <div className="card p-4">
                  <div className="text-lg font-extrabold mb-3">Daftar Bonus Spin {spinBonuses.length > 0 && <span className="text-xs opacity-50">({spinBonuses.length})</span>}</div>
                  {loadingSpinBonuses ? (
                    <div className="text-sm opacity-70 py-4 text-center">Memuat...</div>
                  ) : spinBonuses.length === 0 ? (
                    <div className="text-sm opacity-50 py-8 text-center">Belum ada bonus spin. Tambahkan di form atas.</div>
                  ) : (
                    <>
                      {/* Desktop: Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="tbl">
                          <thead>
                            <tr>
                              <Th>Spin Count</Th>
                              <Th>Ticket</Th>
                              <Th>Label</Th>
                              <Th>Status</Th>
                              <Th>Aksi</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {spinBonuses.map((b) => (
                              <tr key={b.id} className={!b.is_active ? 'opacity-50' : ''}>
                                <td className="font-bold">{b.spin_count}x 🎰</td>
                                <td><span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'var(--primary)', color: 'var(--bg-base)' }}>{b.ticket_reward} 🎟️</span></td>
                                <td className="text-sm">{b.label || <span className="opacity-40">-</span>}</td>
                                <td>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${b.is_active ? 'text-green-400' : 'text-red-400'}`} style={{ background: b.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                                    {b.is_active ? 'Aktif' : 'Nonaktif'}
                                  </span>
                                </td>
                                <td>
                                  <button onClick={() => onEditSpinBonus(b)} className="text-xs font-bold mr-2 text-blue-400 hover:underline">Edit</button>
                                  <button onClick={() => onDeleteSpinBonus(b.id)} className="text-xs font-bold text-red-400 hover:underline">Hapus</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile: Card-based */}
                      <div className="md:hidden space-y-3">
                        {spinBonuses.map((b) => (
                          <div key={b.id} className={`border-2 border-[var(--border)] rounded-lg p-3 space-y-2 ${!b.is_active ? 'opacity-50' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold">{b.label || `Bonus ${b.spin_count}x spin`}</div>
                                <div className="text-xs opacity-60">Setiap {b.spin_count}x spin 🎰</div>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${b.is_active ? 'text-green-400' : 'text-red-400'}`} style={{ background: b.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                                {b.is_active ? 'Aktif' : 'Off'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="font-bold px-2 py-0.5 rounded" style={{ background: 'var(--primary)', color: 'var(--bg-base)' }}>{b.ticket_reward} 🎟️</span>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => onEditSpinBonus(b)} className="text-xs font-bold text-blue-400">✏️ Edit</button>
                              <button onClick={() => onDeleteSpinBonus(b.id)} className="text-xs font-bold text-red-400">🗑️ Hapus</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ===== Mission ===== */}
            {ticketSubTab === 'mission' && (
              <div className="space-y-4">
                {/* Form Mission */}
                <form onSubmit={onSubmitEventMission} className="card p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="text-lg font-extrabold">{editingEventMission ? '✏️ Edit Mission' : '➕ Tambah Mission'}</div>
                    {editingEventMission && (
                      <button type="button" onClick={() => { setEditingEventMission(null); setEventMissionForm({ event_code: '', mission_type: 'WATCH_EPISODE_COUNT', title: '', subtitle: '', ticket_reward: '1', target_count: '1', target_anime_id: '', target_anime_title: '', period: 'EVENT', sort_order: '0', is_active: true }); setAutoGenMissionTitle(true); setAnimeSearchQuery(''); setAnimeSearchResults([]); }} className="text-xs font-bold opacity-60 hover:opacity-100">✕ Batal Edit</button>
                    )}
                  </div>

                  {/* Group: Info Dasar */}
                  <div className="mb-4">
                    <div className="text-xs font-extrabold opacity-50 mb-2 uppercase tracking-wider">Info Dasar</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <F label="Event Code">
                        <input value={eventMissionForm.event_code} onChange={(e) => setEventMissionForm((f) => ({ ...f, event_code: e.target.value }))} className="inp" placeholder={selectedEvent || 'EVENT_CODE'} />
                      </F>
                      <F label="Tipe Mission">
                        <select value={eventMissionForm.mission_type} onChange={(e) => updateMissionField({ mission_type: e.target.value })} className="sel">
                          <option value="WATCH_EPISODE">📺 WATCH_EPISODE — Tonton 1 Episode</option>
                          <option value="WATCH_EPISODE_COUNT">📊 WATCH_EPISODE_COUNT — Tonton X Episode</option>
                          <option value="WATCH_ANIME_COUNT">🎬 WATCH_ANIME_COUNT — Tonton X Anime Berbeda</option>
                          <option value="WATCH_ANIME">🎯 WATCH_ANIME — Tonton Anime Spesifik</option>
                          <option value="WATCH_MINUTES">⏱️ WATCH_MINUTES — Tonton X Menit</option>
                          <option value="COMPLETE_EPISODE">✅ COMPLETE_EPISODE — Selesaikan Episode</option>
                          <option value="SHARE">🔗 SHARE — Bagikan</option>
                          <option value="INVITE">👥 INVITE — Undang Teman</option>
                          <option value="LOGIN">🔑 LOGIN — Login Harian</option>
                        </select>
                      </F>
                      <F label="Judul Mission (opsional)">
                        <input value={eventMissionForm.title} onChange={(e) => setEventMissionForm((f) => ({ ...f, title: e.target.value }))} className="inp" placeholder="Tonton 5 episode (default: tipe mission)" />
                      </F>
                      <F label="Subtitle (opsional)">
                        <input value={eventMissionForm.subtitle} onChange={(e) => setEventMissionForm((f) => ({ ...f, subtitle: e.target.value }))} className="inp" placeholder="Selesaikan dalam periode event" />
                      </F>
                    </div>
                  </div>

                  {/* Group: Target & Reward */}
                  <div className="mb-4">
                    <div className="text-xs font-extrabold opacity-50 mb-2 uppercase tracking-wider">Target & Reward</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <F label="Target Count">
                        <input type="number" min="1" value={eventMissionForm.target_count} onChange={(e) => updateMissionField({ target_count: e.target.value })} className="inp" placeholder="5" />
                      </F>
                      <F label="Ticket Reward">
                        <input type="number" min="1" value={eventMissionForm.ticket_reward} onChange={(e) => setEventMissionForm((f) => ({ ...f, ticket_reward: e.target.value }))} className="inp" placeholder="1" />
                      </F>
                      <F label="Periode">
                        <select value={eventMissionForm.period} onChange={(e) => updateMissionField({ period: e.target.value })} className="sel">
                          <option value="EVENT">EVENT</option>
                          <option value="DAILY">DAILY</option>
                          <option value="WEEKLY">WEEKLY</option>
                        </select>
                      </F>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={autoGenMissionTitle}
                        onChange={(e) => setAutoGenMissionTitle(e.target.checked)}
                      />
                      Auto-generate Judul & Subtitle (saat ubah tipe/count/periode/pilih anime, judul & subtitle diupdate otomatis)
                    </label>
                  </div>

                  {/* Group: Target Anime (hanya untuk WATCH_ANIME) */}
                  {eventMissionForm.mission_type === 'WATCH_ANIME' && (
                    <div className="mb-4">
                      <div className="text-xs font-extrabold opacity-50 mb-2 uppercase tracking-wider">Target Anime</div>
                      <div className="relative">
                        <F label="Cari Anime">
                          <input
                            value={animeSearchQuery}
                            onChange={(e) => doAnimeSearch(e.target.value)}
                            className="inp"
                            placeholder="Ketik judul anime... (min 2 huruf)"
                            autoComplete="off"
                          />
                        </F>
                        {animeSearching && (
                          <div className="text-xs opacity-60 mt-1">Mencari...</div>
                        )}
                        {animeSearchResults.length > 0 && (
                          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto border-2 border-[var(--border)] rounded-lg" style={{ background: 'var(--panel-bg)' }}>
                            {animeSearchResults.map((a) => {
                              const title = a.nama_anime || a.title_en || a.title_jp || a.title || a.name || 'Unknown';
                              const poster = a.gambar_anime || a.poster_url || a.image_url || a.cover_image || '';
                              const altTitle = a.title_en && a.title_en !== title ? a.title_en : (a.title_jp && a.title_jp !== title ? a.title_jp : '');
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => onSelectAnime(a)}
                                  className="w-full text-left px-3 py-2 hover:bg-[var(--hover)] border-b border-[var(--border)] last:border-0 flex items-center gap-2"
                                >
                                  {poster ? (
                                    <img src={poster} alt="" className="w-8 h-10 object-cover rounded shrink-0" loading="lazy" />
                                  ) : (
                                    <div className="w-8 h-10 rounded shrink-0 flex items-center justify-center text-xs opacity-30" style={{ background: 'var(--panel-bg)' }}>?</div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-bold truncate">{title}</div>
                                    <div className="text-xs opacity-50 truncate">
                                      ID: {a.id}
                                      {altTitle ? ` • ${altTitle}` : ''}
                                      {a.tanggal_rilis_anime ? ` • ${String(a.tanggal_rilis_anime).slice(0, 4)}` : ''}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {animeSearchQuery.length >= 2 && !animeSearching && animeSearchResults.length === 0 && (
                          <div className="text-xs opacity-50 mt-1">Tidak ada hasil. Coba judul lain.</div>
                        )}
                      </div>
                      {eventMissionForm.target_anime_id && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="font-bold opacity-60">Terpilih:</span>
                          <span className="font-bold px-2 py-1 rounded" style={{ background: 'var(--primary)', color: 'var(--bg-base)' }}>
                            ID: {eventMissionForm.target_anime_id} • {eventMissionForm.target_anime_title}
                          </span>
                          <button type="button" onClick={() => { setEventMissionForm((f) => ({ ...f, target_anime_id: '', target_anime_title: '' })); setAnimeSearchQuery(''); }} className="text-red-400 font-bold">✕</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Group: Pengaturan */}
                  <div className="mb-4">
                    <div className="text-xs font-extrabold opacity-50 mb-2 uppercase tracking-wider">Pengaturan</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <F label="Sort Order">
                        <input type="number" value={eventMissionForm.sort_order} onChange={(e) => setEventMissionForm((f) => ({ ...f, sort_order: e.target.value }))} className="inp" />
                      </F>
                      <label className="flex items-center gap-2 text-sm font-bold cursor-pointer pt-5">
                        <input type="checkbox" checked={eventMissionForm.is_active} onChange={(e) => setEventMissionForm((f) => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
                        Aktif
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="btn btn--primary w-full sm:w-auto">{editingEventMission ? '💾 Update Mission' : '➕ Tambah Mission'}</button>
                </form>

                {/* Daftar Mission - Card-based untuk mobile, table untuk desktop */}
                <div className="card p-4">
                  <div className="text-lg font-extrabold mb-3">Daftar Mission {eventMissions.length > 0 && <span className="text-xs opacity-50">({eventMissions.length})</span>}</div>
                  {loadingEventMissions ? (
                    <div className="text-sm opacity-70 py-4 text-center">Memuat...</div>
                  ) : eventMissions.length === 0 ? (
                    <div className="text-sm opacity-50 py-8 text-center">Belum ada mission. Tambahkan mission pertama di form atas.</div>
                  ) : (
                    <>
                      {/* Desktop: Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="tbl">
                          <thead>
                            <tr>
                              <Th>Tipe</Th>
                              <Th>Judul</Th>
                              <Th>Target</Th>
                              <Th>Ticket</Th>
                              <Th>Periode</Th>
                              <Th>Status</Th>
                              <Th>Aksi</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {eventMissions.map((m) => (
                              <tr key={m.id} className={!m.is_active ? 'opacity-50' : ''}>
                                <td>
                                  <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: 'var(--panel-bg)' }}>{m.mission_type}</span>
                                </td>
                                <td>
                                  <div className="text-sm font-bold">{m.title}</div>
                                  {m.subtitle && <div className="text-xs opacity-60">{m.subtitle}</div>}
                                  {m.target_anime_title && <div className="text-xs opacity-50">🎯 {m.target_anime_title}</div>}
                                </td>
                                <td className="text-center font-bold">{m.target_count}</td>
                                <td className="text-center"><span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'var(--primary)', color: 'var(--bg-base)' }}>{m.ticket_reward} 🎟️</span></td>
                                <td className="text-xs">{m.period}</td>
                                <td>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${m.is_active ? 'text-green-400' : 'text-red-400'}`} style={{ background: m.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                                    {m.is_active ? 'Aktif' : 'Nonaktif'}
                                  </span>
                                </td>
                                <td>
                                  <button onClick={() => onEditEventMission(m)} className="text-xs font-bold mr-2 text-blue-400 hover:underline">Edit</button>
                                  <button onClick={() => onDeleteEventMission(m.id)} className="text-xs font-bold text-red-400 hover:underline">Hapus</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile: Card-based */}
                      <div className="md:hidden space-y-3">
                        {eventMissions.map((m) => (
                          <div key={m.id} className={`border-2 border-[var(--border)] rounded-lg p-3 space-y-2 ${!m.is_active ? 'opacity-50' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold truncate">{m.title}</div>
                                {m.subtitle && <div className="text-xs opacity-60">{m.subtitle}</div>}
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${m.is_active ? 'text-green-400' : 'text-red-400'}`} style={{ background: m.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                                {m.is_active ? 'Aktif' : 'Off'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="font-bold px-2 py-1 rounded" style={{ background: 'var(--panel-bg)' }}>{m.mission_type}</span>
                              <span className="font-bold">Target: {m.target_count}</span>
                              <span className="font-bold px-2 py-0.5 rounded" style={{ background: 'var(--primary)', color: 'var(--bg-base)' }}>{m.ticket_reward} 🎟️</span>
                              <span className="opacity-60">{m.period}</span>
                            </div>
                            {m.target_anime_title && <div className="text-xs opacity-60">🎯 {m.target_anime_title}</div>}
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => onEditEventMission(m)} className="text-xs font-bold text-blue-400">✏️ Edit</button>
                              <button onClick={() => onDeleteEventMission(m.id)} className="text-xs font-bold text-red-400">🗑️ Hapus</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          )}

          {/* ===== Bingo Spin Management ===== */}
          {activeTab === 'bingo' && (
          <div className="space-y-6">
            {/* Bingo Sub-Tabs */}
            <div className="flex items-center gap-1 p-1 border-2 border-[var(--border)] rounded-lg flex-wrap" style={{ background: 'var(--panel-bg)' }}>
              {[
                { val: 'rewards', label: 'Hadiah Bingo' },
                { val: 'config', label: 'Konfigurasi' },
                { val: 'progress', label: 'Progress User' },
                { val: 'history', label: 'Riwayat' },
              ].map((tab) => (
                <button
                  key={tab.val}
                  type="button"
                  onClick={() => setBingoSubTab(tab.val)}
                  className={`px-3 py-1.5 rounded-md text-xs font-extrabold transition-all ${bingoSubTab === tab.val ? 'btn btn--primary' : 'opacity-60 hover:opacity-100'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Bingo Rewards CRUD */}
            {bingoSubTab === 'rewards' && (
              <div className="space-y-4">
                <div className="text-lg font-extrabold">Hadiah Bingo Spin - {selectedEvent || '-'}</div>
                <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
                  {/* Form */}
                  <form onSubmit={onSubmitBingoReward} className="card p-4 space-y-3">
                    <div className="text-sm font-extrabold border-b-2 border-[var(--border)] pb-2">
                      {editingBingoReward ? '✎ Edit Hadiah Bingo' : '+ Tambah Hadiah Bingo'}
                    </div>
                    <F label="Garis Bingo (line_index)">
                      <select value={bingoRewardForm.line_index} onChange={(e) => setBingoRewardForm((f) => ({ ...f, line_index: e.target.value }))} className="sel">
                        <option value="-1">Semua Garis (-1)</option>
                        <option value="0">Garis 0 (Atas Horizontal)</option>
                        <option value="1">Garis 1 (Tengah Horizontal)</option>
                        <option value="2">Garis 2 (Bawah Horizontal)</option>
                        <option value="3">Garis 3 (Kiri Vertikal)</option>
                        <option value="4">Garis 4 (Tengah Vertikal)</option>
                        <option value="5">Garis 5 (Kanan Vertikal)</option>
                        <option value="6">Garis 6 (Diagonal Kiri-Kanan)</option>
                        <option value="7">Garis 7 (Diagonal Kanan-Kiri)</option>
                      </select>
                    </F>
                    {/* Bingo Board Preview */}
                    <BingoBoardPreview lineIndex={Number(bingoRewardForm.line_index)} />
                    <F label="Tipe Hadiah">
                      <select value={bingoRewardForm.reward_type} onChange={(e) => setBingoRewardForm((f) => ({ ...f, reward_type: e.target.value }))} className="sel">
                        <option value="COIN">COIN</option>
                        <option value="TOKEN">TOKEN</option>
                        <option value="BORDER">BORDER</option>
                        <option value="SUPER_BADGE">SUPER_BADGE</option>
                        <option value="BADGE">BADGE</option>
                        <option value="STICKER">STICKER</option>
                        <option value="XP">XP</option>
                        <option value="AVATAR">AVATAR</option>
                      </select>
                    </F>
                    <F label="Label">
                      <input value={bingoRewardForm.label} onChange={(e) => setBingoRewardForm((f) => ({ ...f, label: e.target.value }))} className="inp" placeholder="Label hadiah" required />
                    </F>
                    {(bingoRewardForm.reward_type === 'BORDER' || bingoRewardForm.reward_type === 'AVATAR') && (
                      <F label="Kode Border">
                        <select value={bingoRewardForm.reward_code} onChange={(e) => {
                          const code = e.target.value;
                          const found = borders.find((b) => b.code === code);
                          setBingoRewardForm((f) => ({
                            ...f,
                            reward_code: code,
                            label: found ? (found.title || found.name || found.code || '') : f.label,
                            image_url: found ? (found.image_url || '') : f.image_url,
                            tier: found ? (found.tier || '') : f.tier,
                          }));
                        }} className="sel">
                          <option value="">-- Pilih Border --</option>
                          {borders.map((b) => <option key={b.id} value={b.code}>{b.code} - {b.title || b.name || ''}</option>)}
                        </select>
                      </F>
                    )}
                    {bingoRewardForm.reward_type === 'SUPER_BADGE' && (
                      <F label="Kode Super Badge">
                        <select value={bingoRewardForm.reward_code} onChange={(e) => {
                          const code = e.target.value;
                          const found = badges.find((b) => b.code === code);
                          setBingoRewardForm((f) => ({
                            ...f,
                            reward_code: code,
                            label: found ? (found.name || found.code || '') : f.label,
                            image_url: found ? (found.badge_url || found.image_url || '') : f.image_url,
                          }));
                        }} className="sel">
                          <option value="">-- Pilih Badge --</option>
                          {badges.map((b) => <option key={b.id} value={b.code}>{b.code} - {b.name || ''}</option>)}
                        </select>
                      </F>
                    )}
                    {bingoRewardForm.reward_type === 'BADGE' && (
                      <F label="Kode Badge">
                        <select value={bingoRewardForm.reward_code} onChange={(e) => {
                          const code = e.target.value;
                          const found = badges.find((b) => b.code === code);
                          setBingoRewardForm((f) => ({
                            ...f,
                            reward_code: code,
                            label: found ? (found.name || found.code || '') : f.label,
                            image_url: found ? (found.badge_url || found.image_url || '') : f.image_url,
                          }));
                        }} className="sel">
                          <option value="">-- Pilih Badge --</option>
                          {badges.map((b) => <option key={b.id} value={b.code}>{b.code} - {b.name || ''}</option>)}
                        </select>
                      </F>
                    )}
                    {bingoRewardForm.reward_type === 'STICKER' && (
                      <F label="Kode Stiker">
                        <select value={bingoRewardForm.reward_code} onChange={(e) => {
                          const code = e.target.value;
                          const found = stickers.find((s) => s.code === code);
                          setBingoRewardForm((f) => ({
                            ...f,
                            reward_code: code,
                            label: found ? (found.name || found.code || '') : f.label,
                            image_url: found ? (found.image_url || '') : f.image_url,
                          }));
                        }} className="sel">
                          <option value="">-- Pilih Stiker --</option>
                          {stickers.map((s) => <option key={s.id} value={s.code}>{s.code} - {s.name || ''}</option>)}
                        </select>
                      </F>
                    )}
                    {(bingoRewardForm.reward_type === 'COIN' || bingoRewardForm.reward_type === 'TOKEN' || bingoRewardForm.reward_type === 'XP') && (
                      <F label="Amount">
                        <input type="number" min="0" value={bingoRewardForm.reward_amount} onChange={(e) => setBingoRewardForm((f) => ({ ...f, reward_amount: e.target.value }))} className="inp" placeholder="Jumlah coin/token/xp" />
                      </F>
                    )}
                    {(bingoRewardForm.reward_type === 'BORDER' || bingoRewardForm.reward_type === 'AVATAR') && (
                      <F label="Tier">
                        <select value={bingoRewardForm.tier} onChange={(e) => setBingoRewardForm((f) => ({ ...f, tier: e.target.value }))} className="sel">
                          <option value="">-- Pilih Tier --</option>
                          <option value="C">C</option>
                          <option value="B">B</option>
                          <option value="A">A</option>
                          <option value="S">S</option>
                          <option value="S_PLUS">S+</option>
                          <option value="SS_PLUS">SS+</option>
                          <option value="SSS_PLUS">SSS+</option>
                        </select>
                      </F>
                    )}
                    <F label="Image URL">
                      <input value={bingoRewardForm.image_url} onChange={(e) => setBingoRewardForm((f) => ({ ...f, image_url: e.target.value }))} className="inp" placeholder="https://..." />
                    </F>
                    <F label="Sort Order">
                      <input type="number" value={bingoRewardForm.sort_order} onChange={(e) => setBingoRewardForm((f) => ({ ...f, sort_order: e.target.value }))} className="inp" />
                    </F>
                    <F label="Aktif?">
                      <label className="inline-flex items-center gap-2 text-xs font-extrabold">
                        <input type="checkbox" checked={bingoRewardForm.is_active} onChange={(e) => setBingoRewardForm((f) => ({ ...f, is_active: e.target.checked }))} />
                        Aktif
                      </label>
                    </F>
                    <div className="flex items-center gap-2">
                      <button type="submit" disabled={savingBingoReward} className="btn-add flex items-center gap-2 text-xs">
                        {savingBingoReward ? 'Menyimpan...' : (<><Save className="size-3" /> {editingBingoReward ? 'Update' : 'Tambah'}</>)}
                      </button>
                      {editingBingoReward && (
                        <button type="button" onClick={() => { setEditingBingoReward(null); setBingoRewardForm({ event_code: '', line_index: '-1', reward_type: 'COIN', label: '', reward_code: '', reward_amount: '', tier: '', image_url: '', is_active: true, sort_order: '0' }); }} className="btn-act text-xs">Batal</button>
                      )}
                    </div>
                  </form>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <Th>ID</Th>
                          <Th>Garis</Th>
                          <Th>Tipe</Th>
                          <Th>Label</Th>
                          <Th>Code</Th>
                          <Th>Amount</Th>
                          <Th>Tier</Th>
                          <Th>Aktif</Th>
                          <Th>Aksi</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingBingoRewards ? (
                          <tr><td colSpan={9} className="td-empty">Memuat...</td></tr>
                        ) : bingoRewards.length === 0 ? (
                          <tr><td colSpan={9} className="td-empty">Belum ada hadiah bingo. Tambahkan di form kiri.</td></tr>
                        ) : bingoRewards.map((r) => (
                          <tr key={r.id}>
                            <Td>{r.id}</Td>
                            <Td>{r.line_index === -1 ? 'Semua' : `Garis ${r.line_index}`}</Td>
                            <Td>{r.reward_type}</Td>
                            <Td>{r.label}</Td>
                            <Td>{r.reward_code || '-'}</Td>
                            <Td>{r.reward_amount || '-'}</Td>
                            <Td>{r.tier || '-'}</Td>
                            <Td>{r.is_active ? 'Ya' : 'Tidak'}</Td>
                            <Td>
                              <button type="button" onClick={() => onEditBingoReward(r)} className="btn-act text-xs mr-1">Edit</button>
                              <button type="button" onClick={() => onDeleteBingoReward(r.id)} className="btn-act text-xs">Hapus</button>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Bingo Config */}
            {bingoSubTab === 'config' && (
              <form onSubmit={onSubmitBingoConfig} className="card p-4 space-y-3">
                <div className="text-lg font-extrabold">Konfigurasi Bingo - {selectedEvent || '-'}</div>
                <F label="Bingo Enabled">
                  <label className="inline-flex items-center gap-2 text-xs font-extrabold">
                    <input type="checkbox" checked={bingoConfigForm.bingo_enabled} onChange={(e) => setBingoConfigForm((f) => ({ ...f, bingo_enabled: e.target.checked }))} />
                    Aktifkan Bingo
                  </label>
                </F>
                <F label="Board Size (NxN, min 2, max 6)">
                  <input type="number" min="2" max="6" value={bingoConfigForm.bingo_board_size} onChange={(e) => setBingoConfigForm((f) => ({ ...f, bingo_board_size: e.target.value }))} className="inp" />
                </F>
                <F label="Coin Fallback (jika item sudah dimiliki)">
                  <input type="number" min="0" value={bingoConfigForm.bingo_coin_fallback} onChange={(e) => setBingoConfigForm((f) => ({ ...f, bingo_coin_fallback: e.target.value }))} className="inp" />
                </F>
                <F label="Reset Board on Completion">
                  <label className="inline-flex items-center gap-2 text-xs font-extrabold">
                    <input type="checkbox" checked={bingoConfigForm.bingo_reset_on_completion} onChange={(e) => setBingoConfigForm((f) => ({ ...f, bingo_reset_on_completion: e.target.checked }))} />
                    Auto-reset board saat bingo selesai
                  </label>
                </F>
                <button type="submit" disabled={savingBingoConfig} className="btn-add flex items-center gap-2 text-xs">
                  {savingBingoConfig ? 'Menyimpan...' : (<><Save className="size-3" /> Simpan Konfigurasi Bingo</>)}
                </button>
              </form>
            )}

            {/* Bingo User Progress */}
            {bingoSubTab === 'progress' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-extrabold">Progress Bingo User - {selectedEvent || '-'}</div>
                  <form onSubmit={(e) => { e.preventDefault(); loadBingoProgress(selectedEvent, 1); }} className="flex items-center gap-2">
                    <input type="number" value={bingoProgressQ} onChange={(e) => setBingoProgressQ(e.target.value)} placeholder="User ID" className="inp text-xs" />
                    <button type="submit" className="btn-act text-xs">Cari</button>
                  </form>
                </div>
                <div className="overflow-x-auto">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <Th>User ID</Th>
                        <Th>Username</Th>
                        <Th>Tiles</Th>
                        <Th>Completed Lines</Th>
                        <Th>Tickets</Th>
                        <Th>Updated</Th>
                        <Th>Aksi</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingBingoProgress ? (
                        <tr><td colSpan={7} className="td-empty">Memuat...</td></tr>
                      ) : bingoProgress.length === 0 ? (
                        <tr><td colSpan={7} className="td-empty">Tidak ada data progress.</td></tr>
                      ) : bingoProgress.map((p) => (
                        <tr key={p.id}>
                          <Td>{p.user_id}</Td>
                          <Td>{p.username || p.display_name || '-'}</Td>
                          <Td>{Array.isArray(p.bingo_tiles) ? `[${p.bingo_tiles.join(',')}]` : '[]'} ({Array.isArray(p.bingo_tiles) ? p.bingo_tiles.length : 0}/9)</Td>
                          <Td>{Array.isArray(p.bingo_completed_lines) ? p.bingo_completed_lines.length : 0}</Td>
                          <Td>{p.tickets ?? 0}</Td>
                          <Td>{p.updatedAt ? new Date(p.updatedAt).toLocaleString('id-ID') : '-'}</Td>
                          <Td>
                            <button type="button" onClick={() => onResetBingoProgress(p.user_id)} className="btn-act text-xs">Reset</button>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bingoProgressTotalPages > 1 && (
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <button type="button" disabled={bingoProgressPage <= 1} onClick={() => loadBingoProgress(selectedEvent, bingoProgressPage - 1)} className="btn-act">Prev</button>
                    <span>Hal {bingoProgressPage} / {bingoProgressTotalPages} (Total: {bingoProgressTotal})</span>
                    <button type="button" disabled={bingoProgressPage >= bingoProgressTotalPages} onClick={() => loadBingoProgress(selectedEvent, bingoProgressPage + 1)} className="btn-act">Next</button>
                  </div>
                )}
              </div>
            )}

            {/* Bingo History Log */}
            {bingoSubTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-extrabold">Riwayat Hadiah Bingo - {selectedEvent || '-'}</div>
                  <form onSubmit={(e) => { e.preventDefault(); loadBingoLogs(selectedEvent, 1); }} className="flex items-center gap-2">
                    <input type="number" value={bingoLogsUserId} onChange={(e) => setBingoLogsUserId(e.target.value)} placeholder="Filter User ID" className="inp text-xs" />
                    <button type="submit" className="btn-act text-xs">Filter</button>
                  </form>
                </div>
                <div className="overflow-x-auto">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <Th>ID</Th>
                        <Th>User</Th>
                        <Th>Garis</Th>
                        <Th>Tipe</Th>
                        <Th>Label</Th>
                        <Th>Code</Th>
                        <Th>Amount</Th>
                        <Th>Waktu</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingBingoLogs ? (
                        <tr><td colSpan={8} className="td-empty">Memuat...</td></tr>
                      ) : bingoLogs.length === 0 ? (
                        <tr><td colSpan={8} className="td-empty">Belum ada riwayat hadiah bingo.</td></tr>
                      ) : bingoLogs.map((l) => (
                        <tr key={l.id}>
                          <Td>{l.id}</Td>
                          <Td>{l.user_id} {l.user?.username ? `(${l.user.username})` : ''}</Td>
                          <Td>{Array.isArray(l.bingo_line) ? `[${l.bingo_line.join(',')}]` : '-'}</Td>
                          <Td>{l.reward_type}</Td>
                          <Td>{l.reward_label}</Td>
                          <Td>{l.reward_code || '-'}</Td>
                          <Td>{l.reward_amount || '-'}</Td>
                          <Td>{l.createdAt ? new Date(l.createdAt).toLocaleString('id-ID') : '-'}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bingoLogsTotalPages > 1 && (
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <button type="button" disabled={bingoLogsPage <= 1} onClick={() => loadBingoLogs(selectedEvent, bingoLogsPage - 1)} className="btn-act">Prev</button>
                    <span>Hal {bingoLogsPage} / {bingoLogsTotalPages} (Total: {bingoLogsTotal})</span>
                    <button type="button" disabled={bingoLogsPage >= bingoLogsTotalPages} onClick={() => loadBingoLogs(selectedEvent, bingoLogsPage + 1)} className="btn-act">Next</button>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Custom Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmModal(null)} />
          <div className="relative z-10 w-full max-w-md border-2 rounded-xl p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="grid place-items-center size-10 border-2 rounded-md shrink-0" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <AlertTriangle className="size-5" style={{ color: confirmModal.confirmColor }} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold">{confirmModal.title}</h3>
                <p className="text-sm opacity-80 mt-1">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 border-2 rounded-lg font-extrabold text-sm" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
              <button onClick={() => confirmModal.onConfirm?.()} className="px-4 py-2 border-2 rounded-lg font-extrabold text-sm" style={{ boxShadow: 'var(--shadow-md)', background: confirmModal.confirmColor, color: '#111827', borderColor: 'var(--panel-border)' }}>{confirmModal.confirmLabel || 'Ya'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Bingo board 3x3 preview — highlights tiles for selected line
const BINGO_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],       // horizontal: 0,1,2
  [0, 3, 6], [1, 4, 7], [2, 5, 8],       // vertical: 3,4,5
  [0, 4, 8], [2, 4, 6],                   // diagonal: 6,7
];

function BingoBoardPreview({ lineIndex }) {
  const highlightedTiles = lineIndex >= 0 && lineIndex < BINGO_LINES.length ? new Set(BINGO_LINES[lineIndex]) : new Set();
  const allTiles = lineIndex === -1 ? new Set([0,1,2,3,4,5,6,7,8]) : highlightedTiles;
  const labels = ['0','1','2','3','4','5','6','7','8'];
  const lineLabel = lineIndex === -1 ? 'Semua Garis' : ['Atas Horizontal','Tengah Horizontal','Bawah Horizontal','Kiri Vertikal','Tengah Vertikal','Kanan Vertikal','Diagonal Kiri-Kanan','Diagonal Kanan-Kiri'][lineIndex] || '';

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-3 gap-1" style={{ width: '120px' }}>
        {labels.map((n, i) => {
          const isOn = allTiles.has(i);
          return (
            <div
              key={i}
              className="flex items-center justify-center text-xs font-extrabold border-2 border-[var(--foreground)]"
              style={{
                width: '38px',
                height: '38px',
                background: isOn ? '#FFD803' : 'var(--background)',
                color: isOn ? '#000' : 'var(--foreground)',
                opacity: isOn ? 1 : 0.3,
              }}
            >
              {n}
            </div>
          );
        })}
      </div>
      {lineIndex >= 0 && (
        <div className="text-[11px] font-semibold opacity-70 mt-1">
          Garis {lineIndex}: {lineLabel}
        </div>
      )}
      {lineIndex === -1 && (
        <div className="text-[11px] font-semibold opacity-70 mt-1">
          Berlaku untuk semua garis
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
.inp { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0; font-weight: 600; }
.sel { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0; font-weight: 800; }
.lbl { font-size: 0.875rem; font-weight: 800; }
.btn-add { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; border-width:4px; border-radius:0; font-weight:800; box-shadow:4px 4px 0 #000; background: var(--accent-add); color: var(--accent-add-foreground); border-color: var(--foreground); }
.btn-act { padding:0.25rem 0.5rem; border-width:4px; border-radius:0; font-weight:800; box-shadow:3px 3px 0 #000; background: var(--background); color: var(--foreground); border-color: var(--foreground); }
.tbl { min-width: 100%; border-width:4px; border-radius:0; overflow:hidden; box-shadow:6px 6px 0 #000; border-color: var(--foreground); color: var(--foreground); }
.tbl thead { background: var(--surface); }
.th { text-align:left; padding:0.5rem 0.75rem; border-bottom-width:4px; border-color: var(--foreground); }
.td { padding:0.5rem 0.75rem; border-bottom-width:4px; border-color: var(--foreground); font-weight:600; }
.td-empty { padding:1.5rem; text-align:center; font-size:0.875rem; opacity:0.7; }
`;

if (typeof document !== 'undefined' && !document.getElementById('gacha-admin-styles')) {
  const style = document.createElement('style');
  style.id = 'gacha-admin-styles';
  style.innerHTML = styles;
  document.head.appendChild(style);
}
