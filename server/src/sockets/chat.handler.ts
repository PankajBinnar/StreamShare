import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from './socket.server.js';
import { chatService } from '../services/chat.service.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

// Anti-flood rate limiting tracker per socket: max 5 messages per 5 seconds
const socketMessageTimestamps = new Map<string, number[]>();

function checkSocketRateLimit(socketId: string): boolean {
  const now = Date.now();
  const windowMs = 5000;
  const maxMessages = 5;

  let timestamps = socketMessageTimestamps.get(socketId) || [];
  timestamps = timestamps.filter((t) => now - t < windowMs);
  timestamps.push(now);
  socketMessageTimestamps.set(socketId, timestamps);

  return timestamps.length <= maxMessages;
}

export function registerChatHandlers(io: SocketIOServer, socket: AuthenticatedSocket) {
  const currentUser = socket.data.user;

  // 1. Join Conversation Room
  socket.on('join_conversation', async ({ conversationId }: { conversationId: string }, callback) => {
    try {
      if (!conversationId) return;

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true, buyerId: true, sellerId: true },
      });

      if (!conversation) {
        if (callback) callback({ success: false, error: 'Conversation not found' });
        return;
      }

      // Authorization check: User must be buyer, seller, or Admin
      const isParticipant =
        conversation.buyerId === currentUser.userId ||
        conversation.sellerId === currentUser.userId ||
        currentUser.role === 'ADMIN';

      if (!isParticipant) {
        logger.warn('Unauthorized conversation room join attempt', {
          userId: currentUser.userId,
          conversationId,
        });
        if (callback) callback({ success: false, error: 'Forbidden' });
        return;
      }

      const roomName = `conversation:${conversationId}`;
      socket.join(roomName);
      logger.info('User joined chat room', { userId: currentUser.userId, conversationId });

      if (callback) callback({ success: true, conversationId });
    } catch (error: any) {
      logger.error('Error joining conversation room', { error: error.message });
      if (callback) callback({ success: false, error: 'Failed to join conversation' });
    }
  });

  // 2. Leave Conversation Room
  socket.on('leave_conversation', ({ conversationId }: { conversationId: string }) => {
    if (conversationId) {
      socket.leave(`conversation:${conversationId}`);
    }
  });

  // 3. Send Direct P2P Message
  socket.on(
    'send_message',
    async (
      { conversationId, content }: { conversationId: string; content: string },
      callback
    ) => {
      try {
        // Socket-level anti-spam rate limiting
        if (!checkSocketRateLimit(socket.id)) {
          logger.warn('Socket message rate limit violated by user', { userId: currentUser.userId });
          if (callback) {
            callback({
              success: false,
              error: 'Rate limit exceeded: You are sending messages too quickly. Please pause.',
            });
          }
          return;
        }

        if (!conversationId || !content) {
          if (callback) callback({ success: false, error: 'conversationId and content are required' });
          return;
        }

        // Retrieve conversation to identify counterpart recipient
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { id: true, buyerId: true, sellerId: true },
        });

        if (!conversation) {
          if (callback) callback({ success: false, error: 'Conversation not found' });
          return;
        }

        // Persist message in PostgreSQL via centralized chatService (includes XSS sanitization & safety scan)
        const savedMessage = await chatService.saveMessage(
          conversationId,
          currentUser.userId,
          content
        );

        // Broadcast to all participants in conversation room
        const roomName = `conversation:${conversationId}`;
        io.to(roomName).emit('new_message', {
          message: savedMessage,
          conversationId,
        });

        // Determine recipient
        const recipientId =
          conversation.buyerId === currentUser.userId
            ? conversation.sellerId
            : conversation.buyerId;

        // Push real-time inbox update to recipient's personal room
        io.to(`user:${recipientId}`).emit('conversation_updated', {
          conversationId,
          lastMessage: savedMessage,
          unreadIncrement: 1,
        });

        // If message was flagged by automated security rule, broadcast surveillance alert to Admins
        if (savedMessage.isFlagged) {
          io.to('admin:moderation').emit('moderation_alert', {
            alertType: 'FLAGGED_MESSAGE',
            conversationId,
            messageId: savedMessage.id,
            sender: {
              id: currentUser.userId,
              username: currentUser.username,
            },
            reason: savedMessage.flaggedReason,
            timestamp: savedMessage.createdAt,
          });
        }

        if (callback) callback({ success: true, message: savedMessage });
      } catch (error: any) {
        logger.error('Failed to process incoming WebSocket message', { error: error.message });
        if (callback) callback({ success: false, error: error.message || 'Failed to send message' });
      }
    }
  );

  // 4. Typing Indicator Handlers
  socket.on('typing_start', ({ conversationId }: { conversationId: string }) => {
    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      conversationId,
      userId: currentUser.userId,
      username: currentUser.username,
    });
  });

  socket.on('typing_stop', ({ conversationId }: { conversationId: string }) => {
    socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
      conversationId,
      userId: currentUser.userId,
    });
  });

  // 5. Mark Messages Read Receipt
  socket.on('mark_read', async ({ conversationId }: { conversationId: string }) => {
    try {
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: currentUser.userId },
          isRead: false,
        },
        data: { isRead: true },
      });

      socket.to(`conversation:${conversationId}`).emit('messages_marked_read', {
        conversationId,
        readBy: currentUser.userId,
      });
    } catch (err: any) {
      logger.error('Error in mark_read socket event', { error: err.message });
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    socketMessageTimestamps.delete(socket.id);
  });
}

