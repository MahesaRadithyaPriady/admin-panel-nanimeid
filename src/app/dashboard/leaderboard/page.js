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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
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
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30"
      >
        <Trophy className="w-5 h-5 text-white" />
      </motion.div>
    );
    if (rank === 2) return (
      <motion.div
        whileHover={{ scale: 1.1 }}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg"
      >
        <Medal className="w-5 h-5 text-white" />
      </motion.div>
    );
    if (rank === 3) return (
      <motion.div
        whileHover={{ scale: 1.1 }}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shadow-lg"
      >
        <Award className="w-5 h-5 text-white" />
      </motion.div>
    );
    return (
      <div className="w-10 h-10 rounded-full bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-center">
        <span className="font-bold text-[var(--foreground)]">#{rank}</span>
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
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r ${colors[vip.level] || 'from-gray-400 to-gray-500'} text-white shadow-sm`}>
        {vip.level}
      </span>
    );
  };

  if (loading || !user) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 min-w-0 overflow-x-hidden"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium text-[var(--foreground)]/60 uppercase tracking-wide">Leaderboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
            Kelola Leaderboard
          </h1>
          <p className="text-sm text-[var(--foreground)]/60 mt-1 max-w-2xl">
            Monitor XP, coins, sharp tokens, dan koleksi user dengan interface yang komprehensif.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--foreground)] hover:bg-[var(--accent-primary)]/10 transition-all duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Users */}
          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium text-[var(--foreground)]/60">Total Users</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                {formatNumber(stats.overview?.totalUsers || 0)}
              </div>
              <div className="text-xs text-[var(--foreground)]/50 mt-1">Registered users</div>
            </div>
          </div>

          {/* Coins */}
          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Coins className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium text-[var(--foreground)]/60">Coins</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                {formatNumber(stats.coins?.totalCoinsInCirculation || 0)}
              </div>
              <div className="text-xs text-[var(--foreground)]/50 mt-1 truncate">
                Top: {stats.coins?.topHolder?.username || '-'}
              </div>
            </div>
          </div>

          {/* Sharp Tokens */}
          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium text-[var(--foreground)]/60">Sharp Tokens</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                {formatNumber(stats.sharpTokens?.totalTokensInCirculation || 0)}
              </div>
              <div className="text-xs text-[var(--foreground)]/50 mt-1 truncate">
                Top: {stats.sharpTokens?.topHolder?.username || '-'}
              </div>
            </div>
          </div>

          {/* Daily Active */}
          <div className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium text-[var(--foreground)]/60">Daily Active</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                {formatNumber(stats.leaderboard?.daily?.participants || 0)}
              </div>
              <div className="text-xs text-[var(--foreground)]/50 mt-1 truncate">
                Top: {stats.leaderboard?.daily?.topUser?.username || '-'}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-2">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'leaderboard', label: 'Leaderboard', icon: Medal },
            { key: 'coins', label: 'Coins', icon: Coins },
            { key: 'tokens', label: 'Sharp Tokens', icon: Star }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg shadow-[var(--accent-primary)]/25'
                    : 'text-[var(--foreground)]/70 hover:bg-[var(--panel-bg)]/50 hover:text-[var(--foreground)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Filters */}
      <AnimatePresence mode="wait">
        {activeTab === 'leaderboard' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-[var(--foreground)]/60 mb-1.5 block">Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="modern-input w-full rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--foreground)] outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              {period === 'monthly' && (
                <div>
                  <label className="text-xs font-medium text-[var(--foreground)]/60 mb-1.5 block">Month</label>
                  <select
                    value={selectedMonth?.label || ''}
                    onChange={(e) => {
                      const month = availableMonths.find(m => m.label === e.target.value);
                      setSelectedMonth(month);
                    }}
                    className="modern-input w-full rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--foreground)] outline-none"
                  >
                    {availableMonths.map((month) => (
                      <option key={month.label} value={month.label}>{month.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {(activeTab === 'coins' || activeTab === 'tokens') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-[var(--foreground)]/60 mb-1.5 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground)]/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Username, email..."
                    className="modern-input w-full rounded-xl pl-10 pr-3 py-2.5 text-sm font-medium text-[var(--foreground)] outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium text-[var(--foreground)]/60 mb-1.5 block">Min {activeTab === 'coins' ? 'Coins' : 'Tokens'}</label>
                <input
                  type="number"
                  value={activeTab === 'coins' ? minCoins : minTokens}
                  onChange={(e) => activeTab === 'coins' ? setMinCoins(parseInt(e.target.value) || 0) : setMinTokens(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="modern-input w-full rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--foreground)] outline-none"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-[var(--foreground)]/60 mb-1.5 block">Max {activeTab === 'coins' ? 'Coins' : 'Tokens'}</label>
                <input
                  type="number"
                  value={activeTab === 'coins' ? maxCoins : maxTokens}
                  onChange={(e) => activeTab === 'coins' ? setMaxCoins(e.target.value) : setMaxTokens(e.target.value)}
                  placeholder="Optional"
                  className="modern-input w-full rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--foreground)] outline-none"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl overflow-hidden">
        {loadingData ? (
          <div className="p-12 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 rounded-full border-3 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] mx-auto mb-4"
            />
            <p className="text-[var(--foreground)]/60">Memuat data...</p>
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
                  <thead className="bg-[var(--panel-bg)]/50 border-b border-[var(--panel-border)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">XP</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Events</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60 hidden sm:table-cell">Collection</th>
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
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-[var(--panel-border)]" />
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
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-[var(--panel-border)]" />
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
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-[var(--panel-border)]" />
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
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-[var(--panel-border)]" />
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
      </motion.div>

      {/* Pagination */}
      {(leaderboardData || coinLeaderboard || sharpTokenLeaderboard) && (
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-[var(--foreground)]/60">
            Menampilkan {(activeTab === 'coins' ? coinLeaderboard?.entries?.length : activeTab === 'tokens' ? sharpTokenLeaderboard?.entries?.length : leaderboardData?.entries?.length) || 0} dari {formatNumber((activeTab === 'coins' ? coinLeaderboard?.total : activeTab === 'tokens' ? sharpTokenLeaderboard?.total : leaderboardData?.total) || 0)} entries
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: page <= 1 ? 1 : 1.05 }}
              whileTap={{ scale: page <= 1 ? 1 : 0.95 }}
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--foreground)] hover:bg-[var(--accent-primary)]/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </motion.button>
            <span className="px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] bg-[var(--panel-bg)]/50 rounded-xl border border-[var(--panel-border)]">
              {page} / {(activeTab === 'coins' ? coinLeaderboard?.totalPages : activeTab === 'tokens' ? sharpTokenLeaderboard?.totalPages : leaderboardData?.totalPages) || 1}
            </span>
            <motion.button
              whileHover={{ scale: page >= ((activeTab === 'coins' ? coinLeaderboard?.totalPages : activeTab === 'tokens' ? sharpTokenLeaderboard?.totalPages : leaderboardData?.totalPages) || 1) ? 1 : 1.05 }}
              whileTap={{ scale: page >= ((activeTab === 'coins' ? coinLeaderboard?.totalPages : activeTab === 'tokens' ? sharpTokenLeaderboard?.totalPages : leaderboardData?.totalPages) || 1) ? 1 : 0.95 }}
              onClick={() => setPage((activeTab === 'coins' ? coinLeaderboard?.totalPages : activeTab === 'tokens' ? sharpTokenLeaderboard?.totalPages : leaderboardData?.totalPages) || 1 > page ? page + 1 : page)}
              disabled={page >= ((activeTab === 'coins' ? coinLeaderboard?.totalPages : activeTab === 'tokens' ? sharpTokenLeaderboard?.totalPages : leaderboardData?.totalPages) || 1)}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--foreground)] hover:bg-[var(--accent-primary)]/10 transition-colors"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
