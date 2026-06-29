'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Grid2x2, X, LogOut, Sun, Moon } from 'lucide-react';

// 4 slots always pinned in the bar (by menu key)
const PINNED_KEYS = ['overview', 'konten-group', 'kelola', 'settings'];

const ALL_KEY = '__all__';

export default function BottomNav({ menus = [], currentPath, onLogout, user }) {
  // sheet: null = closed, ALL_KEY = full menu, otherwise a group key
  const [sheet, setSheet] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.classList.toggle('light', !next);
    document.body.classList.toggle('dark', next);
    document.body.classList.toggle('light', !next);
  };

  // Close any sheet on route change
  useEffect(() => { setSheet(null); }, [currentPath]);

  // Lock body scroll while a sheet is open
  useEffect(() => {
    if (sheet) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [sheet]);

  const isPathActive = (href) => {
    if (!href || href === '#') return false;
    if (href === '/dashboard' || href === '/dashboard/') {
      return currentPath === '/dashboard' || currentPath === '/dashboard/';
    }
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  const isMenuActive = (m) => {
    if (m.children) return m.children.some((c) => isPathActive(c.href));
    return isPathActive(m.href);
  };

  // Split into pinned (max 4) and rest
  const pinnedMenus = PINNED_KEYS
    .map((k) => menus.find((m) => m.key === k))
    .filter(Boolean);

  // Fallback: if pinned keys not found, use first 4
  const pinned = pinnedMenus.length >= 2 ? pinnedMenus : menus.slice(0, 4);
  const pinnedKeys = new Set(pinned.map((m) => m.key));
  const restMenus = menus.filter((m) => !pinnedKeys.has(m.key));

  // "Menu" button is active when a non-pinned menu's page is open
  const moreActive = restMenus.some((m) => isMenuActive(m));

  const closeSheet = () => setSheet(null);

  const NavItem = ({ item }) => {
    const active = isMenuActive(item);
    const isOpenGroup = sheet === item.key;
    const lit = active || isOpenGroup;

    const cellClass = 'flex-1 flex flex-col items-center justify-center gap-1 transition-colors';
    const cellStyle = {
      background: lit ? '#fff' : 'transparent',
      color: lit ? '#000' : 'rgba(255,255,255,0.5)',
    };

    const inner = (
      <>
        <item.icon className="w-[22px] h-[22px]" strokeWidth={lit ? 2.4 : 2} />
        <span
          className="text-[10px] font-bold uppercase leading-none"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
        >
          {item.label}
        </span>
      </>
    );

    // Group → open focused sheet with only this group's children
    if (item.children) {
      return (
        <button
          onClick={() => setSheet(isOpenGroup ? null : item.key)}
          className={cellClass}
          style={cellStyle}
          aria-haspopup="menu"
          aria-expanded={isOpenGroup}
          aria-label={item.label}
        >
          {inner}
        </button>
      );
    }

    return (
      <Link
        href={item.href}
        className={cellClass}
        style={cellStyle}
        aria-current={active ? 'page' : undefined}
        aria-label={item.label}
      >
        {inner}
      </Link>
    );
  };

  // Row used inside sheets
  const SheetRow = ({ node }) => {
    const active = isPathActive(node.href);
    return (
      <Link
        href={node.href}
        className="flex items-center gap-3 px-4 py-3"
        style={{
          background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
          borderLeft: active ? '3px solid var(--color-gray-300)' : '3px solid transparent',
        }}
        aria-current={active ? 'page' : undefined}
      >
        <node.icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? '#fff' : 'rgba(255,255,255,0.5)', strokeWidth: 2 }} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: active ? 700 : 400,
            color: active ? '#fff' : 'rgba(255,255,255,0.7)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.72rem',
          }}
        >
          {node.label}
        </span>
      </Link>
    );
  };

  const activeGroup = sheet && sheet !== ALL_KEY ? menus.find((m) => m.key === sheet) : null;

  return (
    <>
      {/* Backdrop — shared for both sheet modes */}
      {sheet && (
        <button
          type="button"
          onClick={closeSheet}
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          aria-label="Tutup menu"
        />
      )}

      {/* Focused group sheet — slides above the bar, shows only that group's children */}
      {activeGroup && (
        <div
          className="md:hidden fixed bottom-[62px] left-0 right-0 z-50 flex flex-col"
          style={{ background: 'var(--color-black)', maxHeight: '60dvh', borderTop: '3px solid var(--color-gray-300)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(212,212,212,0.12)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <activeGroup.icon className="w-4 h-4 text-white/70 flex-shrink-0" strokeWidth={2} />
              <span className="text-xs font-bold uppercase tracking-widest text-white/80 truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                {activeGroup.label}
              </span>
            </div>
            <button onClick={closeSheet} className="p-1.5 border border-gray-300/20 text-white/60 hover:text-white" aria-label="Tutup">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto py-1">
            {activeGroup.children.map((child) => <SheetRow key={child.key} node={child} />)}
          </div>
        </div>
      )}

      {/* Full menu sheet */}
      {sheet === ALL_KEY && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col"
          style={{ background: 'var(--color-black)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(212,212,212,0.12)' }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-white/60" style={{ fontFamily: 'var(--font-mono)' }}>
              Menu Lainnya
            </span>
            <button onClick={closeSheet} className="p-2 border border-gray-300/20 text-white/60 hover:text-white" aria-label="Tutup">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {restMenus.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-white/40" style={{ fontFamily: 'var(--font-mono)' }}>
                Semua menu sudah ada di bilah bawah.
              </div>
            ) : (
              restMenus.map((m) => {
                if (m.children) {
                  return (
                    <div key={m.key}>
                      <div className="px-4 pt-5 pb-1 text-[10px] uppercase tracking-widest text-white/35" style={{ fontFamily: 'var(--font-mono)' }}>
                        {m.label}
                      </div>
                      {m.children.map((child) => <SheetRow key={child.key} node={child} />)}
                    </div>
                  );
                }
                return <SheetRow key={m.key} node={m} />;
              })
            )}
          </div>

          <div className="flex-shrink-0 px-4 py-3 space-y-2" style={{ borderTop: '1px solid rgba(212,212,212,0.12)' }}>
            {user?.email && (
              <div className="px-1 pb-2" style={{ borderBottom: '1px solid rgba(212,212,212,0.08)' }}>
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5" style={{ fontFamily: 'var(--font-mono)' }}>Akun</div>
                <div className="text-xs text-white/70 font-semibold truncate" style={{ fontFamily: 'var(--font-mono)' }}>{user.email}</div>
              </div>
            )}
            {mounted && (
              <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-300/15 text-white/60 hover:text-white">
                {isDark ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
                <span className="text-xs font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
                  {isDark ? 'Mode Terang' : 'Mode Gelap'}
                </span>
              </button>
            )}
            <button onClick={() => { closeSheet(); onLogout?.(); }} className="w-full flex items-center gap-3 px-3 py-2.5 bg-white text-black hover:bg-white/90">
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Keluar</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar — 4 pinned + Menu */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          height: '62px',
          background: 'var(--color-black)',
          borderTop: '3px solid var(--color-gray-300)',
          // hard cells separated by thin white rules
          gap: '1px',
        }}
        aria-label="Navigasi utama"
      >
        {/* divider background showing through the 1px gaps */}
        <div className="absolute inset-0 -z-0" style={{ background: 'rgba(212,212,212,0.18)' }} aria-hidden="true" />

        {pinned.map((item) => (
          <div key={item.key} className="relative z-10 flex-1 flex" style={{ background: 'var(--color-black)' }}>
            <NavItem item={item} />
          </div>
        ))}

        {(() => {
          const lit = sheet === ALL_KEY || moreActive;
          return (
            <div className="relative z-10 flex-1 flex" style={{ background: 'var(--color-black)' }}>
              <button
                onClick={() => setSheet(sheet === ALL_KEY ? null : ALL_KEY)}
                className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
                style={{ background: lit ? '#fff' : 'transparent', color: lit ? '#000' : 'rgba(255,255,255,0.5)' }}
                aria-label="Menu lainnya"
                aria-expanded={sheet === ALL_KEY}
              >
                <Grid2x2 className="w-[22px] h-[22px]" strokeWidth={lit ? 2.4 : 2} />
                <span className="text-[10px] font-bold uppercase leading-none" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                  Menu
                </span>
              </button>
            </div>
          );
        })()}
      </nav>
    </>
  );
}
