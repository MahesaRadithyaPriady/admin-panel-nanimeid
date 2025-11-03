'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BookOpen, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listManga, createManga, deleteManga, grabKomikuRange, uploadMangaCover } from '@/lib/api';

export default function MangaAdminPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const role = (user?.role || '').toLowerCase();
  const isAllowed = role === 'superadmin' || role === 'uploader';

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
    cover_manga: '',
    genre_manga: '',
    type_manga: 'MANGA',
    author: '',
    artist: '',
    label_manga: '',
    tanggal_rilis_manga: '',
    rating_manga: '',
  });
  const [creating, setCreating] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
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
    if (!isAllowed) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed, page, limit]);

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
      const payload = buildMangaPayload(form);
      const created = await createManga({ token, payload });
      const newId = created?.item?.id || created?.id;
      // Optional cover upload from file
      if (newId && coverFile instanceof File) {
        try {
          await uploadMangaCover({ token, id: newId, file: coverFile });
        } catch (err) {
          toast.error(err?.message || 'Gagal mengupload cover');
        }
      }
      toast.success('Manga dibuat');
      setForm({ judul_manga: '', sinopsis_manga: '', cover_manga: '', genre_manga: '', type_manga: 'MANGA', author: '', artist: '', label_manga: '', tanggal_rilis_manga: '', rating_manga: '' });
      setCoverFile(null);
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
      {loading || !user ? null : !isAllowed ? (
        <div className="text-sm font-semibold">Halaman ini khusus superadmin/uploader.</div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2"><BookOpen className="size-5" /> Manga Admin</h2>
          </div>

          <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2">
            <input placeholder="Cari..." value={q} onChange={(e)=>setQ(e.target.value)} className="inp" />
            <button disabled={loadingList} className="btn-add">{loadingList ? 'Memuat...' : (<><Plus className="size-4" /> Cari</>)}</button>
          </form>

          <form onSubmit={onCreate} className="space-y-3 p-4 border-4 rounded-lg" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="grid sm:grid-cols-2 gap-3">
              <L label="Judul"><input value={form.judul_manga} onChange={(e)=>updateForm('judul_manga', e.target.value)} required className="inp" /></L>
              <L label="Cover URL"><input value={form.cover_manga} onChange={(e)=>updateForm('cover_manga', e.target.value)} className="inp" placeholder="https://..." /></L>
              <L label="atau File"><input type="file" accept="image/*" onChange={(e)=>setCoverFile(e.target.files?.[0] || null)} className="inp" /></L>
              <L label="Sinopsis"><input value={form.sinopsis_manga} onChange={(e)=>updateForm('sinopsis_manga', e.target.value)} className="inp" /></L>
              <L label="Genre (comma)"><input value={form.genre_manga} onChange={(e)=>updateForm('genre_manga', e.target.value)} className="inp" placeholder="Action,Comedy" /></L>
              <L label="Type">
                <select value={form.type_manga} onChange={(e)=>updateForm('type_manga', e.target.value)} className="sel">
                  <option value="MANGA">MANGA</option>
                  <option value="MANHWA">MANHWA</option>
                  <option value="MANHUA">MANHUA</option>
                  <option value="COMIC">COMIC</option>
                </select>
              </L>
              <L label="Author"><input value={form.author} onChange={(e)=>updateForm('author', e.target.value)} className="inp" /></L>
              <L label="Artist"><input value={form.artist} onChange={(e)=>updateForm('artist', e.target.value)} className="inp" /></L>
              <L label="Label"><input value={form.label_manga} onChange={(e)=>updateForm('label_manga', e.target.value)} className="inp" /></L>
              <L label="Rilis"><input type="date" value={form.tanggal_rilis_manga} onChange={(e)=>updateForm('tanggal_rilis_manga', e.target.value)} className="inp" /></L>
              <L label="Rating"><input type="number" step="0.1" min="0" max="10" value={form.rating_manga} onChange={(e)=>updateForm('rating_manga', e.target.value)} className="inp" /></L>
            </div>
            <div>
              <button disabled={creating} type="submit" className="btn-add">{creating ? 'Membuat...' : (<><Plus className="size-4" /> Buat Manga</>)}</button>
            </div>
          </form>

          {/* Grab Range (Komiku) */}
          <form onSubmit={onGrabRange} className="space-y-3 p-4 border-4 rounded-lg" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="grid sm:grid-cols-2 gap-3">
              <L label="Manga ID"><input value={grabRange.mangaId} onChange={(e)=>setGrabRange(g=>({...g, mangaId: e.target.value}))} className="inp" placeholder="ID manga target" /></L>
              <L label="Sample URL"><input value={grabRange.sample_url} onChange={(e)=>setGrabRange(g=>({...g, sample_url: e.target.value}))} className="inp" placeholder="https://komiku.org/...-chapter-02/" /></L>
              <L label="Mulai"><input type="number" value={grabRange.start} onChange={(e)=>setGrabRange(g=>({...g, start: e.target.value}))} className="inp" placeholder="2" /></L>
              <L label="Akhir"><input type="number" value={grabRange.end} onChange={(e)=>setGrabRange(g=>({...g, end: e.target.value}))} className="inp" placeholder="38" /></L>
              <L label="Title Prefix"><input value={grabRange.title_prefix} onChange={(e)=>setGrabRange(g=>({...g, title_prefix: e.target.value}))} className="inp" placeholder="Opsional, mis. Chapter" /></L>
            </div>
            <div>
              <button disabled={grabbingRange} className="btn-add">{grabbingRange ? 'Memproses...' : (<><Plus className="size-4" /> Grab Range</>)}</button>
            </div>
          </form>

          <div className="overflow-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Judul</Th>
                  <Th>Type</Th>
                  <Th>Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <Td>{it.id}</Td>
                    <Td className="font-extrabold">{it.judul_manga}</Td>
                    <Td>{it.type_manga}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <a href={`/dashboard/manga-admin/${it.id}`} className="btn-link" title="Detail/Edit"><ExternalLink className="size-4" /></a>
                        <button onClick={() => onDelete(it.id)} className="btn-act" title="Hapus"><Trash2 className="size-4" /></button>
                      </div>
                    </Td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="td-empty">{loadingList ? 'Memuat...' : 'Tidak ada data.'}</td>
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
    <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
      <label className="lbl">{label}</label>
      {children}
    </div>
  );
}
function Th({ children }) { return <th className="th">{children}</th>; }
function Td({ children, className='' }) { return <td className={`td ${className}`}>{children}</td>; }

