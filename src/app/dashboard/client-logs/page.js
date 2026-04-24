'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
  Terminal, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Eye, 
  EyeOff, 
  Download, 
  Trash2, 
  RefreshCcw, 
  Search, 
  Filter,
  FileText,
  User,
  Calendar,
  Tag,
  Activity,
  Bug,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  CheckSquare,
  Square
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { getSession } from '@/lib/auth';
import {
  getClientLogs,
  getClientLogsStats,
  getClientLogsMetadata,
  updateClientLogStatus,
  bulkUpdateClientLogStatus,
  deleteClientLog,
  bulkDeleteClientLogs,
  exportClientLogs,
  cleanupOldClientLogs
} from '@/lib/api';

const LEVEL_COLORS = {
  error: 'bg-red-100 text-red-700 border-red-300',
  warn: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  info: 'bg-blue-100 text-blue-700 border-blue-300',
  debug: 'bg-gray-100 text-gray-700 border-gray-300',
};

const STATUS_COLORS = {
  NEW: 'bg-purple-100 text-purple-700 border-purple-300',
  REVIEWED: 'bg-blue-100 text-blue-700 border-blue-300',
  RESOLVED: 'bg-green-100 text-green-700 border-green-300',
  IGNORED: 'bg-gray-100 text-gray-700 border-gray-300',
};

const LEVEL_ICONS = {
  error: Bug,
  warn: AlertTriangle,
  info: Info,
  debug: Terminal,
};

const STATUS_ICONS = {
  NEW: Clock,
  REVIEWED: Eye,
  RESOLVED: CheckCircle,
  IGNORED: EyeOff,
};

