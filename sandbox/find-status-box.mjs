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
  
  // Look for status box/indicator in the sidebar
  const statusElements = await page.$$eval('[class*="statut"], [class*="status"], .status-box, .state-box, .article-state, .info-box', els => 
    els.map(el => ({
      tag: el.tagName,
      class: el.className,
      text: el.textContent.trim().substring(0, 100),
      html: el.outerHTML.substring(0, 300)
    }))
  ).catch(() => []);
  
  console.log('Status-related elements found:');
  console.log(JSON.stringify(statusElements, null, 2));
  
  // Look for the Estatuto/Status section in the left sidebar (shown in the screenshot)
  const sidebar = await page.$eval('.actions, .sidebar, aside, [class*="sidebar"]', el => el.outerHTML.substring(0, 1500)).catch(() => 'NOT FOUND');
  
  console.log('\nSidebar HTML preview:');
  console.log(sidebar);
  
  // Look for clickable status elements specifically
  const clickableStatus = await page.$$eval('a, button, div[role="button"]', els =>
    els.filter(el => /statut|status|poubelle|trash|draft|published|editing|cours de redaction/i.test(el.textContent + el.className + el.title))
    .map(el => ({
      tag: el.tagName,
      class: el.className,
      role: el.getAttribute('role'),
      text: el.textContent.trim().substring(0, 80),
      title: el.title,
      id: el.id
    }))
  ).catch(() => []);
  
  console.log('\nClickable status elements:');
  console.log(JSON.stringify(clickableStatus, null, 2));
  
} finally {
  await browser.close();
}
