import { Router } from 'express';
import { requestOtpController, verifyOtpController, adminLoginController } from './auth.controller.js';

export const authRouter = Router();

// POST /api/auth/request-otp
authRouter.post('/request-otp', requestOtpController);

// POST /api/auth/verify-otp
authRouter.post('/verify-otp', verifyOtpController);

// POST /api/auth/admin-login
authRouter.post('/admin-login', adminLoginController);