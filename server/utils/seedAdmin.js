import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import User from '../models/User.js';

export async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    console.warn('Admin seed skipped. Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in .env to create the first admin.');
    return;
  }
  const existing = await User.findOne({ email });
  if (existing) return;
  await User.create({ name: process.env.ADMIN_NAME || 'CampusFix Admin', email, passwordHash: await bcrypt.hash(password, 12), role: 'admin' });
  console.log(`Initial admin created: ${email}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in .env');
  await mongoose.connect(process.env.MONGODB_URI);
  await ensureAdmin();
  await mongoose.disconnect();
}
