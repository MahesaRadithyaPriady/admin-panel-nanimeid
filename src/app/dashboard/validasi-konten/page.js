'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ListChecks, CheckCircle2, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listUploadHistory, updateUploadStatus } from '@/lib/api';

export default function ValidasiKontenPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const allowed = useMemo(() => ['superadmin'], []);

  // Data dari API: kelompokkan berdasarkan target (type + id)
  const [shows, setShows] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    const loadPending = async () => {
      try {
        setLoadingList(true);
        const token = getSession()?.token;
        const res = await listUploadHistory({ token, page: 1, limit: 100, status: 'PENDING' });
        const items = Array.isArray(res.items) ? res.items : [];
        // group by anime
        const map = new Map();
        for (const it of items) {
          const t = it.target || {};
          const isEpisode = it.target_type === 'EPISODE';
          const animeId = isEpisode ? (t.anime?.id ?? it.target_id) : it.target_id;
          const animeName = isEpisode ? (t.anime?.nama_anime || `Anime #${animeId}`) : (t.nama_anime || `Anime #${animeId}`);
          const key = `ANIME-${animeId}`;
          if (!map.has(key)) map.set(key, { id: key, title: animeName, episodes: [] });
          let epTitle = `${it.target_type} #${it.target_id}`;
          if (isEpisode) {
            const epNo = t.nomor_episode != null ? `Ep ${t.nomor_episode}` : '';
            const epName = t.judul_episode || '';
            epTitle = `${epNo}${epName ? ': ' + epName : ''}`.trim();
          } else {
            epTitle = t.nama_anime || epTitle; // upload target is anime
          }
          if (it.note) epTitle += ` - ${it.note}`;
          map.get(key).episodes.push({ id: it.id, title: epTitle, status: (it.status || 'PENDING').toLowerCase(), rejectReason: '' });
        }
        setShows(Array.from(map.values()));
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat daftar pending');
      } finally {
        setLoadingList(false);
      }
    };
    loadPending();
  }, []);

  // UI states
  const [expanded, setExpanded] = useState({}); // showId -> bool
  const [approvingId, setApprovingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [targetEp, setTargetEp] = useState(null); // { showId, epId }
  const [rejectMsg, setRejectMsg] = useState('');
  const [savingReject, setSavingReject] = useState(false);

  // Early returns after all hooks
  if (loading || !user) return null;
  if (!allowed.includes(user.role)) {
    return (
      <div className="text-sm font-semibold">
        Halaman ini khusus <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">superadmin</span>.
      </div>
    );
  }

  const toggleExpand = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const onApprove = async (showId, epId) => {
    try {
      setApprovingId(epId);
      const token = getSession()?.token;
      await updateUploadStatus({ token, id: epId, status: 'APPROVED' });
      toast.success('Upload di-approve');
      // remove from list
      setShows((prev) => prev.map((s) => s.id !== showId ? s : ({ ...s, episodes: s.episodes.filter((ep) => ep.id !== epId) })).filter((s) => s.episodes.length > 0));
    } catch (err) {
      toast.error(err?.message || 'Gagal approve upload');
    } finally {
      setApprovingId(null);
    }
  };

  const onRequestReject = (showId, epId) => {
    setTargetEp({ showId, epId });
    setRejectMsg('');
    setRejectOpen(true);
  };

  const onConfirmReject = async () => {
    if (!targetEp) return;
    if (!rejectMsg.trim()) return toast.error('Masukkan alasan reject');
    try {
      setSavingReject(true);
      const token = getSession()?.token;
      await updateUploadStatus({ token, id: targetEp.epId, status: 'REJECTED' });
      // Note: API update status tidak menerima alasan; simpan lokal saja untuk tampilan bila diperlukan
      setShows((prev) => prev.map((s) => s.id !== targetEp.showId ? s : ({ ...s, episodes: s.episodes.filter((ep) => ep.id !== targetEp.epId) })).filter((s) => s.episodes.length > 0));
      toast.success('Upload direject');
    } catch (err) {
      toast.error(err?.message || 'Gagal reject upload');
    } finally {
      setRejectOpen(false);
      setTargetEp(null);
      setRejectMsg('');
      setSavingReject(false);
    }
  };

  const onCancelReject = () => {
    setRejectOpen(false);
    setTargetEp(null);
    setRejectMsg('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2"><ListChecks className="size-5" /> Validasi Konten</h2>
        <button
          onClick={async () => {
            try {
              const token = getSession()?.token;
              setLoadingList(true);
              const res = await listUploadHistory({ token, page: 1, limit: 100, status: 'PENDING' });
              const items = Array.isArray(res.items) ? res.items : [];
              const map = new Map();
              for (const it of items) {
                const t = it.target || {};
                const isEpisode = it.target_type === 'EPISODE';
                const animeId = isEpisode ? (t.anime?.id ?? it.target_id) : it.target_id;
                const animeName = isEpisode ? (t.anime?.nama_anime || `Anime #${animeId}`) : (t.nama_anime || `Anime #${animeId}`);
                const key = `ANIME-${animeId}`;
                if (!map.has(key)) map.set(key, { id: key, title: animeName, episodes: [] });
                let epTitle = `${it.target_type} #${it.target_id}`;
                if (isEpisode) {
                  const epNo = t.nomor_episode != null ? `Ep ${t.nomor_episode}` : '';
                  const epName = t.judul_episode || '';
                  epTitle = `${epNo}${epName ? ': ' + epName : ''}`.trim();
                } else {
                  epTitle = t.nama_anime || epTitle;
                }
                if (it.note) epTitle += ` - ${it.note}`;
                map.get(key).episodes.push({ id: it.id, title: epTitle, status: (it.status || 'PENDING').toLowerCase(), rejectReason: '' });
              }
              setShows(Array.from(map.values()));
              toast.success('Daftar diperbarui');
            } catch (err) {
              toast.error(err?.message || 'Gagal memuat ulang');
            } finally {
              setLoadingList(false);
            }
          }}
          disabled={loadingList}
          className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}
        >
          {loadingList ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <thead style={{ background: 'var(--panel-bg)' }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Anime</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Episode</th>
            </tr>
          </thead>
          <tbody>
            {shows.map((show) => {
              const isOpen = !!expanded[show.id];
              const pendingCount = show.episodes.filter((e) => e.status === 'pending').length;
              return (
                <>
                  <tr key={show.id}>
                    <td className="px-3 py-2 border-b-4 font-extrabold" style={{ borderColor: 'var(--panel-border)' }}>
                      <button onClick={() => toggleExpand(show.id)} className="inline-flex items-center gap-1">
                        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        {show.title}
                      </button>
                    </td>
                    <td className="px-3 py-2 border-b-4 text-sm opacity-80" style={{ borderColor: 'var(--panel-border)' }}>
                      {loadingList ? 'Memuat...' : `${pendingCount} pending`}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={2} className="px-0 py-0 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                        <div className="p-3" style={{ background: 'var(--panel-bg)' }}>
                          <div className="overflow-auto">
                            <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                              <thead style={{ background: 'var(--panel-bg)' }}>
                                <tr>
                                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Episode</th>
                                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Status</th>
                                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Alasan Reject</th>
                                  <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {show.episodes.map((ep) => (
                                  <tr key={ep.id}>
                                    <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{ep.title}</td>
                                    <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                                      {ep.status === 'approved' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 border-2 rounded text-xs font-extrabold" style={{ borderColor: 'var(--panel-border)', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)' }}><CheckCircle2 className="size-3" /> APPROVED</span>
                                      )}
                                      {ep.status === 'rejected' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 border-2 rounded text-xs font-extrabold" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}><XCircle className="size-3" /> REJECTED</span>
                                      )}
                                      {ep.status === 'pending' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 border-2 rounded text-xs font-extrabold" style={{ borderColor: 'var(--panel-border)', background: 'var(--accent-primary)', color: 'var(--accent-primary-foreground)' }}>PENDING</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 border-b-4 text-sm opacity-80" style={{ borderColor: 'var(--panel-border)' }}>{ep.rejectReason || '-'}</td>
                                    <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                                      <div className="flex items-center gap-2">
                                        <button
                                          disabled={ep.status === 'approved' || approvingId === ep.id}
                                          onClick={() => onApprove(show.id, ep.id)}
                                          className="px-2 py-1 border-4 rounded font-extrabold disabled:opacity-50"
                                          style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-add)', color: 'var(--accent-add-foreground)', borderColor: 'var(--panel-border)' }}
                                        >
                                          {approvingId === ep.id ? 'Approving...' : 'Approve'}
                                        </button>
                                        <button
                                          onClick={() => onRequestReject(show.id, ep.id)}
                                          className="px-2 py-1 border-4 rounded font-extrabold"
                                          style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Reject - input alasan */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={onCancelReject} />
          <div
            className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6"
            style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <h3 className="text-lg font-extrabold mb-2 flex items-center gap-2"><XCircle className="size-5" /> Alasan Reject</h3>
            <textarea
              value={rejectMsg}
              onChange={(e) => setRejectMsg(e.target.value)}
              placeholder="Tulis alasan kenapa episode direject..."
              className="w-full h-28 px-3 py-2 border-4 rounded-lg font-semibold mb-3"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            />
            <div className="flex items-center justify-end gap-2">
              <button onClick={onCancelReject} disabled={savingReject} className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                Batal
              </button>
              <button onClick={onConfirmReject} disabled={savingReject} className="px-3 py-2 border-4 rounded-lg bg-[#FFD803] font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}>
                {savingReject ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
