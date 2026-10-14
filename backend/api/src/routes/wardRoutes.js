import { Router } from 'express';
import { getWards, getWardById } from '../controllers/wardController.js';

const router = Router();

router.get('/', getWards);
router.get('/:id', getWardById);

export default router;
