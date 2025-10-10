'use client';

import { useEffect, useMemo, useState } from 'react';
import { LogOut, Shield, Sun, Moon } from 'lucide-react';

export default function Header({ user, role, onLogout }) {
  const getInitialTheme = () => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
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
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <header className="mx-auto flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div
          className="grid place-items-center size-10 bg-[#9AE6B4] border-4 rounded-md"
          style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}
        >
          <Shield className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Dashboard NanimeID</h1>
          <div className="text-xs font-semibold opacity-70">{user?.email}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 border-4 rounded-md px-3 py-2 font-extrabold"
          style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          <span className="hidden sm:inline">{theme === 'dark' ? 'Terang' : 'Gelap'}</span>
        </button>
        <span className="px-2 py-1 border-4 rounded-md text-xs font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          {role}
        </span>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-[#FFD803] hover:bg-[#F1C40F] border-4 rounded-md px-3 py-2 font-extrabold"
          style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}
        >
          <LogOut className="size-4" /> Keluar
        </button>
      </div>
    </header>
  );
}
