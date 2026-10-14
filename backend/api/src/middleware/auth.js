import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Verify JWT Bearer token and attach authenticated user to request
 */
export async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing. Please sign in.',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'civicconnect_super_secret_jwt_key_2026_academics'
    );

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }
}

/**
 * Optional authentication: attaches user if token is present, continues if not
 */
export async function optionalAuthenticate(req, res, next) {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'civicconnect_super_secret_jwt_key_2026_academics'
      );
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // Ignore invalid token in optional auth
  }
  next();
}
