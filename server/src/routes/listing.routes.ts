import { Router } from 'express';
import { listingController } from '../controllers/listing.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validator.js';
import { z } from 'zod';

const router = Router();

const createListingSchema = z.object({
  body: z.object({
    platformName: z.string().min(2, 'Platform name must be at least 2 characters').max(80),
    category: z.enum(['VIDEO', 'MUSIC', 'GAMING', 'PRODUCTIVITY']).optional(),
    price: z.union([z.number().positive('Price must be greater than zero'), z.string().regex(/^\d+(\.\d{1,2})?$/)]),
    currency: z.string().max(4).optional(),
    billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'BIANNUAL', 'YEARLY']).optional(),
    slotsAvailable: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).optional(),
    description: z.string().min(10, 'Description must be at least 10 characters').max(1500),
    terms: z.string().max(1000).optional(),
  }),
});

router.get('/', (req, res) => listingController.getListings(req, res));
router.get('/:id', (req, res) => listingController.getListingById(req, res));

router.post(
  '/',
  authenticateJWT,
  validateRequest(createListingSchema),
  (req, res) => listingController.createListing(req, res)
);

router.put('/:id', authenticateJWT, (req, res) => listingController.updateListing(req, res));
router.delete('/:id', authenticateJWT, (req, res) => listingController.deleteListing(req, res));

export default router;

