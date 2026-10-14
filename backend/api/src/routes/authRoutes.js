import { Router } from 'express';
import { login, register, getMe, logout } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticate, getMe);
router.post('/logout', logout);

export default router;
