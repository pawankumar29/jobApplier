import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { workerDaemon } from '../worker/scheduler.js';

export const automationRouter = Router();

automationRouter.use(authMiddleware);

automationRouter.get('/status', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    let config = await prisma.automationConfig.findUnique({
      where: { userId: req.userId },
    });

    if (!config) {
      config = await prisma.automationConfig.create({
        data: {
          userId: req.userId!,
          isRunning: true,
          status: 'RUNNING',
          checkIntervalMinutes: 15,
          maxConcurrency: 3,
        },
      });
    }

    const recentLogs = await prisma.automationLog.findMany({
      where: { userId: req.userId },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    return res.json({
      success: true,
      config,
      recentLogs,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

automationRouter.post('/control', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { action } = req.body; // START, PAUSE, RESUME, STOP
    if (!['START', 'PAUSE', 'RESUME', 'STOP'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action. Expected START, PAUSE, RESUME, or STOP.' });
    }

    let isRunning = false;
    let status = 'STOPPED';

    if (action === 'START' || action === 'RESUME') {
      isRunning = true;
      status = 'RUNNING';
    } else if (action === 'PAUSE') {
      isRunning = false;
      status = 'PAUSED';
    } else if (action === 'STOP') {
      isRunning = false;
      status = 'STOPPED';
    }

    const updated = await prisma.automationConfig.upsert({
      where: { userId: req.userId },
      update: { isRunning, status },
      create: { userId: req.userId!, isRunning, status },
    });

    await prisma.automationLog.create({
      data: {
        userId: req.userId!,
        level: 'INFO',
        action: `Automation ${action}`,
        message: `User manually changed automation status to ${status}`,
      },
    });

    // If starting/resuming, trigger an immediate cycle
    if (isRunning) {
      setTimeout(() => {
        workerDaemon.runAutomationCycle().catch((e) => console.error(e));
      }, 100);
    }

    return res.json({ success: true, config: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

automationRouter.put('/settings', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { checkIntervalMinutes, maxConcurrency } = req.body;
    const updated = await prisma.automationConfig.upsert({
      where: { userId: req.userId },
      update: {
        checkIntervalMinutes: parseInt(checkIntervalMinutes, 10) || 15,
        maxConcurrency: parseInt(maxConcurrency, 10) || 3,
      },
      create: {
        userId: req.userId!,
        checkIntervalMinutes: parseInt(checkIntervalMinutes, 10) || 15,
        maxConcurrency: parseInt(maxConcurrency, 10) || 3,
      },
    });

    return res.json({ success: true, config: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

