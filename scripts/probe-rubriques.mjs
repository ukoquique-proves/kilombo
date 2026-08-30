#!/usr/bin/env node
/**
 * probe-rubriques.mjs — Fetch the full rubrique (section) list from the live
 * SPIP admin panel and print id→label pairs. Run once to populate
 * SLUG_TO_RUBRIQUE_ID in scripts/lib/spip-client.mjs.
 *
 * Usage: node scripts/probe-rubriques.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

function loadEnv() {
  const vars = {};
  fs.readFileSync(ENV_PATH, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) vars[m[1]] = m[2];
  });
  return vars;
}

const env = loadEnv();
const PASSWORD = env.KILOMBOTOP_PASSWORD;
if (!PASSWORD) { console.error('KILOMBOTOP_PASSWORD not found in .env'); process.exit(1); }

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

await page.goto('https://www.kilombo.top/ecrire/?exec=article_edit&new=oui', { waitUntil: 'domcontentloaded' });

if (page.url().includes('login')) {
  await page.fill('input[name="login"], input[type="text"]', 'kilombo');
  await page.fill('input[name="password"], input[type="password"]', PASSWORD);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(1500);
}

// Extract all <option> values from the id_parent select
const rubriques = await page.evaluate(() => {
  const select = document.querySelector('select[name="id_parent"]');
  if (!select) return [];
  return Array.from(select.options).map(o => ({
    id: o.value,
    label: o.textContent.trim().replace(/\u00a0/g, '').replace(/\s+/g, ' '),
    // eslint-disable-next-line no-sparse-arrays
    level: (o.className.match(/niveau_(\d+)/) || [, '0'])[1],
  }));
});

console.log('\n=== SPIP Rubriques (id_parent options) ===\n');
rubriques.forEach(r => {
  const indent = '  '.repeat(parseInt(r.level));
  console.log(`${indent}id=${r.id.padEnd(4)} ${r.label}`);
});

console.log('\n=== Raw JSON for SLUG_TO_RUBRIQUE_ID ===\n');
console.log(JSON.stringify(rubriques, null, 2));

await browser.close();
