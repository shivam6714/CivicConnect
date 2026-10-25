import type { Request, Response, NextFunction } from 'express';
import { createGrievanceSchema } from './grievance.types.js';
import { grievanceService } from './grievance.service.js';
import { UnauthorizedError } from '../../errors/appError.js';

/**
 * Controller for POST /api/complaints.
 * Validates request payload and persists a grievance with verified citizen ownership.
 */
export async function createGrievanceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication token is required to submit a grievance.');
    }

    const validatedInput = createGrievanceSchema.parse(req.body);
    const result = await grievanceService.createGrievance(validatedInput, req.user);

    res.status(201).json({
      success: true,
      message: 'Grievance submitted successfully.',
      grievance: result,
      complaint: result,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for GET /api/complaints/my.
 * Returns only the authenticated citizen's grievances.
 */
export async function getMyGrievancesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication token is required.');
    }

    const results = await grievanceService.getMyGrievances(req.user);

    res.status(200).json({
      success: true,
      count: results.length,
      complaints: results,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}
