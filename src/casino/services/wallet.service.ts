import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../shared/prisma';
import { InsufficientBalanceError, UserNotFoundError } from '../../shared/errors';

export interface TransactionResult {
  transactionId: string;
  externalTransactionId: string;
  transactionType: string;
  amount: string;
  balanceAfter: string;
  status: string;
}

// monta resultado a partir do cache quando a transação já foi processada (idempotência)
function cachedResult(existing: any, fallbackStatus = 'COMPLETED'): TransactionResult {
  if (existing.responseCache) return JSON.parse(existing.responseCache);
  return {
    transactionId: existing.id.toString(),
    externalTransactionId: existing.externalTransactionId,
    transactionType: existing.transactionType,
    amount: existing.amount.toString(),
    balanceAfter: existing.balanceAfter.toString(),
    status: fallbackStatus,
  };
}

// trava a linha da carteira com SELECT FOR UPDATE pra evitar race condition entre requests simultâneos
async function lockWallet(tx: any, userId: number) {
  const rows = await tx.$queryRaw<Array<{
    id: number;
    playable_balance: Decimal;
  }>>`SELECT id, playable_balance FROM "CASINO_WALLETS" WHERE "user_id" = ${userId} FOR UPDATE`;

  if (!rows?.length) throw new UserNotFoundError();
  return rows[0];
}

// aplica movimentação no saldo e persiste o registro da transação
async function applyBalanceChange(
  tx: any,
  walletId: number,
  currentBalance: Decimal,
  amount: Decimal,
  direction: 'add' | 'sub',
  txType: string,
  externalTransactionId: string,
  sessionId?: number,
  relatedExternalTransactionId?: string,
): Promise<TransactionResult> {
  const balanceAfter = direction === 'add'
    ? currentBalance.plus(amount)
    : currentBalance.minus(amount);

  await tx.$executeRaw`UPDATE "CASINO_WALLETS" SET "playable_balance" = ${balanceAfter}::decimal(18,2), "updated_at" = NOW() WHERE id = ${walletId}`;

  const result: TransactionResult = {
    transactionId: '',
    externalTransactionId,
    transactionType: txType,
    amount: amount.toString(),
    balanceAfter: balanceAfter.toString(),
    status: 'COMPLETED',
  };

  const record = await tx.casinoTransaction.create({
    data: {
      walletId,
      sessionId,
      transactionType: txType,
      amount,
      externalTransactionId,
      relatedExternalTransactionId,
      balanceAfter,
      responseCache: JSON.stringify(result),
    },
  });

  result.transactionId = record.id.toString();
  return result;
}

export async function getBalance(userId: number): Promise<{ playableBalance: string; redeemableBalance: string; currencyCode: string }> {
  const wallet = await prisma.casinoWallet.findFirst({
    where: { userId },
  });

  if (!wallet) throw new UserNotFoundError();

  return {
    playableBalance: wallet.playableBalance.toString(),
    redeemableBalance: wallet.redeemableBalance.toString(),
    currencyCode: wallet.currencyCode,
  };
}

export async function debit(
  userId: number,
  amount: Decimal,
  externalTransactionId: string,
  sessionId?: number,
  relatedExternalTransactionId?: string
): Promise<TransactionResult> {
  const existing = await prisma.casinoTransaction.findUnique({
    where: { externalTransactionId },
  });
  if (existing) return cachedResult(existing);

  return prisma.$transaction(async (tx) => {
    const wallet = await lockWallet(tx, userId);
    const balance = new Decimal(wallet.playable_balance);

    if (balance.lessThan(amount)) throw new InsufficientBalanceError();

    return applyBalanceChange(tx, wallet.id, balance, amount, 'sub', 'BET', externalTransactionId, sessionId, relatedExternalTransactionId);
  });
}

export async function credit(
  userId: number,
  amount: Decimal,
  externalTransactionId: string,
  sessionId?: number,
  relatedExternalTransactionId?: string
): Promise<TransactionResult> {
  const existing = await prisma.casinoTransaction.findUnique({
    where: { externalTransactionId },
  });
  if (existing) return cachedResult(existing);

  return prisma.$transaction(async (tx) => {
    const wallet = await lockWallet(tx, userId);
    const balance = new Decimal(wallet.playable_balance);

    return applyBalanceChange(tx, wallet.id, balance, amount, 'add', 'WIN', externalTransactionId, sessionId, relatedExternalTransactionId);
  });
}

export async function rollback(
  userId: number,
  amount: Decimal,
  externalTransactionId: string,
  originalTransactionId: string,
  sessionId?: number
): Promise<TransactionResult> {
  const existing = await prisma.casinoTransaction.findUnique({
    where: { externalTransactionId },
  });
  if (existing) {
    const status = existing.transactionType === 'ROLLBACK' ? 'COMPLETED' : 'TOMBSTONE';
    return cachedResult(existing, status);
  }

  const originalBet = await prisma.casinoTransaction.findUnique({
    where: { externalTransactionId: originalTransactionId },
  });

  // bet original não existe no nosso lado - cria tombstone pra manter consistência
  if (!originalBet) {
    return prisma.$transaction(async (tx) => {
      const wallet = await lockWallet(tx, userId);
      const bal = new Decimal(wallet.playable_balance);

      const result: TransactionResult = {
        transactionId: '',
        externalTransactionId,
        transactionType: 'ROLLBACK',
        amount: '0',
        balanceAfter: bal.toString(),
        status: 'TOMBSTONE',
      };

      const record = await tx.casinoTransaction.create({
        data: {
          walletId: wallet.id,
          sessionId,
          transactionType: 'ROLLBACK',
          amount: new Decimal(0),
          externalTransactionId,
          relatedExternalTransactionId: originalTransactionId,
          balanceAfter: bal,
          responseCache: JSON.stringify(result),
        },
      });

      result.transactionId = record.id.toString();
      return result;
    });
  }

  // rollback normal - devolve o valor pro jogador
  return prisma.$transaction(async (tx) => {
    const wallet = await lockWallet(tx, userId);
    const balance = new Decimal(wallet.playable_balance);

    return applyBalanceChange(tx, wallet.id, balance, amount, 'add', 'ROLLBACK', externalTransactionId, sessionId, originalTransactionId);
  });
}
