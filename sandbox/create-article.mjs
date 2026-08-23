#!/usr/bin/env node
/**
 * create-article.mjs — Log into kilombo.top via YunoHost SSO and drive the
 * SPIP article_edit form to inspect or create an article.
 *
 * WHY THIS SHAPE:
 * SPIP's "ecrire" backend sits behind YunoHost's SSO proxy — a plain HTTP
 * client can't complete that handshake (see docs/TROUBLESHOOTING.md §3),
 * so this reuses the same login pattern as sandbox/scrape.cjs: a real
 * headless browser handles the SSO redirect + cookie automatically.
 *
 * SPIP 4.4's private interface autosaves most fields via AJAX on blur
 * rather than one form submit, so this fills each field and blurs it
 * individually, then waits for network-idle to let the autosave request
 * land — there's no single "save" button to click.
 *
 * IMPORTANT — RUN --inspect FIRST:
 * The field selectors in createArticle() below (titre / texte / id_rubrique)
 * are SPIP's usual defaults. This script was written without live access to
 * kilombo.top's actual article_edit HTML, so treat those selectors as a
 * best guess until --inspect confirms them against the real page.
 *
 * MODES
 *   --inspect
 *       Log in, open a fresh article_edit page, dump every input/textarea/
 *       select field (name, id, type, nearby label), and save a screenshot
 *       + full HTML dump. Read-only — makes no changes.
 *
 *   --create --title "..." --body "..." [--section <id_rubrique>] [--dry-run]
 *       Fill in a new article. --dry-run PREVENTS ALL WRITES:
 *       - Blocks network autosave requests
 *       - Does NOT create article in database
 *       - Allows inspection of form before committing
 *       - Safe to run multiple times without side effects
 *
 * USAGE
 *   node create-article.mjs --inspect
 *   node create-article.mjs --create --title "Título de prueba" --body "<p>Cuerpo de prueba.</p>" --dry-run
 *   node create-article.mjs --create --title "Título real" --body "<p>Cuerpo real.</p>"
 *
 * Requires KILOMBOTOP_PASSWORD in .env (same credential as scrape.cjs).
 * Run this from wherever your .env lives (one level up from this file, like
 * scrape.cjs does) — adjust ENV_PATH below if you move the script.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERNAME = 'kilombo'; // change if your working browser session uses a different account
const BASE_URL = 'https://www.kilombo.top';
const EDIT_URL = `${BASE_URL}/ecrire/?exec=article_edit&new=oui`;
const ENV_PATH = path.join(__dirname, '..', '.env'); // same relative path as sandbox/scrape.cjs

// ---- .env loader (manual parse, same as scrape.cjs — no dotenv dependency) ----
function loadEnv() {
  const envContent = fs.readFileSync(ENV_PATH, 'utf8');
  const vars = {};
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) vars[match[1]] = match[2];
  });
  return vars;
}

// ---- CLI args ----
function parseArgs(argv) {
  const args = { mode: null, title: null, body: null, section: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--inspect') args.mode = 'inspect';
    else if (a === '--create') args.mode = 'create';
    else if (a === '--title') args.title = argv[++i];
    else if (a === '--body') args.body = argv[++i];
    else if (a === '--section') args.section = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

async function login(page, password) {
  console.log(`Navigating to ${EDIT_URL} ...`);
  await page.goto(EDIT_URL, { waitUntil: 'domcontentloaded' });

  // SPIP has its own login form (page=login) — separate from YunoHost SSO.
  // Fields: "Login o dirección mail" + "Contraseña" + button "Conectarse".
  if (page.url().includes('page=login') || page.url().includes('exec=login')) {
    console.log('Detected SPIP login page. Logging in...');
    await page.fill('input[name="login"], input[type="text"]', USERNAME);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.click('input[type="submit"], button[type="submit"]');
    // Don't wait for full networkidle — SPIP loads assets slowly
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000); // brief pause for redirects to settle
  }

  // SSO fallback (YunoHost portal)
  if (page.url().includes('sso') || page.url().includes('portalapi')) {
    console.log('Detected YunoHost SSO page. Logging in...');
    await page.fill(
      'input[type="text"], input[name="credentials"], input[name="username"], input[id="loginInput"]',
      USERNAME
    );
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"], input[type="submit"], #submit');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  console.log('Current URL after login:', page.url());

  if (!page.url().includes('exec=article_edit')) {
    console.log('Not on article_edit yet — re-navigating...');
    await page.goto(EDIT_URL, { waitUntil: 'domcontentloaded' });
  }

  if (page.url().includes('exec=login') || page.url().includes('page=login')) {
    throw new Error(
      `Login did not reach article_edit — landed on ${page.url()} instead. ` +
      `Check the SPIP password in .env (KILOMBOTOP_PASSWORD may be the YunoHost ` +
      `password, not the SPIP-specific one — they can differ).`
    );
  }
}

async function inspectForm(page) {
  console.log('\n=== Form fields found on article_edit page ===\n');
  const fields = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('input, textarea, select').forEach((el) => {
      let label = '';
      if (el.id) {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl) label = lbl.textContent.trim();
      }
      if (!label && el.closest('label')) label = el.closest('label').textContent.trim();
      out.push({
        tag: el.tagName.toLowerCase(),
        type: el.type || null,
        name: el.name || null,
        id: el.id || null,
        placeholder: el.placeholder || null,
        label: label || null,
      });
    });
    return out;
  });

  for (const f of fields) {
    console.log(
      `${f.tag}${f.type ? `[${f.type}]` : ''}  name="${f.name}"  id="${f.id}"` +
      (f.label ? `  label="${f.label}"` : '') +
      (f.placeholder ? `  placeholder="${f.placeholder}"` : '')
    );
  }

  const screenshotPath = path.join(__dirname, 'article_edit_inspect.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  fs.writeFileSync(path.join(__dirname, 'article_edit_inspect.html'), await page.content());

  console.log(`\nScreenshot saved to ${screenshotPath}`);
  console.log(`Full HTML saved to ${path.join(__dirname, 'article_edit_inspect.html')}`);
  console.log(
    '\nUse this output to correct TITLE_SELECTOR / BODY_SELECTOR / SECTION_SELECTOR ' +
    'in createArticle() below if the real field names differ from the SPIP ' +
    'defaults (titre, texte, id_rubrique) this script assumes.'
  );
}

async function createArticle(page, { title, body, section, dryRun }) {
  if (!title || !body) {
    throw new Error('--create requires both --title and --body.');
  }

  // SPIP form field selectors — VERIFIED against live article_edit form
  const TITLE_SELECTOR = 'input[name="titre"]';        // ✅ Verified: id="titre"
  const BODY_SELECTOR = 'textarea[name="texte"]';      // ✅ Verified: id="text_area"
  const SECTION_SELECTOR = 'select[name="id_parent"]'; // ✅ Verified (NOT id_rubrique)
  
  // Section/id_parent is REQUIRED by SPIP. Defaults to "1" (kilombo).
  // To use a different section, pass --section <id>.
  // Available sections: 1=kilombo, 2=Proletarios internationalistas,
  // 3=icg, 4=Plandemia, 6=FUNDAMENTOS CIENTÍFICOS, 7=IMAGENES, etc.
  const sectionValue = section || '1';

  // ---- DRY-RUN: Block all network autosave requests ----
  if (dryRun) {
    console.log('🔒 DRY-RUN MODE: Blocking all autosave requests');
    await page.route('**/ecrire/**', (route) => {
      // Block POST requests (autosave) but allow GET requests (page loads)
      if (route.request().method() === 'POST') {
        console.log('   [BLOCKED] POST to', route.request().url());
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  console.log(`Filling title: "${title}"`);
  await page.fill(TITLE_SELECTOR, title);
  await page.locator(TITLE_SELECTOR).blur();
  if (!dryRun) await page.waitForLoadState('networkidle');

  console.log('Filling body...');
  await page.fill(BODY_SELECTOR, body);
  await page.locator(BODY_SELECTOR).blur();
  if (!dryRun) await page.waitForLoadState('networkidle');

  console.log(`Setting section (id_parent) to ${sectionValue}...`);
  await page.selectOption(SECTION_SELECTOR, sectionValue);
  if (!dryRun) await page.waitForLoadState('networkidle');

  if (!dryRun) {
    console.log('Clicking Guardar button to save article...');
    await page.locator('input[type="submit"][name="save"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.locator('input[type="submit"][name="save"]').click();
    await page.waitForLoadState('networkidle');
    console.log('Article saved and submitted.');
    
    // Persistence verification: Extract the new article ID from the URL or page content
    // After SPIP saves a new article, the URL changes from ?exec=article_edit&new=oui
    // to ?exec=article_edit&id_article=<N>, confirming the article exists in the database
    await page.waitForTimeout(1000); // Brief pause for redirect to complete
    
    const articleUrl = page.url();
    const idMatch = articleUrl.match(/id_article=(\d+)/);
    
    if (idMatch) {
      const articleId = idMatch[1];
      console.log(`\n✅ PERSISTENCE VERIFIED: New article ID ${articleId} created in SPIP database`);
      console.log(`   Confirmation: URL changed to ${articleUrl}`);
      
      // Additional verification: Navigate to article list and check if our article appears
      console.log('\nPerforming follow-up verification: checking article list...');
      await page.goto(`${BASE_URL}/ecrire/?exec=articles`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      const articleExists = await page.locator(`a:has-text("${title}")`).isVisible().catch(() => false);
      if (articleExists) {
        console.log(`✅ CONFIRMED: Article appears in SPIP article list`);
      } else {
        console.log(`⚠️  WARNING: Article #${articleId} created but not visible in article list yet (may be delayed)`);
      }
    } else {
      console.log('\n⚠️  WARNING: Could not extract article ID from URL');
      console.log(`   Current URL: ${articleUrl}`);
      console.log('   Article may not have been saved. Check SPIP admin panel manually.');
    }
  }

  const screenshotPath = path.join(
    __dirname,
    dryRun ? 'article_create_dryrun.png' : 'article_create_result.png'
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\nScreenshot of current state saved to ${screenshotPath}`);

  if (dryRun) {
    console.log(
      '\n✅ --dry-run completed successfully!\n' +
      'Result: NO article was created (all autosave requests were blocked).\n' +
      'The form fields were filled correctly. You can review the screenshot\n' +
      'and then run the same command without --dry-run to actually create the article.'
    );
  } else {
    console.log(
      '\nDone. Article saved. Check "en curso de redacción" in ' +
      'the ecrire dashboard to confirm, then use the SPIP UI to change status ' +
      '(e.g. "proponer a evaluación" / "publicar") if you want to move it ' +
      'further — this script does not change article status.'
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.mode) {
    console.error(
      'Usage:\n' +
      '  node create-article.mjs --inspect\n' +
      '  node create-article.mjs --create --title "..." --body "..." [--section N] [--dry-run]'
    );
    process.exit(1);
  }

  const env = loadEnv();
  const password = env.KILOMBOTOP_PASSWORD || env.KILOMBOTOP_FUTURE_PASSWORD;
  if (!password) {
    console.error(`❌ No password found in ${ENV_PATH}`);
    process.exit(1);
  }
  console.log(`Using password key: ${env.KILOMBOTOP_PASSWORD ? 'KILOMBOTOP_PASSWORD' : 'KILOMBOTOP_FUTURE_PASSWORD'}`);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await login(page, password);

    if (args.mode === 'inspect') {
      await inspectForm(page);
    } else if (args.mode === 'create') {
      await createArticle(page, args);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    const failPath = path.join(__dirname, 'create-article-error.png');
    await page.screenshot({ path: failPath, fullPage: true }).catch(() => {});
    console.error(`Screenshot at point of failure: ${failPath}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
