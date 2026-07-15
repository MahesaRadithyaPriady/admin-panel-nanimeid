"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Trophy, Plus, Trash2, RefreshCcw, Loader2, Eye, Crown } from "lucide-react";
import { listWaifuTournaments, createWaifuTournament, deleteWaifuTournament } from "@/lib/api";

export default function WaifuTournamentListPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", advance_per_group: 3 });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  async function loadList() {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      const data = await listWaifuTournaments({ token });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.message || "Gagal memuat daftar tournament");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!String(form.name || '').trim()) return toast.error('Nama tournament wajib diisi');
    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      if (!token) return toast.error('Token tidak tersedia. Silakan login ulang.');
      const payload = {
        name: String(form.name).trim(),
        description: String(form.description || '').trim() || undefined,
        advance_per_group: Number(form.advance_per_group) || 3,
      };
      await createWaifuTournament({ token, payload });
      toast.success('Tournament berhasil dibuat');
      setFormOpen(false);
      setForm({ name: "", description: "", advance_per_group: 3 });
      await loadList();
    } catch (e) {
      toast.error(e?.message || 'Gagal membuat tournament');
    } finally {
      setSubmitting(false);
    }
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = typeof window !== 'undefined' ? getToken() : '';
      if (!token) return toast.error('Token tidak tersedia. Silakan login ulang.');
      await deleteWaifuTournament({ token, id: deleteTarget.id });
      toast.success('Tournament berhasil dihapus');
      setDeleteTarget(null);
      await loadList();
    } catch (e) {
      toast.error(e?.message || 'Gagal menghapus tournament');
    } finally {
      setDeleting(false);
    }
  }

  const statusColors = {
    GROUP_STAGE: '#3b82f6',
    KNOCKOUT: '#f59e0b',
    COMPLETED: '#22c55e',
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="grid gap-2">
          <div className="inline-flex w-fit items-center gap-2 px-3 py-2 border-2 rounded-full font-extrabold text-sm" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <Trophy className="size-4" /> Tournament Waifu
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">Kelola tournament waifu dengan sistem group stage &amp; knockout bracket.</h2>
            <p className="text-sm sm:text-base opacity-80 mt-2 max-w-3xl">Buat tournament, generate bracket dari hasil group stage, lalu kontrol round voting hingga champion ditentukan.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
          <button onClick={() => loadList()} disabled={loading} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}>
            <RefreshCcw className="size-4 inline-block mr-1" /> {loading ? 'Memuat...' : 'Refresh'}
          </button>
          <button onClick={() => setFormOpen(true)} className="px-3 py-2 border-2 rounded-lg font-extrabold" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>
            <Plus className="size-4 inline-block mr-1" /> Buat Tournament
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b-2 border-[var(--border)]">
          <div className="text-lg font-black">Daftar Tournament</div>
          <div className="text-sm opacity-80">Total {items.length} tournament.</div>
        </div>
        {items.length > 0 ? (
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead style={{ background: 'var(--surface)' }}>
                <tr>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Nama</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Status</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Round</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Advance/Group</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Total Rounds</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Champion</th>
                  <th className="text-left px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wide" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 border-b-2 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{t.id}</td>
                    <td className="px-4 py-3 border-b-2 font-black" style={{ borderColor: 'var(--panel-border)' }}>
                      <div>{t.name}</div>
                      {t.description && <div className="text-xs opacity-70 mt-1 max-w-xs truncate">{t.description}</div>}
                    </td>
                    <td className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
                      <span className="inline-flex px-2 py-1 text-xs font-bold border-2 rounded-lg" style={{ borderColor: 'var(--panel-border)', color: statusColors[t.status] || 'var(--foreground)' }}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b-2 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{t.current_round ?? 0}</td>
                    <td className="px-4 py-3 border-b-2 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{t.advance_per_group ?? '-'}</td>
                    <td className="px-4 py-3 border-b-2 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{t.total_rounds ?? 0}</td>
                    <td className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
                      {t.champion_id ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#FFD803' }}>
                          <Crown className="size-3" /> #{t.champion_id}
                        </span>
                      ) : (
                        <span className="text-xs opacity-50">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--panel-border)' }}>
                      <div className="flex flex-wrap items-center gap-1">
                        <button type="button" onClick={() => router.push(`/dashboard/waifu-tournament/${t.id}`)} className="btn btn--secondary btn--sm btn--icon" title="Detail"><Eye className="size-4" /></button>
                        <button type="button" onClick={() => setDeleteTarget(t)} className="btn btn--danger btn--sm btn--icon" title="Hapus"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-14 grid place-items-center text-center">
            <div className="max-w-md grid gap-3">
              <div className="mx-auto size-16 border-2 border-[var(--border)] grid place-items-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <Trophy className="size-7" />
              </div>
              <div className="text-xl font-black">{loading ? 'Sedang memuat...' : 'Belum ada tournament'}</div>
              <div className="text-sm opacity-80">{loading ? 'Tunggu sebentar...' : 'Klik "Buat Tournament" untuk memulai tournament waifu baru.'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Create Tournament Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setFormOpen(false)} />
          <form onSubmit={onSubmit} className="relative z-10 w-[92%] max-w-lg border-2 rounded-xl p-4 sm:p-6 grid gap-4" style={{ boxShadow: 'var(--shadow-xl)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="grid gap-1">
              <div className="text-lg font-extrabold">Buat Tournament Baru</div>
              <div className="text-sm opacity-80">Tournament dimulai dengan status GROUP_STAGE. Generate bracket setelah voting grup selesai.</div>
            </div>
            <div className="grid gap-3">
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama tournament (wajib)" className="px-3 py-2 border-2 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} required />
              <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Deskripsi tournament" className="px-3 py-2 border-2 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold opacity-70">Top N waifu per grup yang masuk knockout</span>
                <input type="number" min={1} value={form.advance_per_group} onChange={(e) => setForm((f) => ({ ...f, advance_per_group: Number(e.target.value) || 3 }))} className="px-3 py-2 border-2 rounded-lg font-semibold" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" disabled={submitting} onClick={() => setFormOpen(false)} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
              <button type="submit" disabled={submitting} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-add)', borderColor: 'var(--panel-border)', color: 'var(--accent-add-foreground)' }}>{submitting ? 'Membuat...' : 'Buat Tournament'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative z-10 w-[92%] max-w-md border-2 rounded-xl p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-xl)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="grid place-items-center size-10 border-2 rounded-md" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Hapus Tournament?</h3>
                <p className="text-sm opacity-80 break-words">{deleteTarget?.name}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}>Batal</button>
              <button onClick={onConfirmDelete} disabled={deleting} className="px-3 py-2 border-2 rounded-lg font-extrabold disabled:opacity-60" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}>{deleting ? 'Menghapus...' : 'Ya, Hapus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
