'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BellRing, Send, Search, Users, User, Globe, RefreshCw, AlertTriangle, X, Check, Smartphone, Inbox, Radio } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { sendPushNotif, listPushNotifHistory, getPushNotifStats, searchUsersForNotif } from '@/lib/api';

export default function PushNotifPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const [form, setForm] = useState({
    title: '',
    body: '',
    target_type: 'all',
    user_ids: [],
    inbox: true,
    link_url: '',
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyQ, setHistoryQ] = useState('');

  const [confirmModal, setConfirmModal] = useState(null);

  const loadStats = async () => {
    try {
      const token = getSession()?.token;
      const data = await getPushNotifStats({ token });
      setStats(data?.stats || data);
    } catch (e) {
      toast.error(e?.message || 'Gagal memuat stats');
    }
  };

  const loadHistory = async (pageNum) => {
    try {
      setLoadingHistory(true);
      const token = getSession()?.token;
      const data = await listPushNotifHistory({ token, page: pageNum, limit: 10, q: historyQ });
      setHistory(data?.items || []);
      setHistoryPage(data?.page || 1);
      setHistoryTotalPages(data?.totalPages || 1);
    } catch (e) {
      toast.error(e?.message || 'Gagal memuat history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadStats();
      loadHistory(1);
    }
  }, [user]);

  const doSearch = (query) => {
    setSearchQ(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const token = getSession()?.token;
        const data = await searchUsersForNotif({ token, q: query.trim(), limit: 10 });
        setSearchResults(data?.items || []);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const toggleUser = (u) => {
    setForm((f) => {
      const exists = f.user_ids.some((x) => x.id === u.id);
      if (exists) return { ...f, user_ids: f.user_ids.filter((x) => x.id !== u.id) };
      if (f.target_type === 'single') return { ...f, user_ids: [u] };
      return { ...f, user_ids: [...f.user_ids, u] };
    });
  };

  const removeUser = (id) => {
    setForm((f) => ({ ...f, user_ids: f.user_ids.filter((x) => x.id !== id) }));
  };

  const onSubmit = (e) => {
    e?.preventDefault?.();
    if (!form.title.trim()) return toast.error('Title wajib diisi');
    if (!form.body.trim()) return toast.error('Body wajib diisi');
    if (form.target_type === 'single' && form.user_ids.length === 0) return toast.error('Pilih user untuk target single');
    if (form.target_type === 'multiple' && form.user_ids.length === 0) return toast.error('Pilih minimal 1 user untuk target multiple');

    const targetLabel = form.target_type === 'all' ? 'SEMUA USER' : form.target_type === 'single' ? `1 USER (${form.user_ids[0]?.username || form.user_ids[0]?.id})` : `${form.user_ids.length} USER`;

    setConfirmModal({
      title: 'Kirim Push Notif?',
      message: `Notifikasi akan dikirim ke ${targetLabel}. Title: "${form.title}". Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: 'Kirim',
      confirmColor: '#f59e0b',
      onConfirm: doSend,
    });
  };

  const doSend = async () => {
    setConfirmModal(null);
    try {
      setSending(true);
      const token = getSession()?.token;
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        target_type: form.target_type,
        inbox: form.inbox,
        link_url: form.link_url?.trim() || undefined,
      };
      if (form.target_type === 'single') {
        payload.user_id = form.user_ids[0]?.id;
      } else if (form.target_type === 'multiple') {
        payload.user_ids = form.user_ids.map((u) => u.id);
      }
      const data = await sendPushNotif({ token, payload });
      setResult(data);
      toast.success(data?.message || 'Push notif terkirim');
      setForm({ title: '', body: '', target_type: 'all', user_ids: [], inbox: true, link_url: '' });
      setSearchQ('');
      setSearchResults([]);
      loadStats();
      loadHistory(1);
    } catch (e) {
      toast.error(e?.message || 'Gagal mengirim push notif');
    } finally {
      setSending(false);
    }
  };

  if (loading || !user) return null;

  const targetTypes = [
    { val: 'all', label: 'Semua User', desc: 'Broadcast ke semua user', icon: Globe },
    { val: 'multiple', label: 'Multi User', desc: 'Pilih beberapa user', icon: Users },
    { val: 'single', label: '1 User', desc: 'Kirim ke 1 user spesifik', icon: User },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <BellRing className="size-5" />
          Push Notifikasi
        </h2>
        <button type="button" onClick={() => { loadStats(); loadHistory(1); }} className="btn btn--secondary">
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="size-4 opacity-60" />
              <div className="text-xs font-bold opacity-60">Total FCM Token</div>
            </div>
            <div className="text-2xl font-extrabold">{stats.total_tokens ?? 0}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="size-4 opacity-60" />
              <div className="text-xs font-bold opacity-60">User dgn Token</div>
            </div>
            <div className="text-2xl font-extrabold">{stats.users_with_tokens ?? 0}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="size-4 opacity-60" />
              <div className="text-xs font-bold opacity-60">Total Broadcast</div>
            </div>
            <div className="text-2xl font-extrabold">{stats.total_broadcasts ?? 0}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Check className="size-4 opacity-60" />
              <div className="text-xs font-bold opacity-60">FCM Status</div>
            </div>
            <div className={`text-2xl font-extrabold ${stats.fcm_ready ? 'text-green-500' : 'text-red-500'}`}>
              {stats.fcm_ready ? 'Ready' : 'Off'}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* ===== Form ===== */}
        <form onSubmit={onSubmit} className="card p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 section-title pb-3">
            <Send className="size-4" />
            <span>Kirim Notifikasi Baru</span>
          </div>

          {/* Target Type Selector */}
          <div>
            <label className="text-xs font-extrabold opacity-60 mb-2 block uppercase tracking-wider">Target Penerima</label>
            <div className="grid grid-cols-3 gap-2">
              {targetTypes.map((t) => {
                const Icon = t.icon;
                const active = form.target_type === t.val;
                return (
                  <button
                    key={t.val}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, target_type: t.val, user_ids: [] }))}
                    className={`flex flex-col items-center gap-1.5 p-3 border-2 rounded-lg text-xs font-extrabold transition-all ${active ? 'btn--primary' : 'btn--secondary opacity-70 hover:opacity-100'}`}
                    style={active ? {} : { boxShadow: 'var(--shadow-sm)' }}
                  >
                    <Icon className="size-5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-xs opacity-50 mt-2">
              {targetTypes.find((t) => t.val === form.target_type)?.desc}
            </div>
          </div>

          {/* User Search (single/multiple) */}
          {form.target_type !== 'all' && (
            <div className="space-y-2">
              <label className="text-xs font-extrabold opacity-60 block uppercase tracking-wider">
                Cari User {form.target_type === 'single' ? '(pilih 1)' : '(pilih beberapa)'}
              </label>
              <div className="relative">
                <input
                  value={searchQ}
                  onChange={(e) => doSearch(e.target.value)}
                  className="input w-full pr-10"
                  placeholder="Ketik username / email / ID... (min 2 huruf)"
                  autoComplete="off"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 opacity-40 pointer-events-none" />
              </div>

              {searching && <div className="text-xs opacity-60">Mencari...</div>}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border-2 border-[var(--border)] rounded-lg max-h-52 overflow-y-auto" style={{ background: 'var(--panel-bg)' }}>
                  {searchResults.map((u) => {
                    const selected = form.user_ids.some((x) => x.id === u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUser(u)}
                        className={`w-full text-left px-3 py-2 border-b border-[var(--border)] last:border-0 flex items-center gap-2 ${selected ? '' : 'hover:bg-[var(--hover)]'}`}
                        style={selected ? { background: 'var(--primary)' } : {}}
                      >
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border-2 border-[var(--border)]" style={{ background: 'var(--bg-base)' }}>?</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold truncate">{u.username || 'No name'}</div>
                          <div className="text-xs opacity-50 truncate">ID: {u.id}{u.email ? ` • ${u.email}` : ''}</div>
                        </div>
                        {u.has_fcm_token && <Check className="size-4 text-green-500 shrink-0" />}
                        {selected && <Check className="size-4 shrink-0" style={{ color: 'var(--bg-base)' }} />}
                      </button>
                    );
                  })}
                </div>
              )}

              {searchQ.length >= 2 && !searching && searchResults.length === 0 && (
                <div className="text-xs opacity-50">Tidak ada hasil. Coba kata kunci lain.</div>
              )}

              {/* Selected Users Chips */}
              {form.user_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.user_ids.map((u) => (
                    <span key={u.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 border-2 border-[var(--border)] rounded-md text-xs font-extrabold" style={{ background: 'var(--primary)', color: 'var(--bg-base)', boxShadow: 'var(--shadow-sm)' }}>
                      {u.avatar_url && <img src={u.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />}
                      {u.username || `ID:${u.id}`}
                      <button type="button" onClick={() => removeUser(u.id)} className="hover:opacity-70 ml-0.5">
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-extrabold opacity-60 mb-1 block uppercase tracking-wider">Judul Notifikasi</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input w-full"
              placeholder="Contoh: Anime baru sudah tersedia!"
              maxLength={100}
              required
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-extrabold opacity-60 mb-1 block uppercase tracking-wider">Isi Pesan</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="input w-full min-h-[90px] resize-y"
              placeholder="Tulis pesan notifikasi di sini..."
              maxLength={500}
              required
            />
            <div className="text-xs opacity-50 mt-1 text-right">{form.body.length}/500</div>
          </div>

          {/* Link URL */}
          <div>
            <label className="text-xs font-extrabold opacity-60 mb-1 block uppercase tracking-wider">Link URL (opsional)</label>
            <input
              value={form.link_url}
              onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
              className="input w-full"
              placeholder="https://... (untuk inbox, user bisa klik link)"
            />
          </div>

          {/* Inbox Toggle */}
          <label className="flex items-start gap-2.5 text-sm font-bold cursor-pointer p-3 border-2 border-[var(--border)] rounded-lg" style={{ background: 'var(--panel-bg)', boxShadow: 'var(--shadow-sm)' }}>
            <input
              type="checkbox"
              checked={form.inbox}
              onChange={(e) => setForm((f) => ({ ...f, inbox: e.target.checked }))}
              className="mt-0.5 size-4 shrink-0"
            />
            <span>
              <span className="flex items-center gap-1.5"><Inbox className="size-4" /> Simpan ke Inbox User</span>
              <span className="block text-xs opacity-60 font-semibold mt-0.5">User bisa lihat pesan di inbox meski push notif tidak sampai / tidak ada FCM token</span>
            </span>
          </label>

          {/* Submit */}
          <div className="flex items-center gap-2 pt-1">
            <button type="submit" disabled={sending} className="btn btn--primary flex items-center gap-2">
              {sending ? 'Mengirim...' : (<><Send className="size-4" /> Kirim Notifikasi</>)}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="card p-4 space-y-2" style={{ background: 'var(--panel-bg)' }}>
              <div className="font-extrabold text-sm flex items-center gap-2">
                <Check className="size-4 text-green-500" />
                Hasil Pengiriman
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs opacity-50 font-bold">Total User</div>
                  <div className="font-extrabold text-lg">{result.total_users ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs opacity-50 font-bold">Terkirim</div>
                  <div className="font-extrabold text-lg text-green-500">{result.success ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs opacity-50 font-bold">Gagal</div>
                  <div className="font-extrabold text-lg text-red-500">{result.failure ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs opacity-50 font-bold">Inbox</div>
                  <div className="font-extrabold text-lg">{result.inbox_created ?? 0}</div>
                </div>
              </div>
              {result.fcm_skipped && <div className="text-xs opacity-70 p-2 border-2 border-[var(--border)] rounded">FCM tidak dikirim (credentials tidak tersedia). Inbox tetap dibuat.</div>}
              {result.no_tokens && <div className="text-xs opacity-70 p-2 border-2 border-[var(--border)] rounded">Tidak ada FCM token untuk target. Inbox tetap dibuat.</div>}
            </div>
          )}
        </form>

        {/* ===== History Sidebar ===== */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 section-title">
              <Radio className="size-4" />
              <span>Riwayat Broadcast</span>
            </div>
            <button type="button" onClick={() => loadHistory(1)} className="text-xs font-bold opacity-60 hover:opacity-100 flex items-center gap-1">
              <RefreshCw className="size-3" /> Refresh
            </button>
          </div>

          <input
            value={historyQ}
            onChange={(e) => setHistoryQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loadHistory(1); }}
            className="input w-full"
            placeholder="Cari riwayat..."
          />

          {loadingHistory ? (
            <div className="text-sm opacity-60 text-center py-8">Memuat...</div>
          ) : history.length === 0 ? (
            <div className="text-sm opacity-50 text-center py-8">Belum ada riwayat broadcast.</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {history.map((h, i) => (
                <div key={i} className="border-2 border-[var(--border)] rounded-lg p-3" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <div className="font-extrabold text-sm truncate">{h.title}</div>
                  <div className="text-xs opacity-70 mt-1 line-clamp-2">{h.body}</div>
                  <div className="flex items-center gap-2 text-xs opacity-50 mt-2">
                    <span>{new Date(h.first_sent).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {h.recipients_in_page > 1 && <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--primary)', color: 'var(--bg-base)' }}>{h.recipients_in_page}+</span>}
                  </div>
                  {h.link_url && (
                    <div className="text-xs mt-1 truncate">
                      <a href={h.link_url} target="_blank" rel="noreferrer" className="underline opacity-70 hover:opacity-100">{h.link_url}</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {historyTotalPages > 1 && (
            <div className="flex items-center gap-2 justify-center pt-2">
              <button type="button" onClick={() => loadHistory(historyPage - 1)} disabled={historyPage <= 1} className="btn btn--sm btn--secondary">‹</button>
              <span className="text-xs font-bold">{historyPage}/{historyTotalPages}</span>
              <button type="button" onClick={() => loadHistory(historyPage + 1)} disabled={historyPage >= historyTotalPages} className="btn btn--sm btn--secondary">›</button>
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmModal(null)} />
          <div className="relative z-10 w-full max-w-md border-2 rounded-xl p-5 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="grid place-items-center size-10 border-2 rounded-md shrink-0" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--bg-base)', borderColor: 'var(--panel-border)' }}>
                <AlertTriangle className="size-5" style={{ color: confirmModal.confirmColor }} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold">{confirmModal.title}</h3>
                <p className="text-sm opacity-80 mt-1">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmModal(null)} className="btn btn--secondary">Batal</button>
              <button onClick={() => confirmModal.onConfirm?.()} disabled={sending} className="btn btn--primary" style={{ background: confirmModal.confirmColor }}>
                {sending ? 'Mengirim...' : (confirmModal.confirmLabel || 'Ya')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
