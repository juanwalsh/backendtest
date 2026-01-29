import { z } from 'zod';

export const launchGameSchema = z.object({
  userId: z.number({ message: 'userId deve ser um numero' }).int().positive(),
  gameId: z.number({ message: 'gameId deve ser um numero' }).int().positive(),
});

export const simulateRoundSchema = z.object({
  userId: z.number().int().positive(),
  gameId: z.number().int().positive(),
});

export const getBalanceSchema = z.object({
  token: z.string().uuid('token invalido'),
});

export const debitSchema = z.object({
  token: z.string().uuid('token invalido'),
  amount: z.string().refine((val) => {
    const n = parseFloat(val);
    return !isNaN(n) && n > 0;
  }, 'amount deve ser um numero positivo'),
  transactionId: z.string().min(1, 'transactionId obrigatorio'),
});

export const creditSchema = z.object({
  token: z.string().uuid('token invalido'),
  amount: z.string().refine((val) => {
    const n = parseFloat(val);
    return !isNaN(n) && n > 0;
  }, 'amount deve ser um numero positivo'),
  transactionId: z.string().min(1, 'transactionId obrigatorio'),
});

export const rollbackSchema = z.object({
  token: z.string().uuid('token invalido'),
  amount: z.string().refine((val) => {
    const n = parseFloat(val);
    return !isNaN(n) && n > 0;
  }, 'amount deve ser um numero positivo'),
  transactionId: z.string().min(1, 'transactionId obrigatorio'),
  originalTransactionId: z.string().min(1, 'originalTransactionId obrigatorio'),
});

// Provider schemas
export const providerLaunchSchema = z.object({
  token: z.string().uuid(),
  userId: z.number().int().positive(),
  gameId: z.string().min(1),
});

export const providerSimulateSchema = z.object({
  token: z.string().uuid(),
});
