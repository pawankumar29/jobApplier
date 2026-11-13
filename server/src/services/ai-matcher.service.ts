import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';

export interface CandidateEvaluationInput {
  fullName: string;
  totalExperienceYears: number;
  currentLocation: string;
  preferredLocations: string[];
  technicalSkills: string[];
  programmingLanguages: string[];
  frameworks: string[];
  databases: string[];
  cloudDevops: string[];
  projects: any[];
  currentCTC?: number | null;
  expectedCTC?: number | null;
  noticePeriodDays: number;
}

export interface JobEvaluationInput {
  title: string;
  company: string;
  location: string;
  workArrangement: string;
  experienceRequired?: string | null;
  minSalary?: number | null;
  maxSalary?: number | null;
  description: string;
  requiredSkills: string[];
}

export interface MatchResult {
  score: number; // 0 - 100
  classification: 'EXCELLENT' | 'HIGH' | 'RELEVANT' | 'LOW';
  matchingSkills: string[];
  missingSkills: string[];
  experienceCompatibility: string;
  salaryCompatibility: string;
  eligibilityIssues: string[];
  reasons: string[];
}

export class AIMatcherService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    }
  }

  async evaluateJobMatch(candidate: CandidateEvaluationInput, job: JobEvaluationInput): Promise<MatchResult> {
    // If Gemini API is configured, use LLM for deep semantic reasoning
    if (this.genAI && config.geminiApiKey) {
      try {
        const llmResult = await this.evaluateWithGemini(candidate, job);
        if (llmResult) return llmResult;
      } catch (err: any) {
        console.warn('[AIMatcherService] Gemini evaluation failed, falling back to heuristic engine:', err.message);
      }
    }

    // Heuristic & Semantic Analyzer (High precision, zero-hallucination)
    return this.evaluateWithHeuristics(candidate, job);
  }

  private async evaluateWithGemini(candidate: CandidateEvaluationInput, job: JobEvaluationInput): Promise<MatchResult | null> {
    if (!this.genAI) return null;

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const prompt = `
You are an expert AI Career and Technical Job Evaluation specialist.
Perform a strict, factual, and deeply contextual evaluation of the candidate against this job opening.
Do NOT rely on naive keyword hits (e.g. if a role requires 5 years of Java and the candidate only has 1 year, penalize accordingly).

CRITICAL LOCATION CONSTRAINT (MANDATORY):
- Candidate is based in India.
- Roles located inside India are 100% eligible (Onsite, Hybrid, or Remote).
- International/Foreign roles are ONLY eligible if they are 100% REMOTE and allow working from India.
- If an international role is ONSITE or HYBRID abroad (requiring overseas relocation, local work visa, or physical presence in Europe/US/Asia), you MUST return a score of 0, classification "LOW", and list in eligibilityIssues.

Candidate Profile:
- Name: ${candidate.fullName}
- Total Years Experience: ${candidate.totalExperienceYears}
- Location: ${candidate.currentLocation} (Prefers: ${candidate.preferredLocations.join(', ')})
- Technical Skills: ${candidate.technicalSkills.join(', ')}
- Languages: ${candidate.programmingLanguages.join(', ')}
- Frameworks: ${candidate.frameworks.join(', ')}
- Databases: ${candidate.databases.join(', ')}
- Cloud / DevOps: ${candidate.cloudDevops.join(', ')}
- Expected CTC: ${candidate.expectedCTC ? candidate.expectedCTC + ' INR' : 'Not specified'}

Job Opening:
- Title: ${job.title}
- Company: ${job.company}
- Location / Arrangement: ${job.location} (${job.workArrangement})
- Experience Requirement: ${job.experienceRequired || 'Not specified'}
- Offered Salary Range: ${job.minSalary || 'N/A'} - ${job.maxSalary || 'N/A'}
- Required Skills: ${job.requiredSkills.join(', ')}
- Full Job Description:
${job.description}

Evaluate and return a JSON object with this exact schema:
{
  "score": number between 0 and 100,
  "classification": "EXCELLENT" (90-100), "HIGH" (80-89), "RELEVANT" (70-79), or "LOW" (<70),
  "matchingSkills": string[],
  "missingSkills": string[],
  "experienceCompatibility": string,
  "salaryCompatibility": string,
  "eligibilityIssues": string[],
  "reasons": string[]
}
`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const parsed = JSON.parse(text) as MatchResult;
    return parsed;
  }

  private evaluateWithHeuristics(candidate: CandidateEvaluationInput, job: JobEvaluationInput): MatchResult {
    const candidateSkillPool = new Set([
      ...candidate.technicalSkills.map((s) => s.toLowerCase()),
      ...candidate.programmingLanguages.map((s) => s.toLowerCase()),
      ...candidate.frameworks.map((s) => s.toLowerCase()),
      ...candidate.databases.map((s) => s.toLowerCase()),
      ...candidate.cloudDevops.map((s) => s.toLowerCase()),
    ]);

    const matchingSkills: string[] = [];
    const missingSkills: string[] = [];
    const eligibilityIssues: string[] = [];
    const reasons: string[] = [];

    // 1. Skill evaluation
    for (const reqSkill of job.requiredSkills) {
      const lowerReq = reqSkill.toLowerCase();
      let matched = false;
      for (const candSkill of candidateSkillPool) {
        if (candSkill.includes(lowerReq) || lowerReq.includes(candSkill)) {
          matched = true;
          break;
        }
      }
      if (matched) {
        matchingSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    }

    const skillMatchRatio = job.requiredSkills.length > 0
      ? matchingSkills.length / job.requiredSkills.length
      : 0.8;

    // 2. Experience evaluation
    let expScore = 25;
    let expCompatibility = 'Compatible';
    const expMatch = (job.experienceRequired || '').match(/(\d+)/);
    const minRequiredExp = expMatch ? parseInt(expMatch[1], 10) : 0;

    if (minRequiredExp > 0) {
      if (candidate.totalExperienceYears >= minRequiredExp) {
        expScore = 25;
        expCompatibility = `Candidate has ${candidate.totalExperienceYears} yrs experience, exceeding ${minRequiredExp} yrs required.`;
      } else if (candidate.totalExperienceYears >= minRequiredExp - 1) {
        expScore = 18;
        expCompatibility = `Candidate has ${candidate.totalExperienceYears} yrs experience, slightly below ${minRequiredExp} yrs required.`;
        eligibilityIssues.push(`Required experience is ${minRequiredExp} yrs, candidate has ${candidate.totalExperienceYears} yrs.`);
      } else {
        expScore = 8;
        expCompatibility = `Significant experience gap: candidate has ${candidate.totalExperienceYears} yrs vs ${minRequiredExp} yrs required.`;
        eligibilityIssues.push(`Experience mismatch: requires ${minRequiredExp} years.`);
      }
    }

    // 3. Location & Work arrangement
    // Strict Mandate:
    // - India jobs: 100% eligible (Onsite, Hybrid, or Remote).
    // - Foreign jobs: ONLY eligible if 100% REMOTE (can be worked from India).
    // - Foreign jobs that are Onsite or Hybrid abroad: Immediately DISQUALIFIED (Score 0).
    const locLower = (job.location || '').toLowerCase();
    const isRemote =
      job.workArrangement === 'REMOTE' ||
      locLower.includes('remote') ||
      (job.title || '').toLowerCase().includes('remote');

    const indianCities = [
      'india', 'bangalore', 'bengaluru', 'hyderabad', 'delhi', 'noida', 'gurugram', 'gurgaon',
      'mumbai', 'pune', 'mohali', 'chandigarh', 'kolkata', 'chennai', 'ahmedabad', 'jaipur',
      'indore', 'kochi', 'kerala', 'trivandrum', 'bhubaneswar', 'lucknow', 'panchkula', 'punjab',
      'haryana', 'karnataka', 'telangana', 'maharashtra', 'tamil nadu'
    ];
    const isIndiaJob = indianCities.some((c) => locLower.includes(c));

    let locationScore = 15;
    if (isIndiaJob) {
      locationScore = 15;
      reasons.push(`Job is based in India (${job.location}) with ${job.workArrangement || 'flexible'} arrangement.`);
    } else if (isRemote) {
      locationScore = 15;
      reasons.push(`Foreign opening (${job.location}) is 100% Remote - candidate can work from India.`);
    } else {
      // Foreign job requiring physical presence / visa abroad -> Disqualified!
      eligibilityIssues.push(
        `Job is located in ${job.location} (overseas/non-remote) requiring physical presence abroad. Disqualified as non-remote from India.`
      );
      return {
        score: 0,
        classification: 'LOW',
        matchingSkills,
        missingSkills,
        experienceCompatibility: expCompatibility,
        salaryCompatibility: 'N/A - Location Disqualified',
        eligibilityIssues,
        reasons: [`Disqualified: Foreign job (${job.location}) is not remote from India.`],
      };
    }

    // 4. Salary compatibility
    let salaryScore = 10;
    let salaryCompatibility = 'Within acceptable range';
    if (candidate.expectedCTC && job.maxSalary) {
      if (candidate.expectedCTC <= job.maxSalary) {
        salaryScore = 10;
        salaryCompatibility = `Offered budget (up to ${job.maxSalary} INR) satisfies candidate expectation (${candidate.expectedCTC} INR).`;
      } else {
        salaryScore = 4;
        salaryCompatibility = `Offered budget max (${job.maxSalary} INR) is below expected CTC (${candidate.expectedCTC} INR).`;
        eligibilityIssues.push('Salary expectation exceeds company listed range.');
      }
    }

    // 5. Title & domain relevance
    let titleScore = 10;
    const titleLower = job.title.toLowerCase();
    const matchesAnySkill = matchingSkills.some((s) => titleLower.includes(s.toLowerCase()));
    if (matchesAnySkill || titleLower.includes('engineer') || titleLower.includes('developer')) {
      titleScore = 10;
    }

    // Calculate total score: 40% skills + 25% experience + 15% location + 10% salary + 10% title
    const totalScore = Math.min(
      100,
      Math.max(0, Math.round(skillMatchRatio * 40 + expScore + locationScore + salaryScore + titleScore))
    );

    let classification: MatchResult['classification'] = 'LOW';
    if (totalScore >= 90) classification = 'EXCELLENT';
    else if (totalScore >= 80) classification = 'HIGH';
    else if (totalScore >= 70) classification = 'RELEVANT';
    else classification = 'LOW';

    reasons.push(
      `Matched ${matchingSkills.length} of ${job.requiredSkills.length} key required skills (${matchingSkills.slice(0, 3).join(', ')}).`
    );
    if (missingSkills.length > 0) {
      reasons.push(`Missing skills: ${missingSkills.slice(0, 3).join(', ')}.`);
    }

    return {
      score: totalScore,
      classification,
      matchingSkills,
      missingSkills,
      experienceCompatibility: expCompatibility,
      salaryCompatibility,
      eligibilityIssues,
      reasons,
    };
  }
}

