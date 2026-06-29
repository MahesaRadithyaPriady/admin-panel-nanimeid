'use client';

import { Sparkles } from 'lucide-react';
import { ANIMATIONS, STYLES, TABS } from '../constants';
import { TabButton } from './TabButton';

export function EventHeader({ activeTab, availableTabs, onTabChange }) {
  return (
    <div className={STYLES.card} style={STYLES.cardShadow}>
      {/* Title Section */}
      <div className="flex items-center gap-3 mb-4">
        <div className={STYLES.icon.wrapper}>
          <Sparkles className={STYLES.icon.svg} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
            Konfigurasi Event
          </h1>
          <p className="text-sm text-[var(--foreground)]/60">
            Atur reward dan event platform
          </p>
        </div>
      </div>

      {/* Tab Menu */}
      <div className="flex flex-wrap gap-2">
        {availableTabs.includes('watch') && (
          <TabButton
            active={activeTab === 'watch'}
            tabId="watch"
            label={TABS.watch.label}
            shortLabel={TABS.watch.shortLabel}
            iconName={TABS.watch.icon}
            onClick={onTabChange}
          />
        )}
        {availableTabs.includes('signin') && (
          <TabButton
            active={activeTab === 'signin'}
            tabId="signin"
            label={TABS.signin.label}
            shortLabel={TABS.signin.shortLabel}
            iconName={TABS.signin.icon}
            onClick={onTabChange}
          />
        )}
      </div>
    </div>
  );
}
