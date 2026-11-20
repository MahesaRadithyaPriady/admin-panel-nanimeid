'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Users, Trash2, CheckCircle2, XCircle, Gift } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import {
  listProfileAnimationOwners,
  setProfileAnimationOwnerActive,
  removeProfileAnimationOwner,
  grantProfileAnimation,
} from '@/lib/profileAnimationsApi';

const fmt = (n) => Number(n || 0).toLocaleString('id-ID');
const TH = 'text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]';
const TD = 'px-3 py-2 border-b-2 border-[var(--border)]';

export default function ProfileAnimationOwnersPage() {
  const router = useRouter();
  const params = useParams();
  const animId = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id), [params]);
  const { user, loading } = useSession();

  const [anim, setAnim] = useState(null);
  const [owners, setOwners] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [grantUser, setGrantUser] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const load = async (opts = {}) => {
    setLoadingList(true);
    try {
      const data = await listProfileAnimationOwners({ token: getSession()?.token, id: animId, page, limit, q, ...opts });
      setAnim(data?.animation || null);
      setOwners(Array.isArray(data?.items) ? data.items : []);
      setTotal(data?.total || 0);
      setActiveCount(data?.active_count || 0);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat pemilik');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (user && animId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, animId, page]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load({ page: 1 });
  };

  const toggleActive = async (it) => {
    setActingId(it.id);
    try {
      await setProfileAnimationOwnerActive({ token: getSession()?.token, id: animId, userId: it.user_id, active: !it.is_active });
      toast.success(it.is_active ? 'Dinonaktifkan' : 'Diaktifkan');
      await load();
    } catch (err) {
      toast.error(err?.message || 'Gagal mengubah status');
    } finally {
      setActingId(null);
    }
  };

  const onGrant = async (e) => {
    e.preventDefault();
    if (!Number(grantUser)) return toast.error('Isi ID user');
    try {
      const res = await grantProfileAnimation({ token: getSession()?.token, id: animId, userId: grantUser });
      toast.success(res?.message || 'Diberikan');
      setGrantUser('');
      await load();
    } catch (err) {
      toast.error(err?.message || 'Gagal memberikan');
    }
  };

  const onConfirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await removeProfileAnimationOwner({ token: getSession()?.token, id: animId, userId: confirmTarget.user_id });
      toast.success('Kepemilikan dihapus');
      setConfirmTarget(null);
      await load();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus');
    } finally {
      setDeleting(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/dashboard/profile-animations" className="btn btn--secondary btn--sm" title="Kembali">
                <ArrowLeft className="size-4" />
              </Link>
              <h2 className="text-xl font-extrabold flex items-center gap-2 truncate">
                <Users className="size-5" /> Pemilik {anim?.title ? `— ${anim.title}` : `#${animId}`}
              </h2>
            </div>
          </div>

          {anim && (
            <div className="card p-3 flex items-center gap-4">
              {anim.gif_url
                ? <img src={anim.gif_url} alt="" className="w-20 h-20 object-cover bg-black border-2 border-[var(--border)]" />
                : <div className="w-20 h-20 grid place-items-center border-2 border-[var(--border)] text-xs opacity-60">bawaan</div>}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm flex-1">
                <div><div className="text-xs opacity-60">Total pemilik</div><div className="font-extrabold text-lg">{fmt(total)}</div></div>
                <div><div className="text-xs opacity-60">Sedang dipakai</div><div className="font-extrabold text-lg">{fmt(activeCount)}</div></div>
                <div><div className="text-xs opacity-60">Tier</div><div className="font-extrabold text-lg">{String(anim.tier || '').replace(/_PLUS/g, '+')}</div></div>
                <div><div className="text-xs opacity-60">Poin koleksi</div><div className="font-extrabold text-lg">{fmt(anim.poin_collection)}</div></div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-3">
            <form onSubmit={onSearch} className="card p-3 grid grid-cols-[1fr_auto] gap-3">
              <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari ID user atau username" className="input w-full" />
              <button type="submit" className="btn btn--primary">Cari</button>
            </form>
            <form onSubmit={onGrant} className="card p-3 grid grid-cols-[1fr_auto] gap-3">
              <input type="number" value={grantUser} onChange={(e) => setGrantUser(e.target.value)} placeholder="ID user untuk diberikan" className="input w-full" />
              <button type="submit" className="btn btn--secondary inline-flex items-center gap-2"><Gift className="size-4" /> Berikan</button>
            </form>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full border-2 border-[var(--border)] text-sm" style={{ boxShadow: 'var(--shadow-lg)' }}>
              <thead className="bg-[var(--panel-bg)]">
                <tr>
                  <th className={TH}>User</th>
                  <th className={TH}>ID</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Didapat</th>
                  <th className={TH}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((it) => (
                  <tr key={it.id}>
                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        {it.avatar_url
                          ? <img src={it.avatar_url} alt="" className="size-8 rounded-full object-cover border-2 border-[var(--border)]" loading="lazy" />
                          : <div className="size-8 rounded-full border-2 border-[var(--border)] bg-[var(--panel-bg)]" />}
                        <div className="min-w-0">
                          <div className="font-extrabold truncate">{it.full_name || it.username || '-'}</div>
                          <div className="text-xs opacity-60 truncate">@{it.username || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`${TD} font-semibold`}>{it.user_id}</td>
                    <td className={TD}>
                      <span className={`px-2 py-0.5 border-2 border-[var(--border)] text-xs font-extrabold ${it.is_active ? 'bg-[var(--accent-add)] text-[var(--accent-add-foreground)]' : ''}`}>
                        {it.is_active ? 'Dipakai' : 'Tidak dipakai'}
                      </span>
                    </td>
                    <td className={`${TD} font-semibold whitespace-nowrap`}>{it.obtained_at ? new Date(it.obtained_at).toLocaleString('id-ID') : '-'}</td>
                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleActive(it)} disabled={actingId === it.id} className="btn btn--secondary btn--sm disabled:opacity-60" title={it.is_active ? 'Lepas' : 'Pakaikan'}>
                          {it.is_active ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                        </button>
                        <button onClick={() => setConfirmTarget(it)} className="btn btn--danger btn--sm" title="Hapus kepemilikan">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {owners.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Tidak ada pemilik.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn btn--secondary disabled:opacity-60">Sebelumnya</button>
            <div className="text-sm font-extrabold">Halaman {page} / {fmt(pages)}</div>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn btn--secondary disabled:opacity-60">Berikutnya</button>
          </div>

          {confirmTarget && (
            <div className="fixed inset-0 z-50 grid place-items-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmTarget(null)} />
              <div className="relative z-10 w-[92%] max-w-md card p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid place-items-center size-10 bg-[#FEB2B2] border-2 border-[var(--border)]">
                    <Trash2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">Hapus kepemilikan?</h3>
                    <p className="text-sm opacity-80 break-words">
                      @{confirmTarget.username} (ID {confirmTarget.user_id}) kehilangan animasi ini beserta poin koleksinya.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setConfirmTarget(null)} className="btn btn--secondary">Batal</button>
                  <button onClick={onConfirmDelete} disabled={deleting} className="btn btn--danger disabled:opacity-60">{deleting ? 'Menghapus...' : 'Ya, hapus'}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
