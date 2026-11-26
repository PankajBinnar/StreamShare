import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { chatLimiter } from '../middlewares/rateLimiter.js';
import { validateRequest } from '../middlewares/validator.js';
import { chatImageUpload } from '../config/cloudinary.js';
import { z } from 'zod';

const router = Router();

const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().max(2000, 'Max length is 2000 chars').optional().default(''),
    imageUrl: z.string().url('Invalid image URL').optional(),
    messageType: z.enum(['TEXT', 'IMAGE']).optional().default('TEXT'),
  }).refine((data) => data.content.trim().length > 0 || !!data.imageUrl, {
    message: 'Either message content or imageUrl must be provided.',
  }),
});

router.use(authenticateJWT);

// Conversation management
router.get('/conversations', (req, res) => chatController.getConversations(req, res));
router.post('/conversations', (req, res) => chatController.startConversation(req, res));

// Messages within conversation
router.get('/conversations/:id/messages', (req, res) => chatController.getMessages(req, res));
router.post(
  '/conversations/:id/messages',
  chatLimiter,
  validateRequest(sendMessageSchema),
  (req, res) => chatController.sendMessage(req, res)
);

// Proof screenshot / image upload to Cloudinary
router.post(
  '/conversations/:id/upload',
  chatLimiter,
  chatImageUpload.single('image'),
  (req, res) => chatController.uploadChatImage(req, res)
);

// Flag/report message
router.post('/messages/:messageId/flag', (req, res) => chatController.flagMessage(req, res));

export default router;

