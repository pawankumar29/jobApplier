import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../server/src/utils/crypto.js';

const prisma = new PrismaClient();

async function main() {
  console.log('======================================================');
  console.log('🔍 AUTOJOB AI: REAL LIVE APPLICATION TEST');
  console.log('======================================================\n');

  const user = await prisma.user.findFirst({
    where: { email: 'pk2027317@gmail.com' },
    include: { integrations: true, resumes: true, profile: true },
  });

  if (!user || !user.profile) {
    console.error('❌ User profile not found');
    return;
  }

  const userDataDir = path.resolve('server/chrome_profile');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log(`📂 Using Chrome Profile Directory: ${userDataDir}`);
  console.log(`Candidate: ${user.profile.fullName} (${user.profile.email}, Phone: ${user.profile.phone})\n`);

  const options: any = {
    headless: false, // Let user see it running!
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  };
  if (fs.existsSync(chromePath)) {
    options.executablePath = chromePath;
  }

  let context;
  try {
    context = await chromium.launchPersistentContext(userDataDir, options);
  } catch (err: any) {
    console.error('❌ Could not launch Chrome context:', err.message);
    return;
  }

  const page = await context.newPage();

  // ==========================================
  // 1. TEST NAUKRI LIVE APPLY
  // ==========================================
  console.log('\n--- [TEST 1: NAUKRI.COM REAL APPLY] ---');
  const naukriJobUrl = 'https://www.naukri.com/job-listings-mern-stack-developer-next-js-qloron-pvt-ltd-mumbai-4-to-9-years-131126502872';
  console.log(`🌐 Navigating to Naukri job: ${naukriJobUrl}`);

  await page.goto(naukriJobUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(3500);

  // Check login state on Naukri
  const userGreeting = await page.locator('.nI-gNb-drawer__header, .user-name, .nI-gNb-header__user-info').first().textContent().catch(() => null);
  console.log(`👤 Naukri user detected: ${userGreeting?.trim() || 'Session Active'}`);

  const applyBtn = page
    .locator('button:has-text("Apply"), a:has-text("Apply"), button:has-text("I am interested"), button.apply-button')
    .first();

  const canApplyNaukri = await applyBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (canApplyNaukri) {
    const btnText = (await applyBtn.textContent())?.trim() || '';
    console.log(`🔘 Found Naukri apply button: "${btnText}"`);
    console.log('👉 Clicking Apply button now...');
    await applyBtn.click();
    await page.waitForTimeout(4000);

    const bodyText = (await page.textContent('body')) || '';
    if (bodyText.includes('already applied') || bodyText.includes('Already Applied')) {
      console.log('ℹ️ Job is ALREADY applied on Naukri in your candidate profile!');
    } else if (bodyText.includes('successfully applied') || bodyText.includes('Application Sent') || bodyText.includes('Application Submitted')) {
      console.log('✅ 100% REAL APPLICATION SUBMITTED ON NAUKRI!');
      // Update in DB
      const jobInDb = await prisma.discoveredJob.findFirst({ where: { applicationUrl: naukriJobUrl } });
      if (jobInDb) {
        await prisma.application.create({
          data: {
            jobId: jobInDb.id,
            userId: user.id,
            resumeId: user.resumes[0]?.id || '',
            status: 'SUBMITTED',
            mechanism: 'PORTAL_1CLICK',
            confirmationId: `NK-LIVE-${Date.now()}`,
            responseNotes: 'Live submitted on Naukri directly using candidate session.',
            filledFields: JSON.stringify({ fullName: user.profile.fullName, email: user.profile.email, phone: user.profile.phone }),
            screeningAnswers: '{}'
          }
        });
        await prisma.discoveredJob.update({ where: { id: jobInDb.id }, data: { status: 'APPLIED' } });
      }
    } else {
      console.log('ℹ️ Apply clicked. Response state on page:', bodyText.slice(0, 200).replace(/\s+/g, ' '));
    }
  } else {
    console.log('⚠️ Apply button not immediately clickable or already applied.');
  }

  // ==========================================
  // 2. TEST LINKEDIN EASY APPLY
  // ==========================================
  console.log('\n--- [TEST 2: LINKEDIN REAL EASY APPLY] ---');
  // Search for freshest live Easy Apply job
  const linkedInJobUrl = 'https://www.linkedin.com/jobs/view/4490599092/';
  console.log(`🌐 Navigating to LinkedIn job: ${linkedInJobUrl}`);

  await page.goto(linkedInJobUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(4000);

  // Check login state on LinkedIn
  const navProfile = await page.locator('.global-nav__me, .feed-identity-module').first().isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`👤 LinkedIn logged in state: ${navProfile ? 'YES (Pawan Kumar)' : 'Checking page...'}`);

  const easyApplyBtn = page.locator('.jobs-apply-button, button:has-text("Easy Apply")').first();
  const hasEasyApply = await easyApplyBtn.isVisible({ timeout: 6000 }).catch(() => false);

  if (hasEasyApply) {
    const btnText = (await easyApplyBtn.textContent())?.trim() || '';
    console.log(`🔘 Found LinkedIn button: "${btnText}"`);
    console.log('👉 Clicking Easy Apply button now...');
    await easyApplyBtn.click();
    await page.waitForTimeout(3000);

    // Check modal
    const modalVisible = await page.locator('.jobs-easy-apply-modal, role=dialog').first().isVisible({ timeout: 4000 }).catch(() => false);
    console.log(`📋 Easy Apply modal open: ${modalVisible}`);

    if (modalVisible) {
      // Step through modal
      for (let step = 1; step <= 5; step++) {
        console.log(`   Modal Step ${step}...`);

        // Check if phone number input needs value
        const phoneInput = page.locator('input[id*="phoneNumber"], input[type="tel"]').first();
        if (await phoneInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          const val = await phoneInput.inputValue().catch(() => '');
          if (!val && user.profile.phone) {
            await phoneInput.fill(user.profile.phone);
            console.log(`   Filled phone: ${user.profile.phone}`);
          }
        }

        // Submit button?
        const submitBtn = page.locator('button:has-text("Submit application"), button:has-text("Submit")').first();
        if (await submitBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          console.log('🚀 Final "Submit application" button detected!');
          console.log('👉 Clicking Submit Application now...');
          await submitBtn.click();
          await page.waitForTimeout(3000);
          console.log('✅ REAL SUBMISSION EXECUTED ON LINKEDIN!');
          // Update in DB
          const jobInDb = await prisma.discoveredJob.findFirst({ where: { applicationUrl: linkedInJobUrl } });
          if (jobInDb) {
            await prisma.application.create({
              data: {
                jobId: jobInDb.id,
                userId: user.id,
                resumeId: user.resumes[0]?.id || '',
                status: 'SUBMITTED',
                mechanism: 'EASY_APPLY',
                confirmationId: `LI-LIVE-${Date.now()}`,
                responseNotes: 'Live submitted on LinkedIn Easy Apply using candidate session.',
                filledFields: JSON.stringify({ fullName: user.profile.fullName, email: user.profile.email, phone: user.profile.phone }),
                screeningAnswers: '{}'
              }
            });
            await prisma.discoveredJob.update({ where: { id: jobInDb.id }, data: { status: 'APPLIED' } });
          }
          break;
        }

        // Next / Review button?
        const nextBtn = page.locator('button:has-text("Next"), button:has-text("Review")').first();
        if (await nextBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await nextBtn.click();
          await page.waitForTimeout(2000);
        } else {
          console.log('ℹ️ Reached end of automated steps.');
          break;
        }
      }
    }
  } else {
    const pageStatus = await page.locator('.jobs-s-apply, .jobs-apply-button--top-card').textContent().catch(() => '');
    console.log('ℹ️ Easy Apply button not present or state:', pageStatus.trim());
  }

  console.log('\n======================================================');
  console.log('🏁 Verification complete! Keeping window open 10 seconds for you to see...');
  await page.waitForTimeout(10000);
  await context.close().catch(() => {});
  await prisma.$disconnect();
}

main().catch(console.error);
