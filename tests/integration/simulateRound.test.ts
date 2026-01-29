import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

/**
 * Teste de integracao - valida o fluxo completo simulateRound.
 * Requer banco de dados PostgreSQL rodando e seed executado.
 *
 * Rodar com: npx vitest run tests/integration
 */
describe('POST /casino/simulateRound (integration)', () => {
  let server: any;

  beforeAll(() => {
    server = app;
  });

  afterAll(async () => {
    const { prisma } = await import('../../src/shared/prisma');
    await prisma.$disconnect();
  });

  it('deve executar o fluxo completo e retornar saldo final correto', async () => {
    const res = await request(server)
      .post('/casino/simulateRound')
      .send({ userId: 1, gameId: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.simulation).toBeDefined();
    expect(res.body.simulation.steps).toHaveLength(6);

    const steps = res.body.simulation.steps;

    // step 1: balance check
    expect(steps[0].action).toBe('GET_BALANCE');

    // step 2: bet1
    expect(steps[1].action).toBe('DEBIT');
    expect(steps[1].amount).toBe('10');

    // step 3: bet2
    expect(steps[2].action).toBe('DEBIT');
    expect(steps[2].amount).toBe('5');

    // step 4: win
    expect(steps[3].action).toBe('CREDIT');
    expect(steps[3].amount).toBe('25');

    // step 5: rollback bet2
    expect(steps[4].action).toBe('ROLLBACK');
    expect(steps[4].amount).toBe('5');

    // step 6: final balance
    expect(steps[5].action).toBe('GET_BALANCE');

    // a diferenca liquida deve ser +15 (ganhou 25, apostou 10, bet2 foi revertido)
    const initialBalance = parseFloat(steps[0].balanceAfter);
    const finalBalance = parseFloat(res.body.simulation.finalBalance);
    expect(finalBalance - initialBalance).toBe(15);
  });

  it('deve retornar erro de validacao com userId invalido', async () => {
    const res = await request(server)
      .post('/casino/simulateRound')
      .send({ userId: 'abc', gameId: 1 })
      .expect(400);

    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('deve retornar erro com usuario inexistente', async () => {
    const res = await request(server)
      .post('/casino/simulateRound')
      .send({ userId: 9999, gameId: 1 });

    // 404 user not found (propagado do session service)
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('deve retornar x-request-id no response', async () => {
    const res = await request(server)
      .post('/health')
      .expect(404); // POST no health (GET only)

    // testa no GET
    const healthRes = await request(server).get('/health');
    expect(healthRes.headers['x-request-id']).toBeDefined();
  });
});
