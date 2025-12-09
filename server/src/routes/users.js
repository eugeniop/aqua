import { Router } from 'express';
import { createUser, listUsers, updateUserStatus } from '../controllers/userController.js';

const router = Router();

router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:userId', updateUserStatus);

export default router;
