#!/usr/bin/env node
/**
 * scripts/encrypt.mjs
 *
 * Encrypts the Kilombo mirror site content for deployment to GitHub Pages.
 *
 * OUTPUT DIRECTORY: dist/
 *   This script NEVER modifies site/. It copies the entire site/ tree to
 *   dist/, then encrypts the target files inside dist/. The source files
 *   in site/ remain plaintext at all times.
 *
 *   This means:
 *     - Running npm run encrypt locally is safe — site/ is not touched.
 *     - sync-to-production.sh always sees plaintext site/ regardless of
 *       whether encrypt.mjs has been run.
 *     - CI uploads dist/ to GitHub Pages; the repo never contains ciphertext.
 *
 * What gets encrypted (inside dist/):
 *   HTML pages with content:  plandemismo.html, articulos.html, articulo.html
 *   JSON data files:          assets/data/*.json, assets/content/*.json
 *
 * What stays public (inside dist/, copied verbatim from site/):
 *   index.html  — the portal directory, no article/video content
 *   CSS / JS    — code only, no content
 *
 * HTML encryption:
 *   Uses the staticrypt CLI to wrap each page in a self-contained
 *   password-prompt shell. The visitor enters the password once; the
 *   hashed password is stored in localStorage so subsequent page navigations
 *   and JSON fetches do not re-prompt.
 *
 * JSON encryption:
 *   Uses staticrypt's own cryptoEngine + codec (the same PBKDF2 + AES-256-CBC
 *   pipeline) to encrypt each JSON file. The output is a JSON envelope:
 *
 *     { "encrypted": true, "ciphertext": "<hex>" }
 *
 *   The JS fetchers (plandemismo.js, articles.js) detect this envelope and
 *   call parseJson() from decrypt.mjs to recover the plaintext before parsing.
 *   Note: the salt used during encryption is baked into the pre-hashed password
 *   by staticrypt's login flow; the envelope does not need to include it.
 *
 * Usage:
 *   STATICRYPT_PASSWORD=<password> node scripts/encrypt.mjs
 *   (or: npm run encrypt)
 *
 * In CI (deploy.yml), the password is read from the STATICRYPT_PASSWORD
 * GitHub Actions secret. The deploy step uploads dist/ (not site/).
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, cpSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SITE_DIR = join(ROOT, 'site');
const DIST_DIR = join(ROOT, 'dist');

// ── Load staticrypt internals via CJS require ────────────────────────────────
const require = createRequire(import.meta.url);
const cryptoEngine = require('../node_modules/staticrypt/lib/cryptoEngine.js');
const codec = require('../node_modules/staticrypt/lib/codec.js');
const { encode } = codec.init(cryptoEngine);

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

console.log(`\n🔐  Kilombo encrypt — staticrypt 3.x  (salt: ${salt.slice(0, 8)}…)`);
console.log(`    source: site/   →   output: dist/\n`);

// ── Step 0: Copy site/ → dist/ (fresh every run) ────────────────────────────
// dist/ is always rebuilt from scratch so there is no stale-ciphertext risk
// and the HTML idempotency problem (encrypting an already-encrypted page) is
// structurally impossible — dist/ starts as a clean copy of plaintext site/.
if (existsSync(DIST_DIR)) {
  // Remove existing dist/ to avoid stale files from a previous run
  execSync(`rm -rf "${DIST_DIR}"`, { cwd: ROOT });
}
mkdirSync(DIST_DIR, { recursive: true });
cpSync(SITE_DIR, DIST_DIR, { recursive: true });
console.log(`✅  Copied site/ → dist/\n`);

// ── Step 1: Encrypt HTML pages inside dist/ ──────────────────────────────────
// staticrypt CLI encrypts the file at the given path and writes the result to
// --directory. We point it at dist/ so site/ is never touched.
// Because dist/ is always freshly copied from site/ (Step 0), the HTML files
// here are always plaintext — double-encryption is structurally impossible.

const HTML_PAGES = ['plandemismo.html', 'articulos.html', 'articulo.html'];

const STATICRYPT_FLAGS = [
  `--config .staticrypt.json`,
  `--directory ${DIST_DIR}`,
  `--remember 0`,
  `--template-title "Kilombo — Acceso restringido"`,
  `--template-instructions "Este espejo es de acceso privado. Introduce la contraseña para continuar."`,
  `--template-placeholder "Contraseña"`,
  `--template-remember "Recordar en esta sesión"`,
  `--template-error "Contraseña incorrecta"`,
  `--template-color-primary "#b91c2a"`,
  `--template-color-secondary "#fcfbf7"`,
  `--short`,
].join(' ');

for (const page of HTML_PAGES) {
  const srcPath = join(SITE_DIR, page); // used only to check existence
  const distPath = join(DIST_DIR, page); // what we actually encrypt

  if (!existsSync(srcPath)) {
    console.warn(`⚠️   Skipping ${page} — not found in site/`);
    continue;
  }

  try {
    execSync(`npx staticrypt ${distPath} ${STATICRYPT_FLAGS}`, {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env },
    });
    console.log(`✅  HTML encrypted: ${page}`);
  } catch (err) {
    console.error(`❌  Failed to encrypt ${page}:`);
    console.error(err.stderr?.toString() || err.message);
    process.exit(1);
  }
}

// ── Step 2: Encrypt JSON data files inside dist/ ─────────────────────────────
// Because dist/ is rebuilt from scratch every run, the "already encrypted"
// guard below is a safety net for unusual edge cases only — in normal usage
// these files are always plaintext at this point.

const JSON_DIRS = [join(DIST_DIR, 'assets', 'data'), join(DIST_DIR, 'assets', 'content')];

async function encryptJsonFile(filePath) {
  const plaintext = readFileSync(filePath, 'utf8');

  // Guard: skip if somehow already encrypted (belt-and-suspenders)
  try {
    const parsed = JSON.parse(plaintext);
    if (parsed && parsed.encrypted === true && parsed.ciphertext) {
      console.warn(`⚠️   Already encrypted, skipping: ${relative(ROOT, filePath)}`);
      return;
    }
  } catch {
    /* not valid JSON — treat as plaintext and attempt to encrypt */
  }

  const ciphertext = await encode(plaintext, password, salt);
  writeFileSync(filePath, JSON.stringify({ encrypted: true, ciphertext }), 'utf8');
  console.log(`✅  JSON encrypted: ${relative(ROOT, filePath)}`);
}

const jsonPromises = [];
for (const dir of JSON_DIRS) {
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('.'))) {
    jsonPromises.push(encryptJsonFile(join(dir, file)));
  }
}

await Promise.all(jsonPromises);

console.log('\n🏁  Encryption complete. Deploy from dist/ — never from site/.\n');
