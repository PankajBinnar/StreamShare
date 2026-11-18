import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/environment.js';
import { logger } from '../config/logger.js';
import { verifyAccessToken, TokenPayload } from '../utils/crypto.js';
import { prisma } from '../config/prisma.js';
import { registerChatHandlers } from './chat.handler.js';
import { cacheService } from '../config/redis.js';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: TokenPayload;
  };
}

export let io: SocketIOServer;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Security Middleware: Socket Handshake Authentication via JWT
  io.use(async (socket: Socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      // Fallback: extract from cookie header if not in auth object
      if (!token && socket.handshake.headers.cookie) {
        const cookies = Object.fromEntries(
          socket.handshake.headers.cookie.split('; ').map((c) => c.split('='))
        );
        token = cookies['access_token'];
      }

      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      // Verify token
      const payload = verifyAccessToken(token);

      // Verify user status in DB
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, isBanned: true, role: true },
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (user.isBanned) {
        return next(new Error('Authentication error: Account suspended'));
      }

      (socket as AuthenticatedSocket).data = {
        user: {
          ...payload,
          role: user.role,
        },
      };

      next();
    } catch (err: any) {
      logger.warn('Socket connection authentication rejected', { error: err.message });
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  // Socket Connection Dispatcher
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, username, role } = authSocket.data.user;

    logger.info('Secure WebSocket client connected', { userId, username, socketId: socket.id });

    // Join user's individual push notification room
    authSocket.join(`user:${userId}`);

    // Track online presence in Redis
    cacheService.setUserOnline(userId).catch(() => {});

    // If administrator, subscribe to moderation alert channel
    if (role === 'ADMIN') {
      authSocket.join('admin:moderation');
      logger.info('Administrator joined moderation surveillance socket room', { userId });
    }

    // Register P2P Chat and event handlers
    registerChatHandlers(io, authSocket);

    authSocket.on('disconnect', (reason) => {
      logger.info('WebSocket client disconnected', { userId, reason });
      cacheService.setUserOffline(userId).catch(() => {});
    });
  });

  return io;
}

