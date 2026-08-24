#!/usr/bin/env node
/**
 * sandbox/test-admin-plugin-access.mjs
 *
 * Narrow, read-only probe to determine if 'kilombo' user has admin_plugin access.
 * Uses the same credential pattern as verify-trash.mjs (KILOMBOTOP_PASSWORD).
 *
 * This resolves TO_FIX #67 with actual evidence instead of guesswork.
 *
 * Usage:
 *   node sandbox/test-admin-plugin-access.mjs
 *
 * Output:
 *   ✅ ADMIN ACCESS: user can reach exec=admin_plugin → full admin capability
 *   ⚠️  EDITOR ONLY: user redirected to login or permission denied → editor-level access only
 *   ❌ NO ACCESS: authentication failed → credentials incorrect
 *
 * Returns exit code: 0 (admin), 1 (editor), 2 (no access)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ================================================================
// CREDENTIAL LOADING (matches verify-trash.mjs pattern exactly)
// ================================================================

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const vars = {};
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) vars[match[1]] = match[2];
  });
  return vars;
}

// ================================================================
// TEST LOGIC
// ================================================================

async function testAdminPluginAccess() {
  const env = loadEnv();
  const password = env.KILOMBOTOP_PASSWORD || env.KILOMBOTOP_FUTURE_PASSWORD;

  if (!password) {
    console.error('❌ NO CREDENTIALS: KILOMBOTOP_PASSWORD not found in .env');
    process.exit(2);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  try {
    const testUrl = 'https://www.kilombo.top/ecrire/?exec=admin_plugin';
    console.log('\n' + '='.repeat(80));
    console.log('Testing admin_plugin access for "kilombo" user');
    console.log('='.repeat(80));
    console.log(`Target URL: ${testUrl}\n`);

    // Navigate to admin_plugin
    console.log('[1/3] Navigating to admin_plugin...');
    await page.goto(testUrl, { waitUntil: 'domcontentloaded' });

    let currentUrl = page.url();
    console.log(`Current URL after navigation: ${currentUrl}`);

    // Check if login page
    if (currentUrl.includes('page=login') || currentUrl.includes('exec=login')) {
      console.log('[2/3] Detected login page — authenticating...');

      // Fill login form
      await page.fill('input[type="text"]', 'kilombo');
      await page.fill('input[type="password"]', password);
      await page.click('input[type="submit"]');

      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(1500);

      currentUrl = page.url();
      console.log(`URL after login: ${currentUrl}`);
    } else {
      console.log('[2/3] Already on SPIP admin panel (no login needed)');
    }

    // Evaluate access level
    console.log('[3/3] Determining privilege tier...\n');

    // ✅ SUCCESS: on admin_plugin page
    if (currentUrl.includes('exec=admin_plugin')) {
      console.log('✅ ADMIN ACCESS CONFIRMED');
      console.log('   User "kilombo" CAN access exec=admin_plugin');
      console.log('   Privilege tier: FULL ADMIN (can manage plugins, configuration, users)');
      console.log('\n   Implication: GCI extractors requiring plugin/module management are FEASIBLE');
      await browser.close();
      process.exit(0);
    }

    // ⚠️ EDITOR ONLY: redirected back to login or permission error
    if (currentUrl.includes('page=login') || currentUrl.includes('exec=login')) {
      console.log('⚠️  EDITOR-LEVEL ACCESS ONLY (not admin)');
      console.log('   User "kilombo" CAN create/edit articles but CANNOT access exec=admin_plugin');
      console.log('   Privilege tier: EDITOR (article management only)');
      console.log('\n   Implication: GCI extractors requiring plugin/module management are NOT FEASIBLE');
      console.log('   Alternative: HTML scraper required instead of plugin-based extraction');
      await browser.close();
      process.exit(1);
    }

    // Check for permission error messages on page
    const bodyText = await page.textContent('body');
    if (bodyText && bodyText.includes('permission') || bodyText.includes('autorisé')) {
      console.log('⚠️  EDITOR-LEVEL ACCESS ONLY (not admin)');
      console.log('   Permission denied message detected on page');
      console.log('   Privilege tier: EDITOR');
      await browser.close();
      process.exit(1);
    }

    // Fallback: unknown state
    console.log('⚠️  UNKNOWN STATE');
    console.log(`   Final URL: ${currentUrl}`);
    console.log('   Could not determine privilege tier from page state');
    console.log('\nDebug info:');
    const pageTitle = await page.title();
    const pageHeading = await page.textContent('h1');
    console.log(`   Page title: ${pageTitle}`);
    console.log(`   Page heading: ${pageHeading}`);
    await browser.close();
    process.exit(2);
  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
    await browser.close();
    process.exit(2);
  }
}

testAdminPluginAccess();
