export interface JobSearchParams {
  titles: string[];
  locations: string[];
  remotePreference: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'ANY';
  minExperience?: number;
  maxExperience?: number;
  minSalary?: number;
  excludedCompanies?: string[];
  limit?: number;
}

export interface DiscoveredJobPayload {
  externalJobId: string;
  source: 'LINKEDIN' | 'NAUKRI' | 'INDEED' | 'ATS_GREENHOUSE' | 'ATS_LEVER' | 'ATS_WORKDAY' | 'DIRECT';
  title: string;
  company: string;
  location: string;
  workArrangement: 'REMOTE' | 'HYBRID' | 'ONSITE';
  experienceRequired?: string;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  description: string;
  requiredSkills: string[];
  applicationUrl: string;
  applicationType: 'EASY_APPLY' | 'PORTAL_1CLICK' | 'EXTERNAL_ATS';
  postedAt: Date;
}

export interface ApplicationQuestion {
  id: string;
  label: string;
  type: 'TEXT' | 'SELECT' | 'RADIO' | 'CHECKBOX' | 'FILE';
  options?: string[];
  required: boolean;
}

export interface ApplicationMechanismResult {
  supported: boolean;
  type: 'EASY_APPLY' | 'PORTAL_1CLICK' | 'EXTERNAL_ATS' | 'MANUAL_REQUIRED';
  requiresCaptcha: boolean;
  questions?: ApplicationQuestion[];
  reason?: string;
}

export interface ApplicationSubmissionResult {
  success: boolean;
  status: 'SUBMITTED' | 'ACTION_REQUIRED' | 'FAILED';
  confirmationId?: string;
  responseNotes?: string;
  errorReason?: string;
  actionRequiredReason?: string;
  filledFields: Record<string, any>;
  screeningAnswers: Record<string, any>;
}

export interface PlatformAdapter {
  platformName: string;
  validateCredentials(credentials: Record<string, any>): Promise<{ valid: boolean; message?: string }>;
  discoverJobs(params: JobSearchParams, credentials?: Record<string, any>): Promise<DiscoveredJobPayload[]>;
  evaluateApplicationMechanism(jobUrl: string): Promise<ApplicationMechanismResult>;
  submitApplication(
    job: DiscoveredJobPayload,
    candidateProfile: Record<string, any>,
    resume: { fileName: string; parsedText: string; filePath?: string },
    credentials?: Record<string, any>
  ): Promise<ApplicationSubmissionResult>;
}

