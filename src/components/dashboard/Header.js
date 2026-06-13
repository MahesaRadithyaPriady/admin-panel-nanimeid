'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Sparkles } from 'lucide-react';

export default function Header({ user, role, onLogout }) {
  const getInitialTheme = () => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    const prefersDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
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
    try {
      localStorage.setItem('theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-6 py-4"
    >
      <div className="glass-card rounded-2xl px-6 py-4 flex items-center justify-between">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] p-0.5 shadow-lg">
            <img
              src="/icon.png"
              alt="NanimeID"
              className="w-full h-full object-contain rounded-lg bg-white"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
                Dashboard
              </h1>
              <Sparkles className="w-4 h-4 text-[var(--accent-secondary)]" />
            </div>
            <div className="text-xs text-[var(--foreground)]/50 font-medium">
              {user?.email}
            </div>
          </div>
        </div>

        {/* Right: Theme Toggle Only */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--foreground)] hover:bg-[var(--accent-primary)]/10 transition-all duration-200"
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          >
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'dark' ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </motion.div>
            <span className="hidden sm:inline text-sm font-medium">
              {theme === 'dark' ? 'Terang' : 'Gelap'}
            </span>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
