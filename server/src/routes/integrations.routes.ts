import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { LinkedInAdapter } from '../adapters/linkedin.adapter.js';
import { NaukriAdapter } from '../adapters/naukri.adapter.js';

export const integrationsRouter = Router();
const linkedInAdapter = new LinkedInAdapter();
const naukriAdapter = new NaukriAdapter();

integrationsRouter.use(authMiddleware);

integrationsRouter.get('/', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const integrations = await prisma.integrationAccount.findMany({
      where: { userId: req.userId },
    });

    const sanitized = integrations.map((i) => ({
      id: i.id,
      platform: i.platform,
      authType: i.authType,
      status: i.status,
      lastSyncAt: i.lastSyncAt,
      errorReason: i.errorReason,
      metadata: JSON.parse(i.metadata || '{}'),
      isConfigured: true,
    }));

    return res.json({ success: true, integrations: sanitized });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

integrationsRouter.post('/connect', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { platform, authType, credentials, metadata } = req.body;
    if (!platform || !authType || !credentials) {
      return res.status(400).json({ success: false, error: 'Platform, authType, and credentials are required' });
    }

    // Encrypt sensitive credentials
    const credentialsEncrypted = encrypt(JSON.stringify(credentials));

    // Test credentials with appropriate adapter
    let validation: { valid: boolean; message?: string } = { valid: true, message: 'Connected' };
    if (platform === 'LINKEDIN') {
      validation = await linkedInAdapter.validateCredentials(credentials);
    } else if (platform === 'NAUKRI') {
      validation = await naukriAdapter.validateCredentials(credentials);
    }

    const saved = await prisma.integrationAccount.upsert({
      where: {
        id: (await prisma.integrationAccount.findFirst({ where: { userId: req.userId, platform } }))?.id || 'none',
      },
      update: {
        authType,
        credentialsEncrypted,
        status: validation.valid ? 'CONNECTED' : 'ERROR',
        errorReason: validation.valid ? null : validation.message,
        lastSyncAt: new Date(),
        metadata: JSON.stringify(metadata || {}),
      },
      create: {
        userId: req.userId!,
        platform,
        authType,
        credentialsEncrypted,
        status: validation.valid ? 'CONNECTED' : 'ERROR',
        errorReason: validation.valid ? null : validation.message,
        lastSyncAt: new Date(),
        metadata: JSON.stringify(metadata || {}),
      },
    });

    return res.json({
      success: true,
      integration: {
        id: saved.id,
        platform: saved.platform,
        status: saved.status,
        lastSyncAt: saved.lastSyncAt,
      },
      message: validation.message,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

integrationsRouter.post('/:platform/disconnect', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { platform } = req.params;
    await prisma.integrationAccount.deleteMany({
      where: { userId: req.userId, platform: platform.toUpperCase() },
    });
    return res.json({ success: true, message: `${platform} disconnected successfully` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

integrationsRouter.post('/:platform/test', async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const platform = req.params.platform.toUpperCase();
    let credentials = req.body?.credentials;

    // If no credentials in request body, retrieve stored encrypted credentials from DB
    if (!credentials) {
      const stored = await prisma.integrationAccount.findFirst({
        where: { userId: req.userId, platform },
      });

      if (!stored || !stored.credentialsEncrypted) {
        return res.status(404).json({
          success: false,
          error: `No stored credentials found for ${platform}. Please enter your credentials first.`,
        });
      }

      try {
        credentials = JSON.parse(decrypt(stored.credentialsEncrypted));
      } catch (e: any) {
        return res.status(500).json({ success: false, error: 'Could not decrypt stored credentials.' });
      }
    }

    let validation: { valid: boolean; message?: string } = { valid: false, message: 'Unsupported platform' };
    if (platform === 'LINKEDIN') {
      validation = await linkedInAdapter.validateCredentials(credentials);
    } else if (platform === 'NAUKRI') {
      validation = await naukriAdapter.validateCredentials(credentials);
    }

    if (validation.valid) {
      // Update lastSyncAt and status in DB
      await prisma.integrationAccount.updateMany({
        where: { userId: req.userId, platform },
        data: {
          status: 'CONNECTED',
          errorReason: null,
          lastSyncAt: new Date(),
        },
      });

      return res.json({
        success: true,
        valid: true,
        platform,
        message: validation.message || `${platform} connection verified successfully!`,
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(400).json({
        success: false,
        valid: false,
        platform,
        message: validation.message || `Failed to verify ${platform} connection.`,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
