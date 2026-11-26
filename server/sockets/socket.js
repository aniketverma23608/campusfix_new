import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function configureSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub).select('role active');
      if (!user?.active) return next(new Error('Account unavailable'));
      socket.userId = user.id;
      socket.userRole = user.role;
      next();
    } catch { next(new Error('Invalid session')); }
  });
  io.on('connection', socket => {
    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);
  });
}
