"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Wallet, Search, RefreshCcw, PlusCircle, MinusCircle, TrendingUp, Users as UserIcon, ArrowUpCircle, ArrowDownCircle, Calendar, Filter, Globe } from "lucide-react";
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getUserWallet, getUserWalletTransactions, adminWalletCredit, adminWalletDebit, creditUserWallet, debitUserWallet } from "@/lib/api";

export default function AdminWalletPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user, router]);

  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null); // { user, wallet }
  const [tx, setTx] = useState({ page: 1, limit: 20, total: 0, totalPages: 1, items: [] });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  function getToken() {
    const session = getSession();
    return session?.token || '';
  }

  async function loadAll() {
    if (!userId) return;
    setLoading(true);
    try {
      const token = getToken();
      if (!token) { alert('Token tidak tersedia. Silakan login ulang.'); setLoading(false); return; }
      const res = await getUserWallet({ token, userId });
      setUserInfo(res?.data || null);
      const hist = await getUserWalletTransactions({ token, userId, page, limit });
      const d = hist?.data || {};
      const pg = d.pagination || {};
      setTx({
        page: pg.page ?? page,
        limit: pg.limit ?? limit,
        total: pg.total ?? 0,
        totalPages: pg.totalPages ?? 1,
        items: Array.isArray(d.items) ? d.items : [],
      });
    } catch (e) {
      console.error('loadAll wallet error', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  function onSearch(e) {
    e.preventDefault();
    setPage(1);
    loadAll();
  }

  async function onCreditGlobal(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const formEl = e.currentTarget;
      const token = getToken();
      if (!token) { alert('Token tidak tersedia. Silakan login ulang.'); setSubmitting(false); return; }
      const form = new FormData(e.currentTarget);
      const uid = Number(form.get('userId'));
      const amount = Number(form.get('amount'));
      const note = String(form.get('note') || '');
      await adminWalletCredit({ token, userId: uid, amount, note });
      if (String(uid) === String(userId)) await loadAll();
      formEl?.reset();
    } catch (e) {
      console.error('error kredit global', e);
      alert(`Gagal mengkreditkan koin: ${e?.message || 'Terjadi kesalahan'}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function onDebitGlobal(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const formEl = e.currentTarget;
      const token = getToken();
      if (!token) { alert('Token tidak tersedia. Silakan login ulang.'); setSubmitting(false); return; }
      const form = new FormData(e.currentTarget);
      const uid = Number(form.get('userId'));
      const amount = Number(form.get('amount'));
      const note = String(form.get('note') || '');
      await adminWalletDebit({ token, userId: uid, amount, note });
      if (String(uid) === String(userId)) await loadAll();
      formEl?.reset();
    } catch (e) {
      console.error('error debit global', e);
      alert(`Gagal mendebit koin: ${e?.message || 'Terjadi kesalahan'}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function onCreditUser(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const formEl = e.currentTarget;
      const token = getToken();
      if (!token) { alert('Token tidak tersedia. Silakan login ulang.'); setSubmitting(false); return; }
      const form = new FormData(e.currentTarget);
      const amount = Number(form.get('amount'));
      const note = String(form.get('note') || '');
      await creditUserWallet({ token, userId, amount, note });
      await loadAll();
      formEl?.reset();
    } catch (e) {
      console.error('error kredit user', e);
      alert(`Gagal mengkreditkan koin: ${e?.message || 'Terjadi kesalahan'}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function onDebitUser(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const formEl = e.currentTarget;
      const token = getToken();
      if (!token) { alert('Token tidak tersedia. Silakan login ulang.'); setSubmitting(false); return; }
      const form = new FormData(e.currentTarget);
      const amount = Number(form.get('amount'));
      const note = String(form.get('note') || '');
      await debitUserWallet({ token, userId, amount, note });
      await loadAll();
      formEl?.reset();
    } catch (e) {
      console.error('error debit user', e);
      alert(`Gagal mendebit koin: ${e?.message || 'Terjadi kesalahan'}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) return null;

  const formatNumber = (num) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const getTransactionIcon = (type) => {
    if (type?.toLowerCase().includes('credit') || type?.toLowerCase().includes('kredit')) {
      return <ArrowUpCircle className="size-4 text-green-600" />;
    }
    return <ArrowDownCircle className="size-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="grid gap-2">
          <div className="inline-flex w-fit items-center gap-2 px-3 py-2 border-4 rounded-full font-extrabold text-sm" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <Wallet className="size-4" /> Admin Wallet
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">Kelola koin user dan transaksi.</h2>
            <p className="text-sm sm:text-base opacity-80 mt-2 max-w-3xl">Monitor saldo, kredit/debit koin, dan lihat riwayat transaksi user.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
          <button 
            type="button" 
            onClick={() => setShowFilters(!showFilters)} 
            className="px-3 py-2 border-4 rounded-lg font-extrabold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <Filter className="size-4 inline-block mr-1" /> Filter
          </button>
          <button 
            type="button" 
            onClick={loadAll} 
            disabled={loading} 
            className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" 
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}
          >
            <RefreshCcw className="size-4 inline-block mr-1" /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {userInfo && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
            <div className="flex items-center gap-2">
              <Wallet className="size-5" />
              <div className="text-xs font-black uppercase tracking-wide opacity-80">Saldo Koin</div>
            </div>
            <div className="mt-2 text-3xl font-black">{formatNumber(userInfo.wallet?.balance_coins || 0)}</div>
            <div className="text-sm font-semibold opacity-80 mt-1">{userInfo.user?.username}</div>
          </div>
          
          <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #BFDBFE 0%, #93C5FD 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
            <div className="flex items-center gap-2">
              <UserIcon className="size-5" />
              <div className="text-xs font-black uppercase tracking-wide opacity-80">User ID</div>
            </div>
            <div className="mt-2 text-3xl font-black">#{userInfo.user?.id || '-'}</div>
            <div className="text-sm font-semibold opacity-80 mt-1">{userInfo.user?.email || '-'}</div>
          </div>
          
          <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #C7F9CC 0%, #86EFAC 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              <div className="text-xs font-black uppercase tracking-wide opacity-80">Total Transaksi</div>
            </div>
            <div className="mt-2 text-3xl font-black">{formatNumber(tx.total || 0)}</div>
            <div className="text-sm font-semibold opacity-80 mt-1">Semua waktu</div>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <form onSubmit={onSearch} className="grid gap-4 md:grid-cols-[1fr_200px]">
          <div>
            <label className="text-xs font-bold">User ID</label>
            <input 
              type="number" 
              min="1" 
              placeholder="Masukkan User ID" 
              value={userId} 
              onChange={(e) => setUserId(e.target.value)} 
              className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold" 
              style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} 
            />
          </div>
          <div className="flex items-end">
            <button 
              type="submit" 
              className="w-full px-4 py-2 border-4 rounded-xl font-extrabold" 
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}
            >
              <Search className="size-4 inline-block mr-1" /> Cari User
            </button>
          </div>
        </form>
      </div>

      {/* User Info Card */}
      {userInfo && (
        <div className="border-4 rounded-2xl p-6" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-lg">Informasi User</h3>
            <div className="text-2xl font-black text-yellow-500">
              {formatNumber(userInfo.wallet?.balance_coins || 0)} coins
            </div>
          </div>
          <div className="flex items-center gap-4">
            {userInfo.user?.profile?.avatar_url ? (
              <img src={userInfo.user.profile.avatar_url} alt="avatar" className="w-16 h-16 object-cover border-4 rounded-xl" style={{ borderColor: 'var(--panel-border)' }} />
            ) : (
              <div className="w-16 h-16 border-4 rounded-xl flex items-center justify-center" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                <UserIcon className="size-6 opacity-50" />
              </div>
            )}
            <div className="grid gap-1">
              <div className="font-extrabold text-lg">{userInfo.user?.username || '-'}</div>
              <div className="text-sm opacity-70">ID: {userInfo.user?.id ?? '-'}</div>
              <div className="text-sm opacity-70">{userInfo.user?.email || '-'}</div>
              <div className="text-sm opacity-70">{userInfo.user?.profile?.full_name || '-'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Global Actions */}
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <h3 className="font-extrabold mb-4 flex items-center gap-2">
            <Globe className="size-4" /> Transaksi Global
          </h3>
          <div className="grid gap-4">
            <form onSubmit={onCreditGlobal} className="space-y-3">
              <div>
                <label className="text-xs font-bold">User ID</label>
                <input name="userId" type="number" placeholder="User ID" className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
              </div>
              <div>
                <label className="text-xs font-bold">Jumlah Koin</label>
                <input name="amount" type="number" min="1" placeholder="Jumlah koin" className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
              </div>
              <div>
                <label className="text-xs font-bold">Catatan</label>
                <input name="note" maxLength={80} placeholder="Catatan (max 80)" className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>
              <button type="submit" disabled={submitting} className="w-full px-4 py-3 border-4 rounded-xl font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: '#22C55E', borderColor: 'var(--panel-border)', color: 'white' }}>
                <PlusCircle className="size-4 inline-block mr-1" /> {submitting ? 'Processing...' : 'Kreditkan'}
              </button>
            </form>
            
            <form onSubmit={onDebitGlobal} className="space-y-3">
              <div>
                <label className="text-xs font-bold">User ID</label>
                <input name="userId" type="number" placeholder="User ID" className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
              </div>
              <div>
                <label className="text-xs font-bold">Jumlah Koin</label>
                <input name="amount" type="number" min="1" placeholder="Jumlah koin" className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
              </div>
              <div>
                <label className="text-xs font-bold">Catatan</label>
                <input name="note" maxLength={80} placeholder="Catatan (max 80)" className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>
              <button type="submit" disabled={submitting} className="w-full px-4 py-3 border-4 rounded-xl font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: '#EF4444', borderColor: 'var(--panel-border)', color: 'white' }}>
                <MinusCircle className="size-4 inline-block mr-1" /> {submitting ? 'Processing...' : 'Debetkan'}
              </button>
            </form>
          </div>
        </div>

        {/* Current User Actions */}
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <h3 className="font-extrabold mb-4 flex items-center gap-2">
            <UserIcon className="size-4" /> Transaksi User Saat Ini
          </h3>
          {!userId ? (
            <div className="text-center py-8 opacity-70">
              <UserIcon className="size-8 mx-auto mb-2 opacity-50" />
              <p>Pilih user terlebih dahulu</p>
            </div>
          ) : (
            <div className="grid gap-4">
              <form onSubmit={onCreditUser} className="space-y-3">
                <div>
                  <label className="text-xs font-bold">Jumlah Koin</label>
                  <input name="amount" type="number" min="1" placeholder="Jumlah koin" className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold">Catatan</label>
                  <input name="note" maxLength={80} placeholder="Catatan (max 80)" className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </div>
                <button type="submit" disabled={submitting} className="w-full px-4 py-3 border-4 rounded-xl font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: '#22C55E', borderColor: 'var(--panel-border)', color: 'white' }}>
                  <PlusCircle className="size-4 inline-block mr-1" /> {submitting ? 'Processing...' : 'Kreditkan'}
                </button>
              </form>
              
              <form onSubmit={onDebitUser} className="space-y-3">
                <div>
                  <label className="text-xs font-bold">Jumlah Koin</label>
                  <input name="amount" type="number" min="1" placeholder="Jumlah koin" className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
                </div>
                <div>
                  <label className="text-xs font-bold">Catatan</label>
                  <input name="note" maxLength={80} placeholder="Catatan (max 80)" className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
                </div>
                <button type="submit" disabled={submitting} className="w-full px-4 py-3 border-4 rounded-xl font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: '#EF4444', borderColor: 'var(--panel-border)', color: 'white' }}>
                  <MinusCircle className="size-4 inline-block mr-1" /> {submitting ? 'Processing...' : 'Debetkan'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="border-4 rounded-2xl overflow-hidden" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
          <h3 className="font-extrabold flex items-center gap-2">
            <Calendar className="size-4" /> Riwayat Transaksi
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--background)' }}>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">ID</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Tipe</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Jumlah</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Referensi</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {tx.items.map((transaction) => (
                <tr key={transaction.id} className="border-t" style={{ borderColor: 'var(--panel-border)' }}>
                  <td className="px-4 py-3 font-mono text-sm">#{transaction.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(transaction.type)}
                      <span className="font-semibold">{transaction.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount > 0 ? '+' : ''}{formatNumber(transaction.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{transaction.ref || '-'}</td>
                  <td className="px-4 py-3 text-sm">{transaction.createdAt ? formatDate(transaction.createdAt) : '-'}</td>
                </tr>
              ))}
              {tx.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm opacity-70">
                    {loading ? 'Loading...' : 'Tidak ada transaksi'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {tx.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm opacity-70">
            Menampilkan {tx.items.length} dari {formatNumber(tx.total)} transaksi
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-2 border-4 rounded-xl font-extrabold disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm font-semibold">
              {page} / {tx.totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(tx.totalPages, page + 1))}
              disabled={page >= tx.totalPages}
              className="px-3 py-2 border-4 rounded-xl font-extrabold disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
