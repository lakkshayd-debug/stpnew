import { prisma } from '../lib/prisma.js';
import { badRequest, notFound, forbidden } from '../lib/errors.js';
import { notify, audit } from './notification.service.js';
import type { CommentDTO } from '../../../shared/types.js';
import type { Prisma } from '@prisma/client';

const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|in|co|net|org|io|me|ly|xyz|shop|site)\b)/i;
export const containsLink = (s: string) => LINK_RE.test(s);

const inc = { author: { select: { id: true, name: true, role: true } } } satisfies Prisma.CommentInclude;
type Row = Prisma.CommentGetPayload<{ include: typeof inc }>;

const toDTO = (c: Row): CommentDTO => ({
  id: c.id, postId: c.postId, body: c.body, status: c.status, createdAt: c.createdAt.toISOString(),
  author: c.author, ownerReply: c.ownerReply, ownerRepliedAt: c.ownerRepliedAt?.toISOString() ?? null,
});

/** APPROVED comments for everyone, plus the viewer's own PENDING/REJECTED ones. Owner sees all. */
export async function listForPost(postId: string, viewerId?: string, isOwner = false) {
  const where: Prisma.CommentWhereInput = isOwner
    ? { postId }
    : { postId, OR: [{ status: 'APPROVED' }, ...(viewerId ? [{ authorId: viewerId }] : [])] };
  const rows = await prisma.comment.findMany({ where, include: inc, orderBy: { createdAt: 'asc' } });
  return rows.map(toDTO);
}

export async function createComment(postId: string, authorId: string, body: string) {
  if (containsLink(body)) throw badRequest('Links are not allowed in comments');
  if (!(await prisma.post.findUnique({ where: { id: postId }, select: { id: true } }))) throw notFound('Post not found');
  const c = await prisma.comment.create({ data: { postId, authorId, body: body.trim(), status: 'PENDING' }, include: inc });
  return toDTO(c);
}

export async function moderate(commentId: string, action: 'APPROVE' | 'REJECT' | 'DELETE', ownerId: string) {
  const c = await prisma.comment.findUnique({ where: { id: commentId }, include: { post: { select: { title: true } } } });
  if (!c) throw notFound('Comment not found');
  if (action === 'DELETE') {
    await prisma.comment.delete({ where: { id: commentId } });
    await audit(ownerId, 'COMMENT_DELETED', 'Comment', commentId);
    return { deleted: true };
  }
  const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const updated = await prisma.comment.update({ where: { id: commentId }, data: { status, moderatedAt: new Date() }, include: inc });
  await audit(ownerId, `COMMENT_${status}`, 'Comment', commentId);
  if (status === 'APPROVED') await notify(c.authorId, 'COMMENT_APPROVED', 'Your comment was approved', `On "${c.post.title}"`, `/post/${c.postId}`);
  return toDTO(updated);
}

export async function reply(commentId: string, ownerId: string, text: string) {
  const c = await prisma.comment.findUnique({ where: { id: commentId }, include: { post: { select: { title: true } } } });
  if (!c) throw notFound('Comment not found');
  if (c.status !== 'APPROVED') throw forbidden('Approve the comment before replying');
  const updated = await prisma.comment.update({ where: { id: commentId }, data: { ownerReply: text.trim(), ownerRepliedAt: new Date() }, include: inc });
  await notify(c.authorId, 'COMMENT_REPLIED', 'Shyam replied to your comment', text.slice(0, 120), `/post/${c.postId}`);
  await audit(ownerId, 'COMMENT_REPLIED', 'Comment', commentId);
  return toDTO(updated);
}
