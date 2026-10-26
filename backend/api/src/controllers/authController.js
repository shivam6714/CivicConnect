/**
 * Auth Controller Stubs
 */

export async function login(req, res, next) {
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: 'Authentication login endpoint not implemented yet',
  });
}

export async function register(req, res, next) {
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: 'Citizen registration endpoint not implemented yet',
  });
}

export async function getMe(req, res, next) {
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: 'User profile endpoint not implemented yet',
  });
}

export async function logout(req, res, next) {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
}
