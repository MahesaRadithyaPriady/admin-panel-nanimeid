'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Megaphone, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { listSponsors, createSponsor, deleteSponsor } from '@/lib/api';

export default function SponsorAdminPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Create form
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'youtube',
    link_url: '',
    icon_url: '',
    is_active: true,
    sort_order: '',
  });

  const loadList = async () => {
    setLoadingList(true);
    try {
      const token = getSession()?.token;
      const data = await listSponsors({ token });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      toast.error(err?.message || 'Gagal memuat sponsor');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadList();
  }, [user]);

  const updateForm = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onCreate = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setCreating(true);
      const payload = buildSponsorPayload(form);
      await createSponsor({ token, payload });
      toast.success('Sponsor dibuat');
      setForm({ name: '', type: 'youtube', link_url: '', icon_url: '', is_active: true, sort_order: '' });
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal membuat sponsor');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id) => {
    const token = getSession()?.token;
    try {
      await deleteSponsor({ token, id });
      toast.success('Sponsor dihapus');
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus sponsor');
    }
  };

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <Megaphone className="size-5" /> Sponsor Admin
            </h2>
          </div>

          {/* Create Form */}
          <form onSubmit={onCreate} className="card p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <L label="Nama"><input value={form.name} onChange={(e)=>updateForm('name', e.target.value)} required className="input w-full" /></L>
              <L label="Tipe"><input value={form.type} onChange={(e)=>updateForm('type', e.target.value)} className="input w-full" placeholder="youtube|tiktok|instagram|website|custom" /></L>
              <L label="Link URL"><input value={form.link_url} onChange={(e)=>updateForm('link_url', e.target.value)} className="input w-full" placeholder="https://..." /></L>
              <L label="Icon URL"><input value={form.icon_url} onChange={(e)=>updateForm('icon_url', e.target.value)} className="input w-full" placeholder="https://..." /></L>
              <L label="Aktif?">
                <select value={String(form.is_active)} onChange={(e)=>updateForm('is_active', e.target.value === 'true')} className="select w-full">
                  <option value="true">Ya</option>
                  <option value="false">Tidak</option>
                </select>
              </L>
              <L label="Urutan"><input type="number" value={form.sort_order} onChange={(e)=>updateForm('sort_order', e.target.value)} className="input w-full" /></L>
            </div>
            <div>
              <button disabled={creating} type="submit" className="btn btn--primary disabled:opacity-60 inline-flex items-center gap-2">
                {creating ? 'Membuat...' : (<><Plus className="size-4" /> Buat Sponsor</>)}
              </button>
            </div>
          </form>

          {/* Table */}
          <div className="overflow-auto">
            <table className="w-full border-2 border-[var(--border)] text-sm" style={{ boxShadow: 'var(--shadow-lg)' }}>
              <thead className="bg-[var(--panel-bg)]">
                <tr>
                  <Th>ID</Th>
                  <Th>Nama</Th>
                  <Th>Tipe</Th>
                  <Th>Aktif</Th>
                  <Th>Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <Td>{it.id}</Td>
                    <Td className="font-extrabold">{it.name}</Td>
                    <Td>{it.type}</Td>
                    <Td>{String(it.is_active)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <a href={`/dashboard/sponsor-admin/${it.id}`} className="btn btn--secondary" title="Detail/Edit"><ExternalLink className="size-4" /></a>
                        <button onClick={() => onDelete(it.id)} className="btn btn--danger" title="Hapus"><Trash2 className="size-4" /></button>
                      </div>
                    </Td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm opacity-70">{loadingList ? 'Memuat...' : 'Tidak ada data.'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function L({ label, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[120px_minmax(0,1fr)] gap-2 items-center">
      <label className="text-sm font-extrabold">{label}</label>
      {children}
    </div>
  );
}
function Th({ children }) { return <th className="text-left px-3 py-2 font-extrabold border-b-2 border-[var(--border)]">{children}</th>; }
function Td({ children, className='' }) { return <td className={`px-3 py-2 font-semibold border-b-2 border-[var(--border)] ${className}`}>{children}</td>; }

// Styles helpers
function buildSponsorPayload(form) {
  const out = {};
  const setStr = (k) => {
    const v = form?.[k];
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (s !== '') out[k] = s;
  };
  const setNum = (k) => {
    const v = form?.[k];
    if (v === undefined || v === null || v === '') return;
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  };
  setStr('name');
  setStr('type');
  setStr('link_url');
  setStr('icon_url');
  if (typeof form?.is_active === 'boolean') out.is_active = form.is_active;
  setNum('sort_order');
  return out;
}

