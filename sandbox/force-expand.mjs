#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) env[m[1]] = m[2];
});

const pwd = env.KILOMBOTOP_PASSWORD || env.KILOMBOTOP_FUTURE_PASSWORD;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

try {
  await page.goto('https://www.kilombo.top/ecrire/?exec=article&id_article=87', { waitUntil: 'domcontentloaded' });
  
  if (page.url().includes('login')) {
    await page.fill('input[type="text"]', 'kilombo');
    await page.fill('input[type="password"]', pwd);
    await page.click('input[type="submit"]');
    await page.waitForNavigation().catch(() => {});
    await page.waitForTimeout(2000);
  }
  
  // Use JavaScript to click the legend directly, bypassing Playwright visibility checks
  console.log('Clicking legend via JavaScript...');
  await page.evaluate(() => {
    const legend = document.querySelector('legend.editer-label');
    if (legend) legend.click();
  });
  
  await page.waitForTimeout(1000);
  
  // Check if fieldset is now visible
  const visible = await page.evaluate(() => {
    const fs = document.querySelector('fieldset.editer_statut');
    return fs ? fs.offsetHeight > 0 : false;
  });
  
  console.log('Fieldset visible after JS click:', visible);
  
  // Check radios visibility
  const radiosVisible = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[name="statut"]');
    return Array.from(radios).map(r => ({
      value: r.value,
      height: r.offsetHeight,
      width: r.offsetWidth,
      parent: r.parentElement?.className
    }));
  });
  
  console.log('Radio visibility:');
  console.log(JSON.stringify(radiosVisible, null, 2));
  
  await page.screenshot({ path: 'sandbox/after-js-expand.png' });
  console.log('Screenshot saved');
  
} finally {
  await browser.close();
}
