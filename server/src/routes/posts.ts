import { Router } from 'express';
import { z } from 'zod';
import { validate, asyncH } from '../lib/validate.js';
import { requireAuth, requireNotBlocked } from '../middleware/auth.js';
import { commentLimiter } from '../middleware/rateLimit.js';
import { notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import * as posts from '../services/post.service.js';
import * as comments from '../services/comment.service.js';
import { POST_TYPES } from '../../../shared/types.js';

export const postsRouter = Router();

const listQ = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
  category: z.string().max(40).optional(),
  type: z.enum(POST_TYPES as [string, ...string[]]).optional(),
  q: z.string().max(100).optional(),
});

postsRouter.get('/', validate(listQ, 'query'), asyncH(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof listQ>;
  res.json(await posts.listPosts({ ...q, type: q.type as never, userId: req.user?.id }));
}));

postsRouter.get('/saved', requireAuth, validate(listQ, 'query'), asyncH(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof listQ>;
  res.json(await posts.listPosts({ ...q, type: q.type as never, userId: req.user!.id, savedOnly: true }));
}));

postsRouter.get('/:id', asyncH(async (req, res) => {
  const p = await posts.getPost(req.params.id, req.user?.id);
  if (!p) throw notFound('Post not found');
  res.json(p);
}));

postsRouter.post('/:id/like', requireAuth, requireNotBlocked, asyncH(async (req, res) => res.json(await posts.toggleLike(req.user!.id, req.params.id))));
postsRouter.post('/:id/save', requireAuth, requireNotBlocked, asyncH(async (req, res) => res.json(await posts.toggleSave(req.user!.id, req.params.id))));
postsRouter.post('/:id/share', asyncH(async (req, res) => {
  await prisma.post.update({ where: { id: req.params.id }, data: { shareCount: { increment: 1 } } }).catch(() => undefined);
  res.json({ ok: true });
}));

postsRouter.get('/:id/comments', asyncH(async (req, res) =>
  res.json(await comments.listForPost(req.params.id, req.user?.id, req.user?.role === 'OWNER'))));

postsRouter.post('/:id/comments', requireAuth, requireNotBlocked, commentLimiter,
  validate(z.object({ body: z.string().trim().min(2).max(600) })),
  asyncH(async (req, res) => { res.status(201).json(await comments.createComment(req.params.id, req.user!.id, req.body.body)); }));