export default function ClientLogsPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [expandedLog, setExpandedLog] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    level: '',
    source: '',
    userId: '',
    q: '',
    skip: 0,
    take: 50,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    skip: 0,
    take: 50,
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingStats(true);
        setLoadingMetadata(true);
        const token = getSession()?.token;
        
        const [statsData, metadataData] = await Promise.all([
          getClientLogsStats({ token }),
          getClientLogsMetadata({ token }),
        ]);
        
        setStats(statsData);
        setMetadata(metadataData);
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat data awal');
      } finally {
        setLoadingStats(false);
        setLoadingMetadata(false);
      }
    };
    loadData();
  }, []);

  // Load logs when filters change
  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoadingLogs(true);
        const token = getSession()?.token;
        const data = await getClientLogs({ token, ...filters });
        
        setLogs(data.items || []);
        setPagination({
          total: data.total || 0,
          skip: data.skip || 0,
          take: data.take || 50,
        });
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat client logs');
        setLogs([]);
      } finally {
        setLoadingLogs(false);
      }
    };
    loadLogs();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, skip: 0 }));
  };

  const handlePageChange = (newSkip) => {
    setFilters(prev => ({ ...prev, skip: newSkip }));
  };

  const handleSelectLog = (id) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLogs(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedLogs.size === logs.length) {
      setSelectedLogs(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedLogs(new Set(logs.map(log => log.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    try {
      const token = getSession()?.token;
      const ids = Array.from(selectedLogs);
      
      await bulkUpdateClientLogStatus({ 
        token, 
        ids, 
        status, 
        admin_notes: `Bulk update to ${status}` 
      });
      
      toast.success(`${ids.length} logs berhasil diupdate`);
      setSelectedLogs(new Set());
      setShowBulkActions(false);
      
      // Reload logs
      const data = await getClientLogs({ token, ...filters });
      setLogs(data.items || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal bulk update status');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Hapus ${selectedLogs.size} logs?`)) return;
    
    try {
      const token = getSession()?.token;
      const ids = Array.from(selectedLogs);
      
      await bulkDeleteClientLogs({ token, ids });
      
      toast.success(`${ids.length} logs berhasil dihapus`);
      setSelectedLogs(new Set());
      setShowBulkActions(false);
      
      // Reload logs
      const data = await getClientLogs({ token, ...filters });
      setLogs(data.items || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal bulk hapus logs');
    }
  };

  const handleExport = async () => {
    try {
      const token = getSession()?.token;
      const data = await exportClientLogs({ token, ...filters });
      
      // Create download link
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `client-logs-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Export berhasil diunduh');
    } catch (err) {
      toast.error(err?.message || 'Gagal export logs');
    }
  };

  const handleCleanup = async () => {
    try {
      const token = getSession()?.token;
      const result = await cleanupOldClientLogs({ token, days: cleanupDays });
      
      toast.success(`${result.deleted} logs lama berhasil dihapus`);
      setShowCleanupModal(false);
      
      // Reload data
      const [statsData, logsData] = await Promise.all([
        getClientLogsStats({ token }),
        getClientLogs({ token, ...filters }),
      ]);
      
      setStats(statsData);
      setLogs(logsData.items || []);
    } catch (err) {
      toast.error(err?.message || 'Gagal cleanup logs');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="grid gap-2">
          <div className="inline-flex w-fit items-center gap-2 px-3 py-2 border-4 rounded-full font-extrabold text-sm" style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <Terminal className="size-4" /> Client Logs
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">Kelola error logs dari aplikasi client.</h2>
            <p className="text-sm sm:text-base opacity-80 mt-2 max-w-3xl">Monitor dan filter error reports dari user dengan permission-based access.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
          <button 
            type="button" 
            onClick={() => setShowFilters(!showFilters)} 
            className="px-3 py-2 border-4 rounded-lg font-extrabold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
          >
            <Filter className="size-4 inline-block mr-1" /> Filter
          </button>
          <button 
            type="button" 
            onClick={handleExport} 
            className="px-3 py-2 border-4 rounded-lg font-extrabold"
            style={{ boxShadow: '4px 4px 0 #000', background: 'var(--accent-edit)', borderColor: 'var(--panel-border)', color: 'var(--accent-edit-foreground)' }}
          >
            <Download className="size-4 inline-block mr-1" /> Export
          </button>
          {user.role === 'superadmin' && (
            <button 
              type="button" 
              onClick={() => setShowCleanupModal(true)} 
              className="px-3 py-2 border-4 rounded-lg font-extrabold"
              style={{ boxShadow: '4px 4px 0 #000', background: '#EF4444', borderColor: 'var(--panel-border)', color: 'white' }}
            >
              <Trash2 className="size-4 inline-block mr-1" /> Cleanup
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-3 md:grid-cols-5">
          <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
            <div className="text-xs font-black uppercase tracking-wide opacity-80">Total Logs</div>
            <div className="mt-2 text-3xl font-black">{stats.total || 0}</div>
            <div className="text-sm font-semibold opacity-80 mt-1">Semua logs tercatat</div>
          </div>
          
          {stats.byStatus?.map((status) => {
            const Icon = STATUS_ICONS[status.status];
            return (
              <div key={status.status} className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
                <div className="flex items-center gap-2">
                  <Icon className="size-4" />
                  <div className="text-xs font-black uppercase tracking-wide opacity-80">{status.status}</div>
                </div>
                <div className="mt-2 text-3xl font-black">{status.count}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="text-xs font-bold">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold"
                style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                <option value="">Semua</option>
                <option value="NEW">NEW</option>
                <option value="REVIEWED">REVIEWED</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="IGNORED">IGNORED</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold">Level</label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold"
                style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                <option value="">Semua</option>
                {metadata?.levels?.map((level) => (
                  <option key={level.level} value={level.level}>{level.level}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold">Source</label>
              <select
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold"
                style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                <option value="">Semua</option>
                {metadata?.sources?.map((source) => (
                  <option key={source.source} value={source.source}>{source.source}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold">User ID</label>
              <input
                type="number"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="ID user"
                className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold"
                style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-xs font-bold">Search</label>
              <input
                type="text"
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                placeholder="Cari di title, message, stack..."
                className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold"
                style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="border-4 rounded-2xl p-4" style={{ boxShadow: '6px 6px 0 #000', background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', borderColor: 'var(--panel-border)', color: '#111827' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-black">{selectedLogs.size} logs dipilih</span>
              <button
                onClick={() => handleBulkStatusUpdate('REVIEWED')}
                className="px-3 py-2 border-4 rounded-xl font-extrabold text-sm"
                style={{ boxShadow: '3px 3px 0 #000', background: '#3B82F6', borderColor: 'var(--panel-border)', color: 'white' }}
              >
                <Eye className="size-3 inline-block mr-1" /> Mark Reviewed
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('RESOLVED')}
                className="px-3 py-2 border-4 rounded-xl font-extrabold text-sm"
                style={{ boxShadow: '3px 3px 0 #000', background: '#10B981', borderColor: 'var(--panel-border)', color: 'white' }}
              >
                <CheckCircle className="size-3 inline-block mr-1" /> Mark Resolved
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('IGNORED')}
                className="px-3 py-2 border-4 rounded-xl font-extrabold text-sm"
                style={{ boxShadow: '3px 3px 0 #000', background: '#6B7280', borderColor: 'var(--panel-border)', color: 'white' }}
              >
                <EyeOff className="size-3 inline-block mr-1" /> Ignore
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-2 border-4 rounded-xl font-extrabold text-sm"
                style={{ boxShadow: '3px 3px 0 #000', background: '#EF4444', borderColor: 'var(--panel-border)', color: 'white' }}
              >
                <Trash2 className="size-3 inline-block mr-1" /> Delete
              </button>
            </div>
            <button
              onClick={() => {
                setSelectedLogs(new Set());
                setShowBulkActions(false);
              }}
              className="px-3 py-2 border-4 rounded-xl font-extrabold text-sm"
              style={{ boxShadow: '3px 3px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              <X className="size-3 inline-block mr-1" /> Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="border-4 rounded-2xl overflow-hidden" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: 'var(--background)' }}>
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={handleSelectAll}
                    className="p-1 border-4 rounded font-extrabold"
                    style={{ boxShadow: '2px 2px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                  >
                    {selectedLogs.size === logs.length ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">ID</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Level</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Source</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingLogs ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCcw className="size-4 animate-spin" />
                      <span>Loading logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center opacity-70">
                    Tidak ada logs ditemukan
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const LevelIcon = LEVEL_ICONS[log.level];
                  const StatusIcon = STATUS_ICONS[log.status];
                  const isExpanded = expandedLog === log.id;
                  const isSelected = selectedLogs.has(log.id);
                  
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="border-t" style={{ borderColor: 'var(--panel-border)' }}>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleSelectLog(log.id)}
                            className="p-1 border-4 rounded font-extrabold"
                            style={{ 
                              boxShadow: '2px 2px 0 #000', 
                              background: isSelected ? 'var(--accent-add)' : 'var(--panel-bg)', 
                              borderColor: 'var(--panel-border)', 
                              color: isSelected ? 'var(--accent-add-foreground)' : 'var(--foreground)' 
                            }}
                          >
                            {isSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">#{log.id}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 border-2 rounded-full text-xs font-extrabold ${STATUS_COLORS[log.status]}`}>
                            <StatusIcon className="size-3" />
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 border-2 rounded-full text-xs font-extrabold ${LEVEL_COLORS[log.level]}`}>
                            <LevelIcon className="size-3" />
                            {log.level}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-xs">
                            <div className="font-semibold text-sm">{truncateText(log.title, 50)}</div>
                            <div className="text-xs opacity-70 mt-1">{truncateText(log.message, 80)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div className="font-semibold">{log.user?.username || 'Anonymous'}</div>
                            {log.user?.profile?.full_name && (
                              <div className="text-xs opacity-70">{log.user.profile.full_name}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 border-2 rounded text-xs font-extrabold" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
                            {log.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{log.platform || '-'}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(log.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                              className="p-1 border-4 rounded font-extrabold"
                              style={{ boxShadow: '2px 2px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                            >
                              {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="10" className="px-4 py-4" style={{ background: 'var(--background)' }}>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <h4 className="font-extrabold text-sm mb-2">Error Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div><strong>Title:</strong> {log.title}</div>
                                  <div><strong>Message:</strong> <pre className="whitespace-pre-wrap text-xs bg-black/10 p-2 rounded">{log.message}</pre></div>
                                  {log.stack && (
                                    <div>
                                      <strong>Stack Trace:</strong>
                                      <pre className="whitespace-pre-wrap text-xs bg-black/10 p-2 rounded mt-1">{log.stack}</pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm mb-2">Device Info</h4>
                                <div className="space-y-2 text-sm">
                                  <div><strong>App Version:</strong> {log.app_version || '-'}</div>
                                  <div><strong>Platform:</strong> {log.platform || '-'}</div>
                                  <div><strong>Device Model:</strong> {log.device_model || '-'}</div>
                                  <div><strong>OS Version:</strong> {log.os_version || '-'}</div>
                                  <div><strong>Locale:</strong> {log.locale || '-'}</div>
                                  <div><strong>IP:</strong> {log.ip || '-'}</div>
                                  {log.admin_notes && (
                                    <div>
                                      <strong>Admin Notes:</strong>
                                      <div className="text-xs bg-yellow-100 p-2 rounded mt-1">{log.admin_notes}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.total > pagination.take && (
        <div className="flex items-center justify-between">
          <div className="text-sm opacity-70">
            Menampilkan {logs.length} dari {pagination.total} logs
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(0, pagination.skip - pagination.take))}
              disabled={pagination.skip === 0}
              className="px-3 py-2 border-4 rounded-xl font-extrabold disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm font-semibold">
              {Math.floor(pagination.skip / pagination.take) + 1} / {Math.ceil(pagination.total / pagination.take)}
            </span>
            <button
              onClick={() => handlePageChange(pagination.skip + pagination.take)}
              disabled={pagination.skip + pagination.take >= pagination.total}
              className="px-3 py-2 border-4 rounded-xl font-extrabold disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Cleanup Modal */}
      {showCleanupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="border-4 rounded-2xl p-6 max-w-md w-full" style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
            <h3 className="text-lg font-black mb-4">Cleanup Old Logs</h3>
            <p className="text-sm opacity-80 mb-4">Hapus semua logs yang lebih tua dari jumlah hari tertentu.</p>
            <div className="mb-4">
              <label className="text-xs font-bold">Hari (default: 30)</label>
              <input
                type="number"
                min="1"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(parseInt(e.target.value) || 30)}
                className="w-full mt-1 px-3 py-2 border-4 rounded-xl font-semibold"
                style={{ boxShadow: '3px 3px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCleanupModal(false)}
                className="flex-1 px-4 py-3 border-4 rounded-xl font-extrabold"
                style={{ boxShadow: '4px 4px 0 #000', background: 'var(--background)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
              >
                Batal
              </button>
              <button
                onClick={handleCleanup}
                className="flex-1 px-4 py-3 border-4 rounded-xl font-extrabold"
                style={{ boxShadow: '4px 4px 0 #000', background: '#EF4444', borderColor: 'var(--panel-border)', color: 'white' }}
              >
                Hapus Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
