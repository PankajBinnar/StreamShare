import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { env } from '../config/environment.js';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Unhandled application exception', {
    error: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  });

  // Prisma Unique Constraint Violation (e.g., P2002)
  if (err.code === 'P2002') {
    res.status(409).json({
      success: false,
      error: 'Conflict: A record with this unique identifier or email already exists.',
    });
    return;
  }

  // Prisma Foreign Key Constraint (P2003)
  if (err.code === 'P2003') {
    res.status(400).json({
      success: false,
      error: 'Invalid reference: Related entity does not exist.',
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message =
    env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected internal security error occurred.'
      : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

