'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BadgeCheck, Ban, CheckCircle2, CreditCard, ListFilter } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listTopupRequests, setTopupStatus } from '@/lib/api';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'PAID', label: 'Dibayar' },
  { value: 'CANCELED', label: 'Dibatalkan' },
];

export default function TopupModerationPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  // Filters & pagination
  const [status, setStatus] = useState('PENDING');
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Data
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const params = {
        userId: userId.trim(),
        status: status === 'ALL' ? '' : status,
        page,
        limit,
        ...opts,
      };
      const data = await listTopupRequests({ token, ...params });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(data.page || 1);
      setLimit(data.limit || 20);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar topup');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status, user]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadList({ page: 1 });
  };

  const updateStatus = async (id, newStatus) => {
    const token = getSession()?.token;
    try {
      setActingId(id);
      const res = await setTopupStatus({ token, id, status: newStatus });
      toast.success(res?.message || `Status diupdate ke ${newStatus}`);
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal mengubah status');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <CreditCard className="size-5" /> Moderasi Topup Manual
            </h2>
          </div>

          {/* Filters */}
          <form onSubmit={onSearch} className="grid sm:grid-cols-[1fr_180px_120px] gap-3">
            <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
              <label className="text-sm font-extrabold flex items-center gap-2">
                <ListFilter className="size-4" /> ID Pengguna
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Filter ID Pengguna (opsional)"
                className="px-3 py-2 border-4 rounded-lg font-semibold"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border-4 rounded-lg font-extrabold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button type="submit" className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
              Terapkan
            </button>
          </form>

          {/* Table */}
          <div className="overflow-auto">
            <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <thead style={{ background: 'var(--panel-bg)' }}>
                <tr>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>ID Pengguna</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Jumlah (koin)</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Metode</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Referensi</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Catatan</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Status</th>
                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.id}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.user_id}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.amount_coins}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.payment_method}</td>
                    <td className="px-3 py-2 border-b-4 font-semibold max-w-[220px] truncate" style={{ borderColor: 'var(--panel-border)' }}>
                      {it.payment_ref ? (
                        <a href={it.payment_ref} target="_blank" rel="noreferrer" className="underline break-all">Buka</a>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 border-b-4 font-semibold max-w-[260px] break-words" style={{ borderColor: 'var(--panel-border)' }}>{it.note || '-'}</td>
                    <td className="px-3 py-2 border-b-4 font-extrabold" style={{ borderColor: 'var(--panel-border)' }}>
                      <span className="px-2 py-1 border-2 rounded" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>{it.status}</span>
                    </td>
                    <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          disabled={actingId === it.id}
                          onClick={() => updateStatus(it.id, 'APPROVED')}
                          className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60"
                          style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
                          title="Setujui (akan auto kredit)"
                        >
                          <CheckCircle2 className="size-4" />
                        </button>
                        <button
                          disabled={actingId === it.id}
                          onClick={() => updateStatus(it.id, 'REJECTED')}
                          className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60"
                          style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                          title="Tolak"
                        >
                          <Ban className="size-4" />
                        </button>
                        <button
                          disabled={actingId === it.id}
                          onClick={() => updateStatus(it.id, 'PAID')}
                          className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-60"
                          style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}
                          title="Tandai Dibayar (auto kredit jika belum)"
                        >
                          <BadgeCheck className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Tidak ada data.'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 border-4 border-black rounded-lg bg-white disabled:opacity-60 font-extrabold"
              style={{ boxShadow: '4px 4px 0 #000' }}
            >
              Sebelumnya
            </button>
            <div className="text-sm font-extrabold">Halaman {page} / {Math.max(1, Math.ceil(total / limit))}</div>
            <button
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 border-4 border-black rounded-lg bg-white disabled:opacity-60 font-extrabold"
              style={{ boxShadow: '4px 4px 0 #000' }}
            >
              Berikutnya
            </button>
          </div>
        </>
      )}
    </div>
  );
}
