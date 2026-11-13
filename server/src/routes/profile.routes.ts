import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const profileRouter = Router();

profileRouter.use(authMiddleware);

profileRouter.get('/', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId },
    });
    return res.json({ success: true, profile });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

profileRouter.put('/', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const data = req.body;
    const updated = await prisma.profile.upsert({
      where: { userId: req.userId },
      update: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        currentLocation: data.currentLocation,
        preferredLocations: typeof data.preferredLocations === 'string' ? data.preferredLocations : JSON.stringify(data.preferredLocations || []),
        education: typeof data.education === 'string' ? data.education : JSON.stringify(data.education || []),
        totalExperienceYears: parseFloat(data.totalExperienceYears) || 0,
        employmentHistory: typeof data.employmentHistory === 'string' ? data.employmentHistory : JSON.stringify(data.employmentHistory || []),
        technicalSkills: typeof data.technicalSkills === 'string' ? data.technicalSkills : JSON.stringify(data.technicalSkills || []),
        programmingLanguages: typeof data.programmingLanguages === 'string' ? data.programmingLanguages : JSON.stringify(data.programmingLanguages || []),
        frameworks: typeof data.frameworks === 'string' ? data.frameworks : JSON.stringify(data.frameworks || []),
        databases: typeof data.databases === 'string' ? data.databases : JSON.stringify(data.databases || []),
        cloudDevops: typeof data.cloudDevops === 'string' ? data.cloudDevops : JSON.stringify(data.cloudDevops || []),
        projects: typeof data.projects === 'string' ? data.projects : JSON.stringify(data.projects || []),
        certifications: typeof data.certifications === 'string' ? data.certifications : JSON.stringify(data.certifications || []),
        currentCTC: data.currentCTC ? parseFloat(data.currentCTC) : null,
        expectedCTC: data.expectedCTC ? parseFloat(data.expectedCTC) : null,
        noticePeriodDays: data.noticePeriodDays !== undefined && !isNaN(parseInt(data.noticePeriodDays, 10)) ? parseInt(data.noticePeriodDays, 10) : 0,
        availability: data.availability || (parseInt(data.noticePeriodDays, 10) === 0 ? 'Immediate' : '30 Days'),
      },
      create: {
        userId: req.userId!,
        fullName: data.fullName || 'User',
        email: data.email || 'user@example.com',
        phone: data.phone || '',
        currentLocation: data.currentLocation || '',
        preferredLocations: JSON.stringify(data.preferredLocations || []),
        education: JSON.stringify(data.education || []),
        totalExperienceYears: parseFloat(data.totalExperienceYears) || 0,
        employmentHistory: JSON.stringify(data.employmentHistory || []),
        technicalSkills: JSON.stringify(data.technicalSkills || []),
        programmingLanguages: JSON.stringify(data.programmingLanguages || []),
        frameworks: JSON.stringify(data.frameworks || []),
        databases: JSON.stringify(data.databases || []),
        cloudDevops: JSON.stringify(data.cloudDevops || []),
        projects: JSON.stringify(data.projects || []),
        certifications: JSON.stringify(data.certifications || []),
        currentCTC: data.currentCTC ? parseFloat(data.currentCTC) : null,
        expectedCTC: data.expectedCTC ? parseFloat(data.expectedCTC) : null,
        noticePeriodDays: data.noticePeriodDays !== undefined && !isNaN(parseInt(data.noticePeriodDays, 10)) ? parseInt(data.noticePeriodDays, 10) : 0,
        availability: data.availability || (parseInt(data.noticePeriodDays, 10) === 0 ? 'Immediate' : '30 Days'),
      },
    });

    return res.json({ success: true, profile: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

