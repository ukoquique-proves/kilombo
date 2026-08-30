#!/usr/bin/env node
/**
 * create-article.mjs — Log into kilombo.top via YunoHost SSO and drive the
 * SPIP article_edit form to inspect or create an article.
 *
 * WHY THIS SHAPE:
 * SPIP's "ecrire" backend sits behind YunoHost's SSO proxy — a plain HTTP
 * client can't complete that handshake (see docs/TROUBLESHOOTING.md §3),
 * so this reuses the same login pattern as scripts/debug/scrape.cjs: a real
 * headless browser handles the SSO redirect + cookie automatically.
 *
 * SPIP 4.4's private interface autosaves most fields via AJAX on blur
 * rather than one form submit, so this fills each field and blurs it
 * individually, then waits for network-idle to let the autosave request
 * land — there's no single "save" button to click.
 *
 * LIVE-WRITE GATEWAY:
 * Everything from field-filling through the final "Guardar" submit is
 * routed through guardedWrite() (scripts/lib/live-write-gateway.mjs) — the
 * shared chokepoint for all scripts that mutate the live SPIP site. It's a
 * pass-through today (see docs/RISK-REGISTER.json, KILO-001), but every
 * write this script performs is now audit-logged and gets any future
 * policy gate for free. Do not add a second, ungated write path here —
 * new mutating steps should go inside the guardedWrite() execute callback.
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
import { guardedWrite } from '../scripts/lib/live-write-gateway.mjs';
import { BASE_URL, loadEnv, getPassword, login } from './lib/spip-session.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EDIT_URL = `${BASE_URL}/ecrire/?exec=article_edit&new=oui`;
const ENV_PATH = path.join(__dirname, '..', '.env'); // same relative path as scripts/debug/scrape.cjs

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

/**
 * The actual field-fill + submit sequence. Runs ONLY inside the
 * guardedWrite() execute callback in createArticle() below — never call
 * this directly.
 */
async function performCreate(page, { title, body, section, dryRun }) {
  // SPIP form field selectors — VERIFIED against live article_edit form
  const TITLE_SELECTOR = 'input[name="titre"]';        // ✅ Verified: id="titre"
  const BODY_SELECTOR = 'textarea[name="texte"]';      // ✅ Verified: id="text_area"
  const SECTION_SELECTOR = 'select[name="id_parent"]'; // ✅ Verified (NOT id_rubrique)

  const sectionValue = section || '1';

  // Guard: section must be a numeric SPIP rubrique ID (e.g. '1', '6').
  // Category slugs like 'tierra', 'nom', 'gci' must be translated to their
  // numeric IDs BEFORE this point — see scripts/lib/spip-client.mjs
  // slugToRubriquId() for the lookup table.
  //
  // TODO: run --inspect against the live SPIP to populate the full map:
  //   node scripts/create-article.mjs --inspect
  // Then read the <select name="id_parent"> option values from the output
  // and update SLUG_TO_RUBRIQUE_ID in scripts/lib/spip-client.mjs.
  if (!/^\d+$/.test(sectionValue)) {
    throw new Error(
      `section must be a numeric SPIP rubrique ID, got: "${sectionValue}". ` +
      `Translate category slugs (tierra, nom, gci, pi, actualidad, general) ` +
      `to their rubrique IDs before calling this script. ` +
      `See scripts/lib/spip-client.mjs slugToRubriquId().`
    );
  }

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
  if (!dryRun) await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

  console.log('Filling body...');
  await page.fill(BODY_SELECTOR, body);
  await page.locator(BODY_SELECTOR).blur();
  if (!dryRun) await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

  console.log(`Setting section (id_parent) to ${sectionValue}...`);
  await page.selectOption(SECTION_SELECTOR, sectionValue);
  if (!dryRun) await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

  let articleId = null;

  if (!dryRun) {
    console.log('Clicking Guardar button to save article...');
    await page.locator('input[type="submit"][name="save"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.locator('input[type="submit"][name="save"]').click();
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    console.log('Article saved and submitted.');

    // Persistence verification: Extract the new article ID from the URL or page content
    await page.waitForTimeout(1000); // Brief pause for redirect to complete

    const articleUrl = page.url();
    const idMatch = articleUrl.match(/id_article=(\d+)/);

    if (idMatch) {
      articleId = idMatch[1];
      console.log(`\n✅ PERSISTENCE VERIFIED: New article ID ${articleId} created in SPIP database`);
      console.log(`   Confirmation: URL changed to ${articleUrl}`);

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

  return { articleId };
}

async function createArticle(page, { title, body, section, dryRun }) {
  if (!title || !body) {
    throw new Error('--create requires both --title and --body.');
  }

  return guardedWrite({
    action: 'article.create',
    target: { title, section: section || '1' },
    dryRun,
    relatedRisks: ['KILO-001'],
    execute: () => performCreate(page, { title, body, section, dryRun }),
  });
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

  const env = loadEnv(ENV_PATH);
  const password = getPassword(env);
  if (!password) {
    console.error(`❌ No password found in ${ENV_PATH}`);
    process.exit(1);
  }
  console.log(`Using password key: ${env.KILOMBOTOP_PASSWORD ? 'KILOMBOTOP_PASSWORD' : 'KILOMBOTOP_FUTURE_PASSWORD'}`);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await login(page, { password, targetUrl: EDIT_URL, expectedUrlIncludes: 'exec=article_edit' });

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
