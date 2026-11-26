import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'ai_campusfix' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }), authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*splat', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}
app.use(notFound);
app.use(errorHandler);
export default app;
