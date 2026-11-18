'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { fetchApi } from '../lib/api';
import {
  Send,
  ShieldAlert,
  Tv,
  Check,
  CheckCheck,
  AlertTriangle,
  X,
  Flag,
} from 'lucide-react';

interface ChatWindowProps {
  conversationId: string;
  onMessageSent?: () => void;
}

export function ChatWindow({ conversationId, onMessageSent }: ChatWindowProps) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reporting modal state
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch conversation history on ID change
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);

    async function loadChat() {
      try {
        const res = await fetchApi<{
          conversation: Conversation;
          messages: Message[];
        }>(`/chat/conversations/${conversationId}/messages`);

        if (isMounted && res.success && res.data) {
          setConversation(res.data.conversation);
          setMessages(res.data.messages);
        }
      } catch (err: any) {
        if (isMounted) setErrorMsg('Failed to load chat history.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadChat();

    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  // 2. Real-time WebSocket room subscriptions
  useEffect(() => {
    if (!socket || !conversationId) return;

    // Join room
    socket.emit('join_conversation', { conversationId }, (res: any) => {
      if (res?.error) {
        setErrorMsg(res.error);
      }
    });

    // Mark as read
    socket.emit('mark_read', { conversationId });

    // Incoming messages
    const handleNewMessage = (payload: { message: Message; conversationId: string }) => {
      if (payload.conversationId === conversationId) {
        setMessages((prev) => [...prev, payload.message]);
        scrollToBottom();

        // Send read receipt if we are recipient
        if (payload.message.senderId !== user?.id) {
          socket.emit('mark_read', { conversationId });
        }
      }
    };

    // Typing indicators
    const handleUserTyping = (data: { userId: string; username: string }) => {
      if (data.userId !== user?.id) {
        setTypingUser(data.username);
      }
    };

    const handleUserStoppedTyping = (data: { userId: string }) => {
      if (data.userId !== user?.id) {
        setTypingUser(null);
      }
    };

    const handleMessagesRead = (data: { conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);
    socket.on('messages_marked_read', handleMessagesRead);

    return () => {
      socket.emit('leave_conversation', { conversationId });
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('messages_marked_read', handleMessagesRead);
    };
  }, [socket, conversationId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!socket) return;

    socket.emit('typing_start', { conversationId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId });
    }, 1500);
  };

  // Dispatch message via Socket.io with fallback to REST
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setErrorMsg(null);

    if (socket && socket.connected) {
      socket.emit(
        'send_message',
        { conversationId, content },
        (res: { success: boolean; message?: Message; error?: string }) => {
          setIsSending(false);
          if (res.success && res.message) {
            setInputText('');
            if (onMessageSent) onMessageSent();
          } else {
            setErrorMsg(res.error || 'Failed to dispatch message.');
          }
        }
      );
    } else {
      // REST API fallback
      const res = await fetchApi<Message>(`/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });

      setIsSending(false);
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data!]);
        setInputText('');
        if (onMessageSent) onMessageSent();
      } else {
        setErrorMsg(res.error || 'Failed to dispatch message.');
      }
    }
  };

  const handleOpenFlagModal = (messageId: string) => {
    setTargetMessageId(messageId);
    setReportReason('');
    setFlagModalOpen(true);
  };

  const handleSubmitFlag = async () => {
    if (!targetMessageId) return;

    try {
      const res = await fetchApi(`/chat/messages/${targetMessageId}/flag`, {
        method: 'POST',
        body: JSON.stringify({ reason: reportReason }),
      });

      if (res.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetMessageId
              ? { ...m, isFlagged: true, flaggedReason: `Reported: ${reportReason}` }
              : m
          )
        );
        setFlagModalOpen(false);
      }
    } catch (e) {
      // Ignored
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface/50">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const counterpart =
    conversation?.buyerId === user?.id ? conversation?.seller : conversation?.buyer;

  return (
    <div className="flex-1 flex flex-col h-full bg-surface/30">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 bg-surface/80 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/40 flex items-center justify-center font-bold text-brand-300 text-sm uppercase">
            {counterpart?.username?.substring(0, 2) || 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{counterpart?.username}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                P2P Verified
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Tv className="w-3 h-3 text-brand-400" />
                {conversation?.listing?.platformName}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">
                ${conversation?.listing?.price.toFixed(2)}/mo
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline font-mono">
            End-to-End Logged & Moderated
          </span>
        </div>
      </div>

      {/* Error alert toast */}
      {errorMsg && (
        <div className="m-3 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4 text-slate-400 hover:text-white" />
          </button>
        </div>
      )}

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
            <Tv className="w-10 h-10 text-slate-700 mb-2" />
            <p className="text-sm font-medium text-slate-400">Direct OTT Negotiation Channel</p>
            <p className="text-xs text-slate-600 max-w-sm mt-1">
              Ask about profiles, streaming device limits, and renewal dates. Never share master passwords or credit cards.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 max-w-[80%]">
                  {!isMe && (
                    <button
                      onClick={() => handleOpenFlagModal(msg.id)}
                      title="Report message to Admin"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm shadow-md break-words ${
                      isMe
                        ? 'bg-brand-600 text-white rounded-br-none'
                        : 'bg-surface border border-slate-800 text-slate-200 rounded-bl-none'
                    } ${msg.isFlagged ? 'border border-amber-500/50 bg-amber-950/30' : ''}`}
                  >
                    {/* Flagged warning badge */}
                    {msg.isFlagged && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-medium text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                        <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Security Alert: Flagged for Moderation</span>
                      </div>
                    )}

                    <p className="leading-relaxed">{msg.content}</p>

                    <div
                      className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                        isMe ? 'text-brand-200' : 'text-slate-400'
                      }`}
                    >
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMe && (
                        <span>
                          {msg.isRead ? (
                            <CheckCheck className="w-3 h-3 text-emerald-300" />
                          ) : (
                            <Check className="w-3 h-3 text-slate-300" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUser && (
        <div className="px-4 py-1.5 text-xs text-brand-400 font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
          {typingUser} is typing...
        </div>
      )}

      {/* Message Input Box */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-surface">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type your message... (press Enter to send)"
            maxLength={2000}
            className="flex-1 bg-surfaceLight border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Report Modal */}
      {flagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-bold text-white">Report Message to Security Admin</h3>
              </div>
              <button
                onClick={() => setFlagModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              StreamShare administrators review all flagged messages. Prohibited actions include soliciting master account passwords, off-platform payments, harassment, or sharing payment card numbers.
            </p>

            <textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="State the reason for reporting this message..."
              className="w-full bg-surfaceLight border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setFlagModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFlag}
                disabled={!reportReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

