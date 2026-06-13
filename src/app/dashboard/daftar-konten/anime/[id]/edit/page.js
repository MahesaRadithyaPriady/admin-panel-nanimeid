'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, Upload, Image as ImageIcon, Film, Trash2, AlertTriangle, Tag as TagIcon, Clock, Calendar, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import { getAnimeDetail, updateAnime, deleteAnime } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const CONTENT_TYPES = ['ANIME', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'];
const STATUS_OPTIONS = ['ONGOING', 'COMPLETED', 'HIATUS', 'UPCOMING'];

// API functions imported from @/lib/api

export default function EditAnimePage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useSession();
  const id = params?.id;

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [coverPreview, setCoverPreview] = useState(null);
  const [form, setForm] = useState({
    nama_anime: '',
    sinopsis_anime: '',
    genre_anime: '',
    status_anime: 'ONGOING',
    content_type: 'ANIME',
    studio_anime: '',
    rating_anime: '',
    is_21_plus: false,
    tags_anime: '',
    label_anime: '',
    tanggal_rilis_anime: '',
    cover_mode: 'existing',
    cover_url: '',
    aliases: '',
  });

  // Schedule state for ONGOING anime
  const [schedules, setSchedules] = useState([{ hari: 'Senin', jam: '20:00', is_active: true }]);

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user, router]);

  // Load anime data (REAL API)
  useEffect(() => {
    if (!id || !user) return;
    const loadAnime = async () => {
      setLoadingData(true);
      try {
        const token = getSession()?.token;
        const res = await getAnimeDetail({ token, id });
        const anime = res?.item || res?.data || res;
        if (anime) {
          setForm({
            nama_anime: anime.nama_anime || '',
            sinopsis_anime: anime.sinopsis_anime || '',
            genre_anime: anime.genre_anime || '',
            status_anime: anime.status_anime || 'ONGOING',
            content_type: anime.content_type || anime.type || 'ANIME',
            studio_anime: anime.studio_anime || '',
            rating_anime: anime.rating_anime || '',
            is_21_plus: anime.is_21_plus || false,
            tags_anime: anime.tags_anime || '',
            label_anime: anime.label_anime || '',
            tanggal_rilis_anime: anime.tanggal_rilis_anime || '',
            cover_mode: 'existing',
            cover_url: '',
            aliases: Array.isArray(anime.aliases)
              ? anime.aliases.map(a => typeof a === 'object' ? a.alias : a).filter(Boolean).join(', ')
              : (anime.aliases || ''),
          });
          // Load schedules if exists for ONGOING anime
          if (anime.schedules?.length > 0) {
            setSchedules(anime.schedules.map(s => ({
              hari: s.hari || 'Senin',
              jam: s.jam || '20:00',
              is_active: s.is_active !== false
            })));
          } else if (anime.status_anime === 'ONGOING') {
            setSchedules([{ hari: 'Senin', jam: '20:00', is_active: true }]);
          }
          setCoverPreview(anime.cover_anime || anime.gambar_anime || null);
        }
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat anime');
      } finally {
        setLoadingData(false);
      }
    };
    loadAnime();
  }, [id, user]);

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, cover_mode: 'upload' }));
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = getSession()?.token;
      const payload = {
        nama_anime: form.nama_anime,
        sinopsis_anime: form.sinopsis_anime,
        genre_anime: form.genre_anime,
        status_anime: form.status_anime,
        content_type: form.content_type,
        studio_anime: form.studio_anime,
        rating_anime: form.rating_anime ? Number(form.rating_anime) : undefined,
        is_21_plus: form.is_21_plus,
        tags_anime: form.tags_anime,
        label_anime: form.label_anime,
        tanggal_rilis_anime: form.tanggal_rilis_anime || undefined,
      };

      // Add aliases if filled
      if (form.aliases?.trim()) {
        payload.aliases = form.aliases.trim();
      }

      // Add schedules for ONGOING status
      if (form.status_anime === 'ONGOING' && schedules.length > 0) {
        const validSchedules = schedules
          .filter(s => s.hari && s.jam)
          .map(s => ({
            hari: s.hari,
            jam: s.jam,
            is_active: s.is_active !== false
          }));
        if (validSchedules.length > 0) {
          payload.schedules = validSchedules;
        }
      }
      // Handle cover update
      if (form.cover_mode === 'upload' && coverPreview) {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput?.files?.[0]) {
          payload.image = fileInput.files[0];
        }
      } else if (form.cover_mode === 'url' && form.cover_url) {
        payload.gambar_anime = form.cover_url;
      }
      await updateAnime({ token, id, payload });
      toast.success('Anime berhasil diperbarui!');
    } catch (err) {
      toast.error(err?.message || 'Gagal memperbarui anime');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm('Yakin ingin menghapus anime ini? Semua episode akan ikut terhapus. Aksi ini tidak bisa dibatalkan.')) return;
    setDeleting(true);
    try {
      const token = getSession()?.token;
      await deleteAnime({ token, id });
      toast.success('Anime dihapus!');
      router.push('/dashboard/daftar-konten/anime');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus anime');
      setDeleting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-3 border-[var(--accent-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 min-w-0 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/daftar-konten/anime/${id}`)}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">Edit Anime</h1>
            <p className="text-sm text-[var(--foreground)]/70">{form.nama_anime}</p>
          </div>
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold text-red-500 disabled:opacity-60 transition-all hover:translate-y-[-2px]"
          style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'rgba(239,68,68,0.1)', borderColor: 'var(--panel-border)' }}
        >
          <Trash2 className={`w-4 h-4 ${deleting ? 'animate-pulse' : ''}`} />
          {deleting ? 'Menghapus...' : 'Hapus'}
        </button>
      </motion.div>

      {/* Form */}
      <motion.form variants={itemVariants} onSubmit={onSubmit} className="space-y-6">
        {/* Cover Section */}
        <div className="rounded-2xl border-2 p-5" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" /> Cover Anime
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <div className="aspect-[3/4] rounded-xl border-2 overflow-hidden flex items-center justify-center" style={{ borderColor: 'var(--panel-border)', background: 'var(--background)' }}>
                {coverPreview ? (
                  <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-10 h-10 mx-auto text-[var(--foreground)]/30" />
                    <p className="mt-2 text-xs text-[var(--foreground)]/50">No Image</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateField('cover_mode', 'existing')}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-xs font-bold transition-all ${form.cover_mode === 'existing' ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                  style={{ background: form.cover_mode === 'existing' ? 'var(--accent-primary)' : 'var(--panel-bg)', color: form.cover_mode === 'existing' ? 'var(--accent-primary-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                >
                  Existing
                </button>
                <button
                  type="button"
                  onClick={() => updateField('cover_mode', 'upload')}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-xs font-bold transition-all ${form.cover_mode === 'upload' ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                  style={{ background: form.cover_mode === 'upload' ? 'var(--accent-primary)' : 'var(--panel-bg)', color: form.cover_mode === 'upload' ? 'var(--accent-primary-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                >
                  <Upload className="w-3 h-3 inline mr-1" /> Upload
                </button>
                <button
                  type="button"
                  onClick={() => updateField('cover_mode', 'url')}
                  className={`flex-1 rounded-lg border-2 px-4 py-2 text-xs font-bold transition-all ${form.cover_mode === 'url' ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                  style={{ background: form.cover_mode === 'url' ? 'var(--accent-primary)' : 'var(--panel-bg)', color: form.cover_mode === 'url' ? 'var(--accent-primary-foreground)' : 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                >
                  URL
                </button>
              </div>

              {form.cover_mode === 'upload' && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={onCoverChange}
                  className="w-full rounded-lg border-2 px-3 py-2.5 text-sm"
                  style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                />
              )}
              {form.cover_mode === 'url' && (
                <input
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={form.cover_url}
                  onChange={(e) => updateField('cover_url', e.target.value)}
                  className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                  style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-2xl border-2 p-5" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Film className="w-5 h-5" /> Informasi Dasar
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Judul Anime *</label>
              <input
                required
                type="text"
                value={form.nama_anime}
                onChange={(e) => updateField('nama_anime', e.target.value)}
                className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Sinopsis</label>
              <textarea
                rows={4}
                value={form.sinopsis_anime}
                onChange={(e) => updateField('sinopsis_anime', e.target.value)}
                className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold resize-none"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Genre</label>
              <input
                type="text"
                value={form.genre_anime}
                onChange={(e) => updateField('genre_anime', e.target.value)}
                className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Studio</label>
              <input
                type="text"
                value={form.studio_anime}
                onChange={(e) => updateField('studio_anime', e.target.value)}
                className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Tipe Konten</label>
              <select
                value={form.content_type}
                onChange={(e) => updateField('content_type', e.target.value)}
                className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              >
                {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Status</label>
              <select
                value={form.status_anime}
                onChange={(e) => updateField('status_anime', e.target.value)}
                className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Rating</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={form.rating_anime}
                onChange={(e) => updateField('rating_anime', e.target.value)}
                className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Tanggal Rilis</label>
              <input
                type="date"
                value={form.tanggal_rilis_anime}
                onChange={(e) => updateField('tanggal_rilis_anime', e.target.value)}
                className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Tags</label>
              <input
                type="text"
                value={form.tags_anime}
                onChange={(e) => updateField('tags_anime', e.target.value)}
                className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--foreground)] mb-1.5">Label</label>
              <input
                type="text"
                value={form.label_anime}
                onChange={(e) => updateField('label_anime', e.target.value)}
                className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateField('is_21_plus', !form.is_21_plus)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_21_plus ? 'bg-red-500' : 'bg-gray-400'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_21_plus ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm font-bold text-[var(--foreground)]">Konten 21+ (Dewasa)</span>
          </div>
        </div>

        {/* Schedule Section - Only for ONGOING status */}
        {form.status_anime === 'ONGOING' && (
          <motion.div variants={itemVariants} className="rounded-2xl border-2 p-5" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Jadwal Rilis <span className="text-red-500">*</span>
              </h2>
              <span className="text-xs text-[var(--foreground)]/60 bg-yellow-500/20 px-2 py-1 rounded">
                Wajib untuk anime ONGOING
              </span>
            </div>

            <div className="space-y-3">
              {schedules.map((schedule, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl border-2" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                  <select
                    value={schedule.hari}
                    onChange={(e) => {
                      const newSchedules = [...schedules];
                      newSchedules[index] = { ...schedule, hari: e.target.value };
                      setSchedules(newSchedules);
                    }}
                    className="rounded-lg border-2 px-3 py-2 text-sm font-semibold"
                    style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                  >
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--foreground)]/50" />
                    <input
                      type="time"
                      value={schedule.jam}
                      onChange={(e) => {
                        const newSchedules = [...schedules];
                        newSchedules[index] = { ...schedule, jam: e.target.value };
                        setSchedules(newSchedules);
                      }}
                      className="rounded-lg border-2 px-3 py-2 text-sm font-semibold"
                      style={{ background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newSchedules = [...schedules];
                      newSchedules[index] = { ...schedule, is_active: !schedule.is_active };
                      setSchedules(newSchedules);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${schedule.is_active ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-600'}`}
                  >
                    {schedule.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>

                  {schedules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSchedules(schedules.filter((_, i) => i !== index))}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSchedules([...schedules, { hari: 'Senin', jam: '20:00', is_active: true }])}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all hover:translate-y-[-2px]"
              style={{ boxShadow: '2px 2px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
            >
              <Plus className="w-4 h-4" /> Tambah Jadwal
            </button>
          </motion.div>
        )}

        {/* Aliases Field */}
        <motion.div variants={itemVariants} className="rounded-2xl border-2 p-5" style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <TagIcon className="w-5 h-5" /> Alias / Judul Lain
          </h2>
          <textarea
            rows={3}
            value={form.aliases}
            onChange={(e) => updateField('aliases', e.target.value)}
            placeholder="Masukkan alias anime (pisahkan dengan koma atau baris baru)&#10;Contoh: Naruto Shippuden, Boruto, Naruto TV"
            className="w-full rounded-lg border-2 px-3 py-2.5 text-sm font-semibold resize-none"
            style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
          />
          <p className="text-xs text-[var(--foreground)]/60 mt-2">
            Alias membantu pencarian anime dengan nama lain
          </p>
        </motion.div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/daftar-konten/anime/${id}`)}
            className="rounded-xl border-2 px-6 py-3 font-bold transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', background: 'var(--panel-bg)', color: 'var(--foreground)', borderColor: 'var(--panel-border)' }}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-6 py-3 font-bold disabled:opacity-60 transition-all hover:translate-y-[-2px]"
            style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.15)', background: 'var(--accent-edit)', color: 'var(--accent-edit-foreground)', borderColor: 'var(--panel-border)' }}
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
