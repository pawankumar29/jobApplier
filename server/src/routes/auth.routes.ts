import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { config } from '../config/index.js';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res): Promise<any> => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password, and name are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'User already exists with this email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        profile: {
          create: {
            fullName: name,
            email,
            phone: '+1 555-0199',
            currentLocation: 'Bangalore, India',
            preferredLocations: JSON.stringify(['Bangalore', 'Remote', 'Hyderabad']),
            education: JSON.stringify([
              { degree: 'B.Tech in Computer Science', institution: 'National Institute of Technology', year: '2020' },
            ]),
            totalExperienceYears: 4.0,
            employmentHistory: JSON.stringify([
              {
                role: 'Senior Software Engineer',
                company: 'Apex Technologies',
                duration: '2022 - Present',
                description: 'Full stack development with Node.js, TypeScript, React, and cloud systems.',
              },
            ]),
            technicalSkills: JSON.stringify(['TypeScript', 'Node.js', 'React', 'Docker', 'AWS', 'PostgreSQL', 'Python']),
            programmingLanguages: JSON.stringify(['TypeScript', 'JavaScript', 'Python', 'Go']),
            frameworks: JSON.stringify(['React', 'Next.js', 'Express', 'TailwindCSS']),
            databases: JSON.stringify(['PostgreSQL', 'Redis', 'MongoDB']),
            cloudDevops: JSON.stringify(['AWS', 'Docker', 'CI/CD', 'Kubernetes']),
            projects: JSON.stringify([
              {
                title: 'High-Concurrency Fintech Gateway',
                description: 'Engineered sub-second payment settlement pipelines.',
                technologies: ['TypeScript', 'Node.js', 'Redis', 'PostgreSQL'],
              },
            ]),
            certifications: JSON.stringify(['AWS Certified Developer', 'Kubernetes Application Developer']),
            currentCTC: 2200000,
            expectedCTC: 3200000,
            noticePeriodDays: 30,
            availability: 'Immediate',
          },
        },
        preferences: {
          create: {
            preferredTitles: JSON.stringify(['Senior Software Engineer', 'Full Stack Developer', 'Lead Engineer']),
            targetIndustries: JSON.stringify(['Technology', 'Fintech', 'SaaS']),
            preferredCompanies: JSON.stringify(['Stripe', 'Razorpay', 'Vercel', 'PhonePe']),
            excludedCompanies: JSON.stringify(['UnverifiedAgency']),
            excludedCategories: JSON.stringify(['Internship']),
            minExperience: 2,
            maxExperience: 8,
            minSalary: 2000000,
            remotePreference: 'ANY',
            employmentType: 'FULL_TIME',
            preferredLocations: JSON.stringify(['Bangalore', 'Remote', 'Hyderabad']),
            minRelevanceScore: 75,
            maxDailyApplications: 99999, // Unlimited
          },
        },
        automationConfig: {
          create: {
            isRunning: true,
            status: 'RUNNING',
            checkIntervalMinutes: 5,
            maxConcurrency: 3,
            dailyApplicationsCount: 0,
          },
        },
      },
      include: {
        profile: true,
        preferences: true,
      },
    });

    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.post('/login', async (req, res): Promise<any> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true, preferences: true, automationConfig: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profile: user.profile,
        preferences: user.preferences,
        automationConfig: user.automationConfig,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.get('/me', authMiddleware, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        profile: true,
        preferences: true,
        resumes: {
          select: { id: true, fileName: true, fileType: true, isPrimary: true, targetRoles: true, createdAt: true },
        },
        integrations: {
          select: { id: true, platform: true, authType: true, status: true, lastSyncAt: true, errorReason: true },
        },
        automationConfig: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profile: user.profile,
        preferences: user.preferences,
        resumes: user.resumes,
        integrations: user.integrations,
        automationConfig: user.automationConfig,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

