'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Coins, 
  Star, 
  Calendar, 
  Search, 
  Filter,
  Crown,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  User,
  Image,
  BadgeCheck,
  Target,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Zap
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import {
  getLeaderboardStats,
  getLeaderboardAvailableMonths,
  getLeaderboardMonthlySummary,
  getLeaderboardByPeriod,
  getLeaderboardByPeriodWithCollections,
  getCoinLeaderboard,
  getSharpTokenLeaderboard
} from '@/lib/api';

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const [activeTab, setActiveTab] = useState('overview');
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [stats, setStats] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [coinLeaderboard, setCoinLeaderboard] = useState(null);
  const [sharpTokenLeaderboard, setSharpTokenLeaderboard] = useState(null);

  // Filters
  const [period, setPeriod] = useState('daily');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [minCoins, setMinCoins] = useState(0);
  const [maxCoins, setMaxCoins] = useState('');
  const [minTokens, setMinTokens] = useState(0);
  const [maxTokens, setMaxTokens] = useState('');

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingStats(true);
        const token = getSession()?.token;
        
        const [statsData, monthsData] = await Promise.all([
          getLeaderboardStats({ token }),
          getLeaderboardAvailableMonths({ token })
        ]);
        
        setStats(statsData);
        setAvailableMonths(monthsData || []);
        
        // Set current month as default
        if (monthsData && monthsData.length > 0) {
          const currentMonth = monthsData[0];
          setSelectedMonth(currentMonth);
        }
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat data awal');
      } finally {
        setLoadingStats(false);
      }
    };
    loadInitialData();
  }, []);

  // Load leaderboard data when tab or filters change
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const token = getSession()?.token;
        
        if (activeTab === 'overview') {
          // Load daily leaderboard for overview
          const data = await getLeaderboardByPeriod({ token, period: 'daily', page: 1, limit: 10 });
          setLeaderboardData(data);
        } else if (activeTab === 'leaderboard') {
          if (period === 'monthly' && selectedMonth) {
            const data = await getLeaderboardMonthlySummary({
              token,
              year: selectedMonth.year,
              month: selectedMonth.month,
              page,
              limit: 20
            });
            setLeaderboardData(data);
          } else {
            const data = await getLeaderboardByPeriodWithCollections({
              token,
              period,
              page,
              limit: 20
            });
            setLeaderboardData(data);
          }
        } else if (activeTab === 'coins') {
          const data = await getCoinLeaderboard({
            token,
            page,
            limit: 20,
            minCoins,
            maxCoins: maxCoins || undefined,
            search
          });
          setCoinLeaderboard(data);
        } else if (activeTab === 'tokens') {
          const data = await getSharpTokenLeaderboard({
            token,
            page,
            limit: 20,
            minTokens,
            maxTokens: maxTokens || undefined,
            search
          });
          setSharpTokenLeaderboard(data);
        }
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat data leaderboard');
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [activeTab, period, selectedMonth, page, search, minCoins, maxCoins, minTokens, maxTokens]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return (
      <div className="w-10 h-10 border-2 border-[var(--border)] flex items-center justify-center" style={{ boxShadow: 'var(--shadow-sm)', background: 'var(--foreground)' }}>
        <Trophy className="w-5 h-5" style={{ color: 'var(--background)' }} />
      </div>
    );
    if (rank === 2) return (
      <div className="w-10 h-10 border-2 border-[var(--border)] flex items-center justify-center" style={{ background: 'var(--surface)' }}>
        <Medal className="w-5 h-5" />
      </div>
    );
    if (rank === 3) return (
      <div className="w-10 h-10 border-2 border-[var(--border)] flex items-center justify-center" style={{ background: 'var(--surface)' }}>
        <Award className="w-5 h-5" />
      </div>
    );
    return (
      <div className="w-10 h-10 border-2 border-[var(--border)] flex items-center justify-center" style={{ background: 'var(--surface)' }}>
        <span className="font-bold text-sm">#{rank}</span>
      </div>
    );
  };

  const getVipBadge = (vip) => {
    if (!vip || vip.status !== 'ACTIVE') return null;
    
    const colors = {
      BRONZE: 'from-amber-600 to-orange-600',
      SILVER: 'from-gray-400 to-gray-500',
      GOLD: 'from-yellow-400 to-amber-500',
      PLATINUM: 'from-purple-500 to-violet-600',
      DIAMOND: 'from-blue-500 to-cyan-500',
      MASTER: 'from-rose-500 to-red-600'
    };
    
    return (
      <span className="badge">{vip.level}</span>
    );
  };

  if (loading || !user) return null;

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 min-w-0 overflow-x-hidden"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5" />
            <span className="label uppercase">Leaderboard</span>
          </div>
          <h1 className="page-title">Kelola Leaderboard</h1>
          <p className="label mt-1">Monitor XP, coins, sharp tokens, dan koleksi user.</p>
        </div>
        <button onClick={() => window.location.reload()} className="btn btn--secondary btn--sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4" /><span className="stat-card__label">Total Users</span></div>
            <div className="stat-card__value">{formatNumber(stats.overview?.totalUsers || 0)}</div>
            <div className="label truncate">Registered users</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2"><Coins className="w-4 h-4" /><span className="stat-card__label">Coins</span></div>
            <div className="stat-card__value">{formatNumber(stats.coins?.totalCoinsInCirculation || 0)}</div>
            <div className="label truncate">Top: {stats.coins?.topHolder?.username || '-'}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2"><Star className="w-4 h-4" /><span className="stat-card__label">Sharp Tokens</span></div>
            <div className="stat-card__value">{formatNumber(stats.sharpTokens?.totalTokensInCirculation || 0)}</div>
            <div className="label truncate">Top: {stats.sharpTokens?.topHolder?.username || '-'}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4" /><span className="stat-card__label">Daily Active</span></div>
            <div className="stat-card__value">{formatNumber(stats.leaderboard?.daily?.participants || 0)}</div>
            <div className="label truncate">Top: {stats.leaderboard?.daily?.topUser?.username || '-'}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'leaderboard', label: 'Leaderboard', icon: Medal },
          { key: 'coins', label: 'Coins', icon: Coins },
          { key: 'tokens', label: 'Sharp Tokens', icon: Star }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab ${activeTab === tab.key ? 'tab--active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      {activeTab === 'leaderboard' && (
        <div className="filter-bar">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label uppercase block mb-1">Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="select w-full">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {period === 'monthly' && (
              <div>
                <label className="label uppercase block mb-1">Month</label>
                <select value={selectedMonth?.label || ''} onChange={(e) => { const month = availableMonths.find(m => m.label === e.target.value); setSelectedMonth(month); }} className="select w-full">
                  {availableMonths.map((month) => (
                    <option key={month.label} value={month.label}>{month.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
      {(activeTab === 'coins' || activeTab === 'tokens') && (
        <div className="filter-bar">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label uppercase block mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Username, email..." className="input w-full pl-9" />
              </div>
            </div>
            <div>
              <label className="label uppercase block mb-1">Min {activeTab === 'coins' ? 'Coins' : 'Tokens'}</label>
              <input type="number" value={activeTab === 'coins' ? minCoins : minTokens} onChange={(e) => activeTab === 'coins' ? setMinCoins(parseInt(e.target.value) || 0) : setMinTokens(parseInt(e.target.value) || 0)} placeholder="0" className="input w-full" />
            </div>
            <div>
              <label className="label uppercase block mb-1">Max {activeTab === 'coins' ? 'Coins' : 'Tokens'}</label>
              <input type="number" value={activeTab === 'coins' ? maxCoins : maxTokens} onChange={(e) => activeTab === 'coins' ? setMaxCoins(e.target.value) : setMaxTokens(e.target.value)} placeholder="Optional" className="input w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="card overflow-hidden">
        {loadingData ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: 'var(--muted)' }} />
            <p className="label">Memuat data...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && leaderboardData && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-x-auto"
              >
                <table className="w-full">
                  <thead style={{ background: 'var(--muted-bg)', borderBottom: '2px solid var(--border)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left label uppercase">Rank</th>
                      <th className="px-4 py-3 text-left label uppercase">User</th>
                      <th className="px-4 py-3 text-left label uppercase">XP</th>
                      <th className="px-4 py-3 text-left label uppercase">Events</th>
                      <th className="px-4 py-3 text-left label uppercase hidden sm:table-cell">Collection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.entries?.map((entry, index) => (
                      <motion.tr
                        key={entry.user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-[var(--panel-border)]/50 hover:bg-[var(--panel-bg)]/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getRankIcon(entry.rank)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {entry.user.avatarUrl && (
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-[var(--panel-border)]" loading="lazy" decoding="async" />
                            )}
                            <div>
                              <div className="font-semibold text-[var(--foreground)]">{entry.user.username}</div>
                              <div className="text-xs text-[var(--foreground)]/50">{entry.user.fullName}</div>
                              <div className="mt-1">{getVipBadge(entry.user.vip)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-[var(--accent-primary)]">{formatNumber(entry.total_xp)}</td>
                        <td className="px-4 py-3 text-[var(--foreground)]">{formatNumber(entry.events_count)}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="text-sm text-[var(--foreground)]/70">
                            <div className="font-semibold">{formatNumber(entry.collection?.totalPoints || 0)} pts</div>
                            <div className="text-xs">
                              {entry.collection?.borders?.count || 0} borders, {entry.collection?.badges?.count || 0} badges
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && leaderboardData && (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-x-auto"
              >
                <table className="w-full">
                  <thead className="bg-[var(--panel-bg)]/50 border-b border-[var(--panel-border)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">XP</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Collection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.entries?.map((entry, index) => (
                      <motion.tr
                        key={entry.user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-[var(--panel-border)]/50 hover:bg-[var(--panel-bg)]/30 transition-colors"
                      >
                        <td className="px-4 py-3">{getRankIcon(entry.rank)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {entry.user.avatarUrl && (
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-[var(--panel-border)]" loading="lazy" decoding="async" />
                            )}
                            <div>
                              <div className="font-semibold text-[var(--foreground)]">{entry.user.username}</div>
                              <div className="text-xs text-[var(--foreground)]/50">{entry.user.fullName}</div>
                              {getVipBadge(entry.user.vip)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-[var(--accent-primary)]">{formatNumber(entry.total_xp)}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1 text-xs sm:text-sm text-[var(--foreground)]/70">
                            <div className="flex items-center gap-2">
                              <Image className="w-3 h-3" />
                              <span>{entry.collection?.borders?.count || 0} borders</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BadgeCheck className="w-3 h-3" />
                              <span>{entry.collection?.badges?.count || 0} badges</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="w-3 h-3" />
                              <span>{entry.collection?.stickers?.count || 0} stickers</span>
                            </div>
                            <div className="font-semibold text-[var(--foreground)] pt-1 border-t border-[var(--panel-border)]/50">
                              Total: {formatNumber(entry.collection?.totalPoints || 0)} pts
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {/* Coins Tab */}
            {activeTab === 'coins' && coinLeaderboard && (
              <motion.div
                key="coins"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-x-auto"
              >
                <table className="w-full">
                  <thead className="bg-[var(--panel-bg)]/50 border-b border-[var(--panel-border)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Coins</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60 hidden sm:table-cell">Collection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coinLeaderboard.entries?.map((entry, index) => (
                      <motion.tr
                        key={entry.user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-[var(--panel-border)]/50 hover:bg-[var(--panel-bg)]/30 transition-colors"
                      >
                        <td className="px-4 py-3">{getRankIcon(entry.rank)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {entry.user.avatarUrl && (
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-[var(--panel-border)]" loading="lazy" decoding="async" />
                            )}
                            <div>
                              <div className="font-semibold text-[var(--foreground)]">{entry.user.username}</div>
                              <div className="text-xs text-[var(--foreground)]/50">{entry.user.fullName}</div>
                              {getVipBadge(entry.user.vip)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-lg text-[var(--accent-primary)]">{formatNumber(entry.coins)}</td>
                        <td className="px-4 py-3 hidden sm:table-cell text-sm text-[var(--foreground)]/70">
                          <div>{entry.collectionSummary?.bordersCount || 0} borders</div>
                          <div>{entry.collectionSummary?.badgesCount || 0} badges</div>
                          <div>{entry.collectionSummary?.stickersCount || 0} stickers</div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {/* Sharp Tokens Tab */}
            {activeTab === 'tokens' && sharpTokenLeaderboard && (
              <motion.div
                key="tokens"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-x-auto"
              >
                <table className="w-full">
                  <thead className="bg-[var(--panel-bg)]/50 border-b border-[var(--panel-border)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Tokens</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60 hidden sm:table-cell">Collection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharpTokenLeaderboard.entries?.map((entry, index) => (
                      <motion.tr
                        key={entry.user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-[var(--panel-border)]/50 hover:bg-[var(--panel-bg)]/30 transition-colors"
                      >
                        <td className="px-4 py-3">{getRankIcon(entry.rank)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {entry.user.avatarUrl && (
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-[var(--panel-border)]" loading="lazy" decoding="async" />
                            )}
                            <div>
                              <div className="font-semibold text-[var(--foreground)]">{entry.user.username}</div>
                              <div className="text-xs text-[var(--foreground)]/50">{entry.user.fullName}</div>
                              {getVipBadge(entry.user.vip)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-lg text-[var(--accent-secondary)]">{formatNumber(entry.tokens)}</td>
                        <td className="px-4 py-3 hidden sm:table-cell text-sm text-[var(--foreground)]/70">
                          <div>{entry.collectionSummary?.bordersCount || 0} borders</div>
                          <div>{entry.collectionSummary?.badgesCount || 0} badges</div>
                          <div>{entry.collectionSummary?.stickersCount || 0} stickers</div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {(leaderboardData || coinLeaderboard || sharpTokenLeaderboard) && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="btn btn--secondary btn--sm"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="mono text-sm font-bold">
            {page} / {(activeTab === 'coins' ? coinLeaderboard?.totalPages : activeTab === 'tokens' ? sharpTokenLeaderboard?.totalPages : leaderboardData?.totalPages) || 1}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= ((activeTab === 'coins' ? coinLeaderboard?.totalPages : activeTab === 'tokens' ? sharpTokenLeaderboard?.totalPages : leaderboardData?.totalPages) || 1)}
            className="btn btn--secondary btn--sm"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
