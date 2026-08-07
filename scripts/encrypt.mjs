#!/usr/bin/env node
/**
 * scripts/encrypt.mjs
 *
 * Encrypts the Kilombo mirror site content for deployment to GitHub Pages.
 *
 * What gets encrypted:
 *   HTML pages with content:  plandemismo.html, articulos.html, articulo.html
 *   JSON data files:          site/assets/data/*.json, site/assets/content/*.json
 *
 * What stays public:
 *   index.html  — the portal directory, no article/video content
 *   CSS / JS    — code only, no content
 *
 * HTML encryption:
 *   Uses the staticrypt CLI to wrap each page in a self-contained
 *   password-prompt shell. The visitor enters the password once; the
 *   hashed password is stored in sessionStorage so subsequent JSON
 *   fetches can use it without prompting again.
 *
 * JSON encryption:
 *   Uses staticrypt's own cryptoEngine + codec (the same PBKDF2 + AES-256-CBC
 *   pipeline) to encrypt each JSON file in-place. The output is a JSON
 *   envelope:
 *
 *     { "encrypted": true, "ciphertext": "<hex>", "salt": "<hex>" }
 *
 *   The JS fetchers (plandemismo.js, articles.js) detect this envelope and
 *   call decryptJson() — injected by this script into the page HTML — to
 *   recover the plaintext before parsing.
 *
 * Usage:
 *   STATICRYPT_PASSWORD=<password> node scripts/encrypt.mjs
 *   (or: npm run encrypt)
 *
 * In CI (deploy.yml), the password is read from the STATICRYPT_PASSWORD
 * GitHub Actions secret.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT     = resolve(__dirname, '..');
const SITE_DIR = join(ROOT, 'site');

// ── Load staticrypt internals via CJS require ────────────────────────────────
const require = createRequire(import.meta.url);
const cryptoEngine = require('../node_modules/staticrypt/lib/cryptoEngine.js');
const codec        = require('../node_modules/staticrypt/lib/codec.js');
const { encode }   = codec.init(cryptoEngine);

// ── Password & salt ──────────────────────────────────────────────────────────
const password = process.env.STATICRYPT_PASSWORD;
if (!password) {
  console.error('❌  STATICRYPT_PASSWORD environment variable is not set.');
  console.error('    Set it before running: STATICRYPT_PASSWORD=<password> npm run encrypt');
  process.exit(1);
}

const configPath = join(ROOT, '.staticrypt.json');
const salt = JSON.parse(readFileSync(configPath, 'utf8')).salt;
if (!salt || salt.length !== 32) {
  console.error('❌  Invalid or missing salt in .staticrypt.json');
  process.exit(1);
}

console.log(`\n🔐  Kilombo encrypt — staticrypt 3.x  (salt: ${salt.slice(0, 8)}…)\n`);

// ── Step 1: Encrypt HTML pages ───────────────────────────────────────────────
// staticrypt CLI encrypts HTML and writes to --directory.
// We write directly back into site/ (same filenames, overwriting originals).

const HTML_PAGES = [
  'plandemismo.html',
  'articulos.html',
  'articulo.html',
];

const STATICRYPT_FLAGS = [
  `--config .staticrypt.json`,
  `--directory ${SITE_DIR}`,         // output back into site/
  `--remember 0`,                    // no persistent localStorage — sessionStorage only
  `--template-title "Kilombo — Acceso restringido"`,
  `--template-instructions "Este espejo es de acceso privado. Introduce la contraseña para continuar."`,
  `--template-placeholder "Contraseña"`,
  `--template-remember "Recordar en esta sesión"`,
  `--template-error "Contraseña incorrecta"`,
  `--template-color-primary "#b91c2a"`,
  `--template-color-secondary "#fcfbf7"`,
  `--short`,                         // suppress short-password warning (CI env)
].join(' ');

for (const page of HTML_PAGES) {
  const fullPath = join(SITE_DIR, page);
  if (!existsSync(fullPath)) {
    console.warn(`⚠️   Skipping ${page} — file not found`);
    continue;
  }

  try {
    // staticrypt reads STATICRYPT_PASSWORD from env automatically
    execSync(
      `npx staticrypt ${fullPath} ${STATICRYPT_FLAGS}`,
      { cwd: ROOT, stdio: 'pipe', env: { ...process.env } }
    );
    console.log(`✅  HTML encrypted: ${page}`);
  } catch (err) {
    console.error(`❌  Failed to encrypt ${page}:`);
    console.error(err.stderr?.toString() || err.message);
    process.exit(1);
  }
}

// ── Step 2: Encrypt JSON data files ─────────────────────────────────────────
// Uses staticrypt's own codec so the client-side decryption uses the same
// key derivation as the HTML password prompt.

const JSON_DIRS = [
  join(SITE_DIR, 'assets', 'data'),
  join(SITE_DIR, 'assets', 'content'),
];

async function encryptJsonFile(filePath) {
  const plaintext = readFileSync(filePath, 'utf8');

  // Skip if already encrypted (idempotent — safe to re-run)
  try {
    const parsed = JSON.parse(plaintext);
    if (parsed && parsed.encrypted === true && parsed.ciphertext) {
      console.log(`⏭   Already encrypted, skipping: ${filePath.replace(ROOT + '/', '')}`);
      return;
    }
  } catch {
    // not valid JSON — shouldn't happen but don't crash
  }

  const ciphertext = await encode(plaintext, password, salt);

  const envelope = JSON.stringify({ encrypted: true, ciphertext, salt });
  writeFileSync(filePath, envelope, 'utf8');
  console.log(`✅  JSON encrypted: ${filePath.replace(ROOT + '/', '')}`);
}

const jsonPromises = [];
for (const dir of JSON_DIRS) {
  if (!existsSync(dir)) continue;
  const files = readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('.'));
  for (const file of files) {
    jsonPromises.push(encryptJsonFile(join(dir, file)));
  }
}

await Promise.all(jsonPromises);

console.log('\n🏁  Encryption complete.\n');
