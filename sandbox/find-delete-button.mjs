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
  
  // Look for all buttons and links that might relate to delete/trash
  const deleteOptions = await page.evaluate(() => {
    const results = [];
    
    // Check all buttons
    document.querySelectorAll('button').forEach(b => {
      if (/delete|trash|poubelle|supprimer|remove|corbeille/i.test(b.textContent + b.title + b.className)) {
        results.push({
          type: 'button',
          text: b.textContent.trim(),
          title: b.title,
          class: b.className
        });
      }
    });
    
    // Check all links
    document.querySelectorAll('a').forEach(a => {
      if (/delete|trash|poubelle|supprimer|remove|corbeille/i.test(a.textContent + a.title + a.className)) {
        results.push({
          type: 'link',
          text: a.textContent.trim(),
          title: a.title,
          href: a.href,
          class: a.className
        });
      }
    });
    
    return results;
  });
  
  console.log('Delete/trash options found:');
  console.log(JSON.stringify(deleteOptions, null, 2));
  
  // Also check page structure
  const sidebarElements = await page.$$eval('[class*="sidebar"], .actions, aside', els =>
    els.map(el => el.outerHTML.substring(0, 500))
  ).catch(() => []);
  
  if (sidebarElements.length > 0) {
    console.log('\nSidebar HTML previews:');
    sidebarElements.forEach((html, i) => console.log(`[${i}]: ${html}`));
  }
  
} finally {
  await browser.close();
}
