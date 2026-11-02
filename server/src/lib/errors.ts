export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'AppError';
  }
}
export const badRequest = (m: string, d?: unknown) => new AppError(400, 'BAD_REQUEST', m, d);
export const unauthorized = (m = 'Please log in') => new AppError(401, 'UNAUTHORIZED', m);
export const forbidden = (m = 'Not allowed') => new AppError(403, 'FORBIDDEN', m);
export const notFound = (m = 'Not found') => new AppError(404, 'NOT_FOUND', m);
export const conflict = (m: string) => new AppError(409, 'CONFLICT', m);
