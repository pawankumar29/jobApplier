import { chromium } from 'playwright';

async function inspect() {
  const context = await chromium.launchPersistentContext('server/chrome_profile', {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/jobs/view/4490599092/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const btn = page.locator('.jobs-apply-button, button:has-text("Easy Apply")').first();
  await btn.click();
  await page.waitForTimeout(2000);

  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText.trim(),
      ariaLabel: b.getAttribute('aria-label'),
      classes: b.className
    })).filter(b => b.text || b.ariaLabel);
  });

  const matchingButtons = buttons.filter(b =>
    ['Next', 'Review', 'Submit application', 'Submit', 'Continue'].some(k =>
      b.text.includes(k) || (b.ariaLabel && b.ariaLabel.includes(k))
    )
  );
  console.log('Action Buttons:', JSON.stringify(matchingButtons, null, 2));

  // Check form container selector
  const containers = await page.evaluate(() => {
    const list: string[] = [];
    if (document.querySelector('.jobs-easy-apply-content')) list.push('.jobs-easy-apply-content');
    if (document.querySelector('[data-test-modal-container]')) list.push('[data-test-modal-container]');
    if (document.querySelector('.artdeco-modal')) list.push('.artdeco-modal');
    if (document.querySelector('[role="dialog"]')) list.push('[role="dialog"]');
    if (document.querySelector('.jobs-easy-apply-modal')) list.push('.jobs-easy-apply-modal');
    return list;
  });
  console.log('Containers found:', containers);

  await context.close();
}

inspect().catch(console.error);

