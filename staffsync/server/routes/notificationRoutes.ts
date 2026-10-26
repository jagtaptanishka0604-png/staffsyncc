import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateUser, AuthenticatedRequest } from '../auth.js';

export const notificationRouter = Router();

// GET /api/v1/notifications
notificationRouter.get('/', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.currentUser!._id;
  const userNotifs = db.notifications
    .filter(n => n.recipientId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const unreadCount = userNotifs.filter(n => !n.isRead).length;

  return res.json({
    success: true,
    count: userNotifs.length,
    unreadCount,
    notifications: userNotifs,
  });
});

// PATCH /api/v1/notifications/:id/read - Mark single as read
notificationRouter.patch('/:id/read', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.currentUser!._id;
  const notif = db.notifications.find(n => n._id === req.params.id && n.recipientId === userId);

  if (!notif) {
    return res.status(404).json({ success: false, message: 'Notification not found.' });
  }

  notif.isRead = true;
  db.save();

  return res.json({ success: true, notification: notif });
});

// PATCH /api/v1/notifications/read-all - Mark all as read
notificationRouter.patch('/read-all', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.currentUser!._id;
  db.notifications.forEach(n => {
    if (n.recipientId === userId) {
      n.isRead = true;
    }
  });
  db.save();

  return res.json({ success: true, message: 'All notifications marked as read.' });
});
