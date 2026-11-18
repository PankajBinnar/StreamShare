import rateLimit from 'express-rate-limit';
import { env } from '../config/environment.js';
import { logger } from '../config/logger.js';

export const globalApiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded on global API', { ip: req.ip, path: req.originalUrl });
    res.status(429).json(options.message);
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.AUTH_RATE_LIMIT_MAX, // 10 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Your IP has been temporarily throttled for security.',
  },
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit triggered (potential brute force)', { ip: req.ip, path: req.originalUrl });
    res.status(429).json(options.message);
  },
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.CHAT_RATE_LIMIT_MAX, // 60 messages / minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Message rate limit exceeded. Please slow down to prevent spam.',
  },
  handler: (req, res, next, options) => {
    logger.warn('Chat rate limit triggered', { ip: req.ip, user: (req as any).user?.userId });
    res.status(429).json(options.message);
  },
});

