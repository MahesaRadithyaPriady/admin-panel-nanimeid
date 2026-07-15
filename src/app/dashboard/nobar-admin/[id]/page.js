'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Tv, ArrowLeft, Trash2, Loader2, Globe, Lock, UserCheck, Users, MessageSquareText, Activity, Square, Crown, Clock, Film } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getNobarDetail, endNobarRoom, deleteNobarRoom } from '@/lib/api';

export default function NobarDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const id = params?.id;

  const [room, setRoom] = useState(null);
  const [loadingItem, setLoadingItem] = useState(true);
  const [ending, setEnding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadRoom = async () => {
    if (!id) return;
    setLoadingItem(true);
    try {
      const token = getSession()?.token;
      const data = await getNobarDetail({ token, id });
      setRoom(data);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat detail nobar room');
    } finally {
      setLoadingItem(false);
    }
  };

  useEffect(() => {
    loadRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onEndRoom = async () => {
    setEnding(true);
    try {
      const token = getSession()?.token;
      const data = await endNobarRoom({ token, id });
      setRoom((prev) => ({ ...prev, ...data, status: 'ENDED' }));
      toast.success('Room berhasil diakhiri');
      setConfirmModal(null);
    } catch (err) {
      toast.error(err?.message || 'Gagal mengakhiri room');
    } finally {
      setEnding(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      const token = getSession()?.token;
      await deleteNobarRoom({ token, id });
      toast.success('Room berhasil dihapus');
      router.push('/dashboard/nobar-admin');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus room');
    } finally {
      setDeleting(false);
      setConfirmModal(null);
    }
  };

  const fmtDate = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return d; }
  };

  const fmtDuration = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  };

  const participants = Array.isArray(room?.participants) ? room.participants : [];
  const messages = Array.isArray(room?.recent_messages) ? room.recent_messages : [];

  const accessIcon = (mode) => {
    if (mode === 'PUBLIC') return <><Globe className="size-3" /> Public</>;
    if (mode === 'PRIVATE') return <><Lock className="size-3" /> Private</>;
    return <><UserCheck className="size-3" /> {mode}</>;
  };

  const accessColor = (mode) => {
    if (mode === 'PUBLIC') return '#3b82f6';
    if (mode === 'PRIVATE') return '#a855f7';
    return '#f59e0b';
  };

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title flex items-center gap-2"><Tv className="size-5" /> Detail Nobar Room</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => router.push('/dashboard/nobar-admin')} className="btn btn--secondary btn--sm">
                <ArrowLeft className="size-4" /> Kembali
              </button>
            </div>
          </div>

          {loadingItem ? (
            <div className="text-sm flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Memuat...</div>
          ) : room ? (
            <>
              {/* Room Info */}
              <div className="card card--lg space-y-4">
                <div className="flex items-start gap-4 flex-wrap">
                  {room.anime?.gambar_anime && (
                    <img src={room.anime.gambar_anime} alt="anime" className="w-16 h-20 object-cover border-2 border-[var(--border)]" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-extrabold" style={{ fontFamily: 'var(--font-mono)' }}>{room.code || `Room #${room.id}`}</h3>
                      <span className="inline-flex items-center gap-1 text-xs font-bold" style={{
                        color: room.status === 'ACTIVE' ? '#22c55e' : '#6b7280',
                      }}>
                        <Activity className="size-3" /> {room.status}
                      </span>
                      {room.access_mode && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: accessColor(room.access_mode) }}>
                          {accessIcon(room.access_mode)}
                        </span>
                      )}
                      {room.is_locked && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#ef4444' }}>
                          <Lock className="size-3" /> Locked
                        </span>
                      )}
                    </div>
                    {room.anime && (
                      <p className="text-sm font-semibold">{room.anime.nama_anime || room.anime.title_en}</p>
                    )}
                    {room.episode && (
                      <p className="text-xs opacity-70">Episode {room.episode.nomor_episode}{room.episode.judul_episode ? ` — ${room.episode.judul_episode}` : ''}</p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Info label="ID" value={String(room.id)} />
                  <Info label="Code" value={room.code || '-'} />
                  <Info label="Host" value={room.host?.username || '-'} />
                  <Info label="Quality" value={room.quality || '-'} />
                  <Info label="Current Time" value={fmtDuration(room.current_time)} />
                  <Info label="Paused" value={room.is_paused ? 'Yes' : 'No'} />
                  <Info label="Partisipan" value={String(room.participants_count ?? 0)} />
                  <Info label="Pesan" value={String(room.messages_count ?? 0)} />
                  <Info label="Dibuat" value={fmtDate(room.created_at)} />
                  <Info label="Diperbarui" value={fmtDate(room.updated_at)} />
                  {room.expires_at && <Info label="Expires" value={fmtDate(room.expires_at)} />}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--border)]">
                  {room.status === 'ACTIVE' && (
                    <button
                      onClick={() => setConfirmModal({ type: 'end' })}
                      disabled={ending}
                      className="btn btn--secondary btn--sm"
                    >
                      {ending ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />} Force End
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmModal({ type: 'delete' })}
                    disabled={deleting}
                    className="btn btn--danger btn--sm"
                  >
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Hapus Permanen
                  </button>
                </div>
              </div>

              {/* Participants */}
              <div className="card card--lg space-y-4">
                <div className="section-title flex items-center gap-2"><Users className="size-4" /> Partisipan ({participants.length})</div>
                <div className="card overflow-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b-2 border-[var(--border)]">
                        <th className="text-left px-4 py-3 label">ID</th>
                        <th className="text-left px-4 py-3 label">Username</th>
                        <th className="text-left px-4 py-3 label">Role</th>
                        <th className="text-left px-4 py-3 label">Ready</th>
                        <th className="text-left px-4 py-3 label">Bergabung</th>
                        <th className="text-left px-4 py-3 label">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p) => (
                        <tr key={p.id} className="border-b border-[var(--border)]">
                          <td className="px-4 py-3 font-semibold">{p.id}</td>
                          <td className="px-4 py-3 font-extrabold">
                            <div className="flex items-center gap-2">
                              {p.avatar_url && <img src={p.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-[var(--border)]" loading="lazy" />}
                              {p.username}
                              {p.role === 'host' && <Crown className="size-3" style={{ color: '#f59e0b' }} />}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold uppercase" style={{
                              color: p.role === 'host' ? '#f59e0b' : 'var(--muted)',
                            }}>
                              {p.role || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {p.is_ready ? (
                              <span className="text-xs font-bold" style={{ color: '#22c55e' }}>Ready</span>
                            ) : (
                              <span className="text-xs font-bold opacity-50">Not Ready</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs opacity-70">{fmtDate(p.joined_at)}</td>
                          <td className="px-4 py-3 text-xs opacity-70">{fmtDate(p.last_seen)}</td>
                        </tr>
                      ))}
                      {participants.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-sm opacity-70">Tidak ada partisipan.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Messages */}
              <div className="card card--lg space-y-4">
                <div className="section-title flex items-center gap-2"><MessageSquareText className="size-4" /> Pesan Terbaru ({messages.length})</div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-3 p-3 border-2 border-[var(--panel-border)] rounded-lg" style={{ background: 'var(--panel-bg)' }}>
                      {msg.avatar_url ? (
                        <img src={msg.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-[var(--border)] shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-8 h-8 rounded-full grid place-items-center border border-[var(--border)] shrink-0 text-xs font-bold" style={{ background: 'var(--surface)' }}>
                          {(msg.username || '?')[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{msg.username || 'Unknown'}</span>
                          <span className="text-xs opacity-50">{fmtDate(msg.created_at)}</span>
                          {msg.kind !== 'TEXT' && (
                            <span className="text-xs px-1.5 py-0.5 border-2 rounded-lg font-bold" style={{ borderColor: 'var(--panel-border)', color: '#3b82f6' }}>{msg.kind}</span>
                          )}
                        </div>
                        {msg.message && <p className="text-sm mt-1 break-words">{msg.message}</p>}
                        {msg.image_url && <img src={msg.image_url} alt="msg" className="mt-2 max-w-xs max-h-40 object-cover border border-[var(--border)]" loading="lazy" />}
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-sm opacity-70 py-6">Tidak ada pesan.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm opacity-70">Room tidak ditemukan.</div>
          )}
        </>
      )}

      {/* Custom Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !ending && !deleting && setConfirmModal(null)} />
          <div className="relative z-10 w-[92%] max-w-md border-2 rounded-xl p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="grid place-items-center size-10 border-2 rounded-md" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                {confirmModal.type === 'end' ? <Square className="size-5" style={{ color: '#f59e0b' }} /> : <Trash2 className="size-5" style={{ color: 'var(--accent-edit)' }} />}
              </div>
              <div>
                <h3 className="text-lg font-extrabold">
                  {confirmModal.type === 'end' ? 'Force End Room?' : 'Hapus Room Permanen?'}
                </h3>
                <p className="text-sm opacity-80 mt-1">
                  {confirmModal.type === 'end'
                    ? `Akhiri room ${room?.code}? Status akan di-set ke ENDED. Room record tetap ada.`
                    : `Hapus room ${room?.code}? Semua participants & messages akan terhapus permanen. Tidak bisa di-restore.`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmModal(null)} disabled={ending || deleting} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
              <button
                onClick={() => confirmModal.type === 'end' ? onEndRoom() : onDelete()}
                disabled={ending || deleting}
                className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60"
                style={{
                  boxShadow: 'var(--shadow-md)',
                  background: confirmModal.type === 'end' ? '#f59e0b' : 'var(--accent-edit)',
                  color: confirmModal.type === 'end' ? '#111827' : 'var(--accent-edit-foreground)',
                  borderColor: 'var(--panel-border)',
                }}
              >
                {(ending || deleting) ? <Loader2 className="size-4 inline-block mr-1 animate-spin" /> : null}
                {confirmModal.type === 'end' ? 'Ya, End Room' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="space-y-0.5">
      <div className="label text-xs">{label}</div>
      <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  );
}
