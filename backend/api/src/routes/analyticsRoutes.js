import { Router } from 'express';
import { getOverviewStats } from '../controllers/analyticsController.js';

const router = Router();

router.get('/overview', getOverviewStats);

export default router;
