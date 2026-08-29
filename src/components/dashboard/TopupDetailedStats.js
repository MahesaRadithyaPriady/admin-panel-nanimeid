'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { CreditCard, Users, Coins, TrendingUp, Calendar, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getTopupDetailedStats } from '@/lib/api';

const PERIODS = [
  { key: 'today',     label: 'Hari Ini' },
  { key: 'yesterday', label: 'Kemarin' },
  { key: 'thisWeek',  label: 'Minggu Ini' },
  { key: 'thisMonth', label: 'Bulan Ini' },
  { key: 'lastMonth', label: 'Bulan Lalu' },
  { key: 'custom',    label: 'Pilih Bulan' },
];

const STATUS_OPTIONS = [
  { key: '',          label: 'Approved + Paid' },
  { key: 'APPROVED',  label: 'Approved' },
  { key: 'PAID',      label: 'Paid' },
  { key: 'PENDING',   label: 'Pending' },
  { key: 'REJECTED',  label: 'Rejected' },
  { key: 'ALL',       label: 'Semua' },
];

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

function formatCoins(n) {
  return Number(n || 0).toLocaleString('id-ID');
}

function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TopupDetailedStats() {
  const [period, setPeriod] = useState('thisMonth');
  const [status, setStatus] = useState('');
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
      const result = await getTopupDetailedStats({
        token,
        period,
        year: period === 'custom' ? customYear : undefined,
        month: period === 'custom' ? customMonth : undefined,
        status: status || undefined,
        page,
        limit: 20,
      });
      setData(result);
    } catch (err) {
      const message = err?.message || 'Gagal mengambil statistik topup';
      console.warn('topup detailed stats error:', message);
      toast.error(message);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [period, status, customYear, customMonth, page]);

  useEffect(() => {
    setPage(1);
  }, [period, status, customYear, customMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary;
  const users = Array.isArray(data?.users) ? data.users : [];
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

        <div className="flex items-center gap-2">
          <span className="label">Status:</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input"
            style={{ width: 'auto', fontSize: '0.8rem' }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

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
          {data?.status_filter && (
            <span className="ml-2">| Status: {data.status_filter.join(', ')}</span>
          )}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-3" style={{ borderLeft: '3px solid #3b82f6' }}>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4" style={{ color: '#3b82f6' }} />
              <span className="label">Total Transaksi</span>
            </div>
            <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>
              {formatCoins(summary.total_requests)}
            </div>
          </div>

          <div className="card p-3" style={{ borderLeft: '3px solid #22c55e' }}>
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4" style={{ color: '#22c55e' }} />
              <span className="label">Total Koin</span>
            </div>
            <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>
              {formatCoins(summary.total_amount_coins)}
            </div>
          </div>

          <div className="card p-3" style={{ borderLeft: '3px solid #a855f7' }}>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4" style={{ color: '#a855f7' }} />
              <span className="label">User Unik</span>
            </div>
            <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>
              {formatCoins(summary.unique_users)}
            </div>
          </div>

          <div className="card p-3" style={{ borderLeft: '3px solid #f59e0b' }}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4" style={{ color: '#f59e0b' }} />
              <span className="label">Avg / User</span>
            </div>
            <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>
              {formatCoins(summary.avg_per_user)}
            </div>
          </div>
        </div>
      )}

      {/* User list table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <span className="label">Daftar User Topup — {periodLabel}</span>
          {pagination && (
            <span className="label" style={{ fontSize: '0.75rem' }}>
              {pagination.total} user | Page {pagination.page} / {pagination.totalPages || 1}
            </span>
          )}
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center">
            <span className="label">Tidak ada data topup untuk periode ini.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed" style={{ fontSize: '0.85rem' }}>
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                  <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>#</th>
                  <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>User</th>
                  <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Email</th>
                  <th className="text-right p-2 label whitespace-nowrap" style={{ fontSize: '0.75rem' }}>Transaksi</th>
                  <th className="text-right p-2 label whitespace-nowrap" style={{ fontSize: '0.75rem' }}>Total Koin</th>
                  <th className="text-left p-2 label" style={{ fontSize: '0.75rem' }}>Topup Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const idx = (page - 1) * 20 + i + 1;
                  return (
                    <tr
                      key={u.user_id}
                      style={{ borderBottom: '1px solid var(--border-muted)' }}
                      className="hover:bg-[var(--surface-muted)]"
                    >
                      <td className="p-2 mono" style={{ color: 'var(--muted)' }}>{idx}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.username}
                              className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: 'var(--surface-muted)' }}
                            >
                              <Users className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold truncate">{u.username}</div>
                            {u.full_name && (
                              <div className="label truncate" style={{ fontSize: '0.7rem' }}>{u.full_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 truncate" style={{ color: 'var(--muted)' }}>{u.email || '-'}</td>
                      <td className="p-2 text-right mono whitespace-nowrap">{u.request_count}</td>
                      <td className="p-2 text-right mono font-bold whitespace-nowrap" style={{ color: '#22c55e' }}>
                        {formatCoins(u.total_amount_coins)}
                      </td>
                      <td className="p-2 whitespace-nowrap" style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                        {formatDate(u.last_topup_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
