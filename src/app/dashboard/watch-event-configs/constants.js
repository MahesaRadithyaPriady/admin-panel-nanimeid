// Animation variants
export const ANIMATIONS = {
  page: {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } }
  }
};

// Styles
export const STYLES = {
  card: 'card',
  cardShadow: { boxShadow: 'var(--shadow-md)', borderColor: 'var(--border)' },
  input: 'modern-input',
  inputShadow: {},
  btnPrimary: 'btn btn--primary btn--sm',
  btnSecondary: 'btn btn--secondary btn--sm',
  btnDanger: 'btn btn--danger btn--sm',
  badge: 'badge'
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
