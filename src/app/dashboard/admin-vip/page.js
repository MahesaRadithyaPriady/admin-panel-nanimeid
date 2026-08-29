"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Search, RefreshCcw, Check, X, RotateCcw, CreditCard, Users, Clock, AlertTriangle, Filter } from "lucide-react";
import { getUserVipStatus, getUserVipHistory, activateUserVip, renewUserVip, cancelUserVip, setUserVipAutoRenew, listVipUsers } from "@/lib/api";

export default function AdminVipPage() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1, items: [] });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [submitting, setSubmitting] = useState(false);

  // Daftar semua user VIP dengan filter
  const [vipList, setVipList] = useState({ page: 1, limit: 20, total: 0, totalPages: 1, items: [] });
  const [vipListLoading, setVipListLoading] = useState(false);
  const [vipFilter, setVipFilter] = useState({ status: '', expiresInDays: '', expired: '', active: '', q: '' });
  const [vipListPage, setVipListPage] = useState(1);

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

  async function loadVipList() {
    setVipListLoading(true);
    try {
      const token = getToken();
      if (!token) { setVipListLoading(false); return; }
      const res = await listVipUsers({
        token,
        page: vipListPage,
        limit: 20,
        status: vipFilter.status,
        expiresInDays: vipFilter.expiresInDays,
        expired: vipFilter.expired,
        active: vipFilter.active,
        q: vipFilter.q,
      });
      const d = res?.data || {};
      const pg = d.pagination || {};
      setVipList({
        page: pg.page ?? vipListPage,
        limit: pg.limit ?? 20,
        total: pg.total ?? 0,
        totalPages: pg.totalPages ?? 1,
        items: Array.isArray(d.items) ? d.items : [],
      });
    } catch (e) {
      console.error('loadVipList error', e);
    } finally {
      setVipListLoading(false);
    }
  }

  useEffect(() => {
    loadVipList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vipListPage]);

  function applyVipFilter() {
    setVipListPage(1);
    setTimeout(() => loadVipList(), 0);
  }

  function resetVipFilter() {
    setVipFilter({ status: '', expiresInDays: '', expired: '', active: '', q: '' });
    setVipListPage(1);
    setTimeout(() => loadVipList(), 0);
  }

  function setQuickFilter(key) {
    // Reset semua filter dulu, lalu set yang dipilih
    const newFilter = { status: '', expiresInDays: '', expired: '', active: '', q: vipFilter.q };
    if (key === 'active') newFilter.active = 'true';
    else if (key === 'expired') newFilter.expired = 'true';
    else if (key === '7days') newFilter.expiresInDays = '7';
    else if (key === '30days') newFilter.expiresInDays = '30';
    else if (key === '3days') newFilter.expiresInDays = '3';
    else if (key === 'canceled') newFilter.status = 'CANCELED';
    setVipFilter(newFilter);
    setVipListPage(1);
    setTimeout(() => loadVipList(), 0);
  }

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
        <button onClick={loadAll} disabled={loading} className="btn btn--primary disabled:opacity-60">
          <RefreshCcw className="w-4 h-4" /> {loading ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {/* Search by User ID */}
      <form onSubmit={onSearch} className="grid sm:grid-cols-[1fr_140px] gap-3">
        <div className="grid gap-1">
          <div className="text-xs font-extrabold">User ID</div>
          <input type="number" min="1" placeholder="Masukkan User ID" value={userId} onChange={(e) => setUserId(e.target.value)} className="input" />
        </div>
        <button type="submit" className="btn btn--primary">
          <Search className="w-4 h-4" /> Cari
        </button>
      </form>

      {/* Status Card */}
      <div className="card p-4">
        <div className="font-extrabold mb-2">Status VIP</div>
        {status ? (
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <div className="col-span-2 flex items-center gap-3">
              {status.user?.profile?.avatar_url ? (
                <img src={status.user.profile.avatar_url} alt="avatar" className="w-10 h-10 object-cover border-2 border-[var(--border)]" loading="lazy" decoding="async" />
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
        <form onSubmit={onActivate} className="card p-3 grid gap-2">
          <div className="font-extrabold flex items-center gap-2"><Check className="size-4" /> Activate VIP</div>
          <div className="grid gap-1">
            <div className="text-xs font-extrabold">VIP Level</div>
            <input name="vip_level" placeholder="VIP Level (Diamond)" className="input" />
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-extrabold">Durasi (hari)</div>
            <input name="durationDays" type="number" placeholder="Durasi (hari) default 30" className="input" />
          </div>
          <div className="flex items-center gap-2">
            <input id="act-autorenew" name="auto_renew" type="checkbox" className="size-4" />
            <label htmlFor="act-autorenew" className="text-sm">Auto renew</label>
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-extrabold">Metode Pembayaran</div>
            <input name="payment_method" placeholder="Metode Pembayaran (GOPAY/OVO/...)" className="input" />
          </div>
          <div className="grid gap-1">
            <div className="text-xs font-extrabold">Catatan</div>
            <textarea name="notes" rows={2} placeholder="Catatan" className="input" />
          </div>
          <button type="submit" disabled={submitting || !userId} className="btn btn--primary disabled:opacity-60">Aktifkan</button>
        </form>

        {/* Renew / Cancel / Toggle Auto-Renew */}
        <div className="grid gap-4">
          <form onSubmit={onRenew} className="card p-3 grid gap-2">
            <div className="font-extrabold flex items-center gap-2"><CreditCard className="size-4" /> Renew VIP</div>
            <div className="grid gap-1">
              <div className="text-xs font-extrabold">Durasi (hari)</div>
              <input name="durationDays" type="number" placeholder="Durasi (hari) default 30" className="input" />
            </div>
            <div className="grid gap-1">
              <div className="text-xs font-extrabold">Metode Pembayaran</div>
              <input name="payment_method" placeholder="Metode Pembayaran (BANK_TRANSFER/...)" className="input" />
            </div>
            <div className="grid gap-1">
              <div className="text-xs font-extrabold">Catatan</div>
              <textarea name="notes" rows={2} placeholder="Catatan" className="input" />
            </div>
            <button type="submit" disabled={submitting || !userId} className="btn btn--primary disabled:opacity-60">Perpanjang</button>
          </form>

          <div className="card p-3 grid gap-2">
            <div className="font-extrabold flex items-center gap-2"><RotateCcw className="size-4" /> Auto-Renew</div>
            <div className="flex items-center gap-2">
              <button onClick={() => onToggleAutoRenew(true)} disabled={submitting || !userId} className="btn btn--primary disabled:opacity-60">Enable</button>
              <button onClick={() => onToggleAutoRenew(false)} disabled={submitting || !userId} className="btn btn--secondary disabled:opacity-60">Disable</button>
            </div>
            <div className="font-extrabold flex items-center gap-2 mt-2"><X className="size-4" /> Batalkan VIP</div>
            <button onClick={onCancel} disabled={submitting || !userId} className="btn btn--danger disabled:opacity-60">Batalkan</button>
          </div>
        </div>
      </div>

      {/* Daftar Semua User VIP dengan Filter Durasi */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b-2 border-[var(--border)]" style={{ background: 'var(--background)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold flex items-center gap-2 text-lg">
                <Users className="size-5" /> Daftar User VIP
              </h3>
              <p className="text-xs opacity-70 mt-1">Filter user VIP berdasarkan sisa waktu, status, atau level</p>
            </div>
            <button type="button" onClick={loadVipList} disabled={vipListLoading} className="btn btn--secondary btn--sm">
              <RefreshCcw className={`w-3.5 h-3.5 ${vipListLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {[
              { key: 'all', label: 'Semua', icon: null },
              { key: 'active', label: 'Aktif', icon: <Check className="w-3 h-3" /> },
              { key: '3days', label: '≤ 3 Hari', icon: <AlertTriangle className="w-3 h-3" /> },
              { key: '7days', label: '≤ 7 Hari', icon: <Clock className="w-3 h-3" /> },
              { key: '30days', label: '≤ 30 Hari', icon: <Clock className="w-3 h-3" /> },
              { key: 'expired', label: 'Sudah Expired', icon: <X className="w-3 h-3" /> },
              { key: 'canceled', label: 'Dibatalkan', icon: <X className="w-3 h-3" /> },
            ].map((f) => {
              const isActive = (f.key === 'all' && !vipFilter.status && !vipFilter.expiresInDays && !vipFilter.expired && !vipFilter.active)
                || (f.key === 'active' && vipFilter.active === 'true')
                || (f.key === '3days' && vipFilter.expiresInDays === '3')
                || (f.key === '7days' && vipFilter.expiresInDays === '7')
                || (f.key === '30days' && vipFilter.expiresInDays === '30')
                || (f.key === 'expired' && vipFilter.expired === 'true')
                || (f.key === 'canceled' && vipFilter.status === 'CANCELED');
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => f.key === 'all' ? resetVipFilter() : setQuickFilter(f.key)}
                  className="btn btn--sm inline-flex items-center gap-1"
                  style={{
                    background: isActive ? 'var(--accent-primary)' : 'transparent',
                    color: isActive ? 'var(--accent-primary-foreground)' : 'var(--muted)',
                    borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-muted)',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  {f.icon}{f.label}
                </button>
              );
            })}
          </div>

          {/* Search & Custom Filter */}
          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] mt-3">
            <input
              type="text"
              placeholder="Cari username/email..."
              value={vipFilter.q}
              onChange={(e) => setVipFilter({ ...vipFilter, q: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyVipFilter())}
              className="input"
            />
            <select
              value={vipFilter.status}
              onChange={(e) => setVipFilter({ ...vipFilter, status: e.target.value, expired: '', active: '' })}
              className="input"
              style={{ width: 'auto' }}
            >
              <option value="">Semua Status</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELED">Canceled</option>
            </select>
            <button type="button" onClick={applyVipFilter} className="btn btn--primary btn--sm">
              <Filter className="w-3.5 h-3.5" /> Terapkan
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--background)' }}>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Level</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide">Sisa Hari</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Berakhir Pada</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Auto Renew</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {vipList.items.map((v) => {
                const daysRemaining = v.days_remaining;
                const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;
                const isWarning = daysRemaining !== null && daysRemaining > 3 && daysRemaining <= 7;
                return (
                  <tr key={v.id} className="border-t-2 border-[var(--border)] hover:bg-[var(--surface-muted)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {v.user?.profile?.avatar_url ? (
                          <img src={v.user.profile.avatar_url} alt={v.user.username} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-muted)' }}>
                            <Users className="w-3.5 h-3.5 opacity-50" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold truncate">{v.user?.username || 'Unknown'}</div>
                          <div className="text-xs opacity-60 truncate">{v.user?.email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold" style={{ color: '#facc15' }}>{v.vip_level || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold" style={{
                        color: v.status === 'ACTIVE' ? '#22c55e' : v.status === 'EXPIRED' ? '#ef4444' : '#94a3b8'
                      }}>{v.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {daysRemaining === null ? (
                        <span className="opacity-50">-</span>
                      ) : daysRemaining < 0 ? (
                        <span className="font-bold text-red-500">Expired</span>
                      ) : (
                        <span className={`font-bold ${isUrgent ? 'text-red-500' : isWarning ? 'text-yellow-500' : ''}`}>
                          {daysRemaining} hari
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {v.end_at ? new Date(v.end_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {v.auto_renew ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 opacity-40" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => { setUserId(String(v.user_id)); }}
                        className="btn btn--secondary btn--sm"
                      >
                        <Search className="w-3 h-3" /> Kelola
                      </button>
                    </td>
                  </tr>
                );
              })}
              {vipList.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm opacity-70">
                    {vipListLoading ? 'Memuat...' : 'Tidak ada user VIP untuk filter ini'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination VIP List */}
        {vipList.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t-2 border-[var(--border)]">
            <div className="text-xs opacity-70">
              Menampilkan {vipList.items.length} dari {vipList.total.toLocaleString()} user VIP
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setVipListPage(Math.max(1, vipListPage - 1))} disabled={vipListPage <= 1} className="btn btn--secondary btn--sm disabled:opacity-60">
                Prev
              </button>
              <span className="px-2 py-1 text-xs font-bold">{vipListPage} / {vipList.totalPages}</span>
              <button onClick={() => setVipListPage(Math.min(vipList.totalPages, vipListPage + 1))} disabled={vipListPage >= vipList.totalPages} className="btn btn--secondary btn--sm disabled:opacity-60">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="overflow-auto">
        <table className="min-w-full border-2 border-[var(--border)] overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <thead style={{ background: 'var(--panel-bg)' }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>Action</th>
              <th className="text-left px-3 py-2 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>Duration (days)</th>
              <th className="text-left px-3 py-2 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {history.items.map((it, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>{it.action}</td>
                <td className="px-3 py-2 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>{it.duration_days ?? '-'}</td>
                <td className="px-3 py-2 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>{it.createdAt ? new Date(it.createdAt).toLocaleString() : '-'}</td>
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
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn btn--secondary disabled:opacity-60">Prev</button>
        <div className="text-sm font-extrabold">Page {page} / {history.totalPages || 1}</div>
        <button disabled={page >= (history.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="btn btn--secondary disabled:opacity-60">Next</button>
      </div>
    </div>
  );
}
