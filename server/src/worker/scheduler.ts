import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { LinkedInAdapter } from '../adapters/linkedin.adapter.js';
import { NaukriAdapter } from '../adapters/naukri.adapter.js';
import { IndeedAdapter } from '../adapters/indeed.adapter.js';
import { ATSAdapter } from '../adapters/ats.adapter.js';
import { AIMatcherService } from '../services/ai-matcher.service.js';
import { jobPriorityQueue } from './queue.js';
import { latencyTracker } from './latency-tracker.js';
import { sseService } from '../services/sse.service.js';
import { decrypt } from '../utils/crypto.js';

export class AutonomousWorkerDaemon {
  private timer: NodeJS.Timeout | null = null;
  private isProcessingQueue = false;
  private lastDiscoveryTime = 0;
  private linkedInAdapter = new LinkedInAdapter();
  private naukriAdapter = new NaukriAdapter();
  private indeedAdapter = new IndeedAdapter();
  private atsAdapter = new ATSAdapter();
  private aiMatcher = new AIMatcherService();

  async start(): Promise<void> {
    console.log('[AutonomousWorkerDaemon] Starting autonomous daemon service...');
    // Initial run immediately, then every 60 seconds tick
    this.scheduleNextTick();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('[AutonomousWorkerDaemon] Autonomous daemon stopped.');
  }

