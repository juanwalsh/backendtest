import express from 'express';
import swaggerUi from 'swagger-ui-express';
import client from 'prom-client';
import { config } from './config';
import { logger } from './shared/logger';
import { prisma } from './shared/prisma';
import { requestIdMiddleware } from './shared/requestId';
import casinoRoutes from './casino/routes';
import providerRoutes from './provider/routes';
import { errorHandler } from './shared/errorHandler';
import { swaggerSpec } from './config/swagger';
import { connectQueue, consumeMessage, isConnected as isQueueConnected } from './shared/queue';
import { cache } from './shared/redis';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [5, 15, 50, 100, 200, 500, 1000, 3000]
});
register.registerMetric(httpRequestDurationMicroseconds);

const app = express();

app.use(express.json());
app.use(requestIdMiddleware);

// middleware de métricas por request
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds.labels(req.method, req.route?.path || req.path, res.statusCode.toString()).observe(duration);
  });
  next();
});

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path, requestId: (req as any).requestId }, 'req');
    next();
  });
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.use('/casino', casinoRoutes);
app.use('/provider', providerRoutes);

// TODO: separar health check em arquivo próprio quando tiver mais checks
app.get('/health', async (_req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: 'disconnected',
      redis: 'disconnected',
      rabbitmq: 'disconnected'
    }
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'connected';

    if (cache.isReady()) health.services.redis = 'connected';
    if (isQueueConnected()) health.services.rabbitmq = 'connected';

    const allUp = Object.values(health.services).every(s => s === 'connected');

    if (allUp) {
      res.json({ status: 'ok', ...health });
    } else {
      // retorna 503 mas com detalhes de qual serviço caiu
      res.status(503).json({ status: 'degraded', ...health });
    }
  } catch (error) {
    res.status(503).json({ status: 'error', error: String(error), ...health });
  }
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectQueue();
    await consumeMessage('transaction_audit', async (msg) => {
      logger.info({ msg }, 'AUDIT LOG: Transaction processed');
    });

    const server = app.listen(config.port, () => {
      logger.info({ port: config.port }, 'Casino server started');
      logger.info(`Swagger docs available at http://localhost:${config.port}/api-docs`);
    });

    function shutdown(signal: string) {
      logger.info({ signal }, 'Shutting down...');
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Connections closed, exiting');
        process.exit(0);
      });

      // force exit se demorar demais
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
};

startServer();

export default app;
