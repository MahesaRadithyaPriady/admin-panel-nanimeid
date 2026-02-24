'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Upload, ListPlus, Trash2, Plus } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listAnime, createEpisode } from '@/lib/api';

export default function UploaderOverviewPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const allowed = useMemo(() => ['superadmin', 'uploader'], []);

  // Anime list (from API) and episode form state
  const [animeItems, setAnimeItems] = useState([]);
  const [loadingAnime, setLoadingAnime] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formEpisode, setFormEpisode] = useState({
    animeId: '',
    number: '',
    title: '',
    thumbnail_mode: 'upload',
    thumbnail_url: '',
    image: null,
    previewUrl: '',
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

  // Early returns after hooks
  if (loading || !user) return null;
  if (!allowed.includes(user.role)) {
    return (
      <div className="text-sm font-semibold">
        Halaman ini untuk role <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">superadmin</span> atau <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">uploader</span>.
      </div>
    );
  }

  const onAddEpisode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const { animeId, number, title, image, sources, thumbnail_mode, thumbnail_url } = formEpisode;
    if (!animeId || !number || !title) {
      toast.error('Pilih anime dan isi nomor serta judul episode');
      return;
    }
    const thumbMode = (thumbnail_mode || 'upload').toString();
    const thumbUrl = (thumbnail_url || '').trim();
    if (thumbMode === 'upload') {
      if (!(image instanceof File)) {
        toast.error('Thumbnail episode wajib diupload');
        return;
      }
    } else {
      if (!thumbUrl) {
        toast.error('Thumbnail episode URL wajib diisi');
        return;
      }
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
        ...(thumbMode === 'upload' ? { image } : { thumbnail_episode: thumbUrl }),
        qualities: validPairs.map((s) => ({ nama_quality: s.quality, source_quality: s.url })),
      };
      const res = await createEpisode({ token, animeId: Number(animeId), payload });
      toast.success(res?.message || 'Episode berhasil diupload');
      setFormEpisode({ animeId: '', number: '', title: '', thumbnail_mode: 'upload', thumbnail_url: '', image: null, previewUrl: '', sources: [{ quality: '720p', url: '' }] });
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
      </div>

      {/* Form Data Episode (Full Width) */}
      <div className="p-4 border-4 rounded-lg space-y-3" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="flex items-center gap-2 text-lg font-extrabold"><ListPlus className="size-5" /> Data Episode</div>
          <div>
            <label className="text-xs font-bold">Pilih Anime</label>
            <select
              value={formEpisode.animeId}
              onChange={(e) => setFormEpisode((f) => ({ ...f, animeId: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border-4 rounded-lg"
              style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
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
                className="w-full mt-1 px-3 py-2 border-4 rounded-lg"
                style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-xs font-bold">Judul Episode</label>
              <input
                type="text"
                value={formEpisode.title}
                onChange={(e) => setFormEpisode((f) => ({ ...f, title: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border-4 rounded-lg"
                style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                placeholder="Episode 1 - Awal Petualangan"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold">Thumbnail Episode</label>
            <div className="grid sm:grid-cols-[140px_1fr] gap-2 mt-1">
              <select
                value={formEpisode.thumbnail_mode || 'upload'}
                onChange={(e) => setFormEpisode((f) => ({ ...f, thumbnail_mode: e.target.value, thumbnail_url: e.target.value === 'url' ? f.thumbnail_url : '', image: e.target.value === 'upload' ? f.image : null, previewUrl: e.target.value === 'upload' ? f.previewUrl : '' }))}
                className="w-full px-3 py-2 border-4 rounded-lg"
                style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                <option value="upload">Upload</option>
                <option value="url">With URL</option>
              </select>
              {(formEpisode.thumbnail_mode || 'upload') === 'upload' ? (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) return setFormEpisode((f) => ({ ...f, image: null, previewUrl: '' }));
                    const url = URL.createObjectURL(file);
                    setFormEpisode((f) => ({ ...f, image: file, previewUrl: url }));
                  }}
                  className="w-full px-3 py-2 border-4 rounded-lg"
                  style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                />
              ) : (
                <input
                  type="url"
                  value={formEpisode.thumbnail_url || ''}
                  onChange={(e) => setFormEpisode((f) => ({ ...f, thumbnail_url: e.target.value }))}
                  className="w-full px-3 py-2 border-4 rounded-lg"
                  style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  placeholder="https://..."
                />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs mt-1" style={{ color: 'var(--foreground)' }}>
              <span>Preview:</span>
              <img
                src={formEpisode.previewUrl || ((formEpisode.thumbnail_mode || 'upload') === 'url' ? (formEpisode.thumbnail_url || '') : '') || ''}
                alt="thumb"
                className="w-10 h-10 object-contain border-2 rounded"
                style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
              />
            </div>
          </div>
      </div>

      {/* Quality & Source Card below the two columns (full width) */}
      <div className="p-4 border-4 rounded-lg space-y-3" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
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
                  className="w-full mt-1 px-3 py-2 border-4 rounded-lg"
                  style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
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
                  className="w-full mt-1 px-3 py-2 border-4 rounded-lg"
                  style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  placeholder="https://..."
                />
              </div>
              <div className="sm:col-span-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormEpisode((f) => ({ ...f, sources: [...f.sources.slice(0, idx), ...f.sources.slice(idx + 1)] }))}
                  className="px-2 py-2 border-4 rounded-lg"
                  style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
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
            className="px-3 py-2 border-4 rounded-lg font-extrabold"
            style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}
          >
            <Plus className="inline size-4" /> Tambah Kualitas
          </button>
          <div className="text-[11px] opacity-70">Isi minimal satu URL. Beberapa kualitas diperbolehkan.</div>
        </div>
      </div>

      <button onClick={onAddEpisode} disabled={uploading} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>
        {uploading ? 'Mengupload...' : (<><Upload className="inline size-4" /> Upload Episode</>)}
      </button>
    </div>
  );
}
