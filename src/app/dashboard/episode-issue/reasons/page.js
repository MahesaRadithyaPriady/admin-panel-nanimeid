'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ListChecks, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listEpisodeVideoIssueReasons, createEpisodeVideoIssueReason, updateEpisodeVideoIssueReason, deleteEpisodeVideoIssueReason } from '@/lib/api';

export default function EpisodeIssueReasonsPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const [includeInactive, setIncludeInactive] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [items, setItems] = useState([]);

  const [mode, setMode] = useState('add'); // add | edit
  const [form, setForm] = useState({
    id: null,
    code: '',
    title: '',
    description: '',
    is_active: true,
    sort_order: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const canAccess = useMemo(() => {
    const role = String(user?.role || '').toLowerCase();
    if (role === 'superadmin') return true;
    const perms = Array.isArray(user?.permissions) ? user.permissions : [];
    return perms.includes('episode-video-issues');
  }, [user]);

  useEffect(() => {
    if (!loading && user && !canAccess) {
      toast.error('Tidak punya permission: episode-video-issues');
      router.replace('/dashboard');
    }
  }, [loading, user, canAccess, router]);

  const loadList = async (opts = {}) => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const res = await listEpisodeVideoIssueReasons({ token, include_inactive: includeInactive, ...opts });
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat reasons');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user || !canAccess) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive, user, canAccess]);

  const resetForm = () => {
    setMode('add');
    setForm({ id: null, code: '', title: '', description: '', is_active: true, sort_order: 0 });
  };

  const onEdit = (it) => {
    setMode('edit');
    setForm({
      id: it.id,
      code: it.code || '',
      title: it.title || '',
      description: it.description || '',
      is_active: it.is_active !== undefined ? !!it.is_active : true,
      sort_order: typeof it.sort_order === 'number' ? it.sort_order : Number(it.sort_order) || 0,
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;

    if (mode === 'add') {
      if (!form.code || !form.title) return toast.error('code dan title wajib diisi');
    } else {
      if (!form.title) return toast.error('title wajib diisi');
    }

    const payload = {
      title: form.title,
      description: form.description === '' ? null : form.description,
      is_active: !!form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    if (mode === 'add') payload.code = String(form.code || '').trim();

    try {
      setSubmitting(true);
      if (mode === 'add') {
        const res = await createEpisodeVideoIssueReason({ token, payload });
        toast.success(res?.message || 'Reason dibuat');
      } else {
        const res = await updateEpisodeVideoIssueReason({ token, id: form.id, payload });
        toast.success(res?.message || 'Reason diperbarui');
      }
      resetForm();
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan reason');
    } finally {
      setSubmitting(false);
    }
  };

  const onRequestDelete = (it) => {
    setConfirmTarget(it);
    setConfirmOpen(true);
  };

  const onCancelDelete = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const onConfirmDelete = async () => {
    if (!confirmTarget) return;
    const token = getSession()?.token;
    try {
      setDeleting(true);
      const res = await deleteEpisodeVideoIssueReason({ token, id: confirmTarget.id });
      toast.success(res?.message || 'Reason dihapus');
      setConfirmOpen(false);
      setConfirmTarget(null);
      if (mode === 'edit' && form.id === confirmTarget.id) resetForm();
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus reason');
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !user) return null;
  if (!canAccess) return null;

  const sorted = [...items].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2"><ListChecks className="size-5" /> Episode Issue - Reasons</h2>
      </div>

      <div className="p-3 border-4 rounded-lg" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
            <span>Include inactive</span>
          </label>
          <button
            type="button"
            onClick={() => loadList()}
            disabled={loadingList}
            className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-primary)', borderColor: 'var(--panel-border)', color: 'var(--accent-primary-foreground)' }}
          >
            {loadingList ? 'Memuat...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="p-3 border-4 rounded-lg space-y-3" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <div className="text-sm font-extrabold">{mode === 'add' ? 'Tambah Reason' : `Edit Reason #${form.id}`}</div>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              disabled={mode !== 'add'}
              placeholder="CODE (unik, contoh: NO_AUDIO)"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            />
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Title"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            />
          </div>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (opsional)"
            rows={2}
            className="px-3 py-2 border-4 rounded-lg font-semibold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          />
          <div className="grid sm:grid-cols-[180px_1fr] gap-3 items-center">
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              placeholder="sort_order"
              className="px-3 py-2 border-4 rounded-lg font-semibold"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
              <span>Aktif</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex py-2 items-center w-32 justify-center gap-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #000', background: mode === 'add' ? 'var(--accent-add)' : 'var(--accent-edit)', color: mode === 'add' ? 'var(--accent-add-foreground)' : 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}
            >
              {submitting ? (mode === 'add' ? 'Menambah...' : 'Menyimpan...') : (mode === 'add' ? (<><Plus className="size-4" /> Tambah</>) : (<><Pencil className="size-4" /> Simpan</>))}
            </button>
            {mode === 'edit' && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2 border-4 rounded-lg font-extrabold"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                Batal Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border-4 rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <thead style={{ background: 'var(--panel-bg)' }}>
            <tr>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>ID</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Code</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Title</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Active</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Sort</th>
              <th className="text-left px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.id}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.code}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.title}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.is_active ? 'Ya' : 'Tidak'}</td>
                <td className="px-3 py-2 border-b-4 font-semibold" style={{ borderColor: 'var(--panel-border)' }}>{it.sort_order ?? '-'}</td>
                <td className="px-3 py-2 border-b-4" style={{ borderColor: 'var(--panel-border)' }}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(it)}
                      className="px-2 py-1 border-4 rounded font-extrabold"
                      style={{ boxShadow: '3px 3px 0 #000', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(it)}
                      className="px-2 py-1 border-4 rounded font-extrabold"
                      style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm opacity-70">
                  {loadingList ? 'Memuat...' : 'Belum ada reason.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/40" onClick={onCancelDelete} />
          <div className="relative z-10 w-[92%] max-w-md border-4 rounded-xl p-4 sm:p-6" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="text-lg font-extrabold mb-1">Hapus Reason?</div>
            <div className="text-sm opacity-80 mb-4 break-words">{confirmTarget?.title} ({confirmTarget?.code})</div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={onCancelDelete}
                className="px-3 py-2 border-4 rounded-lg font-extrabold disabled:opacity-60"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={onConfirmDelete}
                className="px-3 py-2 border-4 rounded-lg bg-[#FFD803] hover:brightness-95 font-extrabold disabled:opacity-60"
                style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
