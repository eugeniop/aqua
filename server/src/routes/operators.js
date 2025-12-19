import { Router } from 'express';
import { listOperators } from '../controllers/userController.js';

const router = Router();

router.get('/', listOperators);

export default router;
