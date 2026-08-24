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
  
  // Click the button
  const changeButton = await page.$('.statut_actuel .btn_modifier');
  await changeButton.click();
  await page.waitForTimeout(1000);
  
  // Get ALL radios with all their details
  const allRadios = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input[name="statut"]')).map(r => ({
      value: r.value,
      id: r.id,
      name: r.name,
      label: document.querySelector(`label[for="${r.id}"]`)?.textContent.trim(),
      parent: r.parentElement?.className,
      form: r.form?.className,
      checked: r.checked
    }));
  });
  
  console.log('ALL radios with full details:');
  console.log(JSON.stringify(allRadios, null, 2));
  
} finally {
  await browser.close();
}
