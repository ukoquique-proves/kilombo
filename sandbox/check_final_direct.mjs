#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERNAME = 'kilombo';
const BASE_URL = 'https://www.kilombo.top';
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
    console.log('Navigating to articles dashboard (no filter)...');
    await page.goto(`${BASE_URL}/ecrire/?exec=articles`, { waitUntil: 'domcontentloaded' });

    if (page.url().includes('page=login') || page.url().includes('exec=login')) {
      console.log('Logging in...');
      await page.fill('input[name="login"], input[type="text"]', USERNAME);
      await page.fill('input[type="password"]', password);
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    console.log('Checking for "FINAL TEST" text...');
    const fullText = await page.evaluate(() => document.body.textContent);
    
    if (fullText.includes('FINAL TEST')) {
      console.log('\n✅ ARTICLE FOUND! "FINAL TEST" is on the dashboard!');
    } else {
      console.log('\n❌ "FINAL TEST" not found on first page');
      console.log('Checking article count...');
      const countMatch = fullText.match(/(\d+)\s+art[ií]culos/);
      if (countMatch) {
        console.log(`Total articles shown: ${countMatch[1]}`);
      }
    }

    // Check date 2026-08-21
    if (fullText.includes('2026-08-21')) {
      console.log('✅ Found today\'s date on page');
    }

    // Take screenshot
    await page.screenshot({ path: path.join(__dirname, 'final_dashboard_check.png'), fullPage: true });
    console.log('\nScreenshot saved to sandbox/final_dashboard_check.png');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
