import { Request, Response, NextFunction } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { credit as processCredit } from '../services/wallet.service';
import { validateSession } from '../services/session.service';
import { creditSchema } from '../../shared/validators';
import { SessionNotFoundError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { cache } from '../../shared/redis';
import { publishMessage } from '../../shared/queue';

/**
 * @openapi
 * /casino/credit:
 *   post:
 *     summary: Credita saldo na carteira do jogador (WIN)
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
 *                 description: Token da sessão ativa
 *               amount:
 *                 type: string
 *                 description: Valor a creditar (string pra evitar floating point)
 *               transactionId:
 *                 type: string
 *                 description: ID externo pra idempotência
 *     responses:
 *       200:
 *         description: Crédito processado
 */
export async function credit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, amount, transactionId } = creditSchema.parse(req.body);

    const session = await validateSession(token);
    if (!session) throw new SessionNotFoundError();

    logger.info({ transactionId, amount, userId: session.userId }, 'Processing credit');

    const result = await processCredit(
      session.userId,
      new Decimal(amount),
      transactionId,
      session.id
    );

    // limpa cache do saldo pq mudou
    await cache.del(`balance:${session.userId}`);
    publishMessage('transaction_audit', {
      type: 'CREDIT',
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
