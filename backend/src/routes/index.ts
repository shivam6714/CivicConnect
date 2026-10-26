import { Router, type Request, type Response } from 'express';
import { healthRouter } from './health.route.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { grievanceRouter } from '../modules/grievance/grievance.routes.js';
import { uploadRouter } from './upload.route.js';

export const rootRouter = Router();

// GET / - basic API information message
rootRouter.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    name: 'CivicConnect API',
    tagline: 'Civic Grievance Reporting and Management Platform for Jammu',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      requestOtp: '/api/auth/request-otp',
      verifyOtp: '/api/auth/verify-otp',
      complaints: '/api/complaints',
      myComplaints: '/api/complaints/my',
      mapComplaints: '/api/complaints/map',
      upload: '/api/upload',
    },
  });
});

// GET /health - health endpoint
rootRouter.use('/health', healthRouter);

// Auth endpoints
rootRouter.use('/api/auth', authRouter);
rootRouter.use('/api/v1/auth', authRouter);

// Grievance / Complaints endpoints
rootRouter.use('/api/complaints', grievanceRouter);
rootRouter.use('/api/v1/complaints', grievanceRouter);

// Evidence upload endpoints
rootRouter.use('/api/upload', uploadRouter);
rootRouter.use('/api/v1/upload', uploadRouter);