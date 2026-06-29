'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BookOpen, Save, Trash2, ArrowLeft, Plus, Download } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getManga, updateManga, deleteManga, listMangaChapters, createMangaChapter, deleteChapter, grabMangaChapterPlan, getMangaKomikuGrabJob } from '@/lib/api';

export default function MangaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const id = params?.id;

  const [loadingItem, setLoadingItem] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ judul_manga: '', sinopsis_manga: '', genre_manga: '', type_manga: 'MANGA', status_manga: 'ONGOING', author: '', artist: '', label_manga: '', tanggal_rilis_manga: '', rating_manga: '' });

  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [newChapter, setNewChapter] = useState({ chapter_number: '', title: '' });

  // Grab tab
  const [grab, setGrab] = useState({ chapter_number: '', url: '', title: '' });
  const [grabbing, setGrabbing] = useState(false);
  const [grabJob, setGrabJob] = useState(null);
  const [grabStatusText, setGrabStatusText] = useState('Belum ada proses grab berjalan.');
  const [upload, setUpload] = useState({ chapter_number: '', title: '', files: null });
  const [uploading, setUploading] = useState(false);
  const [coverMode, setCoverMode] = useState('upload');
  const [coverUrl, setCoverUrl] = useState('');
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
          status_manga: String(it?.status_manga || 'ONGOING').toUpperCase(),
          author: it?.author || '',
          artist: it?.artist || '',
          label_manga: it?.label_manga || '',
          tanggal_rilis_manga: it?.tanggal_rilis_manga ? String(it.tanggal_rilis_manga).slice(0,10) : '',
          rating_manga: (it?.rating_manga ?? it?.rating) !== undefined && (it?.rating_manga ?? it?.rating) !== null ? String(it?.rating_manga ?? it?.rating) : '',
        });
        setExistingCoverUrl(it?.cover_manga || '');
        setCoverMode('upload');
        setCoverUrl('');
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

  useEffect(() => {
    if (!user?.token) return;
    if (!grabJob?.id) return;

    let cancelled = false;
    let timer = null;

    const loadJob = async () => {
      try {
        const res = await getMangaKomikuGrabJob({ token: user.token, mangaId: id, jobId: grabJob.id });
        if (cancelled) return;
        const job = res?.job ?? res?.data?.job ?? res?.data ?? res ?? null;
        if (!job) return;

        setGrabJob(job);

        const nextText = formatGrabJobStatus(job);
        if (nextText) setGrabStatusText(nextText);

        const status = String(job?.status || '').toUpperCase();
        if (['COMPLETED', 'FAILED', 'PARTIAL'].includes(status)) {
          if (status === 'COMPLETED') {
            setGrabbing(false);
            loadChapters();
          } else {
            setGrabbing(false);
          }
          return;
        }

        timer = setTimeout(loadJob, 2500);
      } catch (err) {
        if (cancelled) return;
        setGrabStatusText(err?.message || 'Gagal membaca progres grab.');
        timer = setTimeout(loadJob, 4000);
      }
    };

    loadJob();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [grabJob?.id, id, user?.token]);

  const grabStatusTone = useMemo(() => {
    const status = String(grabJob?.status || '').toUpperCase();
    if (status === 'FAILED') return { bg: '#FECACA', fg: '#7F1D1D' };
    if (status === 'PARTIAL') return { bg: '#FDE68A', fg: '#78350F' };
    if (status === 'COMPLETED') return { bg: '#BBF7D0', fg: '#14532D' };
    if (status === 'RUNNING' || status === 'PENDING') return { bg: '#DBEAFE', fg: '#1E3A8A' };
    return { bg: 'var(--panel-bg)', fg: 'var(--foreground)' };
  }, [grabJob?.status]);

  const updateField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setSaving(true);
      const payload = buildMangaUpdate(form);
      const nextCoverMode = String(coverMode || 'upload');
      const nextCoverUrl = String(coverUrl || '').trim();
      if (nextCoverMode === 'upload' && coverFile instanceof File) payload.cover = coverFile;
      if (nextCoverMode === 'url' && nextCoverUrl) payload.cover_manga = nextCoverUrl;
      const res = await updateManga({ token, id, payload });
      toast.success('Manga disimpan');
      setCoverMode('upload');
      setCoverUrl('');
      setCoverFile(null);
      setCoverPreviewUrl('');
      const nextItem = res?.item || res?.data || res;
      if (nextItem?.cover_manga) setExistingCoverUrl(nextItem.cover_manga);
      else if (payload?.cover_manga) setExistingCoverUrl(payload.cover_manga);
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
      setGrabStatusText('Memulai proses grab di backend...');
      const num = Number(grab.chapter_number);
      if (!Number.isFinite(num)) throw new Error('chapter_number tidak valid');

      const res = await grabMangaChapterPlan({
        token,
        mangaId: id,
        chapterNumber: num,
        url: grab.url,
        title: grab.title || undefined,
        plan_only: false,
      });

      const created = Number(res?.pages_created ?? res?.data?.pages_created ?? 0) || 0;
      const replaced = Number(res?.pages_replaced ?? res?.data?.pages_replaced ?? 0) || 0;
      const removed = Number(res?.pages_removed ?? res?.data?.pages_removed ?? 0) || 0;
      const job = res?.job ?? res?.data?.job ?? null;

      if (job?.id) {
        setGrabJob(job);
        setGrabStatusText(formatGrabJobStatus(job) || 'Job grab sudah dibuat, menunggu progres...');
      } else {
        setGrabJob(null);
        setGrabStatusText(`Grab selesai. +${created} dibuat, ${replaced} diganti, ${removed} dihapus.`);
      }

      toast.success(`Grab selesai. +${created} dibuat, ${replaced} diganti, ${removed} dihapus`);
      setGrab((g) => ({ ...g, url: '', title: '' }));
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title flex items-center gap-2"><BookOpen className="size-5" /> Detail Manga</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => router.push('/dashboard/manga-admin')} className="btn btn--secondary btn--sm"><ArrowLeft className="size-4" /> Kembali</button>
            </div>
          </div>

          {loadingItem ? (
            <div className="text-sm">Memuat...</div>
          ) : (
            <form onSubmit={onSave} className="card card--lg space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <L label="Judul"><input value={form.judul_manga} onChange={(e)=>updateField('judul_manga', e.target.value)} required className="input" /></L>
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
                    {(coverPreviewUrl || (coverMode === 'url' ? String(coverUrl || '').trim() : existingCoverUrl)) && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="label">Preview:</span>
                        <img src={coverPreviewUrl || (coverMode === 'url' ? coverUrl : existingCoverUrl)} alt="cover" className="w-10 h-10 object-contain border-2 border-[var(--border)] rounded" style={{ background: 'var(--surface)' }} loading="lazy" decoding="async" />
                      </div>
                    )}
                  </div>
                </L>
                <L label="Sinopsis"><input value={form.sinopsis_manga} onChange={(e)=>updateField('sinopsis_manga', e.target.value)} className="input" /></L>
                <L label="Genre (comma)"><input value={form.genre_manga} onChange={(e)=>updateField('genre_manga', e.target.value)} className="input" placeholder="Action,Comedy" /></L>
                <L label="Type">
                  <select value={form.type_manga} onChange={(e)=>updateField('type_manga', e.target.value)} className="select">
                    <option value="MANGA">MANGA</option>
                    <option value="MANHWA">MANHWA</option>
                    <option value="MANHUA">MANHUA</option>
                    <option value="COMIC">COMIC</option>
                  </select>
                </L>
                <L label="Status">
                  <select value={form.status_manga} onChange={(e)=>updateField('status_manga', e.target.value)} className="select">
                    <option value="ONGOING">ONGOING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="HIATUS">HIATUS</option>
                    <option value="UPCOMING">UPCOMING</option>
                  </select>
                </L>
                <L label="Author"><input value={form.author} onChange={(e)=>updateField('author', e.target.value)} className="input" /></L>
                <L label="Artist"><input value={form.artist} onChange={(e)=>updateField('artist', e.target.value)} className="input" /></L>
                <L label="Label"><input value={form.label_manga} onChange={(e)=>updateField('label_manga', e.target.value)} className="input" /></L>
                <L label="Rilis"><input type="date" value={form.tanggal_rilis_manga} onChange={(e)=>updateField('tanggal_rilis_manga', e.target.value)} className="input" /></L>
                <L label="Rating"><input type="number" step="0.1" min="0" max="10" value={form.rating_manga} onChange={(e)=>updateField('rating_manga', e.target.value)} className="input" /></L>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button disabled={saving} type="submit" className="btn btn--primary">{saving ? 'Menyimpan...' : (<><Save className="size-4" /> Simpan</>)}</button>
                <button type="button" onClick={onDelete} className="btn btn--danger btn--sm" title="Hapus"><Trash2 className="size-4" /> Hapus</button>
              </div>
            </form>
          )}

          {/* Chapters */}
          <div className="card card--lg space-y-4">
            <div className="section-title">Chapters</div>
            <form onSubmit={onCreateChapter} className="flex flex-wrap items-center gap-2">
              <input type="number" placeholder="chapter_number" value={newChapter.chapter_number} onChange={(e)=>setNewChapter(c=>({...c, chapter_number: e.target.value}))} className="input" style={{ maxWidth: '160px' }} />
              <input placeholder="title (opsional)" value={newChapter.title} onChange={(e)=>setNewChapter(c=>({...c, title: e.target.value}))} className="input" style={{ maxWidth: '240px' }} />
              <button className="btn btn--primary btn--sm"><Plus className="size-4" /> Tambah</button>
            </form>

            <div className="card overflow-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-[var(--border)]">
                    <th className="text-left px-4 py-3 label">ID</th>
                    <th className="text-left px-4 py-3 label">Chapter</th>
                    <th className="text-left px-4 py-3 label">Judul</th>
                    <th className="text-left px-4 py-3 label">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {chapters.map((ch) => (
                    <tr key={ch.id} className="border-b border-[var(--border)]">
                      <td className="px-4 py-3 font-semibold">{ch.id}</td>
                      <td className="px-4 py-3 font-extrabold">{ch.chapter_number}</td>
                      <td className="px-4 py-3">{ch.title || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a href={`/dashboard/manga-admin/${id}/chapters/${ch.chapter_number}`} className="btn btn--secondary btn--sm">Lihat Halaman</a>
                          <button onClick={() => onDeleteChapter(ch.id)} className="btn btn--danger btn--sm btn--icon" title="Hapus"><Trash2 className="size-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {chapters.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm opacity-70">{loadingChapters ? 'Memuat...' : 'Tidak ada data.'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grab Tab */}
          <div className="card card--lg space-y-4">
            <div className="section-title flex items-center gap-2"><Download className="size-4" /> Grab Komiku</div>
            <div className="text-sm font-semibold opacity-80">
              Grab sekarang memakai flow backend-managed upload. Backend akan download gambar dari source, upload ke storage, lalu replace/update pages chapter secara otomatis.
            </div>
            <form onSubmit={onGrab} className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
              <input type="number" placeholder="chapter_number" value={grab.chapter_number} onChange={(e)=>setGrab(g=>({...g, chapter_number: e.target.value}))} className="input" style={{ maxWidth: '160px' }} />
              <input placeholder="Komiku chapter URL" value={grab.url} onChange={(e)=>setGrab(g=>({...g, url: e.target.value}))} className="input" />
              <input placeholder="Judul (opsional)" value={grab.title} onChange={(e)=>setGrab(g=>({...g, title: e.target.value}))} className="input" style={{ maxWidth: '200px' }} />
              <button disabled={grabbing} className="btn btn--primary btn--sm">{grabbing ? 'Mengambil...' : (<><Download className="size-4" /> Grab</>)}</button>
            </form>
            <div className="card px-3 py-2 text-sm font-semibold" style={{ background: grabStatusTone.bg, color: grabStatusTone.fg }}>
              {grabStatusText}
            </div>
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
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <label className="label sm:w-28 sm:flex-shrink-0">{label}</label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function buildMangaUpdate(form) {
  const out = {};
  const str = (k) => { const v = form?.[k]; if (v === undefined || v === null) return; const s = String(v).trim(); if (s !== '') out[k] = s; };
  str('judul_manga'); str('sinopsis_manga');
  if (typeof form?.genre_manga === 'string') { const arr = form.genre_manga.split(',').map(s=>s.trim()).filter(Boolean); out.genre_manga = arr; }
  if (form?.type_manga) out.type_manga = String(form.type_manga).toUpperCase();
  if (form?.status_manga) out.status_manga = String(form.status_manga).toUpperCase();
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

function formatGrabJobStatus(job) {
  if (!job) return '';
  const status = String(job?.status || '').toUpperCase();
  const stage = String(job?.current_stage || '').trim();
  const chapterLabel = String(job?.current_chapter_label || job?.current_chapter_number || '').trim();
  const processed = Number(job?.processed_chapters ?? 0) || 0;
  const total = Number(job?.total_chapters ?? 0) || 0;
  const success = Number(job?.success_chapters ?? 0) || 0;
  const failed = Number(job?.failed_chapters ?? 0) || 0;
  const errorMessage = String(job?.error_message || '').trim();

  if (status === 'FAILED') return errorMessage || 'Grab gagal diproses di backend.';
  if (status === 'PARTIAL') return `Grab selesai sebagian. ${success} chapter berhasil, ${failed} gagal${total ? ` dari ${total}` : ''}.`;
  if (status === 'COMPLETED') return `Grab selesai. ${success || processed}${total ? ` dari ${total}` : ''} chapter berhasil diproses.`;
  if (status === 'PENDING') return 'Job grab sudah masuk antrian, menunggu backend mulai memproses...';
  if (status === 'RUNNING') {
    if (chapterLabel) return `Sedang grab chapter ${chapterLabel}${stage ? ` (${stage})` : ''}${total ? ` • ${processed}/${total}` : ''}`;
    if (stage) return `Sedang memproses grab (${stage})${total ? ` • ${processed}/${total}` : ''}`;
    return `Sedang memproses grab${total ? ` • ${processed}/${total}` : ''}`;
  }
  return 'Proses grab sedang berjalan...';
}

