'use client';

import React, { useState, useEffect } from 'react';
import { Conversation, Message } from '../types';
import { fetchApi } from '../lib/api';
import {
  ShieldAlert,
  X,
  UserX,
  UserCheck,
  Trash2,
  CheckCircle,
  Clock,
  Tv,
  AlertTriangle,
} from 'lucide-react';

interface AdminChatAuditModalProps {
  conversationId: string;
  onClose: () => void;
  onActionComplete: () => void;
}

export function AdminChatAuditModal({
  conversationId,
  onClose,
  onActionComplete,
}: AdminChatAuditModalProps) {
  const [data, setData] = useState<{
    conversation: Conversation;
    messages: Message[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadTranscript = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<any>(`/admin/conversations/${conversationId}/transcript`);
      if (res.success && res.data) {
        setData({
          conversation: res.data,
          messages: res.data.messages || [],
        });
      }
    } catch (e) {
      setFeedback('Failed to load conversation audit transcript.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTranscript();
  }, [conversationId]);

  const handleReviewMessage = async (messageId: string, action: 'DISMISS' | 'DELETE') => {
    setActionLoading(true);
    try {
      const res = await fetchApi(`/admin/messages/${messageId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, notes: `Reviewed by moderator` }),
      });

      if (res.success) {
        setFeedback(`Message ${action === 'DISMISS' ? 'flag dismissed' : 'deleted'}.`);
        await loadTranscript();
        onActionComplete();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleUserBan = async (userId: string, currentBan: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetchApi(`/admin/users/${userId}/ban`, {
        method: 'POST',
        body: JSON.stringify({
          ban: !currentBan,
          reason: `Administrative enforcement via Audit Panel`,
        }),
      });

      if (res.success) {
        setFeedback(`User ${!currentBan ? 'banned' : 'unbanned'}.`);
        await loadTranscript();
        onActionComplete();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleListingStatus = async (listingId: string, status: 'SUSPENDED' | 'ACTIVE') => {
    setActionLoading(true);
    try {
      const res = await fetchApi(`/admin/listings/${listingId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          reason: `Administrative status change from Chat Audit`,
        }),
      });

      if (res.success) {
        setFeedback(`Listing status updated to ${status}.`);
        await loadTranscript();
        onActionComplete();
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface border border-red-900/40 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-red-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-950 border border-red-500/30 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Administrative Chat Audit & Investigation
                <span className="text-[10px] font-mono bg-red-900/40 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                  CONFIDENTIAL
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">Conversation ID: {conversationId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div className="m-3 p-2.5 rounded-xl bg-brand-950/60 border border-brand-500/40 text-xs text-brand-200 flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="p-16 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Participants and Listing Meta Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Buyer */}
              <div className="bg-surfaceLight/60 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] uppercase font-mono text-slate-400">Buyer</span>
                <div className="flex items-center justify-between mt-1">
                  <div>
                    <p className="text-sm font-bold text-white">{data?.conversation.buyer?.username}</p>
                    <p className="text-xs text-slate-400 truncate">{data?.conversation.buyer?.email}</p>
                  </div>
                  <button
                    onClick={() =>
                      handleToggleUserBan(
                        data!.conversation.buyer!.id,
                        !!data!.conversation.buyer!.isBanned
                      )
                    }
                    disabled={actionLoading}
                    className={`p-1.5 rounded-lg text-xs font-semibold border ${
                      data?.conversation.buyer?.isBanned
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/40 border-red-500/40 text-red-300 hover:bg-red-900/60'
                    }`}
                  >
                    {data?.conversation.buyer?.isBanned ? (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Unban
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserX className="w-3 h-3" /> Ban User
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Seller */}
              <div className="bg-surfaceLight/60 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] uppercase font-mono text-slate-400">Seller</span>
                <div className="flex items-center justify-between mt-1">
                  <div>
                    <p className="text-sm font-bold text-white">{data?.conversation.seller?.username}</p>
                    <p className="text-xs text-slate-400 truncate">{data?.conversation.seller?.email}</p>
                  </div>
                  <button
                    onClick={() =>
                      handleToggleUserBan(
                        data!.conversation.seller!.id,
                        !!data!.conversation.seller!.isBanned
                      )
                    }
                    disabled={actionLoading}
                    className={`p-1.5 rounded-lg text-xs font-semibold border ${
                      data?.conversation.seller?.isBanned
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/40 border-red-500/40 text-red-300 hover:bg-red-900/60'
                    }`}
                  >
                    {data?.conversation.seller?.isBanned ? (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Unban
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserX className="w-3 h-3" /> Ban User
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Listing */}
              <div className="bg-surfaceLight/60 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] uppercase font-mono text-slate-400">Listing Status</span>
                <div className="flex items-center justify-between mt-1">
                  <div>
                    <p className="text-sm font-bold text-white flex items-center gap-1">
                      <Tv className="w-3.5 h-3.5 text-brand-400" />
                      {data?.conversation.listing.platformName}
                    </p>
                    <p className="text-xs text-emerald-400 font-semibold">
                      ${data?.conversation.listing.price}/mo
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleToggleListingStatus(
                        data!.conversation.listing.id,
                        data!.conversation.listing.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                      )
                    }
                    disabled={actionLoading}
                    className="p-1.5 rounded-lg text-xs font-semibold border bg-slate-800 border-slate-700 text-slate-200"
                  >
                    {data?.conversation.listing.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>

            {/* Complete Immutable Transcript */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400">
                Centralized PostgreSQL Message Transcript ({data?.messages.length} Total Messages)
              </h3>

              <div className="space-y-2 border border-slate-800 rounded-xl p-4 bg-background/50">
                {data?.messages.map((msg) => {
                  const isFlagged = msg.isFlagged;
                  return (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        isFlagged
                          ? 'bg-amber-950/30 border-amber-500/50'
                          : 'bg-surface border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {msg.sender?.username || 'Unknown User'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {/* Flag actions for admins */}
                        {isFlagged ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleReviewMessage(msg.id, 'DISMISS')}
                              disabled={actionLoading}
                              title="Dismiss flag"
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" /> Dismiss
                            </button>
                            <button
                              onClick={() => handleReviewMessage(msg.id, 'DELETE')}
                              disabled={actionLoading}
                              title="Delete violating message"
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-900/50 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {/* Flag reason note */}
                      {isFlagged && (
                        <div className="mb-2 p-1.5 rounded bg-amber-900/40 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Flag Reason: {msg.flaggedReason || 'Flagged for security review'}</span>
                        </div>
                      )}

                      <p className="text-xs text-slate-200 font-mono whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

