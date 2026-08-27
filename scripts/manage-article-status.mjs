#!/usr/bin/env node
/**
 * manage-article-status.mjs — Log into kilombo.top SPIP and change article status
 *
 * SPIP status workflow for articles:
 *   prepa      - En curso de redacción (Draft / In Progress)
 *   prop       - propuesto a la evaluación (Proposed for Review)
 *   publie     - Publicado (Published)
 *   refuse     - Rechazado (Refused/Rejected)
 *   poubelle   - A la papelera (Trash/Deleted)
 *
 * Note: Available status options depend on current state.
 *       Use --inspect to see what's available for a specific article.
 *
 * LIVE-WRITE GATEWAY:
 * The status-change action (the prepa → publie transition flagged in
 * docs/RISK-REGISTER.json as KILO-001) is routed through guardedWrite()
 * (scripts/lib/live-write-gateway.mjs), the shared chokepoint for every
 * script that mutates the live SPIP site. Pass-through today, audited
 * always, and the first place any future approval gate gets added.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardedWrite } from './lib/live-write-gateway.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERNAME = 'kilombo';
const BASE_URL = 'https://www.kilombo.top';
const ENV_PATH = path.join(__dirname, '..', '.env');

// Valid SPIP article statuses (what's actually available in the dropdown)
const VALID_STATUSES = {
  prepa: 'En curso de redacción (Draft)',
  prop: 'propuesto a la evaluación (Proposed)',
  publie: 'Publicado (Published)',
  refuse: 'Rechazado (Refused)',
  poubelle: 'A la papelera (Trash)',
};

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
  const args = { mode: null, id: null, status: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--inspect') args.mode = 'inspect';
    else if (a === '--change') args.mode = 'change';
    else if (a === '--id') args.id = argv[++i];
    else if (a === '--status') args.status = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

async function login(page, password, targetUrl) {
  console.log(`Navigating to ${targetUrl} ...`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

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
  if (page.url().includes('exec=login') || page.url().includes('page=login')) {
    throw new Error(`Login failed — landed on ${page.url()}`);
  }
}

async function inspectArticleStatus(page, id) {
  console.log('\n=== Available Article Status Options ===\n');

  const statusInfo = await page.evaluate(() => {
    const statuses = [];

    const statusBox = document.querySelector('.statut_actuel');
    if (!statusBox) return { error: 'Status box not found', found: false };

    const currentStatus = statusBox.querySelector('.statut-label');
    const currentStatusText = currentStatus ? currentStatus.textContent.trim() : 'unknown';

    const modifyBtn = statusBox.querySelector('.btn_modifier');
    if (modifyBtn) modifyBtn.click();

    return new Promise((resolve) => {
      setTimeout(() => {
        const radios = Array.from(document.querySelectorAll('input[name="statut"]')).map((r) => ({
          value: r.value,
          id: r.id,
          label: document.querySelector(`label[for="${r.id}"]`)?.textContent.trim(),
          checked: r.checked,
        }));

        resolve({
          found: true,
          currentStatus: currentStatusText,
          availableOptions: radios,
        });
      }, 500);
    });
  });

  if (statusInfo.error) {
    console.error(`Error: ${statusInfo.error}`);
    return;
  }

  console.log(`Current Status: ${statusInfo.currentStatus}\n`);
  console.log('Available options to change to:');
  statusInfo.availableOptions.forEach((opt) => {
    const indicator = opt.checked ? '✓' : ' ';
    console.log(`  [${indicator}] ${opt.value.padEnd(8)} — ${opt.label}`);
  });

  console.log('\nUsage to change status:');
  console.log(`  node manage-article-status.mjs --change --id ${id} --status <value>\n`);
  console.log('Valid status values:');
  Object.entries(VALID_STATUSES).forEach(([key, desc]) => {
    console.log(`  --status ${key.padEnd(8)} # ${desc}`);
  });

  const screenshotPath = path.join(__dirname, `article_${id}_status_inspect.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\nScreenshot saved to ${screenshotPath}`);
}

/**
 * The actual status-change sequence. Runs ONLY inside the guardedWrite()
 * execute callback in changeArticleStatus() below — never call directly.
 */
