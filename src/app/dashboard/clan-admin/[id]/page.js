'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Flag, ArrowLeft, Ban, ShieldCheck, Trash2, Loader2, Globe, Lock, Users, Crown } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getClanDetail, banClan, unbanClan, deleteClan } from '@/lib/api';

export default function ClanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const id = params?.id;

  const [clan, setClan] = useState(null);
  const [loadingItem, setLoadingItem] = useState(true);
  const [banReason, setBanReason] = useState('');
  const [showBanForm, setShowBanForm] = useState(false);
  const [banning, setBanning] = useState(false);
  const [unbanning, setUnbanning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const loadClan = async () => {
    if (!id) return;
    setLoadingItem(true);
    try {
      const token = getSession()?.token;
      const data = await getClanDetail({ token, id });
      setClan(data);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat detail clan');
    } finally {
      setLoadingItem(false);
    }
  };

  useEffect(() => {
    loadClan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onBan = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setBanning(true);
      const data = await banClan({ token, id, ban_reason: banReason });
      setClan(data);
      toast.success('Clan berhasil dibanned');
      setBanReason('');
      setShowBanForm(false);
    } catch (err) {
      toast.error(err?.message || 'Gagal membanned clan');
    } finally {
      setBanning(false);
    }
  };

  const onUnban = async () => {
    const token = getSession()?.token;
    try {
      setUnbanning(true);
      const data = await unbanClan({ token, id });
      setClan(data);
      toast.success('Clan berhasil di-unban');
    } catch (err) {
      toast.error(err?.message || 'Gagal meng-unban clan');
    } finally {
      setUnbanning(false);
    }
  };

  const onDelete = async () => {
    if (!confirm('Hapus clan ini secara permanen? Semua data terkait akan terhapus.')) return;
    const token = getSession()?.token;
    try {
      setDeleting(true);
      await deleteClan({ token, id });
      toast.success('Clan berhasil dihapus');
      router.push('/dashboard/clan-admin');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus clan');
    } finally {
      setDeleting(false);
    }
  };

  const fmtDate = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return d; }
  };

  const members = Array.isArray(clan?.members) ? clan.members : [];

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title flex items-center gap-2"><Flag className="size-5" /> Detail Clan</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => router.push('/dashboard/clan-admin')} className="btn btn--secondary btn--sm">
                <ArrowLeft className="size-4" /> Kembali
              </button>
            </div>
          </div>

          {loadingItem ? (
            <div className="text-sm flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Memuat...</div>
          ) : clan ? (
            <>
              {/* Clan Info */}
              <div className="card card--lg space-y-4">
                <div className="flex items-start gap-4 flex-wrap">
                  {clan.logo_url && (
                    <img src={clan.logo_url} alt="logo" className="w-16 h-16 object-contain rounded border-2 border-[var(--border)]" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-extrabold">{clan.name}</h3>
                      <span
                        className="inline-flex px-2 py-0.5 text-xs font-bold border"
                        style={{ color: clan.tag_color || 'var(--foreground)', borderColor: clan.tag_color || 'var(--border)', fontFamily: 'var(--font-mono)' }}
                      >
                        {clan.tag || '-'}
                      </span>
                      {clan.is_banned ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#ef4444' }}><Ban className="size-3" /> Banned</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#22c55e' }}><ShieldCheck className="size-3" /> Aktif</span>
                      )}
                      {clan.is_public ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#3b82f6' }}><Globe className="size-3" /> Publik</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#a855f7' }}><Lock className="size-3" /> Privat</span>
                      )}
                    </div>
                    {clan.description && <p className="text-sm opacity-80">{clan.description}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Info label="ID" value={String(clan.id)} />
                  <Info label="Leader" value={clan.leader_username || clan.leader?.username || '-'} />
                  <Info label="Anggota" value={`${clan.member_count ?? 0} / ${clan.max_members ?? 30}`} />
                  <Info label="Total XP" value={Number(clan.total_xp ?? 0).toLocaleString()} />
                  <Info label="Dibuat" value={fmtDate(clan.created_at)} />
                  <Info label="Diperbarui" value={fmtDate(clan.updated_at)} />
                  {clan.is_banned && (
                    <>
                      <Info label="Banned At" value={fmtDate(clan.banned_at)} />
                      <Info label="Alasan Ban" value={clan.ban_reason || '-'} />
                    </>
                  )}
                </div>

                {clan.banner_url && (
                  <div>
                    <span className="label text-xs">Banner</span>
                    <img src={clan.banner_url} alt="banner" className="w-full max-h-40 object-cover rounded border border-[var(--border)] mt-1" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--border)]">
                  {clan.is_banned ? (
                    <button onClick={onUnban} disabled={unbanning} className="btn btn--primary btn--sm">
                      {unbanning ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Unban
                    </button>
                  ) : (
                    <button onClick={() => setShowBanForm((s) => !s)} className="btn btn--secondary btn--sm">
                      <Ban className="size-4" /> Ban
                    </button>
                  )}
                  <button onClick={onDelete} disabled={deleting} className="btn btn--danger btn--sm">
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Hapus Permanen
                  </button>
                </div>

                {/* Ban Form */}
                {showBanForm && !clan.is_banned && (
                  <form onSubmit={onBan} className="space-y-3 pt-2 border-t border-[var(--border)]">
                    <div className="section-title text-sm">Form Ban Clan</div>
                    <textarea
                      placeholder="Alasan ban (wajib, max 500 karakter)..."
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value.slice(0, 500))}
                      required
                      rows={3}
                      className="input"
                    />
                    <div className="flex items-center gap-2">
                      <button type="submit" disabled={banning || !banReason.trim()} className="btn btn--danger btn--sm">
                        {banning ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />} Konfirmasi Ban
                      </button>
                      <button type="button" onClick={() => { setShowBanForm(false); setBanReason(''); }} className="btn btn--secondary btn--sm">
                        Batal
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Members */}
              <div className="card card--lg space-y-4">
                <div className="section-title flex items-center gap-2"><Users className="size-4" /> Anggota ({members.length})</div>
                <div className="card overflow-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b-2 border-[var(--border)]">
                        <th className="text-left px-4 py-3 label">ID</th>
                        <th className="text-left px-4 py-3 label">Username</th>
                        <th className="text-left px-4 py-3 label">Nama</th>
                        <th className="text-left px-4 py-3 label">Role</th>
                        <th className="text-left px-4 py-3 label">Level</th>
                        <th className="text-left px-4 py-3 label">XP</th>
                        <th className="text-left px-4 py-3 label">Bergabung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id} className="border-b border-[var(--border)]">
                          <td className="px-4 py-3 font-semibold">{m.id}</td>
                          <td className="px-4 py-3 font-extrabold">
                            <div className="flex items-center gap-2">
                              {m.avatar_url && <img src={m.avatar_url} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-[var(--border)]" loading="lazy" />}
                              {m.username}
                              {m.role === 'leader' && <Crown className="size-3" style={{ color: '#f59e0b' }} />}
                            </div>
                          </td>
                          <td className="px-4 py-3">{m.full_name || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold uppercase" style={{
                              color: m.role === 'leader' ? '#f59e0b' : m.role === 'officer' ? '#3b82f6' : 'var(--muted)',
                            }}>
                              {m.role || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold">{m.level ?? '-'}</td>
                          <td className="px-4 py-3 font-semibold">{Number(m.xp ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs opacity-70">{fmtDate(m.joined_at)}</td>
                        </tr>
                      ))}
                      {members.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-sm opacity-70">Tidak ada anggota.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm opacity-70">Clan tidak ditemukan.</div>
          )}
        </>
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
