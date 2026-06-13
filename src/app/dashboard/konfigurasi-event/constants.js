// Animation variants
export const ANIMATIONS = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
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
  card: 'glass-card rounded-2xl border-2',
  cardShadow: { boxShadow: '6px 6px 0 rgba(0,0,0,0.2)', borderColor: 'var(--panel-border)' },
  tab: {
    active: 'bg-[var(--accent-primary)] text-white',
    inactive: 'bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--foreground)] hover:bg-[var(--accent-primary)]/10'
  },
  icon: {
    wrapper: 'w-10 h-10 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center',
    svg: 'w-5 h-5 text-white'
  }
};

// Icons mapping (for dynamic import)
export const ICONS = {
  Sparkles: 'Sparkles',
  Play: 'Play',
  Flame: 'Flame'
};
