import React from 'react';
import { Conversation } from '../types';
import { Tv, MessageSquare } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  isLoading: boolean;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  isLoading,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
        <MessageSquare className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-sm font-medium text-slate-300">No conversations yet</p>
        <p className="text-xs text-slate-500 mt-1">Browse classifieds and click Chat to message sellers directly.</p>
      </div>
    );
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="divide-y divide-slate-800/60 overflow-y-auto">
      {conversations.map((conv) => {
        const isActive = conv.id === activeConversationId;
        const counterpartName = conv.counterpart?.username || 'Peer';

        return (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={`w-full p-4 flex items-start gap-3 text-left transition-colors ${
              isActive
                ? 'bg-brand-900/30 border-l-4 border-brand-500'
                : 'hover:bg-slate-800/40'
            }`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm uppercase">
                {counterpartName.substring(0, 2)}
              </div>
              {conv.unreadCount && conv.unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {conv.unreadCount}
                </span>
              ) : null}
            </div>

            {/* Conversation Summary */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white truncate">
                  {counterpartName}
                </span>
                <span className="text-[11px] text-slate-500 shrink-0">
                  {formatTime(conv.lastMessageAt || conv.createdAt)}
                </span>
              </div>

              {/* Platform badge */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  <Tv className="w-2.5 h-2.5 text-brand-400" />
                  {conv.listing?.platformName}
                </span>
              </div>

              {/* Last Message Snippet */}
              <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                {conv.lastMessage?.imageUrl ? (
                  <>
                    <span className="text-brand-400 font-medium">📷 [Proof Image]</span>
                    {conv.lastMessage.content && <span>{conv.lastMessage.content}</span>}
                  </>
                ) : (
                  conv.lastMessage?.content || 'Started a new conversation'
                )}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

