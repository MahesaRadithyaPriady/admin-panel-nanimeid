'use client';

import { Plus, Trash2, Clock, RotateCcw, Gift, Check, Calendar, Hash, Film } from 'lucide-react';
import { ANIMATIONS, STYLES, LABELS, REWARD_TYPES } from '../constants';

export function ConfigEditor({ 
  form, 
  setForm, 
  onSubmit, 
  onReset,
  normalizedThresholds,
  rewardOptionsForType,
  randomThresholdId
}) {
  return (
    <div className={`${STYLES.card} p-4 sm:p-5`} style={STYLES.cardShadow}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-[var(--panel-border)]">
        <div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">
            {form.id ? `Edit Config #${form.id}` : 'Tambah Config Baru'}
          </h3>
          <p className="text-xs text-[var(--foreground)]/60 mt-0.5">
            Atur periode event dan threshold reward
          </p>
        </div>
        {form.id && (
          <button type="button" onClick={onReset} className="btn btn--secondary btn--sm">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Row 1: Settings & Dates */}
        <div className="grid lg:grid-cols-[200px_1fr] gap-4">
          {/* Settings Column */}
          <div className={`${STYLES.card} p-3 bg-blue-500/5`} style={{ ...STYLES.cardShadow, borderColor: 'var(--panel-border)' }}>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-2"
                />
                <span>{LABELS.isActive}</span>
              </label>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={!!form.daily_reset}
                  onChange={(e) => setForm(f => ({ ...f, daily_reset: e.target.checked }))}
                  className="w-4 h-4 rounded border-2"
                />
                <span>{LABELS.dailyReset}</span>
              </label>
              <div className="mt-2 px-2 py-1 rounded-lg bg-blue-500/10 text-xs font-bold text-blue-600">
                {LABELS.thresholdCount(normalizedThresholds.length)}
              </div>
            </div>
          </div>

          {/* Dates Column */}
          <div className="grid sm:grid-cols-2 gap-3">
            <DateInput
              label={LABELS.startsAt}
              value={form.starts_at}
              onChange={(v) => setForm(f => ({ ...f, starts_at: v }))}
            />
            <DateInput
              label={LABELS.endsAt}
              value={form.ends_at}
              onChange={(v) => setForm(f => ({ ...f, ends_at: v }))}
            />
          </div>
        </div>

        {/* Threshold Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Threshold Reward
            </h4>
            <button type="button" onClick={() => setForm(f => ({ ...f, thresholds: [...(Array.isArray(f.thresholds) ? f.thresholds : []), { id: randomThresholdId(), minutes: "", episodes: "", coin_reward: 0, reward_type: "NONE", reward_id: 0 }] }))} className="btn btn--secondary btn--sm">
              <Plus className="w-3.5 h-3.5" /> {LABELS.addThreshold}
            </button>
          </div>

          {/* Threshold List */}
          <div className="space-y-2">
            {normalizedThresholds.map((t, idx) => (
              <ThresholdRow
                key={t.key}
                data={t}
                index={idx}
                onChange={(field, value) => {
                  setForm(f => {
                    const arr = [...(Array.isArray(f.thresholds) ? f.thresholds : [])];
                    arr[idx] = { ...arr[idx], [field]: value };
                    return { ...f, thresholds: arr };
                  });
                }}
                onDelete={() => {
                  setForm(f => {
                    const arr = [...(Array.isArray(f.thresholds) ? f.thresholds : [])];
                    arr.splice(idx, 1);
                    return { ...f, thresholds: arr };
                  });
                }}
                rewardOptions={rewardOptionsForType(String(t.reward_type || 'NONE').toUpperCase())}
              />
            ))}
            {normalizedThresholds.length === 0 && (
              <div className="text-center py-6 text-sm text-[var(--foreground)]/50 border-2 border-dashed border-[var(--panel-border)] rounded-xl">
                Belum ada threshold. Klik "Tambah Ambang" untuk menambahkan.
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-3" style={{ borderTop: '2px solid var(--border)' }}>
          <button type="submit" className="btn btn--primary">
            {form.id ? 'Simpan Perubahan' : 'Tambah Config'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DateInput({ label, value, onChange }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold text-[var(--foreground)]/70">{label}</span>
      <div className="input-icon">
        <Calendar className="input-icon__icon" />
        <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className="input" />
      </div>
    </label>
  );
}

function ThresholdRow({ data, index, onChange, onDelete, rewardOptions }) {
  const rt = String(data.reward_type || 'NONE').toUpperCase();
  const needsRewardId = rt !== 'NONE';
  const rewardTypeConfig = REWARD_TYPES[rt] || REWARD_TYPES.NONE;
  
  return (
    <div className={`${STYLES.card} p-3`} style={{ ...STYLES.cardShadow, borderColor: 'var(--panel-border)' }}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Index Badge */}
        <div className="flex items-center gap-2 lg:w-24">
          <span className="badge">#{index + 1}</span>
          <span className="text-xs font-bold text-[var(--foreground)]/50 lg:hidden">
            Threshold
          </span>
        </div>
        
        {/* Inputs Grid */}
        <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="input-icon"><Hash className="input-icon__icon" /><input type="text" placeholder="ID" value={data.id || ''} onChange={(e) => onChange('id', e.target.value)} className="input" /></div>
          <div className="input-icon"><Gift className="input-icon__icon" /><input type="number" placeholder="Koin" value={data.coin_reward || 0} onChange={(e) => onChange('coin_reward', parseInt(e.target.value) || 0)} className="input" /></div>
          <div className="input-icon"><Clock className="input-icon__icon" /><input type="number" placeholder="Menit" value={data.minutes || ''} onChange={(e) => onChange('minutes', e.target.value)} className="input" /></div>
          <div className="input-icon"><Film className="input-icon__icon" /><input type="number" placeholder="Episode" value={data.episodes || ''} onChange={(e) => onChange('episodes', e.target.value)} className="input" /></div>
          <select value={rt} onChange={(e) => onChange('reward_type', e.target.value)} className="select">
            {Object.entries(REWARD_TYPES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
        
        {/* Reward ID (conditional) */}
        {needsRewardId && (
          <select value={data.reward_id || 0} onChange={(e) => onChange('reward_id', parseInt(e.target.value))} className="select lg:w-32">
            <option value={0}>Pilih {REWARD_TYPES[rt]?.label}</option>
            {rewardOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        
        {/* Delete */}
        <button type="button" onClick={onDelete} className="btn btn--danger btn--sm btn--icon">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
