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

const requests = [];
page.on('request', req => {
  requests.push({
    method: req.method(),
    url: req.url(),
    postData: req.postData()
  });
});

let dialogMessage = null;
page.on('dialog', async (dialog) => {
  dialogMessage = dialog.message();
  console.log(`Dialog: "${dialogMessage}"`);
  await dialog.accept();
});

try {
  await page.goto('https://www.kilombo.top/ecrire/?exec=article&id_article=87', { waitUntil: 'domcontentloaded' });
  
  if (page.url().includes('login')) {
    await page.fill('input[type="text"]', 'kilombo');
    await page.fill('input[type="password"]', pwd);
    await page.click('input[type="submit"]');
    await page.waitForNavigation().catch(() => {});
    await page.waitForTimeout(2000);
  }
  
  requests.length = 0; // Clear requests up to this point
  
  // Open dropdown
  const changeButton = await page.$('.statut_actuel .btn_modifier');
  await changeButton.click();
  await page.waitForTimeout(500);
  
  // Click radio
  await page.evaluate(() => {
    document.querySelector('input[name="statut"][value="poubelle"]').click();
  });
  await page.waitForTimeout(500);
  
  // Click Cambiar button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.statut_actuel button'));
    for (const btn of buttons) {
      if (btn.textContent.includes('Cambiar')) {
        btn.click();
        break;
      }
    }
  });
  
  await page.waitForTimeout(2000);
  
  console.log('\nDialog message:', dialogMessage);
  console.log('\nRequests made:');
  console.log(JSON.stringify(requests, null, 2));
  
} finally {
  await browser.close();
}
