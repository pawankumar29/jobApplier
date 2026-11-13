import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/db/prisma.js';
import { LinkedInAdapter } from '../src/adapters/linkedin.adapter.js';
import { NaukriAdapter } from '../src/adapters/naukri.adapter.js';
import { AIMatcherService } from '../src/services/ai-matcher.service.js';
import { latencyTracker } from '../src/worker/latency-tracker.js';

describe('AutoJob AI Platform - End-to-End Pipeline Verification', () => {
  let authToken = '';
  let userId = '';
  const testEmail = `test.pilot.${Date.now()}@example.com`;

  it('Step 1: User Registration & Onboarding', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        name: 'Jordan Pilot',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    authToken = res.body.token;
    userId = res.body.user.id;
  });

  it('Step 2: Authenticated /api/auth/me Profile Retrieval', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.profile).toBeDefined();
    expect(res.body.user.preferences).toBeDefined();
  });

  it('Step 3: Update Professional Profile and Job Preferences', async () => {
    const profileRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fullName: 'Jordan Pilot',
        email: testEmail,
        phone: '+1 555-0144',
        currentLocation: 'Bangalore',
        totalExperienceYears: 5,
        currentCTC: 2800000,
        expectedCTC: 3800000,
        noticePeriodDays: 15,
        technicalSkills: ['TypeScript', 'Node.js', 'React', 'AWS', 'Docker'],
      });

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.profile.totalExperienceYears).toBe(5);

    const prefRes = await request(app)
      .put('/api/preferences')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        preferredTitles: ['Senior Staff Engineer', 'Lead Full Stack'],
        minRelevanceScore: 75,
        maxDailyApplications: 25,
      });

    expect(prefRes.status).toBe(200);
    expect(prefRes.body.preferences.minRelevanceScore).toBe(75);
  });

  it('Step 4: Platform Adapters Discovery (LinkedIn & Naukri)', async () => {
    const linkedIn = new LinkedInAdapter();
    const naukri = new NaukriAdapter();

    const liJobs = await linkedIn.discoverJobs({
      titles: ['Senior Software Engineer'],
      locations: ['Remote'],
      remotePreference: 'REMOTE',
    });
    expect(liJobs.length).toBeGreaterThan(0);
    expect(liJobs[0].source).toBe('LINKEDIN');
    expect(['EASY_APPLY', 'EXTERNAL_ATS']).toContain(liJobs[0].applicationType);

    const nkJobs = await naukri.discoverJobs({
      titles: ['Full Stack Developer'],
      locations: ['Bangalore'],
      remotePreference: 'ANY',
    });
    expect(Array.isArray(nkJobs)).toBe(true);
  }, 40000);

  it('Step 5: AI Matching Engine Semantic Evaluation & Scoring', async () => {
    const matcher = new AIMatcherService();
    const candidate = {
      fullName: 'Jordan Pilot',
      totalExperienceYears: 5,
      currentLocation: 'Bangalore',
      preferredLocations: ['Bangalore', 'Remote'],
      technicalSkills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker', 'AWS'],
      programmingLanguages: ['TypeScript'],
      frameworks: ['React'],
      databases: ['PostgreSQL'],
      cloudDevops: ['AWS', 'Docker'],
      projects: [],
      noticePeriodDays: 15,
    };

    const job = {
      title: 'Senior Software Engineer',
      company: 'Stripe',
      location: 'Remote',
      workArrangement: 'REMOTE',
      experienceRequired: '4+ years',
      description: 'Hiring Senior Software Engineer proficient in TypeScript, React, and AWS.',
      requiredSkills: ['TypeScript', 'React', 'AWS'],
    };

    const evalResult = await matcher.evaluateJobMatch(candidate, job);
    expect(evalResult.score).toBeGreaterThanOrEqual(75);
    expect(['HIGH', 'EXCELLENT']).toContain(evalResult.classification);
    expect(evalResult.matchingSkills).toContain('TypeScript');
  });

  it('Step 6: Telemetry and Latency Tracking', () => {
    const jobId = `job-test-${Date.now()}`;
    const postedAt = new Date(Date.now() - 300000); // 5 mins ago
    const discoveredAt = new Date(Date.now() - 240000); // 4 mins ago

    latencyTracker.recordDiscovery(jobId, 'ext-101', 'LINKEDIN', postedAt, discoveredAt);
    latencyTracker.recordEvaluation(jobId, new Date(Date.now() - 180000));
    latencyTracker.recordApplicationInitiation(jobId, new Date(Date.now() - 60000));
    const finalRecord = latencyTracker.recordApplicationSubmission(jobId, new Date());

    expect(finalRecord).toBeDefined();
    expect(finalRecord?.totalJobToApplicationMs).toBeGreaterThan(0);

    const metrics = latencyTracker.getMetricsSummary();
    expect(metrics.totalTracked).toBeGreaterThan(0);
  });

  it('Step 7: Automation Controls (Pause & Resume)', async () => {
    const pauseRes = await request(app)
      .post('/api/automation/control')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'PAUSE' });

    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.config.status).toBe('PAUSED');

    const resumeRes = await request(app)
      .post('/api/automation/control')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'START' });

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.config.status).toBe('RUNNING');
  });
});

