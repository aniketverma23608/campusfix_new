import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const uploadRoot = path.join(root, 'uploads');
for (const folder of ['reports', 'proofs']) fs.mkdirSync(path.join(uploadRoot, folder), { recursive: true });

const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };
const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, path.join(uploadRoot, req.uploadKind || 'reports')),
  filename: (req, file, callback) => {
    callback(null, Date.now() + '-' + randomUUID() + extensions[file.mimetype]);
  }
});
export const uploadEvidence = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!extensions[file.mimetype]) {
      const error = new Error('Upload a JPG, PNG, WEBP, GIF, MP4, WEBM or MOV file.');
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  }
});
export { uploadRoot };
