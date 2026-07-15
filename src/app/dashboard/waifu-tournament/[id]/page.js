"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Trophy, ArrowLeft, RefreshCcw, Loader2, Zap, Play, Square, Crown, CheckCircle, XCircle, Swords } from "lucide-react";
import { getWaifuTournament, generateWaifuBracket, startWaifuRound, closeWaifuRound } from "@/lib/api";

export default function WaifuTournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [startFormOpen, setStartFormOpen] = useState(false);
  const [startForm, setStartForm] = useState({ starts_at: '', ends_at: '' });
  const [confirmModal, setConfirmModal] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);

  function getToken() {
    try {
      const t = localStorage.getItem('access_token');
      if (t) return t;
      const raw = localStorage.getItem('nanimeid_admin_session');
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.access_token) return session.access_token;
        if (session?.token) return session.token;
        if (session?.auth?.access_token) return session.auth.access_token;
      }
    } catch {}
    return '';
  }

  async function loadDetail() {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      const data = await getWaifuTournament({ token, id });
      setDetail(data);
    } catch (e) {
      toast.error(e?.message || "Gagal memuat detail tournament");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadDetail();
  }, [id]);

  async function onGenerateBracket() {
    setConfirmModal({
      title: 'Generate Bracket?',
      message: 'Generate bracket dari hasil group stage? Top N waifu per grup akan masuk knockout.',
      confirmLabel: 'Ya, Generate',
      confirmColor: '#f59e0b',
      onConfirm: async () => {
        setConfirmModal(null);
        setActionLoading('generate');
        try {
          const token = typeof window !== 'undefined' ? getToken() : '';
          if (!token) return toast.error('Token tidak tersedia. Silakan login ulang.');
          const result = await generateWaifuBracket({ token, id });
          toast.success(`Bracket berhasil dibuat! ${result?.qualified_count ?? 0} waifu qualified, ${result?.bye_count ?? 0} bye, ${result?.total_rounds ?? 0} rounds.`);
          await loadDetail();
        } catch (e) {
          toast.error(e?.message || 'Gagal generate bracket');
        } finally {
          setActionLoading('');
        }
      },
    });
  }

  async function onStartRound(e) {
    e?.preventDefault();
    setActionLoading('start');
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      if (!token) return toast.error('Token tidak tersedia. Silakan login ulang.');
      const payload = {};
      if (startForm.starts_at) payload.starts_at = startForm.starts_at;
      if (startForm.ends_at) payload.ends_at = startForm.ends_at;
      const result = await startWaifuRound({ token, id, payload });
      toast.success(`Round ${result?.round ?? ''} dibuka untuk voting! ${result?.matches_opened ?? 0} match dibuka.`);
      setStartFormOpen(false);
      setStartForm({ starts_at: '', ends_at: '' });
      await loadDetail();
    } catch (e) {
      toast.error(e?.message || 'Gagal membuka round voting');
    } finally {
      setActionLoading('');
    }
  }

  async function onCloseRound() {
    setConfirmModal({
      title: 'Close Round?',
      message: 'Tutup round saat ini? Pemenang akan ditentukan, round berikutnya auto-generated.',
      confirmLabel: 'Ya, Close Round',
      confirmColor: 'var(--accent-edit)',
      onConfirm: async () => {
        setConfirmModal(null);
        setActionLoading('close');
        try {
          const token = typeof window !== 'undefined' ? getToken() : '';
          if (!token) return toast.error('Token tidak tersedia. Silakan login ulang.');
          const result = await closeWaifuRound({ token, id });
          if (result?.tournament_completed) {
            toast.success(`Tournament selesai! Champion: waifu_id=${result?.champion_id}`);
          } else {
            toast.success(`Round ${result?.round} selesai. Round ${result?.next_round} siap. (${result?.random_tiebreak_count ?? 0} tiebreak)`);
          }
          await loadDetail();
        } catch (e) {
          toast.error(e?.message || 'Gagal menutup round');
        } finally {
          setActionLoading('');
        }
      },
    });
  }

  const statusColors = {
    GROUP_STAGE: '#3b82f6',
    KNOCKOUT: '#f59e0b',
    COMPLETED: '#22c55e',
  };

  const rounds = detail?.rounds || [];
  const canGenerate = detail?.status === 'GROUP_STAGE';
  const canStartRound = detail?.status === 'KNOCKOUT' && rounds.some(r => r.matches.some(m => m.status === 'PENDING'));
  const canCloseRound = detail?.status === 'KNOCKOUT' && rounds.some(r => r.matches.some(m => m.status === 'OPEN'));

  const activeRound = selectedRound != null ? rounds.find(r => r.round === selectedRound) : rounds.find(r => r.round === detail?.current_round) || rounds[0];
  const activeRoundMatches = activeRound?.matches || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="grid gap-2">
          <button onClick={() => router.push('/dashboard/waifu-tournament')} className="inline-flex items-center gap-1 text-sm font-bold opacity-70 hover:opacity-100 w-fit">
            <ArrowLeft className="size-4" /> Kembali ke daftar
          </button>
          <div className="inline-flex w-fit items-center gap-2 px-3 py-2 border-2 rounded-full font-extrabold text-sm" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <Trophy className="size-4" /> Tournament Detail
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">{detail?.name || 'Memuat...'}</h2>
            {detail?.description && <p className="text-sm sm:text-base opacity-80 mt-2 max-w-3xl">{detail.description}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
          <button onClick={() => loadDetail()} disabled={loading} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
            <RefreshCcw className="size-4 inline-block mr-1" /> {loading ? 'Memuat...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {detail && (
        <div className="grid gap-3 md:grid-cols-4">
          <div className="stat-card">
            <div className="label">Status</div>
            <div className="mt-2 text-xl font-black" style={{ color: statusColors[detail.status] || 'var(--foreground)' }}>{detail.status}</div>
          </div>
          <div className="stat-card">
            <div className="label">Round Saat Ini</div>
            <div className="mt-2 text-3xl font-black">{detail.current_round ?? 0}</div>
            <div className="text-sm text-[var(--muted)] mt-1">dari {detail.total_rounds ?? 0} total</div>
          </div>
          <div className="stat-card">
            <div className="label">Advance per Group</div>
            <div className="mt-2 text-3xl font-black">{detail.advance_per_group ?? '-'}</div>
            <div className="text-sm text-[var(--muted)] mt-1">Top N waifu per grup</div>
          </div>
          <div className="stat-card">
            <div className="label">Champion</div>
            <div className="mt-2 text-xl font-black truncate">
              {detail.champion_id ? (
                <span className="inline-flex items-center gap-1" style={{ color: '#FFD803' }}><Crown className="size-5" /> #{detail.champion_id}</span>
              ) : (
                <span className="opacity-50">Belum ada</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Actions */}
      {detail && (
        <div className="card p-4 sm:p-5 grid gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-lg font-black">Aksi Admin</div>
            <div className="text-sm opacity-80">Kontrol alur tournament: generate bracket, buka/tutup round voting.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canGenerate && (
              <button onClick={onGenerateBracket} disabled={actionLoading === 'generate'} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: '#f59e0b', borderColor: 'var(--panel-border)', color: '#111827' }}>
                {actionLoading === 'generate' ? <Loader2 className="size-4 inline-block mr-1 animate-spin" /> : <Zap className="size-4 inline-block mr-1" />} Generate Bracket
              </button>
            )}
            {canStartRound && (
              <button onClick={() => setStartFormOpen(true)} disabled={actionLoading === 'start'} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>
                <Play className="size-4 inline-block mr-1" /> Start Round Voting
              </button>
            )}
            {canCloseRound && (
              <button onClick={onCloseRound} disabled={actionLoading === 'close'} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}>
                {actionLoading === 'close' ? <Loader2 className="size-4 inline-block mr-1 animate-spin" /> : <Square className="size-4 inline-block mr-1" />} Close Round &amp; Advance
              </button>
            )}
            {detail.status === 'COMPLETED' && (
              <div className="px-3 py-2 border-2 rounded-lg font-extrabold inline-flex items-center gap-2" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: '#FFD803' }}>
                <Crown className="size-4" /> Tournament Selesai!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bracket */}
      {loading && !detail ? (
        <div className="card p-8 grid place-items-center">
          <Loader2 className="size-8 animate-spin" />
        </div>
      ) : rounds.length > 0 ? (
        <div className="space-y-4">
          {/* Round Chips Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {rounds.map((rd) => {
              const isCurrent = rd.round === detail?.current_round && detail?.status === 'KNOCKOUT';
              const isSelected = activeRound?.round === rd.round;
              return (
                <button
                  key={rd.round}
                  onClick={() => setSelectedRound(rd.round)}
                  className="px-3 py-1.5 border-2 rounded-full font-extrabold text-sm transition-all shrink-0"
                  style={{
                    boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                    background: isSelected ? 'var(--accent-primary)' : 'var(--panel-bg)',
                    color: isSelected ? 'var(--accent-primary-foreground)' : 'var(--foreground)',
                    borderColor: isCurrent ? '#f59e0b' : 'var(--panel-border)',
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Swords className="size-3.5" />
                    Round {rd.round}
                    {isCurrent && <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: '#f59e0b', color: '#111827' }}>LIVE</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Round Bracket */}
          {activeRound && (
            <div className="card overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b-2 border-[var(--border)]">
                <div className="text-lg font-black flex items-center gap-2">
                  <Swords className="size-4" /> Round {activeRound.round}
                  {activeRound.round === detail?.current_round && detail?.status === 'KNOCKOUT' && (
                    <span className="text-xs px-2 py-0.5 border-2 rounded-lg font-bold" style={{ borderColor: 'var(--panel-border)', color: '#f59e0b' }}>CURRENT</span>
                  )}
                  <span className="text-xs opacity-60 font-bold ml-auto">{activeRoundMatches.length} matches</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                {/* Bracket with connector lines */}
                <div className="relative p-4 sm:p-6">
                  {/* Horizontal connector lines behind cards */}
                  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <svg className="w-full h-full" style={{ minHeight: '100%' }} preserveAspectRatio="none">
                      {activeRoundMatches.map((m, i) => {
                        if (i % 2 !== 0) return null;
                        const next = activeRoundMatches[i + 1];
                        if (!next) return null;
                        return (
                          <line
                            key={`conn-${m.id}`}
                            x1="50%" y1={`${(i + 0.5) * (100 / activeRoundMatches.length)}%`}
                            x2="50%" y2={`${(i + 1.5) * (100 / activeRoundMatches.length)}%`}
                            stroke="var(--panel-border)"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />
                        );
                      })}
                    </svg>
                  </div>
                  <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-w-0">
                    {activeRoundMatches.map((m, mIdx) => (
                      <div key={m.id} className="relative">
                        {/* Connector line to next round (right side) */}
                        {mIdx % 2 === 0 && (
                          <div className="hidden xl:block absolute -right-3 top-1/2 w-3 h-px" style={{ background: 'var(--panel-border)' }} aria-hidden="true" />
                        )}
                        <div className="border-2 rounded-xl p-3 grid gap-2 overflow-hidden max-w-full h-full" style={{ borderColor: m.winner?.id ? (m.winner?.id === m.waifu1?.id || m.winner?.id === m.waifu2?.id ? '#FFD803' : 'var(--panel-border)') : 'var(--panel-border)', background: 'var(--panel-bg)' }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold opacity-60 shrink-0">Match #{m.match_number}</span>
                          <span className="text-xs font-bold px-2 py-0.5 border-2 rounded-lg shrink-0" style={{
                            borderColor: 'var(--panel-border)',
                            color: m.status === 'OPEN' ? '#22c55e' : m.status === 'CLOSED' ? '#6b7280' : '#f59e0b',
                          }}>
                            {m.is_bye ? 'BYE' : m.status}
                          </span>
                        </div>
                        <div className="grid gap-1.5">
                          {/* Waifu 1 */}
                          <div className="flex items-center gap-2 p-2 border-2 rounded-lg overflow-hidden" style={{
                            borderColor: m.winner?.id === m.waifu1?.id ? '#FFD803' : 'var(--panel-border)',
                            background: m.winner?.id === m.waifu1?.id ? 'rgba(255,216,3,0.1)' : 'transparent',
                          }}>
                            {m.waifu1?.image_url ? (
                              <img src={m.waifu1.image_url} alt={m.waifu1.name} className="w-10 h-10 sm:w-11 sm:h-11 object-cover border-2 border-[var(--border)] shrink-0" loading="lazy" />
                            ) : (
                              <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 grid place-items-center border-2 border-[var(--border)] text-xs font-bold" style={{ background: 'var(--surface)' }}>?</div>
                            )}
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="font-black text-sm leading-tight line-clamp-2 break-words">{m.waifu1?.name || 'TBD'}</div>
                              <div className="text-xs opacity-70 truncate">{m.waifu1?.anime_title || ''}</div>
                            </div>
                            <div className="font-black text-base sm:text-lg shrink-0" style={{ color: m.winner?.id === m.waifu1?.id ? '#FFD803' : 'var(--foreground)' }}>
                              {m.votes1 ?? 0}
                            </div>
                            {m.winner?.id === m.waifu1?.id && <Crown className="size-3.5 shrink-0" style={{ color: '#FFD803' }} />}
                          </div>
                          <div className="text-center text-xs font-bold opacity-40">VS</div>
                          {/* Waifu 2 */}
                          <div className="flex items-center gap-2 p-2 border-2 rounded-lg overflow-hidden" style={{
                            borderColor: m.winner?.id === m.waifu2?.id ? '#FFD803' : 'var(--panel-border)',
                            background: m.winner?.id === m.waifu2?.id ? 'rgba(255,216,3,0.1)' : 'transparent',
                          }}>
                            {m.waifu2?.image_url ? (
                              <img src={m.waifu2.image_url} alt={m.waifu2.name} className="w-10 h-10 sm:w-11 sm:h-11 object-cover border-2 border-[var(--border)] shrink-0" loading="lazy" />
                            ) : (
                              <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 grid place-items-center border-2 border-[var(--border)] text-xs font-bold" style={{ background: 'var(--surface)' }}>?</div>
                            )}
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="font-black text-sm leading-tight line-clamp-2 break-words">{m.waifu2?.name || 'TBD'}</div>
                              <div className="text-xs opacity-70 truncate">{m.waifu2?.anime_title || ''}</div>
                            </div>
                            <div className="font-black text-base sm:text-lg shrink-0" style={{ color: m.winner?.id === m.waifu2?.id ? '#FFD803' : 'var(--foreground)' }}>
                              {m.votes2 ?? 0}
                            </div>
                            {m.winner?.id === m.waifu2?.id && <Crown className="size-3.5 shrink-0" style={{ color: '#FFD803' }} />}
                          </div>
                        </div>
                        {m.starts_at && m.ends_at && (
                          <div className="text-xs opacity-60 text-center break-words leading-tight">
                            {new Date(m.starts_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} — {new Date(m.ends_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-8 grid place-items-center text-center">
          <div className="max-w-md grid gap-3">
            <div className="mx-auto size-16 border-2 border-[var(--border)] grid place-items-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <Trophy className="size-7" />
            </div>
            <div className="text-xl font-black">Bracket belum dibuat</div>
            <div className="text-sm opacity-80">Generate bracket dari hasil group stage untuk memulai knockout phase.</div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmModal(null)} />
          <div className="relative z-10 w-[92%] max-w-md border-2 rounded-xl p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="grid place-items-center size-10 border-2 rounded-md" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <Zap className="size-5" style={{ color: confirmModal.confirmColor }} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">{confirmModal.title}</h3>
                <p className="text-sm opacity-80 mt-1">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmModal(null)} className="px-3 py-2 border-2 rounded-lg font-extrabold" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
              <button onClick={() => confirmModal.onConfirm?.()} className="px-3 py-2 border-2 rounded-lg font-extrabold" style={{ boxShadow: 'var(--shadow-md)', background: confirmModal.confirmColor, color: '#111827', borderColor: 'var(--panel-border)' }}>{confirmModal.confirmLabel || 'Ya'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Start Round Modal */}
      {startFormOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !actionLoading && setStartFormOpen(false)} />
          <form onSubmit={onStartRound} className="relative z-10 w-[92%] max-w-md border-2 rounded-xl p-4 sm:p-6 grid gap-4" style={{ boxShadow: 'var(--shadow-xl)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="grid gap-1">
              <div className="text-lg font-extrabold">Start Round Voting</div>
              <div className="text-sm opacity-80">Buka voting untuk round saat ini. Opsional: atur waktu mulai &amp; berakhir.</div>
            </div>
            <div className="grid gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold opacity-70">Waktu Mulai (opsional — kosongkan untuk mulai sekarang)</span>
                <input type="datetime-local" value={startForm.starts_at} onChange={(e) => setStartForm((f) => ({ ...f, starts_at: e.target.value }))} className="px-3 py-2 border-2 rounded-lg font-semibold w-full" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)', colorScheme: 'dark' }} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold opacity-70">Waktu Berakhir (opsional)</span>
                <input type="datetime-local" value={startForm.ends_at} onChange={(e) => setStartForm((f) => ({ ...f, ends_at: e.target.value }))} className="px-3 py-2 border-2 rounded-lg font-semibold w-full" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)', colorScheme: 'dark' }} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" disabled={actionLoading === 'start'} onClick={() => setStartFormOpen(false)} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
              <button type="submit" disabled={actionLoading === 'start'} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>
                {actionLoading === 'start' ? <Loader2 className="size-4 inline-block mr-1 animate-spin" /> : <Play className="size-4 inline-block mr-1" />} Start Round
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
