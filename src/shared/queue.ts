import amqp, { Connection, Channel } from 'amqplib';
import { config } from '../config';
import { logger } from './logger';

let connection: Connection | null = null;
let channel: Channel | null = null;

export const connectQueue = async () => {
  if (connection) return;

  try {
    // Cast to any to avoid type mismatch issues with amqplib versions
    connection = await (amqp as any).connect(config.rabbitmqUrl) as Connection;
    channel = await (connection as any).createChannel();
    
    logger.info('RabbitMQ connected');

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });
    
    connection.on('error', (err) => {
      logger.error(err, 'RabbitMQ connection error');
    });

  } catch (err) {
    logger.error(err, 'Failed to connect to RabbitMQ');
    // Retry logic could be added here
  }
};

export const isConnected = (): boolean => {
  return connection !== null && channel !== null;
};

export const publishMessage = async (queue: string, message: any) => {
  if (!channel) {
    await connectQueue();
  }
  
  if (channel) {
    try {
      await channel.assertQueue(queue, { durable: true });
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
    } catch (err) {
      logger.error(err, `Failed to publish to ${queue}`);
    }
  }
};

export const consumeMessage = async (queue: string, handler: (msg: any) => Promise<void>) => {
  if (!channel) {
    await connectQueue();
  }

  if (channel) {
    try {
      await channel.assertQueue(queue, { durable: true });
      channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await handler(content);
            channel?.ack(msg);
          } catch (err) {
            logger.error(err, `Error processing message from ${queue}`);
            channel?.nack(msg); // or ack if we want to discard
          }
        }
      });
    } catch (err) {
      logger.error(err, `Failed to consume from ${queue}`);
    }
  }
};
