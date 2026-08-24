#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERNAME = 'kilombo';
const BASE_URL = 'https://www.kilombo.top';
const DASHBOARD_URL = `${BASE_URL}/ecrire/?exec=articles`;
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
    console.log('Navigating to articles dashboard...');
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });

    if (page.url().includes('page=login') || page.url().includes('exec=login')) {
      console.log('Logging in...');
      await page.fill('input[name="login"], input[type="text"]', USERNAME);
      await page.fill('input[type="password"]', password);
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    console.log('Current URL:', page.url());
    
    // Look for our test article in page text
    const fullText = await page.evaluate(() => document.body.textContent);
    if (fullText.includes('Test: Verificación de integración')) {
      console.log('\n✅ TEST ARTICLE FOUND in dashboard!');
      console.log('Article is now saved in SPIP as "en curso de redacción"');
    } else {
      console.log('\n⚠️  Test article not found in current view');
      console.log('It may be on another page or in a different filter view');
    }

    // Take screenshot
    await page.screenshot({ path: path.join(__dirname, 'dashboard_articles_list.png'), fullPage: true });
    console.log('\nScreenshot saved to sandbox/dashboard_articles_list.png');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
