'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BadgeCheck, XCircle, CheckCircle2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listUploadHistory } from '@/lib/api';

export default function StatusKontenPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const allowed = useMemo(() => ['superadmin', 'uploader'], []);

  // Grouped by anime with episodes (from API)
  const [shows, setShows] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [filter, setFilter] = useState('approved'); // 'approved' | 'rejected'
  const [expanded, setExpanded] = useState({}); // showId -> bool

  // NOTE: Do not early-return before all hooks are declared below

  const fetchData = async (currentFilter) => {
    try {
      setLoadingData(true);
      const token = getSession()?.token;
      const status = currentFilter === 'approved' ? 'APPROVED' : 'REJECTED';
      const res = await listUploadHistory({ token, page: 1, limit: 100, status, target_type: 'EPISODE' });
      const items = res?.items || [];

      // Group by anime
      const byAnime = new Map();
      for (const it of items) {
        const anime = it?.target?.anime || {};
        const animeId = anime.id ?? `unknown-${it.id}`;
        const animeName = anime.nama_anime || 'Unknown Anime';
        const epTitle = it?.target?.judul_episode || `Episode ${it?.target?.nomor_episode ?? ''}`.trim();
        const statusLower = (it?.status || '').toString().toLowerCase();

        const ep = {
          id: `${it.id}`,
          title: epTitle,
          status: statusLower === 'approved' || statusLower === 'rejected' ? statusLower : currentFilter,
          reason: it?.note || '-',
          ts: it?.createdAt ? Date.parse(it.createdAt) : Date.now(),
        };

        if (!byAnime.has(animeId)) {
          byAnime.set(animeId, { id: animeId, title: animeName, episodes: [ep] });
        } else {
          byAnime.get(animeId).episodes.push(ep);
        }
      }
      setShows(Array.from(byAnime.values()));
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat status konten');
      setShows([]);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!allowed.includes(user.role)) return;
    fetchData(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, loading, user, allowed]);

  const refresh = () => {
    if (loading || !user || !allowed.includes(user.role)) return;
    fetchData(filter);
    toast.success('Status konten diperbarui');
  };

  if (loading || !user) return null;
  if (!allowed.includes(user.role)) {
    return (
      <div className="text-sm font-semibold">
        Halaman ini untuk role <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">superadmin</span> atau <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">uploader</span>.
      </div>
    );
  }

  const toggleExpand = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold flex items-center gap-2"><BadgeCheck className="size-5" /> Status Konten</h2>
        <button onClick={refresh} className="px-3 py-2 border-4 border-black rounded-lg bg-[#FFD803] font-extrabold" style={{ boxShadow: '4px 4px 0 #000' }}>
          <RefreshCw className="inline size-4" /> Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('approved')}
          className={`px-3 py-1 border-4 border-black rounded-lg text-sm font-extrabold ${filter==='approved' ? 'bg-[#C6F6D5]' : 'bg-white'}`}
          style={{ boxShadow: '3px 3px 0 #000' }}
        >
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-4" /> Approved</span>
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-3 py-1 border-4 border-black rounded-lg text-sm font-extrabold ${filter==='rejected' ? 'bg-[#FED7D7]' : 'bg-white'}`}
          style={{ boxShadow: '3px 3px 0 #000' }}
        >
          <span className="inline-flex items-center gap-1"><XCircle className="size-4" /> Rejected</span>
        </button>
      </div>

      {/* Grouped table: Anime rows expandable to episodes */}
      <div className="overflow-auto">
        <table className="min-w-full border-4 border-black rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000' }}>
          <thead className="bg-[#E2E8F0]">
            <tr>
              <th className="text-left px-3 py-2 border-b-4 border-black">Anime</th>
              <th className="text-left px-3 py-2 border-b-4 border-black">Ringkasan</th>
            </tr>
          </thead>
          <tbody>
            {shows.map((show) => {
              const isOpen = !!expanded[show.id];
              const filtered = show.episodes.filter((e) => e.status === filter);
              return (
                <>
                  <tr key={show.id} className="bg-white">
                    <td className="px-3 py-2 border-b-4 border-black font-extrabold">
                      <button onClick={() => toggleExpand(show.id)} className="inline-flex items-center gap-1">
                        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        {show.title}
                      </button>
                    </td>
                    <td className="px-3 py-2 border-b-4 border-black text-sm opacity-80">
                      {filtered.length} {filter}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={2} className="px-0 py-0 border-b-4 border-black">
                        <div className="p-3 bg-[#F7F7F0]">
                          <div className="overflow-auto">
                            <table className="min-w-full border-4 border-black rounded-lg overflow-hidden" style={{ boxShadow: '4px 4px 0 #000' }}>
                              <thead className="bg-white">
                                <tr>
                                  <th className="text-left px-3 py-2 border-b-4 border-black">Waktu</th>
                                  <th className="text-left px-3 py-2 border-b-4 border-black">Episode</th>
                                  {filter === 'rejected' && (
                                    <th className="text-left px-3 py-2 border-b-4 border-black">Alasan Reject</th>
                                  )}
                                  <th className="text-left px-3 py-2 border-b-4 border-black">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.map((ep) => (
                                  <tr key={ep.id} className="odd:bg-white even:bg-[#F7F7F0]">
                                    <td className="px-3 py-2 border-b-4 border-black text-sm opacity-80">{new Date(ep.ts).toLocaleString('id-ID')}</td>
                                    <td className="px-3 py-2 border-b-4 border-black font-semibold">{ep.title}</td>
                                    {filter === 'rejected' && (
                                      <td className="px-3 py-2 border-b-4 border-black text-sm opacity-80">{ep.reason || '-'}</td>
                                    )}
                                    <td className="px-3 py-2 border-b-4 border-black">
                                      <span className={`px-2 py-1 border-2 border-black rounded text-xs font-extrabold ${ep.status==='approved' ? 'bg-[#C6F6D5]' : 'bg-[#FED7D7]'}`}>
                                        {ep.status.toUpperCase()}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {filtered.length === 0 && (
                                  <tr>
                                    <td colSpan={filter==='rejected' ? 4 : 3} className="px-3 py-4 text-center text-sm opacity-70">Tidak ada episode {filter}.</td>
                                  </tr>
                                )}
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

      <div className="text-xs opacity-70">Tampilan dikelompokkan per anime dengan dropdown episode. Data masih mock.</div>
    </div>
  );
}
