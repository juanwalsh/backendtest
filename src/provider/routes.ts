import { Router } from 'express';
import { launch } from './controllers/launch';
import { simulate } from './controllers/simulate';
import { providerHmacMiddleware } from './middleware/hmac';

const router = Router();

// Provider endpoints (called by casino, HMAC-protected)
router.post('/launch', providerHmacMiddleware, launch);
router.post('/simulate', providerHmacMiddleware, simulate);

export default router;
