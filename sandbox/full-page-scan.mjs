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
  
  // Scroll down to see if fieldset becomes visible
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  
  const visible = await page.evaluate(() => {
    const fs = document.querySelector('fieldset.editer_statut');
    return fs ? fs.offsetHeight > 0 : false;
  });
  
  console.log('Fieldset visible after scroll:', visible);
  
  // Count all fieldsets
  const fieldsets = await page.$$eval('fieldset', fs => fs.map(f => ({
    legend: f.querySelector('legend')?.textContent?.trim(),
    class: f.className,
    visible: f.offsetHeight > 0
  })));
  
  console.log('All fieldsets:');
  console.log(JSON.stringify(fieldsets, null, 2));
  
  // Try looking for the actual form that submits the status change
  const forms = await page.$$eval('form', fs => fs.map(f => ({
    action: f.action,
    inputs: Array.from(f.querySelectorAll('input[type="hidden"]')).map(i => i.name)
  })));
  
  console.log('\nForms and their hidden inputs:');
  console.log(JSON.stringify(forms, null, 2));
  
} finally {
  await browser.close();
}
