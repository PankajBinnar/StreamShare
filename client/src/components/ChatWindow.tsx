'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { fetchApi, uploadApi } from '../lib/api';
import {
  Send,
  ShieldAlert,
  Tv,
  Check,
  CheckCheck,
  AlertTriangle,
  X,
  Flag,
  Image as ImageIcon,
  Paperclip,
  Maximize2,
  ExternalLink,
  Loader2,
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

  // Image upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Full-screen image lightbox modal
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

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
    setSelectedFile(null);
    setPreviewUrl(null);

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
        setMessages((prev) => {
          // Prevent duplicates if already inserted locally
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
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
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.emit('leave_conversation', { conversationId });
    };
  }, [socket, conversationId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!socket || !conversationId) return;

    socket.emit('typing_start', { conversationId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId });
    }, 1500);
  };

  // Image Selection Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB. Please upload a smaller screenshot.');
      return;
    }

    // Validate mime
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Only JPEG, PNG, and WebP image formats are supported.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleClearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Dispatch message (Text or Image attachment)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();

    // If neither text nor image is selected, return
    if (!content && !selectedFile) return;
    if (isSending || isUploadingImage) return;

    setErrorMsg(null);

    // Case 1: Uploading with an Image Attachment
    if (selectedFile) {
      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        if (content) {
          formData.append('caption', content);
        }

        const res = await uploadApi<Message>(
          `/chat/conversations/${conversationId}/upload`,
          formData
        );

        if (res.success && res.data) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === res.data!.id)) return prev;
            return [...prev, res.data!];
          });
          setInputText('');
          handleClearSelectedFile();
          if (onMessageSent) onMessageSent();
        } else {
          setErrorMsg(res.error || 'Failed to upload proof image.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error uploading image.');
      } finally {
        setIsUploadingImage(false);
      }
      return;
    }

    // Case 2: Standard Text Message
    setIsSending(true);

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
            Encrypted & Cloudinary Moderated
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
            <p className="text-sm font-medium text-slate-400">Direct OTT Negotiation & Proof Channel</p>
            <p className="text-xs text-slate-600 max-w-sm mt-1">
              Ask about streaming slots, billing dates, and share proof screenshots securely via Cloudinary.
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
                <div className="flex items-center gap-2 max-w-[85%] sm:max-w-[75%]">
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
                    className={`rounded-2xl p-3 text-sm shadow-md break-words ${
                      isMe
                        ? 'bg-brand-600 text-white rounded-br-none'
                        : 'bg-surface border border-slate-800 text-slate-200 rounded-bl-none'
                    } ${msg.isFlagged ? 'border border-amber-500/50 bg-amber-950/30' : ''}`}
                  >
                    {/* Flagged warning badge */}
                    {msg.isFlagged && (
                      <div className="flex items-center gap-1.5 mb-2 text-[11px] font-medium text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                        <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Security Alert: Flagged for Moderation</span>
                      </div>
                    )}

                    {/* Image Attachment (Proof Screenshot) */}
                    {msg.imageUrl && (
                      <div
                        onClick={() => setLightboxImageUrl(msg.imageUrl || null)}
                        className="relative group/img cursor-pointer overflow-hidden rounded-xl border border-slate-700/60 mb-2 bg-black/40 hover:border-brand-400 transition-all"
                      >
                        <img
                          src={msg.imageUrl}
                          alt="Subscription Proof Screenshot"
                          className="w-full max-h-72 object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-[1.02]"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs text-white font-medium backdrop-blur-[1px]">
                          <Maximize2 className="w-4 h-4 text-brand-300" />
                          <span>Click to inspect proof</span>
                        </div>
                      </div>
                    )}

                    {/* Message content text (caption or text message) */}
                    {msg.content && (
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}

                    <div
                      className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] ${
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

      {/* Selected Image Attachment Preview Bar */}
      {previewUrl && (
        <div className="px-4 py-2 border-t border-slate-800 bg-surfaceLight/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-brand-500/50 shadow-md">
              <img
                src={previewUrl}
                alt="Selected preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                {selectedFile?.name}
              </p>
              <p className="text-[10px] text-brand-400 font-mono">
                {selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0} KB • Proof Image Ready
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearSelectedFile}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Cancel attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Input Box with Attachment Trigger */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-surface">
        <div className="flex items-center gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="hidden"
          />

          {/* Paperclip / Image Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage || isSending}
            title="Attach subscription proof screenshot"
            className="p-2.5 rounded-xl border border-slate-700/80 bg-surfaceLight hover:bg-slate-800 text-slate-300 hover:text-brand-400 transition-colors disabled:opacity-40"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={
              selectedFile
                ? 'Add an optional caption for this proof image...'
                : 'Type your message or attach proof... (Enter to send)'
            }
            maxLength={2000}
            disabled={isUploadingImage}
            className="flex-1 bg-surfaceLight border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedFile) || isSending || isUploadingImage}
            className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center min-w-[42px]"
          >
            {isUploadingImage ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Full-Screen Proof Image Lightbox Modal */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImageUrl(null)}
        >
          {/* Top Control Bar */}
          <div
            className="w-full max-w-4xl flex items-center justify-between pb-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Subscription Verification Proof
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={lightboxImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Original</span>
              </a>
              <button
                onClick={() => setLightboxImageUrl(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Centered Image */}
          <div
            className="relative max-w-4xl max-h-[82vh] overflow-hidden rounded-2xl border border-slate-800 shadow-2xl bg-black/60 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImageUrl}
              alt="Full Size Proof Screenshot"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

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
