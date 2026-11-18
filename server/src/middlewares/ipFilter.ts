import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { env } from '../config/environment.js';
import { logger } from '../config/logger.js';

export function requireAdminIp(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // If set to wildcard '*', bypass strict IP filtering (useful for testing or staging)
  if (env.ADMIN_ALLOWED_IPS.trim() === '*') {
    return next();
  }

  const allowedIps = env.ADMIN_ALLOWED_IPS.split(',').map((ip) => ip.trim());

  // Extract client IP from headers (behind proxy) or connection remote address
  const clientIp = (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    req.ip ||
    ''
  ).trim();

  // Normalize IPv6 mapped IPv4 addresses (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
  const normalizedClientIp = clientIp.replace(/^::ffff:/, '');

  const isAllowed = allowedIps.some((allowed) => {
    const normalizedAllowed = allowed.replace(/^::ffff:/, '');
    return normalizedAllowed === normalizedClientIp || allowed === clientIp;
  });

  if (!isAllowed) {
    logger.warn('Admin route blocked by IP firewall filter', {
      clientIp,
      normalizedClientIp,
      allowedIps,
      userId: req.user?.userId,
      path: req.originalUrl,
    });

    res.status(403).json({
      success: false,
      error: 'Security Policy Violation: Access to administrative portals is restricted to whitelisted IP addresses.',
    });
    return;
  }

  next();
}

