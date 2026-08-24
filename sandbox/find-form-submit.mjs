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

let dialogFired = false;
page.on('dialog', async (dialog) => {
  dialogFired = true;
  console.log(`Dialog: "${dialog.message()}"`);
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
  
  // Open dropdown
  const changeButton = await page.$('.statut_actuel .btn_modifier');
  await changeButton.click();
  await page.waitForTimeout(500);
  
  // Click radio
  await page.evaluate(() => {
    document.querySelector('input[name="statut"][value="poubelle"]').click();
  });
  await page.waitForTimeout(500);
  
  // Find the form that contains the status change
  const formInfo = await page.evaluate(() => {
    const form = document.querySelector('.statut_actuel form') || document.querySelector('form[method="post"]');
    if (!form) return { error: 'No form found' };
    
    return {
      action: form.action,
      method: form.method,
      id: form.id,
      inputs: Array.from(form.querySelectorAll('input')).map(i => ({
        name: i.name,
        value: i.value,
        type: i.type
      })),
      buttons: Array.from(form.querySelectorAll('button')).map(b => ({
        text: b.textContent.trim(),
        type: b.type,
        name: b.name
      }))
    };
  });
  
  console.log('Form info:');
  console.log(JSON.stringify(formInfo, null, 2));
  
  // Try submitting the form directly
  console.log('\nTrying to submit form...');
  await page.evaluate(() => {
    const form = document.querySelector('form[method="post"]');
    if (form) {
      // Set statut to poubelle if not already
      const poubelleRadio = form.querySelector('input[name="statut"][value="poubelle"]');
      if (poubelleRadio) poubelleRadio.checked = true;
      form.submit();
    }
  });
  
  await page.waitForTimeout(2000);
  console.log('Form submitted. Dialog fired:', dialogFired);
  console.log('URL after submit:', page.url());
  
} finally {
  await browser.close();
}
