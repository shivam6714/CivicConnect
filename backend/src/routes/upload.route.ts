import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { uploadEvidenceMiddleware } from '../middlewares/upload.middleware.js';
import { uploadEvidenceController } from '../controllers/upload.controller.js';

export const uploadRouter = Router();

// POST /api/upload - Authenticated photographic evidence upload
uploadRouter.post('/', authenticate, uploadEvidenceMiddleware, uploadEvidenceController);
