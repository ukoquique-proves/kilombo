#!/usr/bin/env node
/**
 * scripts/probe-escal-fields.mjs
 *
 * Discovers all available configuration fields in the Escal theme.
 *
 * This tool logs into SPIP, navigates through all Escal configuration sub-menus,
 * and extracts all input/textarea fields with their labels. Useful for finding
 * field names to use with customize-escal-theme.mjs.
 *
 * Usage:
 *   node scripts/probe-escal-fields.mjs
 *   node scripts/probe-escal-fields.mjs --verbose
 *   node scripts/probe-escal-fields.mjs --export fields.json
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERNAME = 'kilombo';
const BASE_URL = 'https://www.kilombo.top';
const CONFIG_URL = `${BASE_URL}/ecrire/?exec=configurer_escal`;
const ENV_PATH = path.join(__dirname, '..', '.env');

function loadEnv() {
  const envContent = fs.readFileSync(ENV_PATH, 'utf8');
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
 * KILO-002 Credential Scoping (Phase 1 Minimal Viable Mitigation)
 *
 * Theme probing currently uses the same full-admin credential as publishing scripts.
 * This function supports future credential scoping without breaking current code.
 *
 * Phase 1 (now): Check for narrower credential, fall back to full admin (backward compatible)
 * Phase 2 (future): Once SPIP 4.4.15 supports narrower roles, set KILOMBOTOP_ESCAL_PASSWORD
 *                   and this will automatically use the scoped credential
 *
 * See: docs/RISK-REGISTER.json KILO-002 and docs/UI-ARCHITECTURE-SPEC.md Section III
 */
function getThemeEditPassword(env) {
  // If narrower credential exists (Phase 2+), use it
  if (env.KILOMBOTOP_ESCAL_PASSWORD && env.KILOMBOTOP_ESCAL_PASSWORD !== 'placeholder') {
    console.log('ℹ️  Using narrower Escal-scoped credential (KILOMBOTOP_ESCAL_PASSWORD)');
    return env.KILOMBOTOP_ESCAL_PASSWORD;
  }

  // Otherwise, fall back to full admin credential (Phase 1 / current behavior)
  // This maintains backward compatibility while supporting future isolation
  console.log(
    'ℹ️  Using full admin credential (KILOMBOTOP_PASSWORD) — narrower Escal credential not configured'
  );
  console.log('    See RISK-REGISTER.json KILO-002 for credential scoping roadmap');
  return env.KILOMBOTOP_PASSWORD || env.KILOMBOTOP_FUTURE_PASSWORD;
}

function parseArgs(argv) {
  const args = { verbose: false, export: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--verbose') args.verbose = true;
    else if (a === '--export') args.export = argv[++i];
  }
  return args;
}

