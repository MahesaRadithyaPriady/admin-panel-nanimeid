'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  X,
  Sparkles
} from 'lucide-react';

export default function Sidebar({
  menus,
  currentPath,
  collapsed = false,
  onToggleCollapsed,
  animeRequestStats,
  livechatStats,
  user,
  role,
  onLogout,
  mobileOpen = false,
  onMobileClose
}) {
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
  const [expandedGroups, setExpandedGroups] = useState({});
  const [hoveredGroup, setHoveredGroup] = useState(null);

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

  // Auto-expand group yang memiliki active child (support sub-pages)
  useEffect(() => {
    const newExpanded = {};
    menus.forEach((m) => {
      if (m.children) {
        const hasActiveChild = m.children.some(
          (child) => {
            // Dashboard hanya aktif di exact match, menu lain support sub-pages
            if (child.href === '/dashboard' || child.href === '/dashboard/') {
              return currentPath === child.href || currentPath === '/dashboard' || currentPath === '/dashboard/';
            }
            return currentPath === child.href || currentPath.startsWith(child.href + '/');
          }
        );
        if (hasActiveChild) {
          newExpanded[m.key] = true;
        }
      }
    });
    setExpandedGroups((prev) => ({ ...prev, ...newExpanded }));
  }, [currentPath, menus]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle group click in collapsed mode
  const handleGroupClick = (key) => {
    if (collapsed && !isMobile) {
      // In collapsed mode, toggle the popup
      setHoveredGroup(hoveredGroup === key ? null : key);
    } else {
      toggleGroup(key);
    }
  };

  const renderLivechatBadges = (menuKey) => {
    if (menuKey !== 'livechat') return null;
    const stats = livechatStats || {};
    const items = [
      {
        key: 'queued',
        value: Number(stats?.queued ?? 0) || 0,
        bg: 'bg-amber-500',
        fg: 'text-white'
      },
      {
        key: 'active',
        value: Number(stats?.active ?? 0) || 0,
        bg: 'bg-emerald-500',
        fg: 'text-white'
      },
      {
        key: 'closed',
        value: Number(stats?.closed ?? 0) || 0,
        bg: 'bg-violet-500',
        fg: 'text-white'
      }
    ];

    return (
      <span className="ml-auto inline-flex items-center gap-1">
        {items.map((it) =>
          it.value > 0 ? (
            <span
              key={it.key}
              className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold ${it.bg} ${it.fg}`}
              title={`${it.key}: ${it.value}`}
            >
              {it.value}
            </span>
          ) : null
        )}
      </span>
    );
  };

  const renderDaftarKontenBadges = (menuKey) => {
    if (menuKey !== 'daftar-konten') return null;
    const stats = animeRequestStats || {};
    const items = [
      {
        key: 'pending',
        value: Number(stats?.pending ?? 0) || 0,
        bg: 'bg-amber-500',
        fg: 'text-white'
      },
      {
        key: 'review',
        value: Number(stats?.under_review ?? 0) || 0,
        bg: 'bg-blue-500',
        fg: 'text-white'
      },
      {
        key: 'upload',
        value: Number(stats?.upload_in_progress ?? 0) || 0,
        bg: 'bg-rose-500',
        fg: 'text-white'
      },
      {
        key: 'done',
        value: Number(stats?.completed ?? 0) || 0,
        bg: 'bg-emerald-500',
        fg: 'text-white'
      },
      {
        key: 'reject',
        value: Number(stats?.rejected ?? 0) || 0,
        bg: 'bg-violet-500',
        fg: 'text-white'
      }
    ];

    return (
      <span className="ml-auto inline-flex items-center gap-1 flex-wrap justify-end">
        {items.map((it) =>
          it.value > 0 ? (
            <span
              key={it.key}
              className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold ${it.bg} ${it.fg}`}
              title={`${it.key}: ${it.value}`}
            >
              {it.value}
            </span>
          ) : null
        )}
      </span>
    );
  };

  // Animation variants
  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 }
  };

  const menuItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  const dropdownVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.2,
        ease: 'easeInOut'
      }
    },
    visible: {
      opacity: 1,
      height: 'auto',
      transition: {
        duration: 0.3,
        ease: 'easeOut'
      }
    }
  };

  // Mobile drawer variants
  const mobileDrawerVariants = {
    closed: {
      x: '-100%',
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    open: {
      x: 0,
      transition: { duration: 0.3, ease: 'easeOut' }
    }
  };

  const backdropVariants = {
    closed: { opacity: 0, pointerEvents: 'none' },
    open: { opacity: 1, pointerEvents: 'auto' }
  };

  const SidebarContent = ({ isMobile = false }) => (
    <>
      {/* Header dengan Logo */}
      <div className={`p-4 border-b border-[var(--panel-border)] ${isMobile ? '' : ''}`}>
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {(!collapsed || isMobile) && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3"
              >
                {/* Logo Icon */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] p-0.5 shadow-lg">
                  <img
                    src="/icon.png"
                    alt="NanimeID"
                    className="w-full h-full object-contain rounded-lg bg-white"
                  />
                </div>
                <div className="leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-[var(--foreground)]">
                      NanimeID
                    </span>
                    <Sparkles className="w-3 h-3 text-[var(--accent-secondary)]" />
                  </div>
                  <span className="text-[10px] text-[var(--foreground)]/50 font-medium">
                    Admin Panel v{process.env.NEXT_PUBLIC_VERSION_PANEL || '2.0'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Button - Desktop Only */}
          {!isMobile && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleCollapsed}
              className="p-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--foreground)] hover:bg-[var(--accent-primary)]/10 transition-colors"
              aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
              title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
            >
              <motion.span
                animate={{ rotate: collapsed ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.span>
            </motion.button>
          )}

          {/* Close Button - Mobile Only */}
          {isMobile && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMobileClose}
              className="p-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--foreground)] hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>

      {/* User Info Card */}
      {(!collapsed || isMobile) && (
        <div className="px-4 py-3 border-b border-[var(--panel-border)]">
          <div className="glass-card rounded-xl p-3 space-y-2">
            <div className="text-xs font-medium text-[var(--foreground)]/50 uppercase tracking-wide">
              Akun
            </div>
            <div className="text-sm font-bold text-[var(--foreground)] truncate">
              {user?.username || user?.email?.split('@')[0] || '-'}
            </div>
            <div className="text-xs text-[var(--foreground)]/60 truncate">
              {user?.email || '-'}
            </div>
            <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-medium bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
              {role || '-'}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-[var(--panel-border)] scrollbar-track-transparent">
        {menus.map((m, index) => {
            const isGroup = !!m.children;
            const isExpanded = expandedGroups[m.key];
            const hasActiveChild = isGroup && m.children.some((child) => {
              // Dashboard hanya aktif di exact match, menu lain support sub-pages
              if (child.href === '/dashboard' || child.href === '/dashboard/') {
                return currentPath === child.href || currentPath === '/dashboard' || currentPath === '/dashboard/';
              }
              return currentPath === child.href || currentPath.startsWith(child.href + '/');
            });

            if (isGroup) {
              const showPopup = collapsed && !isMobile && hoveredGroup === m.key;

              return (
                <div
                  key={m.key}
                  className="space-y-1"
                >
                  {/* Group Header */}
                  <button
                    onMouseEnter={() => collapsed && !isMobile && setHoveredGroup(m.key)}
                    onClick={() => handleGroupClick(m.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      hasActiveChild
                        ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                        : 'text-[var(--foreground)]/70 hover:bg-[var(--panel-bg)]/50 hover:text-[var(--foreground)]'
                    }`}
                  >
                    <m.icon className="w-5 h-5 flex-shrink-0" />
                    {(!collapsed || isMobile) && (
                      <span className="text-sm font-medium flex-1 text-left whitespace-nowrap">
                        {m.label}
                      </span>
                    )}
                    {(!collapsed || isMobile) && (
                      <span
                        className="flex-shrink-0 transition-transform duration-200"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    )}
                  </button>

                  {/* Group Children - Normal Expand */}
                  {isExpanded && (!collapsed || isMobile) && (
                    <div className="overflow-hidden">
                      <div className="ml-4 pl-3 border-l-2 border-[var(--panel-border)] space-y-1 py-1">
                        {m.children.map((child) => {
                          // Dashboard hanya aktif di exact match, menu lain support sub-pages
                          const isActive = (child.href === '/dashboard' || child.href === '/dashboard/')
                            ? (currentPath === child.href || currentPath === '/dashboard' || currentPath === '/dashboard/')
                            : (currentPath === child.href || currentPath.startsWith(child.href + '/'));
                          return (
                            <Link
                              key={child.key}
                              href={child.href}
                              onClick={isMobile ? onMobileClose : undefined}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                isActive
                                  ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-medium shadow-lg shadow-[var(--accent-primary)]/25'
                                  : 'text-[var(--foreground)]/60 hover:bg-[var(--panel-bg)] hover:text-[var(--foreground)]'
                              }`}
                              title={child.label}
                            >
                              <child.icon className="w-4 h-4 flex-shrink-0" />
                              <span className="flex-1 whitespace-nowrap">
                                {child.label}
                              </span>
                              {renderLivechatBadges(child.key)}
                              {renderDaftarKontenBadges(child.key)}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Collapsed Mode Popup - Using Portal */}
                  {showPopup && typeof window !== 'undefined' && createPortal(
                    <div
                      className="fixed w-56"
                      style={{
                        left: '88px', // 80px sidebar + 8px margin
                        top: `${120 + (index * 48)}px`, // Calculate based on menu position
                        pointerEvents: 'auto',
                        zIndex: 2147483647 // max z-index
                      }}
                      onMouseEnter={() => setHoveredGroup(m.key)}
                      onMouseLeave={() => setHoveredGroup(null)}
                    >
                      <div className="glass-card rounded-xl p-2 shadow-2xl border border-[var(--panel-border)] backdrop-blur-xl bg-[var(--panel-bg)]">
                        {/* Popup Header */}
                        <div className="px-3 py-2 border-b border-[var(--panel-border)]/50 mb-1">
                          <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                            <m.icon className="w-4 h-4" />
                            {m.label}
                          </div>
                        </div>
                        {/* Popup Items */}
                        <div className="space-y-1">
                          {m.children.map((child) => {
                            // Dashboard hanya aktif di exact match, menu lain support sub-pages
                          const isActive = (child.href === '/dashboard' || child.href === '/dashboard/')
                            ? (currentPath === child.href || currentPath === '/dashboard' || currentPath === '/dashboard/')
                            : (currentPath === child.href || currentPath.startsWith(child.href + '/'));
                            return (
                              <Link
                                key={child.key}
                                href={child.href}
                                onClick={() => setHoveredGroup(null)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                  isActive
                                    ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-medium'
                                    : 'text-[var(--foreground)]/70 hover:bg-[var(--panel-bg)]/50 hover:text-[var(--foreground)]'
                                }`}
                              >
                                <child.icon className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 whitespace-nowrap">{child.label}</span>
                                {renderLivechatBadges(child.key)}
                                {renderDaftarKontenBadges(child.key)}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              );
            }

            // Single menu item - No animation for cleaner hover
            // Dashboard hanya aktif di exact match, menu lain support sub-pages
            const isActive = (m.href === '/dashboard' || m.href === '/dashboard/')
              ? (currentPath === m.href || currentPath === '/dashboard' || currentPath === '/dashboard/')
              : (currentPath === m.href || currentPath.startsWith(m.href + '/'));
            return (
              <div key={m.key}>
                <Link
                  href={m.href}
                  onClick={isMobile ? onMobileClose : undefined}
                  onMouseEnter={() => collapsed && !isMobile && setHoveredGroup(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-medium shadow-lg shadow-[var(--accent-primary)]/25'
                      : 'text-[var(--foreground)]/70 hover:bg-[var(--panel-bg)]/50 hover:text-[var(--foreground)]'
                  }`}
                  title={m.label}
                >
                  <m.icon className="w-5 h-5 flex-shrink-0" />
                  {(!collapsed || isMobile) && (
                    <span className="text-sm font-medium flex-1 whitespace-nowrap">
                      {m.label}
                    </span>
                  )}
                  {(!collapsed || isMobile) && renderLivechatBadges(m.key)}
                  {(!collapsed || isMobile) && renderDaftarKontenBadges(m.key)}
                </Link>
              </div>
            );
          })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-[var(--panel-border)] space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--foreground)]/70 hover:bg-[var(--panel-bg)]/50 hover:text-[var(--foreground)] transition-all duration-200"
          title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
          {(!collapsed || isMobile) && (
            <span className="text-sm font-medium whitespace-nowrap">
              {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            </span>
          )}
        </button>

        {/* Logout Button */}
        <button
          onClick={() => {
            onLogout();
            if (isMobile && onMobileClose) onMobileClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || isMobile) && (
            <span className="text-sm font-medium whitespace-nowrap">
              Keluar
            </span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={collapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden md:flex h-screen sticky top-0 glass-card border-r border-[var(--panel-border)] flex-col overflow-hidden"
      >
        <SidebarContent isMobile={false} />
      </motion.aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={backdropVariants}
              transition={{ duration: 0.3 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Drawer */}
            <motion.aside
              initial="closed"
              animate="open"
              exit="closed"
              variants={mobileDrawerVariants}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="fixed top-0 left-0 h-full w-[280px] glass-card border-r border-[var(--panel-border)] flex flex-col overflow-hidden z-50 md:hidden"
            >
              <SidebarContent isMobile={true} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
