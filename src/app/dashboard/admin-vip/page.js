"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Search, RefreshCcw, Check, X, RotateCcw, CreditCard } from "lucide-react";
import { getUserVipStatus, getUserVipHistory, activateUserVip, renewUserVip, cancelUserVip, setUserVipAutoRenew } from "@/lib/api";

export default function AdminVipPage() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1, items: [] });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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
      if (!token) {
        alert('Token tidak tersedia. Silakan login ulang.');
        setLoading(false);
        return;
      }
      const st = await getUserVipStatus({ token, userId });
      setStatus(st?.data || null);
      const hs = await getUserVipHistory({ token, userId, page, pageSize });
      const d = hs?.data || {};
      setHistory({
        page: d.page ?? page,
        pageSize: d.pageSize ?? pageSize,
        total: d.total ?? 0,
        totalPages: d.totalPages ?? 1,
        items: Array.isArray(d.items) ? d.items : [],
      });
    } catch (e) {
      console.error('loadAll error', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  function onSearch(e) {
    e.preventDefault();
    setPage(1);
    loadAll();
  }

  async function onActivate(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const token = getToken();
      if (!token) { alert('Token tidak tersedia. Silakan login ulang.'); setSubmitting(false); return; }
      const form = new FormData(e.currentTarget);
      const payload = {
        vip_level: form.get('vip_level') || 'Diamond',
        durationDays: Number(form.get('durationDays') || 30),
        auto_renew: form.get('auto_renew') === 'on',
        payment_method: form.get('payment_method') || 'BANK_TRANSFER',
        notes: form.get('notes') || ''
      };
      await activateUserVip({ token, userId, payload });
      await loadAll();
      e.currentTarget.reset();
    } catch (e) {
      console.error('activate error', e);
    } finally {
      setSubmitting(false);
    }
  }

  async function onRenew(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const token = getToken();
      if (!token) { alert('Token tidak tersedia. Silakan login ulang.'); setSubmitting(false); return; }
      const form = new FormData(e.currentTarget);
      const payload = {
        durationDays: Number(form.get('durationDays') || 30),
        payment_method: form.get('payment_method') || 'BANK_TRANSFER',
        notes: form.get('notes') || ''
      };
      await renewUserVip({ token, userId, payload });
      await loadAll();
      e.currentTarget.reset();
    } catch (e) {
      console.error('renew error', e);
    } finally {
      setSubmitting(false);
    }
  }

  async function onCancel() {
    if (submitting) return;
    const ok = confirm('Batalkan VIP user ini?');
    if (!ok) return;
    setSubmitting(true);
    try {
      const token = getToken();
      if (!token) { alert('Token tidak tersedia. Silakan login ulang.'); setSubmitting(false); return; }
      await cancelUserVip({ token, userId, payload: {} });
      await loadAll();
    } catch (e) {
      console.error('cancel error', e);
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggleAutoRenew(val) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const token = getToken();
      if (!token) { alert('Token tidak tersedia. Silakan login ulang.'); setSubmitting(false); return; }
      await setUserVipAutoRenew({ token, userId, auto_renew: !!val });
      await loadAll();
    } catch (e) {
      console.error('auto-renew error', e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2"><Crown className="size-5" /> Admin VIP</h2>
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

      {/* Status Card */}
      <div className="border-4 rounded-lg p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <div className="font-extrabold mb-2">Status VIP</div>
        {status ? (
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <div className="col-span-2 flex items-center gap-3">
              {status.user?.profile?.avatar_url ? (
                <img src={status.user.profile.avatar_url} alt="avatar" className="w-10 h-10 object-cover border-4 rounded" style={{ borderColor: 'var(--panel-border)' }} />
              ) : null}
              <div className="font-extrabold">{status.user?.username || '-'} <span className="opacity-70 text-xs">(ID: {status.user?.id ?? '-'})</span></div>
            </div>
            <div><span className="opacity-70">Email:</span> {status.user?.email || '-'}</div>
            <div><span className="opacity-70">Nama:</span> {status.user?.profile?.full_name || '-'}</div>
            <div><span className="opacity-70">Level:</span> {status.vip?.vip_level || '-'}</div>
            <div><span className="opacity-70">Status:</span> {status.vip?.status || '-'}</div>
            <div><span className="opacity-70">Auto Renew:</span> {String(!!status.vip?.auto_renew)}</div>
            <div><span className="opacity-70">Start:</span> {status.vip?.start_at ? new Date(status.vip.start_at).toLocaleString() : '-'}</div>
            <div><span className="opacity-70">End:</span> {status.vip?.end_at ? new Date(status.vip.end_at).toLocaleString() : '-'}</div>
            <div><span className="opacity-70">Payment:</span> {status.vip?.payment_method || '-'}</div>
            <div><span className="opacity-70">Last Payment:</span> {status.vip?.last_payment_at ? new Date(status.vip.last_payment_at).toLocaleString() : '-'}</div>
          </div>
        ) : (
          <div className="text-sm opacity-70">Belum ada data. Cari user terlebih dahulu.</div>
        )}
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Activate */}
        <form onSubmit={onActivate} className="grid gap-2 p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="font-extrabold flex items-center gap-2"><Check className="size-4" /> Activate VIP</div>
          <input name="vip_level" placeholder="VIP Level (Diamond)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
          <input name="durationDays" type="number" placeholder="Durasi (hari) default 30" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
          <div className="flex items-center gap-2">
            <input id="act-autorenew" name="auto_renew" type="checkbox" className="size-4" />
            <label htmlFor="act-autorenew" className="text-sm">Auto renew</label>
          </div>
          <input name="payment_method" placeholder="Metode Pembayaran (GOPAY/OVO/...)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
          <textarea name="notes" rows={2} placeholder="Catatan" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
          <button type="submit" disabled={submitting || !userId} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>Aktifkan</button>
        </form>

        {/* Renew / Cancel / Toggle Auto-Renew */}
        <div className="grid gap-4">
          <form onSubmit={onRenew} className="grid gap-2 p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="font-extrabold flex items-center gap-2"><CreditCard className="size-4" /> Renew VIP</div>
            <input name="durationDays" type="number" placeholder="Durasi (hari) default 30" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
            <input name="payment_method" placeholder="Metode Pembayaran (BANK_TRANSFER/...)" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
            <textarea name="notes" rows={2} placeholder="Catatan" className="px-3 py-2 border-4 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
            <button type="submit" disabled={submitting || !userId} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>Perpanjang</button>
          </form>

          <div className="grid gap-2 p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="font-extrabold flex items-center gap-2"><RotateCcw className="size-4" /> Auto-Renew</div>
            <div className="flex items-center gap-2">
              <button onClick={() => onToggleAutoRenew(true)} disabled={submitting || !userId} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>Enable</button>
              <button onClick={() => onToggleAutoRenew(false)} disabled={submitting || !userId} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>Disable</button>
            </div>
            <div className="font-extrabold flex items-center gap-2 mt-2"><X className="size-4" /> Batalkan VIP</div>
            <button onClick={onCancel} disabled={submitting || !userId} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>Batalkan</button>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-auto">
        <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <thead style={{ background: 'var(--panel-bg)' }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Action</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Duration (days)</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {history.items.map((it, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>{it.action}</td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>{it.duration_days ?? '-'}</td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>{it.createdAt ? new Date(it.createdAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
            {history.items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-sm opacity-70">{loading ? 'Memuat...' : 'Tidak ada riwayat.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Prev</button>
        <div className="text-sm font-extrabold">Page {page} / {history.totalPages || 1}</div>
        <button disabled={page >= (history.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 border-4 rounded-lg disabled:opacity-60 font-extrabold" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Next</button>
      </div>
    </div>
  );
}
