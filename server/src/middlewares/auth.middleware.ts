import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/crypto.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Authentication Middleware:
 * Extracts Bearer token from 'Authorization' header or 'access_token' cookie.
 * Verifies JWT signature and checks user ban status.
 */
export async function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // Check Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      // Fallback to cookie
      token = req.cookies.access_token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. No valid access token provided.',
      });
      return;
    }

    // Verify JWT
    let payload: TokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired access token.',
      });
      return;
    }

    // Check if user is banned or active in DB
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isBanned: true, role: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User account not found or has been revoked.',
      });
      return;
    }

    if (user.isBanned) {
      logger.warn('Banned user attempt to access protected resource', { userId: user.id });
      res.status(403).json({
        success: false,
        error: 'Access denied. This account has been suspended for security policy violations.',
      });
      return;
    }

    // Attach validated payload to request
    req.user = {
      ...payload,
      role: user.role, // Use latest role from DB
    };

    next();
  } catch (error: any) {
    logger.error('Unexpected error in authenticateJWT middleware', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal security authentication error.' });
  }
}

/**
 * Role-Based Access Control (RBAC) Guard
 */
export function authorizeRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthenticated.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.originalUrl,
      });

      res.status(403).json({
        success: false,
        error: 'Forbidden. Insufficient administrative privileges.',
      });
      return;
    }

    next();
  };
}

