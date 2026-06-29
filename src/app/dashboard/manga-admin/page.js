'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BookOpen, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listManga, createManga, deleteManga, grabKomikuRange } from '@/lib/api';

export default function MangaAdminPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  const [form, setForm] = useState({
    judul_manga: '',
    sinopsis_manga: '',
    genre_manga: '',
    type_manga: 'MANGA',
    author: '',
    artist: '',
    label_manga: '',
    tanggal_rilis_manga: '',
    rating_manga: '',
  });
  const [creating, setCreating] = useState(false);
  const [coverMode, setCoverMode] = useState('upload');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [grabRange, setGrabRange] = useState({ mangaId: '', sample_url: '', start: '', end: '', title_prefix: '' });
  const [grabbingRange, setGrabbingRange] = useState(false);

  const loadList = async () => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const data = await listManga({ token, q, page, limit });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat manga');
    } finally {
      setLoadingList(false);
    }
  };

  const onGrabRange = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setGrabbingRange(true);
      const mangaId = String(grabRange.mangaId || '').trim();
      const sample_url = String(grabRange.sample_url || '').trim();
      const start = Number(grabRange.start);
      const end = Number(grabRange.end);
      const title_prefix = grabRange.title_prefix ? String(grabRange.title_prefix) : undefined;
      if (!mangaId) throw new Error('mangaId wajib diisi');
      if (!sample_url) throw new Error('sample_url wajib diisi');
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) throw new Error('Range tidak valid');
      await grabKomikuRange({ token, mangaId, sample_url, start, end, title_prefix });
      toast.success('Grab range diproses');
    } catch (err) {
      toast.error(err?.message || 'Gagal grab range');
    } finally {
      setGrabbingRange(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, limit]);

  const updateForm = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSearch = async (e) => {
    e.preventDefault();
    setPage(1);
    await loadList();
  };

  const onCreate = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setCreating(true);
      const nextCoverMode = String(coverMode || 'upload');
      const nextCoverUrl = String(coverUrl || '').trim();
      if (nextCoverMode === 'upload') {
        if (!(coverFile instanceof File)) throw new Error('Cover manga wajib diupload');
      } else if (!nextCoverUrl) {
        throw new Error('URL cover manga wajib diisi');
      }
      const payload = buildMangaPayload(form);

      if (nextCoverMode === 'upload' && coverFile instanceof File) {
        payload.cover = coverFile;
      } else if (nextCoverUrl) {
        payload.cover_manga = nextCoverUrl;
      }

      await createManga({ token, payload });
      toast.success('Manga dibuat');
      setForm({ judul_manga: '', sinopsis_manga: '', genre_manga: '', type_manga: 'MANGA', author: '', artist: '', label_manga: '', tanggal_rilis_manga: '', rating_manga: '' });
      setCoverMode('upload');
      setCoverUrl('');
      setCoverFile(null);
      setCoverPreviewUrl('');
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat manga');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id) => {
    const token = getSession()?.token;
    try {
      await deleteManga({ token, id });
      toast.success('Manga dihapus');
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus manga');
    }
  };

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title flex items-center gap-2"><BookOpen className="size-5" /> Manga Admin</h2>
          </div>

          <form onSubmit={onSearch} className="filter-bar">
            <input placeholder="Cari manga..." value={q} onChange={(e)=>setQ(e.target.value)} className="input" />
            <button disabled={loadingList} className="btn btn--primary btn--sm">{loadingList ? 'Memuat...' : (<><Plus className="size-4" /> Cari</>)}</button>
          </form>

          <div className="card card--lg space-y-4">
            <div className="section-title">Tambah Manga Baru</div>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <L label="Judul"><input value={form.judul_manga} onChange={(e)=>updateForm('judul_manga', e.target.value)} required className="input" /></L>
                <L label="Cover">
                  <div className="space-y-2">
                    <select
                      value={coverMode}
                      onChange={(e) => {
                        const next = e.target.value;
                        setCoverMode(next);
                        if (next === 'upload') setCoverUrl('');
                        if (next === 'url') {
                          setCoverFile(null);
                          setCoverPreviewUrl('');
                        }
                      }}
                      className="select"
                    >
                      <option value="upload">Upload cover</option>
                      <option value="url">Gunakan URL</option>
                    </select>
                    {coverMode === 'upload' ? (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setCoverFile(file);
                          if (!file) return setCoverPreviewUrl('');
                          const url = URL.createObjectURL(file);
                          setCoverPreviewUrl(url);
                        }}
                        className="input"
                      />
                    ) : (
                      <input
                        type="url"
                        value={coverUrl}
                        onChange={(e) => setCoverUrl(e.target.value)}
                        placeholder="https://..."
                        className="input"
                      />
                    )}
                    {(coverPreviewUrl || (coverMode === 'url' ? String(coverUrl || '').trim() : '')) && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="label">Preview:</span>
                        <img src={coverPreviewUrl || coverUrl} alt="cover" className="w-10 h-10 object-contain border-2 border-[var(--border)] rounded" style={{ background: 'var(--surface)' }} loading="lazy" decoding="async" />
                      </div>
                    )}
                  </div>
                </L>
                <L label="Sinopsis"><input value={form.sinopsis_manga} onChange={(e)=>updateForm('sinopsis_manga', e.target.value)} className="input" /></L>
                <L label="Genre (comma)"><input value={form.genre_manga} onChange={(e)=>updateForm('genre_manga', e.target.value)} className="input" placeholder="Action,Comedy" /></L>
                <L label="Type">
                  <select value={form.type_manga} onChange={(e)=>updateForm('type_manga', e.target.value)} className="select">
                    <option value="MANGA">MANGA</option>
                    <option value="MANHWA">MANHWA</option>
                    <option value="MANHUA">MANHUA</option>
                    <option value="COMIC">COMIC</option>
                  </select>
                </L>
                <L label="Author"><input value={form.author} onChange={(e)=>updateForm('author', e.target.value)} className="input" /></L>
                <L label="Artist"><input value={form.artist} onChange={(e)=>updateForm('artist', e.target.value)} className="input" /></L>
                <L label="Label"><input value={form.label_manga} onChange={(e)=>updateForm('label_manga', e.target.value)} className="input" /></L>
                <L label="Rilis"><input type="date" value={form.tanggal_rilis_manga} onChange={(e)=>updateForm('tanggal_rilis_manga', e.target.value)} className="input" /></L>
                <L label="Rating"><input type="number" step="0.1" min="0" max="10" value={form.rating_manga} onChange={(e)=>updateForm('rating_manga', e.target.value)} className="input" /></L>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button disabled={creating} type="submit" className="btn btn--primary">{creating ? 'Membuat...' : (<><Plus className="size-4" /> Buat Manga</>)}</button>
              </div>
            </form>
          </div>

          <div className="card card--lg space-y-4">
            <div className="section-title">Grab Range (Komiku)</div>
            <form onSubmit={onGrabRange} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <L label="Manga ID"><input value={grabRange.mangaId} onChange={(e)=>setGrabRange(g=>({...g, mangaId: e.target.value}))} className="input" placeholder="ID manga target" /></L>
                <L label="Sample URL"><input value={grabRange.sample_url} onChange={(e)=>setGrabRange(g=>({...g, sample_url: e.target.value}))} className="input" placeholder="https://komiku.org/...-chapter-02/" /></L>
                <L label="Mulai"><input type="number" value={grabRange.start} onChange={(e)=>setGrabRange(g=>({...g, start: e.target.value}))} className="input" placeholder="2" /></L>
                <L label="Akhir"><input type="number" value={grabRange.end} onChange={(e)=>setGrabRange(g=>({...g, end: e.target.value}))} className="input" placeholder="38" /></L>
                <L label="Title Prefix"><input value={grabRange.title_prefix} onChange={(e)=>setGrabRange(g=>({...g, title_prefix: e.target.value}))} className="input" placeholder="Opsional, mis. Chapter" /></L>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button disabled={grabbingRange} className="btn btn--primary">{grabbingRange ? 'Memproses...' : (<><Plus className="size-4" /> Grab Range</>)}</button>
              </div>
            </form>
          </div>

          <div className="card overflow-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-[var(--border)]">
                  <th className="text-left px-4 py-3 label">ID</th>
                  <th className="text-left px-4 py-3 label">Judul</th>
                  <th className="text-left px-4 py-3 label">Type</th>
                  <th className="text-left px-4 py-3 label">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-[var(--border)]">
                    <td className="px-4 py-3 font-semibold">{it.id}</td>
                    <td className="px-4 py-3 font-extrabold">{it.judul_manga}</td>
                    <td className="px-4 py-3 font-semibold">{it.type_manga}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a href={`/dashboard/manga-admin/${it.id}`} className="btn btn--secondary btn--sm btn--icon" title="Detail/Edit"><ExternalLink className="size-4" /></a>
                        <button onClick={() => onDelete(it.id)} className="btn btn--danger btn--sm btn--icon" title="Hapus"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Tidak ada data.'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function L({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <label className="label sm:w-28 sm:flex-shrink-0">{label}</label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function buildMangaPayload(form) {
  const out = {};
  const str = (k) => {
    const v = form?.[k]; if (v === undefined || v === null) return; const s = String(v).trim(); if (s !== '') out[k] = s;
  };
  str('judul_manga');
  str('sinopsis_manga');
  if (typeof form?.genre_manga === 'string') {
    const arr = form.genre_manga.split(',').map(s=>s.trim()).filter(Boolean);
    if (arr.length) out.genre_manga = arr;
  }
  if (form?.type_manga) out.type_manga = String(form.type_manga).toUpperCase();
  str('author');
  str('artist');
  str('label_manga');
  if (form?.tanggal_rilis_manga) out.tanggal_rilis_manga = form.tanggal_rilis_manga;
  str('rating_manga');
  return out;
}
