import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { sseService } from '../services/sse.service.js';

export const notificationsRouter = Router();

notificationsRouter.use(authMiddleware);

notificationsRouter.get('/', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const parsed = notifications.map((n) => ({
      ...n,
      metadata: JSON.parse(n.metadata || '{}'),
    }));

    return res.json({ success: true, notifications: parsed });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

notificationsRouter.put('/:id/read', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id, userId: req.userId },
      data: { read: true },
    });
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

notificationsRouter.put('/mark-all-read', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, read: false },
      data: { read: true },
    });
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

