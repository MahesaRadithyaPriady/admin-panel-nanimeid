'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import {
  Coins,
  RefreshCcw,
  Banknote,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  HandCoins,
} from 'lucide-react';
import {
  getMySalaryWallet,
  getMySalaryTransactions,
  withdrawSalaryRupiah,
  withdrawSalaryCoin,
  listAdminSalaryWallets,
  creditAdminSalary,
  listSalaryWithdrawals,
  updateSalaryWithdrawal,
} from '@/lib/api';

function formatRp(amount) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount || 0);
}

function fmtTime(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const TYPE_LABEL = {
  CREDIT: { label: 'Gaji Masuk', badge: 'badge--success' },
  WITHDRAW_RP: { label: 'Tarik Rupiah', badge: 'badge--primary' },
  WITHDRAW_COIN: { label: 'Tarik Koin', badge: 'badge--warning' },
};

const STATUS_BADGE = {
  PENDING: 'badge--warning',
  COMPLETED: 'badge--success',
  REJECTED: 'badge--error',
};

const METHOD_LABEL = { dana: 'DANA', shopeepay: 'ShopeePay', gopay: 'GoPay', bank: 'Bank', coin: 'Koin' };

export default function PaymentPage() {
  const { user, loading: sessionLoading } = useSession();
  const token = getSession()?.token;
  const canManage = Array.isArray(user?.permissions) && user.permissions.includes('payment_add');

  // Wallet & riwayat sendiri
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txMeta, setTxMeta] = useState({ total: 0, totalPages: 1 });
  const [loadingData, setLoadingData] = useState(false);

  // Form tarik rupiah
  const [wdAmount, setWdAmount] = useState('');
  const [wdMethod, setWdMethod] = useState('dana');
  const [wdDestination, setWdDestination] = useState('');
  const [wdBankName, setWdBankName] = useState('');

  // Form tarik koin
  const [coinAmount, setCoinAmount] = useState('');
  const [coinUserId, setCoinUserId] = useState('');

  // Khusus PiieSya: beri gaji & antrian penarikan
  const [admins, setAdmins] = useState([]);
  const [creditAdminId, setCreditAdminId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [withdrawals, setWithdrawals] = useState([]);
  const [wdPage, setWdPage] = useState(1);
  const [wdMeta, setWdMeta] = useState({ total: 0, totalPages: 1 });
  const [wdStatus, setWdStatus] = useState('PENDING');

  const coinsPerRp = Number(wallet?.coins_per_rp) || 1.2;
  const previewCoins = Math.round((Number(coinAmount) || 0) * coinsPerRp);

  const loadWallet = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getMySalaryWallet({ token });
      setWallet(data?.data || null);
    } catch (e) {
      toast.error(e?.message || 'Gagal memuat wallet');
    }
  }, [token]);

  const loadTransactions = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getMySalaryTransactions({ token, page: txPage, limit: 10 });
      setTransactions(Array.isArray(data?.data) ? data.data : []);
      setTxMeta({ total: data?.total || 0, totalPages: data?.totalPages || 1 });
    } catch {}
  }, [token, txPage]);

  const loadAdmins = useCallback(async () => {
    if (!token || !canManage) return;
    try {
      const data = await listAdminSalaryWallets({ token });
      setAdmins(Array.isArray(data?.data) ? data.data : []);
    } catch {}
  }, [token, canManage]);

  const loadWithdrawals = useCallback(async () => {
    if (!token || !canManage) return;
    try {
      const data = await listSalaryWithdrawals({ token, status: wdStatus, page: wdPage, limit: 20 });
      setWithdrawals(Array.isArray(data?.data) ? data.data : []);
      setWdMeta({ total: data?.total || 0, totalPages: data?.totalPages || 1 });
    } catch {}
  }, [token, canManage, wdStatus, wdPage]);

  const refreshAll = useCallback(async () => {
    setLoadingData(true);
    await Promise.all([loadWallet(), loadTransactions(), loadAdmins(), loadWithdrawals()]);
    setLoadingData(false);
  }, [loadWallet, loadTransactions, loadAdmins, loadWithdrawals]);

  useEffect(() => {
    if (!user) return;
    loadWallet();
    loadTransactions();
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, txPage]);

  useEffect(() => {
    if (!user || !canManage) return;
    loadWithdrawals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, canManage, wdStatus, wdPage]);

  const submitWithdrawRp = async () => {
    const amount = Math.floor(Number(wdAmount));
    if (!amount || amount <= 0) return toast.error('Nominal tidak valid');
    if (!wdDestination.trim()) return toast.error('Nomor tujuan wajib diisi');
    if (wdMethod === 'bank' && !wdBankName.trim()) return toast.error('Nama bank wajib diisi');
    try {
      const res = await withdrawSalaryRupiah({
        token,
        amount,
        method: wdMethod,
        destination: wdDestination.trim(),
        bank_name: wdMethod === 'bank' ? wdBankName.trim() : undefined,
      });
      toast.success(res?.message || 'Request penarikan dibuat');
      setWdAmount(''); setWdDestination(''); setWdBankName('');
      refreshAll();
    } catch (e) {
      toast.error(e?.message || 'Gagal membuat request penarikan');
    }
  };

  const submitWithdrawCoin = async () => {
    const amount = Math.floor(Number(coinAmount));
    const uid = Number(coinUserId);
    if (!amount || amount <= 0) return toast.error('Nominal tidak valid');
    if (!uid || uid <= 0) return toast.error('User ID tujuan wajib diisi');
    try {
      const res = await withdrawSalaryCoin({ token, amount_rp: amount, target_user_id: uid });
      toast.success(res?.message || 'Koin berhasil dikirim');
      setCoinAmount(''); setCoinUserId('');
      refreshAll();
    } catch (e) {
      toast.error(e?.message || 'Gagal konversi ke koin');
    }
  };

  const submitCredit = async () => {
    const amount = Math.floor(Number(creditAmount));
    const adminId = Number(creditAdminId);
    if (!adminId) return toast.error('Pilih admin tujuan');
    if (!amount || amount <= 0) return toast.error('Nominal tidak valid');
    try {
      const res = await creditAdminSalary({ token, admin_id: adminId, amount, note: creditNote || undefined });
      toast.success(res?.message || 'Gaji berhasil dikirim');
      setCreditAdminId(''); setCreditAmount(''); setCreditNote('');
      refreshAll();
    } catch (e) {
      toast.error(e?.message || 'Gagal memberi gaji');
    }
  };

  const processWithdrawal = async (id, status) => {
    try {
      const res = await updateSalaryWithdrawal({ token, id, status });
      toast.success(res?.message || 'Status diperbarui');
      loadWithdrawals();
      loadAdmins();
    } catch (e) {
      toast.error(e?.message || 'Gagal memproses');
    }
  };

  if (sessionLoading || !user) return null;

  return (
    <div className="space-y-4 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Payment</h1>
          <p className="label mt-1">Wallet gaji admin &amp; uploader — tarik ke Rupiah atau koin NanimeID</p>
        </div>
        <button onClick={refreshAll} className="btn btn--secondary btn--sm flex-shrink-0">
          <RefreshCcw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Saldo */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__label">Saldo Gaji</div>
          <div className="stat-card__value">{formatRp(wallet?.balance_rp)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Rate Konversi</div>
          <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>Rp 1 = {coinsPerRp} Koin</div>
        </div>
      </div>

      {/* Form penarikan */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tarik Rupiah */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title flex items-center gap-2">
              <Banknote className="w-4 h-4" /> Tarik ke Rupiah
            </h2>
          </div>
          <div className="card__body space-y-3">
            <div>
              <label className="label uppercase block mb-1">Metode</label>
              <select value={wdMethod} onChange={(e) => setWdMethod(e.target.value)} className="select w-full">
                <option value="dana">DANA</option>
                <option value="shopeepay">ShopeePay</option>
                <option value="gopay">GoPay</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            {wdMethod === 'bank' && (
              <div>
                <label className="label uppercase block mb-1">Nama Bank</label>
                <input
                  type="text"
                  value={wdBankName}
                  onChange={(e) => setWdBankName(e.target.value)}
                  placeholder="BCA / BRI / Mandiri ..."
                  className="input w-full"
                />
              </div>
            )}
            <div>
              <label className="label uppercase block mb-1">
                {wdMethod === 'bank' ? 'No. Rekening' : `No. ${METHOD_LABEL[wdMethod]}`}
              </label>
              <input
                type="text"
                value={wdDestination}
                onChange={(e) => setWdDestination(e.target.value)}
                placeholder={wdMethod === 'bank' ? 'Nomor rekening tujuan' : 'Nomor HP tujuan'}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label uppercase block mb-1">Nominal (Rp)</label>
              <input
                type="number"
                min="1"
                value={wdAmount}
                onChange={(e) => setWdAmount(e.target.value)}
                placeholder="Contoh: 50000"
                className="input w-full"
              />
            </div>
            <button onClick={submitWithdrawRp} className="btn btn--primary w-full">
              Ajukan Penarikan
            </button>
            <p className="text-xs opacity-60">Request masuk antrian dan diproses manual oleh admin pembayaran.</p>
          </div>
        </div>

        {/* Tarik Koin */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title flex items-center gap-2">
              <Coins className="w-4 h-4" /> Tarik ke Koin NanimeID
            </h2>
          </div>
          <div className="card__body space-y-3">
            <div>
              <label className="label uppercase block mb-1">ID User Tujuan</label>
              <input
                type="number"
                min="1"
                value={coinUserId}
                onChange={(e) => setCoinUserId(e.target.value)}
                placeholder="Masukkan ID akun NanimeID kamu"
                className="input w-full"
              />
            </div>
            <div>
              <label className="label uppercase block mb-1">Nominal Gaji (Rp)</label>
              <input
                type="number"
                min="1"
                value={coinAmount}
                onChange={(e) => setCoinAmount(e.target.value)}
                placeholder="Contoh: 100000"
                className="input w-full"
              />
            </div>
            {Number(coinAmount) > 0 && (
              <div className="text-sm font-mono p-2 rounded" style={{ background: 'var(--muted-bg)' }}>
                {formatRp(coinAmount)} → <strong>{new Intl.NumberFormat('id-ID').format(previewCoins)} koin</strong>
              </div>
            )}
            <button onClick={submitWithdrawCoin} className="btn btn--warning w-full">
              Konversi ke Koin
            </button>
            <p className="text-xs opacity-60">Koin langsung masuk ke wallet user tujuan.</p>
          </div>
        </div>
      </div>

      {/* Khusus PiieSya: beri gaji */}
      {canManage && (
        <div className="card">
          <div className="card__header">
            <h2 className="card__title flex items-center gap-2">
              <HandCoins className="w-4 h-4" /> Beri Gaji
            </h2>
          </div>
          <div className="card__body">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label uppercase block mb-1">Admin / Uploader</label>
                <select value={creditAdminId} onChange={(e) => setCreditAdminId(e.target.value)} className="select w-full">
                  <option value="">— Pilih —</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.username} ({a.role}) — {formatRp(a.balance_rp)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label uppercase block mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Contoh: 500000"
                  className="input w-full"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="label uppercase block mb-1">Catatan</label>
                <input
                  type="text"
                  value={creditNote}
                  onChange={(e) => setCreditNote(e.target.value)}
                  placeholder="Opsional"
                  className="input w-full"
                />
              </div>
              <div className="flex items-end">
                <button onClick={submitCredit} className="btn btn--success w-full">
                  Kirim Gaji
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Khusus PiieSya: antrian penarikan */}
      {canManage && (
        <div className="card">
          <div className="card__header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="card__title">Request Penarikan</h2>
            <select value={wdStatus} onChange={(e) => { setWdStatus(e.target.value); setWdPage(1); }} className="select">
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Selesai</option>
              <option value="REJECTED">Ditolak</option>
              <option value="">Semua</option>
            </select>
          </div>
          <div className="table-wrapper">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Admin</th>
                  <th className="text-right">Nominal</th>
                  <th>Metode</th>
                  <th>Tujuan</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center opacity-70">Tidak ada request</td></tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                      <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{fmtTime(w.createdAt)}</td>
                      <td className="px-4 py-2 text-xs font-semibold">{w.admin?.username || `#${w.admin_id}`}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{formatRp(w.amount_rp)}</td>
                      <td className="px-4 py-2 text-xs">
                        <span className="badge badge--primary">{METHOD_LABEL[w.method] || w.method}</span>
                        {w.bank_name && <span className="ml-1 font-mono">{w.bank_name}</span>}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs max-w-[160px] truncate" title={w.destination}>{w.destination || '-'}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`badge ${STATUS_BADGE[w.status] || 'badge--neutral'}`}>{w.status}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {w.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => processWithdrawal(w.id, 'COMPLETED')}
                              className="pagination__btn"
                              title="Tandai selesai (sudah ditransfer)"
                            >
                              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />
                            </button>
                            <button
                              onClick={() => processWithdrawal(w.id, 'REJECTED')}
                              className="pagination__btn"
                              title="Tolak & kembalikan saldo"
                            >
                              <XCircle className="w-4 h-4" style={{ color: 'var(--error)' }} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs opacity-50">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {wdMeta.total > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-2">
              <div className="text-sm opacity-70">Halaman {wdPage} dari {wdMeta.totalPages} — {wdMeta.total} data</div>
              <div className="pagination">
                <button onClick={() => setWdPage((p) => Math.max(1, p - 1))} disabled={wdPage <= 1} className="pagination__btn">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-2 text-sm font-semibold">{wdPage} / {wdMeta.totalPages}</span>
                <button onClick={() => setWdPage((p) => Math.min(wdMeta.totalPages, p + 1))} disabled={wdPage >= wdMeta.totalPages} className="pagination__btn">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Riwayat transaksi sendiri */}
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Riwayat Transaksi Saya</h2>
        </div>
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Tipe</th>
                <th className="text-right">Nominal</th>
                <th>Detail</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center opacity-70">Belum ada transaksi</td></tr>
              ) : (
                transactions.map((t) => {
                  const tl = TYPE_LABEL[t.type] || { label: t.type, badge: 'badge--neutral' };
                  const detail =
                    t.type === 'WITHDRAW_COIN'
                      ? `${new Intl.NumberFormat('id-ID').format(t.coin_amount || 0)} koin → user #${t.target_user_id}`
                      : t.type === 'WITHDRAW_RP'
                        ? `${METHOD_LABEL[t.method] || t.method}${t.bank_name ? ' ' + t.bank_name : ''} → ${t.destination || '-'}`
                        : t.note || '-';
                  return (
                    <tr key={t.id} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                      <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{fmtTime(t.createdAt)}</td>
                      <td className="px-4 py-2"><span className={`badge ${tl.badge}`}>{tl.label}</span></td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{formatRp(t.amount_rp)}</td>
                      <td className="px-4 py-2 text-xs max-w-[260px] truncate" title={detail}>{detail}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`badge ${STATUS_BADGE[t.status] || 'badge--neutral'}`}>{t.status}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {txMeta.total > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-2">
            <div className="text-sm opacity-70">Halaman {txPage} dari {txMeta.totalPages} — {txMeta.total} data</div>
            <div className="pagination">
              <button onClick={() => setTxPage((p) => Math.max(1, p - 1))} disabled={txPage <= 1} className="pagination__btn">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-2 text-sm font-semibold">{txPage} / {txMeta.totalPages}</span>
              <button onClick={() => setTxPage((p) => Math.min(txMeta.totalPages, p + 1))} disabled={txPage >= txMeta.totalPages} className="pagination__btn">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
