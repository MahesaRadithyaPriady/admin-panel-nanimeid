'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Upload, CheckCircle2, Clock, XCircle, HardDrive, RefreshCw, ListPlus, Trash2, Plus } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { formatShort } from '@/lib/numberFormat';
import { getSession } from '@/lib/auth';
import { listAnime, createEpisode, getMyUploadStats, listUploadHistory } from '@/lib/api';

export default function UploaderOverviewPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const allowed = useMemo(() => ['superadmin', 'uploader'], []);

  // Upload stats + latest (from API)
  const [stats, setStats] = useState({ totalUploads: 0, pending: 0, approved: 0, rejected: 0, storageGB: 0 });
  const [latest, setLatest] = useState([]);

  // Anime list (from API) and episode form state
  const [animeItems, setAnimeItems] = useState([]);
  const [loadingAnime, setLoadingAnime] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formEpisode, setFormEpisode] = useState({
    animeId: '',
    number: '',
    title: '',
    thumbnail: '',
    sources: [
      { quality: '720p', url: '' },
    ],
  });

  // Load anime list (must be before any early returns to keep hook order stable)
  useEffect(() => {
    const loadAnime = async () => {
      try {
        setLoadingAnime(true);
        const token = getSession()?.token;
        const res = await listAnime({ token, page: 1, limit: 200, q: '' });
        setAnimeItems(Array.isArray(res.items) ? res.items : []);
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat daftar anime');
      } finally {
        setLoadingAnime(false);
      }
    };
    loadAnime();
  }, []);

  // Load upload stats and latest history (must be before early returns)
  useEffect(() => {
    const loadUploadsData = async () => {
      try {
        const token = getSession()?.token;
        // Stats
        const s = await getMyUploadStats({ token });
        const storageGB = s?.storage?.used_bytes ? +(s.storage.used_bytes / 1_000_000_000).toFixed(1) : 0;
        setStats({
          totalUploads: s.total_upload || 0,
          pending: s.pending || 0,
          approved: s.approved || 0,
          rejected: s.rejected || 0,
          storageGB,
        });
        // Latest history (recent first)
        const hist = await listUploadHistory({ token, page: 1, limit: 10 });
        const items = (hist.items || []).map((it) => {
          let title = `${it.target_type} #${it.target_id}`;
          const t = it.target || {};
          if (it.target_type === 'EPISODE') {
            const animeName = t.anime?.nama_anime || 'Anime';
            const epNo = t.nomor_episode != null ? `Ep ${t.nomor_episode}` : '';
            const epTitle = t.judul_episode || '';
            title = `${animeName}${epNo ? ' - ' + epNo : ''}${epTitle ? ': ' + epTitle : ''}`;
          } else if (it.target_type === 'ANIME') {
            title = t.nama_anime || title;
          }
          if (it.note) title += ` - ${it.note}`;
          return {
            id: it.id,
            title,
            status: (it.status || 'pending').toLowerCase(),
            ts: it.createdAt ? Date.parse(it.createdAt) : Date.now(),
          };
        });
        setLatest(items);
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat statistik upload');
      }
    };
    loadUploadsData();
  }, []);

  // Early returns after hooks
  if (loading || !user) return null;
  if (!allowed.includes(user.role)) {
    return (
      <div className="text-sm font-semibold">
        Halaman ini untuk role <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">superadmin</span> atau <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">uploader</span>.
      </div>
    );
  }

  const refresh = async () => {
    try {
      const token = getSession()?.token;
      const s = await getMyUploadStats({ token });
      const storageGB = s?.storage?.used_bytes ? +(s.storage.used_bytes / 1_000_000_000).toFixed(1) : 0;
      setStats({
        totalUploads: s.total_upload || 0,
        pending: s.pending || 0,
        approved: s.approved || 0,
        rejected: s.rejected || 0,
        storageGB,
      });
      const hist = await listUploadHistory({ token, page: 1, limit: 10 });
      const items = (hist.items || []).map((it) => {
        let title = `${it.target_type} #${it.target_id}`;
        const t = it.target || {};
        if (it.target_type === 'EPISODE') {
          const animeName = t.anime?.nama_anime || 'Anime';
          const epNo = t.nomor_episode != null ? `Ep ${t.nomor_episode}` : '';
          const epTitle = t.judul_episode || '';
          title = `${animeName}${epNo ? ' - ' + epNo : ''}${epTitle ? ': ' + epTitle : ''}`;
        } else if (it.target_type === 'ANIME') {
          title = t.nama_anime || title;
        }
        if (it.note) title += ` - ${it.note}`;
        return {
          id: it.id,
          title,
          status: (it.status || 'pending').toLowerCase(),
          ts: it.createdAt ? Date.parse(it.createdAt) : Date.now(),
        };
      });
      setLatest(items);
      toast.success('Overview uploader diperbarui');
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat overview');
    }
  };


  const onAddEpisode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const { animeId, number, title, thumbnail, sources } = formEpisode;
    if (!animeId || !number || !title || !thumbnail) {
      toast.error('Pilih anime dan isi nomor, judul, dan thumbnail episode');
      return;
    }
    const validPairs = (sources || []).filter((s) => (s.url || '').trim() && (s.quality || '').trim());
    if (validPairs.length === 0) {
      toast.error('Minimal 1 kualitas + sumber URL diisi');
      return;
    }
    try {
      setUploading(true);
      const token = getSession()?.token;
      const payload = {
        judul_episode: title,
        nomor_episode: Number(number),
        thumbnail_episode: thumbnail,
        qualities: validPairs.map((s) => ({ nama_quality: s.quality, source_quality: s.url })),
      };
      const res = await createEpisode({ token, animeId: Number(animeId), payload });
      toast.success(res?.message || 'Episode berhasil diupload');
      setFormEpisode({ animeId: '', number: '', title: '', thumbnail: '', sources: [{ quality: '720p', url: '' }] });
    } catch (err) {
      toast.error(err?.message || 'Gagal mengupload episode');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold flex items-center gap-2"><Upload className="size-5" /> Upload Konten</h2>
        {user.role !== 'uploader' && (
          <button onClick={refresh} className="px-3 py-2 border-4 border-black rounded-lg bg-[#FFD803] font-extrabold" style={{ boxShadow: '4px 4px 0 #000' }}>
            <RefreshCw className="inline size-4" /> Refresh
          </button>
        )}
      </div>

      {/* Overview cards (hidden for uploader) */}
      {user.role !== 'uploader' && (
        <div className="grid sm:grid-cols-5 gap-4">
          <div className="p-4 border-4 border-black rounded-lg bg-white" style={{ boxShadow: '4px 4px 0 #000' }}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1"><Upload className="size-4" /> Total Upload</div>
            <div className="text-2xl font-extrabold">{formatShort(stats.totalUploads)}</div>
          </div>
          <div className="p-4 border-4 border-black rounded-lg bg-[#FFE4A1]" style={{ boxShadow: '4px 4px 0 #000' }}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1"><Clock className="size-4" /> Pending</div>
            <div className="text-2xl font-extrabold">{formatShort(stats.pending)}</div>
          </div>
          <div className="p-4 border-4 border-black rounded-lg bg-[#C6F6D5]" style={{ boxShadow: '4px 4px 0 #000' }}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1"><CheckCircle2 className="size-4" /> Approved</div>
            <div className="text-2xl font-extrabold">{formatShort(stats.approved)}</div>
          </div>
          <div className="p-4 border-4 border-black rounded-lg bg-[#FED7D7]" style={{ boxShadow: '4px 4px 0 #000' }}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1"><XCircle className="size-4" /> Rejected</div>
            <div className="text-2xl font-extrabold">{formatShort(stats.rejected)}</div>
          </div>
          <div className="p-4 border-4 border-black rounded-lg bg-[#E2E8F0]" style={{ boxShadow: '4px 4px 0 #000' }}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1"><HardDrive className="size-4" /> Storage</div>
            <div className="text-2xl font-extrabold">{stats.storageGB} GB</div>
          </div>
        </div>
      )}

      {/* Latest uploads (hidden for uploader) */}
      {user.role !== 'uploader' && (
        <div>
          <h3 className="text-lg font-extrabold mb-3">Unggahan Terbaru</h3>
          <div className="overflow-auto">
            <table className="min-w-full border-4 border-black rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000' }}>
              <thead className="bg-[#E2E8F0]">
                <tr>
                  <th className="text-left px-3 py-2 border-b-4 border-black">Waktu</th>
                  <th className="text-left px-3 py-2 border-b-4 border-black">Judul</th>
                  <th className="text-left px-3 py-2 border-b-4 border-black">Status</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((it) => (
                  <tr key={it.id} className="odd:bg-white even:bg-[#F7F7F0]">
                    <td className="px-3 py-2 border-b-4 border-black text-sm opacity-80">{new Date(it.ts).toLocaleString('id-ID')}</td>
                    <td className="px-3 py-2 border-b-4 border-black">{it.title}</td>
                    <td className="px-3 py-2 border-b-4 border-black">
                      <span className={`px-2 py-1 border-2 border-black rounded text-xs font-extrabold ${it.status==='approved' ? 'bg-[#C6F6D5]' : it.status==='pending' ? 'bg-[#FFE4A1]' : 'bg-[#FED7D7]'}`}>
                        {it.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {latest.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-sm opacity-70">Belum ada unggahan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Data Episode (Full Width) */}
      <div className="p-4 border-4 border-black rounded-lg bg-white space-y-3" style={{ boxShadow: '4px 4px 0 #000' }}>
          <div className="flex items-center gap-2 text-lg font-extrabold"><ListPlus className="size-5" /> Data Episode</div>
          <div>
            <label className="text-xs font-bold">Pilih Anime</label>
            <select
              value={formEpisode.animeId}
              onChange={(e) => setFormEpisode((f) => ({ ...f, animeId: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border-4 border-black rounded-lg bg-white"
            >
              <option value="">-- Pilih --</option>
              {animeItems.map((a) => (
                <option key={a.id} value={a.id}>{a.nama_anime}</option>
              ))}
            </select>
            {loadingAnime && (
              <div className="text-[11px] mt-1 opacity-70">Memuat daftar anime...</div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold">Nomor Episode</label>
              <input
                type="number"
                min="1"
                value={formEpisode.number}
                onChange={(e) => setFormEpisode((f) => ({ ...f, number: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border-4 border-black rounded-lg"
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-xs font-bold">Judul Episode</label>
              <input
                type="text"
                value={formEpisode.title}
                onChange={(e) => setFormEpisode((f) => ({ ...f, title: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border-4 border-black rounded-lg"
                placeholder="Episode 1 - Awal Petualangan"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold">Thumbnail (URL) - Wajib</label>
            <input
              type="url"
              value={formEpisode.thumbnail}
              onChange={(e) => setFormEpisode((f) => ({ ...f, thumbnail: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border-4 border-black rounded-lg"
              placeholder="https://..."
            />
          </div>
      </div>

      {/* Quality & Source Card below the two columns (full width) */}
      <div className="p-4 border-4 border-black rounded-lg bg-[#F0F9FF] space-y-3" style={{ boxShadow: '4px 4px 0 #000' }}>
        <div className="flex items-center gap-2 text-lg font-extrabold"><Plus className="size-5" /> Kualitas & Sumber</div>
        <div className="space-y-2">
          {formEpisode.sources.map((row, idx) => (
            <div key={idx} className="grid sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-3">
                <label className="text-[11px] font-bold">Kualitas</label>
                <select
                  value={row.quality}
                  onChange={(e) => setFormEpisode((f) => {
                    const next = [...f.sources];
                    next[idx] = { ...next[idx], quality: e.target.value };
                    return { ...f, sources: next };
                  })}
                  className="w-full mt-1 px-3 py-2 border-4 border-black rounded-lg bg-white"
                >
                  {['360p','480p','720p','1080p','1440p','2160p'].map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-8">
                <label className="text-[11px] font-bold">URL Sumber</label>
                <input
                  type="text"
                  value={row.url}
                  onChange={(e) => setFormEpisode((f) => {
                    const next = [...f.sources];
                    next[idx] = { ...next[idx], url: e.target.value };
                    return { ...f, sources: next };
                  })}
                  className="w-full mt-1 px-3 py-2 border-4 border-black rounded-lg"
                  placeholder="https://..."
                />
              </div>
              <div className="sm:col-span-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormEpisode((f) => ({ ...f, sources: [...f.sources.slice(0, idx), ...f.sources.slice(idx + 1)] }))}
                  className="px-2 py-2 border-4 border-black rounded-lg bg-[#FED7D7]"
                  title="Hapus baris"
                  disabled={formEpisode.sources.length === 1}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFormEpisode((f) => ({ ...f, sources: [...f.sources, { quality: '720p', url: '' }] }))}
            className="px-3 py-2 border-4 border-black rounded-lg bg-white font-extrabold"
            style={{ boxShadow: '3px 3px 0 #000' }}
          >
            <Plus className="inline size-4" /> Tambah Kualitas
          </button>
          <div className="text-[11px] opacity-70">Isi minimal satu URL. Beberapa kualitas diperbolehkan.</div>
        </div>
      </div>

      <button onClick={onAddEpisode} disabled={uploading} className="px-3 py-2 border-4 border-black rounded-lg bg-[#FFE4A1] font-extrabold disabled:opacity-60" style={{ boxShadow: '3px 3px 0 #000' }}>
        {uploading ? 'Mengupload...' : (<><Upload className="inline size-4" /> Upload Episode</>)}
      </button>
      <div className="text-xs opacity-70">Episode akan masuk status pending untuk validasi.</div>
    </div>
  );
}
