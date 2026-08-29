'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Users, Clapperboard, List, Zap, Calendar, ChevronLeft, ChevronRight, RefreshCw, UserCircle, BookOpen, FileText } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getOverviewDetailedStats } from '@/lib/api';

const PERIODS = [
  { key: 'today',     label: 'Hari Ini' },
  { key: 'yesterday', label: 'Kemarin' },
  { key: 'thisWeek',  label: 'Minggu Ini' },
  { key: 'thisMonth', label: 'Bulan Ini' },
  { key: 'lastMonth', label: 'Bulan Lalu' },
  { key: 'custom',    label: 'Pilih Bulan' },
];

const TABS = [
  { key: 'users',          label: 'User Registrasi',  icon: Users },
  { key: 'anime',          label: 'Anime Upload',     icon: Clapperboard },
  { key: 'episodes',       label: 'Episode Upload',   icon: List },
  { key: 'manga',          label: 'Manga Upload',     icon: BookOpen },
  { key: 'manga_chapters', label: 'Chapter Manga',    icon: FileText },
  { key: 'online',         label: 'User Online',      icon: Zap },
];

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

function formatNumber(n) {
  return Number(n || 0).toLocaleString('id-ID');
}

function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function OverviewDetailedStats() {
  const [period, setPeriod] = useState('thisMonth');
  const [tab, setTab] = useState('users');
  const [customYear, setCustomYear] = useState(new Date().getFullYear());
  const [customMonth, setCustomMonth] = useState(new Date().getMonth() + 1);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const token = getSession()?.token;
      const result = await getOverviewDetailedStats({
        token,
        period,
        year: period === 'custom' ? customYear : undefined,
        month: period === 'custom' ? customMonth : undefined,
        tab,
        page,
        limit: 20,
      });
      setData(result);
    } catch (err) {
      const message = err?.message || 'Gagal mengambil statistik detail platform';
      console.warn('overview detailed stats error:', message);
      toast.error(message);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [period, tab, customYear, customMonth, page]);

  useEffect(() => {
    setPage(1);
  }, [period, tab, customYear, customMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary;
  const users = Array.isArray(data?.users) ? data.users : [];
  const anime = Array.isArray(data?.anime) ? data.anime : [];
  const episodes = Array.isArray(data?.episodes) ? data.episodes : [];
  const manga = Array.isArray(data?.manga) ? data.manga : [];
  const mangaChapters = Array.isArray(data?.manga_chapters) ? data.manga_chapters : [];
  const onlineUsers = Array.isArray(data?.online_users) ? data.online_users : [];
  const pagination = data?.pagination;
  const periodLabel = data?.period || '';
  const range = data?.range;

  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear; y >= currentYear - 3; y--) yearOptions.push(y);

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          <span className="label">Periode:</span>
          <div className="flex flex-wrap gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className="btn btn--sm"
                style={{
                  background: period === p.key ? 'var(--accent-primary)' : 'transparent',
                  color: period === p.key ? 'var(--accent-primary-foreground)' : 'var(--muted)',
                  borderColor: period === p.key ? 'var(--accent-primary)' : 'var(--border-muted)',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  fontWeight: period === p.key ? 700 : 400,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <select
              value={customMonth}
              onChange={(e) => setCustomMonth(Number(e.target.value))}
              className="input"
              style={{ width: 'auto', fontSize: '0.8rem' }}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={customYear}
              onChange={(e) => setCustomYear(Number(e.target.value))}
              className="input"
              style={{ width: 'auto', fontSize: '0.8rem' }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={fetchData}
          className="btn btn--secondary btn--sm"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Range info */}
      {range && (
        <div className="text-sm" style={{ color: 'var(--muted)' }}>
          <Calendar className="w-3.5 h-3.5 inline mr-1" />
          {periodLabel}: {formatDate(range.start)} — {formatDate(range.end)}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-3" style={{ borderLeft: '3px solid #3b82f6' }}>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4" style={{ color: '#3b82f6' }} />
              <span className="label">User Registrasi</span>
            </div>
            <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>
              {formatNumber(summary.total_users_registered)}
            </div>
          </div>

          <div className="card p-3" style={{ borderLeft: '3px solid #22c55e' }}>
            <div className="flex items-center gap-2 mb-1">
              <Clapperboard className="w-4 h-4" style={{ color: '#22c55e' }} />
              <span className="label">Anime Upload</span>
            </div>
            <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>
              {formatNumber(summary.total_anime_uploaded)}
            </div>
          </div>

          <div className="card p-3" style={{ borderLeft: '3px solid #a855f7' }}>
            <div className="flex items-center gap-2 mb-1">
              <List className="w-4 h-4" style={{ color: '#a855f7' }} />
              <span className="label">Episode Upload</span>
            </div>
            <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>
              {formatNumber(summary.total_episodes_uploaded)}
            </div>
          </div>

          <div className="card p-3" style={{ borderLeft: '3px solid #ec4899' }}>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4" style={{ color: '#ec4899' }} />
              <span className="label">Manga Upload</span>
            </div>
            <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>
              {formatNumber(summary.total_manga_uploaded)}
            </div>
          </div>

          <div className="card p-3" style={{ borderLeft: '3px solid #f97316' }}>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4" style={{ color: '#f97316' }} />
              <span className="label">Chapter Manga</span>
            </div>
            <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>
              {formatNumber(summary.total_manga_chapters_uploaded)}
            </div>
          </div>

          <div className="card p-3" style={{ borderLeft: '3px solid #f59e0b' }}>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" style={{ color: '#f59e0b' }} />
              <span className="label">Online Sekarang</span>
            </div>
            <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>
              {formatNumber(summary.total_online_now)}
            </div>
          </div>

          <div className="card p-3" style={{ borderLeft: '3px solid #06b6d4' }}>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" style={{ color: '#06b6d4' }} />
              <span className="label">Online di Periode</span>
            </div>
            <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>
              {formatNumber(summary.total_online_in_period)}
            </div>
          </div>
        </div>
      )}

      {/* Tab selector */}
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="btn btn--sm"
              style={{
                background: tab === t.key ? 'var(--accent-primary)' : 'transparent',
                color: tab === t.key ? 'var(--accent-primary-foreground)' : 'var(--muted)',
                borderColor: tab === t.key ? 'var(--accent-primary)' : 'var(--border-muted)',
                borderWidth: 1,
                borderStyle: 'solid',
                fontWeight: tab === t.key ? 700 : 400,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <span className="label">{TABS.find((t) => t.key === tab)?.label} — {periodLabel}</span>
          {pagination && (
            <span className="label" style={{ fontSize: '0.75rem' }}>
              {pagination.total} item | Page {pagination.page} / {pagination.totalPages || 1}
            </span>
          )}
        </div>

        {/* Users table */}
        {tab === 'users' && (
          users.length === 0 ? (
            <div className="p-8 text-center">
              <span className="label">Tidak ada user registrasi untuk periode ini.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed" style={{ fontSize: '0.85rem' }}>
                <colgroup>
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>#</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>User</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Email</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Nama Lengkap</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Registrasi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => {
                    const idx = (page - 1) * 20 + i + 1;
                    return (
                      <tr key={u.user_id} style={{ borderBottom: '1px solid var(--border-muted)' }} className="hover:bg-[var(--surface-muted)]">
                        <td className="p-2 mono" style={{ color: 'var(--muted)' }}>{idx}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.username} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-muted)' }}>
                                <Users className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                              </div>
                            )}
                            <span className="font-bold truncate">{u.username}</span>
                          </div>
                        </td>
                        <td className="p-2 truncate" style={{ color: 'var(--muted)' }}>{u.email || '-'}</td>
                        <td className="p-2 truncate" style={{ color: 'var(--muted)' }}>{u.full_name || '-'}</td>
                        <td className="p-2 whitespace-nowrap" style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{formatDate(u.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Anime table */}
        {tab === 'anime' && (
          anime.length === 0 ? (
            <div className="p-8 text-center">
              <span className="label">Tidak ada anime yang diupload untuk periode ini.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed" style={{ fontSize: '0.85rem' }}>
                <colgroup>
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>#</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Anime</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Diupload Oleh</th>
                    <th className="text-right p-2 label" style={{ fontSize: '0.75rem' }}>ID</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Tanggal Upload</th>
                  </tr>
                </thead>
                <tbody>
                  {anime.map((a, i) => {
                    const idx = (page - 1) * 20 + i + 1;
                    return (
                      <tr key={a.anime_id} style={{ borderBottom: '1px solid var(--border-muted)' }} className="hover:bg-[var(--surface-muted)]">
                        <td className="p-2 mono" style={{ color: 'var(--muted)' }}>{idx}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {a.gambar_anime ? (
                              <img src={a.gambar_anime} alt={a.nama_anime} className="w-6 h-9 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-6 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-muted)' }}>
                                <Clapperboard className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                              </div>
                            )}
                            <span className="font-bold truncate">{a.nama_anime}</span>
                          </div>
                        </td>
                        <td className="p-2">
                          {a.admin_username ? (
                            <span className="badge" style={{ background: 'var(--surface-muted)', borderColor: 'transparent', fontSize: '0.7rem' }}>
                              <UserCircle className="w-3 h-3 inline mr-1" />
                              {a.admin_username}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>-</span>
                          )}
                        </td>
                        <td className="p-2 text-right mono whitespace-nowrap" style={{ color: 'var(--muted)' }}>{a.anime_id}</td>
                        <td className="p-2 whitespace-nowrap" style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{formatDate(a.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Episodes table */}
        {tab === 'episodes' && (
          episodes.length === 0 ? (
            <div className="p-8 text-center">
              <span className="label">Tidak ada episode yang diupload untuk periode ini.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed" style={{ fontSize: '0.85rem' }}>
                <colgroup>
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>#</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Anime</th>
                    <th className="text-right p-2 label whitespace-nowrap" style={{ fontSize: '0.75rem' }}>Episode</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Diupload Oleh</th>
                    <th className="text-right p-2 label" style={{ fontSize: '0.75rem' }}>ID</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Tanggal Upload</th>
                  </tr>
                </thead>
                <tbody>
                  {episodes.map((e, i) => {
                    const idx = (page - 1) * 20 + i + 1;
                    return (
                      <tr key={e.episode_id} style={{ borderBottom: '1px solid var(--border-muted)' }} className="hover:bg-[var(--surface-muted)]">
                        <td className="p-2 mono" style={{ color: 'var(--muted)' }}>{idx}</td>
                        <td className="p-2 truncate">
                          <span className="font-bold">{e.anime_title || '-'}</span>
                          {e.judul_episode && (
                            <div className="label truncate" style={{ fontSize: '0.7rem' }}>{e.judul_episode}</div>
                          )}
                        </td>
                        <td className="p-2 text-right mono whitespace-nowrap font-bold">{e.nomor_episode}</td>
                        <td className="p-2">
                          {e.admin_username ? (
                            <span className="badge" style={{ background: 'var(--surface-muted)', borderColor: 'transparent', fontSize: '0.7rem' }}>
                              <UserCircle className="w-3 h-3 inline mr-1" />
                              {e.admin_username}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>-</span>
                          )}
                        </td>
                        <td className="p-2 text-right mono whitespace-nowrap" style={{ color: 'var(--muted)' }}>{e.episode_id}</td>
                        <td className="p-2 whitespace-nowrap" style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{formatDate(e.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Manga table */}
        {tab === 'manga' && (
          manga.length === 0 ? (
            <div className="p-8 text-center">
              <span className="label">Tidak ada manga yang diupload untuk periode ini.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed" style={{ fontSize: '0.85rem' }}>
                <colgroup>
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>#</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Manga</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Tipe</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Status</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Diupload Oleh</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Tanggal Upload</th>
                  </tr>
                </thead>
                <tbody>
                  {manga.map((m, i) => {
                    const idx = (page - 1) * 20 + i + 1;
                    return (
                      <tr key={m.manga_id} style={{ borderBottom: '1px solid var(--border-muted)' }} className="hover:bg-[var(--surface-muted)]">
                        <td className="p-2 mono" style={{ color: 'var(--muted)' }}>{idx}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {m.cover_manga ? (
                              <img src={m.cover_manga} alt={m.judul_manga} className="w-6 h-9 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-6 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-muted)' }}>
                                <BookOpen className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                              </div>
                            )}
                            <span className="font-bold truncate">{m.judul_manga}</span>
                          </div>
                        </td>
                        <td className="p-2 truncate" style={{ color: 'var(--muted)' }}>{m.type_manga || '-'}</td>
                        <td className="p-2">
                          {m.status_manga && (
                            <span className="badge" style={{ background: 'var(--surface-muted)', borderColor: 'transparent', fontSize: '0.7rem' }}>
                              {m.status_manga}
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          {m.admin_username ? (
                            <span className="badge" style={{ background: 'var(--surface-muted)', borderColor: 'transparent', fontSize: '0.7rem' }}>
                              <UserCircle className="w-3 h-3 inline mr-1" />
                              {m.admin_username}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>-</span>
                          )}
                        </td>
                        <td className="p-2 whitespace-nowrap" style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{formatDate(m.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Manga chapters table */}
        {tab === 'manga_chapters' && (
          mangaChapters.length === 0 ? (
            <div className="p-8 text-center">
              <span className="label">Tidak ada chapter manga yang diupload untuk periode ini.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed" style={{ fontSize: '0.85rem' }}>
                <colgroup>
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>#</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Manga</th>
                    <th className="text-right p-2 label" style={{ fontSize: '0.75rem' }}>Chapter</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Judul Chapter</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Diupload Oleh</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Tanggal Upload</th>
                  </tr>
                </thead>
                <tbody>
                  {mangaChapters.map((c, i) => {
                    const idx = (page - 1) * 20 + i + 1;
                    return (
                      <tr key={c.chapter_id} style={{ borderBottom: '1px solid var(--border-muted)' }} className="hover:bg-[var(--surface-muted)]">
                        <td className="p-2 mono" style={{ color: 'var(--muted)' }}>{idx}</td>
                        <td className="p-2 truncate font-bold">{c.manga_title || '-'}</td>
                        <td className="p-2 text-right mono whitespace-nowrap font-bold">{c.chapter_number}</td>
                        <td className="p-2 truncate" style={{ color: 'var(--muted)' }}>{c.title || '-'}</td>
                        <td className="p-2">
                          {c.admin_username ? (
                            <span className="badge" style={{ background: 'var(--surface-muted)', borderColor: 'transparent', fontSize: '0.7rem' }}>
                              <UserCircle className="w-3 h-3 inline mr-1" />
                              {c.admin_username}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>-</span>
                          )}
                        </td>
                        <td className="p-2 whitespace-nowrap" style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{formatDate(c.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Online users table */}
        {tab === 'online' && (
          onlineUsers.length === 0 ? (
            <div className="p-8 text-center">
              <span className="label">Tidak ada user online untuk periode ini.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed" style={{ fontSize: '0.85rem' }}>
                <colgroup>
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>#</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>User</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Email</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Nama Lengkap</th>
                    <th className="text-center p-2 label" style={{ fontSize: '0.75rem' }}>Status</th>
                    <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {onlineUsers.map((u, i) => {
                    const idx = (page - 1) * 20 + i + 1;
                    return (
                      <tr key={u.user_id} style={{ borderBottom: '1px solid var(--border-muted)' }} className="hover:bg-[var(--surface-muted)]">
                        <td className="p-2 mono" style={{ color: 'var(--muted)' }}>{idx}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.username} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-muted)' }}>
                                <Users className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                              </div>
                            )}
                            <span className="font-bold truncate">{u.username}</span>
                          </div>
                        </td>
                        <td className="p-2 truncate" style={{ color: 'var(--muted)' }}>{u.email || '-'}</td>
                        <td className="p-2 truncate" style={{ color: 'var(--muted)' }}>{u.full_name || '-'}</td>
                        <td className="p-2 text-center">
                          {u.is_online ? (
                            <span className="badge" style={{ background: '#22c55e', color: '#ffffff', borderColor: 'transparent', fontSize: '0.65rem', padding: '1px 6px' }}>
                              <Zap className="w-2.5 h-2.5 inline" /> Online
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'var(--surface-muted)', borderColor: 'transparent', fontSize: '0.65rem', padding: '1px 6px' }}>
                              Offline
                            </span>
                          )}
                        </td>
                        <td className="p-2 whitespace-nowrap" style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{formatDate(u.last_seen_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-3" style={{ borderTop: '1px solid var(--border-muted)' }}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="btn btn--sm btn--secondary"
              style={{ opacity: page <= 1 ? 0.5 : 1 }}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="label">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
              disabled={page >= pagination.totalPages}
              className="btn btn--sm btn--secondary"
              style={{ opacity: page >= pagination.totalPages ? 0.5 : 1 }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
