import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { Prisma } from '@prisma/client';

/** Consistent error envelope: { error: { code, message, details? } } */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: { code: 'CONFLICT', message: 'Already exists' } });
    if (err.code === 'P2025') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  }
  if (err instanceof Error && err.name === 'MulterError') {
    return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: err.message } });
  }
  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
}
