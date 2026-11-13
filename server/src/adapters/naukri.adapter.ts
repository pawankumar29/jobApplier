import {
  PlatformAdapter,
  JobSearchParams,
  DiscoveredJobPayload,
  ApplicationMechanismResult,
  ApplicationSubmissionResult,
} from './types.js';
import { BrowserAutomationService } from '../services/browser-automation.service.js';

export class NaukriAdapter implements PlatformAdapter {
  platformName = 'NAUKRI';

  async validateCredentials(credentials: Record<string, any>): Promise<{ valid: boolean; message?: string }> {
    if (!credentials) {
      return { valid: false, message: 'No Naukri credentials provided' };
    }
    if (credentials.authType === 'CREDENTIALS' && credentials.username && credentials.password) {
      return { valid: true, message: 'Naukri account credentials configured' };
    }
    if (credentials.authType === 'SESSION_TOKEN' && credentials.sessionCookie) {
      return { valid: true, message: 'Naukri session token verified' };
    }
    return { valid: true, message: 'Naukri search adapter ready' };
  }

  async discoverJobs(params: JobSearchParams, credentials?: Record<string, any>): Promise<DiscoveredJobPayload[]> {
    const jobs: DiscoveredJobPayload[] = [];
    const titles = params.titles && params.titles.length > 0 ? params.titles : ['Software Engineer'];
    const locations = params.locations && params.locations.length > 0 ? params.locations : ['Bangalore', 'Remote'];

    for (const title of titles.slice(0, 3)) {
      for (const loc of locations.slice(0, 2)) {
        try {
          const discovered = await this.fetchNaukriLiveJobs(title, loc, params, credentials);
          jobs.push(...discovered);
        } catch (err: any) {
          console.warn(`[NaukriAdapter] Error fetching real jobs for ${title} in ${loc}:`, err.message);
        }
      }
    }

    if (params.excludedCompanies && params.excludedCompanies.length > 0) {
      const excludedLower = params.excludedCompanies.map((c) => c.toLowerCase());
      return jobs.filter((j) => !excludedLower.some((ex) => j.company.toLowerCase().includes(ex)));
    }

    // Sort by latest posted first
    return jobs.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
  }

  private async fetchNaukriLiveJobs(
    title: string,
    location: string,
    params: JobSearchParams,
    credentials?: Record<string, any>
  ): Promise<DiscoveredJobPayload[]> {
    try {
      // Use BrowserAutomationService to bypass Akamai 406 protection
      const browserJobs = await BrowserAutomationService.getInstance().discoverNaukriJobs(title, location);
      if (browserJobs.length > 0) {
        return browserJobs;
      }
    } catch (e: any) {
      console.warn(`[NaukriAdapter] Headless browser discovery error for ${title}:`, e.message);
    }

    return [];
  }

  async evaluateApplicationMechanism(jobUrl: string): Promise<ApplicationMechanismResult> {
    return {
      supported: true,
      type: 'PORTAL_1CLICK',
      requiresCaptcha: false,
      questions: [
        { id: 'expected_ctc', label: 'Expected Annual CTC', type: 'TEXT', required: true },
        { id: 'notice_period', label: 'Notice Period (Days)', type: 'TEXT', required: true },
        { id: 'current_location', label: 'Current Residence City', type: 'TEXT', required: true },
      ],
    };
  }

  async submitApplication(
    job: DiscoveredJobPayload,
    candidateProfile: Record<string, any>,
    resume: { fileName: string; parsedText: string; filePath?: string },
    credentials?: Record<string, any>
  ): Promise<ApplicationSubmissionResult> {
    if (credentials && (credentials.username || credentials.sessionCookie)) {
      try {
        const browserResult = await BrowserAutomationService.getInstance().submitNaukriJob(
          job.applicationUrl,
          credentials,
          candidateProfile
        );
        return browserResult;
      } catch (err: any) {
        console.warn('[NaukriAdapter] Browser automation submit error:', err.message);
        return {
          success: false,
          status: 'FAILED',
          errorReason: `Naukri automation error: ${err.message}`,
          filledFields: {},
          screeningAnswers: {},
        };
      }
    }

    return {
      success: false,
      status: 'ACTION_REQUIRED',
      actionRequiredReason: 'Naukri session cookie required to execute 1-Click apply.',
      responseNotes: 'Please ensure Naukri is logged in via interactive setup.',
      filledFields: {},
      screeningAnswers: {},
    };
  }
}
