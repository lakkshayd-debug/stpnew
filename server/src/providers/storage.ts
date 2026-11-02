import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

export interface StorageAdapter {
  save(buffer: Buffer, filename: string, mime: string): Promise<string>;
  remove(url: string): Promise<void>;
}

/** Development default: writes to ./uploads and serves it statically. */
export class LocalStorage implements StorageAdapter {
  constructor(private dir = env.UPLOAD_DIR) {}
  async save(buffer: Buffer, filename: string) {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(path.join(this.dir, filename), buffer);
    return `${env.PUBLIC_URL}/uploads/${filename}`;
  }
  async remove(url: string) {
    const name = url.split('/uploads/')[1];
    if (name) await fs.rm(path.join(this.dir, name), { force: true });
  }
}

/**
 * Stores images as rows in Postgres.
 * Use this on free hosting (Render/Railway free plans have no persistent disk):
 * set STORAGE_DRIVER=db. Images survive restarts and redeploys.
 */
export class DbStorage implements StorageAdapter {
  async save(buffer: Buffer, filename: string, mime: string) {
    const id = filename.replace(/\.[^.]+$/, '');
    await prisma.fileObject.create({ data: { id, mime, size: buffer.length, data: buffer } });
    return `${env.PUBLIC_URL}/uploads/${id}.webp`;
  }
  async remove(url: string) {
    const id = url.split('/uploads/')[1]?.replace(/\.[^.]+$/, '');
    if (id) await prisma.fileObject.deleteMany({ where: { id } });
  }
}

/** Swap-in point for S3 / Cloudinary (install @aws-sdk/client-s3 and implement). */
export class S3Storage implements StorageAdapter {
  async save(): Promise<string> {
    throw new Error('S3Storage is not configured. Install @aws-sdk/client-s3 and implement save().');
  }
  async remove(): Promise<void> {}
}

export const storage: StorageAdapter =
  env.STORAGE_DRIVER === 's3' ? new S3Storage() : env.STORAGE_DRIVER === 'db' ? new DbStorage() : new LocalStorage();
