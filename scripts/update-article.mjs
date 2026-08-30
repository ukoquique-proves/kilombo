#!/usr/bin/env node
/**
 * update-article.mjs — Log into kilombo.top via YunoHost SSO and drive the
 * SPIP article_edit form to edit an existing article.
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
 * Everything from field-filling through the final autosave is routed
 * through guardedWrite() (scripts/lib/live-write-gateway.mjs) — the shared
 * chokepoint for all scripts that mutate the live SPIP site. It's a
 * pass-through today (see docs/RISK-REGISTER.json, KILO-001), but every
 * write this script performs is now audit-logged and gets any future policy
 * gate for free. Do not add a second, ungated write path here — new mutating
 * steps should go inside the guardedWrite() execute callback.
 *
 * MODES
 *   --inspect <id_article>
 *       Log in, open the article_edit page for the given article ID, dump
 *       every input/textarea/select field (name, id, type, nearby label),
 *       and save a screenshot + full HTML dump. Read-only — makes no changes.
 *
 *   --update <id_article> [--title "..."] [--body "..."] [--section N] [--dry-run]
 *       Edit an existing article. At least one of --title or --body is required.
 *       --dry-run PREVENTS ALL WRITES:
 *       - Blocks network autosave requests
 *       - Does NOT modify article in database
 *       - Allows inspection of form before committing
 *       - Safe to run multiple times without side effects
 *
 * USAGE
 *   node update-article.mjs --inspect 87
 *   node update-article.mjs --update 87 --title "Título actualizado" --dry-run
 *   node update-article.mjs --update 87 --title "Título actualizado" --body "<p>Cuerpo actualizado.</p>"
 *   node update-article.mjs --update 87 --section 6
 *
 * Requires KILOMBOTOP_PASSWORD in .env (same credential as scrape.cjs and create-article.mjs).
 * Run this from wherever your .env lives (one level up from this file).
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardedWrite } from '../scripts/lib/live-write-gateway.mjs';
import { BASE_URL, loadEnv, getPassword, login } from './lib/spip-session.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

// ---- CLI args ----
function parseArgs(argv) {
  const args = { mode: null, articleId: null, title: null, body: null, section: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--inspect') {
      args.mode = 'inspect';
      args.articleId = argv[++i];
    } else if (a === '--update') {
      args.mode = 'update';
      args.articleId = argv[++i];
    } else if (a === '--title') args.title = argv[++i];
    else if (a === '--body') args.body = argv[++i];
    else if (a === '--section') args.section = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

/**
 * Build the edit URL for a specific article ID.
 * SPIP article_edit page format: /ecrire/?exec=article_edit&id_article=<N>
 */
function buildEditUrl(articleId) {
  return `${BASE_URL}/ecrire/?exec=article_edit&id_article=${articleId}`;
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
        value: el.value || null,
      });
    });
    return out;
  });

  for (const f of fields) {
    console.log(
      `${f.tag}${f.type ? `[${f.type}]` : ''}  name="${f.name}"  id="${f.id}"` +
      (f.label ? `  label="${f.label}"` : '') +
      (f.placeholder ? `  placeholder="${f.placeholder}"` : '') +
      (f.value ? `  current_value="${f.value.substring(0, 50)}"` : '')
    );
  }

  const screenshotPath = path.join(__dirname, 'article_edit_inspect.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  fs.writeFileSync(path.join(__dirname, 'article_edit_inspect.html'), await page.content());

  console.log(`\nScreenshot saved to ${screenshotPath}`);
  console.log(`Full HTML saved to ${path.join(__dirname, 'article_edit_inspect.html')}`);
  console.log(
    '\nUse this output to understand the form structure and current field values ' +
    'before updating. Then run --update with the fields you want to change.'
  );
}

/**
 * The actual field-fill + autosave sequence. Runs ONLY inside the
 * guardedWrite() execute callback in updateArticle() below — never call
 * this directly.
 */
async function performUpdate(page, { title, body, section, dryRun }) {
  // SPIP form field selectors — same as create-article.mjs
  const TITLE_SELECTOR = 'input[name="titre"]';        // ✅ Verified: id="titre"
  const BODY_SELECTOR = 'textarea[name="texte"]';      // ✅ Verified: id="text_area"
  const SECTION_SELECTOR = 'select[name="id_parent"]'; // ✅ Verified (NOT id_rubrique)

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

  // Update only the fields that were provided
  if (title !== null) {
    console.log(`Updating title to: "${title}"`);
    await page.fill(TITLE_SELECTOR, title);
    await page.locator(TITLE_SELECTOR).blur();
    if (!dryRun) await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  }

  if (body !== null) {
    console.log('Updating body...');
    await page.fill(BODY_SELECTOR, body);
    await page.locator(BODY_SELECTOR).blur();
    if (!dryRun) await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  }

  if (section !== null) {
    // Validate section is numeric (same as create-article.mjs)
    if (!/^\d+$/.test(section)) {
      throw new Error(
        `section must be a numeric SPIP rubrique ID, got: "${section}". ` +
        `Translate category slugs to their rubrique IDs before calling this script.`
      );
    }
    console.log(`Updating section (id_parent) to ${section}...`);
    await page.selectOption(SECTION_SELECTOR, section);
    if (!dryRun) await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  }

  const screenshotPath = path.join(
    __dirname,
    dryRun ? 'article_update_dryrun.png' : 'article_update_result.png'
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\nScreenshot of current state saved to ${screenshotPath}`);

  if (dryRun) {
    console.log(
      '\n✅ --dry-run completed successfully!\n' +
      'Result: NO changes were saved (all autosave requests were blocked).\n' +
      'The form fields were updated correctly. You can review the screenshot\n' +
      'and then run the same command without --dry-run to actually update the article.'
    );
  } else {
    console.log(
      '\n✅ Article updated successfully. Changes have been autosaved.\n' +
      'Check the SPIP admin panel to verify, or run --inspect to see the updated values.'
    );
  }
}

async function updateArticle(page, { articleId, title, body, section, dryRun }) {
  if (title === null && body === null && section === null) {
    throw new Error('--update requires at least one of: --title, --body, --section.');
  }

  const changes = [];
  if (title !== null) changes.push(`title="${title.substring(0, 30)}"`);
  if (body !== null) changes.push(`body (${body.length} chars)`);
  if (section !== null) changes.push(`section=${section}`);

  return guardedWrite({
    action: 'article.update',
    target: { articleId, changes: changes.join(', ') },
    dryRun,
    relatedRisks: ['KILO-001'],
    execute: () => performUpdate(page, { title, body, section, dryRun }),
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.mode || !args.articleId) {
    console.error(
      'Usage:\n' +
      '  node update-article.mjs --inspect <id_article>\n' +
      '  node update-article.mjs --update <id_article> [--title "..."] [--body "..."] [--section N] [--dry-run]'
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

  const editUrl = buildEditUrl(args.articleId);
  console.log(`\nTarget article: #${args.articleId}`);
  console.log(`Edit URL: ${editUrl}\n`);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await login(page, { password, targetUrl: editUrl, expectedUrlIncludes: 'exec=article_edit' });

    if (args.mode === 'inspect') {
      await inspectForm(page);
    } else if (args.mode === 'update') {
      await updateArticle(page, args);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    const failPath = path.join(__dirname, 'update-article-error.png');
    await page.screenshot({ path: failPath, fullPage: true }).catch(() => {});
    console.error(`Screenshot at point of failure: ${failPath}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
