import { prisma } from '../lib/prisma.js';
import { channels } from '../providers/notification.js';
import type { NotificationType } from '@prisma/client';

/** Creates an in-app notification and fans out to extra channels (WhatsApp/SMS stubs). */
export async function notify(userId: string, type: NotificationType, title: string, body: string, link?: string | null) {
  const n = await prisma.notification.create({ data: { userId, type, title, body, link: link ?? null } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  if (user) for (const c of channels) c.send({ userId, phone: user.phone, type, title, body, link }).catch(() => undefined);
  return n;
}

export async function notifyAllCustomers(type: NotificationType, title: string, body: string, link?: string) {
  const users = await prisma.user.findMany({ where: { role: 'CUSTOMER', isBlocked: false }, select: { id: true } });
  if (users.length) await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, type, title, body, link })) });
}

export const audit = (actorId: string | null, action: string, entity: string, entityId?: string, meta?: object, ip?: string) =>
  prisma.auditLog.create({ data: { actorId, action, entity, entityId, meta: meta as object, ip } });
