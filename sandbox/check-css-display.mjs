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
  
  // Get all CSS properties that might hide the fieldset
  const styles = await page.evaluate(() => {
    const fs = document.querySelector('fieldset.editer_statut');
    if (!fs) return 'FIELDSET NOT FOUND';
    
    const computed = window.getComputedStyle(fs);
    return {
      display: computed.display,
      visibility: computed.visibility,
      opacity: computed.opacity,
      maxHeight: computed.maxHeight,
      height: computed.height,
      width: computed.width,
      position: computed.position,
      overflow: computed.overflow,
      parent_display: window.getComputedStyle(fs.parentElement).display,
      grandparent_display: window.getComputedStyle(fs.parentElement.parentElement).display
    };
  });
  
  console.log('CSS styles of fieldset:');
  console.log(JSON.stringify(styles, null, 2));
  
  // Try setting display: block explicitly
  console.log('\nTrying to force display: block...');
  await page.evaluate(() => {
    const fs = document.querySelector('fieldset.editer_statut');
    if (fs) {
      fs.style.display = 'block';
      fs.style.visibility = 'visible';
      fs.style.maxHeight = '1000px';
      fs.style.opacity = '1';
    }
  });
  
  await page.waitForTimeout(500);
  
  const visible = await page.evaluate(() => {
    const fs = document.querySelector('fieldset.editer_statut');
    return fs ? {
      offsetHeight: fs.offsetHeight,
      offsetWidth: fs.offsetWidth,
      innerHTML_preview: fs.innerHTML.substring(0, 200)
    } : false;
  });
  
  console.log('After forcing display:block:');
  console.log(JSON.stringify(visible, null, 2));
  
  await page.screenshot({ path: 'sandbox/after-force-display.png' });
  
} finally {
  await browser.close();
}
