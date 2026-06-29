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
          <div className="label flex items-center gap-2">
            <Settings className="w-4 h-4" /> Control Center Pengaturan
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">Atur maintenance, download, reward watch-lite, dan announcement dari satu dashboard yang lebih nyaman.</h2>
            <p className="text-sm sm:text-base opacity-80 mt-2 max-w-3xl">Halaman settings aku rapikan supaya setiap blok punya fokus yang jelas: konfigurasi aplikasi, monetisasi ringan, dan komunikasi ke user langsung dari panel admin.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
          <button type="button" onClick={() => window.location.reload()} disabled={loadingSettings} className="btn btn--secondary disabled:opacity-60">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="stat-card">
          <div className="label">Flag aktif</div>
          <div className="mt-2 text-3xl font-black">{settingsSummary.activeFlags}</div>
          <div className="text-sm text-[var(--muted)] mt-1">Maintenance, download, paid quality aktif.</div>
        </div>
        <div className="stat-card">
          <div className="label">Coin per minute</div>
          <div className="mt-2 text-3xl font-black">{settingsSummary.watchLiteCoinPerMinute}</div>
          <div className="text-sm text-[var(--muted)] mt-1">Reward watch-lite per menit.</div>
        </div>
        <div className="stat-card">
          <div className="label">Quality premium</div>
          <div className="mt-2 text-3xl font-black">{settingsSummary.lockedQualityCount}</div>
          <div className="text-sm text-[var(--muted)] mt-1">Kualitas dikunci untuk premium.</div>
        </div>
        <div className="stat-card">
          <div className="label">Announcement</div>
          <div className="mt-2 text-3xl font-black">{settingsSummary.announcementLength}</div>
          <div className="text-sm text-[var(--muted)] mt-1">Karakter pesan aktif ke user.</div>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] items-start">
        <div className="grid gap-6">
          <section className="card p-5 sm:p-6 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 section-title"><Sparkles className="w-4 h-4" /> Konfigurasi Aplikasi</div>
                <div className="text-sm text-[var(--muted)] mt-1">Kelola perilaku global aplikasi seperti maintenance, download, dan quality gating.</div>
              </div>
              <button type="button" onClick={saveGeneralSettings} disabled={savingGeneral || loadingSettings} className="btn btn--primary disabled:opacity-60">
                <Save className="w-4 h-4" /> {savingGeneral ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="card p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold"><AlertTriangle className="w-4 h-4" /> Mode Pemeliharaan</div>
                    <div className="text-xs opacity-70 mt-1">Tampilkan mode maintenance untuk semua user ketika sedang ada gangguan atau deployment besar.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle('maintenanceMode')}
                    className={`btn btn--sm ${settings.maintenanceMode ? 'btn--primary' : 'btn--secondary'}`}
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
                    className="input mt-1 h-28 resize-none"
                    disabled={loadingSettings}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-extrabold"><Download className="w-4 h-4" /> Pengunduhan</div>
                      <div className="text-xs opacity-70 mt-1">Sembunyikan atau nonaktifkan tombol download untuk seluruh aplikasi.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle('disableDownload')}
                      className={`btn btn--sm ${settings.disableDownload ? 'btn--primary' : 'btn--secondary'}`}
                      disabled={loadingSettings}
                    >
                      {settings.disableDownload ? 'AKTIF' : 'NONAKTIF'}
                    </button>
                  </div>
                </div>

                <div className="card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-extrabold"><BadgeDollarSign className="w-4 h-4" /> Kualitas Berbayar</div>
                      <div className="text-xs opacity-70 mt-1">Batasi kualitas tertentu untuk user premium atau user yang punya akses khusus.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle('paidQualityEnabled')}
                      className={`btn btn--sm ${settings.paidQualityEnabled ? 'btn--primary' : 'btn--secondary'}`}
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
                      className="input mt-1"
                      disabled={loadingSettings || !settings.paidQualityEnabled}
                    />
                    <div className="text-xs opacity-70 mt-1">Pisahkan dengan koma. Contoh: 720p, 1080p, 4K.</div>
                  </div>
                </div>

                <div className="card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-extrabold"><RefreshCcw className="w-4 h-4" /> Force Update</div>
                      <div className="text-xs opacity-70 mt-1">Paksa user untuk update ke versi minimum aplikasi.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle('forceUpdateEnabled')}
                      className={`btn btn--sm ${settings.forceUpdateEnabled ? 'btn--danger' : 'btn--secondary'}`}
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
                        className="input mt-1"
                        disabled={loadingSettings}
                      />
                      <div className="text-xs opacity-70 mt-1">Format: x.y.z (contoh: 2.5.0). User dengan versi lebih rendah akan diminta update.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="card p-5 sm:p-6 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 section-title"><ToggleLeft className="w-4 h-4" /> Feature Toggles</div>
                <div className="text-sm opacity-75 mt-1">Aktifkan/nonaktifkan fitur aplikasi untuk semua user.</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Nonton Bareng */}
              <div className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold">
                      {settings.featureNobarEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      Nonton Bareng
                    </div>
                    <div className="text-xs opacity-70 mt-1">Fitur nonton bareng dengan teman-teman.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle('featureNobarEnabled')}
                    className={`btn btn--sm ${settings.featureNobarEnabled ? 'btn--primary' : 'btn--secondary'}`}
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
                      className="input mt-1"
                      disabled={loadingSettings}
                    />
                  </div>
                )}
              </div>

              {/* Mode Baca */}
              <div className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold">
                      {settings.featureReadModeEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      Mode Baca
                    </div>
                    <div className="text-xs opacity-70 mt-1">Mode baca manga/novel yang nyaman.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle('featureReadModeEnabled')}
                    className={`btn btn--sm ${settings.featureReadModeEnabled ? 'btn--primary' : 'btn--secondary'}`}
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
                      className="input mt-1"
                      disabled={loadingSettings}
                    />
                  </div>
                )}
              </div>

              {/* Download Episode */}
              <div className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold">
                      {settings.featureDownloadEpisodeEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      Download Episode
                    </div>
                    <div className="text-xs opacity-70 mt-1">Download episode anime individual.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle('featureDownloadEpisodeEnabled')}
                    className={`btn btn--sm ${settings.featureDownloadEpisodeEnabled ? 'btn--primary' : 'btn--secondary'}`}
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
                      className="input mt-1"
                      disabled={loadingSettings}
                    />
                  </div>
                )}
              </div>

              {/* Download Batch */}
              <div className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold">
                      {settings.featureDownloadBatchEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      Download Batch
                    </div>
                    <div className="text-xs opacity-70 mt-1">Download multiple episodes sekaligus.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle('featureDownloadBatchEnabled')}
                    className={`btn btn--sm ${settings.featureDownloadBatchEnabled ? 'btn--primary' : 'btn--secondary'}`}
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
                      className="input mt-1"
                      disabled={loadingSettings}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="card p-5 sm:p-6 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 section-title"><BellRing className="w-4 h-4" /> In-App Announcement</div>
                <div className="text-sm opacity-75 mt-1">Tulis pesan pengumuman yang akan ditampilkan langsung di aplikasi client.</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={clearAnnouncement} disabled={savingAnnouncement || clearingAnnouncement || loadingSettings || !announcement.exists} className="btn btn--secondary disabled:opacity-60">
                  {clearingAnnouncement ? 'Menghapus...' : 'Hapus Pesan'}
                </button>
                <button type="button" onClick={saveAnnouncement} disabled={savingAnnouncement || clearingAnnouncement || loadingSettings} className="btn btn--primary disabled:opacity-60">
                  <Save className="w-4 h-4" /> {savingAnnouncement ? 'Menyimpan...' : 'Simpan Announcement'}
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
                  className="input mt-1 h-40 resize-none"
                  disabled={loadingSettings}
                />
                <div className="text-xs opacity-70 mt-2">Gunakan pesan yang singkat, jelas, dan mudah dibaca karena ini akan tampil langsung ke user.</div>
              </div>
              <div className="card p-4 space-y-3">
                <div className="text-sm font-black">Preview Pengumuman</div>
                <div className="card p-4 min-h-[180px] text-sm leading-6 whitespace-pre-wrap" style={{ background: 'var(--surface)' }}>
                  {announcement.message.trim() || 'Belum ada pesan announcement yang disiapkan.'}
                </div>
                <div className="text-xs opacity-70">Terakhir diperbarui: {announcement.updatedAt ? new Date(announcement.updatedAt).toLocaleString('id-ID') : 'Belum pernah'}</div>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-6">
          <section className="card p-5 sm:p-6 space-y-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 section-title"><Coins className="w-4 h-4" /> Watch Lite Reward</div>
              <div className="text-sm opacity-75">Atur berapa lite coin yang didapat user untuk setiap menit watch-lite.</div>
            </div>
            <div className="card p-4 space-y-3">
              <label className="text-xs font-bold">Lite Coin per Minute</label>
              <input type="number" min="0" step="1" value={settings.watchLiteCoinPerMinute} onChange={(e) => setSettings((s) => ({ ...s, watchLiteCoinPerMinute: e.target.value }))} className="input font-black text-2xl" disabled={loadingSettings} />
              <div className="text-xs text-[var(--muted)]">Nilai integer ≥ 0. Semakin besar, semakin cepat user dapat reward.</div>
              <button type="button" onClick={saveWatchLite} disabled={savingWatchLite || loadingSettings} className="btn btn--primary w-full disabled:opacity-60">
                <Save className="w-4 h-4" /> {savingWatchLite ? 'Menyimpan...' : 'Simpan Reward Watch-Lite'}
              </button>
            </div>
          </section>

          <section className="card p-5 sm:p-6 space-y-4">
            <div className="section-title">Ringkasan cepat</div>
            <div className="grid gap-3">
              <div className="stat-card">
                <div className="label">Status maintenance</div>
                <div className="mt-1 text-lg font-black">{settings.maintenanceMode ? 'Aktif' : 'Nonaktif'}</div>
              </div>
              <div className="stat-card">
                <div className="label">Download global</div>
                <div className="mt-1 text-lg font-black">{settings.disableDownload ? 'Dimatikan' : 'Tetap tersedia'}</div>
              </div>
              <div className="stat-card">
                <div className="label">Announcement aktif</div>
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
