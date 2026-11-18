// @ts-ignore
import Redis from 'ioredis';
import { env } from './environment.js';
import { logger } from './logger.js';

class CacheService {
  private redisClient: any = null;
  private isConnected = false;
  // In-memory fallback cache for resilience if Redis is temporarily unreachable
  private memoryFallback = new Map<string, { value: string; expiresAt: number }>();

  constructor() {
    if (!env.ENABLE_CACHE) {
      logger.info('Cache layer is disabled via configuration.');
      return;
    }

    try {
      this.redisClient = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy(times: number) {
          // Reconnect with capped backoff up to 3000ms
          return Math.min(times * 100, 3000);
        },
      });

      this.redisClient.on('connect', () => {
        this.isConnected = true;
        logger.info('✅ Successfully connected to Redis Cache Stack', { url: env.REDIS_URL });
      });

      this.redisClient.on('error', (err: any) => {
        this.isConnected = false;
        logger.warn('Redis Cache Stack connection warning. Active fallback to in-memory cache.', {
          error: err.message,
        });
      });

      this.redisClient.on('close', () => {
        this.isConnected = false;
      });
    } catch (e: any) {
      this.isConnected = false;
      logger.warn('Failed to initialize Redis client. Falling back to in-memory caching.', {
        error: e.message,
      });
    }
  }

  /**
   * Retrieve cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    if (!env.ENABLE_CACHE) return null;

    try {
      if (this.isConnected && this.redisClient) {
        const raw = await this.redisClient.get(key);
        if (raw) {
          return JSON.parse(raw) as T;
        }
        return null;
      }
    } catch (err: any) {
      logger.debug('Redis GET error, falling back to in-memory', { key, error: err.message });
    }

    // In-memory fallback check
    const entry = this.memoryFallback.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return JSON.parse(entry.value) as T;
      }
      this.memoryFallback.delete(key);
    }
    return null;
  }

  /**
   * Set cache key with Time-To-Live in seconds
   */
  async set(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
    if (!env.ENABLE_CACHE) return;

    const serialized = JSON.stringify(value);

    try {
      if (this.isConnected && this.redisClient) {
        await this.redisClient.set(key, serialized, 'EX', ttlSeconds);
        return;
      }
    } catch (err: any) {
      logger.debug('Redis SET error, saving to in-memory fallback', { key, error: err.message });
    }

    // In-memory fallback
    this.memoryFallback.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete an individual cache key
   */
  async del(key: string): Promise<void> {
    try {
      if (this.isConnected && this.redisClient) {
        await this.redisClient.del(key);
      }
    } catch (err: any) {
      logger.debug('Redis DEL error', { key, error: err.message });
    }
    this.memoryFallback.delete(key);
  }

  /**
   * Invalidate multiple keys matching a pattern (e.g. 'listings:*')
   * Uses non-blocking SCAN instead of KEYS to avoid freezing Redis
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      if (this.isConnected && this.redisClient) {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = nextCursor;
          if (keys.length > 0) {
            await this.redisClient.del(...keys);
          }
        } while (cursor !== '0');
      }
    } catch (err: any) {
      logger.debug('Redis SCAN/DEL pattern error', { pattern, error: err.message });
    }

    // Clean matching in-memory fallback keys
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryFallback.keys()) {
      if (regexPattern.test(key)) {
        this.memoryFallback.delete(key);
      }
    }
  }

  /**
   * User Online Presence Tracking via Redis
   */
  async setUserOnline(userId: string): Promise<void> {
    const key = `user:${userId}:online`;
    await this.set(key, { online: true, timestamp: Date.now() }, 120); // 2 minute heartbeat
  }

  async setUserOffline(userId: string): Promise<void> {
    const key = `user:${userId}:online`;
    await this.del(key);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const key = `user:${userId}:online`;
    const val = await this.get<{ online: boolean }>(key);
    return !!val?.online;
  }

  /**
   * Batch check online status for multiple users
   */
  async getOnlineStatusBatch(userIds: string[]): Promise<Record<string, boolean>> {
    const statusMap: Record<string, boolean> = {};
    if (!userIds || userIds.length === 0) return statusMap;

    await Promise.all(
      userIds.map(async (id) => {
        statusMap[id] = await this.isUserOnline(id);
      })
    );

    return statusMap;
  }
}

export const cacheService = new CacheService();