async function performStatusChange(page, id, targetStatus, dryRun) {
  console.log(`\nPreparing to change Article ${id} status to: ${targetStatus}`);
  console.log(`Target description: ${VALID_STATUSES[targetStatus]}`);

  if (dryRun) {
    console.log('[DRY RUN] Would perform the following steps:');
    console.log('  1. Click status change button');
    console.log(`  2. Select status radio: ${targetStatus}`);
    console.log('  3. Click Cambiar (Change) button');
    console.log('  4. Accept confirmation dialog');
    return;
  }

  console.log('\nSetting up dialog handler for SPIP confirmation...');
  let dialogAccepted = false;
  let dialogMessage = null;

  page.on('dialog', async (dialog) => {
    dialogMessage = dialog.message();
    dialogAccepted = true;
    console.log(`✓ Confirmation dialog detected: "${dialogMessage}"`);
    console.log('  Accepting change...');
    await dialog.accept();
  });

  const currentStatus = await page.evaluate(() => {
    const statusLabel = document.querySelector('.statut-label');
    return statusLabel ? statusLabel.textContent.trim() : 'unknown';
  });

  console.log(`Current status: ${currentStatus}`);

  console.log('\nClicking status change button...');
  const changeButton = await page.$('.statut_actuel .btn_modifier');
  if (!changeButton) {
    throw new Error('Status change button not found');
  }
  await changeButton.click();
  await page.waitForTimeout(600);

  console.log(`Selecting status option: ${targetStatus}...`);
  const selected = await page.evaluate((target) => {
    const radio = document.querySelector(`input[name="statut"][value="${target}"]`);
    if (!radio) {
      return { error: `Radio for status "${target}" not found`, success: false };
    }
    radio.click();
    return { success: true, value: radio.value };
  }, targetStatus);

  if (!selected.success) {
    throw new Error(selected.error);
  }

  console.log(`✓ Selected: ${selected.value}`);
  await page.waitForTimeout(400);

  console.log('Clicking Cambiar button to submit change...');
  const submitted = await page.evaluate(() => {
    const button = document.querySelector('button[name="changer"]');
    if (!button) {
      return { error: 'Cambiar button not found', success: false };
    }
    button.click();
    return { success: true };
  });

  if (!submitted.success) {
    throw new Error(submitted.error);
  }

  console.log('✓ Change submitted');

  await page.waitForTimeout(1500);

  if (!dialogAccepted) {
    console.log('⚠️  Warning: No confirmation dialog was detected.');
    console.log('   The status change may not have been saved.');
    console.log('STATUS_CHANGE_UNCONFIRMED: dialog was never accepted');
  } else {
    console.log(`✓ Confirmed: "${dialogMessage}"`);
  }

  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const finalStatus = await page.evaluate(() => {
    const statusLabel = document.querySelector('.statut-label');
    return statusLabel ? statusLabel.textContent.trim() : 'unknown';
  });

  console.log(`Final status after change: ${finalStatus}`);

  // Emit an unambiguous success marker only when the dialog was actually
  // accepted — parseStatusChangeOutput() in spip-client.mjs keys off this.
  // If dialogAccepted is false, 'Final status after change' still prints
  // (it's just a DOM read), but STATUS_CHANGE_CONFIRMED is NOT emitted,
  // so the caller will correctly detect failure instead of false-positiving.
  if (dialogAccepted) {
    console.log(`STATUS_CHANGE_CONFIRMED: ${finalStatus}`);
  }

  const screenshotPath = path.join(__dirname, `article_${id}_status_changed.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);

  return { finalStatus };
}

async function changeArticleStatus(page, id, targetStatus, dryRun) {
  if (!VALID_STATUSES[targetStatus]) {
    throw new Error(
      `Invalid status "${targetStatus}". Valid options: ${Object.keys(VALID_STATUSES).join(', ')}`
    );
  }

  // SECURITY: Gate direct publishing (prepa → publie) behind explicit approval
  // to prevent accidental live publication without review (KILO-001 mitigation)
  if (targetStatus === 'publie' && !process.env.KILO_APPROVE_PUBLISHING) {
    console.error('\n⚠️  SECURITY CHECK: Direct article publishing requires explicit approval.\n');
    console.error('Publishing directly bypasses the review/moderation queue.');
    console.error('To publish directly:');
    console.error(
      `  KILO_APPROVE_PUBLISHING=true node manage-article-status.mjs --change --id ${id} --status publie\n`
    );
    console.error('Better practice: Change status to "prop" for review first:');
    console.error(`  node manage-article-status.mjs --change --id ${id} --status prop\n`);
    process.exit(1);
  }

  return guardedWrite({
    action: 'article.status.change',
    target: { id, status: targetStatus },
    dryRun,
    relatedRisks: ['KILO-001'],
    execute: () => performStatusChange(page, id, targetStatus, dryRun),
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.mode || !args.id) {
    console.error(`
Usage:
  Inspect available status options:
    node manage-article-status.mjs --inspect --id <id>
  
  Change article status:
    node manage-article-status.mjs --change --id <id> --status <prepa|prop|publie|refuse|poubelle> [--dry-run]

Examples:
  node manage-article-status.mjs --inspect --id 87
  node manage-article-status.mjs --change --id 87 --status poubelle --dry-run
  node manage-article-status.mjs --change --id 87 --status poubelle

Valid status codes and descriptions:
  prepa    — En curso de redacción (Draft / In Progress)
  prop     — propuesto a la evaluación (Proposed for Review)
  publie   — Publicado (Published)
  refuse   — Rechazado (Refused / Rejected)
  poubelle — A la papelera (Trash / Deleted)

Note: Availability of status options depends on the article's current state.
      Use --inspect to see which statuses are available for a specific article.
    `);
    process.exit(1);
  }

  if (args.mode === 'change' && !args.status) {
    console.error('Error: --status is required when using --change mode');
    console.error(`Valid options: ${Object.keys(VALID_STATUSES).join(', ')}`);
    process.exit(1);
  }

  const env = loadEnv();
  const password = env.KILOMBOTOP_PASSWORD || env.KILOMBOTOP_FUTURE_PASSWORD;
  if (!password) {
    console.error(`No password in ${ENV_PATH}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await login(page, password, `${BASE_URL}/ecrire/?exec=article&id_article=${args.id}`);

    if (args.mode === 'inspect') {
      await inspectArticleStatus(page, args.id);
    } else if (args.mode === 'change') {
      await changeArticleStatus(page, args.id, args.status, args.dryRun);
    }
  } catch (err) {
    console.error(`\n✗ Error: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
