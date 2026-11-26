import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function protect(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;
    if (!token) return res.status(401).json({ message: 'Sign in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('name email role department active');
    if (!user?.active) return res.status(401).json({ message: 'This account is not active.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Your session is invalid or expired. Please sign in again.' });
  }
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ message: 'You do not have permission for this action.' });
  next();
};