async function login(page, password) {
  console.log('🔐 Logging into SPIP...');
  await page.goto(CONFIG_URL, { waitUntil: 'domcontentloaded' });

  if (page.url().includes('page=login') || page.url().includes('exec=login')) {
    console.log('📝 Submitting login credentials...');
    await page.fill('input[name="login"], input[type="text"]', USERNAME);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.click('input[type="submit"], button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  if (page.url().includes('sso') || page.url().includes('portalapi')) {
    console.log('🔐 YunoHost SSO detected, logging in...');
    await page.fill(
      'input[type="text"], input[name="credentials"], input[name="username"], input[id="loginInput"]',
      USERNAME
    );
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"], input[type="submit"], #submit');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  if (page.url().includes('exec=login')) {
    throw new Error('Login failed. Check KILOMBOTOP_PASSWORD in .env');
  }

  console.log('✅ Logged in successfully\n');
}

async function probeFields(page, verbose) {
  console.log('🔍 Discovering Escal configuration fields...\n');

  // Get list of sub-menus
  await page.goto(CONFIG_URL, { waitUntil: 'domcontentloaded' });

  const subMenus = await page.evaluate(() => {
    const links = Array.from(
      document.querySelectorAll(
        '.lat a, .navigation a, #navigation a, .gauche a, #bando_navigation a, a[href*="configurer_escal"]'
      )
    );
    return links
      .map((a) => ({
        text: a.innerText.trim(),
        href: a.href,
        title: a.title || a.innerText.trim(),
      }))
      .filter(
        (l) =>
          l.text.length > 0 && (l.href.includes('configurer_escal') || l.href.includes('escal_'))
      );
  });

  if (verbose) {
    console.log(`Found ${subMenus.length} sub-menus to explore:\n`);
    subMenus.forEach((menu, i) => {
      console.log(`  [${i + 1}] ${menu.text}`);
    });
    console.log('\n');
  }

  const allFields = [];

  for (const menu of subMenus) {
    if (verbose) {
      console.log(`📄 Exploring: ${menu.text}...`);
    }

    await page.goto(menu.href, { waitUntil: 'domcontentloaded' });

    // Extract all form fields
    const fields = await page.evaluate(() => {
      const results = [];

      // Get all input and textarea elements
      const elements = document.querySelectorAll(
        'input[type="text"], input[type="hidden"], textarea, input[type="checkbox"], input[type="radio"], select'
      );

      elements.forEach((el) => {
        let label = '';

        // Try to find associated label
        if (el.id) {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          if (lbl) label = lbl.innerText.trim();
        }

        if (!label && el.closest('label')) {
          label = el.closest('label').innerText.trim();
        }

        if (!label && el.closest('.fieldset')) {
          const legend = el.closest('.fieldset').querySelector('legend');
          if (legend) label = legend.innerText.trim();
        }

        // Try nearby text
        if (!label && el.previousElementSibling) {
          const nearby = el.previousElementSibling.innerText;
          if (nearby && nearby.length > 0 && nearby.length < 100) {
            label = nearby.trim();
          }
        }

        if (el.name && el.name.trim().length > 0) {
          results.push({
            name: el.name,
            type: el.type || el.tagName.toLowerCase(),
            label: label || '(no label)',
            value: el.value || el.textContent || '',
            placeholder: el.placeholder || '',
          });
        }
      });

      return results;
    });

    if (verbose && fields.length > 0) {
      console.log(`   Found ${fields.length} field(s)\n`);
    }

    fields.forEach((field) => {
      allFields.push({
        ...field,
        menuName: menu.text,
        menuUrl: menu.href,
      });
    });
  }

  return allFields;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv();
  const password = getThemeEditPassword(env);

  if (!password) {
    console.error(`❌ No password found in ${ENV_PATH}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await login(page, password);
    const fields = await probeFields(page, args.verbose);

    if (fields.length === 0) {
      console.log('⚠️  No configuration fields found');
    } else {
      console.log(`\n✅ Found ${fields.length} total configuration field(s)\n`);
      console.log('═'.repeat(120));
      console.log('FIELD NAME'.padEnd(35), 'TYPE'.padEnd(12), 'LABEL'.padEnd(45), 'MENU');
      console.log('═'.repeat(120));

      fields.forEach((field) => {
        const label = field.label.substring(0, 42);
        console.log(
          field.name.padEnd(35),
          (field.type || 'text').padEnd(12),
          label.padEnd(45),
          field.menuName.substring(0, 25)
        );
      });

      console.log('═'.repeat(120));

      // Group by menu for clarity
      console.log('\n📋 Fields by Menu:\n');
      const groupedByMenu = {};
      fields.forEach((field) => {
        if (!groupedByMenu[field.menuName]) {
          groupedByMenu[field.menuName] = [];
        }
        groupedByMenu[field.menuName].push(field);
      });

      Object.entries(groupedByMenu).forEach(([menuName, menuFields]) => {
        console.log(`\n${menuName}:`);
        menuFields.forEach((field) => {
          console.log(`  • ${field.name} (${field.type})`);
          if (field.label !== '(no label)') {
            console.log(`    Label: "${field.label}"`);
          }
          if (field.value) {
            console.log(
              `    Current value: "${field.value.substring(0, 50)}${field.value.length > 50 ? '...' : ''}"`
            );
          }
        });
      });

      // Export to file if requested
      if (args.export) {
        const exportData = {
          discoveredAt: new Date().toISOString(),
          totalFields: fields.length,
          fields: fields,
          usage:
            'Use field name with: node scripts/customize-escal-theme.mjs --field <name> --value "<text>"',
        };

        fs.writeFileSync(args.export, JSON.stringify(exportData, null, 2));
        console.log(`\n✅ Field data exported to: ${args.export}`);
      }

      console.log('\n💡 To customize a field, use:');
      console.log(
        '  node scripts/customize-escal-theme.mjs --field <field_name> --value "<new_value>"'
      );
      console.log('\n📖 See docs/THEME-CUSTOMIZATION.md for examples and best practices.\n');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
