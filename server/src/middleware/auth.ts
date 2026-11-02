import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized, forbidden } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import type { Role } from '@prisma/client';

export interface AuthUser { id: string; role: Role; phone: string; name: string }

declare module 'express-serve-static-core' {
  interface Request { user?: AuthUser }
}

export function signAccess(u: AuthUser) {
  return jwt.sign({ sub: u.id, role: u.role, phone: u.phone, name: u.name }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as jwt.SignOptions);
}
export function verifyAccess(token: string): AuthUser | null {
  try {
    const p = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    return { id: p.sub as string, role: p.role as Role, phone: p.phone as string, name: p.name as string };
  } catch {
    return null;
  }
}
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.access ?? req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const u = verifyAccess(token);
    if (u) req.user = u;
  }
  next();
}
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  next();
}
export function requireOwner(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'OWNER') return next(forbidden('Owner access only'));
  next();
}
export async function requireNotBlocked(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next();
  const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isBlocked: true } });
  if (!u || u.isBlocked) return next(forbidden('Account blocked. Please contact the store.'));
  next();
}
