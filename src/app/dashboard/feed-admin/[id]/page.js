'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Video, ArrowLeft, Trash2, RotateCcw, Loader2, Heart, MessageCircle, Eye, Bookmark, Flag, AlertTriangle, Search, CornerDownRight } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getFeedDetail, softDeleteFeed, restoreFeed, permanentDeleteFeed, listFeedComments, softDeleteFeedComment, restoreFeedComment, permanentDeleteFeedComment } from '@/lib/api';

export default function FeedDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const id = params?.id;

  const [post, setPost] = useState(null);
  const [loadingItem, setLoadingItem] = useState(true);
  const [softDeleting, setSoftDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [permaDeleting, setPermaDeleting] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(0);
  const [commentsSearch, setCommentsSearch] = useState('');
  const [commentsFilterDeleted, setCommentsFilterDeleted] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentActionId, setCommentActionId] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadPost = async () => {
    if (!id) return;
    setLoadingItem(true);
    try {
      const token = getSession()?.token;
      const data = await getFeedDetail({ token, id });
      setPost(data);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat detail feed');
    } finally {
      setLoadingItem(false);
    }
  };

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadComments = async (pg = commentsPage) => {
    if (!id) return;
    setLoadingComments(true);
    try {
      const token = getSession()?.token;
      const data = await listFeedComments({
        token,
        post_id: id,
        search: commentsSearch,
        is_deleted: commentsFilterDeleted,
        page: pg,
        limit: 20,
      });
      setComments(data.items);
      setCommentsTotal(data.total);
      setCommentsPage(data.page);
      setCommentsTotalPages(data.total_pages);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat komentar');
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (post) loadComments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post]);

  const onSearchComments = async (e) => {
    e.preventDefault();
    setCommentsPage(1);
    await loadComments(1);
  };

  const onSoftDeleteComment = async (cid) => {
    if (!confirm('Soft delete komentar ini?')) return;
    const token = getSession()?.token;
    try {
      setCommentActionId(cid);
      await softDeleteFeedComment({ token, id: cid });
      toast.success('Komentar di-soft delete');
      await loadComments();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus komentar');
    } finally {
      setCommentActionId(null);
    }
  };

  const onRestoreComment = async (cid) => {
    const token = getSession()?.token;
    try {
      setCommentActionId(cid);
      await restoreFeedComment({ token, id: cid });
      toast.success('Komentar dipulihkan');
      await loadComments();
    } catch (err) {
      toast.error(err?.message || 'Gagal memulihkan komentar');
    } finally {
      setCommentActionId(null);
    }
  };

  const onPermanentDeleteComment = async (cid) => {
    if (!confirm('Hapus komentar ini secara PERMANEN? Semua balasan terkait juga akan terhapus.')) return;
    const token = getSession()?.token;
    try {
      setCommentActionId(cid);
      await permanentDeleteFeedComment({ token, id: cid });
      toast.success('Komentar dihapus permanen');
      await loadComments();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus komentar permanen');
    } finally {
      setCommentActionId(null);
    }
  };

  const onSoftDelete = async () => {
    if (!confirm('Soft delete post ini? Post tidak akan tampil di feed tetapi masih ada di database.')) return;
    const token = getSession()?.token;
    try {
      setSoftDeleting(true);
      await softDeleteFeed({ token, id });
      toast.success('Post di-soft delete');
      await loadPost();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus post');
    } finally {
      setSoftDeleting(false);
    }
  };

  const onRestore = async () => {
    const token = getSession()?.token;
    try {
      setRestoring(true);
      await restoreFeed({ token, id });
      toast.success('Post dipulihkan');
      await loadPost();
    } catch (err) {
      toast.error(err?.message || 'Gagal memulihkan post');
    } finally {
      setRestoring(false);
    }
  };

  const onPermanentDelete = async () => {
    if (!confirm('Hapus post ini secara PERMANEN? Semua data terkait (likes, comments, views, reports) akan terhapus dan tidak dapat dikembalikan.')) return;
    const token = getSession()?.token;
    try {
      setPermaDeleting(true);
      await permanentDeleteFeed({ token, id });
      toast.success('Post dihapus permanen');
      router.push('/dashboard/feed-admin');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus post permanen');
    } finally {
      setPermaDeleting(false);
    }
  };

  const fmtDate = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return d; }
  };

  const fmtNum = (n) => Number(n ?? 0).toLocaleString();
  const fmtSize = (b) => {
    const bytes = Number(b ?? 0);
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const reports = Array.isArray(post?.reports) ? post.reports : [];
  const tags = Array.isArray(post?.tags) ? post.tags : [];
  const animes = Array.isArray(post?.animes) ? post.animes : [];

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title flex items-center gap-2"><Video className="size-5" /> Detail Feed Post</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => router.push('/dashboard/feed-admin')} className="btn btn--secondary btn--sm">
                <ArrowLeft className="size-4" /> Kembali
              </button>
            </div>
          </div>

          {loadingItem ? (
            <div className="text-sm flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Memuat...</div>
          ) : post ? (
            <>
              {/* Post Info */}
              <div className="card card--lg space-y-4">
                <div className="flex items-start gap-4 flex-wrap">
                  {post.cover_url && (
                    <img src={post.cover_url} alt="cover" className="w-24 h-24 object-cover rounded border-2 border-[var(--border)]" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-extrabold">Post #{post.id}</h3>
                      {post.is_deleted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#ef4444' }}><Trash2 className="size-3" /> Dihapus</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#22c55e' }}><Eye className="size-3" /> Aktif</span>
                      )}
                      {Number(post.reports_count) > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#dc2626' }}><Flag className="size-3" /> {post.reports_count} Laporan</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {post.avatar_url && <img src={post.avatar_url} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-[var(--border)]" loading="lazy" />}
                      <span className="text-sm font-bold">{post.username || `#${post.user_id}`}</span>
                      {post.full_name && <span className="text-sm opacity-70">{post.full_name}</span>}
                    </div>
                    {post.caption && <p className="text-sm opacity-80">{post.caption}</p>}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBox icon={Heart} label="Likes" value={fmtNum(post.likes_count)} color="#ec4899" />
                  <StatBox icon={MessageCircle} label="Comments" value={fmtNum(post.comments_count)} color="#3b82f6" />
                  <StatBox icon={Eye} label="Views" value={fmtNum(post.views_count)} color="#f59e0b" />
                  <StatBox icon={Bookmark} label="Bookmarks" value={fmtNum(post.bookmarks_count)} color="#a855f7" />
                </div>

                {/* Meta Info */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Info label="Prefix" value={post.prefix || '-'} />
                  <Info label="Ukuran Video" value={fmtSize(post.video_size_bytes)} />
                  <Info label="Resolusi" value={post.video_width && post.video_height ? `${post.video_width}x${post.video_height}` : '-'} />
                  <Info label="Aspect Ratio" value={post.aspect_ratio || '-'} />
                  <Info label="Dibuat" value={fmtDate(post.created_at)} />
                  <Info label="Diperbarui" value={fmtDate(post.updated_at)} />
                  {post.is_deleted && <Info label="Dihapus Pada" value={fmtDate(post.deleted_at)} />}
                </div>

                {/* Tags & Anime */}
                {(tags.length > 0 || animes.length > 0) && (
                  <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                    {tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="label text-xs">Tags:</span>
                        {tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs font-bold border border-[var(--border)] rounded" style={{ fontFamily: 'var(--font-mono)' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {animes.length > 0 && (
                      <div className="space-y-1">
                        <span className="label text-xs">Anime Terkait:</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {animes.map((a) => (
                            <span key={a.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold border border-[var(--border)] rounded">
                              {a.cover_url && <img src={a.cover_url} alt="cover" className="w-4 h-4 object-cover rounded" loading="lazy" />}
                              {a.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Video Player */}
                {post.master_url && !post.is_deleted && (
                  <div className="pt-2 border-t border-[var(--border)]">
                    <span className="label text-xs">Preview Video</span>
                    <video
                      src={post.master_url}
                      poster={post.cover_url}
                      controls
                      className="w-full max-h-80 rounded border border-[var(--border)] mt-1"
                      style={{ background: 'var(--surface)' }}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--border)]">
                  {post.is_deleted ? (
                    <button onClick={onRestore} disabled={restoring} className="btn btn--primary btn--sm">
                      {restoring ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Pulihkan
                    </button>
                  ) : (
                    <button onClick={onSoftDelete} disabled={softDeleting} className="btn btn--secondary btn--sm">
                      {softDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Soft Delete
                    </button>
                  )}
                  <button onClick={onPermanentDelete} disabled={permaDeleting} className="btn btn--danger btn--sm">
                    {permaDeleting ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />} Hapus Permanen
                  </button>
                </div>
              </div>

              {/* Reports */}
              {reports.length > 0 && (
                <div className="card card--lg space-y-4">
                  <div className="section-title flex items-center gap-2"><Flag className="size-4" /> Laporan ({reports.length})</div>
                  <div className="card overflow-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b-2 border-[var(--border)]">
                          <th className="text-left px-4 py-3 label">ID</th>
                          <th className="text-left px-4 py-3 label">Pelapor</th>
                          <th className="text-left px-4 py-3 label">Tipe</th>
                          <th className="text-left px-4 py-3 label">Catatan</th>
                          <th className="text-left px-4 py-3 label">Status</th>
                          <th className="text-left px-4 py-3 label">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((r) => (
                          <tr key={r.id} className="border-b border-[var(--border)]">
                            <td className="px-4 py-3 font-semibold">{r.id}</td>
                            <td className="px-4 py-3 font-bold text-sm">{r.reporter_username || `#${r.reporter_id}`}</td>
                            <td className="px-4 py-3 text-sm">{r.type_label || '-'}</td>
                            <td className="px-4 py-3 text-sm max-w-xs truncate">{r.note || '-'}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-bold uppercase" style={{
                                color: r.status === 'PENDING' ? '#f59e0b' : r.status === 'RESOLVED' ? '#22c55e' : r.status === 'REJECTED' ? '#ef4444' : 'var(--muted)',
                              }}>
                                {r.status || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs opacity-70">{fmtDate(r.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Comments Monitoring */}
              <div className="card card--lg space-y-4">
                <div className="section-title flex items-center gap-2"><MessageCircle className="size-4" /> Komentar ({commentsTotal})</div>

                {/* Comment Filters */}
                <form onSubmit={onSearchComments} className="filter-bar flex-wrap">
                  <input
                    placeholder="Cari komentar..."
                    value={commentsSearch}
                    onChange={(e) => setCommentsSearch(e.target.value)}
                    className="input"
                  />
                  <select value={commentsFilterDeleted} onChange={(e) => setCommentsFilterDeleted(e.target.value)} className="select">
                    <option value="">Semua Status</option>
                    <option value="false">Aktif</option>
                    <option value="true">Dihapus</option>
                  </select>
                  <button disabled={loadingComments} className="btn btn--primary btn--sm">
                    {loadingComments ? 'Memuat...' : (<><Search className="size-4" /> Cari</>)}
                  </button>
                </form>

                {/* Comments Table */}
                <div className="card overflow-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b-2 border-[var(--border)]">
                        <th className="text-left px-4 py-3 label">ID</th>
                        <th className="text-left px-4 py-3 label">User</th>
                        <th className="text-left px-4 py-3 label">Konten</th>
                        <th className="text-left px-4 py-3 label">Stats</th>
                        <th className="text-left px-4 py-3 label">Status</th>
                        <th className="text-left px-4 py-3 label">Tanggal</th>
                        <th className="text-left px-4 py-3 label">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comments.map((c) => (
                        <tr key={c.id} className="border-b border-[var(--border)]">
                          <td className="px-4 py-3 font-semibold">{c.id}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {c.avatar_url && <img src={c.avatar_url} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-[var(--border)]" loading="lazy" />}
                              <span className="font-bold text-sm">{c.username || `#${c.user_id}`}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-xs text-sm">
                            {c.parent_comment_id && (
                              <span className="inline-flex items-center gap-1 text-xs opacity-60 mb-1"><CornerDownRight className="size-3" /> Balasan</span>
                            )}
                            <div className={c.is_edited ? 'italic' : ''}>{c.content || '-'}{c.is_edited && ' (diedit)'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <span className="inline-flex items-center gap-1" title="Loves"><Heart className="size-3" /> {fmtNum(c.loves_count)}</span>
                              <span className="inline-flex items-center gap-1" title="Replies"><MessageCircle className="size-3" /> {fmtNum(c.replies_count)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {c.is_deleted ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#ef4444' }}><Trash2 className="size-3" /> Dihapus</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#22c55e' }}><Eye className="size-3" /> Aktif</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs opacity-70">{fmtDate(c.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {c.is_deleted ? (
                                <button
                                  onClick={() => onRestoreComment(c.id)}
                                  disabled={commentActionId === c.id}
                                  className="btn btn--primary btn--sm btn--icon"
                                  title="Pulihkan"
                                >
                                  {commentActionId === c.id ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                                </button>
                              ) : (
                                <button
                                  onClick={() => onSoftDeleteComment(c.id)}
                                  disabled={commentActionId === c.id}
                                  className="btn btn--secondary btn--sm btn--icon"
                                  title="Soft Delete"
                                >
                                  {commentActionId === c.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                </button>
                              )}
                              <button
                                onClick={() => onPermanentDeleteComment(c.id)}
                                disabled={commentActionId === c.id}
                                className="btn btn--danger btn--sm btn--icon"
                                title="Hapus Permanen"
                              >
                                {commentActionId === c.id ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {comments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-sm opacity-70">
                            {loadingComments ? <Loader2 className="size-5 animate-spin mx-auto" /> : 'Tidak ada komentar.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Comments Pagination */}
                {commentsTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs opacity-70" style={{ fontFamily: 'var(--font-mono)' }}>
                      Hal {commentsPage} / {commentsTotalPages} • {commentsTotal} komentar
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={commentsPage <= 1 || loadingComments}
                        onClick={() => loadComments(commentsPage - 1)}
                        className="btn btn--secondary btn--sm"
                      >
                        Sebelumnya
                      </button>
                      <button
                        disabled={commentsPage >= commentsTotalPages || loadingComments}
                        onClick={() => loadComments(commentsPage + 1)}
                        className="btn btn--secondary btn--sm"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm opacity-70">Post tidak ditemukan.</div>
          )}
        </>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="space-y-0.5">
      <div className="label text-xs">{label}</div>
      <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div className="card space-y-1">
      <div className="flex items-center gap-2">
        <Icon className="size-4" style={{ color }} />
        <span className="label text-xs">{label}</span>
      </div>
      <div className="text-lg font-extrabold" style={{ fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  );
}
