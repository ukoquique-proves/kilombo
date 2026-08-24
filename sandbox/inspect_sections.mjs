#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERNAME = 'kilombo';
const BASE_URL = 'https://www.kilombo.top';
const EDIT_URL = `${BASE_URL}/ecrire/?exec=article_edit&new=oui`;
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

async function main() {
  const env = loadEnv();
  const password = env.KILOMBOTOP_PASSWORD || env.KILOMBOTOP_FUTURE_PASSWORD;
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    console.log('Navigating to article edit form...');
    await page.goto(EDIT_URL, { waitUntil: 'domcontentloaded' });

    if (page.url().includes('page=login') || page.url().includes('exec=login')) {
      console.log('Logging in...');
      await page.fill('input[name="login"], input[type="text"]', USERNAME);
      await page.fill('input[type="password"]', password);
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    console.log('\n=== Available Sections (id_parent options) ===\n');
    const options = await page.evaluate(() => {
      const select = document.querySelector('select[name="id_parent"]');
      if (!select) return [];
      return Array.from(select.options).map(opt => ({
        value: opt.value,
        text: opt.textContent.trim(),
      }));
    });

    options.forEach(opt => {
      console.log(`  value="${opt.value}" → ${opt.text}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
