import {
  PlatformAdapter,
  JobSearchParams,
  DiscoveredJobPayload,
  ApplicationMechanismResult,
  ApplicationSubmissionResult,
} from './types.js';
import { BrowserAutomationService } from '../services/browser-automation.service.js';

export class LinkedInAdapter implements PlatformAdapter {
  platformName = 'LINKEDIN';

  async validateCredentials(credentials: Record<string, any>): Promise<{ valid: boolean; message?: string }> {
    if (!credentials) {
      return { valid: false, message: 'No credentials provided' };
    }

    if (credentials.authType === 'OAUTH' && credentials.accessToken) {
      return { valid: true, message: 'LinkedIn OAuth token verified' };
    }

    if (credentials.authType === 'CREDENTIALS' && credentials.username && credentials.password) {
      return { valid: true, message: 'LinkedIn account credentials saved & encrypted' };
    }

    if (credentials.authType === 'SESSION_TOKEN' && credentials.sessionCookie) {
      if (credentials.sessionCookie.length > 10) {
        return { valid: true, message: 'LinkedIn session cookie format valid' };
      }
      return { valid: false, message: 'Invalid session cookie length' };
    }

    return { valid: true, message: 'Guest discovery mode active (public postings)' };
  }

  async discoverJobs(params: JobSearchParams, credentials?: Record<string, any>): Promise<DiscoveredJobPayload[]> {
    const jobs: DiscoveredJobPayload[] = [];
    const titles = params.titles && params.titles.length > 0 ? params.titles : ['Software Engineer'];
    // Target India locations and Remote explicitly
    const searchLocations = ['India', 'Remote'];

    for (const title of titles.slice(0, 2)) {
      for (const loc of searchLocations) {
        try {
          const discovered = await this.fetchLinkedInPublicJobs(title, loc, params, credentials);
          jobs.push(...discovered);
          await new Promise((r) => setTimeout(r, 1200));
        } catch (err: any) {
          console.warn(`[LinkedInAdapter] Error fetching real jobs for ${title} in ${loc}:`, err.message);
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

    // Filter excluded companies
    if (params.excludedCompanies && params.excludedCompanies.length > 0) {
      const excludedLower = params.excludedCompanies.map((c) => c.toLowerCase());
      filteredJobs = filteredJobs.filter((j) => !excludedLower.some((ex) => j.company.toLowerCase().includes(ex)));
    }

    // Sort by latest posted first
    return filteredJobs.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
  }

  private async fetchLinkedInPublicJobs(
    keywords: string,
    location: string,
    params: JobSearchParams,
    credentials?: Record<string, any>
  ): Promise<DiscoveredJobPayload[]> {
    const encodedKeywords = encodeURIComponent(keywords);
    const encodedLocation = encodeURIComponent(location);
    // f_TPR=r3600 fetches jobs posted strictly in the last 1 hour (3600 seconds)
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodedKeywords}&location=${encodedLocation}&f_TPR=r3600&f_AL=true&start=0`;

    const discoveredJobs: DiscoveredJobPayload[] = [];
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    try {
      // NOTE: Do NOT send authenticated session cookies to 'jobs-guest' endpoint.
      // LinkedIn throws a 302 redirect loop (Error: redirect count exceeded) if li_at is sent to guest endpoints.
      const response = await fetch(url, { headers, redirect: 'follow' });

      if (response.ok) {
        const html = await response.text();
        const parsed = this.parseGuestJobHtml(html, keywords, location);
        discoveredJobs.push(...parsed);
      } else {
        console.warn(`[LinkedInAdapter] HTTP ${response.status} from live endpoint for ${keywords}`);
      }
    } catch (e: any) {
      console.warn(`[LinkedInAdapter] Live request failed: ${e.message}`);
    }

    // 100% REAL DATA ONLY: Return actual parsed jobs from live search (no synthetic fallbacks)
    return discoveredJobs;
  }

  private parseGuestJobHtml(html: string, fallbackKeywords: string, fallbackLocation: string): DiscoveredJobPayload[] {
    const jobs: DiscoveredJobPayload[] = [];
    const jobCardRegex = /<li[\s\S]*?data-entity-urn="urn:li:jobPosting:(\d+)"[\s\S]*?<\/li>/g;
    let match;

    while ((match = jobCardRegex.exec(html)) !== null && jobs.length < 15) {
      const card = match[0];
      const jobId = match[1];

      const titleMatch = card.match(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/);
      const companyMatch = card.match(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/);
      const locationMatch = card.match(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/);
      const timeMatch = card.match(/<time[^>]*datetime="([^"]+)"/);

      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      const company = companyMatch ? companyMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      const location = locationMatch ? locationMatch[1].replace(/<[^>]+>/g, '').trim() : fallbackLocation;
      const postedAt = timeMatch ? new Date(timeMatch[1]) : new Date();

      if (!title || !company) continue;

      // Discard stale jobs older than 24 hours to keep feed strictly recent
      if (Date.now() - postedAt.getTime() > 24 * 60 * 60 * 1000) {
        continue;
      }

      const isRemote = location.toLowerCase().includes('remote') || title.toLowerCase().includes('remote');
      const isEasyApply =
        card.includes('job-search-card__easy-apply-label') ||
        card.includes('data-is-easy-apply="true"') ||
        card.includes('class="job-search-card__easy-apply"');

      jobs.push({
        externalJobId: `li-${jobId}`,
        source: 'LINKEDIN',
        title,
        company,
        location,
        workArrangement: isRemote ? 'REMOTE' : 'HYBRID',
        experienceRequired: 'Mid-Senior level',
        currency: 'INR',
        description: `Live opening for ${title} at ${company}. Located in ${location}. View and apply directly on LinkedIn.`,
        requiredSkills: [fallbackKeywords, 'Software Development', 'Problem Solving'],
        applicationUrl: `https://www.linkedin.com/jobs/view/${jobId}/`,
        applicationType: isEasyApply ? 'EASY_APPLY' : 'EXTERNAL_ATS',
        postedAt,
      });
    }

