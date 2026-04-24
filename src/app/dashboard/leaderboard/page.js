'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
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
  Eye,
  User,
  Image,
  Badge,
  Target,
  RefreshCcw
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
    if (rank === 1) return <Trophy className="size-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="size-5 text-gray-400" />;
    if (rank === 3) return <Award className="size-5 text-amber-600" />;
    return <span className="font-bold text-lg">#{rank}</span>;
  };

  const getVipBadge = (vip) => {
    if (!vip || vip.status !== 'ACTIVE') return null;
    
    const colors = {
      BRONZE: 'bg-amber-100 text-amber-700 border-amber-300',
      SILVER: 'bg-gray-100 text-gray-700 border-gray-300',
      GOLD: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      PLATINUM: 'bg-purple-100 text-purple-700 border-purple-300',
      DIAMOND: 'bg-blue-100 text-blue-700 border-blue-300',
      MASTER: 'bg-red-100 text-red-700 border-red-300'
    };
    
    return (
      <span className={`px-2 py-1 border-2 rounded-full text-xs font-extrabold ${colors[vip.level] || 'bg-gray-100 text-gray-700'}`}>
        {vip.level}
      </span>
    );
  };

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="grid gap-2">
          <div className="inline-flex w-fit items-center gap-2 px-3 py-2 border-4 rounded-full font-extrabold text-sm" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <Trophy className="size-4" /> Leaderboard
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">Kelola leaderboard dan koleksi user.</h2>
            <p className="text-sm sm:text-base opacity-80 mt-2 max-w-3xl">Monitor XP, coins, sharp tokens, dan koleksi user dengan interface yang komprehensif.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
          <button 
            type="button" 
            onClick={() => window.location.reload()} 
            className="px-3 py-2 border-4 rounded-lg font-extrabold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <RefreshCcw className="size-4 inline-block mr-1" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-3 md:grid-cols-4">
          <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
            <div className="flex items-center gap-2">
              <Users className="size-5" />
              <div className="text-xs font-black uppercase tracking-wide opacity-80">Total Users</div>
            </div>
            <div className="mt-2 text-3xl font-black">{formatNumber(stats.overview?.totalUsers || 0)}</div>
            <div className="text-sm font-semibold opacity-80 mt-1">Total registered users</div>
          </div>
          
          <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #BFDBFE 0%, #93C5FD 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
            <div className="flex items-center gap-2">
              <Coins className="size-5" />
              <div className="text-xs font-black uppercase tracking-wide opacity-80">Coins Circulation</div>
            </div>
            <div className="mt-2 text-3xl font-black">{formatNumber(stats.coins?.totalCoinsInCirculation || 0)}</div>
            <div className="text-sm font-semibold opacity-80 mt-1">Top: {stats.coins?.topHolder?.username || '-'}</div>
          </div>
          
          <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #C7F9CC 0%, #86EFAC 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
            <div className="flex items-center gap-2">
              <Star className="size-5" />
              <div className="text-xs font-black uppercase tracking-wide opacity-80">Sharp Tokens</div>
            </div>
            <div className="mt-2 text-3xl font-black">{formatNumber(stats.sharpTokens?.totalTokensInCirculation || 0)}</div>
            <div className="text-sm font-semibold opacity-80 mt-1">Top: {stats.sharpTokens?.topHolder?.username || '-'}</div>
          </div>
          
          <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #FBCFE8 0%, #F9A8D4 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              <div className="text-xs font-black uppercase tracking-wide opacity-80">Daily Active</div>
            </div>
            <div className="mt-2 text-3xl font-black">{formatNumber(stats.leaderboard?.daily?.participants || 0)}</div>
            <div className="text-sm font-semibold opacity-80 mt-1">Top: {stats.leaderboard?.daily?.topUser?.username || '-'}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-4 rounded-2xl p-2" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <div className="flex gap-2">
          {[
            { key: 'overview', label: 'Overview', icon: Trophy },
            { key: 'leaderboard', label: 'Leaderboard', icon: Medal },
            { key: 'coins', label: 'Coins', icon: Coins },
            { key: 'tokens', label: 'Sharp Tokens', icon: Star }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 border-4 rounded-xl font-extrabold transition-all ${
                  activeTab === tab.key
                    ? 'shadow-lg transform scale-105'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  boxShadow: activeTab === tab.key ? '4px 4px 0 #000' : '2px 2px 0 #000',
                  background: activeTab === tab.key ? 'var(--accent-edit)' : 'var(--background)',
                  borderColor: 'var(--panel-border)',
                  color: activeTab === tab.key ? 'var(--accent-edit-foreground)' : 'var(--foreground)'
                }}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      {activeTab === 'leaderboard' && (
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-bold">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold"
                style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            {period === 'monthly' && (
              <div>
                <label className="text-xs font-bold">Month</label>
                <select
                  value={selectedMonth?.label || ''}
                  onChange={(e) => {
                    const month = availableMonths.find(m => m.label === e.target.value);
                    setSelectedMonth(month);
                  }}
                  className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold"
                  style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                >
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
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-xs font-bold">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Username, email..."
                className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold"
                style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              />
            </div>
            
            <div>
              <label className="text-xs font-bold">Min {activeTab === 'coins' ? 'Coins' : 'Tokens'}</label>
              <input
                type="number"
                value={activeTab === 'coins' ? minCoins : minTokens}
                onChange={(e) => activeTab === 'coins' ? setMinCoins(parseInt(e.target.value) || 0) : setMinTokens(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold"
                style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              />
            </div>
            
            <div>
              <label className="text-xs font-bold">Max {activeTab === 'coins' ? 'Coins' : 'Tokens'}</label>
              <input
                type="number"
                value={activeTab === 'coins' ? maxCoins : maxTokens}
                onChange={(e) => activeTab === 'coins' ? setMaxCoins(e.target.value) : setMaxTokens(e.target.value)}
                placeholder="Optional"
                className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold"
                style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="border-4 rounded-2xl overflow-hidden" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        {loadingData ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <RefreshCcw className="size-4 animate-spin" />
              <span>Loading data...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && leaderboardData && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ background: 'var(--background)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">User</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">XP</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Events</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Collection Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.entries?.map((entry) => (
                      <tr key={entry.user.id} className="border-t" style={{ borderColor: 'var(--panel-border)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getRankIcon(entry.rank)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {entry.user.avatarUrl && (
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--panel-border)' }} />
                            )}
                            <div>
                              <div className="font-semibold">{entry.user.username}</div>
                              <div className="text-xs opacity-70">{entry.user.fullName}</div>
                              {getVipBadge(entry.user.vip)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold">{formatNumber(entry.total_xp)}</td>
                        <td className="px-4 py-3">{formatNumber(entry.events_count)}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div className="font-semibold">{formatNumber(entry.collection?.totalPoints || 0)} pts</div>
                            <div className="text-xs opacity-70">
                              {entry.collection?.borders?.count || 0} borders, {entry.collection?.badges?.count || 0} badges, {entry.collection?.stickers?.count || 0} stickers
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Leaderboard Tab with Collections */}
            {activeTab === 'leaderboard' && leaderboardData && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ background: 'var(--background)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">User</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">XP</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Events</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Collection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.entries?.map((entry) => (
                      <tr key={entry.user.id} className="border-t" style={{ borderColor: 'var(--panel-border)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getRankIcon(entry.rank)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {entry.user.avatarUrl && (
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--panel-border)' }} />
                            )}
                            <div>
                              <div className="font-semibold">{entry.user.username}</div>
                              <div className="text-xs opacity-70">{entry.user.fullName}</div>
                              {getVipBadge(entry.user.vip)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold">{formatNumber(entry.total_xp)}</td>
                        <td className="px-4 py-3">{formatNumber(entry.events_count)}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Image className="size-3" />
                              <span>Borders: {entry.collection?.borders?.count || 0} ({formatNumber(entry.collection?.borders?.points || 0)} pts)</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Badge className="size-3" />
                              <span>Badges: {entry.collection?.badges?.count || 0} ({formatNumber(entry.collection?.badges?.points || 0)} pts)</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Target className="size-3" />
                              <span>Stickers: {entry.collection?.stickers?.count || 0} ({formatNumber(entry.collection?.stickers?.points || 0)} pts)</span>
                            </div>
                            <div className="text-xs font-bold border-t pt-1" style={{ borderColor: 'var(--panel-border)' }}>
                              Total: {formatNumber(entry.collection?.totalPoints || 0)} pts
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Coins Tab */}
            {activeTab === 'coins' && coinLeaderboard && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ background: 'var(--background)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">User</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Coins</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Collection Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coinLeaderboard.entries?.map((entry) => (
                      <tr key={entry.user.id} className="border-t" style={{ borderColor: 'var(--panel-border)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getRankIcon(entry.rank)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {entry.user.avatarUrl && (
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--panel-border)' }} />
                            )}
                            <div>
                              <div className="font-semibold">{entry.user.username}</div>
                              <div className="text-xs opacity-70">{entry.user.fullName}</div>
                              {getVipBadge(entry.user.vip)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-lg">{formatNumber(entry.coins)}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div>{entry.collectionSummary?.bordersCount || 0} borders</div>
                            <div>{entry.collectionSummary?.badgesCount || 0} badges</div>
                            <div>{entry.collectionSummary?.stickersCount || 0} stickers</div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sharp Tokens Tab */}
            {activeTab === 'tokens' && sharpTokenLeaderboard && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ background: 'var(--background)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">User</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Tokens</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Collection Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharpTokenLeaderboard.entries?.map((entry) => (
                      <tr key={entry.user.id} className="border-t" style={{ borderColor: 'var(--panel-border)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getRankIcon(entry.rank)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {entry.user.avatarUrl && (
                              <img src={entry.user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--panel-border)' }} />
                            )}
                            <div>
                              <div className="font-semibold">{entry.user.username}</div>
                              <div className="text-xs opacity-70">{entry.user.fullName}</div>
                              {getVipBadge(entry.user.vip)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-lg">{formatNumber(entry.tokens)}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div>{entry.collectionSummary?.bordersCount || 0} borders</div>
                            <div>{entry.collectionSummary?.badgesCount || 0} badges</div>
                            <div>{entry.collectionSummary?.stickersCount || 0} stickers</div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {leaderboardData && (
        <div className="flex items-center justify-between">
          <div className="text-sm opacity-70">
            Menampilkan {leaderboardData.entries?.length || 0} dari {formatNumber(leaderboardData.total || 0)} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-2 border-4 rounded-xl font-extrabold disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm font-semibold">
              {page} / {leaderboardData.totalPages || 1}
            </span>
            <button
              onClick={() => setPage((leaderboardData.totalPages || 1) > page ? page + 1 : page)}
              disabled={page >= (leaderboardData.totalPages || 1)}
              className="px-3 py-2 border-4 rounded-xl font-extrabold disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
