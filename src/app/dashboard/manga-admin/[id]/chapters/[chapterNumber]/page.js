'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, LoaderCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getMangaChapterPages, uploadMangaChapterImages, deletePageById, deletePageByNumber } from '@/lib/api';

export default function ChapterPagesPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const id = params?.id;
  const chapterNumber = params?.chapterNumber;

  const [loadingPages, setLoadingPages] = useState(true);
  const [chapter, setChapter] = useState(null);
  const [pages, setPages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState(null);
  const [queueFiles, setQueueFiles] = useState([]); // draft stack before upload
  const [deletingPageId, setDeletingPageId] = useState(null);

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      if (!id || !chapterNumber) return;
      setLoadingPages(true);
      try {
        const token = getSession()?.token;
        const res = await getMangaChapterPages({ token, mangaId: id, chapterNumber: Number(chapterNumber) });
        setChapter(res?.chapter || null);
        setPages(Array.isArray(res?.pages) ? res.pages : []);
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat halaman');
      } finally {
        setLoadingPages(false);
      }
    };
    load();
  }, [id, chapterNumber]);

  const onAddToQueue = (e) => {
    e.preventDefault();
    if (!files || (files instanceof FileList && files.length === 0)) {
      toast.error('Pilih file gambar');
      return;
    }
    const f = files instanceof FileList ? files[0] : (Array.isArray(files) ? files[0] : files);
    if (!(f instanceof File)) {
      toast.error('File tidak valid');
      return;
    }
    setQueueFiles((q) => [...q, f]);
    setFiles(null);
  };

  const onRemoveQueued = (idx) => {
    setQueueFiles((q) => q.filter((_, i) => i !== idx));
  };

  const onUploadAll = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setUploading(true);
      if (!queueFiles.length) throw new Error('Tidak ada page dalam antrean');
      await uploadMangaChapterImages({ token, mangaId: id, chapterNumber: Number(chapterNumber), files: queueFiles, title: title || undefined });
      setTitle('');
      setQueueFiles([]);
      await (async () => {
        setLoadingPages(true);
        try {
          const res = await getMangaChapterPages({ token, mangaId: id, chapterNumber: Number(chapterNumber) });
          setChapter(res?.chapter || null);
          setPages(Array.isArray(res?.pages) ? res.pages : []);
        } finally {
          setLoadingPages(false);
        }
      })();
      toast.success('Upload halaman berhasil');
    } catch (err) {
      toast.error(err?.message || 'Gagal upload halaman');
    } finally {
      setUploading(false);
    }
  };

  const onDeletePage = async (p) => {
    const token = getSession()?.token;
    try {
      setDeletingPageId(p.id || `num-${p.page_number}`);
      if (p.id) {
        await deletePageById({ token, id: p.id });
      } else {
        await deletePageByNumber({ token, mangaId: id, chapterNumber: Number(chapterNumber), pageNumber: p.page_number });
      }
      setLoadingPages(true);
      const res = await getMangaChapterPages({ token, mangaId: id, chapterNumber: Number(chapterNumber) });
      setChapter(res?.chapter || null);
      setPages(Array.isArray(res?.pages) ? res.pages : []);
      toast.success('Halaman dihapus');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus halaman');
    } finally {
      setDeletingPageId(null);
      setLoadingPages(false);
    }
  };

  return (
    <div className="space-y-4">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title flex items-center gap-2">Chapter {chapter?.chapter_number || chapterNumber}: {chapter?.title || '-'}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {loadingPages && (<span className="text-xs font-extrabold opacity-70">Memuat...</span>)}
              <button onClick={() => router.back()} className="btn btn--secondary btn--sm"><ArrowLeft className="size-4" /> Kembali</button>
            </div>
          </div>
          <form className="card flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
            <span className="text-sm font-extrabold self-center">Page {(Array.isArray(pages) && pages.length ? Math.max(...pages.map(p=>Number(p.page_number)||0)) + queueFiles.length + 1 : (queueFiles.length + 1))}</span>
            <input placeholder="Judul (opsional)" value={title} onChange={(e)=>setTitle(e.target.value)} className="input" />
            <input type="file" accept="image/*" onChange={(e)=>setFiles(e.target.files)} className="input" />
            <button onClick={onAddToQueue} disabled={uploading || !files || (files instanceof FileList && files.length === 0)} className="btn btn--secondary btn--sm">{uploading ? 'Menambah...' : (<><Plus className="size-4" /> Tambah Page</>)}</button>
            <button onClick={onUploadAll} disabled={uploading || !queueFiles.length} className="btn btn--primary btn--sm">{uploading ? 'Mengupload...' : 'Upload Semua'}</button>
          </form>

          {queueFiles.length > 0 && (
            <div className="card space-y-4">
              <div className="section-title">Antrean (belum dikirim): {queueFiles.length} file</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {queueFiles.map((f, idx) => (
                  <div key={idx} className="card p-2">
                    <div className="text-xs font-extrabold mb-1">Draft Page { (Array.isArray(pages) && pages.length ? Math.max(...pages.map(p=>Number(p.page_number)||0)) : 0) + idx + 1 }</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(f)} alt={`draft-${idx}`} className="w-full h-auto" loading="lazy" decoding="async" />
                    <div className="mt-2">
                      <button onClick={() => onRemoveQueued(idx)} className="btn btn--danger btn--sm btn--icon" title="Hapus"><Trash2 className="size-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {loadingPages ? (
            <div className="text-sm">Memuat...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {pages.map((p) => (
                <div key={p.id || p.page_number} className="card p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold">Page {p.page_number}</div>
                    <button onClick={() => onDeletePage(p)} disabled={deletingPageId === (p.id || `num-${p.page_number}`)} className="btn btn--danger btn--sm btn--icon" title="Hapus">
                      {deletingPageId === (p.id || `num-${p.page_number}`) ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt={`Page ${p.page_number}`} className="w-full h-auto" loading="lazy" decoding="async" />
                </div>
              ))}
              {pages.length === 0 && (
                <div className="card p-6 text-center text-sm opacity-70">Tidak ada halaman.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

