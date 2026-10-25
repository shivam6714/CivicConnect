import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../../config/index.js';
import type { AuthJwtPayload, CitizenUser } from './auth.types.js';
import type { IUserDocument } from './user.model.js';

/**
 * Signs a standard JWT for an authenticated citizen or official.
 * Uses config.jwtSecret and config.jwtExpiresIn from the application configuration.
 */
export function generateAuthToken(user: CitizenUser | IUserDocument): string {
  const userId = 'id' in user ? user.id : user._id.toString();

  const payload: AuthJwtPayload = {
    sub: userId,
    phoneNumber: user.phoneNumber,
    role: user.role,
  };

  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  };

  return jwt.sign(payload, config.jwtSecret, options);
}

/**
 * Verifies and decodes a JWT token.
 * Throws an error if the token is expired, invalid, or forged.
 */
export function verifyAuthToken(token: string): AuthJwtPayload {
  return jwt.verify(token, config.jwtSecret) as AuthJwtPayload;
}
