/**
 * Analytics Controller Stubs
 */

export async function getOverviewStats(req, res, next) {
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: 'Analytics overview endpoint not implemented yet',
  });
}
