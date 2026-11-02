import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { optionalAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { postsRouter } from './routes/posts.js';
import { meRouter, referralsRouter, rewardsRouter, notificationsRouter } from './routes/me.js';
import { adminRouter } from './routes/admin.js';
import { shareRouter } from './routes/share.js';
import { getShopSettings, getRewardSettings } from './services/settings.service.js';
import { asyncH } from './lib/validate.js';
import { prisma } from './lib/prisma.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  /**
   * CORS: trust CLIENT_URL, anything in ALLOWED_ORIGINS, local dev hosts, and the
   * hosting domains this app is deployed to (Render/Vercel/Netlify). This avoids the
   * classic "works locally, blocked in production" trap when the host adds a suffix
   * to the service name (e.g. shyam-timber-web-eeo4.onrender.com).
   */
  const allowList = new Set(
    [env.CLIENT_URL, ...(env.ALLOWED_ORIGINS ?? '').split(',')]
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
  );
  const allowedPattern = /^(https:\/\/[a-z0-9-]+\.(onrender\.com|vercel\.app|netlify\.app)|http:\/\/localhost(:\d+)?|http:\/\/127\.0\.0\.1(:\d+)?|http:\/\/192\.168\.\d+\.\d+(:\d+)?)$/i;
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true); // curl, WhatsApp link preview, same-origin
        const clean = origin.replace(/\/$/, '');
        if (allowList.has(clean) || allowedPattern.test(clean)) return cb(null, true);
        console.warn('[cors] blocked origin:', origin);
        return cb(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  // Images stored in Postgres (STORAGE_DRIVER=db) are served here; local files fall through.
  app.get('/uploads/:name', async (req, res, next) => {
    if (env.STORAGE_DRIVER !== 'db') return next();
    const id = String(req.params.name).replace(/\.[^.]+$/, '');
    const file = await prisma.fileObject.findUnique({ where: { id } }).catch(() => null);
    if (!file) return next();
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.send(Buffer.from(file.data));
  });
  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR), { maxAge: '30d', immutable: true }));
  app.use(shareRouter); // /p/:id

  // Friendly landing page so the API root is not a confusing 404.
  app.get('/', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Shyam Timber API</title>
<style>body{margin:0;display:grid;place-items:center;min-height:100vh;font-family:Inter,system-ui,sans-serif;
background:#F6EFE3;color:#4A2F1B;text-align:center;padding:24px}
a{display:inline-block;margin-top:12px;padding:14px 20px;border-radius:12px;background:#4A2F1B;color:#fff;
text-decoration:none;font-weight:600}.ok{color:#2F5D3A;font-weight:700}code{background:#E8DCC6;padding:2px 6px;border-radius:6px}</style>
</head><body><div>
<h1 style="font-family:Georgia,serif">Shyam Timber and Plywoods</h1>
<p class="ok">&#10003; API server is running</p>
<p>This address is the backend. The shop app for customers is here:</p>
<a href="${env.CLIENT_URL}">Open the app</a>
<p style="margin-top:20px;font-size:14px">Status: <code>/api/v1/health</code></p>
</div></body></html>`);
  });

  const api = express.Router();
  api.use(apiLimiter, optionalAuth);
  api.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  api.get('/public/settings', asyncH(async (_req, res) => {
    const [shop, rewards] = await Promise.all([getShopSettings(), getRewardSettings()]);
    // otpHint lets the UI show the test codes while OTP_MODE=fake (never exposes real OTPs)
    const otpHint = env.OTP_MODE === 'fake' ? { mode: 'fake' as const, ownerOtp: env.OWNER_OTP, customerOtp: env.CUSTOMER_OTP } : { mode: 'real' as const };
    res.json({ shop, rewards, otpHint });
  }));
  api.use('/auth', authRouter);
  api.use('/posts', postsRouter);
  api.use('/me', meRouter);
  api.use('/referrals', referralsRouter);
  api.use('/rewards', rewardsRouter);
  api.use('/notifications', notificationsRouter);
  api.use('/admin', adminRouter);
  app.use('/api/v1', api);

  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  app.use(errorHandler);
  return app;
}
