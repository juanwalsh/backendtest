import { Request, Response, NextFunction } from 'express';
import { verifyHmac } from '../../shared/hmac';
import { config } from '../../config';
import { InvalidSignatureError } from '../../shared/errors';

const MAX_TIMESTAMP_DRIFT_MS = 300000; // 5 minutes

export function casinoHmacMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const signature = req.headers['x-casino-signature'] as string;
  const timestamp = req.headers['x-timestamp'] as string;

  if (!signature || !timestamp) {
    throw new InvalidSignatureError();
  }

  const now = Date.now();
  const reqTime = parseInt(timestamp, 10);
  if (Math.abs(now - reqTime) > MAX_TIMESTAMP_DRIFT_MS) {
    throw new InvalidSignatureError();
  }

  const body = JSON.stringify(req.body || '');
  const payload = `${timestamp}:${body}`;

  if (!verifyHmac(config.hmac.casinoSecret, payload, signature)) {
    throw new InvalidSignatureError();
  }

  next();
}
