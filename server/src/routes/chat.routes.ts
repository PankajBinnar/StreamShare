import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { chatLimiter } from '../middlewares/rateLimiter.js';
import { validateRequest } from '../middlewares/validator.js';
import { z } from 'zod';

const router = Router();

const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Message cannot be empty').max(2000, 'Max length is 2000 chars'),
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

// Flag/report message
router.post('/messages/:messageId/flag', (req, res) => chatController.flagMessage(req, res));

export default router;

