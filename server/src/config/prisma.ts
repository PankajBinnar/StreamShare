import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma Database Error', { error: e.message });
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn('Prisma Database Warning', { warning: e.message });
});

