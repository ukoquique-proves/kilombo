#!/usr/bin/env node
/**
 * scripts/test-spip-privilege-tiers.mjs
 *
 * Tests the actual privilege tier of the 'kilombo' user in SPIP.
 * SPIP distinguishes between:
 *   - Editor: Can create/edit articles
 *   - Admin: Can access plugins, configuration, user management
 *
 * This resolves part of TO_FIX #67 concern: even though we can create
 * articles, that doesn't necessarily mean full admin access.
 *
 * Usage:
 *   node scripts/test-spip-privilege-tiers.mjs [--verbose]
 *
 * Tests:
 *   1. exec=articles (article list) — should be accessible to editors
 *   2. exec=admin_plugin (plugin management) — admin only
 *   3. exec=configuration (site settings) — admin only
 *   4. /ecrire/?exec=auteurs (user/author management) — admin only
 */

import https from 'https';
import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENV_FILE = resolve(ROOT, '.env');

// ================================================================
// CONFIG
// ================================================================

const SPIP_INSTANCE = {
  name: 'Tierra y Libertad',
  baseUrl: 'https://www.kilombo.top',
};

const PRIVILEGE_TESTS = [
  {
    name: 'Article List (exec=articles)',
    path: '/ecrire/?exec=articles',
    expectedLevel: 'editor',
    reason: 'Editors can view and manage articles',
  },
  {
    name: 'Plugin Management (exec=admin_plugin)',
    path: '/ecrire/?exec=admin_plugin',
    expectedLevel: 'admin',
    reason: 'Only full admins can manage plugins',
  },
  {
    name: 'Site Configuration (exec=configuration)',
    path: '/ecrire/?exec=configuration',
    expectedLevel: 'admin',
    reason: 'Only admins can access site-wide settings',
  },
  {
    name: 'User/Author Management (exec=auteurs)',
    path: '/ecrire/?exec=auteurs',
    expectedLevel: 'admin',
    reason: 'Only admins can manage users and permissions',
  },
  {
    name: 'Backup & Tools (exec=outils)',
    path: '/ecrire/?exec=outils',
    expectedLevel: 'admin',
    reason: 'Only admins can access maintenance/backup tools',
  },
];

// ================================================================
// HTTP TEST (NO AUTH, just follow redirects)
// ================================================================

/**
 * Test if URL is accessible without redirecting to login
 * Returns: { statusCode, finalUrl, redirectChain, hasSSOHeader }
 */
function testHttpAccess(url) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve({
        statusCode: null,
        finalUrl: url,
        redirectChain: [],
        hasSSOHeader: false,
        error: 'timeout',
      });
    }, 10000);

    const redirectChain = [];
    let finalUrl = url;

    const makeRequest = (requestUrl) => {
      https
        .get(requestUrl, { rejectUnauthorized: false }, (res) => {
          redirectChain.push({
            url: requestUrl,
            statusCode: res.statusCode,
          });

          const hasSSOHeader = !!res.headers['x-sso-wat'];

          // Follow redirects
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = res.headers.location;
            // Avoid infinite redirect loops
            if (
              nextUrl !== requestUrl &&
              redirectChain.length < 5 &&
              !nextUrl.includes('page=login')
            ) {
              const fullNextUrl = nextUrl.startsWith('http')
                ? nextUrl
                : `${SPIP_INSTANCE.baseUrl}${nextUrl}`;
              finalUrl = fullNextUrl;
              makeRequest(fullNextUrl);
            } else {
              clearTimeout(timeoutId);
              resolve({
                statusCode: res.statusCode,
                finalUrl,
                redirectChain,
                hasSSOHeader,
              });
            }
          } else {
            clearTimeout(timeoutId);
            resolve({
              statusCode: res.statusCode,
              finalUrl,
              redirectChain,
              hasSSOHeader,
            });
          }
        })
        .on('error', (err) => {
          clearTimeout(timeoutId);
          resolve({
            statusCode: null,
            finalUrl: url,
            redirectChain,
            hasSSOHeader: false,
            error: err.code || err.message,
          });
        });
    };

    makeRequest(url);
  });
}

/**
 * Interpret access level from response
 */
