'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, BellRing, Loader2, MessageSquareText, Send, SquareX, Users } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import {
  adminCloseLivechatTicket,
  adminJoinLivechatTicket,
  adminListLivechatTicketMessages,
  adminPostLivechatTicketMessage,
  adminRemindLivechatTicket,
  adminTransferLivechatTicket,
  listAdminLivechatAdmins,
} from '@/lib/api';

function safeToInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('id-ID');
}

export default function LivechatTicketPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();

  const scrollBottomRef = useRef(null);

  const permissions = useMemo(() => (Array.isArray(user?.permissions) ? user.permissions : []), [user]);
  const canAccess = permissions.includes('livechat') || String(user?.role || '').toLowerCase() === 'superadmin';

  const ticketId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) return raw[0];
    return raw;
  }, [params]);

  const [deviceId] = useState(() => {
    if (typeof window === 'undefined') return 'admin-web-1';
    try {
      const existing = localStorage.getItem('nanimeid_livechat_device_id');
      if (existing) return existing;
      const next = `admin-web-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('nanimeid_livechat_device_id', next);
      return next;
    } catch {
      return 'admin-web-1';
    }
  });

  const [joinLoading, setJoinLoading] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [participant, setParticipant] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [ticketMeta, setTicketMeta] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [latestCursor, setLatestCursor] = useState(null);

  const [draft, setDraft] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

  const [closeNote, setCloseNote] = useState('resolved');
  const [transferAdminId, setTransferAdminId] = useState('');
  const [transferReason, setTransferReason] = useState('handover');
  const [transferAdmins, setTransferAdmins] = useState([]);
  const [loadingTransferAdmins, setLoadingTransferAdmins] = useState(false);
  const [remindLoading, setRemindLoading] = useState(false);

  const loadTransferAdmins = async () => {
    const token = getSession()?.token;
    if (!token) return;
    setLoadingTransferAdmins(true);
    try {
      const data = await listAdminLivechatAdmins({ token, take: 50, skip: 0 });
      setTransferAdmins(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat daftar admin livechat');
    } finally {
      setLoadingTransferAdmins(false);
    }
  };

  const loadMessages = async (opts = {}) => {
    if (!ticketId) return;
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    const { take, cursor, livechatToken, mode, direction } = opts;
    const tokenToUse = livechatToken || accessToken;
    if (!tokenToUse) return;
    if (mode !== 'older') setLoadingMessages(true);
    try {
      const data = await adminListLivechatTicketMessages({
        token,
        ticketId,
        livechatToken: tokenToUse,
        take,
        cursor,
        direction,
      });
      const rawItems = Array.isArray(data?.items) ? data.items : [];

      const sortChrono = (arr) =>
        [...arr].sort((a, b) => {
          const ta = new Date(a?.created_at ?? a?.createdAt ?? a?.sent_at ?? a?.sentAt ?? 0).getTime();
          const tb = new Date(b?.created_at ?? b?.createdAt ?? b?.sent_at ?? b?.sentAt ?? 0).getTime();
          return ta - tb;
        });

      if (mode === 'older' || mode === 'newer') {
        setMessages((prev) => {
          const base = Array.isArray(prev) ? prev : [];
          const map = new Map();
          for (const m of base) map.set(String(m?.id ?? ''), m);
          for (const m of rawItems) map.set(String(m?.id ?? ''), m);
          return sortChrono(Array.from(map.values()));
        });
      } else {
        setMessages(sortChrono(rawItems));
      }

      if (data?.nextCursor !== undefined) setNextCursor(data?.nextCursor);
      if (data?.latestCursor !== undefined && data?.latestCursor !== null && data?.latestCursor !== '') {
        setLatestCursor(data?.latestCursor);
      } else if (mode !== 'older' && rawItems.length > 0) {
        const last = rawItems[rawItems.length - 1];
        const lastId = last?.id ?? null;
        if (lastId !== null && lastId !== undefined && lastId !== '') setLatestCursor(lastId);
      }
      if (data?.ticket || data?.user_display || data?.assigned_admin) {
        setTicketMeta({
          ticket: data?.ticket ?? null,
          user_display: data?.user_display ?? null,
          assigned_admin: data?.assigned_admin ?? null,
        });
      }
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat pesan livechat');
    } finally {
      if (mode !== 'older') setLoadingMessages(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!nextCursor) return;
    if (!accessToken) return;
    if (!ticketId) return;
    if (loadingOlder) return;
    setLoadingOlder(true);
    try {
      await loadMessages({ cursor: nextCursor, take: 50, mode: 'older' });
    } finally {
      setLoadingOlder(false);
    }
  };

  const joinTicket = async () => {
    if (!ticketId) return;
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    setJoinLoading(true);
    try {
      const res = await adminJoinLivechatTicket({ token, ticketId, device_id: deviceId });
      const nextAccessToken = String(
        res?.livechat_token ??
          res?.access_token ??
          res?.participant?.encrypted_session_key ??
          res?.participant?.encryptedSessionKey ??
          ''
      );
      if (!nextAccessToken) throw new Error('Token livechat tidak tersedia dari endpoint join');
      setAccessToken(nextAccessToken);
      setParticipant(res.participant ?? null);
      await loadMessages({ livechatToken: nextAccessToken });
    } catch (err) {
      toast.error(err?.message || 'Gagal join ticket livechat');
    } finally {
      setJoinLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && !canAccess) {
      toast.error('Kamu tidak punya permission untuk Live Chat');
      router.replace('/dashboard');
    }
  }, [loading, user, canAccess, router]);

  useEffect(() => {
    if (!user || !canAccess) return;
    if (!ticketId) return;
    // join setiap kali berpindah ticket
    setAccessToken('');
    setParticipant(null);
    setMessages([]);
    setNextCursor(null);
    setLatestCursor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    joinTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canAccess, ticketId]);

  useEffect(() => {
    if (!user || !canAccess) return;
    loadTransferAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canAccess]);

  useEffect(() => {
    if (!accessToken) return;
    if (!ticketId) return;

    const id = setInterval(() => {
      if (!latestCursor) return;
      loadMessages({ take: 50, cursor: latestCursor, direction: 'newer', mode: 'newer' });
    }, 5000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, ticketId, latestCursor]);

  useEffect(() => {
    if (!scrollBottomRef.current) return;
    try {
      scrollBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch {}
  }, [messages.length]);

  const onSend = async () => {
    if (!draft.trim()) return;
    if (!ticketId) return;
    if (!accessToken) return toast.error('Belum join room (token livechat belum ada)');

    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    const content = draft.trim();
    setSendLoading(true);
    try {
      await adminPostLivechatTicketMessage({
        token,
        ticketId,
        livechatToken: accessToken,
        payload: {
          device_id: deviceId,
          type: 'TEXT',
          ciphertext: content,
          nonce: '0',
          alg: 'SERVER_PLAINTEXT',
          attachment_id: null,
        },
      });
      setDraft('');
      await loadMessages();
    } catch (err) {
      toast.error(err?.message || 'Gagal mengirim pesan');
    } finally {
      setSendLoading(false);
    }
  };

  const onTransfer = async () => {
    const toId = safeToInt(transferAdminId);
    if (!toId) return toast.error('to_admin_id tidak valid');
    if (!ticketId) return;

    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    try {
      await adminTransferLivechatTicket({
        token,
        ticketId,
        to_admin_id: toId,
        reason: String(transferReason || '').trim() || 'handover',
      });
      toast.success('Ticket ditransfer');
      await joinTicket(); // target admin tetap harus join untuk membaca, tapi ui admin sekarang reload
    } catch (err) {
      toast.error(err?.message || 'Gagal transfer ticket');
    }
  };

  const onClose = async () => {
    if (!ticketId) return;
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    try {
      await adminCloseLivechatTicket({
        token,
        ticketId,
        note: String(closeNote || '').trim() || 'resolved',
      });
      toast.success('Ticket ditutup');
      router.push('/dashboard/livechat');
    } catch (err) {
      toast.error(err?.message || 'Gagal menutup ticket');
    }
  };

  const onRemindUser = async () => {
    if (!ticketId) return;
    const token = getSession()?.token;
    if (!token) return toast.error('Token tidak tersedia');

    try {
      setRemindLoading(true);
      const res = await adminRemindLivechatTicket({
        token,
        ticketId,
        title: 'Admin Sedang Menunggu',
        body: 'Admin sudah siap membantu Anda di live chat. Silakan lanjutkan percakapan.',
      });
      const sent = Number(res?.push?.sent ?? res?.push?.success ?? 0);
      toast.success(sent > 0 ? `Reminder terkirim ke ${sent} perangkat` : 'Reminder berhasil diproses');
    } catch (err) {
      toast.error(err?.message || 'Gagal mengirim reminder ke user');
    } finally {
      setRemindLoading(false);
    }
  };

  const headerTitle = useMemo(() => {
    if (!ticketId) return 'Live Chat Ticket';
    return `Live Chat Ticket #${ticketId}`;
  }, [ticketId]);

  const headerSub = useMemo(() => {
    const t = ticketMeta?.ticket;
    const userDisplay = ticketMeta?.user_display;
    const assigned = ticketMeta?.assigned_admin;

    const userName = userDisplay?.full_name || userDisplay?.username || t?.user_display?.full_name || t?.user_display?.username || t?.username || null;
    const assignedName = assigned?.full_name || assigned?.username || t?.assigned_admin?.full_name || t?.assigned_admin?.username || null;
    const status = t?.status || null;

    const parts = [];
    if (userName) parts.push(`User: ${userName}`);
    if (assignedName) parts.push(`Admin: ${assignedName}`);
    if (status) parts.push(`Status: ${status}`);
    return parts.join(' · ');
  }, [ticketMeta]);

  const ticketStatus = String(ticketMeta?.ticket?.status || '').toUpperCase();
  const canRemindUser = ticketStatus !== 'CLOSED' && ticketStatus !== 'CANCELED';

  const renderMessage = (m, idx) => {
    const senderRole = m?.sender?.role ?? m?.sender_role ?? m?.role ?? '';
    const isAdmin = String(senderRole).toUpperCase() === 'ADMIN' || String(senderRole).toUpperCase().includes('ADMIN');

    const senderDisplay = m?.sender_display ?? m?.senderDisplay ?? null;
    const avatarUrl = senderDisplay?.avatar_url || senderDisplay?.avatarUrl || null;
    const borderImg = senderDisplay?.avatar_border_active?.image_url || senderDisplay?.avatarBorderActive?.image_url || null;

    const displayName = senderDisplay?.full_name || senderDisplay?.fullName || senderDisplay?.username || null;

    const content = m?.content ?? m?.ciphertext ?? m?.text ?? m?.message ?? '';
    const attachment = m?.attachment ?? m?.attachment_data ?? null;
    const attachmentUrl = attachment?.url ?? attachment?.image_url ?? attachment?.file_url ?? null;
    const attachmentKind = String(attachment?.kind ?? attachment?.type ?? m?.type ?? '').toUpperCase();
    const isImageAttachment = attachmentKind === 'IMAGE' || attachmentKind === 'PHOTO' || attachmentKind === 'IMG';
    const ts = formatDate(m?.created_at ?? m?.createdAt ?? m?.sent_at ?? m?.sentAt);

    const Avatar = () => (
      <div className="shrink-0">
        <div className="relative size-9">
          {borderImg ? (
            <img
              src={borderImg}
              alt="border"
              className="absolute inset-0 w-full h-full rounded-full object-cover"
              loading="lazy"
            />
          ) : null}
          <div className={`absolute inset-0 grid place-items-center ${borderImg ? 'p-[3px]' : ''}`}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || 'avatar'}
                className="w-full h-full rounded-full object-cover border-2"
                style={{ borderColor: 'var(--panel-border)' }}
                loading="lazy"
              />
            ) : (
              <div
                className="w-full h-full rounded-full border-2"
                style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}
              />
            )}
          </div>
        </div>
      </div>
    );

    return (
      <div
        key={m?.id ?? `${ticketId || 'TICKET'}-${idx}`}
        className={`w-full flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`max-w-[92%] sm:max-w-[80%] flex items-end gap-2 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isAdmin ? <Avatar /> : null}
          <div
            className="min-w-0 p-3 border-4 rounded-xl space-y-1"
            style={{
              boxShadow: '4px 4px 0 #000',
              background: isAdmin ? 'var(--accent-primary)' : 'var(--panel-bg)',
              borderColor: 'var(--panel-border)',
              color: 'var(--foreground)',
            }}
          >
            <div className="text-[11px] font-extrabold opacity-80 break-words">
              {(displayName ? displayName : isAdmin ? 'Admin' : 'User')}{ts ? ` · ${ts}` : ''}
            </div>
            {attachmentUrl && isImageAttachment ? (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="block"
                title="Buka gambar"
              >
                <img
                  src={attachmentUrl}
                  alt="attachment"
                  className="max-w-full h-auto rounded-lg border-2"
                  style={{ borderColor: 'var(--panel-border)' }}
                  loading="lazy"
                />
              </a>
            ) : attachmentUrl ? (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-extrabold underline break-all"
                style={{ color: 'inherit' }}
              >
                Download attachment
              </a>
            ) : null}
            {content ? <div className="text-sm font-semibold whitespace-pre-wrap break-words">{content}</div> : null}
            {!content && !attachmentUrl ? <div className="text-sm font-semibold whitespace-pre-wrap break-words">-</div> : null}
          </div>
        </div>
      </div>
    );
  };

  if (loading || !user || !canAccess) return null;

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/livechat')}
            className="px-3 py-2 border-4 rounded-lg font-extrabold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            title="Kembali"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="size-4" /> Kembali
            </span>
          </button>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <MessageSquareText className="size-5" /> {headerTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {joinLoading ? (
            <div className="flex items-center gap-2 text-sm font-extrabold opacity-80">
              <Loader2 className="size-4 animate-spin" /> Joining...
            </div>
          ) : (
            <span className="text-xs font-extrabold opacity-70">
              {participant?.device_id ? `Device: ${participant.device_id}` : accessToken ? 'Joined' : 'Belum join'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-4 items-start min-w-0">
        <div className="space-y-4 min-w-0">
          {(ticketMeta?.ticket || ticketMeta?.user_display || ticketMeta?.assigned_admin) && (
            <div className="p-4 border-4 rounded-[24px] min-w-0" style={{ boxShadow: '8px 8px 0 #000', background: 'linear-gradient(135deg, var(--panel-bg) 0%, #dbeafe 100%)', borderColor: 'var(--panel-border)' }}>
              <div className="text-sm font-extrabold opacity-80 mb-3">Info Ticket</div>
              <div className="grid gap-2 text-sm min-w-0">
                {headerSub ? <div className="font-semibold opacity-80 break-words">{headerSub}</div> : null}
                {ticketMeta?.ticket?.issue_text ? (
                  <div className="rounded-2xl border-4 p-3 text-xs font-semibold opacity-90 whitespace-pre-wrap break-words" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                    {ticketMeta.ticket.issue_text}
                  </div>
                ) : null}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-2xl border-4 px-3 py-2 text-xs font-extrabold" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                    Status: {ticketStatus || '-'}
                  </div>
                  <div className="rounded-2xl border-4 px-3 py-2 text-xs font-extrabold" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                    {ticketMeta?.ticket?.created_at || ticketMeta?.ticket?.createdAt ? `Dibuat: ${formatDate(ticketMeta.ticket.created_at ?? ticketMeta.ticket.createdAt)}` : 'Dibuat: -'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 border-4 rounded-[24px] min-w-0" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <div className="text-sm font-extrabold opacity-80 mb-3">Aksi Ticket</div>
            <div className="grid gap-3 min-w-0">
              <button
                type="button"
                onClick={onRemindUser}
                disabled={joinLoading || remindLoading || !canRemindUser}
                className="px-3 py-3 border-4 rounded-2xl font-extrabold disabled:opacity-60 w-full"
                style={{ boxShadow: '4px 4px 0 #000', background: '#dbeafe', borderColor: 'var(--panel-border)', color: '#1d4ed8' }}
                title="Ingatkan user lewat push notification"
              >
                <span className="inline-flex items-center justify-center gap-2 w-full">
                  <BellRing className="size-4" /> {remindLoading ? 'Mengirim reminder...' : 'Ingatkan User'}
                </span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 min-w-0">
                <label className="grid gap-1 min-w-0">
                  <span className="text-xs font-extrabold">Transfer ke Admin</span>
                  <select
                    value={transferAdminId}
                    onChange={(e) => setTransferAdminId(e.target.value)}
                    className="px-3 py-2 border-4 rounded-lg font-semibold w-full"
                    style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                    disabled={loadingTransferAdmins}
                  >
                    <option value="">{loadingTransferAdmins ? 'Memuat admin...' : 'Pilih admin tujuan'}</option>
                    {transferAdmins.map((admin) => {
                      const label = admin?.full_name || admin?.username || `Admin #${admin?.id}`;
                      return (
                        <option key={admin?.id} value={admin?.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className="grid gap-1 min-w-0">
                  <span className="text-xs font-extrabold">Alasan</span>
                  <input
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="px-3 py-2 border-4 rounded-lg font-semibold w-full"
                    style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                    placeholder="handover"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={onTransfer}
                disabled={joinLoading || !accessToken}
                className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60 w-full"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}
                title="Transfer ticket"
              >
                <span className="inline-flex items-center justify-center gap-2 w-full">
                  <Users className="size-4" /> Transfer
                </span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] lg:grid-cols-1 gap-2 items-end min-w-0">
                <label className="grid gap-1 min-w-0">
                  <span className="text-xs font-extrabold">Catatan Tutup</span>
                  <input
                    value={closeNote}
                    onChange={(e) => setCloseNote(e.target.value)}
                    className="px-3 py-2 border-4 rounded-lg font-semibold w-full"
                    style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                    placeholder="resolved"
                  />
                </label>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={joinLoading || !accessToken}
                  className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60 w-full"
                  style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-delete)', borderColor: 'var(--panel-border)', color: 'var(--accent-delete-foreground)' }}
                  title="Close ticket"
                >
                  <span className="inline-flex items-center justify-center gap-2 w-full">
                    <SquareX className="size-4" /> Tutup
                  </span>
                </button>
              </div>

              <div className="text-xs font-extrabold opacity-70">
                {loadingMessages ? 'Memuat pesan...' : !canRemindUser ? 'Ticket sudah ditutup, reminder dinonaktifkan' : `Pesan: ${messages.length}`}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <div className="border-4 rounded-lg p-3 min-w-0" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <div className="max-h-[55vh] overflow-y-auto overflow-x-hidden space-y-3 pr-1 min-w-0">
              {nextCursor ? (
                <div className="pb-2">
                  <button
                    type="button"
                    onClick={loadOlderMessages}
                    disabled={loadingOlder || loadingMessages}
                    className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60 w-full"
                    style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  >
                    {loadingOlder ? 'Memuat...' : 'Muat pesan lama'}
                  </button>
                </div>
              ) : null}
              {messages.length > 0 ? messages.map((m, idx) => renderMessage(m, idx)) : null}
              {messages.length === 0 && !loadingMessages ? (
                <div className="text-sm font-extrabold opacity-70 text-center py-8">Belum ada pesan</div>
              ) : null}
              <div ref={scrollBottomRef} />
            </div>
          </div>

          <div className="space-y-3 min-w-0">
            <div className="text-sm font-extrabold opacity-80">Kirim Pesan (Admin)</div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSend();
              }}
              className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start min-w-0"
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={accessToken ? 'Tulis balasan admin...' : 'Join dulu untuk mengirim pesan'}
                disabled={!accessToken || joinLoading}
                className="w-full min-h-[110px] px-3 py-2 border-4 rounded-lg font-semibold disabled:opacity-60 min-w-0"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              />
              <button
                type="submit"
                disabled={!accessToken || joinLoading || sendLoading || !draft.trim()}
                className="px-4 py-3 border-4 rounded-lg font-extrabold disabled:opacity-60 w-full sm:w-auto"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}
              >
                <span className="inline-flex items-center justify-center gap-2 w-full">
                  <Send className="size-4" /> {sendLoading ? 'Mengirim...' : 'Kirim'}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

