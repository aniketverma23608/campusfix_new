import { Router } from 'express';
import path from 'node:path';
import Complaint from '../models/Complaint.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadRoot } from '../middleware/uploadMiddleware.js';

const router = Router();
router.get('/:kind/:filename', protect, async (req, res) => {
  const { kind, filename } = req.params;
  if (!['reports', 'proofs'].includes(kind) || path.basename(filename) !== filename) return res.status(404).json({ message: 'File not found.' });
  const field = kind === 'proofs' ? 'proofPath' : 'attachmentPath';
  const filePath = '/api/files/' + kind + '/' + filename;
  const complaint = await Complaint.findOne({ [field]: filePath }).select('createdBy assignedTo');
  if (!complaint) return res.status(404).json({ message: 'File not found.' });
  const mayView = req.user.role === 'admin' || String(complaint.createdBy) === req.user.id || String(complaint.assignedTo) === req.user.id;
  if (!mayView) return res.status(403).json({ message: 'You cannot view this file.' });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.join(uploadRoot, kind, filename), error => { if (error && !res.headersSent) res.status(404).json({ message: 'File not found.' }); });
});
export default router;
