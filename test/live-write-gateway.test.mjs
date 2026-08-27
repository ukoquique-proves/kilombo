// test/live-write-gateway.test.mjs
//
// Two separate concerns, both about keeping the "document risks, don't
// block feature work" philosophy honest as the codebase grows:
//
//   1. Every script known to perform a live SPIP mutation must import
//      the shared gateway (scripts/lib/live-write-gateway.mjs) rather
//      than driving Playwright's final submit/click step on its own.
//      This does NOT catch a brand-new script that bypasses the gateway
//      silently — add any new mutating script to KNOWN_LIVE_WRITE_SCRIPTS
//      below when it's created, as part of that PR.
//
//   2. docs/RISK-REGISTER.json stays internally consistent: every entry
//      has the required fields, every 'affects' path actually exists,
//      and ids are unique. This is what stops "documented" from quietly
//      becoming "documented, then the file moved and nobody noticed."

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// Update this list whenever a new script is added that mutates the live
// SPIP site (i.e. drives Playwright to submit a form, change a status,
// or otherwise write to www.kilombo.top).
const KNOWN_LIVE_WRITE_SCRIPTS = [
  'scripts/create-article.mjs',
  'scripts/manage-article-status.mjs',
  'scripts/customize-escal-theme.mjs',
];

test('every known live-write script imports the shared gateway', () => {
  for (const relPath of KNOWN_LIVE_WRITE_SCRIPTS) {
    const fullPath = resolve(REPO_ROOT, relPath);
    assert.ok(existsSync(fullPath), `expected ${relPath} to exist`);
    const contents = readFileSync(fullPath, 'utf8');
    assert.match(
      contents,
      /live-write-gateway\.mjs/,
      `${relPath} must import guardedWrite from scripts/lib/live-write-gateway.mjs`
    );
  }
});

test('risk register entries have required fields', () => {
  const registryPath = resolve(REPO_ROOT, 'docs/RISK-REGISTER.json');
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

  assert.ok(Array.isArray(registry.risks), 'RISK-REGISTER.json must have a risks array');

  const requiredFields = ['id', 'title', 'status', 'severity', 'summary', 'affects', 'mitigation'];
  const validStatuses = new Set(['open', 'mitigated', 'accepted']);
  const validSeverities = new Set(['low', 'medium', 'high', 'critical']);
  const seenIds = new Set();

  for (const risk of registry.risks) {
    for (const field of requiredFields) {
      assert.ok(
        field in risk,
        `risk ${risk.id || '(missing id)'} is missing required field "${field}"`
      );
    }

    assert.ok(!seenIds.has(risk.id), `duplicate risk id: ${risk.id}`);
    seenIds.add(risk.id);

    assert.ok(
      validStatuses.has(risk.status),
      `risk ${risk.id} has invalid status "${risk.status}"`
    );
    assert.ok(
      validSeverities.has(risk.severity),
      `risk ${risk.id} has invalid severity "${risk.severity}"`
    );
    assert.ok(
      Array.isArray(risk.affects) && risk.affects.length > 0,
      `risk ${risk.id} must list at least one affected file`
    );
  }
});

test('every risk register "affects" path exists on disk', () => {
  const registryPath = resolve(REPO_ROOT, 'docs/RISK-REGISTER.json');
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

  for (const risk of registry.risks) {
    for (const relPath of risk.affects) {
      const fullPath = resolve(REPO_ROOT, relPath);
      assert.ok(
        existsSync(fullPath),
        `risk ${risk.id} lists "${relPath}" in affects, but that path does not exist`
      );
    }
  }
});