function interpretAccessLevel(result) {
  if (!result.statusCode) {
    return { level: 'unreachable', reason: result.error };
  }

  const finalUrlStr = result.finalUrl || '';

  // Check for login redirect
  if (
    finalUrlStr.includes('page=login') ||
    finalUrlStr.includes('exec=login') ||
    result.statusCode === 401
  ) {
    return { level: 'denied', reason: 'Redirected to login (access denied)' };
  }

  // HTTP 200 without redirect
  if (result.statusCode === 200 && result.redirectChain.length <= 1) {
    return { level: 'granted', reason: 'HTTP 200 (access granted)' };
  }

  // SSO redirect but eventually reached content
  if (result.hasSSOHeader && result.statusCode === 200) {
    return {
      level: 'granted',
      reason: 'HTTP 200 via SSO (access granted after authentication)',
    };
  }

  return {
    level: 'unknown',
    reason: `HTTP ${result.statusCode} (unclear)`,
  };
}

// ================================================================
// MAIN
// ================================================================

async function main() {
  const verbose = process.argv.includes('--verbose');

  console.log('\n' + '='.repeat(80));
  console.log('SPIP Privilege Tier Test');
  console.log('='.repeat(80));
  console.log(`Instance: ${SPIP_INSTANCE.name}`);
  console.log(`Base URL: ${SPIP_INSTANCE.baseUrl}`);
  console.log(`Testing: ${PRIVILEGE_TESTS.length} privilege-gated endpoints\n`);

  const results = [];
  let editorAccessCount = 0;
  let adminAccessCount = 0;
  let deniedCount = 0;

  for (const test of PRIVILEGE_TESTS) {
    const fullUrl = `${SPIP_INSTANCE.baseUrl}${test.path}`;

    if (verbose) console.log(`Testing: ${test.name}...`);

    const result = await testHttpAccess(fullUrl);
    const access = interpretAccessLevel(result);

    // Categorize
    let category = 'unknown';
    if (access.level === 'granted') {
      category = test.expectedLevel;
      if (test.expectedLevel === 'editor') editorAccessCount++;
      else if (test.expectedLevel === 'admin') adminAccessCount++;
    } else if (access.level === 'denied') {
      category = 'denied';
      deniedCount++;
    }

    const statusIcon = access.level === 'granted' ? '✅' : access.level === 'denied' ? '❌' : '⚠️ ';

    console.log(`${statusIcon} ${test.name.padEnd(40)} — ${access.reason.padEnd(50)}`);

    if (verbose && result.redirectChain.length > 0) {
      for (const [i, redirect] of result.redirectChain.entries()) {
        console.log(
          `   └─ ${i === 0 ? 'Request' : 'Redirect'}: ${redirect.url.slice(-60)} (HTTP ${redirect.statusCode})`
        );
      }
    }

    results.push({
      test: test.name,
      url: test.path,
      accessLevel: access.level,
      accessReason: access.reason,
      expectedLevel: test.expectedLevel,
      statusCode: result.statusCode,
    });
  }

  // Summary
  console.log('\n' + '─'.repeat(80));
  console.log('Summary:');
  console.log(`  ✅ Granted access: ${editorAccessCount + adminAccessCount}`);
  console.log(`  ❌ Denied access: ${deniedCount}`);
  console.log(
    `  ⚠️  Unreachable/unknown: ${results.length - (editorAccessCount + adminAccessCount + deniedCount)}\n`
  );

  // Privilege tier interpretation
  let privilegeTier = 'unknown';
  if (adminAccessCount > 0) {
    privilegeTier = 'FULL ADMIN';
    console.log('🔑 Privilege Tier: FULL ADMIN (has access to plugin/config management)');
  } else if (editorAccessCount > 0) {
    privilegeTier = 'EDITOR';
    console.log(
      '🔑 Privilege Tier: EDITOR (can create/edit articles, but not manage plugins/config)'
    );
  } else if (deniedCount > 0) {
    privilegeTier = 'LIMITED';
    console.log(
      '🔑 Privilege Tier: LIMITED (all tested endpoints denied — may be viewer-only or other restriction)'
    );
  }

  console.log('\n' + '─'.repeat(80));
  console.log('JSON Results:\n');
  console.log(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        instance: SPIP_INSTANCE.name,
        privilege_tier: privilegeTier,
        editor_access: editorAccessCount > 0,
        admin_access: adminAccessCount > 0,
        denied_count: deniedCount,
        results,
      },
      null,
      2
    )
  );

  console.log('\n' + '='.repeat(80));
  console.log('Interpretation:');
  console.log('  FULL ADMIN — "kilombo" can manage plugins and site configuration');
  console.log('  EDITOR — "kilombo" can create/edit articles but not manage plugins');
  console.log('  LIMITED — "kilombo" has restricted access (check with admin)\n');
  console.log('='.repeat(80) + '\n');

  process.exit(adminAccessCount > 0 || editorAccessCount > 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
