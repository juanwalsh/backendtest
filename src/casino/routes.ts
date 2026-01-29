import { Router } from 'express';
import { launchGame } from './controllers/launchGame';
import { simulateRound } from './controllers/simulateRound';
import { getBalance } from './controllers/getBalance';
import { debit } from './controllers/debit';
import { credit } from './controllers/credit';
import { rollback } from './controllers/rollback';
import { casinoHmacMiddleware } from './middleware/hmac';

const router = Router();

// Public endpoints (casino-initiated)
router.post('/launchGame', launchGame);
router.post('/simulateRound', simulateRound);

// Wallet API endpoints (called by provider, HMAC-protected)
router.post('/getBalance', casinoHmacMiddleware, getBalance);
router.post('/debit', casinoHmacMiddleware, debit);
router.post('/credit', casinoHmacMiddleware, credit);
router.post('/rollback', casinoHmacMiddleware, rollback);

export default router;