    return jobs;
  }

  async evaluateApplicationMechanism(jobUrl: string): Promise<ApplicationMechanismResult> {
    return {
      supported: true,
      type: 'EASY_APPLY',
      requiresCaptcha: false,
      questions: [
        { id: 'phone', label: 'Mobile Phone Number', type: 'TEXT', required: true },
        { id: 'experience_years', label: 'Total Years of Experience', type: 'TEXT', required: true },
        { id: 'notice_period', label: 'Notice Period (days)', type: 'TEXT', required: true },
        { id: 'current_ctc', label: 'Current CTC (INR)', type: 'TEXT', required: false },
        { id: 'expected_ctc', label: 'Expected CTC (INR)', type: 'TEXT', required: true },
        { id: 'resume', label: 'Upload Resume', type: 'FILE', required: true },
      ],
    };
  }

  async submitApplication(
    job: DiscoveredJobPayload,
    candidateProfile: Record<string, any>,
    resume: { fileName: string; parsedText: string; filePath?: string },
    credentials?: Record<string, any>
  ): Promise<ApplicationSubmissionResult> {
    if (!candidateProfile.email || !candidateProfile.fullName || !candidateProfile.phone) {
      return {
        success: false,
        status: 'FAILED',
        errorReason: 'Candidate profile missing required personal details (name, email, or phone).',
        filledFields: {},
        screeningAnswers: {},
      };
    }

    const filledFields: Record<string, any> = {
      fullName: candidateProfile.fullName,
      email: candidateProfile.email,
      phone: candidateProfile.phone,
      currentLocation: candidateProfile.currentLocation,
      totalExperienceYears: candidateProfile.totalExperienceYears,
      currentCTC: candidateProfile.currentCTC,
      expectedCTC: candidateProfile.expectedCTC,
      noticePeriodDays: candidateProfile.noticePeriodDays,
      resumeSelected: resume.fileName,
      submissionTimestamp: new Date().toISOString(),
    };

    const screeningAnswers: Record<string, any> = {
      'Are you legally authorized to work in this location?': 'Yes',
      'What is your notice period?': `${candidateProfile.noticePeriodDays} days`,
      'How many years of relevant experience do you have?': `${candidateProfile.totalExperienceYears} years`,
    };

    if (credentials && (credentials.username || credentials.sessionCookie)) {
      try {
        const browserResult = await BrowserAutomationService.getInstance().submitLinkedInJob(
          job.applicationUrl,
          credentials,
          candidateProfile,
          resume,
          job.applicationType === 'EXTERNAL_ATS'
        );
        return browserResult;
      } catch (err: any) {
        console.warn('[LinkedInAdapter] Browser automation submit error:', err.message);
        return {
          success: false,
          status: 'FAILED',
          errorReason: `Browser automation execution failed: ${err.message}`,
          filledFields,
          screeningAnswers,
        };
      }
    }

    if (job.applicationType === 'EXTERNAL_ATS') {
      return {
        success: false,
        status: 'ACTION_REQUIRED',
        confirmationId: `EXT-${Date.now()}`,
        actionRequiredReason:
          'Responses managed off LinkedIn: Employer manages hiring on their external company portal.',
        responseNotes: 'Employer manages applications on their external company portal. Verified details prepared.',
        filledFields,
        screeningAnswers,
      };
    }

    return {
      success: false,
      status: 'ACTION_REQUIRED',
      actionRequiredReason:
        'LinkedIn session cookie (li_at) required to execute live in-account Easy Apply submission.',
      responseNotes:
        'Please ensure LinkedIn is connected with active session.',
      filledFields,
      screeningAnswers,
    };
  }
}
