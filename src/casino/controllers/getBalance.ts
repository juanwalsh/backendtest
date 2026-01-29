import { Request, Response, NextFunction } from 'express';
import { getBalance as fetchBalance } from '../services/wallet.service';
import { validateSession } from '../services/session.service';
import { getBalanceSchema } from '../../shared/validators';
import { SessionNotFoundError } from '../../shared/errors';
import { cache } from '../../shared/redis';

/**
 * @openapi
 * /casino/balance:
 *   post:
 *     summary: Consulta saldo do jogador
 *     tags: [Casino]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Saldo atual do jogador
 */
export async function getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = getBalanceSchema.parse(req.body);

    const session = await validateSession(token);
    if (!session) throw new SessionNotFoundError();

    const cacheKey = `balance:${session.userId}`;
    const cachedBalance = await cache.get(cacheKey);

    if (cachedBalance) {
      res.json({ success: true, userId: session.userId, ...cachedBalance });
      return;
    }

    const wallet = await fetchBalance(session.userId);

    // TODO: avaliar se 60s de cache ta ok ou se precisa ser menor em pico
    await cache.set(cacheKey, {
      playableBalance: wallet.playableBalance,
      redeemableBalance: wallet.redeemableBalance,
      currencyCode: wallet.currencyCode,
    }, 60);

    res.json({
      success: true,
      userId: session.userId,
      playableBalance: wallet.playableBalance,
      redeemableBalance: wallet.redeemableBalance,
      currencyCode: wallet.currencyCode,
    });
  } catch (err) {
    next(err);
  }
}
