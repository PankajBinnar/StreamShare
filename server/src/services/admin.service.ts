import { prisma } from '../config/prisma.js';
import { ListingStatus } from '@prisma/client';
import { logger } from '../config/logger.js';
import { cacheService } from '../config/redis.js';

export interface AuditLogDTO {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string;
  ipAddress: string;
  userAgent?: string;
  metadata?: any;
}

export class AdminService {
  /**
   * Record security and moderation audit event
   */
  async createAuditLog(data: AuditLogDTO) {
    return prisma.auditLog.create({
      data: {
        adminId: data.adminId,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Summary metrics for the Admin Moderation Dashboard with Redis Caching (45s TTL)
   */
  async getDashboardOverview() {
    const cacheKey = 'admin:dashboard:stats';
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      logger.debug('Redis Cache HIT for Admin Dashboard KPIs');
      return cached;
    }

    const [
      totalUsers,
      activeListings,
      totalConversations,
      flaggedMessagesCount,
      bannedUsersCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count({ where: { status: ListingStatus.ACTIVE } }),
      prisma.conversation.count(),
      prisma.message.count({ where: { isFlagged: true } }),
      prisma.user.count({ where: { isBanned: true } }),
    ]);

    const result = {
      totalUsers,
      activeListings,
      totalConversations,
      flaggedMessagesCount,
      bannedUsersCount,
    };

    await cacheService.set(cacheKey, result, 45); // Cache for 45 seconds
    return result;
  }

  /**
   * Get all conversations with participant details and flagged message indicators
   */
  async getAllConversations(query: { flaggedOnly?: boolean; page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.flaggedOnly) {
      where.messages = {
        some: { isFlagged: true },
      };
    }

    const [total, conversations] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          listing: {
            select: {
              id: true,
              platformName: true,
              price: true,
              currency: true,
              status: true,
            },
          },
          buyer: {
            select: { id: true, username: true, email: true, isBanned: true },
          },
          seller: {
            select: { id: true, username: true, email: true, isBanned: true },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
    ]);

    // Attach flagged count per conversation
    const enriched = await Promise.all(
      conversations.map(async (c) => {
        const flaggedCount = await prisma.message.count({
          where: {
            conversationId: c.id,
            isFlagged: true,
          },
        });
        return {
          ...c,
          flaggedCount,
        };
      })
    );

    return {
      items: enriched,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Administrative inspection of a specific conversation transcript
   * Automatically audited for compliance
   */
  async getConversationTranscript(adminId: string, ipAddress: string, conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        listing: true,
        buyer: {
          select: { id: true, username: true, email: true, role: true, isBanned: true, createdAt: true },
        },
        seller: {
          select: { id: true, username: true, email: true, role: true, isBanned: true, createdAt: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw { statusCode: 404, message: 'Conversation not found.' };
    }

    // Record administrative surveillance in audit trail
    await this.createAuditLog({
      adminId,
      action: 'INSPECT_CONVERSATION_TRANSCRIPT',
      targetType: 'CONVERSATION',
      targetId: conversationId,
      ipAddress,
      metadata: {
        messageCount: conversation.messages.length,
        buyerId: conversation.buyerId,
        sellerId: conversation.sellerId,
      },
    });

    logger.info('Admin inspected conversation transcript', {
      adminId,
      conversationId,
      ipAddress,
    });

    return conversation;
  }

  /**
   * Action on a flagged message (Dismiss flag or Delete message)
   */
  async reviewFlaggedMessage(
    adminId: string,
    ipAddress: string,
    messageId: string,
    action: 'DISMISS' | 'DELETE',
    notes?: string
  ) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw { statusCode: 404, message: 'Message not found.' };
    }

    if (action === 'DISMISS') {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          isFlagged: false,
          flaggedReason: null,
          flaggedAt: null,
        },
      });
    } else if (action === 'DELETE') {
      await prisma.message.delete({
        where: { id: messageId },
      });
    }

    await this.createAuditLog({
      adminId,
      action: `FLAG_ACTION_${action}`,
      targetType: 'MESSAGE',
      targetId: messageId,
      ipAddress,
      metadata: { notes, originalSender: message.senderId },
    });

    await cacheService.del('admin:dashboard:stats');

