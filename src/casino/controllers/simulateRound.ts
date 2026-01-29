import { Request, Response, NextFunction } from 'express';
import { createSession, updateProviderSessionId } from '../services/session.service';
import { providerClient, setRequestContext } from '../../shared/httpClient';
import { simulateRoundSchema } from '../../shared/validators';
import { logger } from '../../shared/logger';

export async function simulateRound(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = simulateRoundSchema.parse(req.body);

    setRequestContext((req as any).requestId);
    logger.info(body, 'Starting round simulation');

    // launch
    const session = await createSession(body.userId, body.gameId);
    const launchRes = await providerClient.post('/launch', {
      token: session.token,
      userId: session.userId,
      gameId: session.providerGameId,
    });

    if (launchRes.data.providerSessionId) {
      await updateProviderSessionId(session.token, launchRes.data.providerSessionId);
    }

    // simulate
    const simRes = await providerClient.post('/simulate', { token: session.token });

    logger.info({ token: session.token, finalBalance: simRes.data.finalBalance }, 'Simulation complete');

    res.json({
      success: true,
      token: session.token,
      simulation: simRes.data,
    });
  } catch (err) {
    next(err);
  }
}
