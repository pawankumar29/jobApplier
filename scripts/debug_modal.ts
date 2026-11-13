import { chromium } from 'playwright';

async function test() {
  const context = await chromium.launchPersistentContext('server/chrome_profile', {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/jobs/view/4490599092/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(3000);

  const title = await page.title();
  const url = page.url();
  console.log('Current URL:', url);
  console.log('Page Title:', title);

  const btn = page.locator('.jobs-apply-button, button:has-text("Easy Apply")').first();
  const exists = await btn.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Button exists:', exists);

  if (exists) {
    const text = await btn.textContent();
    console.log('Button text:', text?.trim());
    await btn.click();
    await page.waitForTimeout(3000);

    const dialogCount = await page.locator('[role="dialog"]').count();
    const modalCount = await page.locator('.artdeco-modal').count();
    console.log('Dialog count:', dialogCount, 'Modal count:', modalCount);

    if (dialogCount > 0 || modalCount > 0) {
      const dialogText = await page.locator('[role="dialog"], .artdeco-modal').first().innerText();
      console.log('Dialog content preview:\n', dialogText.slice(0, 400));
    } else {
      console.log('Body snippet after click:\n', (await page.innerText('body')).slice(0, 300));
    }
  }

  await context.close();
}

test().catch(console.error);