    return { messageId, action, status: 'completed' };
  }

  /**
   * Ban or unban a user
   */
  async setUserBanStatus(adminId: string, ipAddress: string, targetUserId: string, ban: boolean, reason?: string) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw { statusCode: 404, message: 'Target user not found.' };
    }

    if (user.role === 'ADMIN') {
      throw { statusCode: 400, message: 'Cannot ban another administrator account.' };
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned: ban },
    });

    if (ban) {
      // Invalidate all active sessions for the banned user
      await prisma.refreshToken.updateMany({
        where: { userId: targetUserId },
        data: { revoked: true },
      });
    }

    await this.createAuditLog({
      adminId,
      action: ban ? 'BAN_USER' : 'UNBAN_USER',
      targetType: 'USER',
      targetId: targetUserId,
      ipAddress,
      metadata: { reason },
    });

    logger.warn(`Admin ${ban ? 'banned' : 'unbanned'} user`, {
      adminId,
      targetUserId,
      reason,
    });

    await cacheService.del('admin:dashboard:stats');

    return { userId: targetUserId, isBanned: ban };
  }

  /**
   * Suspend or change status of a listing
   */
  async setListingStatus(adminId: string, ipAddress: string, listingId: string, status: ListingStatus, reason?: string) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw { statusCode: 404, message: 'Listing not found.' };
    }

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: { status },
    });

    await this.createAuditLog({
      adminId,
      action: `LISTING_STATUS_${status}`,
      targetType: 'LISTING',
      targetId: listingId,
      ipAddress,
      metadata: { reason, previousStatus: listing.status },
    });

    await cacheService.del('admin:dashboard:stats');
    await cacheService.del(`listing:${listingId}`);
    await cacheService.delPattern('listings:*');

    return updated;
  }

  /**
   * Fetch system audit logs for administrative review
   */
  async getAuditLogs(page: number = 1, limit: number = 25) {
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { id: true, username: true, email: true },
          },
        },
      }),
    ]);

    return {
      items: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch all users with search, role filters, and counts
   */
  async getAllUsers(options: { page?: number; limit?: number; search?: string; role?: string }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.search) {
      where.OR = [
        { email: { contains: options.search, mode: 'insensitive' } },
        { username: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    if (options.role && (options.role === 'ADMIN' || options.role === 'USER')) {
      where.role = options.role;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          avatarUrl: true,
          isBanned: true,
          authProvider: true,
          createdAt: true,
          _count: {
            select: {
              listings: true,
              sentMessages: true,
              buyerConversations: true,
              sellerConversations: true,
            },
          },
        },
      }),
    ]);

    return {
      items: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Permanently delete a user account and associated resources
   */
  async deleteUser(adminId: string, ipAddress: string, targetUserId: string) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found.' };
    }

    if (user.id === adminId) {
      throw { statusCode: 400, message: 'You cannot delete your own admin account.' };
    }

    // 1. Delete refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId: targetUserId } });

    // 2. Delete conversations and messages
    const userConversations = await prisma.conversation.findMany({
      where: { OR: [{ buyerId: targetUserId }, { sellerId: targetUserId }] },
      select: { id: true },
    });
    const convIds = userConversations.map((c) => c.id);

    if (convIds.length > 0) {
      await prisma.message.deleteMany({ where: { conversationId: { in: convIds } } });
      await prisma.conversation.deleteMany({ where: { id: { in: convIds } } });
    }

    // 3. Delete messages sent in other conversations
    await prisma.message.deleteMany({ where: { senderId: targetUserId } });

    // 4. Delete listings owned by user
    await prisma.listing.deleteMany({ where: { ownerId: targetUserId } });

    // 5. Delete the user
    await prisma.user.delete({ where: { id: targetUserId } });

    await this.createAuditLog({
      adminId,
      action: 'DELETE_USER',
      targetType: 'USER',
      targetId: targetUserId,
      ipAddress,
      metadata: { deletedEmail: user.email, deletedUsername: user.username },
    });

    await cacheService.del('admin:dashboard:stats');
    logger.warn('Admin permanently deleted user account', { adminId, targetUserId, email: user.email });

    return { success: true, deletedUserId: targetUserId };
  }

  /**
   * Fetch all postings / listings with pagination and filters
   */
  async getAllListings(options: { page?: number; limit?: number; search?: string; status?: ListingStatus }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) {
      where.status = options.status;
    }
    if (options.search) {
      where.OR = [
        { platformName: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [total, listings] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, username: true, email: true, isBanned: true },
          },
          _count: {
            select: { conversations: true },
          },
        },
      }),
    ]);

    return {
      items: listings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete a listing and purge its associated chats
   */
  async deleteListing(adminId: string, ipAddress: string, listingId: string) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw { statusCode: 404, message: 'Listing not found.' };
    }

    // 1. Delete conversations & messages tied to listing
    const conversations = await prisma.conversation.findMany({
      where: { listingId },
      select: { id: true },
    });
    const convIds = conversations.map((c) => c.id);

    if (convIds.length > 0) {
      await prisma.message.deleteMany({ where: { conversationId: { in: convIds } } });
      await prisma.conversation.deleteMany({ where: { id: { in: convIds } } });
    }

    // 2. Delete the listing
    await prisma.listing.delete({ where: { id: listingId } });

    await this.createAuditLog({
      adminId,
      action: 'DELETE_LISTING',
      targetType: 'LISTING',
      targetId: listingId,
      ipAddress,
      metadata: { platform: listing.platformName, ownerId: listing.ownerId },
    });

    await cacheService.del('admin:dashboard:stats');
    await cacheService.del(`listing:${listingId}`);
    await cacheService.delPattern('listings:*');

    return { success: true, deletedListingId: listingId };
  }

  /**
   * Delete an entire conversation
   */
  async deleteConversation(adminId: string, ipAddress: string, conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw { statusCode: 404, message: 'Conversation not found.' };
    }

    await prisma.message.deleteMany({ where: { conversationId } });
    await prisma.conversation.delete({ where: { id: conversationId } });

    await this.createAuditLog({
      adminId,
      action: 'DELETE_CONVERSATION',
      targetType: 'CONVERSATION',
      targetId: conversationId,
      ipAddress,
      metadata: { buyerId: conversation.buyerId, sellerId: conversation.sellerId },
    });

    await cacheService.del('admin:dashboard:stats');
    return { success: true, deletedConversationId: conversationId };
  }
}

export const adminService = new AdminService();

