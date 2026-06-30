'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  X,
} from 'lucide-react';

const itemVariants = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

const groupExpandVariants = {
  hidden:  { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { height: 0, opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
};

export default function Sidebar({
  menus,
  currentPath,
  collapsed = false,
  animeRequestStats,
  livechatStats,
  user,
  role,
  mobileOpen = false,
  onMobileClose
}) {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [popupPos, setPopupPos] = useState({ top: 120, left: 88 });

  // Open the collapsed flyout anchored to the hovered/clicked button
  const openPopupAt = (key, el) => {
    setHoveredGroup(key);
    if (el && typeof window !== 'undefined') {
      const rect = el.getBoundingClientRect();
      const estHeight = 320; // approx max popup height for clamping
      const top = Math.min(rect.top, window.innerHeight - estHeight - 12);
      setPopupPos({ top: Math.max(8, top), left: rect.right + 8 });
    }
  };

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
      { key: 'queued', value: Number(stats?.queued ?? 0) || 0 },
      { key: 'active', value: Number(stats?.active ?? 0) || 0 },
      { key: 'closed', value: Number(stats?.closed ?? 0) || 0 },
    ];
    return (
      <span className="ml-auto inline-flex items-center gap-1">
        {items.map((it) =>
          it.value > 0 ? (
            <span
              key={it.key}
              className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center text-[10px] font-bold border border-gray-300/60 text-white"
              style={{ fontFamily: 'var(--font-mono)' }}
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
      { key: 'pending', value: Number(stats?.pending ?? 0) || 0 },
      { key: 'review',  value: Number(stats?.under_review ?? 0) || 0 },
      { key: 'upload',  value: Number(stats?.upload_in_progress ?? 0) || 0 },
      { key: 'done',    value: Number(stats?.completed ?? 0) || 0 },
      { key: 'reject',  value: Number(stats?.rejected ?? 0) || 0 },
    ];
    return (
      <span className="ml-auto inline-flex items-center gap-1 flex-wrap justify-end">
        {items.map((it) =>
          it.value > 0 ? (
            <span
              key={it.key}
              className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center text-[10px] font-bold border border-gray-300/60 text-white"
              style={{ fontFamily: 'var(--font-mono)' }}
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

  const isItemActive = (href) => {
    if (!href) return false;
    if (href === '/dashboard' || href === '/dashboard/') {
      return currentPath === '/dashboard' || currentPath === '/dashboard/';
    }
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  const SidebarContent = ({ isMobile = false }) => (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-300/20 flex items-center justify-between flex-shrink-0">
        {(!collapsed || isMobile) ? (
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center border-2 border-gray-300 overflow-hidden"
              style={{ background: '#fff', padding: 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://web.nanimeid.xyz/logo.png" alt="NanimeID" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
                NanimeID
              </div>
              <div className="text-[10px] text-white/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
                Admin Panel v{process.env.NEXT_PUBLIC_VERSION_PANEL || '2.0'}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="w-10 h-10 flex items-center justify-center border-2 border-gray-300 flex-shrink-0 overflow-hidden"
            style={{ background: '#fff', padding: 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://web.nanimeid.xyz/logo.png" alt="NanimeID" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        )}

        {isMobile && (
          <button
            onClick={onMobileClose}
            className="p-1.5 border border-gray-300/30 text-white/70 hover:text-white hover:border-gray-300 transition-colors"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Info */}
      {(!collapsed || isMobile) && (
        <div className="px-4 py-3 border-b border-gray-300/20 flex-shrink-0">
          <div className="border border-gray-300/20 p-3 space-y-1">
            <div className="text-[10px] text-white/40 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>
              Akun
            </div>
            <div className="text-sm font-bold text-white truncate" style={{ fontFamily: 'var(--font-mono)' }}>
              {user?.username || user?.email?.split('@')[0] || '-'}
            </div>
            <div className="text-xs text-white/50 truncate" style={{ fontFamily: 'var(--font-mono)' }}>
              {user?.email || '-'}
            </div>
            <span
              className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-gray-300/40 text-white/80"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {role || '-'}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 no-scrollbar" aria-label="Navigasi sidebar">
        {menus.map((m, index) => {
          const isGroup = !!m.children;
          const isExpanded = expandedGroups[m.key];
          const hasActiveChild = isGroup && m.children.some((child) => isItemActive(child.href));

          if (isGroup) {
            const showPopup = collapsed && !isMobile && hoveredGroup === m.key;
            return (
              <div key={m.key}>
                {/* Collapsed: show group icon as trigger */}
                {collapsed && !isMobile && (
                  <button
                    onMouseEnter={(e) => openPopupAt(m.key, e.currentTarget)}
                    onClick={(e) => {
                      if (hoveredGroup === m.key) setHoveredGroup(null);
                      else openPopupAt(m.key, e.currentTarget);
                    }}
                    className={`w-full flex items-center justify-center py-3 transition-colors ${
                      hasActiveChild ? 'bg-white text-black' : 'text-white hover:bg-white/10'
                    }`}
                    title={m.label}
                    aria-label={m.label}
                    aria-haspopup="menu"
                    aria-expanded={hoveredGroup === m.key}
                  >
                    <m.icon className="w-5 h-5" strokeWidth={2} />
                  </button>
                )}

                {/* Expanded/mobile: dropdown trigger */}
                {(!collapsed || isMobile) && (
                  <>
                    <button
                      onClick={() => toggleGroup(m.key)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                        hasActiveChild
                          ? 'bg-white/15 border-l-[3px] border-gray-300'
                          : 'border-l-[3px] border-transparent hover:bg-white/10'
                      }`}
                      aria-expanded={isExpanded}
                      aria-controls={`group-${m.key}`}
                    >
                      <m.icon className="w-5 h-5 flex-shrink-0 text-white" strokeWidth={2} />
                      <span
                        className={`text-xs flex-1 whitespace-nowrap uppercase tracking-wide text-left ${hasActiveChild ? 'text-white font-bold' : 'text-white/70 font-medium'}`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {m.label}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 flex-shrink-0 text-white/70 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        strokeWidth={2}
                      />
                    </button>

                    {/* Dropdown children */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          id={`group-${m.key}`}
                          variants={groupExpandVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="overflow-hidden"
                        >
                          {m.children.map((child, ci) => {
                            const isActive = isItemActive(child.href);
                            return (
                              <motion.div
                                key={child.key}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                transition={{ delay: ci * 0.03 }}
                              >
                                <Link
                                  href={child.href}
                                  onClick={isMobile ? onMobileClose : undefined}
                                  className={`w-full flex items-center gap-3 px-4 pl-8 py-2.5 transition-colors ${
                                    isActive
                                      ? 'bg-white/15 border-l-[3px] border-gray-300'
                                      : 'border-l-[3px] border-transparent hover:bg-white/10'
                                  }`}
                                  title={child.label}
                                >
                                  <child.icon className="w-4 h-4 flex-shrink-0 text-white" strokeWidth={2} />
                                  <span
                                    className={`text-xs flex-1 whitespace-nowrap uppercase tracking-wide ${isActive ? 'text-white font-bold' : 'text-white/70 font-medium'}`}
                                    style={{ fontFamily: 'var(--font-mono)' }}
                                  >
                                    {child.label}
                                  </span>
                                  {renderLivechatBadges(child.key)}
                                  {renderDaftarKontenBadges(child.key)}
                                </Link>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

                {/* Collapsed popup */}
                {showPopup && typeof window !== 'undefined' && createPortal(
                  <div
                    className="fixed w-56 z-[2147483647]"
                    style={{ left: `${popupPos.left}px`, top: `${popupPos.top}px`, pointerEvents: 'auto' }}
                    onMouseEnter={() => setHoveredGroup(m.key)}
                    onMouseLeave={() => setHoveredGroup(null)}
                  >
                    <div
                      className="border-2 border-gray-300 p-2 overflow-y-auto no-scrollbar"
                      style={{ background: 'var(--color-black)', boxShadow: '4px 4px 0 rgba(212,212,212,0.3)', maxHeight: '70vh' }}
                    >
                      <div className="px-3 py-2 border-b border-gray-300/20 mb-1 flex items-center gap-2 text-white">
                        <m.icon className="w-4 h-4" strokeWidth={2} />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>{m.label}</span>
                      </div>
                      {m.children.map((child) => {
                        const isActive = isItemActive(child.href);
                        return (
                          <Link
                            key={child.key}
                            href={child.href}
                            onClick={() => setHoveredGroup(null)}
                            className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                              isActive ? 'bg-white/15 border-l-[3px] border-gray-300' : 'border-l-[3px] border-transparent hover:bg-white/10'
                            }`}
                          >
                            <child.icon className="w-4 h-4 flex-shrink-0 text-white" strokeWidth={2} />
                            <span
                              className={`flex-1 whitespace-nowrap text-xs uppercase tracking-wide ${isActive ? 'text-white font-bold' : 'text-white/70'}`}
                              style={{ fontFamily: 'var(--font-mono)' }}
                            >
                              {child.label}
                            </span>
                            {renderLivechatBadges(child.key)}
                            {renderDaftarKontenBadges(child.key)}
                          </Link>
                        );
                      })}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            );
          }

          // Single item
          const isActive = isItemActive(m.href);
          return (
            <div key={m.key}>
              {collapsed && !isMobile ? (
                <Link
                  href={m.href}
                  onMouseEnter={() => setHoveredGroup(null)}
                  className={`w-full flex items-center justify-center py-3 transition-colors ${
                    isActive ? 'bg-white text-black' : 'text-white hover:bg-white/10'
                  }`}
                  title={m.label}
                  aria-label={m.label}
                >
                  <m.icon className="w-5 h-5" strokeWidth={2} />
                </Link>
              ) : (
                <Link
                  href={m.href}
                  onClick={isMobile ? onMobileClose : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    isActive
                      ? 'bg-white/15 border-l-[3px] border-gray-300'
                      : 'border-l-[3px] border-transparent hover:bg-white/10'
                  }`}
                  title={m.label}
                >
                  <m.icon className="w-5 h-5 flex-shrink-0 text-white" strokeWidth={2} />
                  <span
                    className={`text-xs flex-1 whitespace-nowrap uppercase tracking-wide ${isActive ? 'text-white font-bold' : 'text-white/70 font-medium'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {m.label}
                  </span>
                  {renderLivechatBadges(m.key)}
                  {renderDaftarKontenBadges(m.key)}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={collapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden md:flex h-screen sticky top-0 flex-col overflow-hidden border-r-2 border-gray-300"
        style={{ background: 'var(--color-black)' }}
      >
        <SidebarContent isMobile={false} />
      </motion.aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/70 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-0 left-0 h-full w-[280px] flex flex-col overflow-hidden z-50 md:hidden border-r-2 border-gray-300"
              style={{ background: 'var(--color-black)' }}
            >
              <SidebarContent isMobile={true} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
