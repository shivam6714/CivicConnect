import { Router } from 'express';
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
} from '../controllers/grievanceController.js';

const router = Router();

// Core Municipal Complaint Endpoints
router.post('/', createComplaint);
router.get('/', getComplaints);
router.get('/:id', getComplaintById);
router.patch('/:id/status', updateComplaintStatus);

export default router;
