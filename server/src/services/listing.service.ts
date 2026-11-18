import { prisma } from '../config/prisma.js';
import { Category, BillingCycle, ListingStatus, Prisma } from '@prisma/client';
import { logger } from '../config/logger.js';
import { cacheService } from '../config/redis.js';

export interface CreateListingDTO {
  ownerId: string;
  platformName: string;
  category?: Category;
  price: number;
  currency?: string;
  billingCycle?: BillingCycle;
  slotsAvailable?: number;
  description: string;
  terms?: string;
}

export interface UpdateListingDTO {
  platformName?: string;
  category?: Category;
  price?: number;
  currency?: string;
  billingCycle?: BillingCycle;
  slotsAvailable?: number;
  description?: string;
  terms?: string;
  status?: ListingStatus;
}

export interface ListingFilterQuery {
  category?: Category;
  platform?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: ListingStatus;
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'price_asc' | 'price_desc';
}

export class ListingService {
  async createListing(data: CreateListingDTO) {
    const listing = await prisma.listing.create({
      data: {
        ownerId: data.ownerId,
        platformName: data.platformName,
        category: data.category || Category.VIDEO,
        price: data.price,
        currency: data.currency || 'USD',
        billingCycle: data.billingCycle || BillingCycle.MONTHLY,
        slotsAvailable: data.slotsAvailable || 1,
        description: data.description,
        terms: data.terms,
        status: ListingStatus.ACTIVE,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    });

    // Invalidate listings feed cache so new listing is visible immediately
    await cacheService.delPattern('listings:*');

    logger.info('OTT Subscription Listing created (cache invalidated)', {
      listingId: listing.id,
      platform: listing.platformName,
      ownerId: listing.ownerId,
    });

    return listing;
  }

  async getListings(query: ListingFilterQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 12));
    const skip = (page - 1) * limit;

    // 1. Build deterministic Redis Cache Key
    const cacheKey = `listings:cat=${query.category || 'all'}:plat=${query.platform || 'all'}:q=${query.search || ''}:min=${query.minPrice ?? 0}:max=${query.maxPrice ?? 0}:st=${query.status || 'ACTIVE'}:p=${page}:l=${limit}:sort=${query.sortBy || 'newest'}`;

    // 2. Check Redis Cache
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      logger.debug('Redis Cache HIT for listings feed', { cacheKey });
      return cached;
    }

    logger.debug('Redis Cache MISS for listings feed. Querying PostgreSQL...', { cacheKey });

    const where: Prisma.ListingWhereInput = {
      // By default show ACTIVE listings unless specified
      status: query.status ? query.status : ListingStatus.ACTIVE,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.platform) {
      where.platformName = {
        contains: query.platform,
        mode: 'insensitive',
      };
    }

    if (query.search) {
      where.OR = [
        { platformName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }

    let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (query.sortBy === 'price_desc') {
      orderBy = { price: 'desc' };
    }

    const [total, items] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              conversations: true,
            },
          },
        },
      }),
    ]);

    const result = {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // 3. Store result in Redis Cache with 60-second TTL
    await cacheService.set(cacheKey, result, 60);

    return result;
  }

  async getListingById(id: string) {
    const cacheKey = `listing:${id}`;

    // 1. Check Redis Cache
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      logger.debug('Redis Cache HIT for listing details', { listingId: id });
      return cached;
    }

    // 2. Query PostgreSQL
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            createdAt: true,
            _count: {
              select: {
                listings: true,
              },
            },
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    if (!listing) {
      throw { statusCode: 404, message: 'OTT listing not found.' };
    }

    // 3. Cache listing details for 300 seconds (5 minutes)
    await cacheService.set(cacheKey, listing, 300);

    return listing;
  }

  async updateListing(id: string, userId: string, userRole: string, data: UpdateListingDTO) {
    const existing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'OTT listing not found.' };
    }

    if (existing.ownerId !== userId && userRole !== 'ADMIN') {
      throw { statusCode: 403, message: 'Forbidden. You can only update your own listings.' };
    }

    const updated = await prisma.listing.update({
      where: { id },
      data,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Invalidate cached detail & feed
    await cacheService.del(`listing:${id}`);
    await cacheService.delPattern('listings:*');

    logger.info('OTT listing updated (cache purged)', { listingId: id, updatedBy: userId });
    return updated;
  }

  async deleteListing(id: string, userId: string, userRole: string) {
    const existing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!existing) {
      throw { statusCode: 404, message: 'OTT listing not found.' };
    }

    if (existing.ownerId !== userId && userRole !== 'ADMIN') {
      throw { statusCode: 403, message: 'Forbidden. You can only delete your own listings.' };
    }

    await prisma.listing.delete({
      where: { id },
    });

    // Invalidate cached detail & feed
    await cacheService.del(`listing:${id}`);
    await cacheService.delPattern('listings:*');

    logger.info('OTT listing deleted (cache purged)', { listingId: id, deletedBy: userId });
  }
}

export const listingService = new ListingService();
