import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validateRequest } from '../middlewares/validator.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username max length is 30')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and dashes'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    role: z.enum(['USER', 'ADMIN']).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'Google idToken is required'),
  }),
});

// Auth Routes with Brute Force Throttling
router.post('/register', authLimiter, validateRequest(registerSchema), (req, res) =>
  authController.register(req, res)
);

router.post('/login', authLimiter, validateRequest(loginSchema), (req, res) =>
  authController.login(req, res)
);

router.post('/google', authLimiter, validateRequest(googleAuthSchema), (req, res) =>
  authController.googleAuth(req, res)
);

router.post('/refresh', authLimiter, (req, res) =>
  authController.refresh(req, res)
);

router.post('/logout', (req, res) =>
  authController.logout(req, res)
);

router.get('/me', authenticateJWT, (req, res) =>
  authController.getMe(req, res)
);

export default router;

