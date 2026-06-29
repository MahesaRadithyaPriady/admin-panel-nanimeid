'use client';

import { Edit3, Trash2, Power, Clock, Gift, ChevronRight } from 'lucide-react';
import { ANIMATIONS, STYLES, REWARD_TYPES } from '../constants';

export function ConfigList({ 
  items, 
  loading, 
  onEdit, 
  onDelete, 
  onToggleActive,
  formatDate 
}) {
  if (items.length === 0 && !loading) {
    return (
      <div className={`${STYLES.card} p-8 text-center`} style={STYLES.cardShadow}>
        <Gift className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
        <div className="text-lg font-bold text-[var(--foreground)]">Belum ada config</div>
        <div className="text-sm text-[var(--foreground)]/50 mt-1">
          Tambahkan config baru menggunakan form di atas
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-[var(--foreground)]/70">
          Daftar Config ({items.length} item)
        </h3>
        <p className="text-xs text-[var(--foreground)]/50">
          Pantau periode event dan threshold reward
        </p>
      </div>

      {items.map((cfg, idx) => (
        <ConfigCard 
          key={cfg.id} 
          data={cfg} 
          index={idx}
          onEdit={() => onEdit(cfg)}
          onDelete={() => onDelete(cfg.id, cfg)}
          onToggle={() => onToggleActive(cfg.id, cfg.is_active)}
          formatDate={formatDate}
        />
      ))}
    </div>
  );
}

function ConfigCard({ data, index, onEdit, onDelete, onToggle, formatDate }) {
  const thresholds = Array.isArray(data.thresholds) ? data.thresholds : [];
  const isActive = !!data.is_active;
  const hasDailyReset = !!data.daily_reset;
  
  return (
    <div className={`${STYLES.card} p-4`} style={STYLES.cardShadow}>
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-black">
            Config #{data.id}
          </span>
          {isActive ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center gap-1">
              <Power className="w-3 h-3" /> Aktif
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-gray-400/10 text-gray-500 text-xs font-bold flex items-center gap-1">
              <Power className="w-3 h-3" /> Nonaktif
            </span>
          )}
          {hasDailyReset && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold flex items-center gap-1">
              <Clock className="w-3 h-3" /> Reset Harian
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              isActive ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-gray-400 hover:bg-gray-400/10'
            }`}
            title={isActive ? 'Nonaktifkan' : 'Aktifkan'}
          >
            <Power className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Hapus"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Period */}
      <div className="flex items-center gap-4 text-xs text-[var(--foreground)]/60 mb-3">
        <span>Mulai: {formatDate(data.starts_at) || '-'}</span>
        <ChevronRight className="w-3 h-3" />
        <span>Selesai: {formatDate(data.ends_at) || '-'}</span>
      </div>
      
      {/* Thresholds Preview */}
      {thresholds.length > 0 && (
        <div className="border-t border-[var(--panel-border)] pt-3">
          <div className="text-xs font-bold text-[var(--foreground)]/50 mb-2">
            {thresholds.length} Threshold Reward
          </div>
          <div className="flex flex-wrap gap-1.5">
            {thresholds.slice(0, 4).map((t, i) => (
              <ThresholdBadge key={i} data={t} />
            ))}
            {thresholds.length > 4 && (
              <span className="px-2 py-0.5 rounded bg-[var(--panel-bg)] text-[var(--foreground)]/50 text-xs font-bold">
                +{thresholds.length - 4} lagi
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThresholdBadge({ data }) {
  const rt = String(data.reward_type || 'NONE').toUpperCase();
  const config = REWARD_TYPES[rt];
  const hasItem = rt !== 'NONE' && data.reward_id;
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs">
      <span className="font-black text-[var(--accent-primary)]">{data.id || '?'}</span>
      {data.minutes && <span className="text-[var(--foreground)]/60">{data.minutes}m</span>}
      {data.episodes && <span className="text-[var(--foreground)]/60">{data.episodes}ep</span>}
      <span className="font-bold text-emerald-600">{data.coin_reward || 0}🪙</span>
      {hasItem && <span className={`w-2 h-2 rounded-full ${config?.color || 'bg-gray-400'}`} />}
    </span>
  );
}
