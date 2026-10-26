import type { Request, Response, NextFunction } from 'express';
import { requestOtpSchema, verifyOtpSchema, adminLoginSchema } from './auth.types.js';
import { authService } from './auth.service.js';

/**
 * Controller for POST /api/auth/request-otp.
 * Validates request payload using Zod requestOtpSchema and delegates to AuthService.
 */
export async function requestOtpController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedInput = requestOtpSchema.parse(req.body);
    const result = await authService.requestOtp(validatedInput.phoneNumber);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for POST /api/auth/verify-otp.
 * Validates request payload using Zod verifyOtpSchema and delegates to AuthService.
 */
export async function verifyOtpController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedInput = verifyOtpSchema.parse(req.body);
    const result = await authService.verifyOtp(validatedInput);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for POST /api/auth/admin-login.
 * Validates administrative credentials and returns signed admin JWT token.
 */
export async function adminLoginController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedInput = adminLoginSchema.parse(req.body);
    const result = await authService.adminLogin(validatedInput);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}