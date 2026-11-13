import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const preferencesRouter = Router();

preferencesRouter.use(authMiddleware);

preferencesRouter.get('/', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const preferences = await prisma.jobPreference.findUnique({
      where: { userId: req.userId },
    });
    return res.json({ success: true, preferences });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

preferencesRouter.put('/', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const data = req.body;
    const updated = await prisma.jobPreference.upsert({
      where: { userId: req.userId },
      update: {
        preferredTitles: typeof data.preferredTitles === 'string' ? data.preferredTitles : JSON.stringify(data.preferredTitles || []),
        targetIndustries: typeof data.targetIndustries === 'string' ? data.targetIndustries : JSON.stringify(data.targetIndustries || []),
        preferredCompanies: typeof data.preferredCompanies === 'string' ? data.preferredCompanies : JSON.stringify(data.preferredCompanies || []),
        excludedCompanies: typeof data.excludedCompanies === 'string' ? data.excludedCompanies : JSON.stringify(data.excludedCompanies || []),
        excludedCategories: typeof data.excludedCategories === 'string' ? data.excludedCategories : JSON.stringify(data.excludedCategories || []),
        minExperience: parseFloat(data.minExperience) || 0,
        maxExperience: parseFloat(data.maxExperience) || 15,
        minSalary: data.minSalary ? parseFloat(data.minSalary) : null,
        remotePreference: data.remotePreference || 'ANY',
        employmentType: data.employmentType || 'FULL_TIME',
        preferredLocations: typeof data.preferredLocations === 'string' ? data.preferredLocations : JSON.stringify(data.preferredLocations || []),
        minRelevanceScore: parseInt(data.minRelevanceScore, 10) || 75,
        maxDailyApplications: parseInt(data.maxDailyApplications, 10) || 20,
      },
      create: {
        userId: req.userId!,
        preferredTitles: JSON.stringify(data.preferredTitles || ['Software Engineer']),
        targetIndustries: JSON.stringify(data.targetIndustries || ['Technology']),
        preferredCompanies: JSON.stringify(data.preferredCompanies || []),
        excludedCompanies: JSON.stringify(data.excludedCompanies || []),
        excludedCategories: JSON.stringify(data.excludedCategories || []),
        minExperience: parseFloat(data.minExperience) || 0,
        maxExperience: parseFloat(data.maxExperience) || 15,
        minSalary: data.minSalary ? parseFloat(data.minSalary) : null,
        remotePreference: data.remotePreference || 'ANY',
        employmentType: data.employmentType || 'FULL_TIME',
        preferredLocations: JSON.stringify(data.preferredLocations || ['Remote']),
        minRelevanceScore: parseInt(data.minRelevanceScore, 10) || 75,
        maxDailyApplications: parseInt(data.maxDailyApplications, 10) || 20,
      },
    });

    return res.json({ success: true, preferences: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

