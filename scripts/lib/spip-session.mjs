/**
 * scripts/lib/spip-session.mjs
 *
 * Shared login/session helpers for scripts that drive the live kilombo.top
 * SPIP admin backend via Playwright (create-article.mjs, delete/update
 * scripts, customize-escal-theme.mjs, probe-escal-fields.mjs, ...).
 *
 * WHY THIS EXISTS (TO_FIX #68):
 * Before this module, each of those scripts carried its own hand-copied
 * login() function. They had already drifted from each other in small,
 * real ways — e.g. probe-escal-fields.mjs's failure check only matched
 * `exec=login`, silently missing the `page=login` case the other two
 * scripts did check for. That's exactly the kind of bug a fourth
 * copy-pasted script (update-article.mjs, per #68) would keep reintroducing.
 *
 * This module merges the three prior copies, keeping the most defensive
 * behavior found in any of them:
 *   - Checks BOTH `page=login` and `exec=login` for the SPIP-native form
 *     (customize-escal-theme.mjs had this; probe-escal-fields.mjs did not).
 *   - Re-navigates to the target URL if login didn't land where expected,
 *     and gives a clear .env hint on final failure (create-article.mjs had
 *     this; the other two did not).
 *
 * create-article.mjs's version was used as the base because it's the one
 * with a verified live success (TO_FIX #66 — Article #87 created 2026-08-21).
 */

import fs from 'node:fs';

export const USERNAME = 'kilombo';
export const BASE_URL = 'https://www.kilombo.top';

/**
 * Manual .env parser (no dotenv dependency), matching the pattern used
 * across scripts/debug/scrape.cjs and every script this module replaces.
 */
export function loadEnv(envPath) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const vars = {};
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      let value = match[2].trim();
      if (
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))
      ) {
        value = value.slice(1, -1);
      }
      vars[match[1]] = value;
    }
  });
  return vars;
}

/**
 * Standard full-admin credential lookup: KILOMBOTOP_PASSWORD, falling back
 * to KILOMBOTOP_FUTURE_PASSWORD during the password-rotation window (#23).
 */
export function getPassword(env) {
  return env.KILOMBOTOP_PASSWORD || env.KILOMBOTOP_FUTURE_PASSWORD || null;
}

/**
 * Scoped-credential lookup for scripts that only need a narrower
 * permission set (currently: theme editing). See docs/RISK-REGISTER.json
 * KILO-002 — falls back to the full-admin credential until SPIP role
 * scoping is available (Phase 2).
 *
 * @param {object} env
 * @param {string} scopedVarName - e.g. 'KILOMBOTOP_ESCAL_PASSWORD'
 */
export function getScopedPassword(env, scopedVarName) {
  if (env[scopedVarName] && env[scopedVarName] !== 'placeholder') {
    console.log(`ℹ️  Using narrower scoped credential (${scopedVarName})`);
    return env[scopedVarName];
  }
  console.log(
    `ℹ️  Using full admin credential (KILOMBOTOP_PASSWORD) — ${scopedVarName} not configured`
  );
  console.log('    See RISK-REGISTER.json KILO-002 for credential scoping roadmap');
  return getPassword(env);
}

/**
 * Logs into the SPIP admin backend, handling both of the two forms this
 * site can present: SPIP's own login page, and the YunoHost SSO portal.
 * Re-navigates once if login lands somewhere unexpected, then throws a
 * clear error if it's still stuck on a login page.
 *
 * @param {import('playwright').Page} page
 * @param {object} opts
 * @param {string} opts.password
 * @param {string} opts.targetUrl - URL to load (and reload after login if needed)
 * @param {string} [opts.expectedUrlIncludes] - substring the post-login URL
 *   should contain (e.g. 'exec=article_edit'). If provided and missing
 *   after the first login attempt, re-navigates to targetUrl once before
 *   giving up.
 * @param {string} [opts.username] - defaults to USERNAME ('kilombo')
 */
export async function login(page, { password, targetUrl, expectedUrlIncludes, username = USERNAME }) {
  console.log(`Navigating to ${targetUrl} ...`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

  // SPIP has its own login form (page=login) — separate from YunoHost SSO.
  // Fields: "Login o dirección mail" + "Contraseña" + button "Conectarse".
  if (page.url().includes('page=login') || page.url().includes('exec=login')) {
    console.log('Detected SPIP login page. Logging in...');
    await page.fill('input[name="login"], input[type="text"]', username);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.click('input[type="submit"], button[type="submit"]');
    // Don't wait for full networkidle — SPIP loads assets slowly
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000); // brief pause for redirects to settle
  }

  // SSO fallback (YunoHost portal)
  if (page.url().includes('sso') || page.url().includes('portalapi')) {
    console.log('Detected YunoHost SSO page. Logging in...');
    await page.fill(
      'input[type="text"], input[name="credentials"], input[name="username"], input[id="loginInput"]',
      username
    );
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"], input[type="submit"], #submit');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  console.log('Current URL after login:', page.url());

  if (expectedUrlIncludes && !page.url().includes(expectedUrlIncludes)) {
    console.log(`Not on ${expectedUrlIncludes} yet — re-navigating...`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  }

  if (page.url().includes('exec=login') || page.url().includes('page=login')) {
    throw new Error(
      `Login did not reach ${expectedUrlIncludes || targetUrl} — landed on ${page.url()} instead. ` +
        `Check the SPIP password in .env (KILOMBOTOP_PASSWORD may be the YunoHost ` +
        `password, not the SPIP-specific one — they can differ).`
    );
  }
}
