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

const relativeUrls = [
  '/foo/bar',
  'images/pic.png',
  '../other.html',
];

test('isSafeUrl accepts safe links and rejects unsafe schemes', () => {
  for (const url of safeUrls) assert.equal(isSafeUrl(url), true, `should accept ${url}`);
  for (const url of unsafeUrls) assert.equal(isSafeUrl(url), false, `should reject ${url}`);
});

test('isAbsoluteOrExempt accepts absolute http(s), anchors and mailto', () => {
  assert.equal(isAbsoluteOrExempt('https://kilombo.top/foo'), true);
  assert.equal(isAbsoluteOrExempt('#anchor'), true);
  assert.equal(isAbsoluteOrExempt('mailto:test@example.com'), true);
  for (const url of relativeUrls) assert.equal(isAbsoluteOrExempt(url), false, `should reject relative ${url}`);
});

test('isImportableUrl rejects both unsafe and relative URLs', () => {
  assert.equal(isImportableUrl('https://kilombo.top/foo'), true);
  assert.equal(isImportableUrl('#anchor'), true);
  assert.equal(isImportableUrl('mailto:test@example.com'), true);
  for (const url of [...unsafeUrls, ...relativeUrls]) assert.equal(isImportableUrl(url), false, `should reject ${url}`);
});
