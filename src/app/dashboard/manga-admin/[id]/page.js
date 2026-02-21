'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BookOpen, Save, Trash2, ArrowLeft, Plus, Download } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getManga, updateManga, deleteManga, listMangaChapters, createMangaChapter, deleteChapter, uploadFileViaPresignedPut, grabMangaChapterPlan, commitMangaChapterPages, refreshMangaChapterDimensions } from '@/lib/api';

export default function MangaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const id = params?.id;

  const [loadingItem, setLoadingItem] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ judul_manga: '', sinopsis_manga: '', genre_manga: '', type_manga: 'MANGA', author: '', artist: '', label_manga: '', tanggal_rilis_manga: '', rating_manga: '' });

  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [newChapter, setNewChapter] = useState({ chapter_number: '', title: '' });

  // Grab tab
  const [grab, setGrab] = useState({ chapter_number: '', url: '', title: '' });
  const [grabbing, setGrabbing] = useState(false);
  const [upload, setUpload] = useState({ chapter_number: '', title: '', files: null });
  const [uploading, setUploading] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [existingCoverUrl, setExistingCoverUrl] = useState('');
  // pages viewer moved to dedicated page per chapter

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoadingItem(true);
      try {
        const token = getSession()?.token;
        const res = await getManga({ token, id });
        const it = res?.item || res?.data || res;
        setForm({
          judul_manga: it?.judul_manga || '',
          sinopsis_manga: it?.sinopsis_manga || '',
          genre_manga: Array.isArray(it?.genre_manga) ? it.genre_manga.join(',') : (it?.genre_manga || ''),
          type_manga: (it?.type_manga || 'MANGA').toUpperCase(),
          author: it?.author || '',
          artist: it?.artist || '',
          label_manga: it?.label_manga || '',
          tanggal_rilis_manga: it?.tanggal_rilis_manga ? String(it.tanggal_rilis_manga).slice(0,10) : '',
          rating_manga: (it?.rating_manga ?? it?.rating) !== undefined && (it?.rating_manga ?? it?.rating) !== null ? String(it?.rating_manga ?? it?.rating) : '',
        });
        setExistingCoverUrl(it?.cover_manga || '');
        setCoverFile(null);
        setCoverPreviewUrl('');
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat manga');
      } finally {
        setLoadingItem(false);
      }
    };
    load();
  }, [id]);

  const loadChapters = async () => {
    setLoadingChapters(true);
    try {
      const token = getSession()?.token;
      const res = await listMangaChapters({ token, mangaId: id });
      const items = res?.items || res?.data || res?.chapters || [];
      setChapters(Array.isArray(items) ? items : []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat chapter');
    } finally {
      setLoadingChapters(false);
    }
  };

  useEffect(() => { if (user) loadChapters(); }, [user]);

  const updateField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setSaving(true);
      const payload = buildMangaUpdate(form);
      if (coverFile instanceof File) {
        const safeTitle = String(payload?.judul_manga || form?.judul_manga || 'manga')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 80);
        const ext = String(coverFile?.name || '').split('.').pop()?.toLowerCase() || '';
        const key = `static/uploads/manga/covers/${safeTitle || 'manga'}_${Date.now()}${ext ? `.${ext}` : ''}`;
        const uploaded = await uploadFileViaPresignedPut({ token, file: coverFile, key });
        payload.cover_manga = uploaded.publicUrl;
      }
      await updateManga({ token, id, payload });
      toast.success('Manga disimpan');
      setCoverFile(null);
      setCoverPreviewUrl('');
      if (payload?.cover_manga) setExistingCoverUrl(payload.cover_manga);
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan manga');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const token = getSession()?.token;
    try {
      await deleteManga({ token, id });
      toast.success('Manga dihapus');
      router.push('/dashboard/manga-admin');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus manga');
    }
  };

  const onCreateChapter = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      const payload = buildChapterPayload(newChapter);
      await createMangaChapter({ token, mangaId: id, payload });
      toast.success('Chapter dibuat');
      setNewChapter({ chapter_number: '', title: '' });
      await loadChapters();
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat chapter');
    }
  };

  const onDeleteChapter = async (cid) => {
    const token = getSession()?.token;
    try {
      await deleteChapter({ token, id: cid });
      toast.success('Chapter dihapus');
      await loadChapters();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus chapter');
    }
  };

  const onGrab = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setGrabbing(true);
      const num = Number(grab.chapter_number);
      if (!Number.isFinite(num)) throw new Error('chapter_number tidak valid');

      const planRes = await grabMangaChapterPlan({ token, mangaId: id, chapterNumber: num, url: grab.url, title: grab.title || undefined, plan_only: true });
      const uploads = planRes?.uploads || planRes?.data?.uploads || planRes?.plan?.uploads || [];
      if (!Array.isArray(uploads) || uploads.length === 0) throw new Error('Upload plan tidak tersedia');

      const pages = [];
      for (const u of uploads) {
        const page_number = u?.page_number;
        const source_url = u?.source_url;
        const key = u?.key;
        if (!Number.isFinite(Number(page_number))) throw new Error('page_number tidak valid di plan');
        if (!source_url) throw new Error('source_url tidak valid di plan');
        if (!key) throw new Error('key tidak valid di plan');

        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(source_url)}`;
        const imgRes = await fetch(proxyUrl);
        if (!imgRes.ok) throw new Error(`Gagal download source_url (${imgRes.status})`);
        const blob = await imgRes.blob();

        const ext = String(key).split('.').pop()?.toLowerCase() || '';
        const fileName = `page_${page_number}${ext ? `.${ext}` : ''}`;
        const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });

        const uploaded = await uploadFileViaPresignedPut({ token, file, key });
        pages.push({ page_number: Number(page_number), image_url: uploaded.publicUrl });
      }

      await commitMangaChapterPages({ token, mangaId: id, chapterNumber: num, replace: true, title: grab.title || undefined, pages });
      await refreshMangaChapterDimensions({ token, mangaId: id, chapterNumber: num, only_missing: true });

      toast.success('Grab berhasil (uploaded & committed)');
      await loadChapters();
    } catch (err) {
      toast.error(err?.message || 'Gagal grab chapter');
    } finally {
      setGrabbing(false);
    }
  };

  const onUpload = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setUploading(true);
      toast.error('Upload manual dipindahkan ke halaman chapter');
    } finally {
      setUploading(false);
    }
  };

  // viewer logic removed

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2"><BookOpen className="size-5" /> Detail Manga</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/dashboard/manga-admin')} className="btn-pg flex items-center gap-2"><ArrowLeft className="size-4" /> Kembali</button>
            </div>
          </div>

          {loadingItem ? (
            <div className="text-sm">Memuat...</div>
          ) : (
            <form onSubmit={onSave} className="space-y-3 p-4 border-4 rounded-lg" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <L label="Judul"><input value={form.judul_manga} onChange={(e)=>updateField('judul_manga', e.target.value)} required className="inp" /></L>
                <L label="Cover (Upload)">
                  <div className="space-y-2">
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
                      className="inp"
                    />
                    {(coverPreviewUrl || existingCoverUrl) && (
                      <div className="flex items-center gap-2 text-xs">
                        <span>Preview:</span>
                        <img src={coverPreviewUrl || existingCoverUrl} alt="cover" className="w-10 h-10 object-contain border-2 rounded" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }} />
                      </div>
                    )}
                  </div>
                </L>
                <L label="Sinopsis"><input value={form.sinopsis_manga} onChange={(e)=>updateField('sinopsis_manga', e.target.value)} className="inp" /></L>
                <L label="Genre (comma)"><input value={form.genre_manga} onChange={(e)=>updateField('genre_manga', e.target.value)} className="inp" placeholder="Action,Comedy" /></L>
                <L label="Type">
                  <select value={form.type_manga} onChange={(e)=>updateField('type_manga', e.target.value)} className="sel">
                    <option value="MANGA">MANGA</option>
                    <option value="MANHWA">MANHWA</option>
                    <option value="MANHUA">MANHUA</option>
                    <option value="COMIC">COMIC</option>
                  </select>
                </L>
                <L label="Author"><input value={form.author} onChange={(e)=>updateField('author', e.target.value)} className="inp" /></L>
                <L label="Artist"><input value={form.artist} onChange={(e)=>updateField('artist', e.target.value)} className="inp" /></L>
                <L label="Label"><input value={form.label_manga} onChange={(e)=>updateField('label_manga', e.target.value)} className="inp" /></L>
                <L label="Rilis"><input type="date" value={form.tanggal_rilis_manga} onChange={(e)=>updateField('tanggal_rilis_manga', e.target.value)} className="inp" /></L>
                <L label="Rating"><input type="number" step="0.1" min="0" max="10" value={form.rating_manga} onChange={(e)=>updateField('rating_manga', e.target.value)} className="inp" /></L>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={saving} type="submit" className="btn-add flex items-center gap-2">{saving ? 'Menyimpan...' : (<><Save className="size-4" /> Simpan</>)}</button>
                <button type="button" onClick={onDelete} className="btn-act flex items-center gap-2"><Trash2 className="size-4" /> Hapus</button>
              </div>
            </form>
          )}

          {/* Chapters */}
          <div className="space-y-3">
            <div className="text-lg font-extrabold">Chapters</div>
            <form onSubmit={onCreateChapter} className="flex flex-wrap items-center gap-2">
              <input type="number" placeholder="chapter_number" value={newChapter.chapter_number} onChange={(e)=>setNewChapter(c=>({...c, chapter_number: e.target.value}))} className="inp" />
              <input placeholder="title (opsional)" value={newChapter.title} onChange={(e)=>setNewChapter(c=>({...c, title: e.target.value}))} className="inp" />
              <button className="btn-add"><Plus className="size-4" /> Tambah</button>
            </form>

            <div className="overflow-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Chapter</Th>
                    <Th>Judul</Th>
                    <Th>Aksi</Th>
                  </tr>
                </thead>
                <tbody>
                  {chapters.map((ch) => (
                    <tr key={ch.id}>
                      <Td>{ch.id}</Td>
                      <Td className="font-extrabold">{ch.chapter_number}</Td>
                      <Td>{ch.title || '-'}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <a href={`/dashboard/manga-admin/${id}/chapters/${ch.chapter_number}`} className="btn-link">Lihat Halaman</a>
                          <button onClick={() => onDeleteChapter(ch.id)} className="btn-act" title="Hapus"><Trash2 className="size-4" /></button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                  {chapters.length === 0 && (
                    <tr>
                      <td colSpan={4} className="td-empty">{loadingChapters ? 'Memuat...' : 'Tidak ada data.'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grab Tab */}
          <div className="space-y-3">
            <div className="text-lg font-extrabold flex items-center gap-2"><Download className="size-4" /> Grab Komiku</div>
            <form onSubmit={onGrab} className="flex flex-wrap items-center gap-2">
              <input type="number" placeholder="chapter_number" value={grab.chapter_number} onChange={(e)=>setGrab(g=>({...g, chapter_number: e.target.value}))} className="inp" />
              <input placeholder="Komiku chapter URL" value={grab.url} onChange={(e)=>setGrab(g=>({...g, url: e.target.value}))} className="inp" />
              <input placeholder="Judul (opsional)" value={grab.title} onChange={(e)=>setGrab(g=>({...g, title: e.target.value}))} className="inp" />
              <button disabled={grabbing} className="btn-add">{grabbing ? 'Mengambil...' : (<><Download className="size-4" /> Grab</>)}</button>
            </form>
          </div>

          {/* Upload dipindahkan ke halaman halaman-chapter */}

          {/* Chapter Pages viewer moved to dedicated route */}
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

function buildMangaUpdate(form) {
  const out = {};
  const str = (k) => { const v = form?.[k]; if (v === undefined || v === null) return; const s = String(v).trim(); if (s !== '') out[k] = s; };
  str('judul_manga'); str('sinopsis_manga');
  if (typeof form?.genre_manga === 'string') { const arr = form.genre_manga.split(',').map(s=>s.trim()).filter(Boolean); out.genre_manga = arr; }
  if (form?.type_manga) out.type_manga = String(form.type_manga).toUpperCase();
  str('author'); str('artist'); str('label_manga');
  if (form?.tanggal_rilis_manga) out.tanggal_rilis_manga = form.tanggal_rilis_manga;
  str('rating_manga');
  return out;
}
function buildChapterPayload(ch) {
  const out = {};
  if (ch?.chapter_number !== undefined && ch.chapter_number !== null && ch.chapter_number !== '') {
    const n = Number(ch.chapter_number); if (Number.isFinite(n)) out.chapter_number = n;
  }
  if (ch?.title) out.title = String(ch.title).trim();
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
.btn-pg { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; background:#fff; font-weight:800; box-shadow:4px 4px 0 #000; }
`;
if (typeof document !== 'undefined' && !document.getElementById('manga-admin-detail-styles')) {
  const style = document.createElement('style');
  style.id = 'manga-admin-detail-styles';
  style.innerHTML = styles;
  document.head.appendChild(style);
}
