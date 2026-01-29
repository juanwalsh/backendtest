import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { runWithContext } from './context';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'] as string;
  const requestId = incoming || crypto.randomUUID();

  (req as any).requestId = requestId;
  res.setHeader('x-request-id', requestId);

  runWithContext({ requestId }, () => next());
}
