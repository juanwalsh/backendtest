import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL || '',
  },
  hmac: {
    casinoSecret: process.env.CASINO_SECRET || 'casino-secret-key',
    providerSecret: process.env.PROVIDER_SECRET || 'provider-secret-key',
  },
  urls: {
    casinoBaseUrl: process.env.CASINO_BASE_URL || 'http://localhost:3000/casino',
    providerBaseUrl: process.env.PROVIDER_BASE_URL || 'http://localhost:3000/provider',
  },
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
};
