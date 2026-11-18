import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware.js';
import { requireAdminIp } from '../middlewares/ipFilter.js';
import { Role } from '@prisma/client';

const router = Router();

// Strict security layer for all administrative moderation routes
router.use(authenticateJWT);
router.use(authorizeRole([Role.ADMIN]));
router.use(requireAdminIp);

// Admin Moderation Endpoints
router.get('/dashboard', (req, res) => adminController.getDashboard(req, res));
router.get('/conversations', (req, res) => adminController.getConversations(req, res));
router.get('/conversations/:id/transcript', (req, res) => adminController.getTranscript(req, res));
router.post('/messages/:messageId/review', (req, res) => adminController.reviewFlag(req, res));
router.post('/users/:userId/ban', (req, res) => adminController.moderateUser(req, res));
router.post('/listings/:listingId/status', (req, res) => adminController.moderateListing(req, res));
router.get('/audit-logs', (req, res) => adminController.getAuditLogs(req, res));

export default router;

