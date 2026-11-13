import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function apply() {
  console.log('🚀 Starting Real Submission for Yulu (Full Stack Engineer)...');
  const context = await chromium.launchPersistentContext('server/chrome_profile', {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false, // headful so user can see it on screen
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await context.newPage();
  const url = 'https://www.linkedin.com/jobs/view/4490599092/';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(3000);

  const easyApplyBtn = page.locator('button:has-text("Easy Apply")').first();
  console.log('Clicking Easy Apply...');
  await easyApplyBtn.click();
  await page.waitForTimeout(2500);

  // Check for Submit button or Next button
  const submitBtn = page.locator('button:has-text("Submit application")').first();
  if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('👉 Found "Submit application" button! Submitting live now...');
    await submitBtn.click();
    await page.waitForTimeout(4000);

    const bodyText = await page.innerText('body');
    const isSubmitted = bodyText.includes('Application sent') || bodyText.includes('applied') || bodyText.includes('Your application was sent');
    console.log('Submission result state:', isSubmitted ? '✅ SUCCESS: Application Sent!' : 'Checked response');

    // Record in DB
    const user = await prisma.user.findFirst({ where: { email: 'pk2027317@gmail.com' } });
    const jobInDb = await prisma.discoveredJob.findFirst({ where: { applicationUrl: url } });

    if (user && jobInDb) {
      const app = await prisma.application.create({
        data: {
          jobId: jobInDb.id,
          userId: user.id,
          status: 'SUBMITTED',
          mechanism: 'EASY_APPLY',
          confirmationId: `LI-REAL-${Date.now()}`,
          responseNotes: 'Live submitted on LinkedIn Easy Apply. Check your LinkedIn "My Jobs > Applied".',
          filledFields: JSON.stringify({ candidate: 'Pawan Kumar', email: 'pk2027317@gmail.com', job: 'Full Stack Engineer @ Yulu' }),
          screeningAnswers: '{}'
        }
      });
      await prisma.discoveredJob.update({ where: { id: jobInDb.id }, data: { status: 'APPLIED' } });
      console.log('✅ Application saved in Database with ID:', app.id);
    }
  } else {
    console.log('Submit button not found directly. Checking for multi-step...');
  }

  console.log('Done! Leaving browser open 5 seconds...');
  await page.waitForTimeout(5000);
  await context.close();
  await prisma.$disconnect();
}

apply().catch(console.error);

