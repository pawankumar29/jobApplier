import { describe, it, expect, vi } from 'vitest';
import { IndeedAdapter } from '../src/adapters/indeed.adapter.js';

describe('IndeedAdapter (Indeed India Integration)', () => {
  const adapter = new IndeedAdapter();

  it('should validate credentials properly', async () => {
    const credResult = await adapter.validateCredentials({
      authType: 'CREDENTIALS',
      username: 'pk2027317@gmail.com',
      password: 'password123',
    });
    expect(credResult.valid).toBe(true);

    const tokenResult = await adapter.validateCredentials({
      authType: 'SESSION_TOKEN',
      sessionCookie: 'indeed_session=abc123xyz',
    });
    expect(tokenResult.valid).toBe(true);

    const emptyResult = await adapter.validateCredentials(null as any);
    expect(emptyResult.valid).toBe(false);
  });

  it('should evaluate application mechanism as EASY_APPLY', async () => {
    const mechanism = await adapter.evaluateApplicationMechanism('https://in.indeed.com/viewjob?jk=123456');
    expect(mechanism.supported).toBe(true);
    expect(mechanism.type).toBe('EASY_APPLY');
    expect(mechanism.requiresCaptcha).toBe(false);
    expect(mechanism.questions?.length).toBeGreaterThan(0);
  });

  it('should filter excluded companies and keep India or remote roles', async () => {
    // Mock fetchIndeedLiveJobs
    const mockJobs = [
      {
        externalJobId: 'ind-1',
        source: 'INDEED' as const,
        title: 'MERN Stack Developer',
        company: 'Blacklisted Corp',
        location: 'Bengaluru, Karnataka, India',
        workArrangement: 'HYBRID' as const,
        description: 'MERN Developer role',
        requiredSkills: ['React', 'Node.js'],
        applicationUrl: 'https://in.indeed.com/viewjob?jk=1',
        applicationType: 'EASY_APPLY' as const,
        postedAt: new Date(),
      },
      {
        externalJobId: 'ind-2',
        source: 'INDEED' as const,
        title: 'Full Stack Engineer',
        company: 'Tech Innovations India',
        location: 'Mohali, Punjab, India',
        workArrangement: 'ONSITE' as const,
        description: 'Full Stack Engineer role',
        requiredSkills: ['Node.js', 'React'],
        applicationUrl: 'https://in.indeed.com/viewjob?jk=2',
        applicationType: 'EASY_APPLY' as const,
        postedAt: new Date(),
      },
      {
        externalJobId: 'ind-3',
        source: 'INDEED' as const,
        title: 'Software Developer (Onsite London)',
        company: 'Foreign Corp',
        location: 'London, United Kingdom',
        workArrangement: 'ONSITE' as const,
        description: 'Onsite London role',
        requiredSkills: ['Java'],
        applicationUrl: 'https://in.indeed.com/viewjob?jk=3',
        applicationType: 'EXTERNAL_ATS' as const,
        postedAt: new Date(),
      },
    ];

    vi.spyOn(adapter as any, 'fetchIndeedLiveJobs').mockResolvedValue(mockJobs);

    const discovered = await adapter.discoverJobs({
      titles: ['MERN Stack Developer'],
      locations: ['India'],
      remotePreference: 'ANY',
      excludedCompanies: ['Blacklisted Corp'],
    });

    // ind-1 should be excluded due to excludedCompanies
    expect(discovered.some((j) => j.company === 'Blacklisted Corp')).toBe(false);
    // ind-3 should be excluded because it's foreign onsite
    expect(discovered.some((j) => j.externalJobId === 'ind-3')).toBe(false);
    // ind-2 should be retained (India-based role)
    expect(discovered.some((j) => j.externalJobId === 'ind-2')).toBe(true);
  });
});

