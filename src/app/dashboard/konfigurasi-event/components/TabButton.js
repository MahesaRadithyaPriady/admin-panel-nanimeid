'use client';

import { Play, Flame } from 'lucide-react';
import { STYLES } from '../constants';

const iconMap = {
  Play: Play,
  Flame: Flame
};

export function TabButton({ active, tabId, label, shortLabel, iconName, onClick }) {
  const Icon = iconMap[iconName];
  
  return (
    <button
      type="button"
      onClick={() => onClick(tabId)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
        active ? STYLES.tab.active : STYLES.tab.inactive
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </button>
  );
}
