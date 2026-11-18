import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/environment.js';
import { logger } from './config/logger.js';
import { globalApiLimiter } from './middlewares/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import apiRouter from './routes/index.js';

export function createApp(): Express {
  const app = express();

  // 1. Trust proxy for reverse proxies (Nginx, AWS ALB, Cloudflare)
  app.set('trust proxy', 1);

  // 2. Helmet - Peak Level HTTP Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://*.googleusercontent.com'],
          connectSrc: ["'self'", env.CLIENT_ORIGIN, 'ws:', 'wss:'],
          frameAncestors: ["'none'"], // Clickjacking defense
          objectSrc: ["'none'"],
          upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000, // 1 year Strict-Transport-Security
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // 3. CORS configuration
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 4. Request Body Parsers with DoS Protection Payload Limits (10kb)
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());

  // 5. Global API Rate Limiter
  app.use('/api', globalApiLimiter);

  // 6. Security Request Logging (PII/message bodies automatically redacted by winston format)
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  });

  // 7. Mount Core API Routes
  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'StreamShare P2P Secure API',
      status: 'online',
      message: 'Backend server is operational and secure.',
      endpoints: {
        health: '/api/health',
        listings: '/api/listings',
        auth: '/api/auth'
      }
    });
  });

  app.use('/api', apiRouter);

  // 8. 404 and Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

