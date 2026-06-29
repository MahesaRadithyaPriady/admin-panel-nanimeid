// Animation variants
export const ANIMATIONS = {
  page: {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } }
  }
};

// Tab configuration
export const TABS = {
  watch: {
    id: 'watch',
    label: 'Tonton Video',
    shortLabel: 'Tonton',
    icon: 'Play',
    desc: 'Atur reward untuk menonton anime'
  },
  signin: {
    id: 'signin',
    label: 'Login Streak',
    shortLabel: 'Login',
    icon: 'Flame',
    desc: 'Atur login streak rewards'
  }
};

// Style constants
export const STYLES = {
  card: 'card',
  cardShadow: { boxShadow: 'var(--shadow-md)', borderColor: 'var(--border)' },
  tab: {
    active: 'tab tab--active',
    inactive: 'tab'
  },
  icon: {
    wrapper: 'w-10 h-10 flex items-center justify-center border-2 border-current',
    svg: 'w-5 h-5'
  }
};

// Icons mapping (for dynamic import)
export const ICONS = {
  Sparkles: 'Sparkles',
  Play: 'Play',
  Flame: 'Flame'
};
