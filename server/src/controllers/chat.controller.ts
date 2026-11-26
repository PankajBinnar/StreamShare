import { Response } from 'express';
import { chatService } from '../services/chat.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import { prisma } from '../config/prisma.js';
import { io } from '../sockets/socket.server.js';
import { logger } from '../config/logger.js';

export class ChatController {
  async startConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const { listingId } = req.body;
      if (!listingId) {
        res.status(400).json({ success: false, error: 'listingId is required.' });
        return;
      }

      const conversation = await chatService.startOrGetConversation(req.user.userId, listingId);

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Server error.' });
    }
  }

  async getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const conversations = await chatService.getUserConversations(req.user.userId);

      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Server error.' });
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const { id: conversationId } = req.params;
      const { page, limit } = req.query;

      const result = await chatService.getConversationMessages(
        conversationId,
        req.user.userId,
        req.user.role,
        page ? parseInt(page as string, 10) : 1,
        limit ? parseInt(limit as string, 10) : 50
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Server error.' });
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const { id: conversationId } = req.params;
      const { content, imageUrl, messageType } = req.body;

      const message = await chatService.saveMessage(
        conversationId,
        req.user.userId,
        content,
        imageUrl,
        messageType
      );

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Server error.' });
    }
  }

  async uploadChatImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const { id: conversationId } = req.params;
      const file = req.file;

      if (!file) {
        res.status(400).json({ success: false, error: 'No image file uploaded.' });
        return;
      }

      const caption = typeof req.body.caption === 'string' ? req.body.caption : '';

      // 1. Upload file buffer stream to Cloudinary
      logger.info('Streaming image proof to Cloudinary', {
        userId: req.user.userId,
        conversationId,
        size: file.size,
        mimeType: file.mimetype,
      });

      const uploadResult = await uploadImageBuffer(file.buffer);

      // 2. Persist message in PostgreSQL with cloud image URL
      const savedMessage = await chatService.saveMessage(
        conversationId,
        req.user.userId,
        caption,
        uploadResult.secure_url,
        'IMAGE'
      );

      // 3. Broadcast real-time Socket.io event if io instance is initialized
      if (io) {
        const roomName = `conversation:${conversationId}`;
        io.to(roomName).emit('new_message', {
          message: savedMessage,
          conversationId,
        });

        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { buyerId: true, sellerId: true },
        });

        if (conversation) {
          const recipientId =
            conversation.buyerId === req.user.userId
              ? conversation.sellerId
              : conversation.buyerId;

          io.to(`user:${recipientId}`).emit('conversation_updated', {
            conversationId,
            lastMessage: savedMessage,
            unreadIncrement: 1,
          });
        }
      }

      res.status(201).json({
        success: true,
        message: 'Proof image uploaded and delivered successfully.',
        data: savedMessage,
      });
    } catch (err: any) {
      logger.error('Failed to upload proof image to Cloudinary', { error: err.message });
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Failed to upload image.',
      });
    }
  }

  async flagMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const { messageId } = req.params;
      const { reason } = req.body;

      const flagged = await chatService.flagMessage(messageId, req.user.userId, reason);

      res.status(200).json({
        success: true,
        message: 'Message flagged for administrator review.',
        data: flagged,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Server error.' });
    }
  }
}

export const chatController = new ChatController();