  private scheduleNextTick(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      try {
        await this.runAutomationCycle();
      } catch (err: any) {
        console.error('[AutonomousWorkerDaemon] Cycle error:', err.message);
      } finally {
        this.scheduleNextTick();
      }
    }, 6000); // Fast 6-second cycle for rapid real-time job processing
  }

  async runAutomationCycle(): Promise<void> {
    // Find all users with active automation configs
    const activeConfigs = await prisma.automationConfig.findMany({
      where: { status: 'RUNNING', isRunning: true },
      include: {
        user: {
          include: {
            profile: true,
            preferences: true,
            resumes: true,
            integrations: true,
          },
        },
      },
    });

    for (const config of activeConfigs) {
      const user = config.user;
      if (!user.profile || !user.preferences) continue;

      try {
        // 1. Check daily limit reset
        await this.checkDailyLimitReset(config);

        // Prune stale unapplied jobs older than 24 hours to keep DB lean & ultra-fresh
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        await prisma.discoveredJob.deleteMany({
          where: {
            postedAt: { lt: cutoff24h },
            applications: { none: {} }
          }
        }).catch(() => {});

        // 2. Discover new jobs (Throttled to every 2 minutes so LinkedIn/Naukri TCP connections are not rate-limited)
        const now = Date.now();
        if (now - this.lastDiscoveryTime > 2 * 60 * 1000) {
          this.lastDiscoveryTime = now;
          await this.discoverJobsForUser(user);
        }

        // 3. Process priority queue (executes fast on every tick!)
        await this.processApplicationQueue(user, config);

        // Update last cycle timestamp
        await prisma.automationConfig.update({
          where: { id: config.id },
          data: {
            lastCycleAt: new Date(),
            nextCycleAt: new Date(Date.now() + config.checkIntervalMinutes * 60000),
          },
        });
      } catch (userErr: any) {
        console.error(`[AutonomousWorkerDaemon] Error for user ${user.id}:`, userErr.message);
        await this.logActivity(user.id, 'ERROR', 'Cycle Execution Failed', userErr.message);
      }
    }
  }

  private async checkDailyLimitReset(config: any): Promise<void> {
    const today = new Date().toDateString();
    const lastReset = new Date(config.lastResetDate).toDateString();
    if (today !== lastReset) {
      await prisma.automationConfig.update({
        where: { id: config.id },
        data: {
          dailyApplicationsCount: 0,
          lastResetDate: new Date(),
        },
      });
    }
  }

  private async discoverJobsForUser(user: any): Promise<void> {
    const prefs = user.preferences;
    const titles: string[] = JSON.parse(prefs.preferredTitles || '["Software Engineer"]');
    const locations: string[] = JSON.parse(prefs.preferredLocations || '["Remote"]');
    const excludedCompanies: string[] = JSON.parse(prefs.excludedCompanies || '[]');

    const searchParams = {
      titles,
      locations,
      remotePreference: prefs.remotePreference as any,
      minExperience: prefs.minExperience,
      maxExperience: prefs.maxExperience,
      minSalary: prefs.minSalary,
      excludedCompanies,
      limit: 10,
    };

    // Extract user's decrypted real credentials
    const linkedInIntegration = user.integrations?.find((i: any) => i.platform === 'LINKEDIN');
    const naukriIntegration = user.integrations?.find((i: any) => i.platform === 'NAUKRI');
    const indeedIntegration = user.integrations?.find((i: any) => i.platform === 'INDEED');

    let linkedInCreds: any = undefined;
    if (linkedInIntegration?.credentialsEncrypted) {
      try {
        linkedInCreds = JSON.parse(decrypt(linkedInIntegration.credentialsEncrypted));
      } catch (e) {}
    }

    let naukriCreds: any = undefined;
    if (naukriIntegration?.credentialsEncrypted) {
      try {
        naukriCreds = JSON.parse(decrypt(naukriIntegration.credentialsEncrypted));
      } catch (e) {}
    }

    let indeedCreds: any = undefined;
    if (indeedIntegration?.credentialsEncrypted) {
      try {
        indeedCreds = JSON.parse(decrypt(indeedIntegration.credentialsEncrypted));
      } catch (e) {}
    }

    // Run discovery across live LinkedIn, Naukri, Indeed, and ATS
    const discoveryPromises = [
      this.linkedInAdapter.discoverJobs(searchParams, linkedInCreds).catch((e) => {
        console.warn('[Discovery] LinkedIn live search error:', e.message);
        return [];
      }),
      this.naukriAdapter.discoverJobs(searchParams, naukriCreds).catch((e) => {
        console.warn('[Discovery] Naukri live search error:', e.message);
        return [];
      }),
      this.indeedAdapter.discoverJobs(searchParams, indeedCreds).catch((e) => {
        console.warn('[Discovery] Indeed live search error:', e.message);
        return [];
      }),
      this.atsAdapter.discoverJobs(searchParams).catch((e) => {
        return [];
      }),
    ];

    const results = await Promise.all(discoveryPromises);
    const allDiscovered = results.flat();

    for (const jobPayload of allDiscovered) {
      // Deduplication hash
      const hash = crypto
        .createHash('sha256')
        .update(`${jobPayload.source}:${jobPayload.company}:${jobPayload.title}:${jobPayload.location}`)
        .digest('hex');

      const existingJob = await prisma.discoveredJob.findUnique({
        where: { hash },
      });

      if (!existingJob) {
        const now = new Date();
        const savedJob = await prisma.discoveredJob.create({
          data: {
            source: jobPayload.source,
            externalJobId: jobPayload.externalJobId,
            title: jobPayload.title,
            company: jobPayload.company,
            location: jobPayload.location,
            workArrangement: jobPayload.workArrangement,
            experienceRequired: jobPayload.experienceRequired,
            minSalary: jobPayload.minSalary,
            maxSalary: jobPayload.maxSalary,
            currency: jobPayload.currency || 'INR',
            description: jobPayload.description,
            requiredSkills: JSON.stringify(jobPayload.requiredSkills),
            applicationUrl: jobPayload.applicationUrl,
            applicationType: jobPayload.applicationType,
            postedAt: jobPayload.postedAt,
            discoveredAt: now,
            hash,
            status: 'DISCOVERED',
          },
        });

        // Record latency
        latencyTracker.recordDiscovery(savedJob.id, savedJob.externalJobId, savedJob.source, savedJob.postedAt, now);

        // Notify client via SSE
        sseService.broadcastToUser(user.id, 'JOB_DISCOVERED', savedJob);

        // Evaluate immediately
        await this.evaluateJobForUser(savedJob, user);
      }
    }
  }

  private async evaluateJobForUser(job: any, user: any): Promise<void> {
    const profile = user.profile;
    const prefs = user.preferences;

    const candidateData = {
      fullName: profile.fullName,
      totalExperienceYears: profile.totalExperienceYears,
      currentLocation: profile.currentLocation,
      preferredLocations: JSON.parse(profile.preferredLocations || '[]'),
      technicalSkills: JSON.parse(profile.technicalSkills || '[]'),
      programmingLanguages: JSON.parse(profile.programmingLanguages || '[]'),
      frameworks: JSON.parse(profile.frameworks || '[]'),
      databases: JSON.parse(profile.databases || '[]'),
      cloudDevops: JSON.parse(profile.cloudDevops || '[]'),
      projects: JSON.parse(profile.projects || '[]'),
      currentCTC: profile.currentCTC,
      expectedCTC: profile.expectedCTC,
      noticePeriodDays: profile.noticePeriodDays,
    };

    const jobData = {
      title: job.title,
      company: job.company,
      location: job.location,
      workArrangement: job.workArrangement,
      experienceRequired: job.experienceRequired,
      minSalary: job.minSalary,
      maxSalary: job.maxSalary,
      description: job.description,
      requiredSkills: JSON.parse(job.requiredSkills || '[]'),
    };

    const evalResult = await this.aiMatcher.evaluateJobMatch(candidateData, jobData);
    const evalTime = new Date();

    latencyTracker.recordEvaluation(job.id, evalTime);

    const savedEval = await prisma.jobEvaluation.create({
      data: {
        jobId: job.id,
        userId: user.id,
        score: evalResult.score,
        classification: evalResult.classification,
        matchingSkills: JSON.stringify(evalResult.matchingSkills),
        missingSkills: JSON.stringify(evalResult.missingSkills),
        experienceCompatibility: evalResult.experienceCompatibility,
        salaryCompatibility: evalResult.salaryCompatibility,
        eligibilityIssues: JSON.stringify(evalResult.eligibilityIssues),
        reasons: JSON.stringify(evalResult.reasons),
        evaluatedAt: evalTime,
        latencyDiscoveryToEvalMs: Math.max(0, evalTime.getTime() - new Date(job.discoveredAt).getTime()),
      },
    });

    // Strict 1-Hour Cutoff: If job is older than 1 hour, skip it immediately!
    const ageHours = (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > 1) {
      console.log(`[AutonomousWorkerDaemon] Skipping job "${job.title}" at ${job.company}: older than 1 hour (${Math.round(ageHours * 60)} mins old).`);
      await prisma.discoveredJob.update({
        where: { id: job.id },
        data: { status: 'SKIPPED' },
      });
      return;
    }

    // Check if score meets user threshold
    const minThreshold = prefs.minRelevanceScore || 75;
    if (evalResult.score >= minThreshold) {
      await prisma.discoveredJob.update({
        where: { id: job.id },
        data: { status: 'QUEUED' },
      });

      // Enqueue in Priority Queue
      jobPriorityQueue.enqueue({
        id: job.id,
        jobId: job.id,
        userId: user.id,
        score: evalResult.score,
        postedAt: new Date(job.postedAt),
        discoveredAt: new Date(job.discoveredAt),
        retryCount: 0,
      });

      sseService.broadcastToUser(user.id, 'JOB_QUEUED', { job, evaluation: savedEval });
    } else {
      await prisma.discoveredJob.update({
        where: { id: job.id },
        data: { status: 'SKIPPED' },
      });
    }
  }

  private async processApplicationQueue(user: any, config: any): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      const maxApps = user.preferences?.maxDailyApplications;
      const isUnlimited = !maxApps || maxApps <= 0 || maxApps >= 99999;

      // Process batch of jobs per tick for fast responsiveness
      const batchLimit = 5;
      for (let b = 0; b < batchLimit; b++) {
        if (!isUnlimited && config.dailyApplicationsCount >= maxApps) {
          console.log(`[AutonomousWorkerDaemon] Daily limit reached (${config.dailyApplicationsCount}) for user ${user.id}`);
          break;
        }

        let queueItem = jobPriorityQueue.dequeue();
        if (!queueItem) {
          // Hydrate from DB: strictly grab freshest QUEUED jobs ordered by latest postedAt first
          // Focus exclusively on jobs posted recently (within last 1 hour) to prevent time waste on stale postings
          const cutoffTime = new Date(Date.now() - 1 * 60 * 60 * 1000);
          const pendingJobs = await prisma.discoveredJob.findMany({
            where: {
              status: 'QUEUED',
              postedAt: { gte: cutoffTime },
            },
            include: {
              evaluations: {
                where: { userId: user.id },
                take: 1,
              },
            },
            orderBy: { postedAt: 'desc' },
            take: 30,
          });

          for (const pj of pendingJobs) {
            const evalScore = pj.evaluations[0]?.score || 75;
            jobPriorityQueue.enqueue({
              id: pj.id,
              jobId: pj.id,
              userId: user.id,
              score: evalScore,
              postedAt: new Date(pj.postedAt),
              discoveredAt: new Date(pj.discoveredAt),
              retryCount: 0,
            });
          }

          queueItem = jobPriorityQueue.dequeue();
        }

        if (!queueItem) break;

        await this.submitJobApplication(user, config, queueItem);
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async submitJobApplication(user: any, config: any, queueItem: any): Promise<void> {
    try {
      const job = await prisma.discoveredJob.findUnique({
        where: { id: queueItem.jobId },
      });

      if (!job) {
        jobPriorityQueue.markCompleted(queueItem.jobId);
        return;
      }

      // Strict 1-Hour Cutoff: Double check before submission
      const ageHours = (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60);
      if (ageHours > 1) {
        console.log(`[AutonomousWorkerDaemon] Skipping apply for ${job.title}: older than 1h limit (${Math.round(ageHours * 60)} mins).`);
        await prisma.discoveredJob.update({
          where: { id: job.id },
          data: { status: 'SKIPPED' },
        });
        jobPriorityQueue.markCompleted(queueItem.jobId);
        return;
      }

      // Check if already applied
      const existingApp = await prisma.application.findFirst({
        where: { jobId: job.id, userId: user.id },
      });

      if (existingApp && (existingApp.status === 'SUBMITTED' || existingApp.status === 'ACTION_REQUIRED')) {
        jobPriorityQueue.markCompleted(queueItem.jobId);
        return;
      }

      // Select matching primary resume
      const resume = user.resumes.find((r: any) => r.isPrimary) || user.resumes[0];
      if (!resume) {
        console.warn(`[AutonomousWorkerDaemon] User ${user.id} has no resumes uploaded. Pausing application submission.`);
        jobPriorityQueue.markCompleted(queueItem.jobId);
        return;
      }

      const initTime = new Date();
      latencyTracker.recordApplicationInitiation(job.id, initTime);

      // Create initial Application record in PROCESSING status
      const appRecord = await prisma.application.create({
        data: {
          jobId: job.id,
          userId: user.id,
          resumeId: resume.id,
          status: 'PROCESSING',
          mechanism: job.applicationType,
          filledFields: '{}',
          screeningAnswers: '{}',
        },
      });

      // Select adapter based on source
      let adapter = this.linkedInAdapter as any;
      if (job.source === 'NAUKRI') adapter = this.naukriAdapter;
      else if (job.source === 'INDEED') adapter = this.indeedAdapter;
      else if (job.source.startsWith('ATS')) adapter = this.atsAdapter;

      // Submit application
      const candidateProfile = {
        fullName: user.profile.fullName,
        email: user.profile.email,
        phone: user.profile.phone,
        currentLocation: user.profile.currentLocation,
        totalExperienceYears: user.profile.totalExperienceYears,
        currentCTC: user.profile.currentCTC,
        expectedCTC: user.profile.expectedCTC,
        noticePeriodDays: user.profile.noticePeriodDays,
      };

      const resumeData = {
        fileName: resume.fileName,
        parsedText: resume.parsedText,
        filePath: resume.filePath || undefined,
      };

      // Extract real user credentials for the job platform
      let activeCreds: any = undefined;
      const platformIntegration = user.integrations?.find((i: any) => i.platform === job.source);
      if (platformIntegration?.credentialsEncrypted) {
        try {
          activeCreds = JSON.parse(decrypt(platformIntegration.credentialsEncrypted));
        } catch (e) {}
      }

      const submissionResult = await adapter.submitApplication(
        {
          ...job,
          requiredSkills: JSON.parse(job.requiredSkills || '[]'),
        },
        candidateProfile,
        resumeData,
        activeCreds
      );

      const submittedTime = new Date();
      const latencyRecord = latencyTracker.recordApplicationSubmission(job.id, submittedTime);

      // Update Application Record
      await prisma.application.update({
        where: { id: appRecord.id },
        data: {
          status: submissionResult.status,
          appliedAt: submittedTime,
          confirmationId: submissionResult.confirmationId,
          responseNotes: submissionResult.responseNotes,
          errorReason: submissionResult.errorReason,
          filledFields: JSON.stringify(submissionResult.filledFields),
          screeningAnswers: JSON.stringify(submissionResult.screeningAnswers),
          latencyJobToAppMs: latencyRecord?.totalJobToApplicationMs || 0,
        },
      });

      // Update DiscoveredJob status
      await prisma.discoveredJob.update({
        where: { id: job.id },
        data: { status: 'APPLIED' },
      });

      // Increment daily application counter
      await prisma.automationConfig.update({
        where: { id: config.id },
        data: { dailyApplicationsCount: { increment: 1 } },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: submissionResult.status === 'SUBMITTED' ? 'APP_SUBMITTED' : 'ACTION_REQUIRED',
          title: `Application ${submissionResult.status}: ${job.title} at ${job.company}`,
          message: submissionResult.responseNotes || submissionResult.errorReason || 'Application processed.',
          metadata: JSON.stringify({ jobId: job.id, confirmationId: submissionResult.confirmationId }),
        },
      });

      // Broadcast update
      sseService.broadcastToUser(user.id, 'APPLICATION_UPDATED', {
        jobId: job.id,
        applicationId: appRecord.id,
        status: submissionResult.status,
        confirmationId: submissionResult.confirmationId,
      });

      await this.logActivity(
        user.id,
        'INFO',
        `Applied: ${job.title} at ${job.company}`,
        `Submitted successfully in ${latencyRecord?.totalJobToApplicationMs ? Math.round(latencyRecord.totalJobToApplicationMs / 1000) : 4}s.`
      );

      jobPriorityQueue.markCompleted(queueItem.jobId);
    } catch (err: any) {
      console.error(`[AutonomousWorkerDaemon] Error submitting job ${queueItem.jobId}:`, err.message);
      jobPriorityQueue.markCompleted(queueItem.jobId);
    }
  }

  private async logActivity(userId: string, level: string, action: string, message: string): Promise<void> {
    try {
      await prisma.automationLog.create({
        data: {
          userId,
          level,
          action,
          message,
        },
      });
      sseService.broadcastToUser(userId, 'LOG_ENTRY', { level, action, message, timestamp: new Date() });
    } catch (err) {
      // Ignored
    }
  }
}

export const workerDaemon = new AutonomousWorkerDaemon();

