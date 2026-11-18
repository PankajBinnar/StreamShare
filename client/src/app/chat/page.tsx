'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { fetchApi } from '../../lib/api';
import { Conversation } from '../../types';
import { ConversationList } from '../../components/ConversationList';
import { ChatWindow } from '../../components/ChatWindow';
import { MessageSquare, Shield, Lock } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlConversationId = searchParams.get('conversationId');

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    urlConversationId
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/chat');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi<Conversation[]>('/chat/conversations');
      if (res.success && res.data) {
        setConversations(res.data);
        // If no conversation currently selected, select the first one
        if (!activeConversationId && res.data.length > 0) {
          setActiveConversationId(res.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated]);

  // Keep state synced with URL query param
  useEffect(() => {
    if (urlConversationId) {
      setActiveConversationId(urlConversationId);
    }
  }, [urlConversationId]);

  // Real-time inbox update on incoming message
  useEffect(() => {
    if (!socket) return;

    const handleConversationUpdate = (data: any) => {
      loadConversations();
    };

    socket.on('conversation_updated', handleConversationUpdate);

    return () => {
      socket.off('conversation_updated', handleConversationUpdate);
    };
  }, [socket]);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    router.replace(`/chat?conversationId=${id}`, { scroll: false });
  };

  if (authLoading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] min-h-[550px] bg-surface border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
      {/* Left Sidebar: Conversations Inbox */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-surface ${
          activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-slate-800 bg-surface/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-bold text-white">Direct Messages</h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
            WSS Active
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            isLoading={isLoading}
          />
        </div>

        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-center gap-1.5 font-mono">
          <Lock className="w-3 h-3 text-brand-400" />
          Zero Plaintext Logged • Central Postgres Persistence
        </div>
      </div>

      {/* Right Column: Active Chat Window */}
      <div
        className={`flex-1 flex flex-col ${
          !activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConversationId ? (
          <div className="flex-1 flex flex-col h-full relative">
            {/* Mobile Back Button to inbox */}
            <div className="md:hidden p-2 bg-surface border-b border-slate-800">
              <button
                onClick={() => setActiveConversationId(null)}
                className="text-xs font-semibold text-brand-400 px-2 py-1"
              >
                ← Back to Conversation List
              </button>
            </div>
            <ChatWindow
              conversationId={activeConversationId}
              onMessageSent={loadConversations}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <div className="w-16 h-16 rounded-2xl bg-surfaceLight/50 border border-slate-800 flex items-center justify-center text-brand-400 mb-4 shadow-inner">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-200">No Conversation Selected</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Select an ongoing conversation from the left inbox or browse the marketplace to message a subscription owner.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

