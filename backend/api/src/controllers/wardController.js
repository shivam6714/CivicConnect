/**
 * Ward Controller Stubs
 */

export async function getWards(req, res, next) {
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: 'Ward listing endpoint not implemented yet',
  });
}

export async function getWardById(req, res, next) {
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: 'Ward retrieval endpoint not implemented yet',
  });
}
