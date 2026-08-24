#!/usr/bin/env node
/**
 * scripts/customize-escal-theme.mjs
 *
 * Automates changing presentation fields (like tab labels or widget headers)
 * in the Escal theme on the live kilombo.top SPIP backend.
 *
 * It logs in, explores the Escal configuration sub-menus, finds the targeted
 * input field, updates its value, and saves the form.
 *
 * Usage:
 *   node scripts/customize-escal-theme.mjs --field titreongletderniers --value "Noticias Recientes"
 *   node scripts/customize-escal-theme.mjs --field titreongletderniers --value "Noticias Recientes" --dry-run
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERNAME = 'kilombo';
const BASE_URL = 'https://www.kilombo.top';
const CONFIG_URL = `${BASE_URL}/ecrire/?exec=configurer_escal`;
const ENV_PATH = path.join(__dirname, '..', '.env');

function loadEnv() {
  const envContent = fs.readFileSync(ENV_PATH, 'utf8');
  const vars = {};
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) vars[match[1]] = match[2];
  });
  return vars;
}

function parseArgs(argv) {
  const args = { field: null, value: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--field') args.field = argv[++i];
    else if (a === '--value') args.value = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

async function login(page, password) {
  console.log(`Navigating to ${CONFIG_URL} ...`);
  await page.goto(CONFIG_URL, { waitUntil: 'domcontentloaded' });

  if (page.url().includes('page=login') || page.url().includes('exec=login')) {
    console.log('Detected SPIP login page. Logging in...');
    await page.fill('input[name="login"], input[type="text"]', USERNAME);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.click('input[type="submit"], button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  if (page.url().includes('sso') || page.url().includes('portalapi')) {
    console.log('Detected YunoHost SSO page. Logging in...');
    await page.fill('input[type="text"], input[name="credentials"], input[name="username"], input[id="loginInput"]', USERNAME);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"], input[type="submit"], #submit');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  if (page.url().includes('exec=login') || page.url().includes('page=login')) {
    throw new Error('Login failed. Check KILOMBOTOP_PASSWORD in .env');
  }
}

async function updateThemeField(page, { field, value, dryRun }) {
  if (!field || value === null) {
    throw new Error('--field and --value are required parameters.');
  }

  console.log(`\nTarget field: "${field}"`);
  console.log(`Target value: "${value}"`);

  // Navigate to main Escal config to grab sub-menu links
  await page.goto(CONFIG_URL, { waitUntil: 'domcontentloaded' });

  const subLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('.lat a, .navigation a, #navigation a, .gauche a, #bando_navigation a'));
    return links
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(l => l.href.includes('configurer_escal') || l.href.includes('escal_'));
  });

  console.log(`Found ${subLinks.length} configuration sub-menus to search.`);

  let foundUrl = null;
  const fieldSelector = `input[name="${field}"], textarea[name="${field}"]`;

  // Search through sub-menus for the target field
  for (const link of subLinks) {
    await page.goto(link.href, { waitUntil: 'domcontentloaded' });
    const exists = await page.locator(fieldSelector).count() > 0;
    
    if (exists) {
      foundUrl = link.href;
      console.log(`\n✅ FOUND field "${field}" on sub-menu: ${link.text}`);
      break;
    }
  }

  if (!foundUrl) {
    throw new Error(`Field "${field}" could not be found in any Escal configuration sub-menu.`);
  }

  // DRY-RUN BLOCK
  if (dryRun) {
    console.log('\n🔒 DRY-RUN MODE: Blocking all POST requests');
    await page.route('**/ecrire/**', (route) => {
      if (route.request().method() === 'POST') {
        console.log('   [BLOCKED] POST to', route.request().url());
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  // Update the field
  console.log(`Filling field "${field}" with value "${value}"...`);
  try {
    await page.fill(fieldSelector, value, { timeout: 3000 });
    await page.locator(fieldSelector).blur({ timeout: 1000 }).catch(() => {});
  } catch (e) {
    console.log('   Field is hidden by CSS (likely in an accordion). Forcing value via JS...');
    await page.evaluate(({ selector, val }) => {
      const el = document.querySelector(selector);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, { selector: fieldSelector, val: value });
  }

  // Try to save the form
  const submitSelector = 'input[type="submit"], button[type="submit"]';
  const submitCount = await page.locator(submitSelector).count();

  if (submitCount > 0 && !dryRun) {
    console.log('Clicking save button...');
    
    // Often there are multiple submit buttons on SPIP forms (e.g. one per fieldset).
    // We click the one closest to our field, or the first one in the form containing our field.
    await page.evaluate((selector) => {
      const field = document.querySelector(selector);
      if (field && field.form) {
        const submitBtn = field.form.querySelector('input[type="submit"], button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }
    }, fieldSelector);

    await page.waitForLoadState('networkidle');
    console.log('Form submitted successfully.');
  } else if (dryRun) {
    console.log('Dry run: Skipping form submission.');
  } else {
    console.log('No save button found. Relying on auto-save (on blur).');
    await page.waitForTimeout(2000); // Give auto-save time to fire
  }

  const screenshotPath = path.join(__dirname, dryRun ? 'escal_update_dryrun.png' : 'escal_update_result.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\nScreenshot of the final state saved to ${screenshotPath}`);

  if (dryRun) {
    console.log('\n✅ --dry-run completed successfully! No changes were saved.');
  } else {
    console.log(`\n✅ Successfully updated "${field}" to "${value}".`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.field || args.value === null) {
    console.error(
      'Usage:\n' +
      '  node customize-escal-theme.mjs --field <name> --value "<text>" [--dry-run]'
    );
    process.exit(1);
  }

  const env = loadEnv();
  const password = env.KILOMBOTOP_PASSWORD || env.KILOMBOTOP_FUTURE_PASSWORD;
  if (!password) {
    console.error(`❌ No password found in ${ENV_PATH}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  try {
    await login(page, password);
    await updateThemeField(page, args);
  } catch (err) {
    console.error('❌ Error:', err.message);
    const failPath = path.join(__dirname, 'escal_update_error.png');
    await page.screenshot({ path: failPath, fullPage: true }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
