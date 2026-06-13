// Animation variants
export const ANIMATIONS = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  },
  item: {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' }
    }
  }
};

// Styles
export const STYLES = {
  card: 'glass-card rounded-2xl border-2',
  cardShadow: { boxShadow: '6px 6px 0 rgba(0,0,0,0.2)', borderColor: 'var(--panel-border)' },
  input: 'px-3 py-2 rounded-xl border-2 bg-[var(--panel-bg)] text-[var(--foreground)]',
  inputShadow: { boxShadow: '3px 3px 0 rgba(0,0,0,0.15)' },
  btnPrimary: 'px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white font-bold',
  btnSecondary: 'px-4 py-2 rounded-xl bg-[var(--panel-bg)] border-2 border-[var(--panel-border)] text-[var(--foreground)] font-bold',
  btnDanger: 'px-3 py-1.5 rounded-lg bg-rose-500 text-white text-sm font-bold',
  badge: 'px-2 py-0.5 rounded-full text-xs font-bold'
};

// Reward types
export const REWARD_TYPES = {
  NONE: { label: 'Tidak Ada', color: 'bg-gray-400' },
  ITEM: { label: 'Item', color: 'bg-blue-500' },
  BADGE: { label: 'Badge', color: 'bg-purple-500' },
  STICKER: { label: 'Stiker', color: 'bg-pink-500' },
  BORDER: { label: 'Border', color: 'bg-amber-500' }
};

// Form labels
export const LABELS = {
  isActive: 'Config Aktif',
  dailyReset: 'Reset Harian',
  startsAt: 'Mulai (opsional)',
  endsAt: 'Selesai (opsional)',
  coinReward: 'Hadiah Koin',
  minutes: 'Menit (opsional)',
  episodes: 'Episode (opsional)',
  rewardType: 'Tipe Hadiah',
  rewardId: 'Item Hadiah',
  addThreshold: 'Tambah Ambang',
  thresholdCount: (n) => `${n} threshold aktif`
};
