import { prisma } from '../../shared/prisma';
import { GameNotFoundError } from '../../shared/errors';

export async function getGameByRef(gameId: string) {
  const game = await prisma.providerGame.findUnique({
    where: { gameId },
  });

  if (!game) {
    throw new GameNotFoundError();
  }

  return game;
}
