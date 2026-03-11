import type { AppNotification } from '../api/notifications';

const sortByNewest = (left: AppNotification, right: AppNotification) =>
  new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();

export const mergeNotifications = (
  current: AppNotification[],
  incoming: AppNotification[],
) => {
  const byId = new Map<string, AppNotification>();

  [...current, ...incoming].forEach((notification) => {
    const existing = byId.get(notification._id);
    if (!existing) {
      byId.set(notification._id, notification);
      return;
    }

    byId.set(notification._id, {
      ...existing,
      ...notification,
      isRead: existing.isRead || notification.isRead,
    });
  });

  return Array.from(byId.values()).sort(sortByNewest);
};

export const mergeIncomingNotification = (
  current: AppNotification[],
  incoming: AppNotification,
) => {
  if (current.some((notification) => notification._id === incoming._id)) {
    return mergeNotifications(current, [incoming]);
  }

  return [incoming, ...current];
};

export const countUnreadNotifications = (notifications: AppNotification[]) =>
  notifications.filter((notification) => !notification.isRead).length;
