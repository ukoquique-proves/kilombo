/**
 * test/url-safety.test.mjs
 *
 * Ensures the shared URL rules stay consistent across render and validation.
 * Run with: node --test test/url-safety.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafeUrl, isAbsoluteOrExempt, isImportableUrl } from '../site/js/shared/url-safety.mjs';

const safeUrls = [
  'https://kilombo.top/foo',
  'http://example.com/bar',
  '#anchor',
  'mailto:test@example.com',
];

const unsafeUrls = [
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox("hi")',
];

// Browsers strip control characters (tab, newline, CR) from *anywhere* in
// a URL before parsing its scheme — not just leading whitespace — so
// these all resolve to a plain "javascript:" URL at render time. A
// scheme check that only trims a leading \s* misses them.
const controlCharBypassUrls = [
  'jav\tascript:alert(1)',
  'java\nscript:alert(1)',
  'javascript\r:alert(1)',
  'j\ta\nv\ra\tscript:alert(1)',
  '\tjavascript:alert(1)',
];

const relativeUrls = [
  '/foo/bar',
  'images/pic.png',
  '../other.html',
];

// Local asset paths under assets/ are exempt — they resolve correctly
// relative to every page in the site (all pages are at root level).
const localAssetUrls = [
  'assets/images/futuras-generaciones.jpg',
  'assets/audios/grabacion.mp3',
];

test('isSafeUrl accepts safe links and rejects unsafe schemes', () => {
  for (const url of safeUrls) assert.equal(isSafeUrl(url), true, `should accept ${url}`);
  for (const url of unsafeUrls) assert.equal(isSafeUrl(url), false, `should reject ${url}`);
});

test('isAbsoluteOrExempt accepts absolute http(s), anchors, mailto and local assets/', () => {
  assert.equal(isAbsoluteOrExempt('https://kilombo.top/foo'), true);
  assert.equal(isAbsoluteOrExempt('#anchor'), true);
  assert.equal(isAbsoluteOrExempt('mailto:test@example.com'), true);
  for (const url of localAssetUrls) assert.equal(isAbsoluteOrExempt(url), true, `should accept local asset ${url}`);
  for (const url of relativeUrls) assert.equal(isAbsoluteOrExempt(url), false, `should reject relative ${url}`);
});

test('isImportableUrl rejects both unsafe and relative URLs', () => {
  assert.equal(isImportableUrl('https://kilombo.top/foo'), true);
  assert.equal(isImportableUrl('#anchor'), true);
  assert.equal(isImportableUrl('mailto:test@example.com'), true);
  for (const url of [...unsafeUrls, ...relativeUrls]) assert.equal(isImportableUrl(url), false, `should reject ${url}`);
});

test('isSafeUrl rejects control-character scheme bypass (tab/newline/CR)', () => {
  for (const url of controlCharBypassUrls) {
    assert.equal(isSafeUrl(url), false, `should reject ${JSON.stringify(url)}`);
  }
});
