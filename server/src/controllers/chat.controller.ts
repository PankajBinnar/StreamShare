import { Response } from 'express';
import { chatService } from '../services/chat.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class ChatController {
  async startConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  }

  async getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const conversations = await chatService.getUserConversations(req.user.userId);

    res.status(200).json({
      success: true,
      data: conversations,
    });
  }

  async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  }

  async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const { id: conversationId } = req.params;
    const { content } = req.body;

    const message = await chatService.saveMessage(conversationId, req.user.userId, content);

    res.status(201).json({
      success: true,
      data: message,
    });
  }

  async flagMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  }
}

export const chatController = new ChatController();

