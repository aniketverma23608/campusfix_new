import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
  message: { type: String, required: true, maxlength: 240 },
  readAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
