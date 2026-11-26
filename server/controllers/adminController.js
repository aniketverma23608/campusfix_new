import bcrypt from 'bcryptjs';
import Complaint from '../models/Complaint.js';
import User from '../models/User.js';

export async function listWorkers(req, res) {
  const workers = await User.find({ role: 'worker', active: true }).select('name email department').sort({ name: 1 }).lean();
  res.json({ workers });
}

export async function createWorker(req, res) {
  const { name, email, password, department = '' } = req.body;
  if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: 'Name, email and temporary password are required.' });
  if (password.length < 8) return res.status(400).json({ message: 'Temporary password must be at least 8 characters.' });
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: 'An account with that email already exists.' });
  const worker = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), role: 'worker', department: String(department).trim() });
  res.status(201).json({ worker: { id: worker.id, name: worker.name, email: worker.email, department: worker.department } });
}

export async function analytics(req, res) {
  const [counts, byCategory, recent] = await Promise.all([
    Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Complaint.find().sort({ createdAt: -1 }).limit(5).select('ticketId title category status createdAt').lean()
  ]);
  res.json({ counts: Object.fromEntries(counts.map(item => [item._id, item.count])), byCategory, recent });
}
