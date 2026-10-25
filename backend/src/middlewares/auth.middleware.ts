import type { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../modules/auth/jwt.utils.js';
import type { AuthJwtPayload } from '../modules/auth/auth.types.js';
import { UnauthorizedError } from '../errors/appError.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthJwtPayload;
    }
  }
}

/**
 * Authentication middleware that verifies JWT Bearer tokens using config.jwtSecret.
 * Attaches the trusted authenticated identity payload to req.user.
 * Rejects missing, invalid, or expired tokens with HTTP 401 Unauthorized.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication required. Missing or malformed Bearer token.');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new UnauthorizedError('Authentication token is empty.');
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = payload;
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    throw new UnauthorizedError(`Authentication failed: ${message}`);
  }
}
