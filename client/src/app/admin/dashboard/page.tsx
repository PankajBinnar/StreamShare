'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { fetchApi } from '../../../lib/api';
import { AdminChatAuditModal } from '../../../components/AdminChatAuditModal';
import {
  ShieldAlert,
  Users,
  Tv,
  MessageSquare,
  AlertTriangle,
  UserX,
  UserCheck,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  Ban,
  CheckCircle,
  Clock,
  Shield,
  Activity,
  Filter,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAdmin, isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'dms' | 'audit'>('users');
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Listings State
  const [listings, setListings] = useState<any[]>([]);
  const [listingSearch, setListingSearch] = useState('');

  // Conversations State
  const [conversations, setConversations] = useState<any[]>([]);
  const [convSearch, setConvSearch] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Guard: Admin role required
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isAdmin) {
        router.push('/admin/login');
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, listingsRes, convsRes, auditRes] = await Promise.all([
        fetchApi<any>('/admin/dashboard'),
        fetchApi<any[]>('/admin/users'),
        fetchApi<any[]>('/admin/listings'),
        fetchApi<any[]>('/admin/conversations'),
        fetchApi<any[]>('/admin/audit-logs'),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (usersRes.success) setUsers(usersRes.data || []);
      if (listingsRes.success) setListings(listingsRes.data || []);
      if (convsRes.success) setConversations(convsRes.data || []);
      if (auditRes.success) setAuditLogs(auditRes.data || []);
    } catch (e) {
      console.error('Failed to load administrative dataset', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    }
  }, [isAdmin, loadAllData]);

  // User Actions
  const handleToggleBan = async (targetUser: any) => {
    const action = targetUser.isBanned ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${action} user "${targetUser.username}"?`)) return;

    setActionLoading(targetUser.id);
    try {
      const res = await fetchApi(`/admin/users/${targetUser.id}/ban`, {
        method: 'POST',
        body: JSON.stringify({
          ban: !targetUser.isBanned,
          reason: `Admin manual moderation: ${action}`,
        }),
      });
      if (res.success) {
        await loadAllData();
      } else {
        alert(res.error || `Failed to ${action} user.`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (targetUserId: string, username: string) => {
    if (
      !confirm(
        `⚠️ PERMANENT DELETION WARNING:\nAre you sure you want to permanently delete user "${username}"?\nThis will purge all their listings, active tokens, and chats.`
      )
    )
      return;

    setActionLoading(targetUserId);
    try {
      const res = await fetchApi(`/admin/users/${targetUserId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        await loadAllData();
      } else {
        alert(res.error || 'Failed to delete user.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Listing Actions
  const handleToggleListingStatus = async (listing: any) => {
    const newStatus = listing.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`Change listing status to ${newStatus}?`)) return;

    setActionLoading(listing.id);
    try {
      const res = await fetchApi(`/admin/listings/${listing.id}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: newStatus,
          reason: `Admin moderation action: set to ${newStatus}`,
        }),
      });
      if (res.success) {
        await loadAllData();
      } else {
        alert(res.error || 'Failed to update listing status.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteListing = async (listingId: string, platform: string) => {
    if (!confirm(`Are you sure you want to permanently remove listing "${platform}"?`)) return;

    setActionLoading(listingId);
    try {
      const res = await fetchApi(`/admin/listings/${listingId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        await loadAllData();
      } else {
        alert(res.error || 'Failed to delete listing.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Conversation Actions
  const handleDeleteConversation = async (convId: string) => {
    if (!confirm('Are you sure you want to permanently delete this entire chat conversation?')) return;

    setActionLoading(convId);
    try {
      const res = await fetchApi(`/admin/conversations/${convId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        await loadAllData();
      } else {
        alert(res.error || 'Failed to delete conversation.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Filters
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const filteredListings = listings.filter((l) => {
    const q = listingSearch.toLowerCase();
    return (
      l.platformName.toLowerCase().includes(q) ||
      (l.owner?.username || '').toLowerCase().includes(q)
    );
  });

  const filteredConversations = conversations.filter((c) => {
    const q = convSearch.toLowerCase();
    return (
      (c.listing?.platformName || '').toLowerCase().includes(q) ||
      (c.buyer?.username || '').toLowerCase().includes(q) ||
      (c.seller?.username || '').toLowerCase().includes(q)
    );
  });

  if (authLoading || (!isAuthenticated && !isAdmin)) {
    return (
      <div className="py-24 flex justify-center items-center">
        <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Admin Suite Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-950/60 border border-red-500/50 text-red-300 uppercase tracking-widest flex items-center gap-1">
              <Shield className="w-3 h-3 text-red-400" /> Root Admin Console
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Logged in as: <strong className="text-slate-300">{user?.email}</strong>
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            StreamShare Control Center
          </h1>
          <p className="text-xs text-slate-400">
            Real-time surveillance, user governance, classifieds moderation, and security auditing.
          </p>
        </div>

        <button
          onClick={loadAllData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surfaceLight hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-all self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-brand-400 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Live Data
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{stats?.totalUsers ?? '—'}</div>
            <div className="text-[11px] text-slate-400 font-mono">Total Users</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-950/50 border border-brand-500/30 text-brand-400">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{stats?.activeListings ?? '—'}</div>
            <div className="text-[11px] text-slate-400 font-mono">Active Postings</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{stats?.totalConversations ?? '—'}</div>
            <div className="text-[11px] text-slate-400 font-mono">Total Chats</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-400">{stats?.flaggedMessagesCount ?? '—'}</div>
            <div className="text-[11px] text-slate-400 font-mono">Flagged DMs</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-slate-800 flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-500/30 text-red-400">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-red-400">{stats?.bannedUsersCount ?? '—'}</div>
            <div className="text-[11px] text-slate-400 font-mono">Banned Users</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-brand-500 text-white bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-400" />
          Users Directory ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('listings')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'listings'
              ? 'border-brand-500 text-white bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tv className="w-4 h-4 text-brand-400" />
          Postings Moderation ({listings.length})
        </button>

        <button
          onClick={() => setActiveTab('dms')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'dms'
              ? 'border-brand-500 text-white bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          DMs Surveillance ({conversations.length})
          {(stats?.flaggedMessagesCount || 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-red-600 text-white font-bold">
              {stats.flaggedMessagesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-brand-500 text-white bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-400" />
          Security Audit Trail
        </button>
      </div>

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search username or email..."
                className="w-full bg-surface border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredUsers.length} of {users.length} users
            </span>
          </div>

          <div className="bg-surface border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surfaceLight/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Auth Provider</th>
                    <th className="p-3.5">Postings</th>
                    <th className="p-3.5">Joined</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-mono">
                        No users match the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-medium text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-xs">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.username}</span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">{u.email}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              u.role === 'ADMIN'
                                ? 'bg-red-950/60 border border-red-500/50 text-red-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">
                          {u.authProvider || 'LOCAL'}
                        </td>
                        <td className="p-3.5 font-mono text-brand-400">
                          {u._count?.listings ?? 0}
                        </td>
                        <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5">
                          {u.isBanned ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 border border-red-500/50 text-red-400">
                              BANNED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          {u.role !== 'ADMIN' && (
                            <>
                              <button
                                onClick={() => handleToggleBan(u)}
                                disabled={actionLoading === u.id}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                  u.isBanned
                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
                                }`}
                              >
                                {u.isBanned ? 'Unban' : 'Ban'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                disabled={actionLoading === u.id}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-900/50 transition-all"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POSTINGS MODERATION */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                placeholder="Search listing platform or seller..."
                className="w-full bg-surface border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredListings.length} of {listings.length} postings
            </span>
          </div>

          <div className="bg-surface border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surfaceLight/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Platform</th>
                    <th className="p-3.5">Price / Cycle</th>
                    <th className="p-3.5">Available Slots</th>
                    <th className="p-3.5">Seller</th>
                    <th className="p-3.5">DMs Started</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredListings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">
                        No postings found.
                      </td>
                    </tr>
                  ) : (
                    filteredListings.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-bold text-white">{l.platformName}</td>
                        <td className="p-3.5 font-mono text-emerald-400 font-semibold">
                          ${l.pricePerMonth} / {l.billingCycle}
                        </td>
                        <td className="p-3.5 font-mono">
                          {l.slotsAvailable} / {l.totalSlots}
                        </td>
                        <td className="p-3.5 text-slate-300 font-mono">
                          {l.owner?.username || 'Unknown'}
                        </td>
                        <td className="p-3.5 font-mono text-brand-400">
                          {l._count?.conversations ?? 0}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status === 'ACTIVE'
                                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                                : l.status === 'SUSPENDED'
                                ? 'bg-red-950/60 border border-red-500/50 text-red-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleToggleListingStatus(l)}
                            disabled={actionLoading === l.id}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                              l.status === 'ACTIVE'
                                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
                                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                            }`}
                          >
                            {l.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteListing(l.id, l.platformName)}
                            disabled={actionLoading === l.id}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-900/50 transition-all"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DMs SURVEILLANCE & CHATS */}
      {activeTab === 'dms' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="Search buyer, seller, or listing..."
                className="w-full bg-surface border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredConversations.length} of {conversations.length} conversations
            </span>
          </div>

          <div className="bg-surface border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surfaceLight/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Listing</th>
                    <th className="p-3.5">Buyer</th>
                    <th className="p-3.5">Seller</th>
                    <th className="p-3.5">Flagged Content</th>
                    <th className="p-3.5">Last Activity</th>
                    <th className="p-3.5 text-right">Surveillance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredConversations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                        No active conversations found.
                      </td>
                    </tr>
                  ) : (
                    filteredConversations.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          {c.listing?.platformName || 'General Inquiry'}
                        </td>
                        <td className="p-3.5 text-slate-300 font-mono">
                          {c.buyer?.username || 'Unknown'}
                        </td>
                        <td className="p-3.5 text-slate-300 font-mono">
                          {c.seller?.username || 'Unknown'}
                        </td>
                        <td className="p-3.5">
                          {c.flaggedCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 font-bold text-[10px]">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              {c.flaggedCount} Flagged
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px] font-mono">Clean</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">
                          {new Date(c.updatedAt).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => setSelectedConversationId(c.id)}
                            className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-indigo-950/50 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/50 transition-all inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Read Transcript
                          </button>
                          <button
                            onClick={() => handleDeleteConversation(c.id)}
                            disabled={actionLoading === c.id}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-900/50 transition-all"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-surface border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surfaceLight/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Admin</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Target Type</th>
                  <th className="p-3.5">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No security audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="p-3.5 text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-white font-semibold">
                        {log.admin?.username || 'System'}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-950/50 border border-red-500/40 text-red-300 font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">{log.targetType}</td>
                      <td className="p-3.5 text-slate-500">{log.ipAddress || 'internal'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transcript Audit Modal */}
      {selectedConversationId && (
        <AdminChatAuditModal
          conversationId={selectedConversationId}
          onClose={() => setSelectedConversationId(null)}
          onActionComplete={loadAllData}
        />
      )}
    </div>
  );
}
