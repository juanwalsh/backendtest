import { Request, Response, NextFunction } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { rollback as processRollback } from '../services/wallet.service';
import { validateSession } from '../services/session.service';
import { rollbackSchema } from '../../shared/validators';
import { SessionNotFoundError } from '../../shared/errors';
import { logger } from '../../shared/logger';

export async function rollback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, amount, transactionId, originalTransactionId } = rollbackSchema.parse(req.body);

    const session = await validateSession(token);
    if (!session) throw new SessionNotFoundError();

    logger.warn({ transactionId, originalTransactionId, userId: session.userId }, 'Processing rollback');

    const result = await processRollback(
      session.userId,
      new Decimal(amount),
      transactionId,
      originalTransactionId,
      session.id
    );

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
