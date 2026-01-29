import { Request, Response, NextFunction } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { debit as processDebit } from '../services/wallet.service';
import { validateSession } from '../services/session.service';
import { debitSchema } from '../../shared/validators';
import { SessionNotFoundError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { cache } from '../../shared/redis';
import { publishMessage } from '../../shared/queue';

/**
 * @openapi
 * /casino/debit:
 *   post:
 *     summary: Debita valor da carteira (aposta/BET)
 *     description: Desconta o valor da aposta do saldo jogável. Usa idempotência pelo transactionId.
 *     tags: [Casino]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, amount, transactionId]
 *             properties:
 *               token:
 *                 type: string
 *               amount:
 *                 type: string
 *               transactionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Débito efetuado
 *       400:
 *         description: Saldo insuficiente
 */
export async function debit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, amount, transactionId } = debitSchema.parse(req.body);

    const session = await validateSession(token);
    if (!session) throw new SessionNotFoundError();

    logger.info({ transactionId, amount, userId: session.userId }, 'Processing debit');

    const result = await processDebit(
      session.userId,
      new Decimal(amount),
      transactionId,
      session.id
    );

    await cache.del(`balance:${session.userId}`);

    await publishMessage('transaction_audit', {
      type: 'DEBIT',
      userId: session.userId,
      amount,
      transactionId,
      timestamp: new Date()
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
