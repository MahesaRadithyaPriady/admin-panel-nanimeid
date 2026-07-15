'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Flag, Search, ExternalLink, Loader2, Users, Ban, ShieldCheck, Globe, Lock } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getClanStats, listClans } from '@/lib/api';

export default function ClanAdminPage() {
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
  const [filterBanned, setFilterBanned] = useState('');
  const [filterPublic, setFilterPublic] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [loadingList, setLoadingList] = useState(false);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const token = getSession()?.token;
      const data = await getClanStats({ token });
      setStats(data);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat statistik clan');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadList = async () => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const data = await listClans({
        token,
        search,
        page,
        limit,
        is_banned: filterBanned,
        is_public: filterPublic,
        sort: sortBy,
        order,
      });
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar clan');
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

  const statCards = [
    { key: 'total_clans', label: 'Total Clan', icon: Flag, color: 'var(--foreground)' },
    { key: 'active_clans', label: 'Aktif', icon: ShieldCheck, color: '#22c55e' },
    { key: 'banned_clans', label: 'Banned', icon: Ban, color: '#ef4444' },
    { key: 'public_clans', label: 'Publik', icon: Globe, color: '#3b82f6' },
    { key: 'private_clans', label: 'Privat', icon: Lock, color: '#a855f7' },
    { key: 'total_members', label: 'Total Anggota', icon: Users, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title flex items-center gap-2"><Flag className="size-5" /> Clan Admin</h2>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

          {/* Filter & Search */}
          <form onSubmit={onSearch} className="filter-bar flex-wrap">
            <input
              placeholder="Cari clan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
            <select value={filterBanned} onChange={(e) => setFilterBanned(e.target.value)} className="select">
              <option value="">Semua Status</option>
              <option value="true">Banned</option>
              <option value="false">Tidak Banned</option>
            </select>
            <select value={filterPublic} onChange={(e) => setFilterPublic(e.target.value)} className="select">
              <option value="">Semua Visibility</option>
              <option value="true">Publik</option>
              <option value="false">Privat</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select">
              <option value="createdAt">Dibuat</option>
              <option value="name">Nama</option>
              <option value="tag">Tag</option>
              <option value="updatedAt">Diperbarui</option>
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
                  <th className="text-left px-4 py-3 label">Nama</th>
                  <th className="text-left px-4 py-3 label">Tag</th>
                  <th className="text-left px-4 py-3 label">Anggota</th>
                  <th className="text-left px-4 py-3 label">Visibility</th>
                  <th className="text-left px-4 py-3 label">Status</th>
                  <th className="text-left px-4 py-3 label">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cl) => (
                  <tr key={cl.id} className="border-b border-[var(--border)]">
                    <td className="px-4 py-3 font-semibold">{cl.id}</td>
                    <td className="px-4 py-3 font-extrabold">
                      <div className="flex items-center gap-2">
                        {cl.logo_url && (
                          <img src={cl.logo_url} alt="logo" className="w-8 h-8 object-contain rounded border border-[var(--border)]" loading="lazy" />
                        )}
                        {cl.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 text-xs font-bold border"
                        style={{ color: cl.tag_color || 'var(--foreground)', borderColor: cl.tag_color || 'var(--border)', fontFamily: 'var(--font-mono)' }}
                      >
                        {cl.tag || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{cl.member_count ?? 0}/{cl.max_members ?? 30}</td>
                    <td className="px-4 py-3">
                      {cl.is_public ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#3b82f6' }}><Globe className="size-3" /> Publik</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#a855f7' }}><Lock className="size-3" /> Privat</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {cl.is_banned ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#ef4444' }}><Ban className="size-3" /> Banned</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#22c55e' }}><ShieldCheck className="size-3" /> Aktif</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/dashboard/clan-admin/${cl.id}`} className="btn btn--secondary btn--sm btn--icon" title="Detail">
                        <ExternalLink className="size-4" />
                      </a>
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
                Hal {page} / {totalPages} • {total} clan
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
