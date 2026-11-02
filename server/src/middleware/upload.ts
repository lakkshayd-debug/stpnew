import multer from 'multer';
import sharp from 'sharp';
import crypto from 'node:crypto';
import { storage } from '../providers/storage.js';
import { badRequest } from '../lib/errors.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) =>
    /^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype) ? cb(null, true) : cb(badRequest('Only JPEG/PNG/WebP images are allowed')),
});

/** Compresses to WebP (max 1600px) and stores through the storage adapter. */
export async function processImages(files: Express.Multer.File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const f of files) {
    const buf = await sharp(f.buffer).rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 }).toBuffer();
    urls.push(await storage.save(buf, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}.webp`, 'image/webp'));
  }
  return urls;
}
