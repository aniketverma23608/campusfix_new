import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  note: { type: String, maxlength: 500, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const complaintSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, required: true, trim: true, maxlength: 4000 },
  category: { type: String, required: true, enum: ['Water & plumbing', 'Internet & Wi-Fi', 'Electrical', 'Cleanliness', 'Furniture & facilities', 'Safety & security', 'Other'] },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  location: { type: String, required: true, trim: true, maxlength: 200 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  status: { type: String, enum: ['submitted', 'assigned', 'in_progress', 'proof_submitted', 'needs_revision', 'resolved'], default: 'submitted', index: true },
  attachmentPath: { type: String, default: '' },
  attachmentName: { type: String, default: '' },
  proofPath: { type: String, default: '' },
  proofName: { type: String, default: '' },
  reviewNote: { type: String, default: '', maxlength: 500 },
  history: { type: [eventSchema], default: [] }
}, { timestamps: true });

complaintSchema.pre('validate', function () {
  if (!this.ticketId) this.ticketId = `CF-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
});

export default mongoose.model('Complaint', complaintSchema);
