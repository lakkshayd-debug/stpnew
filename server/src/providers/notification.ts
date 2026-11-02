import type { NotificationType } from '@prisma/client';

export interface NotificationPayload {
  userId: string; phone: string; type: NotificationType; title: string; body: string; link?: string | null;
}
export interface NotificationChannel { name: string; send(p: NotificationPayload): Promise<void> }

/** The in-app channel is the DB row created in notification.service; these are extra channels. */
export class LogChannel implements NotificationChannel {
  name = 'log';
  async send(p: NotificationPayload) {
    if (process.env.NODE_ENV !== 'test') console.log(`[notify:${p.type}] ${p.phone}: ${p.title}`);
  }
}

/** Stub: WhatsApp Cloud API / SMS. Push into `channels` once configured. */
export class WhatsAppChannel implements NotificationChannel {
  name = 'whatsapp';
  async send(_p: NotificationPayload) {}
}

export const channels: NotificationChannel[] = [new LogChannel()];
