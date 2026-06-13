'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Film, Inbox, AlertTriangle, ChevronRight, Plus, Search } from 'lucide-react';
import { useSession } from '@/hooks/useSession';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const CARDS = [
  {
    key: 'anime',
    title: 'Daftar Anime',
    description: 'Kelola semua anime, tambah baru, edit detail, dan atur episode.',
    icon: Film,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
    href: '/dashboard/daftar-konten/anime',
    countLabel: 'anime',
  },
  {
    key: 'requests',
    title: 'Permintaan Anime',
    description: 'Lihat dan kelola permintaan anime dari pengguna.',
    icon: Inbox,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    href: '/dashboard/anime-requests',
    countLabel: 'permintaan',
  },
  {
    key: 'issues',
    title: 'Issue Episode',
    description: 'Pantau laporan masalah video episode dan alasan error.',
    icon: AlertTriangle,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    href: '/dashboard/episode-issue',
    countLabel: 'laporan',
  },
];

export default function DaftarKontenPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [counts, setCounts] = useState({ anime: 0, requests: 0, issues: 0 });

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 min-w-0"
    >
      {loading || !user ? null : (
        <>
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-black text-[var(--foreground)]">
              Manajemen Konten
            </h1>
            <p className="mt-2 text-base text-[var(--foreground)]/70 max-w-2xl">
              Pilih menu di bawah untuk mengelola anime, permintaan, atau issue episode.
            </p>
          </motion.div>

          {/* Cards Grid */}
          <motion.div variants={itemVariants} className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  onClick={() => router.push(card.href)}
                  className="group relative rounded-2xl sm:rounded-3xl border-2 p-5 sm:p-6 text-left transition-all duration-300 hover:translate-y-[-4px] hover:shadow-xl"
                  style={{
                    boxShadow: '6px 6px 0 rgba(0,0,0,0.2)',
                    borderColor: 'var(--panel-border)',
                    background: 'var(--panel-bg)',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl mb-4 transition-transform group-hover:scale-110"
                    style={{ background: card.bg }}
                  >
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: card.color }} />
                  </div>

                  {/* Content */}
                  <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)] group-hover:text-[var(--accent-primary)] transition-colors">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--foreground)]/70 leading-relaxed">
                    {card.description}
                  </p>

                  {/* Arrow */}
                  <div className="absolute top-5 right-5 sm:top-6 sm:right-6 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent-primary)]" />
                  </div>

                  {/* Count Badge */}
                  <div
                    className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold"
                    style={{ background: card.bg, color: card.color }}
                  >
                    <span>{counts[card.key] || 0}</span>
                    <span>{card.countLabel}</span>
                  </div>
                </button>
              );
            })}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl sm:rounded-3xl border-2 p-5 sm:p-6"
            style={{
              boxShadow: '6px 6px 0 rgba(0,0,0,0.2)',
              borderColor: 'var(--panel-border)',
              background: 'var(--panel-bg)',
            }}
          >
            <h3 className="text-lg sm:text-xl font-black text-[var(--foreground)] mb-4">
              Aksi Cepat
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/dashboard/daftar-konten/anime')}
                className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-3 font-bold transition-all hover:translate-y-[-2px]"
                style={{
                  boxShadow: '4px 4px 0 rgba(0,0,0,0.15)',
                  background: 'var(--accent-primary)',
                  color: 'var(--accent-primary-foreground)',
                  borderColor: 'var(--panel-border)',
                }}
              >
                <Plus className="w-4 h-4" />
                Tambah Anime
              </button>
              <button
                onClick={() => router.push('/dashboard/anime-requests')}
                className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-3 font-bold transition-all hover:translate-y-[-2px]"
                style={{
                  boxShadow: '4px 4px 0 rgba(0,0,0,0.15)',
                  background: 'var(--panel-bg)',
                  color: 'var(--foreground)',
                  borderColor: 'var(--panel-border)',
                }}
              >
                <Inbox className="w-4 h-4" />
                Lihat Permintaan
              </button>
              <button
                onClick={() => router.push('/dashboard/episode-issue')}
                className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-3 font-bold transition-all hover:translate-y-[-2px]"
                style={{
                  boxShadow: '4px 4px 0 rgba(0,0,0,0.15)',
                  background: 'var(--panel-bg)',
                  color: 'var(--foreground)',
                  borderColor: 'var(--panel-border)',
                }}
              >
                <AlertTriangle className="w-4 h-4" />
                Cek Issue
              </button>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
