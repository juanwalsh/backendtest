import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { logger } from './logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: String(issue.path?.join('.') ?? ''),
      message: issue.message,
    }));
    logger.warn({ path: req.path, details }, 'Validation failed');
    res.status(400).json({ error: 'VALIDATION_ERROR', details });
    return;
  }

  if (err instanceof AppError) {
    logger.warn({ code: err.code, path: req.path }, err.message);
    res.status(err.statusCode).json({ error: err.code, message: err.message });
    return;
  }

  if ((err as any).isAxiosError) {
    const axErr = err as any;
    const status = axErr.response?.status || 502;
    const data = axErr.response?.data || { message: 'Upstream service unavailable' };
    logger.error({ status, url: axErr.config?.url }, 'Inter-service call failed');
    res.status(status).json({
      error: 'UPSTREAM_ERROR',
      message: data.message || 'Falha na comunicacao entre servicos',
    });
    return;
  }

  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro interno do servidor' });
}
