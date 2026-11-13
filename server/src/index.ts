import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { authRouter } from './routes/auth.routes.js';
import { profileRouter } from './routes/profile.routes.js';
import { preferencesRouter } from './routes/preferences.routes.js';
import { resumeRouter } from './routes/resume.routes.js';
import { integrationsRouter } from './routes/integrations.routes.js';
import { jobsRouter } from './routes/jobs.routes.js';
import { applicationsRouter } from './routes/applications.routes.js';
import { automationRouter } from './routes/automation.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { sseRouter } from './routes/sse.routes.js';
import { workerDaemon } from './worker/scheduler.js';

const app = express();

// Middlewares
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AutoJob AI Core Backend & Autonomous Daemon',
    environment: config.nodeEnv,
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/automation', automationRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/sse', sseRouter);

// Serve static frontend build if dist/client exists
const clientDistPath = path.resolve(process.cwd(), 'client', 'dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('AutoJob AI Server running. Start Vite frontend on port 5173 or build client.');
    }
  });
});

// Start Server & Daemon (only when not running under unit tests)
let server: any;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, () => {
    console.log(`[AutoJob AI] Server running on http://localhost:${config.port}`);
    workerDaemon.start().catch((err) => {
      console.error('[AutoJob AI] Failed to start autonomous worker daemon:', err);
    });
  });
}

export default app;
export { server };