function buildMangaPayload(form) {
  const out = {};
  const str = (k) => {
    const v = form?.[k]; if (v === undefined || v === null) return; const s = String(v).trim(); if (s !== '') out[k] = s;
  };
  str('judul_manga');
  str('sinopsis_manga');
  str('cover_manga');
  if (typeof form?.genre_manga === 'string') {
    const arr = form.genre_manga.split(',').map(s=>s.trim()).filter(Boolean);
    if (arr.length) out.genre_manga = arr;
  }
  if (form?.type_manga) out.type_manga = String(form.type_manga).toUpperCase();
  str('author');
  str('artist');
  str('label_manga');
  if (form?.tanggal_rilis_manga) out.tanggal_rilis_manga = form.tanggal_rilis_manga;
  if (form?.rating_manga !== undefined && form.rating_manga !== '') {
    const n = Number(form.rating_manga);
    if (Number.isFinite(n)) out.rating_manga = n;
  }
  return out;
}

const styles = `
.inp { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 600; }
.sel { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 800; }
.lbl { font-size: 0.875rem; font-weight: 800; }
.btn-add { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:4px 4px 0 #000; background: var(--accent-add); color: var(--accent-add-foreground); border-color: var(--panel-border); }
.btn-act { padding:0.25rem 0.5rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:3px 3px 0 #000; background: var(--panel-bg); color: var(--foreground); border-color: var(--panel-border); }
.btn-link { padding:0.25rem 0.5rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:3px 3px 0 #000; background: var(--accent-edit); color: var(--accent-edit-foreground); border-color: var(--panel-border); }
.tbl { min-width: 100%; border-width:4px; border-radius:0.5rem; overflow:hidden; box-shadow:6px 6px 0 #000; border-color: var(--panel-border); color: var(--foreground); }
.tbl thead { background: var(--panel-bg); }
.th { text-align:left; padding:0.5rem 0.75rem; border-bottom-width:4px; border-color: var(--panel-border); }
.td { padding:0.5rem 0.75rem; border-bottom-width:4px; border-color: var(--panel-border); font-weight:600; }
.td-empty { padding:1.5rem; text-align:center; font-size:0.875rem; opacity:0.7; }
`;
if (typeof document !== 'undefined' && !document.getElementById('manga-admin-styles')) {
  const style = document.createElement('style');
  style.id = 'manga-admin-styles';
  style.innerHTML = styles;
  document.head.appendChild(style);
}
