#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

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
  
  // Check all available forms and links on the page
  const forms = await page.$$eval('form', fs => fs.map(f => ({
    name: f.name,
    action: f.action,
    method: f.method,
    id: f.id
  })));
  
  console.log('Available forms:');
  console.log(JSON.stringify(forms, null, 2));
  
  // Check for links that might lead to status change
  const links = await page.$$eval('a', as => as.map(a => ({
    text: a.textContent.trim(),
    href: a.href,
    title: a.title
  })).filter(a => /statut|poubelle|corbeille|trash|delete|supprimer/i.test(a.text + a.title)));
  
  console.log('\nLinks related to status/deletion:');
  console.log(JSON.stringify(links, null, 2));
  
  // Check tabs or navigation elements
  const tabs = await page.$$eval('[role="tab"], .onglets a, .tabs a', es => es.map(e => ({
    text: e.textContent.trim(),
    href: e.getAttribute('href'),
    role: e.getAttribute('role')
  })));
  
  console.log('\nTabs/navigation:');
  console.log(JSON.stringify(tabs, null, 2));
  
} finally {
  await browser.close();
}
