#!/usr/bin/env node
// @ts-check
/**
 * scripts/import-article.mjs
 *
 * Runs the article-import flow documented in TROUBLESHOOTING.md §8:
 *   0. Dedup check against site/assets/content/articles.json
 *   1. Fetch the source page
 *   2. Extract title/date/body using the site-specific SPIP selectors
 *      (Tierra y Libertad vs. Proletarios Internacionalistas)
 *   3. Clean the body (strip event handlers, logo images, SPIP markup)
 *   4. Rewrite relative src/href to absolute (TO_FIX #31)
 *   5. Validate against the same rules validate-data.mjs enforces in CI
 *   6. Write (or print, with --dry-run) the new articles.json entry
 *
 * This exists because the flow was previously prose + Python snippets in
 * TROUBLESHOOTING.md, run ad hoc by whoever did the import — which is how
 * TO_FIX #31 (relative URLs) and #32 (empty alt) both happened. Making it
 * a real script means validate-data.mjs's rules apply automatically
 * instead of depending on a human/session remembering every step.
 *
 * Extraction/cleaning logic is exported as pure functions so it can be
 * unit-tested against fixture HTML without hitting the network — see
 * test/import-article.test.mjs.
 *
 * Usage:
 *   node scripts/import-article.mjs --url <sourceUrl> --section <section> \
 *     --topics topic1,topic2 [--id custom-id] [--dry-run]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { sanitizeHtml } from '../site/js/render.mjs';
import { dewrapHardBreaks } from '../site/js/shared/dewrap.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_PATH = resolve(__dirname, '../site/assets/content/articles.json');

/**
 * @param {unknown} url
 * @returns {boolean}
 */
function isAbsoluteOrExempt(url) {
  return /^(https?:\/\/|#|mailto:)/i.test(String(url));
}

// ================================================================
// 0. Dedup
// ================================================================

/**
 * @param {{ sourceUrl: string, id?: string }} candidate
 * @param {Array<{ sourceUrl: string, id: string }>} existing
 * @param {boolean} [forceUpdate=false]
 * @returns {string | null} error message if a duplicate is found, else null
 */
export function checkDedup(candidate, existing, forceUpdate = false) {
  const sameSourceUrl = existing.some((a) => a.sourceUrl === candidate.sourceUrl);
  if (sameSourceUrl && !forceUpdate) {
    return `SKIP: sourceUrl ya está en articles.json — ${candidate.sourceUrl}`;
  }
  if (candidate.id && existing.some((a) => a.id === candidate.id && a.sourceUrl !== candidate.sourceUrl)) {
    return `SKIP: id "${candidate.id}" ya existe en articles.json`;
  }
  return null;
}

/**
 * Replaces an existing article entry when forceUpdate is enabled, otherwise
 * appends the newcomer as a new record.
 * @param {Array<{ sourceUrl: string, id: string }>} existing
 * @param {{ sourceUrl: string, id: string }} entry
 * @param {boolean} [forceUpdate=false]
 */
export function upsertArticle(existing, entry, forceUpdate = false) {
  if (!forceUpdate) return [...existing, entry];
  return [...existing.filter((a) => a.sourceUrl !== entry.sourceUrl && a.id !== entry.id), entry];
}

// ================================================================
// 1–2. Site detection + extraction
// ================================================================

/** @param {string} url @returns {'tierra' | 'pi' | 'unknown'} */
export function detectSite(url) {
  const host = (() => {
    try { return new URL(url).hostname; } catch { return ''; }
  })();
  if (host === 'www.kilombo.top' || host === 'kilombo.top' || (host.endsWith('.kilombo.top') && host !== 'proletariosinternacionalistas.kilombo.top')) {
    return 'tierra';
  }
  if (host === 'proletariosinternacionalistas.kilombo.top') return 'pi';
  return 'unknown';
}

/**
 * Extracts title/date/body from a Tierra y Libertad (or Tierra subdomain)
 * SPIP page. See TROUBLESHOOTING.md §8 for why the generic `class="texte"`
 * selector fails (it matches the sidebar too).
 * @param {string} html
 * @returns {{ title: string, date: string, bodyHtml: string, isImageOnly: boolean }}
 */
export function extractTierra(html) {
  const titleMatch = html.match(/id="titre-article"[^>]*>([^<]{3,300})/);
  const dateMatch = html.match(/id="date-article"[^>]*>[^<]*<span[^>]*>([^<]+)</);
  const bodyMatch = html.match(/id="texte-article"[^>]*>([\s\S]+?)<!-- Fin texte-article/);
  const descriptifMatch = html.match(/id="descriptif-article"[^>]*>([\s\S]+?)<\/div>/);

  const rawBody = bodyMatch ? bodyMatch[1] : '';
  const plainTextLength = rawBody.replace(/<[^>]+>/g, '').trim().length;
  const isImageOnly = plainTextLength < 200;

  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    date: dateMatch ? dateMatch[1].trim() : '',
    bodyHtml: isImageOnly && descriptifMatch ? descriptifMatch[1] : rawBody,
    isImageOnly,
  };
}

