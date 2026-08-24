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
  
  // Check initial state
  let radios = await page.evaluate(() => {
    return document.querySelectorAll('input[name="statut"]').length;
  });
  
  console.log('Radios found before click:', radios);
  
  // Click the button
  const changeButton = await page.$('.statut_actuel .btn_modifier');
  console.log('Button found:', changeButton !== null);
  
  if (changeButton) {
    await changeButton.click();
    console.log('Button clicked');
    await page.waitForTimeout(1000);
  }
  
  // Check after click
  radios = await page.evaluate(() => {
    return document.querySelectorAll('input[name="statut"]').length;
  });
  
  console.log('Radios found after click:', radios);
  
  // Check if any radios are visible now
  const radioDetails = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input[name="statut"]')).map(r => ({
      value: r.value,
      visible: r.offsetHeight > 0 && r.offsetWidth > 0,
      height: r.offsetHeight,
      width: r.offsetWidth
    }));
  });
  
  console.log('Radio details:');
  console.log(JSON.stringify(radioDetails, null, 2));
  
  // Take screenshot
  await page.screenshot({ path: 'sandbox/debug-after-button-click.png' });
  console.log('Screenshot saved');
  
} finally {
  await browser.close();
}
