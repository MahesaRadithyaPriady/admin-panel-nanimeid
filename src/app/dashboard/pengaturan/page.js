'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Settings, AlertTriangle, Download, BadgeDollarSign, BellRing, Coins, RefreshCcw, Save, Sparkles, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { deleteInAppAnnouncement, getInAppAnnouncement, getAdminSettings, updateInAppAnnouncementMessage, updateAdminSettings, updateWatchLiteCoinPerMinute } from '@/lib/api';

function mapSettingsFromApi(s) {
  return {
    maintenanceMode: !!s?.maintenance_enabled,
    maintenanceMessage: s?.maintenance_message ?? '',
    disableDownload: s?.downloads_enabled === false,
    paidQualityEnabled: Array.isArray(s?.paid_qualities) && s.paid_qualities.length > 0,
    paidQuality: Array.isArray(s?.paid_qualities)
      ? s.paid_qualities.filter(Boolean).join(', ')
      : '',
    watchLiteCoinPerMinute: Number.isFinite(Number(s?.watch_lite_coin_per_minute)) ? String(Number(s.watch_lite_coin_per_minute)) : '0',
    // Feature toggles
    featureNobarEnabled: !!s?.feature_nobar_enabled,
    featureNobarMessage: s?.feature_nobar_message ?? '',
    featureReadModeEnabled: !!s?.feature_read_mode_enabled,
    featureReadModeMessage: s?.feature_read_mode_message ?? '',
    featureDownloadEpisodeEnabled: !!s?.feature_download_episode_enabled,
    featureDownloadEpisodeMessage: s?.feature_download_episode_message ?? '',
    featureDownloadBatchEnabled: !!s?.feature_download_batch_enabled,
    featureDownloadBatchMessage: s?.feature_download_batch_message ?? '',
    // Force update
    forceUpdateEnabled: !!s?.force_update_enabled,
    forceUpdateVersion: s?.force_update_version ?? '',
  };
}

