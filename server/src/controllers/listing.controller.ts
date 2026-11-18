import { Response } from 'express';
import { listingService } from '../services/listing.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { Category, ListingStatus } from '@prisma/client';

export class ListingController {
  async createListing(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const { platformName, category, price, currency, billingCycle, slotsAvailable, description, terms } = req.body;

    const listing = await listingService.createListing({
      ownerId: req.user.userId,
      platformName,
      category,
      price: parseFloat(price),
      currency,
      billingCycle,
      slotsAvailable: slotsAvailable ? parseInt(slotsAvailable, 10) : 1,
      description,
      terms,
    });

    res.status(201).json({
      success: true,
      message: 'Listing posted successfully.',
      data: listing,
    });
  }

  async getListings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { category, platform, search, minPrice, maxPrice, status, page, limit, sortBy } = req.query;

    const result = await listingService.getListings({
      category: category as Category | undefined,
      platform: platform as string | undefined,
      search: search as string | undefined,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      status: status as ListingStatus | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 12,
      sortBy: sortBy as any,
    });

    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  }

  async getListingById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const listing = await listingService.getListingById(id);

    res.status(200).json({
      success: true,
      data: listing,
    });
  }

  async updateListing(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const { id } = req.params;
    const { platformName, category, price, currency, billingCycle, slotsAvailable, description, terms, status } = req.body;

    const updated = await listingService.updateListing(id, req.user.userId, req.user.role, {
      platformName,
      category,
      price: price !== undefined ? parseFloat(price) : undefined,
      currency,
      billingCycle,
      slotsAvailable: slotsAvailable !== undefined ? parseInt(slotsAvailable, 10) : undefined,
      description,
      terms,
      status,
    });

    res.status(200).json({
      success: true,
      message: 'Listing updated successfully.',
      data: updated,
    });
  }

  async deleteListing(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const { id } = req.params;
    await listingService.deleteListing(id, req.user.userId, req.user.role);

    res.status(200).json({
      success: true,
      message: 'Listing removed successfully.',
    });
  }
}

export const listingController = new ListingController();

