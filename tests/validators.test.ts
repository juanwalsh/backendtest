import { describe, it, expect } from 'vitest';
import {
  launchGameSchema,
  debitSchema,
  rollbackSchema,
  getBalanceSchema,
} from '../src/shared/validators';

describe('Validators', () => {
  describe('launchGameSchema', () => {
    it('aceita input valido', () => {
      const result = launchGameSchema.parse({ userId: 1, gameId: 2 });
      expect(result.userId).toBe(1);
      expect(result.gameId).toBe(2);
    });

    it('rejeita userId negativo', () => {
      expect(() => launchGameSchema.parse({ userId: -1, gameId: 1 })).toThrow();
    });

    it('rejeita sem gameId', () => {
      expect(() => launchGameSchema.parse({ userId: 1 })).toThrow();
    });

    it('rejeita userId string', () => {
      expect(() => launchGameSchema.parse({ userId: 'abc', gameId: 1 })).toThrow();
    });
  });

  describe('debitSchema', () => {
    const validInput = {
      token: '550e8400-e29b-41d4-a716-446655440000',
      amount: '10.50',
      transactionId: 'tx_123',
    };

    it('aceita input valido', () => {
      const result = debitSchema.parse(validInput);
      expect(result.amount).toBe('10.50');
    });

    it('rejeita amount zero', () => {
      expect(() => debitSchema.parse({ ...validInput, amount: '0' })).toThrow();
    });

    it('rejeita amount negativo', () => {
      expect(() => debitSchema.parse({ ...validInput, amount: '-5' })).toThrow();
    });

    it('rejeita token invalido (nao uuid)', () => {
      expect(() => debitSchema.parse({ ...validInput, token: 'not-a-uuid' })).toThrow();
    });

    it('rejeita transactionId vazio', () => {
      expect(() => debitSchema.parse({ ...validInput, transactionId: '' })).toThrow();
    });
  });

  describe('rollbackSchema', () => {
    it('exige originalTransactionId', () => {
      expect(() => rollbackSchema.parse({
        token: '550e8400-e29b-41d4-a716-446655440000',
        amount: '5',
        transactionId: 'tx_rb_1',
        // falta originalTransactionId
      })).toThrow();
    });
  });

  describe('getBalanceSchema', () => {
    it('aceita uuid valido', () => {
      const r = getBalanceSchema.parse({ token: '550e8400-e29b-41d4-a716-446655440000' });
      expect(r.token).toBeDefined();
    });

    it('rejeita token nao-uuid', () => {
      expect(() => getBalanceSchema.parse({ token: 'abc123' })).toThrow();
    });
  });
});
