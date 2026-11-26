import { Router } from 'express';
import { analytics, createWorker, listWorkers } from '../controllers/adminController.js';
import { allowRoles, protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect, allowRoles('admin'));
router.get('/workers', listWorkers);
router.post('/workers', createWorker);
router.get('/analytics', analytics);
export default router;
