import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from './errors.js';

/**
 * Validates req.body / req.query / req.params and replaces it with the parsed value.
 * Uses defineProperty because req.query is a getter on the Express prototype,
 * and a plain assignment throws in ES-module strict mode.
 */
export const validate =
  (schema: ZodSchema, where: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[where]);
    if (!result.success) return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid input', result.error.flatten()));
    Object.defineProperty(req, where, { value: result.data, writable: true, configurable: true, enumerable: true });
    next();
  };

export const asyncH =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
