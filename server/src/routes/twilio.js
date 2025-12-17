import { Router } from 'express';
import { handleIncomingSms } from '../controllers/twilioController.js';

const router = Router();

router.post('/sms', handleIncomingSms);

export default router;
