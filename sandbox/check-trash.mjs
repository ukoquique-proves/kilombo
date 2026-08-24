#!/usr/bin/env node
import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const SPIP_USER = process.env.SPIP_USER || 'admin';
const SPIP_PASSWORD = process.env.SPIP_PASSWORD || 'demo';

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  console.log('Navigating to trash...');
  await page.goto('https://www.kilombo.top/ecrire/?exec=corbeille', { waitUntil: 'load', timeout: 30000 });
  
  // Login if needed
  const loginForm = await page.$('input[name="login"]').catch(() => null);
  if (loginForm) {
    console.log('Logging in...');
    await page.fill('input[name="login"]', SPIP_USER);
    await page.fill('input[name="password"]', SPIP_PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'load', timeout: 30000 });
  }
  
  // Get all text content to see what's on the page
  const bodyText = await page.textContent('body');
  console.log('\n=== Trash Page Content ===\n');
  console.log(bodyText.substring(0, 2000));
  
  // Take full screenshot
  await page.screenshot({ path: '/root/JOB-sda2/KILOMBO-SITE/KILOMBO/sandbox/trash_full.png', fullPage: true });
  console.log('\nScreenshot saved to sandbox/trash_full.png');
  
} finally {
  await browser.close();
}
