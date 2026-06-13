'use client';

import { motion } from 'framer-motion';
import { Filter, ChevronDown } from 'lucide-react';
import { ANIMATIONS, STYLES } from '../constants';

export function FilterBar({ filterActive, total, onFilterChange, onPageReset }) {
  return (
    <motion.div 
      variants={ANIMATIONS.item} 
      className={`${STYLES.card} p-4`} 
      style={STYLES.cardShadow}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]/70">
          <Filter className="w-4 h-4" />
          Filter Config
        </div>
        
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative">
            <select
              value={filterActive}
              onChange={(e) => {
                onPageReset();
                onFilterChange(e.target.value);
              }}
              className="appearance-none pl-3 pr-10 py-2 rounded-xl border-2 bg-[var(--panel-bg)] text-[var(--foreground)] text-sm font-bold"
              style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.15)', borderColor: 'var(--panel-border)' }}
            >
              <option value="">Semua Config</option>
              <option value="true">Aktif saja</option>
              <option value="false">Nonaktif saja</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--foreground)]/50" />
          </div>
          
          <div className="text-sm font-bold text-[var(--foreground)]/60">
            Total: <span className="text-[var(--accent-primary)]">{total}</span> config
          </div>
        </div>
      </div>
    </motion.div>
  );
}
