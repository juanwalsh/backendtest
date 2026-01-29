import { Request, Response, NextFunction } from 'express';
import { simulateFullRound } from '../services/round.service';
import { providerSimulateSchema } from '../../shared/validators';
import { logger } from '../../shared/logger';

export async function simulate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = providerSimulateSchema.parse(req.body);

    logger.info({ token }, 'Provider starting round simulation');
    const result = await simulateFullRound(token);
    logger.info({ roundId: result.roundId, finalBalance: result.finalBalance }, 'Round simulation finished');

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
