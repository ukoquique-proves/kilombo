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
  extractTierra,
  rewriteRelativeUrls,
  stripEventHandlers,
  stripLogoImages,
  convertSpipMarkup,
  upsertArticle,
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

test('checkDedup allows same sourceUrl replacement when forceUpdate is true', () => {
  const existing = [{ sourceUrl: 'https://kilombo.top/articulo1', id: 'art-1' }];
  assert.equal(checkDedup({ sourceUrl: 'https://kilombo.top/articulo1', id: 'art-2' }, existing, true), null);
});

test('upsertArticle replaces the matching existing entry when forceUpdate is enabled', () => {
  const existing = [
    { sourceUrl: 'https://kilombo.top/articulo1', id: 'art-1', title: 'Old' },
    { sourceUrl: 'https://kilombo.top/articulo2', id: 'art-2', title: 'Other' },
  ];
  const updated = upsertArticle(existing, { sourceUrl: 'https://kilombo.top/articulo1', id: 'art-1', title: 'New' }, true);
  assert.equal(updated.length, 2);
  assert.equal(updated.find((article) => article.sourceUrl === 'https://kilombo.top/articulo1')?.title, 'New');
});

test('detectSite recognizes Tierra y Libertad and PI hosts', () => {
  assert.equal(detectSite('https://kilombo.top/spip.php?article=1'), 'tierra');
  assert.equal(detectSite('https://www.kilombo.top/spip.php?article=1'), 'tierra');
  assert.equal(detectSite('https://proletariosinternacionalistas.kilombo.top/spip.php?article=2'), 'pi');
  assert.equal(detectSite('https://example.com/'), 'unknown');
});

test('extractTierra does not treat a short link paragraph as image-only content', () => {
  const html = `
    <div id="texte-article" class="surlignable">
      <div class="">
        <p><a href="https://youtu.be/icuIeOoU_3k" target="_blank">Quilombo película</a></p>
      </div>
    </div>
  `;
  const extracted = extractTierra(html);
  assert.equal(extracted.isImageOnly, false);
  assert.match(extracted.bodyHtml, /https:\/\/youtu\.be\/icuIeOoU_3k/);
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

test('stripLogoImages removes SPIP logo images (class attr with single or double quotes)', () => {
  const html = '<img src="logo.png" class="spip_logo"><img src="other.png">';
  assert.equal(stripLogoImages(html), '<img src="other.png">');

  const htmlSingleQuoted =
    "<img src='local/cache-vignettes/L150xH113/foo.jpg' width='150' height='113' alt='' class='spip_logo spip_logos' /><img src='other.png'>";
  assert.equal(stripLogoImages(htmlSingleQuoted), "<img src='other.png'>");
});

test('stripLogoImages keeps real content images served from cache-vignettes (regression: TO_FIX, previously stripped by path alone)', () => {
  // Real editorial photos are resized through the same cache-vignettes/
  // path as logos, but never carry the spip_logo class — confirmed against
  // raw scraped SPIP source (article-20.html, article-22.html).
  const html =
    "<p>Texto del artículo.</p><img src='local/cache-vignettes/L400xH589/basta_sp-pretexto.jpg-84cb2.jpg?1743630305' width='400' height='589' alt='' /><p>Más texto.</p>";
  assert.equal(stripLogoImages(html), html);
});

test('convertSpipMarkup turns SPIP markup into tags', () => {
  const html = 'Hola {{bold}} y {italic}';
  assert.equal(convertSpipMarkup(html), 'Hola <strong>bold</strong> y <em>italic</em>');
});
