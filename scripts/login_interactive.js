import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { encrypt } from '../dist/server/utils/crypto.js';

const p = new PrismaClient();
const userDataDir = path.resolve('server/chrome_profile');

if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

async function runInteractiveLogin() {
  console.log('\n======================================================');
  console.log('🚀 AUTOJOB AI: 1-TIME INTERACTIVE LOGIN SETUP');
  console.log('======================================================');
  console.log('Opening Google Chrome window on your screen...\n');
  console.log('👉 Aapko bas ek baar:');
  console.log('   1. LinkedIn tab me login karna hai (Password / OTP verify karein)');
  console.log('   2. Naukri tab me login karna hai (Password / OTP verify karein)');
  console.log('\nJaise hi aap login karenge, session PERMANENTLY save ho jayega!');
  console.log('Iske baad bot lifetime bina kisi OTP ke automated apply karega.\n');

  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    viewport: null,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });

  const pages = context.pages();
  const linkedInPage = pages.length > 0 ? pages[0] : await context.newPage();
  const naukriPage = await context.newPage();

  // Navigate LinkedIn
  await linkedInPage.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' }).catch(() => {});
  // Pre-fill email
  await linkedInPage.fill('input#username', 'pk2027317@gmail.com').catch(() => {});

  // Navigate Naukri
  await naukriPage.goto('https://www.naukri.com/nlogin/login', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await naukriPage.fill('input#usernameField', 'pk2027317@gmail.com').catch(() => {});

  console.log('👀 Browser open hai. Login complete hone ka intezaar kiya ja raha hai...\n');

  let linkedInDone = false;
  let naukriDone = false;

  const checkInterval = setInterval(async () => {
    try {
      const cookies = await context.cookies();

      // Check LinkedIn
      const liCookie = cookies.find((c) => c.name === 'li_at' && c.domain.includes('linkedin.com'));
      if (liCookie && !linkedInDone) {
        linkedInDone = true;
        console.log('✅ LinkedIn Login DETECTED & SAVED! (li_at cookie verified)');

        // Save into DB
        const user = await p.user.findFirst();
        if (user) {
          const enc = encrypt(JSON.stringify({ sessionCookie: liCookie.value, authType: 'SESSION_TOKEN' }));
          await p.integrationAccount.upsert({
            where: {
              id: (await p.integrationAccount.findFirst({ where: { userId: user.id, platform: 'LINKEDIN' } }))?.id || 'none',
            },
            update: {
              authType: 'SESSION_TOKEN',
              credentialsEncrypted: enc,
              status: 'CONNECTED',
              errorReason: null,
              lastSyncAt: new Date(),
              metadata: JSON.stringify({ accountUser: 'pk2027317@gmail.com', verifiedAt: new Date().toISOString() }),
            },
            create: {
              userId: user.id,
              platform: 'LINKEDIN',
              authType: 'SESSION_TOKEN',
              credentialsEncrypted: enc,
              status: 'CONNECTED',
              lastSyncAt: new Date(),
            },
          });
        }
      }

      // Check Naukri
      const naukriCookie = cookies.find(
        (c) => (c.name.includes('naukri_auth') || c.name.includes('nk_user')) && c.domain.includes('naukri.com')
      );
      const isNaukriLogged =
        Boolean(naukriCookie) ||
        naukriPage.url().includes('mnjuser') ||
        naukriPage.url().includes('homepage');

      if (isNaukriLogged && !naukriDone) {
        naukriDone = true;
        console.log('✅ Naukri.com Login DETECTED & SAVED! (Session verified)');

        const user = await p.user.findFirst();
        if (user) {
          const fullCookieString = cookies
            .filter((c) => c.domain.includes('naukri.com'))
            .map((c) => `${c.name}=${c.value}`)
            .join('; ');
          const enc = encrypt(JSON.stringify({ sessionCookie: fullCookieString, authType: 'SESSION_TOKEN' }));
          await p.integrationAccount.upsert({
            where: {
              id: (await p.integrationAccount.findFirst({ where: { userId: user.id, platform: 'NAUKRI' } }))?.id || 'none',
            },
            update: {
              authType: 'SESSION_TOKEN',
              credentialsEncrypted: enc,
              status: 'CONNECTED',
              errorReason: null,
              lastSyncAt: new Date(),
              metadata: JSON.stringify({ accountUser: 'pk2027317@gmail.com', verifiedAt: new Date().toISOString() }),
            },
            create: {
              userId: user.id,
              platform: 'NAUKRI',
              authType: 'SESSION_TOKEN',
              credentialsEncrypted: enc,
              status: 'CONNECTED',
              lastSyncAt: new Date(),
            },
          });
        }
      }

      if (linkedInDone && naukriDone) {
        clearInterval(checkInterval);
        console.log('\n🎉 BADHAI HO! LinkedIn aur Naukri dono ke permanent sessions successfully link ho gaye hain!');
        console.log('Aap ab browser window close kar sakte hain ya terminal me Ctrl+C dabayein.');
        console.log('Background runner ab permanently inhi sessions se 100% automated apply karega.\n');
      }
    } catch (e) {
      // Ignored
    }
  }, 2500);

  // Keep open until user closes browser or terminal
  context.on('close', () => {
    clearInterval(checkInterval);
    console.log('\n[Browser Closed] Persistent profile saved in server/chrome_profile.');
    process.exit(0);
  });
}

runInteractiveLogin().catch(console.error);

