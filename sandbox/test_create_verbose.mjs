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

    console.log('Filling form...');
    await page.fill('input[name="titre"]', 'VERBOSE TEST: ' + new Date().toISOString());
    await page.fill('textarea[name="texte"]', '<p>This is a verbose test to understand article creation flow.</p>');
    
    console.log('Current URL before save:', page.url());
    console.log('Checking form fields...');
    
    const formData = await page.evaluate(() => ({
      titre: document.querySelector('input[name="titre"]').value,
      texte: document.querySelector('textarea[name="texte"]').value,
      id_parent: document.querySelector('select[name="id_parent"]').value,
    }));
    console.log('Form data:', formData);

    console.log('\nLooking for save button...');
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input[type="submit"], button[type="submit"]')).map(b => ({
        name: b.name,
        value: b.value,
        type: b.type,
        visible: b.offsetParent !== null,
      }));
    });
    console.log('Available submit buttons:', buttons);

    console.log('\nClicking save button...');
    await page.locator('input[type="submit"][name="save"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.locator('input[type="submit"][name="save"]').click();

    console.log('Waiting for response...');
    await page.waitForTimeout(3000);

    console.log('URL after save:', page.url());
    
    // Check if we got a confirmation or redirect
    const bodyText = await page.evaluate(() => document.body.textContent);
    if (bodyText.includes('en curso de redacción') || bodyText.includes('guardado')) {
      console.log('✅ Found confirmation text');
    }

    await page.screenshot({ path: path.join(__dirname, 'verbose_test_result.png'), fullPage: true });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
