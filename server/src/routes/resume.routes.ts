import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db/prisma.js';
import { ResumeService } from '../services/resume.service.js';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const resumeRouter = Router();
const resumeService = new ResumeService();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

resumeRouter.use(authMiddleware);

resumeRouter.get('/', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    const parsedResumes = resumes.map((r) => ({
      ...r,
      parsedData: JSON.parse(r.parsedData || '{}'),
      targetRoles: JSON.parse(r.targetRoles || '[]'),
    }));

    return res.json({ success: true, resumes: parsedResumes });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

resumeRouter.post('/upload', upload.single('resume'), async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No resume file uploaded' });
    }

    const { originalname, buffer, mimetype } = req.file;
    const targetRoles = req.body.targetRoles ? JSON.parse(req.body.targetRoles) : ['Software Engineer'];

    const fileType = originalname.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF';
    const saved = await resumeService.saveResume(req.userId!, originalname, fileType, buffer, targetRoles);

    return res.status(201).json({ success: true, resume: saved });
  } catch (err: any) {
    console.error('Resume upload error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

resumeRouter.put('/:id/primary', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;

    // Reset all other resumes to non-primary
    await prisma.resume.updateMany({
      where: { userId: req.userId },
      data: { isPrimary: false },
    });

    const updated = await prisma.resume.update({
      where: { id, userId: req.userId },
      data: { isPrimary: true },
    });

    return res.json({ success: true, resume: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

resumeRouter.delete('/:id', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    await prisma.resume.delete({
      where: { id, userId: req.userId },
    });
    return res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