/**
 * Extracts title/body from a Proletarios Internacionalistas page. PI uses a
 * different (WordPress-like) template with no closing comment marker, so
 * the body is truncated at the next `<section id=` or `<footer`.
 * @param {string} html
 * @returns {{ title: string, bodyHtml: string, isImageOnly: boolean }}
 */
export function extractPI(html) {
  const titleMatch = html.match(/<h2[^>]+class="spip"[^>]*>([\s\S]{5,300}?)<\/h2>/);
  const bodyStart = html.search(/class="texte surlignable clearfix"/);
  let bodyHtml = '';
  if (bodyStart !== -1) {
    const afterStart = html.slice(bodyStart);
    const openTagEnd = afterStart.indexOf('>') + 1;
    const rest = afterStart.slice(openTagEnd);
    const endMatch = rest.search(/<section id=|<footer/);
    bodyHtml = endMatch === -1 ? rest : rest.slice(0, endMatch);
  }
  const plainTextLength = bodyHtml.replace(/<[^>]+>/g, '').trim().length;

  return {
    title: titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '',
    bodyHtml,
    isImageOnly: plainTextLength < 200,
  };
}

// ================================================================
// 3. Cleaning
// ================================================================

/**
 * Strips event-handler attributes (onclick=...) that some PI images carry.
 * @param {string} html
 */
export function stripEventHandlers(html) {
  return html.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
}

/**
 * Removes SPIP logo/avatar images that aren't editorial content (author
 * headshots, spip_logo thumbnails) which sometimes lead the PI body.
 * IMPORTANT: only matches on `class="spip_logo..."`, not on the image path.
 * SPIP routes *every* resized image — logos and real editorial photos alike
 * — through the same `local/cache-vignettes/...` cache path, so filtering
 * by path (as an earlier version of this function did) silently strips
 * legitimate content images too. The `spip_logo` class, by contrast, is
 * only ever applied by SPIP to logo/avatar images — verified against raw
 * scraped source: images with real editorial content never carry it, even
 * when their src is also under cache-vignettes/.
 * @param {string} html
 */
