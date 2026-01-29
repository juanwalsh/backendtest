import crypto from 'crypto';
import { prisma } from '../../shared/prisma';
import { GameNotFoundError, UserNotFoundError } from '../../shared/errors';

export interface SessionResult {
  sessionId: number;
  token: string;
  userId: number;
  walletId: number;
  gameId: number;
  providerGameId: string;
}

export async function createSession(userId: number, gameId: number): Promise<SessionResult> {
  const user = await prisma.casinoUser.findUnique({ where: { id: userId } });
  if (!user) throw new UserNotFoundError();

  const wallet = await prisma.casinoWallet.findFirst({ where: { userId } });
  if (!wallet) throw new UserNotFoundError();

  const game = await prisma.casinoGame.findUnique({
    where: { id: gameId },
    include: { provider: true },
  });
  if (!game) throw new GameNotFoundError();

  const token = crypto.randomUUID();
  const session = await prisma.gameSession.create({
    data: { token, userId, walletId: wallet.id, gameId, isActive: true },
  });

  return {
    sessionId: session.id,
    token: session.token,
    userId: session.userId,
    walletId: session.walletId,
    gameId: session.gameId,
    providerGameId: game.providerGameId,
  };
}

export async function validateSession(tkn: string) {
  const session = await prisma.gameSession.findUnique({
    where: { token: tkn },
  });
  if (!session || !session.isActive) return null;
  return session;
}

export async function updateProviderSessionId(token: string, providerSessionId: string) {
  await prisma.gameSession.update({
    where: { token },
    data: { providerSessionId },
  });
}
