'use client';

import { Filter } from 'lucide-react';
import { ANIMATIONS, STYLES } from '../constants';

export function FilterBar({ filterActive, total, onFilterChange, onPageReset }) {
  return (
    <div className={`${STYLES.card} p-4`} style={STYLES.cardShadow}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]/70">
          <Filter className="w-4 h-4" />
          Filter Config
        </div>
        
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <select value={filterActive} onChange={(e) => { onPageReset(); onFilterChange(e.target.value); }} className="select">
              <option value="">Semua Config</option>
              <option value="true">Aktif saja</option>
              <option value="false">Nonaktif saja</option>
            </select>
          <div className="label">Total: <span className="font-bold">{total}</span> config</div>
        </div>
      </div>
    </div>
  );
}