export function stripLogoImages(html) {
  return html.replace(/<img\b[^>]*\bclass=(['"])?[^'\">]*\bspip_logo\b[^'\">]*\1?[^>]*>/gi, '');
}

/**
 * Converts SPIP's lightweight markup ({{bold}}, {italic}) to real tags
 * before the allowlist reduction runs.
 * @param {string} html
 */
export function convertSpipMarkup(html) {
  return html
    .replace(/\{\{([^{}]+)\}\}/g, '<strong>$1</strong>')
    .replace(/\{([^{}]+)\}/g, '<em>$1</em>');
}

// ================================================================
// 4. Absolute-URL rewriting (TO_FIX #31)
// ================================================================

/**
 * Rewrites every relative src/href in `html` to an absolute URL resolved
 * against `sourceUrl`. Leaves already-absolute, #anchor, and mailto: URLs
 * untouched.
 * @param {string} html
 * @param {string} sourceUrl
 */
export function rewriteRelativeUrls(html, sourceUrl) {
  return html.replace(/(src|href)=(['"])([^'"]+)\2/gi, (full, attr, quote, value) => {
    if (isAbsoluteOrExempt(value)) return full;
    try {
      const absolute = new URL(value, sourceUrl).href;
      return `${attr}=${quote}${absolute}${quote}`;
    } catch {
      return full;
    }
  });
}

// ================================================================
// 3 (cont). Allowlist reduction — reuses the exact browser sanitizer
// ================================================================

/**
 * Runs contentHtml through the same sanitizeHtml() used at render time,
 * via a happy-dom shim, so what gets stored is already reduced to the
 * allowlist (P, A, STRONG, EM, ... — see site/js/render.mjs) rather than
 * relying on the browser to silently unwrap disallowed tags later.
 * @param {string} html
 */
export function reduceToAllowlist(html) {
  const window = new Window();
  const prevDocument = globalThis.document;
  // @ts-ignore - happy-dom's Document is structurally compatible for this use
  globalThis.document = window.document;
  try {
    const fragment = sanitizeHtml(html);
    const wrapper = window.document.createElement('div');
    wrapper.appendChild(fragment);
    return wrapper.innerHTML;
  } finally {
    globalThis.document = prevDocument;
  }
}

// ================================================================
// Orchestration
// ================================================================

/**
 * @param {{ url: string, section: string, topics: string[], id?: string, status?: string }} opts
 * @param {(url: string) => Promise<string>} fetchHtml injectable for testing
 * @param {Array<{ sourceUrl: string, id: string }>} existingArticles
 * @param {boolean} [forceUpdate=false]
 */
export async function buildArticleEntry(opts, fetchHtml, existingArticles, forceUpdate = false) {
  const dedupError = checkDedup({ sourceUrl: opts.url, id: opts.id }, existingArticles, forceUpdate);
  if (dedupError) throw new Error(dedupError);

  const site = detectSite(opts.url);
  if (site === 'unknown') {
    throw new Error(
      `No se reconoce el sitio de origen para ${opts.url}. ` +
      `Selectores solo definidos para Tierra y PI — ver TROUBLESHOOTING.md §8.`
    );
  }

  const html = await fetchHtml(opts.url);
  const extracted = site === 'tierra' ? extractTierra(html) : extractPI(html);

  if (!extracted.title) {
    throw new Error(
      `No se pudo extraer el título automáticamente de ${opts.url}. ` +
      `En PI, el título de series suele estar en el primer <p> del cuerpo — revisar manualmente.`
    );
  }

  let body = extracted.bodyHtml;
  body = stripEventHandlers(body);
  body = stripLogoImages(body);
  body = convertSpipMarkup(body);
  body = rewriteRelativeUrls(body, opts.url);
  body = reduceToAllowlist(body);
  // Step 3.5 (TO_FIX #46): reflow hard-wrapped <br> source text into real
  // <p> paragraphs before writing to JSON. Must run after reduceToAllowlist()
  // so it only ever sees the same plain p/br markup the sanitizer allows.
  body = dewrapHardBreaks(body);

  if (extracted.isImageOnly && !body.replace(/<[^>]+>/g, '').trim()) {
    body = `<p>${extracted.title}.</p><p>El artículo original consiste en documentos gráficos (imágenes) disponibles en la fuente original. Ver el artículo completo en el enlace de fuente.</p>`;
  }

  const id = opts.id || slugify(extracted.title);
  const status = opts.status || (extracted.isImageOnly ? 'pending-review' : 'imported');

  return {
    id,
    title: extracted.title,
    date: 'date' in extracted ? extracted.date || '' : '',
    section: opts.section,
    topics: opts.topics,
    sourceSite: site === 'tierra' ? 'Espacio Tierra y Libertad (kilombo.top)' : 'Proletarios Internacionalistas',
    sourceUrl: opts.url,
    status,
    contentHtml: body,
  };
}

/** @param {string} title */
function slugify(title) {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

// ================================================================
// CLI
// ================================================================

async function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i === -1 ? undefined : args[i + 1];
  };
  const url = get('--url');
  const section = get('--section');
  const topics = (get('--topics') || '').split(',').map((t) => t.trim()).filter(Boolean);
  const id = get('--id');
  const status = get('--status');
  const dryRun = args.includes('--dry-run');
  const forceUpdate = args.includes('--force-update');

  if (!url || !section) {
    console.error('Uso: node scripts/import-article.mjs --url <sourceUrl> --section <section> --topics a,b [--id x] [--dry-run] [--force-update]');
    process.exit(1);
  }

  const existing = JSON.parse(readFileSync(ARTICLES_PATH, 'utf-8'));

  const fetchHtml = async (u) => {
    const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${u}`);
    return res.text();
  };

  const entry = await buildArticleEntry({ url, section, topics, id, status }, fetchHtml, existing, forceUpdate);

  if (dryRun) {
    console.log(JSON.stringify(entry, null, 2));
    const action = forceUpdate ? 'actualizará' : 'añadirá';
    console.log(`\n--dry-run: no se ha escrito nada. Revisar manualmente antes de ${action} sin --dry-run.`);
    return;
  }

  const finalArticles = upsertArticle(existing, entry, forceUpdate);
  writeFileSync(ARTICLES_PATH, JSON.stringify(finalArticles, null, 2) + '\n');
  const actionLabel = forceUpdate ? 'Actualizado' : 'Añadido';
  console.log(`✅  ${actionLabel} "${entry.id}" a ${ARTICLES_PATH}`);
  console.log(`    Ejecutar 'npm test' antes de hacer commit.`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error('❌ ', err.message);
    process.exit(1);
  });
}
