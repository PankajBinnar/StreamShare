import { prisma } from '../config/prisma.js';
import { sanitizeText, scanMessageSafety } from '../utils/sanitizer.js';
import { logger } from '../config/logger.js';
import { Role } from '@prisma/client';

export class ChatService {
  /**
   * Start or retrieve an existing conversation between buyer and listing seller
   */
  async startOrGetConversation(buyerId: string, listingId: string) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        owner: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    if (!listing) {
      throw { statusCode: 404, message: 'OTT listing does not exist.' };
    }

    if (listing.ownerId === buyerId) {
      throw { statusCode: 400, message: 'You cannot initiate a conversation on your own listing.' };
    }

    // Check for existing conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        listingId_buyerId: {
          listingId,
          buyerId,
        },
      },
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
          select: { id: true, username: true, avatarUrl: true },
        },
        seller: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          listingId,
          buyerId,
          sellerId: listing.ownerId,
        },
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
            select: { id: true, username: true, avatarUrl: true },
          },
          seller: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
      });

      logger.info('New direct P2P conversation started', {
        conversationId: conversation.id,
        listingId,
        buyerId,
        sellerId: listing.ownerId,
      });
    }

    return conversation;
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
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
          select: { id: true, username: true, avatarUrl: true },
        },
        seller: {
          select: { id: true, username: true, avatarUrl: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            senderId: true,
            content: true,
            imageUrl: true,
            messageType: true,
            createdAt: true,
            isRead: true,
          },
        },
      },
    });

    // Compute unread count per conversation
    const mapped = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            isRead: false,
          },
        });

        const counterpart = conv.buyerId === userId ? conv.seller : conv.buyer;

        return {
          id: conv.id,
          listingId: conv.listingId,
          listing: conv.listing,
          counterpart,
          lastMessage: conv.messages[0] || null,
          unreadCount,
          lastMessageAt: conv.lastMessageAt,
          createdAt: conv.createdAt,
        };
      })
    );

    return mapped;
  }

  /**
   * Get messages for a specific conversation
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    userRole: Role,
    page: number = 1,
    limit: number = 50
  ) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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
          select: { id: true, username: true, avatarUrl: true },
        },
        seller: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    if (!conversation) {
      throw { statusCode: 404, message: 'Conversation not found.' };
    }

    // Role check: Only participants or Admin can view messages
    const isParticipant = conversation.buyerId === userId || conversation.sellerId === userId;
    if (!isParticipant && userRole !== Role.ADMIN) {
      throw { statusCode: 403, message: 'Forbidden. You do not have access to this conversation.' };
    }

    const skip = (page - 1) * limit;

    const [total, messages] = await Promise.all([
      prisma.message.count({ where: { conversationId } }),
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
      }),
    ]);

    // Mark messages as read if recipient
    if (isParticipant) {
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          isRead: false,
        },
        data: { isRead: true },
      });
    }

    return {
      conversation,
      messages,
      total,
      page,
      limit,
    };
  }

  /**
   * Persist a message with XSS sanitization, anti-phishing scan, optional proof image, and automated safety flagging
   */
  async saveMessage(
    conversationId: string,
    senderId: string,
    rawContent: string,
    imageUrl?: string | null,
    messageType: string = 'TEXT'
  ) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, buyerId: true, sellerId: true },
    });

    if (!conversation) {
      throw { statusCode: 404, message: 'Conversation not found.' };
    }

    if (conversation.buyerId !== senderId && conversation.sellerId !== senderId) {
      throw { statusCode: 403, message: 'Forbidden: You are not a member of this conversation.' };
    }

    // 1. Sanitize XSS vectors
    let content = rawContent ? sanitizeText(rawContent) : '';
    if (!content && imageUrl) {
      content = 'Shared proof screenshot';
    }

    if (!content && !imageUrl) {
      throw { statusCode: 400, message: 'Message content or image attachment is required.' };
    }

    if (content.length > 2000) {
      throw { statusCode: 400, message: 'Message content exceeds max allowed length of 2000 characters.' };
    }

    // 2. Perform automated safety scan
    const safetyCheck = scanMessageSafety(content);

    // 3. Save message and update conversation in transaction
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          senderId,
          content,
          imageUrl: imageUrl || null,
          messageType: imageUrl ? 'IMAGE' : messageType,
          isRead: false,
          isFlagged: safetyCheck.isFlagged,
          flaggedReason: safetyCheck.reason,
          flaggedAt: safetyCheck.isFlagged ? new Date() : null,
        },
        include: {
          sender: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    if (safetyCheck.isFlagged) {
      logger.warn('Chat message automatically flagged for safety review', {
        messageId: message.id,
        conversationId,
        senderId,
        flagReason: safetyCheck.reason,
      });
    } else {
      logger.info('Message persisted in central PostgreSQL storage', {
        messageId: message.id,
        conversationId,
        senderId,
      });
    }

    return message;
  }

  /**
   * User reports/flags a message manually
   */
  async flagMessage(messageId: string, reportingUserId: string, reason: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      throw { statusCode: 404, message: 'Message not found.' };
    }

    const conv = message.conversation;
    if (conv.buyerId !== reportingUserId && conv.sellerId !== reportingUserId) {
      throw { statusCode: 403, message: 'Forbidden: Not a participant in this conversation.' };
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        isFlagged: true,
        flaggedReason: `User Report: ${sanitizeText(reason || 'Reported by peer')}`,
        flaggedAt: new Date(),
      },
    });

    logger.warn('Message reported by peer user', {
      messageId,
      reportedBy: reportingUserId,
    });

    return updated;
  }
}

export const chatService = new ChatService();

