import { Router } from 'express';
import { assignComplaint, createComplaint, ensureAssignedComplaint, getComplaint, listComplaints, listNotifications, markNotificationRead, reviewProof, startWork, uploadProof } from '../controllers/complaintController.js';
import { allowRoles, protect } from '../middleware/authMiddleware.js';
import { uploadEvidence } from '../middleware/uploadMiddleware.js';

const router = Router();
router.use(protect);
router.get('/', listComplaints);
router.post('/', allowRoles('student'), (req, res, next) => { req.uploadKind = 'reports'; next(); }, uploadEvidence.single('attachment'), createComplaint);
router.get('/notifications', listNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.get('/:id', getComplaint);
router.patch('/:id/assign', allowRoles('admin'), assignComplaint);
router.patch('/:id/start', allowRoles('worker'), startWork);
router.post('/:id/proof', allowRoles('worker'), ensureAssignedComplaint, (req, res, next) => { req.uploadKind = 'proofs'; next(); }, uploadEvidence.single('proof'), uploadProof);
router.patch('/:id/review', allowRoles('admin'), reviewProof);
export default router;
