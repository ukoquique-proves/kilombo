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
  
  // Get the HTML of the container with the radios
  const html = await page.evaluate(() => {
    const radio = document.querySelector('input[name="statut"][value="poubelle"]');
    let container = radio;
    for (let i = 0; i < 5; i++) {
      container = container.parentElement;
      if (!container) break;
    }
    return container ? container.outerHTML.substring(0, 2000) : 'NOT FOUND';
  });
  
  console.log('DOM structure around poubelle radio:');
  console.log(html);
  
  // Check if there's a fieldset or collapsible section
  const fieldsets = await page.$$eval('fieldset', fs => fs.map(f => ({
    legend: f.querySelector('legend')?.textContent.trim(),
    id: f.id,
    class: f.className,
    visible: f.offsetHeight > 0
  })));
  
  console.log('\nFieldsets:');
  console.log(JSON.stringify(fieldsets, null, 2));
  
} finally {
  await browser.close();
}
