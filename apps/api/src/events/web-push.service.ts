import { Injectable, Logger } from '@nestjs/common';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service.js';

const DEFAULT_VAPID_PUBLIC_KEY =
  'BASX3QpX4dKx6hq2SHMF4VgnoA9XMduJYKdPnaVCepefpO1EYJWxXM_r8cAnoYsC5iD3Iab-VWgfhI-MV186wyg';
const DEFAULT_VAPID_PRIVATE_KEY =
  '73jf-rrDiSaXltmSqk0VG7bm-6h0exQ0bbobmfBtazQ';
const DEFAULT_VAPID_SUBJECT = 'mailto:support@spaceappsgiza.com';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly subject: string;

  constructor(private readonly prisma: PrismaService) {
    this.publicKey =
      process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
    this.privateKey =
      process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
    this.subject = process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

    try {
      webpush.setVapidDetails(this.subject, this.publicKey, this.privateKey);
    } catch (err) {
      this.logger.error('Failed to initialize VAPID details', err);
    }
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  async saveSubscription(
    userId: string,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      update: {
        userId,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    });
  }

  async removeSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  async sendNotificationToUser(userId: string, payload: PushPayload) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions.length) return;

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/dashboard',
      icon: payload.icon || '/favicon.ico',
      tag: payload.tag || 'general',
    });

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      webpush
        .sendNotification(pushSubscription, payloadString)
        .catch(async (err) => {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            // Subscription expired or unregistered by browser
            await this.prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => {});
          } else {
            this.logger.warn(
              `Push notification failed for subscription ${sub.id}: ${err.message}`,
            );
          }
        });
    }
  }
}

