#!/usr/bin/env node
/**
 * SPIP article permanent deletion via trash
 * In SPIP, articles must be moved to trash first, then deleted from trash
 */
import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const SPIP_USER = process.env.SPIP_USER || 'admin';
const SPIP_PASSWORD = process.env.SPIP_PASSWORD || 'demo';
const ARTICLE_ID = process.argv[2] || '87';

console.log(`\n🗑️  SPIP Article Permanent Deletion via Trash`);
console.log(`   Article ID: ${ARTICLE_ID}\n`);

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  // Step 1: Navigate to trash
  console.log(`[1/3] Navigating to trash (Papelera)...`);
  await page.goto('https://www.kilombo.top/ecrire/?exec=corbeille', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Login if needed
  const loginForm = await page.$('input[name="login"]').catch(() => null);
  if (loginForm) {
    console.log(`[1/3] Logging in...`);
    await page.fill('input[name="login"]', SPIP_USER);
    await page.fill('input[name="password"]', SPIP_PASSWORD);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
  }
  
  // Step 2: Find the article in trash
  console.log(`[2/3] Looking for article ${ARTICLE_ID} in trash...`);
  
  // Look for the article row
  const articleRow = await page.$(`a[href*="id_article=${ARTICLE_ID}"]`).catch(() => null);
  if (!articleRow) {
    console.log(`✗ Article ${ARTICLE_ID} not found in trash`);
    const allRows = await page.$$('tr');
    console.log(`Trash contains ${allRows.length} rows total`);
    await page.screenshot({ path: `/root/JOB-sda2/KILOMBO-SITE/KILOMBO/sandbox/trash_not_found.png` });
    process.exit(0);
  }
  
  console.log(`✓ Found article ${ARTICLE_ID} in trash`);
  
  // Step 3: Look for delete button next to article
  console.log(`[3/3] Looking for permanent delete button...`);
  
  // Get the row and look for delete checkbox or button
  const row = await articleRow.evaluateHandle(el => el.closest('tr'));
  const deleteBtn = await row.evaluateHandle(tr => {
    // Look for buttons with delete/supprimer text
    const buttons = tr.querySelectorAll('button, a[class*="supprimer"], input[value*="Supprimer"]');
    return buttons[0] || null;
  }).catch(() => null);
  
  if (deleteBtn) {
    console.log(`✓ Found delete button, clicking...`);
    await deleteBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    console.log(`✓ Article ${ARTICLE_ID} permanently deleted from trash`);
  } else {
    console.log(`✗ No delete button found in trash row`);
    console.log(`   (Trash in SPIP may require direct database deletion or admin action)`);
    await page.screenshot({ path: `/root/JOB-sda2/KILOMBO-SITE/KILOMBO/sandbox/trash_page.png`, fullPage: true });
    console.log(`   Screenshot saved to sandbox/trash_page.png`);
  }
  
} finally {
  await browser.close();
}
