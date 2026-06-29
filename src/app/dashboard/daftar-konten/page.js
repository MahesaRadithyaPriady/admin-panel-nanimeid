'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Film, Inbox, AlertTriangle, ChevronRight, Plus, Search } from 'lucide-react';
import { useSession } from '@/hooks/useSession';

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

const CARDS = [
  {
    key: 'anime',
    title: 'Daftar Anime',
    description: 'Kelola semua anime, tambah baru, edit detail, dan atur episode.',
    icon: Film,
    href: '/dashboard/daftar-konten/anime',
    countLabel: 'anime',
  },
  {
    key: 'requests',
    title: 'Permintaan Anime',
    description: 'Lihat dan kelola permintaan anime dari pengguna.',
    icon: Inbox,
    href: '/dashboard/anime-requests',
    countLabel: 'permintaan',
  },
  {
    key: 'issues',
    title: 'Issue Episode',
    description: 'Pantau laporan masalah video episode dan alasan error.',
    icon: AlertTriangle,
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
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6 min-w-0">
      {loading || !user ? null : (
        <>
          {/* Header */}
          <div>
            <h1 className="page-title">Manajemen Konten</h1>
            <p className="label mt-1">Pilih menu di bawah untuk mengelola anime, permintaan, atau issue episode.</p>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  onClick={() => router.push(card.href)}
                  className="card p-5 text-left group"
                >
                  <div className="w-10 h-10 grid place-items-center mb-4" style={{ border: '2px solid var(--border)', background: 'var(--muted-bg)' }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="section-title">{card.title}</h2>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--muted)' }} />
                  </div>
                  <p className="label">{card.description}</p>
                  <div className="mt-4">
                    <span className="badge">{counts[card.key] || 0} {card.countLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="section-title mb-4">Aksi Cepat</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => router.push('/dashboard/daftar-konten/anime')} className="btn btn--primary btn--sm">
                <Plus className="w-4 h-4" /> Tambah Anime
              </button>
              <button onClick={() => router.push('/dashboard/anime-requests')} className="btn btn--secondary btn--sm">
                <Inbox className="w-4 h-4" /> Lihat Permintaan
              </button>
              <button onClick={() => router.push('/dashboard/episode-issue')} className="btn btn--secondary btn--sm">
                <AlertTriangle className="w-4 h-4" /> Cek Issue
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
