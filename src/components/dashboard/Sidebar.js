'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, LogOut, Moon, Sun } from 'lucide-react';

export default function Sidebar({ menus, currentPath, collapsed = false, onToggleCollapsed, animeRequestStats, livechatStats, user, role, onLogout }) {
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
    try {
      localStorage.setItem('theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const renderLivechatBadges = (menuKey) => {
    if (menuKey !== 'livechat') return null;
    const stats = livechatStats || {};
    const items = [
      { key: 'queued', value: Number(stats?.queued ?? 0) || 0, bg: '#F59E0B', fg: '#111827' },
      { key: 'active', value: Number(stats?.active ?? 0) || 0, bg: '#22C55E', fg: '#052E16' },
      { key: 'closed', value: Number(stats?.closed ?? 0) || 0, bg: '#A78BFA', fg: '#2E1065' },
    ];

    return (
      <span className="ml-auto inline-flex items-center gap-1">
        {items.map((it) => (
          <span
            key={it.key}
            className="min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-black border-2"
            style={{ background: it.bg, color: it.fg, borderColor: 'var(--panel-border)' }}
            title={`${it.key}: ${it.value}`}
          >
            {it.value}
          </span>
        ))}
      </span>
    );
  };

  const renderDaftarKontenBadges = (menuKey) => {
    if (menuKey !== 'daftar-konten') return null;
    const stats = animeRequestStats || {};
    const items = [
      { key: 'pending', value: Number(stats?.pending ?? 0) || 0, bg: '#F59E0B', fg: '#111827' },
      { key: 'review', value: Number(stats?.under_review ?? 0) || 0, bg: '#60A5FA', fg: '#172554' },
      { key: 'upload', value: Number(stats?.upload_in_progress ?? 0) || 0, bg: '#FB7185', fg: '#4C0519' },
      { key: 'done', value: Number(stats?.completed ?? 0) || 0, bg: '#22C55E', fg: '#052E16' },
      { key: 'reject', value: Number(stats?.rejected ?? 0) || 0, bg: '#A78BFA', fg: '#2E1065' },
    ];

    return (
      <span className="ml-auto inline-flex items-center gap-1 flex-wrap justify-end">
        {items.map((it) => (
          <span
            key={it.key}
            className="min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-black border-2"
            style={{ background: it.bg, color: it.fg, borderColor: 'var(--panel-border)' }}
            title={`${it.key}: ${it.value}`}
          >
            {it.value}
          </span>
        ))}
      </span>
    );
  };

  const chevronRotationClass = collapsed ? 'rotate-90 md:rotate-180' : '-rotate-90 md:rotate-0';

  return (
    <aside
      className={`border-4 rounded-xl p-3 md:p-4 md:transition-[width] transition-[max-height] duration-300 ease-in-out ${collapsed ? 'md:px-2' : ''}`}
      style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
    >
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} mb-2`}>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-extrabold">NanimeID</div>
            <div className="text-[11px] font-bold opacity-70">Panel v1.1.5</div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="border-4 rounded-lg font-extrabold p-2"
          style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
          title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
        >
          <span className={`block transition-transform duration-300 ease-in-out ${chevronRotationClass}`}>
            <ChevronLeft className="size-4" />
          </span>
        </button>
      </div>

      <div
        className={`md:overflow-visible overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
          collapsed
            ? 'max-h-0 opacity-0 md:max-h-none md:opacity-100'
            : 'max-h-[calc(100vh-140px)] opacity-100 md:max-h-none overflow-y-auto overscroll-contain'
        }`}
      >
        <div className="md:hidden mb-3 space-y-2">
          <div className="border-4 rounded-lg px-3 py-2" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <div className="text-xs font-bold uppercase tracking-wide opacity-70">Akun</div>
            <div className="text-sm font-extrabold break-all">{user?.email || '-'}</div>
            <div className="mt-1 inline-flex px-2 py-1 border-4 rounded-md text-xs font-extrabold" style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
              {role || '-'}
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between gap-2 border-4 rounded-lg px-3 py-2 font-extrabold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            type="button"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            </span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-between gap-2 bg-[#FFD803] hover:brightness-95 border-4 rounded-lg px-3 py-2 font-extrabold"
            style={{ boxShadow: '4px 4px 0 #000', borderColor: 'var(--panel-border)' }}
            type="button"
          >
            <span className="flex items-center gap-2">
              <LogOut className="size-4" /> Keluar
            </span>
          </button>
        </div>

        <nav className="space-y-2">
        {menus.map((m) => {
          if (m.children) {
            const hasActiveChild = m.children.some(child => currentPath === child.href);

            return (
              <div key={m.key} className="space-y-1">
                <div className={`px-3 text-xs font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-2 ${collapsed ? 'justify-center px-0' : ''}`}>
                  <m.icon className="size-3 opacity-70" />
                  {!collapsed && <span>{m.label}</span>}
                </div>

                <div className={`${collapsed ? 'ml-0' : 'ml-4'} space-y-1`}>
                  {m.children.map((child) => {
                    const active = currentPath === child.href;
                    return (
                      <Link
                        key={child.key}
                        href={child.href}
                        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2'} px-3 py-2 border-4 rounded-lg font-extrabold hover:brightness-95 text-sm transition-all duration-300`}
                        style={{
                          boxShadow: '4px 4px 0 #000',
                          background: active ? '#FFD803' : 'var(--panel-bg)',
                          borderColor: 'var(--panel-border)',
                          color: 'var(--foreground)'
                        }}
                        title={child.label}
                      >
                        <child.icon className={collapsed ? 'size-4' : 'size-3'} />
                        {!collapsed && child.label}
                        {!collapsed ? renderLivechatBadges(child.key) : null}
                        {!collapsed ? renderDaftarKontenBadges(child.key) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          const active = currentPath === m.href;
          return (
            <Link
              key={m.key}
              href={m.href}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2'} px-3 py-2 border-4 rounded-lg font-extrabold hover:brightness-95 transition-all duration-300`}
              style={{ 
                boxShadow: '4px 4px 0 #000', 
                background: active ? '#FFD803' : 'var(--panel-bg)', 
                borderColor: 'var(--panel-border)', 
                color: 'var(--foreground)' 
              }}
              title={m.label}
            >
              <m.icon className="size-4" />
              {!collapsed && m.label}
              {!collapsed ? renderLivechatBadges(m.key) : null}
              {!collapsed ? renderDaftarKontenBadges(m.key) : null}
            </Link>
          );
        })}
      </nav>
      </div>
    </aside>
  );
}
