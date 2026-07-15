'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Tv, Search, ExternalLink, Loader2, Users, MessageSquareText, Activity, Clock, Trash2, RefreshCcw, Globe, Lock, UserCheck, Eye } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getNobarStats, listNobarRooms, listNobarV1Rooms, deleteNobarRoom, deleteNobarV1Room, cleanupStaleNobarV2, cleanupStaleNobarV1 } from '@/lib/api';

export default function NobarAdminPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const [version, setVersion] = useState('v2');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAccess, setFilterAccess] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const token = getSession()?.token;
      const data = await getNobarStats({ token });
      setStats(data);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat statistik nobar');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadList = async () => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = {
        token,
        page,
        limit,
        status: filterStatus,
        q: search,
        sort: sortBy,
        order,
      };
      let data;
      if (version === 'v2') {
        params.access_mode = filterAccess;
        data = await listNobarRooms(params);
      } else {
        data = await listNobarV1Rooms(params);
      }
      setItems(data.items || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar nobar room');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, version]);

  const onSearch = async (e) => {
    e.preventDefault();
    setPage(1);
    await loadList();
  };

  const onDelete = async (id) => {
    setDeletingId(id);
    try {
      const token = getSession()?.token;
      if (version === 'v2') {
        await deleteNobarRoom({ token, id });
      } else {
        await deleteNobarV1Room({ token, id });
      }
      toast.success('Room berhasil dihapus');
      await loadList();
      await loadStats();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus room');
    } finally {
      setDeletingId(null);
      setConfirmModal(null);
    }
  };

  const onCleanupStale = async () => {
    setCleanupLoading(true);
    try {
      const token = getSession()?.token;
      let result;
      if (version === 'v2') {
        result = await cleanupStaleNobarV2({ token });
      } else {
        result = await cleanupStaleNobarV1({ token });
      }
      toast.success(`${result?.deleted_count ?? 0} room stale berhasil dihapus`);
      await loadList();
      await loadStats();
    } catch (err) {
      toast.error(err?.message || 'Gagal cleanup stale room');
    } finally {
      setCleanupLoading(false);
      setConfirmModal(null);
    }
  };

  const fmtDate = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }); } catch { return d; }
  };

  const statCards = [
    { key: 'total_active', label: 'Aktif', icon: Activity, color: '#22c55e' },
    { key: 'total_ended', label: 'Berakhir', icon: Clock, color: '#6b7280' },
    { key: 'total_rooms', label: 'Total Room', icon: Tv, color: 'var(--foreground)' },
    { key: 'total_participants', label: 'Partisipan', icon: Users, color: '#f59e0b' },
    { key: 'total_messages', label: 'Pesan', icon: MessageSquareText, color: '#3b82f6' },
    { key: 'stale_rooms_count', label: 'Stale', icon: Clock, color: '#ef4444' },
    { key: 'created_last_24h', label: 'Baru (24j)', icon: RefreshCcw, color: '#a855f7' },
  ];

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title flex items-center gap-2"><Tv className="size-5" /> Nobar Admin</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setConfirmModal({ type: 'cleanup' })}
                disabled={cleanupLoading}
                className="btn btn--secondary btn--sm"
              >
                {cleanupLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />} Cleanup Stale
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {statCards.map((s) => (
              <div key={s.key} className="card space-y-2">
                <div className="flex items-center gap-2">
                  <s.icon className="size-4" style={{ color: s.color }} />
                  <span className="label text-xs">{s.label}</span>
                </div>
                <div className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-mono)' }}>
                  {loadingStats ? <Loader2 className="size-5 animate-spin" /> : (Number(stats?.[s.key] ?? 0) || 0)}
                </div>
              </div>
            ))}
          </div>

          {/* Version Tabs */}
          <div className="flex items-center gap-2">
            {['v2', 'v1'].map((v) => (
              <button
                key={v}
                onClick={() => { setVersion(v); setPage(1); setFilterAccess(''); }}
                className="px-3 py-1.5 border-2 rounded-full font-extrabold text-sm transition-all shrink-0"
                style={{
                  boxShadow: version === v ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  background: version === v ? 'var(--accent-primary)' : 'var(--panel-bg)',
                  color: version === v ? 'var(--accent-primary-foreground)' : 'var(--foreground)',
                  borderColor: 'var(--panel-border)',
                }}
              >
                {v === 'v2' ? 'V2 (Current)' : 'V1 (Legacy)'}
              </button>
            ))}
          </div>

          {/* Filter & Search */}
          <form onSubmit={onSearch} className="filter-bar flex-wrap">
            <input
              placeholder="Cari code, anime, host..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="select">
              <option value="">Semua Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ENDED">Ended</option>
            </select>
            {version === 'v2' && (
              <select value={filterAccess} onChange={(e) => setFilterAccess(e.target.value)} className="select">
                <option value="">Semua Akses</option>
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
                <option value="FOLLOWERS">Followers</option>
                <option value="FRIENDS">Friends</option>
              </select>
            )}
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select">
              <option value="createdAt">Dibuat</option>
              <option value="updatedAt">Diperbarui</option>
              <option value="code">Code</option>
              <option value="status">Status</option>
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
                  <th className="text-left px-4 py-3 label">Code</th>
                  <th className="text-left px-4 py-3 label">Host</th>
                  <th className="text-left px-4 py-3 label">Anime</th>
                  <th className="text-left px-4 py-3 label">Episode</th>
                  {version === 'v2' && <th className="text-left px-4 py-3 label">Akses</th>}
                  <th className="text-left px-4 py-3 label">Partisipan</th>
                  <th className="text-left px-4 py-3 label">Pesan</th>
                  <th className="text-left px-4 py-3 label">Status</th>
                  <th className="text-left px-4 py-3 label">Dibuat</th>
                  <th className="text-left px-4 py-3 label">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)]">
                    <td className="px-4 py-3 font-semibold">{r.id}</td>
                    <td className="px-4 py-3 font-extrabold" style={{ fontFamily: 'var(--font-mono)' }}>{r.code || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {r.host?.avatar_url && <img src={r.host.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-[var(--border)]" loading="lazy" />}
                        <span className="font-semibold text-sm">{r.host?.username || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {r.anime?.gambar_anime && <img src={r.anime.gambar_anime} alt="" className="w-8 h-10 object-cover border border-[var(--border)]" loading="lazy" />}
                        <span className="line-clamp-2 max-w-[180px]">{r.anime?.nama_anime || r.anime?.title_en || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{r.episode ? `Ep ${r.episode.nomor_episode}` : '-'}</td>
                    {version === 'v2' && (
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{
                          color: r.access_mode === 'PUBLIC' ? '#3b82f6' : r.access_mode === 'PRIVATE' ? '#a855f7' : '#f59e0b',
                        }}>
                          {r.access_mode === 'PUBLIC' ? <><Globe className="size-3" /> Public</> :
                           r.access_mode === 'PRIVATE' ? <><Lock className="size-3" /> Private</> :
                           <><UserCheck className="size-3" /> {r.access_mode}</>}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 font-semibold">{r.participants_count ?? 0}</td>
                    <td className="px-4 py-3 font-semibold">{r.messages_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-bold" style={{
                        color: r.status === 'ACTIVE' ? '#22c55e' : '#6b7280',
                      }}>
                        <Activity className="size-3" /> {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs opacity-70">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {version === 'v2' && (
                          <a href={`/dashboard/nobar-admin/${r.id}`} className="btn btn--secondary btn--sm btn--icon" title="Detail">
                            <Eye className="size-4" />
                          </a>
                        )}
                        <button
                          onClick={() => setConfirmModal({ type: 'delete', id: r.id, code: r.code })}
                          disabled={deletingId === r.id}
                          className="btn btn--danger btn--sm btn--icon"
                          title="Hapus"
                        >
                          {deletingId === r.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={version === 'v2' ? 11 : 10} className="px-4 py-6 text-center text-sm opacity-70">
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
                Hal {page} / {totalPages} • {total} room
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

          {/* Custom Confirm Modal */}
          {confirmModal && (
            <div className="fixed inset-0 z-50 grid place-items-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => !deletingId && !cleanupLoading && setConfirmModal(null)} />
              <div className="relative z-10 w-[92%] max-w-md border-2 rounded-xl p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid place-items-center size-10 border-2 rounded-md" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                    <Trash2 className="size-5" style={{ color: 'var(--accent-edit)' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">
                      {confirmModal.type === 'cleanup' ? 'Cleanup Stale Rooms?' : 'Hapus Room?'}
                    </h3>
                    <p className="text-sm opacity-80 mt-1">
                      {confirmModal.type === 'cleanup'
                        ? `Hapus semua room ${version.toUpperCase()} yang aktif lebih dari 10 jam? Room akan dihapus permanen.`
                        : `Hapus room ${confirmModal.code || confirmModal.id}? Semua participants & messages akan terhapus.`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setConfirmModal(null)} disabled={deletingId || cleanupLoading} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
                  <button
                    onClick={() => confirmModal.type === 'cleanup' ? onCleanupStale() : onDelete(confirmModal.id)}
                    disabled={deletingId || cleanupLoading}
                    className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60"
                    style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}
                  >
                    {(deletingId || cleanupLoading) ? <Loader2 className="size-4 inline-block mr-1 animate-spin" /> : <Trash2 className="size-4 inline-block mr-1" />}
                    {confirmModal.type === 'cleanup' ? 'Ya, Cleanup' : 'Ya, Hapus'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
