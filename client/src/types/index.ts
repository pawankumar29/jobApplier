export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  preferredLocations: string[] | string;
  education: Array<{ degree: string; institution: string; year?: string }>;
  totalExperienceYears: number;
  employmentHistory: Array<{ role: string; company: string; duration?: string; description?: string }>;
  technicalSkills: string[];
  programmingLanguages: string[];
  frameworks: string[];
  databases: string[];
  cloudDevops: string[];
  projects: Array<{ title: string; description: string; technologies: string[] }>;
  certifications: string[];
  currentCTC: number | null;
  expectedCTC: number | null;
  noticePeriodDays: number;
  availability: string;
}

export interface JobPreference {
  id: string;
  preferredTitles: string[];
  targetIndustries: string[];
  preferredCompanies: string[];
  excludedCompanies: string[];
  excludedCategories: string[];
  minExperience: number;
  maxExperience: number;
  minSalary: number | null;
  remotePreference: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'ANY';
  employmentType: 'FULL_TIME' | 'CONTRACT' | 'ANY';
  preferredLocations: string[];
  minRelevanceScore: number;
  maxDailyApplications: number;
}

export interface DiscoveredJob {
  id: string;
  source: 'LINKEDIN' | 'NAUKRI' | 'INDEED' | 'ATS_GREENHOUSE' | 'ATS_LEVER' | 'ATS_WORKDAY' | 'DIRECT';
  externalJobId: string;
  title: string;
  company: string;
  location: string;
  workArrangement: 'REMOTE' | 'HYBRID' | 'ONSITE';
  experienceRequired?: string;
  minSalary?: number;
  maxSalary?: number;
  currency: string;
  description: string;
  requiredSkills: string[];
  applicationUrl: string;
  applicationType: 'EASY_APPLY' | 'PORTAL_1CLICK' | 'EXTERNAL_ATS';
  postedAt: string;
  discoveredAt: string;
  status: 'DISCOVERED' | 'EVALUATED' | 'QUEUED' | 'APPLIED' | 'SKIPPED' | 'FAILED';
  evaluation?: JobEvaluation | null;
  application?: Application | null;
}

export interface JobEvaluation {
  id: string;
  jobId: string;
  score: number;
  classification: 'EXCELLENT' | 'HIGH' | 'RELEVANT' | 'LOW';
  matchingSkills: string[];
  missingSkills: string[];
  experienceCompatibility: string;
  salaryCompatibility: string;
  eligibilityIssues: string[];
  reasons: string[];
  evaluatedAt: string;
  latencyDiscoveryToEvalMs: number;
}

export interface Application {
  id: string;
  jobId: string;
  resumeId?: string;
  status: 'QUEUED' | 'PROCESSING' | 'SUBMITTED' | 'ACTION_REQUIRED' | 'FAILED' | 'REJECTED';
  appliedAt?: string;
  mechanism: string;
  filledFields: Record<string, any>;
  screeningAnswers: Record<string, any>;
  confirmationId?: string;
  responseNotes?: string;
  errorReason?: string;
  latencyJobToAppMs: number;
  job?: DiscoveredJob;
  resume?: { id: string; fileName: string };
  createdAt: string;
}

export interface IntegrationAccount {
  id: string;
  platform: 'LINKEDIN' | 'NAUKRI' | 'INDEED' | 'ATS_PORTAL';
  authType: string;
  status: 'CONNECTED' | 'EXPIRED' | 'ERROR' | 'DISCONNECTED';
  lastSyncAt: string | null;
  errorReason: string | null;
  metadata: Record<string, any>;
  isConfigured: boolean;
}

export interface AutomationConfig {
  id: string;
  isRunning: boolean;
  checkIntervalMinutes: number;
  maxConcurrency: number;
  dailyApplicationsCount: number;
  status: 'RUNNING' | 'PAUSED' | 'STOPPED';
  lastCycleAt?: string;
  nextCycleAt?: string;
}

export interface LatencyMetrics {
  avgPublicationToDiscoveryMin: number;
  avgDiscoveryToEvalSec: number;
  avgEvalToSubmissionSec: number;
  avgTotalLatencyMin: number;
  totalTracked: number;
}

export interface MetricsSummary {
  totalDiscovered: number;
  totalEvaluated: number;
  totalSubmitted: number;
  totalFailed: number;
  totalPending: number;
  averageRelevanceScore: number;
  latency: LatencyMetrics;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata: Record<string, any>;
}

export interface AutomationLog {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  action: string;
  message: string;
  timestamp: string;
}

