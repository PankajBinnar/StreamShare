import http from 'http';
import { createApp } from './app.js';
import { initSocketServer } from './sockets/socket.server.js';
import { env } from './config/environment.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

async function bootstrap() {
  try {
    const app = createApp();
    const server = http.createServer(app);

    // Initialize Socket.io real-time engine
    const io = initSocketServer(server);

    const PORT = env.PORT;

    server.listen(PORT, () => {
      logger.info(`🚀 StreamShare Server running in ${env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`🔒 Security Protocols Active: Helmet, TLS/WSS enforcement, Rate Limiting, Central Audit`);
      logger.info(`🌐 Allowed Client Origin: ${env.CLIENT_ORIGIN}`);
    });

    // Graceful Shutdown Handler
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Gracefully closing HTTP & WebSocket servers...`);
      server.close(async () => {
        io.close();
        await prisma.$disconnect();
        logger.info('StreamShare servers and database connections terminated safely.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error: any) {
    logger.error('Fatal bootstrap initialization error', { error: error.message });
    process.exit(1);
  }
}

bootstrap();

