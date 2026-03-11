import { describe, expect, it } from 'vitest';

import type { AppNotification } from '../api/notifications';
import {
  countUnreadNotifications,
  mergeIncomingNotification,
  mergeNotifications,
} from './notificationState';

const createNotification = (
  overrides: Partial<AppNotification> = {},
): AppNotification => ({
  _id: overrides._id ?? 'n-1',
  senderUserId: overrides.senderUserId ?? 1,
  targetUserId: overrides.targetUserId ?? 2,
  message: overrides.message ?? '알림',
  type: overrides.type ?? 'admin_message',
  category: overrides.category ?? 'ADMIN',
  isRead: overrides.isRead ?? false,
  createdAt: overrides.createdAt ?? '2026-03-12T00:00:00.000Z',
  link: overrides.link,
});

describe('notificationState', () => {
  it('deduplicates the same notification received from socket and polling', () => {
    const initial = [createNotification({ _id: 'n-1', createdAt: '2026-03-12T00:00:01.000Z' })];
    const incoming = [
      createNotification({ _id: 'n-1', createdAt: '2026-03-12T00:00:01.000Z' }),
      createNotification({ _id: 'n-2', createdAt: '2026-03-12T00:00:02.000Z' }),
    ];

    const merged = mergeNotifications(initial, incoming);

    expect(merged.map((item) => item._id)).toEqual(['n-2', 'n-1']);
  });

  it('preserves read state when a stale unread snapshot arrives later', () => {
    const current = [createNotification({ _id: 'n-1', isRead: true })];
    const incoming = [createNotification({ _id: 'n-1', isRead: false })];

    const merged = mergeNotifications(current, incoming);

    expect(merged[0].isRead).toBe(true);
  });

  it('prepends a new notification without duplicating an existing id', () => {
    const current = [createNotification({ _id: 'n-1' })];

    expect(mergeIncomingNotification(current, createNotification({ _id: 'n-2' })).map((item) => item._id)).toEqual([
      'n-2',
      'n-1',
    ]);
    expect(mergeIncomingNotification(current, createNotification({ _id: 'n-1' }))).toHaveLength(1);
  });

  it('counts unread notifications from merged state', () => {
    const notifications = [
      createNotification({ _id: 'n-1', isRead: false }),
      createNotification({ _id: 'n-2', isRead: true }),
      createNotification({ _id: 'n-3', isRead: false }),
    ];

    expect(countUnreadNotifications(notifications)).toBe(2);
  });
});
