import { Response } from 'express';
import { adminService } from '../services/admin.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { ListingStatus } from '@prisma/client';

export class AdminController {
  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const stats = await adminService.getDashboardOverview();
    res.status(200).json({
      success: true,
      data: stats,
    });
  }

  async getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { flaggedOnly, page, limit } = req.query;

    const result = await adminService.getAllConversations({
      flaggedOnly: flaggedOnly === 'true',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  }

  async getTranscript(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id: conversationId } = req.params;
    const adminId = req.user!.userId;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    const transcript = await adminService.getConversationTranscript(adminId, ipAddress, conversationId);

    res.status(200).json({
      success: true,
      data: transcript,
    });
  }

  async reviewFlag(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { messageId } = req.params;
    const { action, notes } = req.body;
    const adminId = req.user!.userId;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    if (!['DISMISS', 'DELETE'].includes(action)) {
      res.status(400).json({ success: false, error: 'Action must be DISMISS or DELETE.' });
      return;
    }

    const result = await adminService.reviewFlaggedMessage(adminId, ipAddress, messageId, action, notes);

    res.status(200).json({
      success: true,
      message: `Message flag action ${action} executed.`,
      data: result,
    });
  }

  async moderateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const { ban, reason } = req.body;
    const adminId = req.user!.userId;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    const result = await adminService.setUserBanStatus(adminId, ipAddress, userId, Boolean(ban), reason);

    res.status(200).json({
      success: true,
      message: `User ${ban ? 'banned' : 'unbanned'} successfully.`,
      data: result,
    });
  }

  async moderateListing(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { listingId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user!.userId;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    const result = await adminService.setListingStatus(
      adminId,
      ipAddress,
      listingId,
      status as ListingStatus,
      reason
    );

    res.status(200).json({
      success: true,
      message: `Listing status updated to ${status}.`,
      data: result,
    });
  }

  async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page, limit } = req.query;

    const result = await adminService.getAuditLogs(
      page ? parseInt(page as string, 10) : 1,
      limit ? parseInt(limit as string, 10) : 25
    );

    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  }
}

export const adminController = new AdminController();

