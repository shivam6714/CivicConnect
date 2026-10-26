import type { Request, Response, NextFunction } from 'express';
import {
  createGrievanceSchema,
  updateGrievanceStatusSchema,
  type GrievanceFilterOptions,
  type GrievanceStatus,
  type GrievanceCategory,
  type GrievancePriority,
} from './grievance.types.js';
import { grievanceService } from './grievance.service.js';
import { UnauthorizedError, ForbiddenError } from '../../errors/appError.js';
import { GrievanceModel } from './grievance.model.js';
import mongoose from 'mongoose';

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

/**
 * Controller for GET /api/complaints (Admin only).
 * Retrieves all city grievances with optional filters.
 */
export async function getAllGrievancesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication token is required.');
    }

    const filters: GrievanceFilterOptions = {};

    if (typeof req.query.status === 'string' && req.query.status !== 'ALL') {
      filters.status = req.query.status as GrievanceStatus;
    }

    if (typeof req.query.category === 'string' && req.query.category !== 'ALL') {
      filters.category = req.query.category as GrievanceCategory;
    }

    if (typeof req.query.wardId === 'string' && req.query.wardId !== 'ALL') {
      const parsedWard = parseInt(req.query.wardId, 10);
      if (!isNaN(parsedWard)) {
        filters.wardId = parsedWard;
      }
    }

    if (typeof req.query.priority === 'string' && req.query.priority !== 'ALL') {
      filters.priority = req.query.priority as GrievancePriority;
    }

    if (typeof req.query.searchQuery === 'string' && req.query.searchQuery.trim().length > 0) {
      filters.searchQuery = req.query.searchQuery.trim();
    }

    const results = await grievanceService.getAllGrievances(filters, req.user.sub);

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

/**
 * Controller for GET /api/complaints/map (Public map).
 * Returns real geo-located complaints omitting all private citizen details.
 */
export async function getPublicMapGrievancesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const results = await grievanceService.getPublicMapGrievances();

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

/**
 * Controller for GET /api/complaints/:id.
 * Retrieves a single complaint with citizen isolation check.
 */
export async function getGrievanceByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication token is required.');
    }

    const id = req.params.id as string;
    const isObjectId = mongoose.isValidObjectId(id);
    const query = isObjectId ? { _id: id } : { trackingNumber: id };

    const doc = await GrievanceModel.findOne(query);
    if (!doc) {
      res.status(404).json({
        success: false,
        error: { message: `Grievance not found with identifier: ${id}` },
      });
      return;
    }

    // Role check: citizen can only view their own grievance details
    if (req.user.role === 'citizen' && doc.citizenId.toString() !== req.user.sub) {
      throw new ForbiddenError('Access forbidden: You cannot view private details of another citizen\'s grievance.');
    }

    const formatted = await grievanceService.getGrievanceById(id, req.user.sub);

    res.status(200).json({
      success: true,
      complaint: formatted,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for PATCH /api/complaints/:id/status (Admin only).
 * Validates status update and persists the transition in MongoDB.
 */
export async function updateGrievanceStatusController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication token is required.');
    }

    const validatedInput = updateGrievanceStatusSchema.parse(req.body);
    const result = await grievanceService.updateGrievanceStatus(
      req.params.id as string,
      validatedInput,
      req.user
    );

    res.status(200).json({
      success: true,
      message: `Status updated to ${validatedInput.status} successfully.`,
      complaint: result,
      grievance: result,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
