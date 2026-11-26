import Complaint from '../models/Complaint.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { classifyComplaint } from '../services/geminiService.js';

const populated = query => query.populate('createdBy', 'name email role').populate('assignedTo', 'name email department');
const emitTo = (req, userId, event, payload) => req.app.get('io')?.to(`user:${userId}`).emit(event, payload);

async function notify(req, userId, complaint, message) {
  const record = await Notification.create({ recipient: userId, complaint, message });
  emitTo(req, userId, 'notification:new', { id: record.id, complaint, message, createdAt: record.createdAt });
}

export async function createComplaint(req, res) {
  const { title, description, location } = req.body;
  if (!title?.trim() || !description?.trim() || !location?.trim()) return res.status(400).json({ message: 'Title, description and location are required.' });
  const ai = await classifyComplaint(title.trim(), description.trim());
  const complaint = await Complaint.create({
    title: title.trim(), description: description.trim(), location: location.trim(), category: ai.category, priority: ai.priority,
    createdBy: req.user.id, attachmentPath: req.file ? '/api/files/reports/' + req.file.filename : '',
    attachmentName: req.file?.originalname || '', history: [{ actor: req.user.id, action: 'submitted', note: `Category: ${ai.category} (${ai.source})` }]
  });
  const result = await populated(Complaint.findById(complaint.id)).lean();
  const admins = await User.find({ role: 'admin', active: true }).select('_id');
  await Promise.all(admins.map(admin => notify(req, admin.id, complaint.id, `New ${ai.category} report: ${complaint.ticketId}`)));
  req.app.get('io')?.to('role:admin').emit('complaint:new', result);
  res.status(201).json({ complaint: result, classification: ai });
}

export async function listComplaints(req, res) {
  const filter = req.user.role === 'admin' ? {} : req.user.role === 'worker' ? { assignedTo: req.user.id } : { createdBy: req.user.id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  const complaints = await populated(Complaint.find(filter).sort({ createdAt: -1 })).lean();
  res.json({ complaints });
}

export async function getComplaint(req, res) {
  const complaint = await populated(Complaint.findById(req.params.id)).lean();
  if (!complaint) return res.status(404).json({ message: 'Issue not found.' });
  const owns = String(complaint.createdBy?._id) === req.user.id;
  const assigned = String(complaint.assignedTo?._id) === req.user.id;
  if (req.user.role !== 'admin' && !owns && !assigned) return res.status(403).json({ message: 'You cannot view this issue.' });
  res.json({ complaint });
}

export async function assignComplaint(req, res) {
  const { workerId } = req.body;
  if (!workerId) return res.status(400).json({ message: 'Choose a worker to assign this issue.' });
  const worker = await User.findOne({ _id: workerId, role: 'worker', active: true });
  if (!worker) return res.status(404).json({ message: 'Active worker not found.' });
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: 'Issue not found.' });
  if (complaint.status === 'resolved') return res.status(409).json({ message: 'Resolved issues cannot be reassigned.' });
  complaint.assignedTo = worker.id;
  complaint.status = 'assigned';
  complaint.reviewNote = '';
  complaint.history.push({ actor: req.user.id, action: 'assigned', note: `Assigned to ${worker.name}` });
  await complaint.save();
  await notify(req, worker.id, complaint.id, `You were assigned ${complaint.ticketId}: ${complaint.title}`);
  const result = await populated(Complaint.findById(complaint.id)).lean();
  emitTo(req, worker.id, 'complaint:updated', result);
  req.app.get('io')?.to('role:admin').emit('complaint:updated', result);
  res.json({ complaint: result });
}

export async function startWork(req, res) {
  const complaint = await Complaint.findOne({ _id: req.params.id, assignedTo: req.user.id });
  if (!complaint) return res.status(404).json({ message: 'Assigned issue not found.' });
  if (!['assigned', 'needs_revision', 'in_progress'].includes(complaint.status)) return res.status(409).json({ message: 'This issue is not ready to be worked on.' });
  complaint.status = 'in_progress';
  complaint.history.push({ actor: req.user.id, action: 'work_started' });
  await complaint.save();
  const result = await populated(Complaint.findById(complaint.id)).lean();
  emitTo(req, complaint.createdBy, 'complaint:updated', result);
  req.app.get('io')?.to('role:admin').emit('complaint:updated', result);
  res.json({ complaint: result });
}

export async function ensureAssignedComplaint(req, res, next) {
  const exists = await Complaint.exists({ _id: req.params.id, assignedTo: req.user.id });
  if (!exists) return res.status(404).json({ message: 'Assigned issue not found.' });
  next();
}

export async function uploadProof(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Choose an image or video as proof.' });
  const complaint = await Complaint.findOne({ _id: req.params.id, assignedTo: req.user.id });
  if (!complaint) return res.status(404).json({ message: 'Assigned issue not found.' });
  if (!['in_progress', 'needs_revision'].includes(complaint.status)) return res.status(409).json({ message: 'Start work before uploading completion proof.' });
  complaint.proofPath = '/api/files/proofs/' + req.file.filename;
  complaint.proofName = req.file.originalname;
  complaint.status = 'proof_submitted';
  complaint.reviewNote = '';
  complaint.history.push({ actor: req.user.id, action: 'proof_submitted', note: req.file.originalname });
  await complaint.save();
  const result = await populated(Complaint.findById(complaint.id)).lean();
  await notify(req, complaint.createdBy, complaint.id, `Completion proof was uploaded for ${complaint.ticketId}.`);
  const admins = await User.find({ role: 'admin', active: true }).select('_id');
  await Promise.all(admins.map(admin => notify(req, admin.id, complaint.id, `Proof is ready to review for ${complaint.ticketId}.`)));
  req.app.get('io')?.to('role:admin').emit('complaint:proof', result);
  emitTo(req, complaint.createdBy, 'complaint:updated', result);
  res.json({ complaint: result });
}

export async function reviewProof(req, res) {
  const { decision, note = '' } = req.body;
  if (!['resolved', 'needs_revision'].includes(decision)) return res.status(400).json({ message: 'Decision must be resolved or needs_revision.' });
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: 'Issue not found.' });
  if (complaint.status !== 'proof_submitted' || !complaint.proofPath) return res.status(409).json({ message: 'There is no submitted proof to review.' });
  complaint.status = decision;
  complaint.reviewNote = String(note).trim().slice(0, 500);
  complaint.history.push({ actor: req.user.id, action: decision, note: complaint.reviewNote });
  await complaint.save();
  const result = await populated(Complaint.findById(complaint.id)).lean();
  await Promise.all([notify(req, complaint.createdBy, complaint.id, decision === 'resolved' ? `${complaint.ticketId} was verified and resolved.` : `More work is needed for ${complaint.ticketId}: ${complaint.reviewNote || 'See the issue details.'}`), ...(complaint.assignedTo ? [notify(req, complaint.assignedTo, complaint.id, decision === 'resolved' ? `${complaint.ticketId} was approved.` : `Please update ${complaint.ticketId}: ${complaint.reviewNote || 'Admin requested another pass.'}`)] : [])]);
  emitTo(req, complaint.createdBy, 'complaint:updated', result);
  if (complaint.assignedTo) emitTo(req, complaint.assignedTo, 'complaint:updated', result);
  req.app.get('io')?.to('role:admin').emit('complaint:updated', result);
  res.json({ complaint: result });
}

export async function listNotifications(req, res) {
  const notifications = await Notification.find({ recipient: req.user.id }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ notifications });
}

export async function markNotificationRead(req, res) {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user.id }, { readAt: new Date() }, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ notification });
}
