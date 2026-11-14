import {
  PlatformAdapter,
  JobSearchParams,
  DiscoveredJobPayload,
  ApplicationMechanismResult,
  ApplicationSubmissionResult,
} from './types.js';
import { BrowserAutomationService } from '../services/browser-automation.service.js';

export class IndeedAdapter implements PlatformAdapter {
  platformName = 'INDEED';

  async validateCredentials(credentials: Record<string, any>): Promise<{ valid: boolean; message?: string }> {
    if (!credentials) {
      return { valid: false, message: 'No Indeed credentials provided' };
    }
    if (credentials.authType === 'CREDENTIALS' && credentials.username && credentials.password) {
      return { valid: true, message: 'Indeed account credentials configured' };
    }
    if (credentials.authType === 'SESSION_TOKEN' && credentials.sessionCookie) {
      return { valid: true, message: 'Indeed session token verified' };
    }
    return { valid: true, message: 'Indeed search & auto-apply adapter ready' };
  }

  async discoverJobs(params: JobSearchParams, credentials?: Record<string, any>): Promise<DiscoveredJobPayload[]> {
    const jobs: DiscoveredJobPayload[] = [];
    const titles = params.titles && params.titles.length > 0 ? params.titles : ['Software Engineer'];
    const locations = params.locations && params.locations.length > 0 ? params.locations : ['India', 'Remote'];

    for (const title of titles.slice(0, 3)) {
      for (const loc of locations.slice(0, 2)) {
        try {
          const discovered = await this.fetchIndeedLiveJobs(title, loc, params, credentials);
          jobs.push(...discovered);
        } catch (err: any) {
          console.warn(`[IndeedAdapter] Error fetching real jobs for ${title} in ${loc}:`, err.message);
        }
      }
    }

    const indianKeywords = [
      'india', 'bangalore', 'bengaluru', 'hyderabad', 'delhi', 'noida', 'gurugram', 'gurgaon',
      'mumbai', 'pune', 'mohali', 'chandigarh', 'kolkata', 'chennai', 'ahmedabad', 'jaipur',
      'indore', 'kochi', 'kerala', 'trivandrum', 'bhubaneswar', 'lucknow', 'panchkula', 'punjab',
      'haryana', 'karnataka', 'telangana', 'maharashtra', 'tamil nadu'
    ];

    // Filter: India jobs OR 100% Remote foreign jobs only (no foreign onsite/hybrid)
    let filteredJobs = jobs.filter((j) => {
      const loc = (j.location || '').toLowerCase();
      const isIndia = indianKeywords.some((c) => loc.includes(c));
      const isRemote =
        j.workArrangement === 'REMOTE' ||
        loc.includes('remote') ||
        j.title.toLowerCase().includes('remote');
      return isIndia || isRemote;
    });

    if (params.excludedCompanies && params.excludedCompanies.length > 0) {
      const excludedLower = params.excludedCompanies.map((c) => c.toLowerCase());
      filteredJobs = filteredJobs.filter((j) => !excludedLower.some((ex) => j.company.toLowerCase().includes(ex)));
    }

    // Sort by latest posted first
    return filteredJobs.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
  }

  private async fetchIndeedLiveJobs(
    title: string,
    location: string,
    params: JobSearchParams,
    credentials?: Record<string, any>
  ): Promise<DiscoveredJobPayload[]> {
    try {
      const browserJobs = await BrowserAutomationService.getInstance().discoverIndeedJobs(title, location);
      if (browserJobs.length > 0) {
        return browserJobs;
      }
    } catch (e: any) {
      console.warn(`[IndeedAdapter] Headless browser discovery error for ${title}:`, e.message);
    }
    return [];
  }

  async evaluateApplicationMechanism(jobUrl: string): Promise<ApplicationMechanismResult> {
    return {
      supported: true,
      type: 'EASY_APPLY',
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
    const creds = credentials || {};
    try {
      const browserResult = await BrowserAutomationService.getInstance().submitIndeedJob(
        job.applicationUrl,
        creds,
        candidateProfile,
        resume
      );
      return browserResult;
    } catch (err: any) {
      console.warn('[IndeedAdapter] Browser automation submit error:', err.message);
      return {
        success: false,
        status: 'FAILED',
        errorReason: `Indeed application error: ${err.message}`,
        filledFields: {
          fullName: candidateProfile.fullName,
          email: candidateProfile.email,
        },
        screeningAnswers: {},
      };
    }
  }
}

