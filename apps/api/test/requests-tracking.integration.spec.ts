import { randomUUID } from 'node:crypto';
import { afterAll, describe, it, expect } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { AccountService } from '../src/account/account.service.js';

describe('Requests Tracking and Notifications System (live PostgreSQL)', () => {
  const db = new PrismaService();
  const auth = new AuthService(db);
  const account = new AccountService(db);
  const suffix = randomUUID().slice(0, 8);

  const users: string[] = [];
  const teams: string[] = [];

  afterAll(async () => {
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.roleApplication.deleteMany({ where: { userId: { in: users } } });
    await db.team.deleteMany({ where: { id: { in: teams } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  });

  async function register(name: string, role = 'participant') {
    const res = await auth.register({
      name,
      email: `${name.toLowerCase()}.${suffix}@tracktest.io`,
      password: 'Password123!',
      requestedRole: role,
    });
    users.push(res.user.id);
    return res.user;
  }

  it('aggregates requests tracking data and calculates stats correctly', async () => {
    const participant = await register('ParticipantA');
    const mentorUser = await register('MentorApplicant', 'mentor');

    // Create a role application
    const app = await db.roleApplication.findFirst({
      where: { userId: mentorUser.id },
    });
    expect(app).toBeTruthy();

    // Query tracking
    const tracking = await account.requestsTracking({
      type: 'role_application',
      status: 'pending',
    });

    expect(tracking.items.length).toBeGreaterThanOrEqual(1);
    const targetItem = tracking.items.find((i) => i.id === app!.id);
    expect(targetItem).toBeTruthy();
    expect(targetItem?.type).toBe('role_application');
    expect(targetItem?.status).toBe('pending');
    expect(targetItem?.requester.name).toBe('MentorApplicant');
    expect(tracking.stats.totalRequests).toBeGreaterThanOrEqual(1);
    expect(tracking.stats.pendingCount).toBeGreaterThanOrEqual(1);
  });

  it('delivers live notifications and allows marking them as read', async () => {
    const user = await register('NotifUser');

    // 1. Create a notification
    await account.createNotification({
      userId: user.id,
      title: 'Test Notification',
      titleAr: 'إشعار تجريبي',
      message: 'Your request was accepted.',
      messageAr: 'تم قبول طلبك.',
      type: 'mentorship',
      link: '/dashboard/participant/sessions',
    });

    // 2. Fetch notifications
    const res1 = await account.getNotifications(user.id);
    expect(res1.unreadCount).toBe(1);
    expect(res1.notifications.length).toBe(1);
    expect(res1.notifications[0].title).toBe('Test Notification');
    expect(res1.notifications[0].isRead).toBe(false);

    // 3. Mark read
    await account.markNotificationRead(user.id, res1.notifications[0].id);
    const res2 = await account.getNotifications(user.id);
    expect(res2.unreadCount).toBe(0);
    expect(res2.notifications[0].isRead).toBe(true);

    // 4. Delete notification
    await account.deleteNotification(user.id, res1.notifications[0].id);
    const res3 = await account.getNotifications(user.id);
    expect(res3.notifications.length).toBe(0);
  });
});
