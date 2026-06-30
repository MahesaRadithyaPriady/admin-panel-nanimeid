'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, LoaderCircle, FileArchive, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getMangaChapterPages, uploadMangaChapterZip, deletePageById, deletePageByNumber } from '@/lib/api';
import FileInput from '@/components/dashboard/FileInput';

export default function ChapterPagesPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const id = params?.id;
  const chapterNumber = params?.chapterNumber;

  const [loadingPages, setLoadingPages] = useState(true);
  const [chapter, setChapter] = useState(null);
  const [pages, setPages] = useState([]);
  const [deletingPageId, setDeletingPageId] = useState(null);

  // ZIP upload state
  const [zipFile, setZipFile] = useState(null);
  const [zipTitle, setZipTitle] = useState('');
  const [zipReplace, setZipReplace] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

  const loadPages = async () => {
    const token = getSession()?.token;
    setLoadingPages(true);
    try {
      const res = await getMangaChapterPages({ token, mangaId: id, chapterNumber: Number(chapterNumber) });
      setChapter(res?.chapter || null);
      setPages(Array.isArray(res?.pages) ? res.pages : []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat halaman');
    } finally {
      setLoadingPages(false);
    }
  };

  useEffect(() => {
    if (!id || !chapterNumber) return;
    loadPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, chapterNumber]);

  const onZipUpload = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setUploading(true);
      if (!zipFile) throw new Error('Pilih file .zip terlebih dahulu');
      const res = await uploadMangaChapterZip({
        token,
        mangaId: id,
        chapterNumber: Number(chapterNumber),
        zipFile,
        title: zipTitle || undefined,
        replace: zipReplace,
      });
      const uploaded = res?.pages_uploaded ?? 0;
      const failed = res?.pages_failed ?? 0;
      if (failed > 0) {
        toast.success(`${uploaded} halaman terupload, ${failed} gagal`);
      } else {
        toast.success(`${uploaded} halaman terupload`);
      }
      setZipFile(null);
      setZipTitle('');
      setZipReplace(false);
      await loadPages();
    } catch (err) {
      toast.error(err?.message || 'Gagal upload zip');
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
      await loadPages();
      toast.success('Halaman dihapus');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus halaman');
    } finally {
      setDeletingPageId(null);
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
          {/* ZIP Upload */}
          <form onSubmit={onZipUpload} className="card card--lg space-y-4">
            <div className="section-title flex items-center gap-2"><FileArchive className="size-4" /> Upload ZIP</div>
            <div className="text-sm font-semibold opacity-80">
              Upload file .zip berisi gambar manga. Backend akan otomatis mengekstrak, mengurutkan, dan meng-upload semua gambar sebagai page.
              Format gambar yang didukung: .jpg, .jpeg, .png, .webp, .gif. Maks 500MB.
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="label">File ZIP</label>
                <FileInput
                  accept=".zip"
                  onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                  placeholder="Pilih file .zip..."
                  disabled={uploading}
                />
                {zipFile && (
                  <div className="text-xs font-mono opacity-70">
                    {zipFile.name} — {(zipFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="label">Judul Chapter (opsional)</label>
                <input
                  value={zipTitle}
                  onChange={(e) => setZipTitle(e.target.value)}
                  placeholder="Mis. Chapter 1"
                  className="input"
                  disabled={uploading}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={zipReplace}
                  onChange={(e) => setZipReplace(e.target.checked)}
                  disabled={uploading}
                />
                Replace halaman lama
              </label>
              {zipReplace && pages.length > 0 && (
                <span className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                  <AlertTriangle className="size-3" /> {pages.length} halaman lama akan dihapus
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="submit"
                disabled={uploading || !zipFile}
                className="btn btn--primary"
              >
                {uploading ? (
                  <><LoaderCircle className="size-4 animate-spin" /> Mengupload & mengekstrak...</>
                ) : (
                  <><Upload className="size-4" /> Upload ZIP</>
                )}
              </button>
              {uploading && (
                <span className="text-xs font-semibold opacity-70">
                  Proses bisa memakan waktu beberapa menit untuk zip dengan gambar banyak.
                </span>
              )}
            </div>
          </form>

          {/* Pages list */}
          {loadingPages ? (
            <div className="text-sm">Memuat...</div>
          ) : (
            <div className="space-y-3">
              <div className="section-title">Halaman ({pages.length})</div>
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
                <div className="card p-6 text-center text-sm opacity-70">Tidak ada halaman. Upload ZIP untuk menambahkan.</div>
              )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

