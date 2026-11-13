import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { sseService } from '../services/sse.service.js';
import { config } from '../config/index.js';

export const sseRouter = Router();

sseRouter.get('/stream', (req: Request, res: Response): any => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(401).json({ error: 'Token required for SSE connection' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    sseService.addClient(decoded.userId, res);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

