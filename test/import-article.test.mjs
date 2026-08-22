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
  checkFinalIdCollision,
  detectSite,
  extractTierra,
  rewriteRelativeUrls,
  stripEventHandlers,
  stripLogoImages,
  convertSpipMarkup,
  upsertArticle,
  buildArticleEntry,
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
  assert.equal(
    checkDedup({ sourceUrl: 'https://kilombo.top/articulo1', id: 'art-2' }, existing, true),
    null
  );
});

test('checkFinalIdCollision — returns null when no collision exists', () => {
  const existing = [{ id: 'existing-article', sourceUrl: 'https://example.com/1' }];
  assert.equal(checkFinalIdCollision('new-article', 'https://example.com/2', existing), null);
});

test('checkFinalIdCollision — returns error when auto-slugified id collides with different sourceUrl', () => {
  const existing = [{ id: 'titulo-articulo', sourceUrl: 'https://example.com/1' }];
  const result = checkFinalIdCollision('titulo-articulo', 'https://example.com/2', existing);
  assert.ok(result !== null);
  assert.ok(result.includes('titulo-articulo'));
  assert.ok(result.includes('--id'));
});

test('checkFinalIdCollision — returns null when forceUpdate is true even with collision', () => {
  const existing = [{ id: 'titulo-articulo', sourceUrl: 'https://example.com/1' }];
  assert.equal(
    checkFinalIdCollision('titulo-articulo', 'https://example.com/2', existing, true),
    null
  );
});

test('buildArticleEntry throws when auto-slugified id collides with existing article', async () => {
  const mockHtml = `
    <div id="titre-article">Título Artículo</div>
    <div id="texte-article"><p>Contenido suficiente para no ser image-only.</p></div>
  `;
  const fetchHtml = async () => mockHtml;
  const existing = [
    { id: 'titulo-articulo', sourceUrl: 'https://www.kilombo.top/spip.php?article99' },
  ];
  await assert.rejects(
    () =>
      buildArticleEntry(
        { url: 'https://www.kilombo.top/spip.php?article100', section: 'tierra', topics: [] },
        fetchHtml,
        existing
      ),
    /titulo-articulo/
  );
});

test('upsertArticle replaces the matching existing entry when forceUpdate is enabled', () => {
  const existing = [
    { sourceUrl: 'https://kilombo.top/articulo1', id: 'art-1', title: 'Old' },
    { sourceUrl: 'https://kilombo.top/articulo2', id: 'art-2', title: 'Other' },
  ];
  const updated = upsertArticle(
    existing,
    { sourceUrl: 'https://kilombo.top/articulo1', id: 'art-1', title: 'New' },
    true
  );
  assert.equal(updated.length, 2);
  assert.equal(
    updated.find((article) => article.sourceUrl === 'https://kilombo.top/articulo1')?.title,
    'New'
  );
});

test('detectSite recognizes Tierra y Libertad and PI hosts', () => {
  assert.equal(detectSite('https://kilombo.top/spip.php?article=1'), 'tierra');
  assert.equal(detectSite('https://www.kilombo.top/spip.php?article=1'), 'tierra');
  assert.equal(
    detectSite('https://proletariosinternacionalistas.kilombo.top/spip.php?article=2'),
    'pi'
  );
  assert.equal(detectSite('https://example.com/'), 'unknown');
});

test('detectSite recognizes GCI subdomains as "gci", not "tierra" (TO_FIX #61)', () => {
  assert.equal(detectSite('https://icg-gci.kilombo.top/spip.php?article=1'), 'gci');
  assert.equal(detectSite('https://in.kilombo.top/spip.php?article=1'), 'gci-in');
  assert.equal(detectSite('https://cdrom.kilombo.top/spip.php?article=1'), 'gci-static');
  assert.equal(detectSite('https://icg-old.kilombo.top/spip.php?article=1'), 'gci-static');
});

test('buildArticleEntry rejects GCI hosts loudly instead of silently misextracting via extractTierra (TO_FIX #61)', async () => {
  const fetchHtml = async () => '<html><body>should never be fetched</body></html>';
  // icg-gci: SPIP official site
  await assert.rejects(
    () =>
      buildArticleEntry(
        { url: 'https://icg-gci.kilombo.top/spip.php?article=1', section: 'gci', topics: [] },
        fetchHtml,
        []
      ),
    /extractGCI|no existe todavía/i
  );
  // in.kilombo.top: separate multilingual SPIP
  await assert.rejects(
    () =>
      buildArticleEntry(
        { url: 'https://in.kilombo.top/spip.php?article=1', section: 'gci', topics: [] },
        fetchHtml,
        []
      ),
    /extracto|spip__3/i
  );
  // cdrom: static webapp, not SPIP
  await assert.rejects(
    () =>
      buildArticleEntry(
        { url: 'https://cdrom.kilombo.top/page.html', section: 'gci', topics: [] },
        fetchHtml,
        []
      ),
    /webapp estática|my_webapp/i
  );
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
  const html =
    '<a href="/foo">link</a><img src="images/x.png"><a href="#anchor">ok</a><a href="mailto:test@example.com">email</a>';
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

test('extractTierra extracts date using id="date-article" (original regex)', () => {
  const html = `
    <div id="date-article"><span>15 de agosto de 2021</span></div>
    <div id="texte-article"><p>Body</p></div>
  `;
  const extracted = extractTierra(html);
  assert.equal(extracted.date, '15 de agosto de 2021');
});

test('extractTierra extracts date using class="date-article" (new regex variant, Gap 2 fix)', () => {
  const html = `
    <div class="date-article">Artículo puesto en línea el <span class="majuscules">8 de junio de 2021</span></div>
    <div id="texte-article"><p>Body</p></div>
  `;
  const extracted = extractTierra(html);
  assert.equal(extracted.date, '8 de junio de 2021');
});

test('extractTierra detects unextracted portfolio images (Gap 1 fix)', () => {
  const html = `
    <div id="titre-article">Test Article</div>
    <div id="texte-article">
      <p>Simple text with <a href="doc.pdf">PDF link</a></p>
    </div>
    <div class="portfolio">
      <img src="image-1.jpg" alt="">
      <img src="image-2.jpg" alt="">
      <img src="image-3.jpg" alt="">
    </div>
  `;
  const extracted = extractTierra(html);
  assert.ok(extracted.unextractedMediaWarning);
  assert.match(extracted.unextractedMediaWarning, /3 imágenes de galería/);
});

test('extractTierra detects document link with insufficient context text (Gap 1 fix)', () => {
  const html = `
    <div id="titre-article">Document Article</div>
    <div id="texte-article">
      <p><a href="document.pdf">Descargar</a></p>
    </div>
  `;
  const extracted = extractTierra(html);
  assert.ok(extracted.unextractedMediaWarning);
  assert.match(extracted.unextractedMediaWarning, /enlace a descarga/);
});

test('extractTierra does NOT flag unextracted media for articles with substantial context', () => {
  const html = `
    <div id="titre-article">Normal Article</div>
    <div id="texte-article">
      <p>This is a substantial article with lots of real text content that provides context.</p>
      <p>Multiple paragraphs ensure enough text is extracted to justify any attached PDF or media.</p>
      <p><a href="supplementary.pdf">Ver documento completo</a> para más detalles.</p>
    </div>
  `;
  const extracted = extractTierra(html);
  assert.ok(!extracted.unextractedMediaWarning);
});
