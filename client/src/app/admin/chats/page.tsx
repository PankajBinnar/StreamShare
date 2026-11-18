'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { fetchApi } from '../../../lib/api';
import { Conversation, AuditLog } from '../../../types';
import { AdminChatAuditModal } from '../../../components/AdminChatAuditModal';
import {
  ShieldAlert,
  Users,
  Tv,
  MessageSquare,
  AlertTriangle,
  UserX,
  Search,
  Eye,
  Filter,
  CheckCircle,
  Clock,
  Lock,
  Radio,
} from 'lucide-react';

export default function AdminChatsModerationPage() {
  const router = useRouter();
  const { user, isAdmin, isAuthenticated, isLoading: authLoading } = useAuth();
  const { socket } = useSocket();

  const [stats, setStats] = useState<{
    totalUsers: number;
    activeListings: number;
    totalConversations: number;
    flaggedMessagesCount: number;
    bannedUsersCount: number;
  } | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'conversations' | 'flagged' | 'audit'>('flagged');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);

  // Guard: Admin role required
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isAdmin) {
        router.push('/');
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Overview metrics
      const statsRes = await fetchApi<any>('/admin/dashboard');
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      // 2. Conversations
      const convRes = await fetchApi<Conversation[]>(
        `/admin/conversations?flaggedOnly=${activeTab === 'flagged'}`
      );
      if (convRes.success && convRes.data) {
        setConversations(convRes.data);
      }

      // 3. Audit logs
      const logsRes = await fetchApi<AuditLog[]>('/admin/audit-logs');
      if (logsRes.success && logsRes.data) {
        setAuditLogs(logsRes.data);
      }
    } catch (e) {
      console.error('Error fetching admin moderation data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, activeTab]);

  // Subscribe to live moderation alerts from WebSocket
  useEffect(() => {
    if (!socket || !isAdmin) return;

    const handleModerationAlert = (alertData: any) => {
      setLiveAlerts((prev) => [alertData, ...prev.slice(0, 4)]);
      // Refresh metrics
      loadData();
    };

    socket.on('moderation_alert', handleModerationAlert);

    return () => {
      socket.off('moderation_alert', handleModerationAlert);
    };
  }, [socket, isAdmin]);

  if (authLoading || !isAdmin) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.listing.platformName.toLowerCase().includes(q) ||
      c.buyer?.username?.toLowerCase().includes(q) ||
      c.seller?.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Admin Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-950/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-400 shadow-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Security Operations & Moderation Center
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-900/60 text-red-300 border border-red-500/40">
                  IP RESTRICTED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized oversight for P2P direct messaging and OTT listing policy compliance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-slate-800 text-xs text-slate-300 font-mono">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Live WebSocket Surveillance Active
          </div>
        </div>
      </div>

      {/* Live Surveillance Alert Feed */}
      {liveAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Real-Time Automated Policy Violation Alerts
          </span>
          <div className="space-y-1.5">
            {liveAlerts.map((alert, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs text-amber-200 bg-amber-950/60 p-2 rounded-lg border border-amber-500/20"
              >
                <span>
                  User <strong>{alert.sender?.username}</strong> triggered rule: {alert.reason}
                </span>
                <button
                  onClick={() => setSelectedConversationId(alert.conversationId)}
                  className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[10px]"
                >
                  Inspect Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-surface border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Total Users</span>
            <Users className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats?.totalUsers || 0}</p>
        </div>

        <div className="bg-surface border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Active Listings</span>
            <Tv className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats?.activeListings || 0}</p>
        </div>

        <div className="bg-surface border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Conversations</span>
            <MessageSquare className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats?.totalConversations || 0}</p>
        </div>

        <div className="bg-surface border border-red-900/50 bg-red-950/10 rounded-2xl p-4">
          <div className="flex items-center justify-between text-red-400 mb-2">
            <span className="text-xs font-mono uppercase font-bold">Flagged Messages</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-black text-red-200">{stats?.flaggedMessagesCount || 0}</p>
        </div>

        <div className="bg-surface border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Suspended Users</span>
            <UserX className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats?.bannedUsersCount || 0}</p>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('flagged')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'flagged'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-surface border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Flagged for Review ({stats?.flaggedMessagesCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'conversations'
                ? 'bg-brand-600 text-white shadow-lg'
                : 'bg-surface border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            All Active Conversations
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-surface border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Compliance Audit Log
          </button>
        </div>

        {activeTab !== 'audit' && (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by platform or username..."
              className="bg-surface border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'audit' ? (
        // Audit Logs Table
        <div className="bg-surface border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-surface/80">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              Administrative Surveillance Trail
            </h3>
            <p className="text-xs text-slate-400">
              Immutable security record of all actions performed by administrators.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surfaceLight/50 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Admin</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Target</th>
                  <th className="p-3.5">IP Address</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="p-3.5 font-semibold text-white">
                      {log.admin?.username || log.adminId}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">
                      {log.targetType}: {log.targetId?.substring(0, 8)}...
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">{log.ipAddress}</td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Conversations Table
        <div className="bg-surface border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surfaceLight/50 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Platform</th>
                  <th className="p-3.5">Buyer</th>
                  <th className="p-3.5">Seller</th>
                  <th className="p-3.5">Messages</th>
                  <th className="p-3.5">Flags</th>
                  <th className="p-3.5">Last Message</th>
                  <th className="p-3.5 text-right">Surveillance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Loading monitored conversations...
                    </td>
                  </tr>
                ) : filteredConversations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No conversations found for current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredConversations.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30">
                      <td className="p-3.5 font-semibold text-white flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-brand-400" />
                        {c.listing.platformName}
                      </td>
                      <td className="p-3.5">
                        <span className={c.buyer?.isBanned ? 'line-through text-red-400' : ''}>
                          {c.buyer?.username}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={c.seller?.isBanned ? 'line-through text-red-400' : ''}>
                          {c.seller?.username}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">{c._count?.messages || 0}</td>
                      <td className="p-3.5">
                        {c.flaggedCount && c.flaggedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/50 text-red-400 font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            {c.flaggedCount} Flagged
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono">0</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {new Date(c.lastMessageAt || c.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedConversationId(c.id)}
                          className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-200 font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect Transcript
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Transcript & Take Moderation Action Modal */}
      {selectedConversationId && (
        <AdminChatAuditModal
          conversationId={selectedConversationId}
          onClose={() => setSelectedConversationId(null)}
          onActionComplete={loadData}
        />
      )}
    </div>
  );
}

