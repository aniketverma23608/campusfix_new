import 'dotenv/config';
import http from 'node:http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import { configureSocket } from './sockets/socket.js';
import { ensureAdmin } from './utils/seedAdmin.js';

const port = Number(process.env.PORT || 5000);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

try {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET to a random value at least 32 characters long in .env');
  await connectDB();
  await ensureAdmin();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: clientOrigin, credentials: true } });
  configureSocket(io);
  app.set('io', io);
  server.listen(port, '0.0.0.0', () => console.log(`CampusFix API listening on http://localhost:${port}`));
} catch (error) {
  console.error(`CampusFix could not start: ${error.message}`);
  process.exit(1);
}
