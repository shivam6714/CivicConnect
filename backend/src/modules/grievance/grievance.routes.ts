import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  createGrievanceController,
  getMyGrievancesController,
} from './grievance.controller.js';

export const grievanceRouter = Router();

// POST /api/complaints - Submit new grievance
grievanceRouter.post('/', authenticate, createGrievanceController);

// GET /api/complaints/my - Retrieve authenticated citizen's grievances
grievanceRouter.get('/my', authenticate, getMyGrievancesController);
