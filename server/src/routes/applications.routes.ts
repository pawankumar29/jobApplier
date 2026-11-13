import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { latencyTracker } from '../worker/latency-tracker.js';

export const applicationsRouter = Router();

applicationsRouter.use(authMiddleware);

applicationsRouter.get('/', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { status, platform, date, todayOnly, yesterdayOnly, limit = '100' } = req.query;
    const where: any = { userId: req.userId };

    if (status && status !== 'ALL') where.status = (status as string).toUpperCase();

    if (platform && platform !== 'ALL') {
      where.job = { source: (platform as string).toUpperCase() };
    }

    if (todayOnly === 'true') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      where.appliedAt = { gte: startOfDay };
    } else if (yesterdayOnly === 'true') {
      const startOfYesterday = new Date();
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      startOfYesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date();
      endOfYesterday.setDate(endOfYesterday.getDate() - 1);
      endOfYesterday.setHours(23, 59, 59, 999);
      where.appliedAt = { gte: startOfYesterday, lte: endOfYesterday };
    } else if (date) {
      const selectedDate = new Date(date as string);
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
      where.appliedAt = { gte: start, lte: end };
    }

    const [applications, userProfile] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: [{ appliedAt: 'desc' }, { createdAt: 'desc' }],
        take: parseInt(limit as string, 10) || 100,
        include: {
          job: {
            include: {
              evaluations: {
                where: { userId: req.userId },
                take: 1,
              },
            },
          },
          resume: { select: { id: true, fileName: true } },
        },
      }),
      prisma.profile.findUnique({
        where: { userId: req.userId },
        select: { fullName: true, email: true, phone: true },
      }),
    ]);

    const formatted = applications.map((a) => {
      const evalData = a.job.evaluations[0] || null;
      return {
        ...a,
        filledFields: JSON.parse(a.filledFields || '{}'),
        screeningAnswers: JSON.parse(a.screeningAnswers || '{}'),
        candidateProfile: userProfile,
        job: {
          ...a.job,
          requiredSkills: JSON.parse(a.job.requiredSkills || '[]'),
          evaluation: evalData
            ? {
                ...evalData,
                matchingSkills: JSON.parse(evalData.matchingSkills || '[]'),
                missingSkills: JSON.parse(evalData.missingSkills || '[]'),
                reasons: JSON.parse(evalData.reasons || '[]'),
              }
            : null,
        },
      };
    });

    return res.json({ success: true, applications: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

applicationsRouter.get('/metrics', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalDiscovered, totalEvaluated, totalSubmitted, totalSubmittedToday, totalFailed, totalPending] =
      await Promise.all([
        prisma.discoveredJob.count(),
        prisma.jobEvaluation.count({ where: { userId: req.userId } }),
        prisma.application.count({
          where: {
            userId: req.userId,
            status: { in: ['SUBMITTED', 'ACTION_REQUIRED', 'APPLIED'] },
          },
        }),
        prisma.application.count({
          where: {
            userId: req.userId,
            status: { in: ['SUBMITTED', 'ACTION_REQUIRED', 'APPLIED'] },
            appliedAt: { gte: startOfToday },
          },
        }),
        prisma.application.count({ where: { userId: req.userId, status: 'FAILED' } }),
        prisma.application.count({ where: { userId: req.userId, status: { in: ['QUEUED', 'PROCESSING'] } } }),
      ]);

    // Average relevance score
    const avgScoreAgg = await prisma.jobEvaluation.aggregate({
      where: { userId: req.userId },
      _avg: { score: true },
    });

    const latencyMetrics = latencyTracker.getMetricsSummary();

    return res.json({
      success: true,
      metrics: {
        totalDiscovered,
        totalEvaluated,
        totalSubmitted,
        totalSubmittedToday,
        totalFailed,
        totalPending,
        averageRelevanceScore: Math.round(avgScoreAgg._avg.score || 0),
        latency: latencyMetrics,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
