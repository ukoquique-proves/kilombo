/**
 * test/import-article.test.mjs
 *
 * Unit tests for the import-article helper functions in scripts/import-article.mjs.
 * Run with: node --test test/import-article.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import {
  checkDedup,
  detectSite,
  rewriteRelativeUrls,
  stripEventHandlers,
  stripLogoImages,
  convertSpipMarkup,
} from '../scripts/import-article.mjs';

const window = new Window();
global.document = window.document;

test('checkDedup rejects duplicate sourceUrl', () => {
  const existing = [{ sourceUrl: 'https://kilombo.top/articulo1', id: 'art-1' }];
  assert.equal(
    checkDedup({ sourceUrl: 'https://kilombo.top/articulo1' }, existing),
    'SKIP: sourceUrl ya está en articles.json — https://kilombo.top/articulo1'
  );
});

test('checkDedup rejects duplicate id', () => {
  const existing = [{ sourceUrl: 'https://kilombo.top/articulo1', id: 'art-1' }];
  assert.equal(
    checkDedup({ sourceUrl: 'https://kilombo.top/articulo2', id: 'art-1' }, existing),
    'SKIP: id "art-1" ya existe en articles.json'
  );
});

test('detectSite recognizes Tierra y Libertad and PI hosts', () => {
  assert.equal(detectSite('https://kilombo.top/spip.php?article=1'), 'tierra');
  assert.equal(detectSite('https://www.kilombo.top/spip.php?article=1'), 'tierra');
  assert.equal(detectSite('https://proletariosinternacionalistas.kilombo.top/spip.php?article=2'), 'pi');
  assert.equal(detectSite('https://example.com/'), 'unknown');
});

test('rewriteRelativeUrls preserves absolute and exempt URLs and rewrites relative ones', () => {
  const html = '<a href="/foo">link</a><img src="images/x.png"><a href="#anchor">ok</a><a href="mailto:test@example.com">email</a>';
  const result = rewriteRelativeUrls(html, 'https://kilombo.top/dir/page.html');
  assert.ok(result.includes('href="https://kilombo.top/foo"'));
  assert.ok(result.includes('src="https://kilombo.top/dir/images/x.png"'));
  assert.ok(result.includes('href="#anchor"'));
  assert.ok(result.includes('href="mailto:test@example.com"'));
});

test('stripEventHandlers removes onclick attributes', () => {
  const html = '<img src="x.png" onclick="alert(1)"><div onmouseoVER="bad()">text</div>';
  assert.equal(stripEventHandlers(html), '<img src="x.png"><div>text</div>');
});

test('stripLogoImages removes SPIP logo images', () => {
  const html = '<img src="logo.png" class="spip_logo"><img src="other.png">';
  assert.equal(stripLogoImages(html), '<img src="other.png">');
});

test('convertSpipMarkup turns SPIP markup into tags', () => {
  const html = 'Hola {{bold}} y {italic}';
  assert.equal(convertSpipMarkup(html), 'Hola <strong>bold</strong> y <em>italic</em>');
});
