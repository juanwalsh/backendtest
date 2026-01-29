import { Request, Response, NextFunction } from 'express';
import { createSession, updateProviderSessionId } from '../services/session.service';
import { providerClient, setRequestContext } from '../../shared/httpClient';
import { launchGameSchema } from '../../shared/validators';
import { logger } from '../../shared/logger';

export async function launchGame(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, gameId } = launchGameSchema.parse(req.body);

    setRequestContext((req as any).requestId);

    const session = await createSession(userId, gameId);
    logger.info({ userId, gameId, token: session.token }, 'Session created, calling provider');

    const providerRes = await providerClient.post('/launch', {
      token: session.token,
      userId: session.userId,
      gameId: session.providerGameId,
    });

    if (providerRes.data.providerSessionId) {
      await updateProviderSessionId(session.token, providerRes.data.providerSessionId);
    }

    res.json({
      success: true,
      session: { token: session.token, gameId: session.gameId },
      provider: providerRes.data,
    });
  } catch (err) {
    next(err);
  }
}
