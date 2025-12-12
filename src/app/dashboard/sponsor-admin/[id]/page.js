'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Megaphone, Save, Trash2, ArrowLeft } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getSponsor, updateSponsor, deleteSponsor } from '@/lib/api';

export default function SponsorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const id = params?.id;

  const [loadingItem, setLoadingItem] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'youtube', link_url: '', icon_url: '', is_active: true, sort_order: '' });

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoadingItem(true);
      try {
        const token = getSession()?.token;
        const res = await getSponsor({ token, id });
        const it = res?.item || res?.data || res;
        setForm({
          name: it?.name || '',
          type: it?.type || 'youtube',
          link_url: it?.link_url || '',
          icon_url: it?.icon_url || '',
          is_active: !!it?.is_active,
          sort_order: it?.sort_order ?? '',
        });
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat sponsor');
      } finally {
        setLoadingItem(false);
      }
    };
    load();
  }, [id]);

  const updateField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    const token = getSession()?.token;
    try {
      setSaving(true);
      const payload = buildSponsorUpdate(form);
      await updateSponsor({ token, id, payload });
      toast.success('Sponsor disimpan');
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan sponsor');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const token = getSession()?.token;
    try {
      await deleteSponsor({ token, id });
      toast.success('Sponsor dihapus');
      router.push('/dashboard/sponsor-admin');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus sponsor');
    }
  };

  return (
    <div className="space-y-6">
      {loading || !user ? null : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2"><Megaphone className="size-5" /> Detail Sponsor</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/dashboard/sponsor-admin')} className="btn-pg flex items-center gap-2"><ArrowLeft className="size-4" /> Kembali</button>
            </div>
          </div>

          {loadingItem ? (
            <div className="text-sm">Memuat...</div>
          ) : (
            <form onSubmit={onSave} className="space-y-3 p-4 border-4 rounded-lg" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <L label="Nama"><input value={form.name} onChange={(e)=>updateField('name', e.target.value)} required className="inp" /></L>
                <L label="Tipe"><input value={form.type} onChange={(e)=>updateField('type', e.target.value)} className="inp" placeholder="youtube|tiktok|instagram|website|custom" /></L>
                <L label="Link URL"><input value={form.link_url} onChange={(e)=>updateField('link_url', e.target.value)} className="inp" placeholder="https://..." /></L>
                <L label="Icon URL"><input value={form.icon_url} onChange={(e)=>updateField('icon_url', e.target.value)} className="inp" placeholder="https://..." /></L>
                <L label="Aktif?">
                  <select value={String(form.is_active)} onChange={(e)=>updateField('is_active', e.target.value === 'true')} className="sel">
                    <option value="true">Ya</option>
                    <option value="false">Tidak</option>
                  </select>
                </L>
                <L label="Urutan"><input type="number" value={form.sort_order} onChange={(e)=>updateField('sort_order', e.target.value)} className="inp" /></L>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={saving} type="submit" className="btn-add flex items-center gap-2"><Save className="size-4" /> Simpan</button>
                <button type="button" onClick={onDelete} className="btn-act flex items-center gap-2"><Trash2 className="size-4" /> Hapus</button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function L({ label, children }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
      <label className="lbl">{label}</label>
      {children}
    </div>
  );
}

// Normalize sponsor form into update payload
function buildSponsorUpdate(form) {
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

const styles = `
.inp { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 600; }
.sel { padding: 0.5rem 0.75rem; border-width: 4px; border-radius: 0.5rem; font-weight: 800; }
.lbl { font-size: 0.875rem; font-weight: 800; }
.btn-add { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:4px 4px 0 #000; background: var(--accent-add); color: var(--accent-add-foreground); border-color: var(--panel-border); }
.btn-act { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; font-weight:800; box-shadow:3px 3px 0 #000; background: var(--panel-bg); color: var(--foreground); border-color: var(--panel-border); }
.btn-pg { padding:0.5rem 0.75rem; border-width:4px; border-radius:0.5rem; background:#fff; font-weight:800; box-shadow:4px 4px 0 #000; }
`;
if (typeof document !== 'undefined' && !document.getElementById('sponsor-admin-detail-styles')) {
  const style = document.createElement('style');
  style.id = 'sponsor-admin-detail-styles';
  style.innerHTML = styles;
  document.head.appendChild(style);
}
