"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet, Search, RefreshCcw, PlusCircle, MinusCircle } from "lucide-react";
import { getUserWallet, getUserWalletTransactions, adminWalletCredit, adminWalletDebit, creditUserWallet, debitUserWallet } from "@/lib/api";

export default function AdminWalletPage() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null); // { user, wallet }
  const [tx, setTx] = useState({ page: 1, limit: 20, total: 0, totalPages: 1, items: [] });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [submitting, setSubmitting] = useState(false);

  function getToken() {
    try {
      const t = localStorage.getItem('access_token');
      if (t) return t;
      const raw = localStorage.getItem('nanimeid_admin_session');
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.access_token) return s.access_token;
        if (s?.token) return s.token;
        if (s?.auth?.access_token) return s.auth.access_token;
      }
    } catch {}
    return '';
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2"><Wallet className="size-5" /> Admin Wallet</h2>
        <button onClick={loadAll} disabled={loading} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
          <RefreshCcw className="size-4 inline-block mr-1" /> {loading ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {/* Search by User ID */}
      <form onSubmit={onSearch} className="grid sm:grid-cols-[1fr_140px] gap-3">
        <input type="number" min="1" placeholder="Masukkan User ID" value={userId} onChange={(e) => setUserId(e.target.value)} className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
        <button type="submit" className="px-3 py-2 border-4 rounded-lg font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
          <Search className="size-4 inline-block mr-1" /> Cari
        </button>
      </form>

      {/* User Wallet Summary */}
      <div className="border-4 rounded-lg p-4 grid gap-3" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <div className="font-extrabold mb-1">Ringkasan</div>
        {userInfo ? (
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <div className="col-span-2 flex items-center gap-3">
              {userInfo.user?.profile?.avatar_url ? (
                <img src={userInfo.user.profile.avatar_url} alt="avatar" className="w-10 h-10 object-cover border-4 rounded" style={{ borderColor: 'var(--panel-border)' }} />
              ) : null}
              <div className="font-extrabold">{userInfo.user?.username || '-'} <span className="opacity-70 text-xs">(ID: {userInfo.user?.id ?? '-'})</span></div>
            </div>
            <div><span className="opacity-70">Email:</span> {userInfo.user?.email || '-'}</div>
            <div><span className="opacity-70">Nama:</span> {userInfo.user?.profile?.full_name || '-'}</div>
            <div className="col-span-2 font-extrabold text-lg">Saldo Koin: {userInfo.wallet?.balance_coins ?? 0}</div>
          </div>
        ) : (
          <div className="text-sm opacity-70">Belum ada data. Cari user terlebih dahulu.</div>
        )}
      </div>

      {/* Credit/Debit (Global by userId) */}
      <div className="grid md:grid-cols-2 gap-4">
        <form onSubmit={onCreditGlobal} className="grid gap-2 p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="font-extrabold flex items-center gap-2"><PlusCircle className="size-4" /> Kredit Koin (Global)</div>
          <input name="userId" type="number" placeholder="User ID" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
          <input name="amount" type="number" min="1" placeholder="Jumlah koin" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
          <input name="note" maxLength={80} placeholder="Catatan (max 80)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
          <button type="submit" disabled={submitting} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>Kreditkan</button>
        </form>

        <form onSubmit={onDebitGlobal} className="grid gap-2 p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="font-extrabold flex items-center gap-2"><MinusCircle className="size-4" /> Debit Koin (Global)</div>
          <input name="userId" type="number" placeholder="User ID" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
          <input name="amount" type="number" min="1" placeholder="Jumlah koin" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
          <input name="note" maxLength={80} placeholder="Catatan (max 80)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
          <button type="submit" disabled={submitting} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>Debetkan</button>
        </form>
      </div>

      {/* Credit/Debit for loaded user */}
      <div className="grid md:grid-cols-2 gap-4">
        <form onSubmit={onCreditUser} className="grid gap-2 p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="font-extrabold">Kredit Koin (User saat ini)</div>
          <input name="amount" type="number" min="1" placeholder="Jumlah koin" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
          <input name="note" maxLength={80} placeholder="Catatan (max 80)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
          <button type="submit" disabled={submitting || !userId} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>Kreditkan</button>
        </form>

        <form onSubmit={onDebitUser} className="grid gap-2 p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="font-extrabold">Debit Koin (User saat ini)</div>
          <input name="amount" type="number" min="1" placeholder="Jumlah koin" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
          <input name="note" maxLength={80} placeholder="Catatan (max 80)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
          <button type="submit" disabled={submitting || !userId} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>Debetkan</button>
        </form>
      </div>

      {/* Transactions Table */}
      <div className="overflow-auto">
        <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <thead style={{ background: 'var(--panel-bg)' }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Type</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Amount</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Ref</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {tx.items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>{it.id}</td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>{it.type}</td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>{it.amount}</td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>{it.ref}</td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>{it.createdAt ? new Date(it.createdAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
            {tx.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm opacity-70">{loading ? 'Memuat...' : 'Tidak ada transaksi.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Prev</button>
        <div className="text-sm font-extrabold">Page {page} / {tx.totalPages || 1}</div>
        <button disabled={page >= (tx.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Next</button>
      </div>
    </div>
  );
}
