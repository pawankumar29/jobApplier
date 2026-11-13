import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { workerDaemon } from '../worker/scheduler.js';

export const jobsRouter = Router();

jobsRouter.use(authMiddleware);

jobsRouter.get('/', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { source, status, minScore, search, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (source) where.source = (source as string).toUpperCase();
    if (status) where.status = (status as string).toUpperCase();
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { company: { contains: search as string } },
        { location: { contains: search as string } },
      ];
    }

    const [total, jobs] = await Promise.all([
      prisma.discoveredJob.count({ where }),
      prisma.discoveredJob.findMany({
        where,
        orderBy: [{ postedAt: 'desc' }, { discoveredAt: 'desc' }],
        skip,
        take,
        include: {
          evaluations: {
            where: { userId: req.userId },
            take: 1,
          },
          applications: {
            where: { userId: req.userId },
            take: 1,
          },
        },
      }),
    ]);

    const formatted = jobs.map((j) => {
      const evaluation = j.evaluations[0] || null;
      const application = j.applications[0] || null;
      return {
        ...j,
        requiredSkills: JSON.parse(j.requiredSkills || '[]'),
        evaluation: evaluation
          ? {
              ...evaluation,
              matchingSkills: JSON.parse(evaluation.matchingSkills || '[]'),
              missingSkills: JSON.parse(evaluation.missingSkills || '[]'),
              eligibilityIssues: JSON.parse(evaluation.eligibilityIssues || '[]'),
              reasons: JSON.parse(evaluation.reasons || '[]'),
            }
          : null,
        application: application
          ? {
              ...application,
              filledFields: JSON.parse(application.filledFields || '{}'),
              screeningAnswers: JSON.parse(application.screeningAnswers || '{}'),
            }
          : null,
      };
    });

    // Optional filter by minScore in memory if provided
    let results = formatted;
    if (minScore) {
      const threshold = parseInt(minScore as string, 10);
      results = results.filter((j) => j.evaluation && j.evaluation.score >= threshold);
    }

    return res.json({
      success: true,
      total,
      page: pageNum,
      limit: take,
      jobs: results,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

jobsRouter.post('/trigger-discovery', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    // Run an on-demand discovery cycle in background
    setTimeout(async () => {
      try {
        await workerDaemon.runAutomationCycle();
      } catch (err) {
        console.error('Trigger discovery error:', err);
      }
    }, 100);

    return res.json({ success: true, message: 'Job discovery cycle triggered immediately in background.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

jobsRouter.get('/:id', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const job = await prisma.discoveredJob.findUnique({
      where: { id },
      include: {
        evaluations: { where: { userId: req.userId } },
        applications: { where: { userId: req.userId } },
      },
    });

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const evaluation = job.evaluations[0] || null;
    const application = job.applications[0] || null;

    return res.json({
      success: true,
      job: {
        ...job,
        requiredSkills: JSON.parse(job.requiredSkills || '[]'),
        evaluation: evaluation
          ? {
              ...evaluation,
              matchingSkills: JSON.parse(evaluation.matchingSkills || '[]'),
              missingSkills: JSON.parse(evaluation.missingSkills || '[]'),
              eligibilityIssues: JSON.parse(evaluation.eligibilityIssues || '[]'),
              reasons: JSON.parse(evaluation.reasons || '[]'),
            }
          : null,
        application,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

