'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
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
  }, [id, chapterNumber, isAllowed]);

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
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold">Chapter {chapter?.chapter_number || chapterNumber}: {chapter?.title || '-'}</div>
            <div className="flex items-center gap-2">
              {loadingPages && (<span className="text-xs font-extrabold opacity-70">Memuat...</span>)}
              <button onClick={() => router.back()} className="btn-pg flex items-center gap-2"><ArrowLeft className="size-4" /> Kembali</button>
            </div>
          </div>
          <form className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-extrabold">Page {(Array.isArray(pages) && pages.length ? Math.max(...pages.map(p=>Number(p.page_number)||0)) + queueFiles.length + 1 : (queueFiles.length + 1))}</span>
            <input placeholder="Judul (opsional)" value={title} onChange={(e)=>setTitle(e.target.value)} className="inp" />
            <input type="file" accept="image/*" onChange={(e)=>setFiles(e.target.files)} className="inp" />
            <button onClick={onAddToQueue} disabled={uploading || !files || (files instanceof FileList && files.length === 0)} className="btn-add">{uploading ? 'Menambah...' : (<><Plus className="size-4" /> Tambah Page</>)}</button>
            <button onClick={onUploadAll} disabled={uploading || !queueFiles.length} className="btn-pri">{uploading ? 'Mengupload...' : 'Upload Semua'}</button>
          </form>

          {queueFiles.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-extrabold">Antrean (belum dikirim): {queueFiles.length} file</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {queueFiles.map((f, idx) => (
                  <div key={idx} className="border-4 rounded-lg p-2" style={{ borderColor: 'var(--panel-border)' }}>
                    <div className="text-xs font-extrabold mb-1">Draft Page { (Array.isArray(pages) && pages.length ? Math.max(...pages.map(p=>Number(p.page_number)||0)) : 0) + idx + 1 }</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(f)} alt={`draft-${idx}`} className="w-full h-auto" />
                    <div className="mt-2">
                      <button onClick={() => onRemoveQueued(idx)} className="btn-act">Hapus</button>
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
                <div key={p.id || p.page_number} className="border-4 rounded-lg p-2 space-y-2" style={{ borderColor: 'var(--panel-border)' }}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold">Page {p.page_number}</div>
                    <button onClick={() => onDeletePage(p)} disabled={deletingPageId === (p.id || `num-${p.page_number}`)} className="btn-act">
                      {deletingPageId === (p.id || `num-${p.page_number}`) ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt={`Page ${p.page_number}`} className="w-full h-auto" />
                </div>
              ))}
              {pages.length === 0 && (
                <div className="text-sm">Tidak ada halaman.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Local styles (consistent with other admin pages)
const styles = `
.inp { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 600; }
.btn-add { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:4px 4px 0 #000; background: var(--accent-add); color: var(--accent-add-foreground); border-color: var(--panel-border); }
.btn-pri { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:4px 4px 0 #000; background: var(--accent-primary); color: var(--accent-primary-foreground); border-color: var(--panel-border); }
.btn-act { padding:0.25rem 0.5rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:3px 3px 0 #000; background: var(--panel-bg); color: var(--foreground); border-color: var(--panel-border); }
.btn-pg { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; background:#fff; font-weight:800; box-shadow:4px 4px 0 #000; }
`;
if (typeof document !== 'undefined' && !document.getElementById('chapter-pages-styles')) {
  const style = document.createElement('style');
  style.id = 'chapter-pages-styles';
  style.innerHTML = styles;
  document.head.appendChild(style);
}
