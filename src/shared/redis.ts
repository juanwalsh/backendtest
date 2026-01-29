import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

const redis = new Redis(config.redisUrl, {
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  // console.log('redis ok');
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error(err, 'Redis connection error');
});

export const cache = {
  get: async (key: string) => {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error(err, `Redis get error for key ${key}`);
      return null;
    }
  },
  set: async (key: string, value: any, ttlSeconds: number = 3600) => {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      logger.error(err, `Redis set error for key ${key}`);
    }
  },
  del: async (key: string) => {
    try {
      await redis.del(key);
    } catch (err) {
      logger.error(err, `Redis del error for key ${key}`);
    }
  },
  isReady: () => redis.status === 'ready',
  client: redis,
};
