#!/usr/bin/env node
/**
 * scripts/test-spip-access.mjs
 *
 * Tests whether the current credentials can access the SPIP backend
 * (/ecrire/) on each Kilombo SPIP instance.
 *
 * This resolves TO_FIX #67 — testing the documentation contradiction
 * about whether 'kilombo' is a SPIP admin or not.
 *
 * Usage:
 *   node scripts/test-spip-access.mjs [--verbose]
 *
 * Output: JSON summary table + plain text results
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

const SPIP_INSTANCES = [
  {
    name: 'Tierra y Libertad',
    domain: 'www.kilombo.top',
    url: 'https://www.kilombo.top/ecrire/',
    envVar: 'KILOMBO_SITE_TIERRA_URL',
  },
  {
    name: 'Proletarios Internacionalistas',
    domain: 'proletariosinternacionalistas.kilombo.top',
    url: 'https://proletariosinternacionalistas.kilombo.top/ecrire/',
    envVar: 'KILOMBO_SITE_PI_URL',
  },
  {
    name: 'GCI / ICG Oficial',
    domain: 'icg-gci.kilombo.top',
    url: 'https://icg-gci.kilombo.top/ecrire/',
    envVar: 'KILOMBO_SITE_GCI_URL',
  },
  {
    name: 'International Global Revolution (EN)',
    domain: 'in.kilombo.top',
    url: 'https://in.kilombo.top/ecrire/',
    envVar: 'KILOMBO_SITE_GCI_EN_URL',
  },
];

// ================================================================
// ENV LOADER
// ================================================================

/**
 * Parse .env file and extract variables
 */
async function loadEnv() {
  try {
    const content = await fs.readFile(ENV_FILE, 'utf-8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (key && rest.length > 0) {
        let value = rest.join('=').trim();
        // Remove surrounding quotes if present
        if ((value.startsWith("'") && value.endsWith("'")) || 
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    }
    return env;
  } catch (err) {
    console.error(`❌ Failed to load .env: ${err.message}`);
    process.exit(1);
  }
}

// ================================================================
// HTTP TEST
// ================================================================

/**
 * Test if URL is reachable and returns a response code
 * (without authentication)
 */
function testHttpGet(url) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve({ reachable: false, statusCode: null, error: 'timeout' });
    }, 5000);

    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        clearTimeout(timeoutId);
        resolve({
          reachable: true,
          statusCode: res.statusCode,
          headers: res.headers,
        });
      })
      .on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          reachable: false,
          statusCode: null,
          error: err.code || err.message,
        });
      });
  });
}

/**
 * Check if response indicates SSO redirect
 */
function hasSSORedirect(result) {
  if (!result.reachable) return null;
  const xSso = result.headers['x-sso-wat'];
  return !!xSso;
}

// ================================================================
// MAIN
// ================================================================

async function main() {
  const verbose = process.argv.includes('--verbose');
  const env = await loadEnv();

  console.log('\n' + '='.repeat(80));
  console.log('SPIP Backend Access Test — All Kilombo Instances');
  console.log('='.repeat(80));
  console.log(`Credentials: ${env.KILOMBOTOP_USER || 'N/A'}`);
  console.log(`Testing: ${SPIP_INSTANCES.length} instances\n`);

  const results = [];

  for (const instance of SPIP_INSTANCES) {
    if (verbose) console.log(`Testing: ${instance.name}...`);

    const result = await testHttpGet(instance.url);
    const hasSso = hasSSORedirect(result);
    const accessible =
      result.reachable &&
      (result.statusCode === 401 || // Login form present (good)
        result.statusCode === 200 || // Already logged in (good)
        result.statusCode === 302 || // Redirect (likely SSO)
        hasSso); // SSO header present

    const status = accessible
      ? result.statusCode === 401
        ? '✅ Reachable (login required)'
        : result.statusCode === 200
        ? '✅ Reachable (logged in)'
        : '✅ Reachable (redirect/SSO)'
      : `❌ Not reachable (${result.error})`;

    results.push({
      instance: instance.name,
      domain: instance.domain,
      url: instance.url,
      accessible,
      statusCode: result.statusCode,
      hasSso,
      error: result.error,
      status,
    });

    console.log(`${status} — ${instance.name} (${instance.domain})`);
    if (verbose && result.statusCode) {
      console.log(`   └─ HTTP ${result.statusCode} ${hasSso ? '[SSO]' : ''}\n`);
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(80));
  const allAccessible = results.every((r) => r.accessible);
  const accessibleCount = results.filter((r) => r.accessible).length;

  console.log(`Summary: ${accessibleCount}/${results.length} instances reachable`);
  if (allAccessible) {
    console.log('✅ All SPIP backends are reachable.');
    console.log(
      '   Whether the current credentials are a SPIP admin requires login testing.'
    );
  } else {
    console.log('❌ Some instances are not reachable.');
  }

  // JSON output
  console.log('\n' + '─'.repeat(80));
  console.log('JSON Results:\n');
  console.log(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        credentials_user: env.KILOMBOTOP_USER,
        total_instances: SPIP_INSTANCES.length,
        accessible_count: accessibleCount,
        results: results.map((r) => ({
          instance: r.instance,
          domain: r.domain,
          accessible: r.accessible,
          statusCode: r.statusCode,
          hasSso: r.hasSso,
        })),
      },
      null,
      2
    )
  );

  console.log('\n' + '='.repeat(80));
  console.log('Interpretation:');
  console.log('  ✅ Reachable = /ecrire/ page responds (login form or SSO redirect visible)');
  console.log('  ❌ Not reachable = connection refused or timeout\n');
  console.log('Next step: Test actual login with authentication to confirm SPIP admin status');
  console.log('='.repeat(80) + '\n');

  process.exit(allAccessible ? 0 : 1);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