export default function PengaturanPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingWatchLite, setSavingWatchLite] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [clearingAnnouncement, setClearingAnnouncement] = useState(false);
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    maintenanceMessage: '',
    disableDownload: false,
    paidQualityEnabled: false,
    paidQuality: '', // comma-separated input representing an array
    watchLiteCoinPerMinute: '0',
    // Feature toggles
    featureNobarEnabled: false,
    featureNobarMessage: '',
    featureReadModeEnabled: false,
    featureReadModeMessage: '',
    featureDownloadEpisodeEnabled: false,
    featureDownloadEpisodeMessage: '',
    featureDownloadBatchEnabled: false,
    featureDownloadBatchMessage: '',
    // Force update
    forceUpdateEnabled: false,
    forceUpdateVersion: '',
  });
  const [announcement, setAnnouncement] = useState({
    message: '',
    updatedAt: null,
    exists: false,
  });

  // Load settings from API (before early returns to keep hook order stable)
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingSettings(true);
        const token = getSession()?.token;
        const [s, a] = await Promise.all([
          getAdminSettings({ token }),
          getInAppAnnouncement({ token }),
        ]);
        if (s) setSettings(mapSettingsFromApi(s));
        setAnnouncement({
          message: a?.message ?? '',
          updatedAt: a?.updatedAt ?? null,
          exists: !!a,
        });
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat pengaturan');
      } finally {
        setLoadingSettings(false);
      }
    };
    load();
  }, []);

  const toggle = (key) => {
    setSettings((s) => {
      const next = { ...s, [key]: !s[key] };
      return next;
    });
  };

  const settingsSummary = useMemo(() => {
    const lockedQualities = (settings.paidQuality || '')
      .split(',')
      .map((q) => q.trim())
      .filter(Boolean);
    return {
      activeFlags: [settings.maintenanceMode, settings.disableDownload, settings.paidQualityEnabled].filter(Boolean).length,
      lockedQualityCount: lockedQualities.length,
      watchLiteCoinPerMinute: Math.max(0, Number.parseInt(settings.watchLiteCoinPerMinute || '0', 10) || 0),
      announcementLength: announcement.message.trim().length,
    };
  }, [announcement.message, settings]);

  if (loading || !user) return null;

  const saveGeneralSettings = async () => {
    try {
      setSavingGeneral(true);
      const token = getSession()?.token;
      const qualities = (settings.paidQuality || '')
        .split(',')
        .map((q) => q.trim())
        .filter((q) => q.length > 0);
      // dedupe while keeping order
      const seen = new Set();
      const qualitiesUnique = qualities.filter((q) => (seen.has(q) ? false : (seen.add(q), true)));
      const payload = {
        maintenance_enabled: !!settings.maintenanceMode,
        maintenance_message: settings.maintenanceMessage?.trim() || null,
        downloads_enabled: !settings.disableDownload,
        paid_qualities: settings.paidQualityEnabled ? qualitiesUnique : [],
        // Feature toggles
        feature_nobar_enabled: !!settings.featureNobarEnabled,
        feature_nobar_message: settings.featureNobarMessage?.trim() || null,
        feature_read_mode_enabled: !!settings.featureReadModeEnabled,
        feature_read_mode_message: settings.featureReadModeMessage?.trim() || null,
        feature_download_episode_enabled: !!settings.featureDownloadEpisodeEnabled,
        feature_download_episode_message: settings.featureDownloadEpisodeMessage?.trim() || null,
        feature_download_batch_enabled: !!settings.featureDownloadBatchEnabled,
        feature_download_batch_message: settings.featureDownloadBatchMessage?.trim() || null,
        // Force update
        force_update_enabled: !!settings.forceUpdateEnabled,
        force_update_version: settings.forceUpdateVersion?.trim() || null,
      };
      const updated = await updateAdminSettings({ token, payload });
      if (updated) setSettings((prev) => ({ ...mapSettingsFromApi(updated), watchLiteCoinPerMinute: prev.watchLiteCoinPerMinute }));
      toast.success('Pengaturan utama disimpan');
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan pengaturan utama');
    } finally {
      setSavingGeneral(false);
    }
  };

  const saveWatchLite = async () => {
    try {
      const token = getSession()?.token;
      const value = Number.parseInt(settings.watchLiteCoinPerMinute || '0', 10);
      if (!Number.isInteger(value) || value < 0) return toast.error('Coin per minute harus integer >= 0');
      setSavingWatchLite(true);
      const updated = await updateWatchLiteCoinPerMinute({ token, value });
      if (updated) setSettings((prev) => ({ ...prev, ...mapSettingsFromApi(updated) }));
      toast.success('Reward watch-lite diperbarui');
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan watch-lite coin per minute');
    } finally {
      setSavingWatchLite(false);
    }
  };

  const saveAnnouncement = async () => {
    try {
      const token = getSession()?.token;
      const message = announcement.message.trim();
      if (!message) return toast.error('Pesan announcement tidak boleh kosong');
      setSavingAnnouncement(true);
      const updated = await updateInAppAnnouncementMessage({ token, message });
      setAnnouncement({
        message: updated?.message ?? message,
        updatedAt: updated?.updatedAt ?? null,
        exists: true,
      });
      toast.success('In-app announcement diperbarui');
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan in-app announcement');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const clearAnnouncement = async () => {
    try {
      const token = getSession()?.token;
      setClearingAnnouncement(true);
      await deleteInAppAnnouncement({ token });
      setAnnouncement({ message: '', updatedAt: null, exists: false });
      toast.success('In-app announcement dihapus');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus in-app announcement');
    } finally {
      setClearingAnnouncement(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="grid gap-2">
          <div className="inline-flex w-fit items-center gap-2 px-3 py-2 border-4 rounded-full font-extrabold text-sm" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <Settings className="size-4" /> Control Center Pengaturan
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">Atur maintenance, download, reward watch-lite, dan announcement dari satu dashboard yang lebih nyaman.</h2>
            <p className="text-sm sm:text-base opacity-80 mt-2 max-w-3xl">Halaman settings aku rapikan supaya setiap blok punya fokus yang jelas: konfigurasi aplikasi, monetisasi ringan, dan komunikasi ke user langsung dari panel admin.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
          <button type="button" onClick={() => window.location.reload()} disabled={loadingSettings} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <RefreshCcw className="size-4 inline-block mr-1" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
          <div className="text-xs font-black uppercase tracking-wide opacity-80">Flag aktif</div>
          <div className="mt-2 text-3xl font-black">{settingsSummary.activeFlags}</div>
          <div className="text-sm font-semibold opacity-80 mt-1">Maintenance, disable download, dan paid quality yang sedang hidup.</div>
        </div>
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #BFDBFE 0%, #93C5FD 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
          <div className="text-xs font-black uppercase tracking-wide opacity-80">Coin per minute</div>
          <div className="mt-2 text-3xl font-black">{settingsSummary.watchLiteCoinPerMinute}</div>
          <div className="text-sm font-semibold opacity-80 mt-1">Reward watch-lite per menit tontonan aktif.</div>
        </div>
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #C7F9CC 0%, #86EFAC 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
          <div className="text-xs font-black uppercase tracking-wide opacity-80">Quality premium</div>
          <div className="mt-2 text-3xl font-black">{settingsSummary.lockedQualityCount}</div>
          <div className="text-sm font-semibold opacity-80 mt-1">Jumlah kualitas yang sedang dikunci untuk user premium.</div>
        </div>
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #FBCFE8 0%, #F9A8D4 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
          <div className="text-xs font-black uppercase tracking-wide opacity-80">Announcement</div>
          <div className="mt-2 text-3xl font-black">{settingsSummary.announcementLength}</div>
          <div className="text-sm font-semibold opacity-80 mt-1">Jumlah karakter pesan yang siap tampil ke aplikasi.</div>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] items-start">
        <div className="grid gap-6">
          <section className="p-5 sm:p-6 border-4 rounded-[24px] space-y-5" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-extrabold"><Sparkles className="size-4" /> Konfigurasi Aplikasi</div>
                <div className="text-sm opacity-75 mt-1">Kelola perilaku global aplikasi seperti maintenance, download, dan quality gating.</div>
              </div>
              <button type="button" onClick={saveGeneralSettings} disabled={savingGeneral || loadingSettings} className="px-4 py-3 border-4 rounded-xl font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>
                <Save className="size-4 inline-block mr-1" /> {savingGeneral ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="border-4 rounded-2xl p-4 space-y-4" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold"><AlertTriangle className="size-4" /> Mode Pemeliharaan</div>
                    <div className="text-xs opacity-70 mt-1">Tampilkan mode maintenance untuk semua user ketika sedang ada gangguan atau deployment besar.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle('maintenanceMode')}
                    className="px-3 py-2 border-4 rounded-xl font-extrabold"
                    style={{ boxShadow: '4px 4px 0 #000', background: settings.maintenanceMode ? 'var(--accent-add)' : 'var(--panel-bg)', color: settings.maintenanceMode ? 'var(--accent-add-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                    disabled={loadingSettings}
                  >
                    {settings.maintenanceMode ? 'AKTIF' : 'NONAKTIF'}
                  </button>
                </div>
                <div>
                  <label className="text-xs font-bold">Pesan Pemeliharaan</label>
                  <textarea
                    value={settings.maintenanceMessage}
                    onChange={(e) => setSettings((s) => ({ ...s, maintenanceMessage: e.target.value }))}
                    placeholder="Contoh: Server sedang maintenance pukul 00:00 - 01:00 WIB"
                    className="w-full h-28 mt-1 px-3 py-3 border-4 rounded-xl font-semibold"
                    style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                    disabled={loadingSettings}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="border-4 rounded-2xl p-4 space-y-3" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-extrabold"><Download className="size-4" /> Pengunduhan</div>
                      <div className="text-xs opacity-70 mt-1">Sembunyikan atau nonaktifkan tombol download untuk seluruh aplikasi.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle('disableDownload')}
                      className="px-3 py-2 border-4 rounded-xl font-extrabold"
                      style={{ boxShadow: '4px 4px 0 #000', background: settings.disableDownload ? 'var(--accent-add)' : 'var(--panel-bg)', color: settings.disableDownload ? 'var(--accent-add-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                      disabled={loadingSettings}
                    >
                      {settings.disableDownload ? 'AKTIF' : 'NONAKTIF'}
                    </button>
                  </div>
                </div>

                <div className="border-4 rounded-2xl p-4 space-y-3" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-extrabold"><BadgeDollarSign className="size-4" /> Kualitas Berbayar</div>
                      <div className="text-xs opacity-70 mt-1">Batasi kualitas tertentu untuk user premium atau user yang punya akses khusus.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle('paidQualityEnabled')}
                      className="px-3 py-2 border-4 rounded-xl font-extrabold"
                      style={{ boxShadow: '4px 4px 0 #000', background: settings.paidQualityEnabled ? 'var(--accent-add)' : 'var(--panel-bg)', color: settings.paidQualityEnabled ? 'var(--accent-add-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                      disabled={loadingSettings}
                    >
                      {settings.paidQualityEnabled ? 'AKTIF' : 'NONAKTIF'}
                    </button>
                  </div>
                  <div>
                    <label className="text-xs font-bold">Kualitas yang dikunci</label>
                    <input
                      value={settings.paidQuality}
                      onChange={(e) => setSettings((s) => ({ ...s, paidQuality: e.target.value }))}
                      placeholder="cth: 720p, 1080p, 4K"
                      className="w-full mt-1 px-3 py-3 border-4 rounded-xl font-semibold"
                      style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                      disabled={loadingSettings || !settings.paidQualityEnabled}
                    />
                    <div className="text-xs opacity-70 mt-1">Pisahkan dengan koma. Contoh: 720p, 1080p, 4K.</div>
                  </div>
                </div>

                <div className="border-4 rounded-2xl p-4 space-y-3" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-extrabold"><RefreshCcw className="size-4" /> Force Update</div>
                      <div className="text-xs opacity-70 mt-1">Paksa user untuk update ke versi minimum aplikasi.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle('forceUpdateEnabled')}
                      className="px-3 py-2 border-4 rounded-xl font-extrabold"
                      style={{ 
                        boxShadow: '4px 4px 0 #000', 
                        background: settings.forceUpdateEnabled ? '#EF4444' : 'var(--panel-bg)', 
                        color: settings.forceUpdateEnabled ? 'white' : 'var(--foreground)', 
                        borderColor: 'var(--panel-border)' 
                      }}
                      disabled={loadingSettings}
                    >
                      {settings.forceUpdateEnabled ? 'AKTIF' : 'NONAKTIF'}
                    </button>
                  </div>
                  {settings.forceUpdateEnabled && (
                    <div>
                      <label className="text-xs font-bold">Versi Minimum</label>
                      <input
                        value={settings.forceUpdateVersion}
                        onChange={(e) => setSettings((s) => ({ ...s, forceUpdateVersion: e.target.value }))}
                        placeholder="Contoh: 2.5.0"
                        className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold text-sm"
                        style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                        disabled={loadingSettings}
                      />
                      <div className="text-xs opacity-70 mt-1">Format: x.y.z (contoh: 2.5.0). User dengan versi lebih rendah akan diminta update.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="p-5 sm:p-6 border-4 rounded-[24px] space-y-5" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-extrabold"><ToggleLeft className="size-4" /> Feature Toggles</div>
                <div className="text-sm opacity-75 mt-1">Aktifkan/nonaktifkan fitur aplikasi untuk semua user.</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Nonton Bareng */}
              <div className="border-4 rounded-2xl p-4 space-y-3" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold">
                      {settings.featureNobarEnabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      Nonton Bareng
                    </div>
                    <div className="text-xs opacity-70 mt-1">Fitur nonton bareng dengan teman-teman.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle('featureNobarEnabled')}
                    className="px-3 py-2 border-4 rounded-xl font-extrabold"
                    style={{ 
                      boxShadow: '4px 4px 0 #000', 
                      background: settings.featureNobarEnabled ? '#22C55E' : 'var(--panel-bg)', 
                      color: settings.featureNobarEnabled ? 'white' : 'var(--foreground)', 
                      borderColor: 'var(--panel-border)' 
                    }}
                    disabled={loadingSettings}
                  >
                    {settings.featureNobarEnabled ? 'AKTIF' : 'NONAKTIF'}
                  </button>
                </div>
                {!settings.featureNobarEnabled && (
                  <div>
                    <label className="text-xs font-bold">Pesan Nonaktif (opsional)</label>
                    <input
                      value={settings.featureNobarMessage}
                      onChange={(e) => setSettings((s) => ({ ...s, featureNobarMessage: e.target.value }))}
                      placeholder="Alasan kenapa fitur nobar dinonaktifkan"
                      className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold text-sm"
                      style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                      disabled={loadingSettings}
                    />
                  </div>
                )}
              </div>

              {/* Mode Baca */}
              <div className="border-4 rounded-2xl p-4 space-y-3" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold">
                      {settings.featureReadModeEnabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      Mode Baca
                    </div>
                    <div className="text-xs opacity-70 mt-1">Mode baca manga/novel yang nyaman.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle('featureReadModeEnabled')}
                    className="px-3 py-2 border-4 rounded-xl font-extrabold"
                    style={{ 
                      boxShadow: '4px 4px 0 #000', 
                      background: settings.featureReadModeEnabled ? '#22C55E' : 'var(--panel-bg)', 
                      color: settings.featureReadModeEnabled ? 'white' : 'var(--foreground)', 
                      borderColor: 'var(--panel-border)' 
                    }}
                    disabled={loadingSettings}
                  >
                    {settings.featureReadModeEnabled ? 'AKTIF' : 'NONAKTIF'}
                  </button>
                </div>
                {!settings.featureReadModeEnabled && (
                  <div>
                    <label className="text-xs font-bold">Pesan Nonaktif (opsional)</label>
                    <input
                      value={settings.featureReadModeMessage}
                      onChange={(e) => setSettings((s) => ({ ...s, featureReadModeMessage: e.target.value }))}
                      placeholder="Alasan kenapa mode baca dinonaktifkan"
                      className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold text-sm"
                      style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                      disabled={loadingSettings}
                    />
                  </div>
                )}
              </div>

              {/* Download Episode */}
              <div className="border-4 rounded-2xl p-4 space-y-3" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold">
                      {settings.featureDownloadEpisodeEnabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      Download Episode
                    </div>
                    <div className="text-xs opacity-70 mt-1">Download episode anime individual.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle('featureDownloadEpisodeEnabled')}
                    className="px-3 py-2 border-4 rounded-xl font-extrabold"
                    style={{ 
                      boxShadow: '4px 4px 0 #000', 
                      background: settings.featureDownloadEpisodeEnabled ? '#22C55E' : 'var(--panel-bg)', 
                      color: settings.featureDownloadEpisodeEnabled ? 'white' : 'var(--foreground)', 
                      borderColor: 'var(--panel-border)' 
                    }}
                    disabled={loadingSettings}
                  >
                    {settings.featureDownloadEpisodeEnabled ? 'AKTIF' : 'NONAKTIF'}
                  </button>
                </div>
                {!settings.featureDownloadEpisodeEnabled && (
                  <div>
                    <label className="text-xs font-bold">Pesan Nonaktif (opsional)</label>
                    <input
                      value={settings.featureDownloadEpisodeMessage}
                      onChange={(e) => setSettings((s) => ({ ...s, featureDownloadEpisodeMessage: e.target.value }))}
                      placeholder="Alasan kenapa download episode dinonaktifkan"
                      className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold text-sm"
                      style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                      disabled={loadingSettings}
                    />
                  </div>
                )}
              </div>

              {/* Download Batch */}
              <div className="border-4 rounded-2xl p-4 space-y-3" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold">
                      {settings.featureDownloadBatchEnabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      Download Batch
                    </div>
                    <div className="text-xs opacity-70 mt-1">Download multiple episodes sekaligus.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle('featureDownloadBatchEnabled')}
                    className="px-3 py-2 border-4 rounded-xl font-extrabold"
                    style={{ 
                      boxShadow: '4px 4px 0 #000', 
                      background: settings.featureDownloadBatchEnabled ? '#22C55E' : 'var(--panel-bg)', 
                      color: settings.featureDownloadBatchEnabled ? 'white' : 'var(--foreground)', 
                      borderColor: 'var(--panel-border)' 
                    }}
                    disabled={loadingSettings}
                  >
                    {settings.featureDownloadBatchEnabled ? 'AKTIF' : 'NONAKTIF'}
                  </button>
                </div>
                {!settings.featureDownloadBatchEnabled && (
                  <div>
                    <label className="text-xs font-bold">Pesan Nonaktif (opsional)</label>
                    <input
                      value={settings.featureDownloadBatchMessage}
                      onChange={(e) => setSettings((s) => ({ ...s, featureDownloadBatchMessage: e.target.value }))}
                      placeholder="Alasan kenapa download batch dinonaktifkan"
                      className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold text-sm"
                      style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                      disabled={loadingSettings}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="p-5 sm:p-6 border-4 rounded-[24px] space-y-5" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-extrabold"><BellRing className="size-4" /> In-App Announcement</div>
                <div className="text-sm opacity-75 mt-1">Tulis pesan pengumuman yang akan ditampilkan langsung di aplikasi client.</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={clearAnnouncement} disabled={savingAnnouncement || clearingAnnouncement || loadingSettings || !announcement.exists} className="px-4 py-3 border-4 rounded-xl font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                  {clearingAnnouncement ? 'Menghapus...' : 'Hapus Pesan'}
                </button>
                <button type="button" onClick={saveAnnouncement} disabled={savingAnnouncement || clearingAnnouncement || loadingSettings} className="px-4 py-3 border-4 rounded-xl font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>
                  <Save className="size-4 inline-block mr-1" /> {savingAnnouncement ? 'Menyimpan...' : 'Simpan Announcement'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] items-start">
              <div>
                <label className="text-xs font-bold">Isi Pesan Announcement</label>
                <textarea
                  value={announcement.message}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Tulis pengumuman penting yang ingin muncul di aplikasi..."
                  className="w-full h-40 mt-1 px-3 py-3 border-4 rounded-xl font-semibold"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  disabled={loadingSettings}
                />
                <div className="text-xs opacity-70 mt-2">Gunakan pesan yang singkat, jelas, dan mudah dibaca karena ini akan tampil langsung ke user.</div>
              </div>
              <div className="border-4 rounded-2xl p-4 space-y-3" style={{ background: 'linear-gradient(135deg, rgba(255,216,3,0.14) 0%, rgba(255,255,255,0.03) 100%)', borderColor: 'var(--panel-border)' }}>
                <div className="text-sm font-black">Preview Pengumuman</div>
                <div className="border-4 rounded-2xl p-4 min-h-[180px] text-sm leading-6 whitespace-pre-wrap" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                  {announcement.message.trim() || 'Belum ada pesan announcement yang disiapkan.'}
                </div>
                <div className="text-xs opacity-70">Terakhir diperbarui: {announcement.updatedAt ? new Date(announcement.updatedAt).toLocaleString('id-ID') : 'Belum pernah'}</div>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-6">
          <section className="p-5 sm:p-6 border-4 rounded-[24px] space-y-5" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 text-sm font-extrabold"><Coins className="size-4" /> Watch Lite Reward</div>
              <div className="text-sm opacity-75">Atur berapa lite coin yang didapat user untuk setiap menit watch-lite.</div>
            </div>
            <div className="border-4 rounded-2xl p-4 space-y-3" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
              <label className="text-xs font-bold">Lite Coin per Minute</label>
              <input
                type="number"
                min="0"
                step="1"
                value={settings.watchLiteCoinPerMinute}
                onChange={(e) => setSettings((s) => ({ ...s, watchLiteCoinPerMinute: e.target.value }))}
                className="w-full px-3 py-3 border-4 rounded-xl font-black text-2xl"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                disabled={loadingSettings}
              />
              <div className="text-xs opacity-70">Nilai harus berupa integer lebih besar atau sama dengan 0. Semakin besar nilainya, semakin cepat user mendapat reward watch-lite.</div>
              <button type="button" onClick={saveWatchLite} disabled={savingWatchLite || loadingSettings} className="w-full px-4 py-3 border-4 rounded-xl font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: '#FFD803', borderColor: 'var(--panel-border)', color: '#111827' }}>
                <Save className="size-4 inline-block mr-1" /> {savingWatchLite ? 'Menyimpan...' : 'Simpan Reward Watch-Lite'}
              </button>
            </div>
          </section>

          <section className="p-5 sm:p-6 border-4 rounded-[24px] space-y-4" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="text-sm font-extrabold">Ringkasan cepat</div>
            <div className="grid gap-3">
              <div className="border-4 rounded-2xl p-4" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <div className="text-xs font-black uppercase tracking-wide opacity-70">Status maintenance</div>
                <div className="mt-1 text-lg font-black">{settings.maintenanceMode ? 'Aktif' : 'Nonaktif'}</div>
              </div>
              <div className="border-4 rounded-2xl p-4" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <div className="text-xs font-black uppercase tracking-wide opacity-70">Download global</div>
                <div className="mt-1 text-lg font-black">{settings.disableDownload ? 'Dimatikan' : 'Tetap tersedia'}</div>
              </div>
              <div className="border-4 rounded-2xl p-4" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                <div className="text-xs font-black uppercase tracking-wide opacity-70">Announcement aktif</div>
                <div className="mt-1 text-lg font-black">{announcement.message.trim() ? 'Ada pesan aktif' : 'Belum ada pesan'}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
      {loadingSettings && (
        <div className="text-[11px] opacity-70">Memuat pengaturan...</div>
      )}
      <div className="text-xs opacity-70">Terhubung ke Admin Settings API dan endpoint in-app announcement. Setiap section bisa disimpan secara terpisah supaya workflow admin lebih nyaman.</div>
    </div>
  );
}
