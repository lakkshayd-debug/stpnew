import { prisma } from '../lib/prisma.js';
import type { Prisma, PostType } from '@prisma/client';
import type { PostDTO } from '../../../shared/types.js';

const buildInclude = (userId?: string) =>
  ({
    images: { orderBy: { order: 'asc' as const } },
    _count: { select: { likes: true, comments: { where: { status: 'APPROVED' as const } } } },
    likes: userId ? { where: { userId }, select: { userId: true } } : (false as const),
    savedBy: userId ? { where: { userId }, select: { userId: true } } : (false as const),
  }) satisfies Prisma.PostInclude;

type PostRow = Prisma.PostGetPayload<{ include: ReturnType<typeof buildInclude> }>;

export function toDTO(p: PostRow): PostDTO {
  return {
    id: p.id, title: p.title, description: p.description, category: p.category, type: p.type,
    price: p.price ? Number(p.price) : null, priceLabel: p.priceLabel, priceUnit: p.priceUnit,
    pinned: p.pinned, isSample: p.isSample, createdAt: p.createdAt.toISOString(),
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, order: i.order })),
    likeCount: p._count.likes, commentCount: p._count.comments,
    liked: Array.isArray(p.likes) && p.likes.length > 0,
    saved: Array.isArray(p.savedBy) && p.savedBy.length > 0,
  };
}

export async function listPosts(opts: {
  cursor?: string; limit: number; category?: string; type?: PostType; q?: string; userId?: string; savedOnly?: boolean;
}) {
  const where: Prisma.PostWhereInput = {};
  if (opts.category) where.category = opts.category;
  if (opts.type) where.type = opts.type;
  if (opts.q)
    where.OR = [
      { title: { contains: opts.q, mode: 'insensitive' } },
      { description: { contains: opts.q, mode: 'insensitive' } },
      { category: { contains: opts.q, mode: 'insensitive' } },
    ];
  if (opts.savedOnly && opts.userId) where.savedBy = { some: { userId: opts.userId } };

  const rows = await prisma.post.findMany({
    where, include: buildInclude(opts.userId), take: opts.limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
  });
  const hasMore = rows.length > opts.limit;
  const items = rows.slice(0, opts.limit).map(toDTO);
  return { items, nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null };
}

export async function getPost(id: string, userId?: string) {
  const p = await prisma.post.findUnique({ where: { id }, include: buildInclude(userId) });
  return p ? toDTO(p) : null;
}

/** One like per user per post is enforced by the composite primary key. */
export async function toggleLike(userId: string, postId: string) {
  const key = { userId_postId: { userId, postId } };
  const existing = await prisma.like.findUnique({ where: key });
  if (existing) await prisma.like.delete({ where: key });
  else await prisma.like.create({ data: { userId, postId } });
  const likeCount = await prisma.like.count({ where: { postId } });
  return { liked: !existing, likeCount };
}

export async function toggleSave(userId: string, postId: string) {
  const key = { userId_postId: { userId, postId } };
  const existing = await prisma.savedPost.findUnique({ where: key });
  if (existing) await prisma.savedPost.delete({ where: key });
  else await prisma.savedPost.create({ data: { userId, postId } });
  return { saved: !existing };
}
