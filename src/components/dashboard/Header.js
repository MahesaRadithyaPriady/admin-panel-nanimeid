'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, LogOut, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header({ user, role, onLogout, onMenuClick }) {
  const getInitialTheme = () => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      root.classList.remove('light');
      body.classList.remove('light');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.classList.add('light');
      body.classList.add('light');
    }
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onThemeChange = (e) => setTheme(e.detail);
    window.addEventListener('themechange', onThemeChange);
    return () => window.removeEventListener('themechange', onThemeChange);
  }, []);

  return (
    <header
      className="sticky top-0 z-30 hidden md:flex items-center justify-between px-6"
      style={{
        height: '56px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-raised)',
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="btn btn--secondary btn--sm btn--icon"
          title="Menu"
          aria-label="Menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        {user?.email && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--muted)',
              letterSpacing: '0.04em',
            }}
          >
            {user.email}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="btn btn--secondary btn--sm btn--icon"
          title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          aria-label={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
        >
          <AnimatePresence mode="wait">
            {theme === 'dark' ? (
              <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Sun className="w-4 h-4" />
              </motion.span>
            ) : (
              <motion.span key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Moon className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={onLogout}
          className="btn btn--danger btn--sm"
          title="Keluar"
          aria-label="Keluar"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
