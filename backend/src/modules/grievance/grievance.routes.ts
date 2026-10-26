import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';
import {
  createGrievanceController,
  getMyGrievancesController,
  getAllGrievancesController,
  getPublicMapGrievancesController,
  getGrievanceByIdController,
  updateGrievanceStatusController,
} from './grievance.controller.js';
import { uploadEvidenceMiddleware } from '../../middlewares/upload.middleware.js';
import { uploadEvidenceController } from '../../controllers/upload.controller.js';

export const grievanceRouter = Router();

// POST /api/complaints/upload - Upload evidence photo (Citizen / Auth)
grievanceRouter.post('/upload', authenticate, uploadEvidenceMiddleware, uploadEvidenceController);

// POST /api/complaints - Submit new grievance (Citizen)
grievanceRouter.post('/', authenticate, createGrievanceController);

// GET /api/complaints - Retrieve all grievances with filters (Admin only)
grievanceRouter.get('/', authenticate, requireAdmin, getAllGrievancesController);

// GET /api/complaints/my - Retrieve authenticated citizen's grievances (Citizen isolation)
grievanceRouter.get('/my', authenticate, getMyGrievancesController);

// GET /api/complaints/map - Public read-only grievance map coordinates (Omit private data)
grievanceRouter.get('/map', getPublicMapGrievancesController);

// GET /api/complaints/:id - Retrieve single grievance details (Admin or owning Citizen)
grievanceRouter.get('/:id', authenticate, getGrievanceByIdController);

// PATCH /api/complaints/:id/status - Update grievance status (Admin only)
grievanceRouter.patch('/:id/status', authenticate, requireAdmin, updateGrievanceStatusController);
