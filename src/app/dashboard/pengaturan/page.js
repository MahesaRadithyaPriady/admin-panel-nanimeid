'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Settings, AlertTriangle, Download, BadgeDollarSign } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getSettings, updateSettings } from '@/lib/api';

export default function PengaturanPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const allowed = useMemo(() => ['superadmin'], []);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    maintenanceMessage: '',
    disableDownload: false,
    paidQualityEnabled: false,
    paidQuality: '', // comma-separated input representing an array
  });

  // Load settings from API (before early returns to keep hook order stable)
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingSettings(true);
        const token = getSession()?.token;
        const s = await getSettings({ token });
        if (s) {
          setSettings({
            maintenanceMode: !!s.maintenance_enabled,
            maintenanceMessage: s.maintenance_message ?? '',
            disableDownload: s.downloads_enabled === false,
            paidQualityEnabled: Array.isArray(s.paid_qualities) && s.paid_qualities.length > 0,
            paidQuality: Array.isArray(s.paid_qualities)
              ? s.paid_qualities.filter(Boolean).join(', ')
              : '',
          });
        }
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat pengaturan');
      } finally {
        setLoadingSettings(false);
      }
    };
    load();
  }, []);

  if (loading || !user) return null;
  if (!allowed.includes(user.role)) {
    return (
      <div className="text-sm font-semibold">
        Halaman ini khusus <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">superadmin</span>.
      </div>
    );
  }

  const toggle = (key) => {
    setSettings((s) => {
      const next = { ...s, [key]: !s[key] };
      return next;
    });
  };

  const saveAll = async () => {
    try {
      setSaving(true);
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
      };
      const updated = await updateSettings({ token, payload });
      if (updated) {
        setSettings({
          maintenanceMode: !!updated.maintenance_enabled,
          maintenanceMessage: updated.maintenance_message ?? '',
          disableDownload: updated.downloads_enabled === false,
          paidQualityEnabled: Array.isArray(updated.paid_qualities) && updated.paid_qualities.length > 0,
          paidQuality: Array.isArray(updated.paid_qualities)
            ? updated.paid_qualities.filter(Boolean).join(', ')
            : '',
        });
      }
      toast.success('Pengaturan disimpan');
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold flex items-center gap-2"><Settings className="size-5" /> Pengaturan</h2>
        <button onClick={saveAll} disabled={saving || loadingSettings} className="px-3 py-2 border-4 border-black rounded-lg bg-[#FFD803] font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000' }}>
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>

      {/* Maintenance Mode */}
      <section className="p-4 border-4 border-black rounded-lg bg-white space-y-3" style={{ boxShadow: '6px 6px 0 #000' }}>
        <div className="flex items-center gap-2 text-sm font-extrabold"><AlertTriangle className="size-4" /> Mode Pemeliharaan</div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bold">Maintenance Mode</div>
            <div className="text-xs opacity-70">Ketika aktif, aplikasi menampilkan pesan pemeliharaan untuk semua pengguna.</div>
          </div>
          <button
            onClick={() => toggle('maintenanceMode')}
            className={`px-3 py-2 border-4 border-black rounded-lg font-extrabold ${settings.maintenanceMode ? 'bg-[#C6F6D5]' : 'bg-white'}`}
            style={{ boxShadow: '4px 4px 0 #000' }}
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
            className="w-full h-24 mt-1 px-3 py-2 border-4 border-black rounded-lg bg-white font-semibold"
            style={{ boxShadow: '4px 4px 0 #000' }}
            disabled={loadingSettings}
          />
        </div>
      </section>

      {/* Download Mode */}
      <section className="p-4 border-4 border-black rounded-lg bg-white space-y-3" style={{ boxShadow: '6px 6px 0 #000' }}>
        <div className="flex items-center gap-2 text-sm font-extrabold"><Download className="size-4" /> Pengunduhan</div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bold">Matikan Download</div>
            <div className="text-xs opacity-70">Jika aktif, tombol unduh disembunyikan/dinonaktifkan di aplikasi.</div>
          </div>
          <button
            onClick={() => toggle('disableDownload')}
            className={`px-3 py-2 border-4 border-black rounded-lg font-extrabold ${settings.disableDownload ? 'bg-[#C6F6D5]' : 'bg-white'}`}
            style={{ boxShadow: '4px 4px 0 #000' }}
            disabled={loadingSettings}
          >
            {settings.disableDownload ? 'AKTIF' : 'NONAKTIF'}
          </button>
        </div>
      </section>

      {/* Paid Quality */}
      <section className="p-4 border-4 border-black rounded-lg bg-white space-y-3" style={{ boxShadow: '6px 6px 0 #000' }}>
        <div className="flex items-center gap-2 text-sm font-extrabold"><BadgeDollarSign className="size-4" /> Kualitas Berbayar</div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bold">Aktifkan Kualitas Berbayar</div>
            <div className="text-xs opacity-70">Batasi kualitas tertentu (misal 1080p/4K) untuk pengguna premium.</div>
          </div>
          <button
            onClick={() => toggle('paidQualityEnabled')}
            className={`px-3 py-2 border-4 border-black rounded-lg font-extrabold ${settings.paidQualityEnabled ? 'bg-[#C6F6D5]' : 'bg-white'}`}
            style={{ boxShadow: '4px 4px 0 #000' }}
            disabled={loadingSettings}
          >
            {settings.paidQualityEnabled ? 'AKTIF' : 'NONAKTIF'}
          </button>
        </div>

        {settings.paidQualityEnabled && (
          <div>
            <label className="text-xs font-bold">Kualitas yang dikunci</label>
            <input
              value={settings.paidQuality}
              onChange={(e) => setSettings((s) => ({ ...s, paidQuality: e.target.value }))}
              placeholder="cth: 1080p, 4K"
              className="w-full mt-1 px-3 py-2 border-4 border-black rounded-lg bg-white font-semibold"
              style={{ boxShadow: '3px 3px 0 #000' }}
              disabled={loadingSettings}
            />
            <div className="text-xs opacity-70 mt-1">Pisahkan dengan koma. Contoh: 720p, 1080p, 4K. Pengguna non-premium tidak dapat mengakses kualitas ini.</div>
          </div>
        )}
      </section>
      {loadingSettings && (
        <div className="text-[11px] opacity-70">Memuat pengaturan...</div>
      )}
      <div className="text-xs opacity-70">Terhubung ke Admin Settings API. Perubahan akan disimpan ke server.</div>
    </div>
  );
}
