import { chromium } from 'playwright';

async function inspectJob(url: string) {
  console.log(`\n======================================================`);
  console.log(`Inspecting: ${url}`);
  const context = await chromium.launchPersistentContext('server/chrome_profile', {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(3000);

  const applyBtn = page.locator('button:has-text("Apply"), a:has-text("Apply"), #apply-button, .apply-button').first();
  const exists = await applyBtn.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Apply button visible:', exists);

  if (exists) {
    const text = (await applyBtn.textContent())?.trim();
    console.log(`Button text: "${text}"`);
    console.log('Clicking button...');
    await applyBtn.click();
    await page.waitForTimeout(4000);

    // Check if new popup opened or current page changed
    const currentUrl = page.url();
    console.log('Current URL after click:', currentUrl);

    // Check for chatbot / questionnaire elements
    const elements = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
        tag: el.tagName,
        type: (el as any).type,
        name: (el as any).name,
        placeholder: (el as any).placeholder,
        text: el.parentElement?.innerText?.trim().slice(0, 80)
      }));
      const buttons = Array.from(document.querySelectorAll('button, a')).map(el => el.textContent?.trim()).filter(Boolean);
      return { inputs: inputs.slice(0, 10), buttons: buttons.slice(0, 15) };
    });
    console.log('Inputs found after apply click:', JSON.stringify(elements.inputs, null, 2));
    console.log('Buttons found after apply click:', elements.buttons);
  }

  await page.waitForTimeout(4000);
  await context.close();
}

async function main() {
  await inspectJob('https://www.naukri.com/job-listings-full-stack-developer-neximprove-kolkata-2-to-6-years-121126502019');
}

main().catch(console.error);

