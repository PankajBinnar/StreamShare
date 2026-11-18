import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sanitizeObject } from '../utils/sanitizer.js';

export function validateRequest(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Sanitize incoming request objects to eliminate XSS vectors
      if (req.body) req.body = sanitizeObject(req.body);
      if (req.query) req.query = sanitizeObject(req.query);
      if (req.params) req.params = sanitizeObject(req.params);

      // 2. Validate against Zod schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));

        res.status(400).json({
          success: false,
          error: 'Input validation failed.',
          details: issues,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Malformed request payload.',
      });
    }
  };
}

