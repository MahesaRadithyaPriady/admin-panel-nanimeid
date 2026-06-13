'use client';

import { motion } from 'framer-motion';
import { Clapperboard, Film, Gift, RefreshCw } from 'lucide-react';
import { ANIMATIONS, STYLES } from '../constants';

export function WatchHeader({ 
  total, 
  activeCount, 
  mode, 
  formId, 
  totalThresholds, 
  onRefresh, 
  loading 
}) {
  return (
    <motion.div variants={ANIMATIONS.item} className="space-y-4">
      {/* Main Header */}
      <div className={`${STYLES.card} p-5 sm:p-6`} style={STYLES.cardShadow}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Clapperboard className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-[var(--foreground)]/50 uppercase tracking-wide">
                Watch Event
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)] flex items-center gap-2">
              <Film className="w-6 h-6" />
              Konfigurasi Event Tonton
            </h2>
            <p className="mt-2 text-sm text-[var(--foreground)]/60 max-w-lg">
              Atur reward berdasarkan menit/episode nonton. User dapat klaim reward saat mencapai threshold.
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-bg)] border-2 border-[var(--panel-border)] text-[var(--foreground)] font-bold text-sm hover:bg-[var(--accent-primary)]/10 transition-colors disabled:opacity-50"
            style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'Memuat...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Config" value={total} />
        <StatCard label="Aktif" value={activeCount} tone="active" />
        <StatCard label="Mode" value={mode === 'add' ? 'Tambah Baru' : `Edit #${formId}`} />
        <StatCard label="Threshold" value={totalThresholds} />
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, tone }) {
  const toneStyles = {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    default: 'bg-[var(--panel-bg)] text-[var(--foreground)] border-[var(--panel-border)]'
  };
  
  return (
    <div className={`${STYLES.card} p-3 ${tone === 'active' ? toneStyles.active : toneStyles.default}`} style={STYLES.cardShadow}>
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-lg sm:text-xl font-black">{value}</div>
    </div>
  );
}
