/**
 * Restrict access to specified user roles
 * @param  {...string} roles - Allowed roles (e.g., 'CITY_ADMIN', 'MUNICIPAL_OFFICER')
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please sign in.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Your role (${req.user.role}) does not have permission to perform this action.`,
      });
    }

    next();
  };
}
