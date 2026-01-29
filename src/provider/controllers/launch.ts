import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../shared/prisma';
import { providerLaunchSchema } from '../../shared/validators';
import { logger } from '../../shared/logger';

export async function launch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, userId, gameId } = providerLaunchSchema.parse(req.body);

    // mapear jogador do casino no provider
    const customer = await prisma.providerCustomer.upsert({
      where: {
        casinoCode_externalUserId: {
          casinoCode: 'CASINO_MAIN',
          externalUserId: userId,
        },
      },
      create: {
        playerId: `player_${userId}`,
        casinoCode: 'CASINO_MAIN',
        externalUserId: userId,
      },
      update: {},
    });

    const game = await prisma.providerGame.findUnique({ where: { gameId } });
    if (!game) {
      res.status(404).json({ error: 'GAME_NOT_FOUND', message: 'Jogo nao encontrado no provider' });
      return;
    }

    logger.info({ token, playerId: customer.id, gameId }, 'Provider session launched');

    res.json({
      success: true,
      providerSessionId: `psession_${token}`,
      playerId: customer.id,
      gameId: game.gameId,
    });
  } catch (err) {
    next(err);
  }
}
