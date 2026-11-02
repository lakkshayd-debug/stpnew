import rateLimit from 'express-rate-limit';

const msg = (message: string) => ({ error: { code: 'RATE_LIMITED', message } });
const skip = () => process.env.NODE_ENV === 'test';

export const apiLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false, skip, message: msg('Too many requests, please slow down') });
export const otpLimiter = rateLimit({ windowMs: 10 * 60_000, limit: 5, standardHeaders: true, legacyHeaders: false, skip, message: msg('Too many OTP requests. Try again in 10 minutes.') });
export const commentLimiter = rateLimit({
  windowMs: 10 * 60_000, limit: 5, standardHeaders: true, legacyHeaders: false, skip,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
  message: msg('You are commenting too fast. Please try again later.'),
});
