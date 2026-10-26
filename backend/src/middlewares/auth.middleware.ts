import type { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../modules/auth/jwt.utils.js';
import type { AuthJwtPayload } from '../modules/auth/auth.types.js';
import { UnauthorizedError, ForbiddenError } from '../errors/appError.js';

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

/**
 * Authorization middleware enforcing role-based access control.
 * Throws HTTP 401 if unauthenticated, HTTP 403 if user lacks required role.
 */
export function requireRole(allowedRoles: ('citizen' | 'official' | 'admin')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access forbidden: Operation requires ${allowedRoles.join(' or ')} privileges.`
      );
    }

    next();
  };
}

/**
 * Shortcut authorization middleware requiring administrator or municipal official access.
 */
export const requireAdmin = requireRole(['admin', 'official']);
