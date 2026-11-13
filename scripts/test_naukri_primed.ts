import { chromium } from 'playwright';

async function testPrimed() {
  const context = await chromium.launchPersistentContext('server/chrome_profile', {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await context.newPage();
  console.log('1. Priming Naukri home session...');
  await page.goto('https://www.naukri.com/mnjuser/homepage', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(2500);

  console.log('2. Navigating to Neximprove job...');
  await page.goto('https://www.naukri.com/job-listings-full-stack-developer-neximprove-kolkata-2-to-6-years-121126502019', {
    waitUntil: 'domcontentloaded',
    timeout: 35000
  });
  await page.waitForTimeout(3000);

  console.log('Page Title:', await page.title());
  const btn = page.locator('button:has-text("Apply"), a:has-text("Apply"), #apply-button, .apply-button').first();
  const exists = await btn.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Apply button exists:', exists);

  if (exists) {
    const text = (await btn.textContent())?.trim();
    console.log('Apply button text:', text);
  } else {
    // Check if expired or body text
    const textSnippet = (await page.innerText('body')).slice(0, 300).replace(/\s+/g, ' ');
    console.log('Body snippet:', textSnippet);
  }

  await context.close();
}

testPrimed().catch(console.error);

