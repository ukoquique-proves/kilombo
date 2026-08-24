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
    console.log('Navigating to articles list...');
    await page.goto(`${BASE_URL}/ecrire/?exec=articles`, { waitUntil: 'domcontentloaded' });

    if (page.url().includes('page=login') || page.url().includes('exec=login')) {
      console.log('Logging in...');
      await page.fill('input[name="login"], input[type="text"]', USERNAME);
      await page.fill('input[type="password"]', password);
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // Try using the search box
    console.log('Searching for test article...');
    const searchBox = await page.$('input[name="recherche"], input[placeholder*="Buscar"]');
    if (searchBox) {
      await searchBox.fill('Verificación');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    const fullText = await page.evaluate(() => document.body.textContent);
    const html = await page.content();
    
    if (fullText.includes('Verificación de integración')) {
      console.log('\n✅ TEST ARTICLE FOUND in search results!');
    } else if (html.includes('2026-08-21')) {
      console.log('\n✅ Found article with today\'s date (2026-08-21)');
      console.log('Test article appears to be created successfully');
    } else {
      console.log('\n⚠️  Test article not found');
      console.log('Checking full article count...');
      const countMatch = fullText.match(/(\d+)\s+art[ií]culos/);
      if (countMatch) {
        console.log(`Articles in system: ${countMatch[1]}`);
      }
    }

    // Take screenshot
    await page.screenshot({ path: path.join(__dirname, 'dashboard_search_result.png'), fullPage: true });
    console.log('\nScreenshot saved to sandbox/dashboard_search_result.png');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
