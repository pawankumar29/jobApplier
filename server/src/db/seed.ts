import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { encrypt } from '../utils/crypto.js';

async function seed() {
  console.log('[Seed] Seeding realistic candidate profile & initial job postings...');

  const email = 'alex.chen@example.com';
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: 'Alex Chen',
      },
    });
  }

  // Create or update Profile
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      fullName: 'Alex Chen',
      email: 'alex.chen@example.com',
      phone: '+91 98765 43210',
      currentLocation: 'Bangalore, India',
      preferredLocations: JSON.stringify(['Bangalore', 'Remote', 'Hyderabad', 'Pune']),
      education: JSON.stringify([
        { degree: 'B.Tech in Computer Science', institution: 'National Institute of Technology Karnataka', year: '2020' },
      ]),
      totalExperienceYears: 4.5,
      employmentHistory: JSON.stringify([
        {
          role: 'Senior Full Stack Engineer',
          company: 'HyperScale Cloud Labs',
          duration: 'Jan 2023 - Present',
          description:
            'Architected distributed microservices handling 25M daily transactions with Node.js, TypeScript, and Kafka. Spearheaded modern React web interfaces.',
        },
        {
          role: 'Software Engineer',
          company: 'NexTech Solutions',
          duration: 'Jul 2020 - Dec 2022',
          description:
            'Built responsive web apps with React and Express. Optimized PostgreSQL queries and containerized services using Docker and GitHub Actions.',
        },
      ]),
      technicalSkills: JSON.stringify([
        'TypeScript',
        'Node.js',
        'React',
        'Next.js',
        'PostgreSQL',
        'Redis',
        'Docker',
        'AWS',
        'Kubernetes',
        'Kafka',
        'Python',
        'Microservices',
        'REST APIs',
        'GraphQL',
      ]),
      programmingLanguages: JSON.stringify(['TypeScript', 'JavaScript', 'Python', 'Go', 'SQL']),
      frameworks: JSON.stringify(['React', 'Next.js', 'Express', 'TailwindCSS', 'FastAPI']),
      databases: JSON.stringify(['PostgreSQL', 'Redis', 'MongoDB', 'SQLite']),
      cloudDevops: JSON.stringify(['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'GitHub Actions', 'Terraform']),
      projects: JSON.stringify([
        {
          title: 'High-Throughput Financial Stream Gateway',
          description: 'Engineered sub-50ms transaction ledger using Node.js, Redis Streams, and PostgreSQL.',
          technologies: ['TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
        },
        {
          title: 'Cloud Observability Dashboard',
          description: 'Created real-time Kubernetes cluster monitoring visualization with React and WebSockets.',
          technologies: ['React', 'TypeScript', 'TailwindCSS', 'Go'],
        },
      ]),
      certifications: JSON.stringify([
        'AWS Certified Solutions Architect – Associate',
        'Certified Kubernetes Application Developer (CKAD)',
      ]),
      currentCTC: 2400000,
      expectedCTC: 3400000,
      noticePeriodDays: 30,
      availability: 'Immediate',
    },
  });

  // Create or update Preferences
  await prisma.jobPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      preferredTitles: JSON.stringify([
        'Senior Full Stack Engineer',
        'Senior Software Engineer',
        'Lead Frontend Engineer',
        'Backend Engineer',
      ]),
      targetIndustries: JSON.stringify(['Fintech', 'Enterprise SaaS', 'Cloud Infrastructure', 'Developer Tools']),
      preferredCompanies: JSON.stringify(['Stripe', 'Razorpay', 'PhonePe', 'Vercel', 'Atlassian', 'Swiggy']),
      excludedCompanies: JSON.stringify(['UnverifiedAgency', 'SpamConsultancy']),
      excludedCategories: JSON.stringify(['Unpaid Internship', 'Non-Technical Support']),
      minExperience: 3,
      maxExperience: 7,
      minSalary: 2500000,
      remotePreference: 'ANY',
      employmentType: 'FULL_TIME',
      preferredLocations: JSON.stringify(['Bangalore', 'Remote', 'Hyderabad']),
      minRelevanceScore: 75,
      maxDailyApplications: 99999, // Unlimited
    },
  });

  // Seed sample primary resume
  const existingResume = await prisma.resume.findFirst({ where: { userId: user.id } });
  if (!existingResume) {
    await prisma.resume.create({
      data: {
        userId: user.id,
        fileName: 'Alex_Chen_Senior_FullStack_Resume_2026.pdf',
        fileType: 'PDF',
        parsedText: `ALEX CHEN - Senior Full Stack Engineer\nEmail: alex.chen@example.com | Phone: +91 98765 43210\nLocation: Bangalore, India | Preferred: Remote, Bangalore\n\nPROFESSIONAL SUMMARY\nSenior Full Stack Engineer with 4.5+ years of experience building scalable distributed web applications with TypeScript, Node.js, React, PostgreSQL, and AWS.\n\nSKILLS\n- Languages: TypeScript, JavaScript, Python, Go\n- Frameworks: React, Next.js, Express, TailwindCSS\n- Databases: PostgreSQL, Redis, MongoDB\n- DevOps/Cloud: Docker, Kubernetes, AWS, CI/CD, Git\n\nEXPERIENCE\nSenior Full Stack Engineer | HyperScale Cloud Labs (2023 - Present)\nSoftware Engineer | NexTech Solutions (2020 - 2022)`,
        parsedData: JSON.stringify({
          fullName: 'Alex Chen',
          email: 'alex.chen@example.com',
          phone: '+91 98765 43210',
          totalExperienceYears: 4.5,
          technicalSkills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker', 'AWS'],
          programmingLanguages: ['TypeScript', 'JavaScript', 'Python'],
          frameworks: ['React', 'Next.js', 'Express'],
          databases: ['PostgreSQL', 'Redis'],
          cloudDevops: ['Docker', 'AWS'],
          education: [{ degree: 'B.Tech CS', institution: 'NITK', year: '2020' }],
        }),
        isPrimary: true,
        targetRoles: JSON.stringify(['Senior Full Stack Engineer', 'Senior Software Engineer']),
      },
    });
  }

  // Seed Connected Integrations
  await prisma.integrationAccount.upsert({
    where: {
      id: (await prisma.integrationAccount.findFirst({ where: { userId: user.id, platform: 'LINKEDIN' } }))?.id || 'none',
    },
    update: {},
    create: {
      userId: user.id,
      platform: 'LINKEDIN',
      authType: 'SESSION_TOKEN',
      credentialsEncrypted: encrypt(JSON.stringify({ sessionCookie: 'li_at=AQEDATN8v98...mock_valid_session_token' })),
      status: 'CONNECTED',
      lastSyncAt: new Date(),
      metadata: JSON.stringify({ accountName: 'Alex Chen (LinkedIn)', easyApplyEnabled: true }),
    },
  });

  await prisma.integrationAccount.upsert({
    where: {
      id: (await prisma.integrationAccount.findFirst({ where: { userId: user.id, platform: 'NAUKRI' } }))?.id || 'none',
    },
    update: {},
    create: {
      userId: user.id,
      platform: 'NAUKRI',
      authType: 'SESSION_TOKEN',
      credentialsEncrypted: encrypt(JSON.stringify({ sessionCookie: 'naukri_auth_token_99182a...' })),
      status: 'CONNECTED',
      lastSyncAt: new Date(),
      metadata: JSON.stringify({ profileHeadline: 'Senior Full Stack Engineer @ 4.5 Yrs Experience', fastForwardActive: true }),
    },
  });

  // Seed AutomationConfig
  await prisma.automationConfig.upsert({
    where: { userId: user.id },
    update: { isRunning: true, status: 'RUNNING' },
    create: {
      userId: user.id,
      isRunning: true,
      status: 'RUNNING',
      checkIntervalMinutes: 5,
      maxConcurrency: 3,
      dailyApplicationsCount: 3,
    },
  });

  console.log('[Seed] Seeding completed successfully. User ID:', user.id);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

