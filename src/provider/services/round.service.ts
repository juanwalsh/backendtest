import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../shared/prisma';
import { casinoClient } from '../../shared/httpClient';
import { SessionNotFoundError } from '../../shared/errors';

export interface AuditStep {
  step: number;
  action: string;
  transactionId?: string;
  amount?: string;
  balanceAfter?: string;
  status: string;
  details?: any;
}

export async function simulateFullRound(token: string): Promise<{
  roundId: string;
  steps: AuditStep[];
  finalBalance: string;
}> {
  const balanceCheck = await casinoClient.post('/getBalance', { token });
  if (!balanceCheck.data.success) throw new SessionNotFoundError();

  const userId = balanceCheck.data.userId;
  const customer = await prisma.providerCustomer.findFirst({
    where: { externalUserId: userId },
  });
  if (!customer) throw new SessionNotFoundError();

  const game = await prisma.providerGame.findFirst({ where: { isActive: true } });
  if (!game) throw new Error('No active game found');

  const roundId = `round_${crypto.randomUUID()}`;
  const steps: AuditStep[] = [];
  let stepNum = 0;

  await prisma.gameRound.create({
    data: {
      roundId,
      sessionId: token,
      playerId: customer.id,
      gameId: game.id,
      currency: balanceCheck.data.currencyCode || 'BRL',
      status: 'OPEN',
      totalBetAmount: new Decimal(0),
      totalPayoutAmount: new Decimal(0),
    },
  });

  stepNum++;
  steps.push({
    step: stepNum,
    action: 'GET_BALANCE',
    status: 'SUCCESS',
    balanceAfter: balanceCheck.data.playableBalance,
    details: {
      playableBalance: balanceCheck.data.playableBalance,
      currencyCode: balanceCheck.data.currencyCode,
    },
  });

  stepNum++;
  const bet1TxId = `tx_bet1_${crypto.randomUUID()}`;
  const debit1Res = await casinoClient.post('/debit', {
    token,
    amount: '10',
    transactionId: bet1TxId,
  });

  await prisma.providerBet.create({
    data: {
      transactionId: bet1TxId,
      roundId,
      betType: 'BET',
      amount: new Decimal(10),
      casinoBalanceAfter: new Decimal(debit1Res.data.balanceAfter),
      status: 'CONFIRMED',
      responseCache: JSON.stringify(debit1Res.data),
    },
  });

  steps.push({
    step: stepNum,
    action: 'DEBIT',
    transactionId: bet1TxId,
    amount: '10',
    balanceAfter: debit1Res.data.balanceAfter,
    status: 'SUCCESS',
  });

  stepNum++;
  const bet2TxId = `tx_bet2_${crypto.randomUUID()}`;
  const debit2Res = await casinoClient.post('/debit', {
    token,
    amount: '5',
    transactionId: bet2TxId,
  });

  await prisma.providerBet.create({
    data: {
      transactionId: bet2TxId,
      roundId,
      betType: 'BET',
      amount: new Decimal(5),
      casinoBalanceAfter: new Decimal(debit2Res.data.balanceAfter),
      status: 'CONFIRMED',
      responseCache: JSON.stringify(debit2Res.data),
    },
  });

  steps.push({
    step: stepNum,
    action: 'DEBIT',
    transactionId: bet2TxId,
    amount: '5',
    balanceAfter: debit2Res.data.balanceAfter,
    status: 'SUCCESS',
  });

  stepNum++;
  const winTxId = `tx_win_${crypto.randomUUID()}`;
  const creditRes = await casinoClient.post('/credit', {
    token,
    amount: '25',
    transactionId: winTxId,
  });

  await prisma.providerBet.create({
    data: {
      transactionId: winTxId,
      roundId,
      betType: 'WIN',
      amount: new Decimal(25),
      casinoBalanceAfter: new Decimal(creditRes.data.balanceAfter),
      status: 'CONFIRMED',
      responseCache: JSON.stringify(creditRes.data),
    },
  });

  steps.push({
    step: stepNum,
    action: 'CREDIT',
    transactionId: winTxId,
    amount: '25',
    balanceAfter: creditRes.data.balanceAfter,
    status: 'SUCCESS',
  });

  stepNum++;
  const rollbackTxId = `tx_rb_${crypto.randomUUID()}`;
  const rollbackRes = await casinoClient.post('/rollback', {
    token,
    amount: '5',
    transactionId: rollbackTxId,
    originalTransactionId: bet2TxId,
  });

  await prisma.providerBet.create({
    data: {
      transactionId: rollbackTxId,
      roundId,
      betType: 'ROLLBACK',
      amount: new Decimal(5),
      casinoBalanceAfter: new Decimal(rollbackRes.data.balanceAfter),
      status: 'CONFIRMED',
      responseCache: JSON.stringify(rollbackRes.data),
    },
  });

  steps.push({
    step: stepNum,
    action: 'ROLLBACK',
    transactionId: rollbackTxId,
    amount: '5',
    balanceAfter: rollbackRes.data.balanceAfter,
    status: 'SUCCESS',
  });

  stepNum++;
  const finalBalanceRes = await casinoClient.post('/getBalance', { token });
  steps.push({
    step: stepNum,
    action: 'GET_BALANCE',
    status: 'SUCCESS',
    balanceAfter: finalBalanceRes.data.playableBalance,
    details: {
      playableBalance: finalBalanceRes.data.playableBalance,
      currencyCode: finalBalanceRes.data.currencyCode,
    },
  });

  await prisma.gameRound.update({
    where: { roundId },
    data: {
      status: 'CLOSED',
      totalBetAmount: new Decimal(10), // bet1 only (bet2 was rolled back)
      totalPayoutAmount: new Decimal(25),
    },
  });

  return {
    roundId,
    steps,
    finalBalance: finalBalanceRes.data.playableBalance,
  };
}
