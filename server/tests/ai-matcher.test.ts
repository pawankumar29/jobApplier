import { describe, it, expect } from 'vitest';
import { AIMatcherService } from '../src/services/ai-matcher.service.js';

describe('AI Matcher Service', () => {
  const matcher = new AIMatcherService();

  const mockCandidate = {
    fullName: 'Alex Chen',
    totalExperienceYears: 4.5,
    currentLocation: 'Bangalore',
    preferredLocations: ['Bangalore', 'Remote'],
    technicalSkills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker', 'AWS'],
    programmingLanguages: ['TypeScript', 'JavaScript'],
    frameworks: ['React', 'Next.js'],
    databases: ['PostgreSQL', 'Redis'],
    cloudDevops: ['Docker', 'AWS'],
    projects: [],
    currentCTC: 2200000,
    expectedCTC: 3000000,
    noticePeriodDays: 30,
  };

  it('should assign HIGH or EXCELLENT match score for aligned role', async () => {
    const job = {
      title: 'Senior Full Stack Engineer',
      company: 'TechCorp',
      location: 'Remote',
      workArrangement: 'REMOTE',
      experienceRequired: '4-7 years',
      minSalary: 2800000,
      maxSalary: 4000000,
      description: 'Looking for a Senior Full Stack Engineer with TypeScript, React, and Node.js.',
      requiredSkills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'AWS'],
    };

    const result = await matcher.evaluateJobMatch(mockCandidate, job);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(['HIGH', 'EXCELLENT']).toContain(result.classification);
    expect(result.matchingSkills).toContain('TypeScript');
    expect(result.matchingSkills).toContain('React');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('should penalize significant experience gap and missing skills', async () => {
    const job = {
      title: 'Principal Embedded Systems Architect',
      company: 'Hardware Corp',
      location: 'Berlin, Germany',
      workArrangement: 'ONSITE',
      experienceRequired: '12+ years',
      minSalary: 5000000,
      maxSalary: 8000000,
      description: 'Role requires 12 years of C, Assembly, RTOS, and Kernel driver design.',
      requiredSkills: ['C', 'Assembly', 'RTOS', 'Kernel Drivers'],
    };

    const result = await matcher.evaluateJobMatch(mockCandidate, job);
    expect(result.score).toBeLessThan(70);
    expect(result.classification).toBe('LOW');
    expect(result.missingSkills.length).toBeGreaterThan(0);
    expect(result.eligibilityIssues.length).toBeGreaterThan(0);
  });
});

