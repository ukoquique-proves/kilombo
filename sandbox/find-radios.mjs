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
  
  // Find all radios named "statut"
  const radios = await page.$$eval('input[name="statut"]', inputs => inputs.map(inp => ({
    value: inp.value,
    id: inp.id,
    checked: inp.checked,
    visible: inp.offsetHeight > 0 && inp.offsetWidth > 0 && inp.getClientRects().length > 0,
    display: window.getComputedStyle(inp).display,
    visibility: window.getComputedStyle(inp).visibility,
    parentDisplay: window.getComputedStyle(inp.parentElement).display,
    parentClass: inp.parentElement?.className,
    label: document.querySelector(`label[for="${inp.id}"]`)?.textContent
  })));
  
  console.log('All statut radios:');
  console.log(JSON.stringify(radios, null, 2));
  
  // Try to scroll to and check visibility
  const poubelleRadio = await page.$('input[name="statut"][value="poubelle"]');
  if (poubelleRadio) {
    console.log('\nScrolling to poubelle radio...');
    await poubelleRadio.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const visible = await poubelleRadio.isVisible();
    console.log('Poubelle radio visible after scroll:', visible);
    
    // Take screenshot
    await page.screenshot({ path: 'sandbox/after-scroll.png' });
  }
  
} finally {
  await browser.close();
}
