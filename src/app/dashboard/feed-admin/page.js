'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Video, Search, ExternalLink, Loader2, Heart, MessageCircle, Eye, Bookmark, Flag, Trash2, RotateCcw } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getFeedStats, listFeed, softDeleteFeed, restoreFeed } from '@/lib/api';

export default function FeedAdminPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [filterDeleted, setFilterDeleted] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterHasReports, setFilterHasReports] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [loadingList, setLoadingList] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const token = getSession()?.token;
      const data = await getFeedStats({ token });
      setStats(data);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat statistik feed');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadList = async () => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const data = await listFeed({
        token,
        search,
        page,
        limit,
        is_deleted: filterDeleted,
        user_id: filterUserId,
        has_reports: filterHasReports,
        sort: sortBy,
        order,
      });
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar feed');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page]);

  const onSearch = async (e) => {
    e.preventDefault();
    setPage(1);
    await loadList();
  };

  const onSoftDelete = async (id) => {
    if (!confirm('Soft delete post ini? Post tidak akan tampil di feed tetapi masih ada di database.')) return;
    const token = getSession()?.token;
    try {
      setActioningId(id);
      await softDeleteFeed({ token, id });
      toast.success('Post di-soft delete');
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus post');
    } finally {
      setActioningId(null);
    }
  };

  const onRestore = async (id) => {
    const token = getSession()?.token;
    try {
      setActioningId(id);
      await restoreFeed({ token, id });
      toast.success('Post dipulihkan');
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal memulihkan post');
    } finally {
      setActioningId(null);
    }
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

  const statCards = [
    { key: 'total_posts', label: 'Total Post', icon: Video, color: 'var(--foreground)' },
    { key: 'active_posts', label: 'Aktif', icon: Eye, color: '#22c55e' },
    { key: 'deleted_posts', label: 'Dihapus', icon: Trash2, color: '#ef4444' },
    { key: 'total_likes', label: 'Likes', icon: Heart, color: '#ec4899' },
    { key: 'total_comments', label: 'Komentar', icon: MessageCircle, color: '#3b82f6' },
    { key: 'total_views', label: 'Views', icon: Eye, color: '#f59e0b' },
    { key: 'total_reports', label: 'Laporan', icon: Flag, color: '#a855f7' },
    { key: 'pending_reports', label: 'Laporan Pending', icon: Flag, color: '#dc2626' },
  ];

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title flex items-center gap-2"><Video className="size-5" /> Feed Admin</h2>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCards.map((s) => (
              <div key={s.key} className="card space-y-2">
                <div className="flex items-center gap-2">
                  <s.icon className="size-4" style={{ color: s.color }} />
                  <span className="label text-xs">{s.label}</span>
                </div>
                <div className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-mono)' }}>
                  {loadingStats ? <Loader2 className="size-5 animate-spin" /> : fmtNum(stats?.[s.key])}
                </div>
              </div>
            ))}
          </div>

          {/* Filter & Search */}
          <form onSubmit={onSearch} className="filter-bar flex-wrap">
            <input
              placeholder="Cari caption/prefix..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
            <input
              type="number"
              placeholder="User ID"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="input"
              style={{ maxWidth: '120px' }}
            />
            <select value={filterDeleted} onChange={(e) => setFilterDeleted(e.target.value)} className="select">
              <option value="">Semua Status</option>
              <option value="false">Aktif</option>
              <option value="true">Dihapus</option>
            </select>
            <select value={filterHasReports} onChange={(e) => setFilterHasReports(e.target.value)} className="select">
              <option value="">Semua Post</option>
              <option value="true">Punya Laporan</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select">
              <option value="createdAt">Dibuat</option>
              <option value="updatedAt">Diperbarui</option>
              <option value="video_size_bytes">Ukuran Video</option>
              <option value="reports">Laporan Terbanyak</option>
            </select>
            <select value={order} onChange={(e) => setOrder(e.target.value)} className="select">
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <button disabled={loadingList} className="btn btn--primary btn--sm">
              {loadingList ? 'Memuat...' : (<><Search className="size-4" /> Cari</>)}
            </button>
          </form>

          {/* Table */}
          <div className="card overflow-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-[var(--border)]">
                  <th className="text-left px-4 py-3 label">ID</th>
                  <th className="text-left px-4 py-3 label">User</th>
                  <th className="text-left px-4 py-3 label">Caption</th>
                  <th className="text-left px-4 py-3 label">Stats</th>
                  <th className="text-left px-4 py-3 label">Ukuran</th>
                  <th className="text-left px-4 py-3 label">Status</th>
                  <th className="text-left px-4 py-3 label">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((post) => (
                  <tr key={post.id} className="border-b border-[var(--border)]">
                    <td className="px-4 py-3 font-semibold">{post.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {post.avatar_url && <img src={post.avatar_url} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-[var(--border)]" loading="lazy" />}
                        <span className="font-bold text-sm">{post.username || `#${post.user_id}`}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-sm">{post.caption || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="inline-flex items-center gap-1" title="Likes"><Heart className="size-3" /> {fmtNum(post.likes_count)}</span>
                        <span className="inline-flex items-center gap-1" title="Comments"><MessageCircle className="size-3" /> {fmtNum(post.comments_count)}</span>
                        <span className="inline-flex items-center gap-1" title="Views"><Eye className="size-3" /> {fmtNum(post.views_count)}</span>
                        {Number(post.reports_count) > 0 && (
                          <span className="inline-flex items-center gap-1 font-bold" style={{ color: '#dc2626' }} title="Reports"><Flag className="size-3" /> {fmtNum(post.reports_count)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">{fmtSize(post.video_size_bytes)}</td>
                    <td className="px-4 py-3">
                      {post.is_deleted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#ef4444' }}><Trash2 className="size-3" /> Dihapus</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#22c55e' }}><Eye className="size-3" /> Aktif</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a href={`/dashboard/feed-admin/${post.id}`} className="btn btn--secondary btn--sm btn--icon" title="Detail">
                          <ExternalLink className="size-4" />
                        </a>
                        {post.is_deleted ? (
                          <button
                            onClick={() => onRestore(post.id)}
                            disabled={actioningId === post.id}
                            className="btn btn--primary btn--sm btn--icon"
                            title="Pulihkan"
                          >
                            {actioningId === post.id ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                          </button>
                        ) : (
                          <button
                            onClick={() => onSoftDelete(post.id)}
                            disabled={actioningId === post.id}
                            className="btn btn--danger btn--sm btn--icon"
                            title="Soft Delete"
                          >
                            {actioningId === post.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm opacity-70">
                      {loadingList ? <Loader2 className="size-5 animate-spin mx-auto" /> : 'Tidak ada data.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs opacity-70" style={{ fontFamily: 'var(--font-mono)' }}>
                Hal {page} / {totalPages} • {total} post
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1 || loadingList}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn btn--secondary btn--sm"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={page >= totalPages || loadingList}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn btn--secondary btn--sm"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
