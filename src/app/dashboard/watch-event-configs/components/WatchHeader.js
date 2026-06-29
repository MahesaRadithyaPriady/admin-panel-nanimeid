'use client';

import { Clapperboard, Film, RefreshCw } from 'lucide-react';
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
    <div className="space-y-4">
      {/* Main Header */}
      <div className={`${STYLES.card} p-5 sm:p-6`} style={STYLES.cardShadow}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Clapperboard className="w-5 h-5" />
              <span className="label uppercase">Watch Event</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)] flex items-center gap-2">
              <Film className="w-6 h-6" />
              Konfigurasi Event Tonton
            </h2>
            <p className="mt-2 text-sm text-[var(--foreground)]/60 max-w-lg">
              Atur reward berdasarkan menit/episode nonton. User dapat klaim reward saat mencapai threshold.
            </p>
          </div>
          <button onClick={onRefresh} disabled={loading} className="btn btn--secondary btn--sm">
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
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className="stat-card">
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-lg sm:text-xl font-black">{value}</div>
    </div>
  );
}
