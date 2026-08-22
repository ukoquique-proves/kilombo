#!/usr/bin/env node
// @ts-check
/**
 * scripts/detect-fixed-column-corruption.mjs
 *
 * Detects a specific class of content corruption found in two articles:
 * contentHtml with embedded newlines that break words/phrases at fixed
 * column boundaries (e.g. 60-80 characters), rather than at logical
 * sentence/paragraph boundaries.
 *
 * Pattern indicators:
 * - Literal \n characters inside <p> tags (not just between tags)
 * - Line breaks that occur mid-word or mid-phrase
 * - Consistent column width suggesting fixed-width export
 *
 * This was NOT caught by validate-data.mjs (which only flags <br>-based
 * hard-wraps) nor by dewrap.mjs (which only operates on <p> content,
 * not on embedded newlines). It's a separate corruption class that appears
 * to stem from copy-paste or JSON stringification of pre-wrapped text.
 *
 * Usage:
 *   node scripts/detect-fixed-column-corruption.mjs [--fix]
 *
 * --fix flag will attempt to repair by removing embedded newlines
 * (one-time use; created during investigation, can be deleted after repair).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_PATH = resolve(__dirname, '../site/assets/content/articles.json');

/**
 * Detects lines that are broken by embedded newlines at fixed boundaries.
 * Looks for the pattern: newline character appears consistently at column N,
 * breaking mid-word or mid-phrase (not at sentence boundaries).
 *
 * @param {string} html
 * @returns {{ found: boolean, lineCount: number, avgLineLength: number, examples: string[] }}
 */
export function detectFixedColumnCorruption(html) {
  // Extract all text that appears inside <p> tags that contains a real
  // embedded newline character. NOTE: after JSON.parse(), a JSON \n escape
  // decodes to an actual newline (charCode 10) in the JS string — so this
  // must match on /\n/ (a real newline), not /\\n/ (the two literal
  // characters backslash+n). The previous /\\n/ pattern never matched any
  // real corrupted content and always reported "0 articles affected".
  const pTagMatches = html.match(/<p>([^<]*\n[^<]*)<\/p>/g) || [];

  if (pTagMatches.length === 0) {
    return { found: false, lineCount: 0, avgLineLength: 0, examples: [] };
  }

  const allLines = [];
  const examples = [];

  for (const match of pTagMatches) {
    // Extract text content between <p> and </p>
    const textContent = match.replace(/<p>|<\/p>/g, '');
    if (textContent.includes('\n')) {
      const lines = textContent.split('\n');
      allLines.push(...lines);
      examples.push(...lines.slice(0, 3)); // First few lines as examples
    }
  }

  if (allLines.length === 0) {
    return { found: false, lineCount: 0, avgLineLength: 0, examples: [] };
  }

  const avgLineLength = allLines.reduce((sum, line) => sum + line.length, 0) / allLines.length;
  const minLen = Math.min(...allLines.map((l) => l.length));
  const maxLen = Math.max(...allLines.map((l) => l.length));

  // Heuristic: if avg line length is consistent (std dev < avg * 0.3) and
  // falls in the 60-100 char range, it's likely fixed-column wrapping
  const isFixedColumn =
    avgLineLength >= 50 && avgLineLength <= 100 && maxLen - minLen < avgLineLength * 0.4;

  return {
    found: isFixedColumn,
    lineCount: allLines.length,
    avgLineLength: Math.round(avgLineLength * 10) / 10,
    examples: examples.slice(0, 5).map((l) => l.substring(0, 80) + (l.length > 80 ? '…' : '')),
  };
}

/**
 * Repairs fixed-column corruption by removing embedded newlines.
 * Joins lines with a space unless they form a phrase boundary.
 *
 * @param {string} html
 * @returns {string}
 */
export function repairFixedColumnCorruption(html) {
  // Replace all \n characters inside <p> tags with spaces
  // This is a simple repair; a more sophisticated approach would preserve
  // paragraph breaks if they occurred at blank lines, but this corpus
  // doesn't have those markers.
  return html.replace(/<p>([^<]*)<\/p>/g, (match, content) => {
    const cleaned = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    return `<p>${cleaned}</p>`;
  });
}

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');

  const articles = JSON.parse(readFileSync(ARTICLES_PATH, 'utf-8'));

  console.log('Scanning articles.json for fixed-column corruption…\n');

  let corruptedCount = 0;
  const corruptedArticles = [];

  for (const article of articles) {
    const result = detectFixedColumnCorruption(article.contentHtml);
    if (result.found) {
      corruptedCount++;
      corruptedArticles.push(article);
      console.log(`⚠️  ${article.id}`);
      console.log(`    Lines with embedded \\n: ${result.lineCount}`);
      console.log(`    Avg line length: ${result.avgLineLength} chars`);
      console.log(`    Examples:`);
      result.examples.forEach((ex) => console.log(`      "${ex}"`));
      console.log();
    }
  }

  if (corruptedCount === 0) {
    console.log('✅ No fixed-column corruption detected.');
    return;
  }

  console.log(`Found ${corruptedCount} article(s) with fixed-column corruption.`);

  if (shouldFix) {
    console.log('\nAttempting repair (--fix flag)…');
    for (const article of corruptedArticles) {
      article.contentHtml = repairFixedColumnCorruption(article.contentHtml);
    }
    writeFileSync(ARTICLES_PATH, JSON.stringify(articles, null, 2) + '\n');
    console.log(`✅ Repaired ${corruptedCount} article(s). Run 'npm test' to validate.`);
  } else {
    console.log('\nTo repair, run: node scripts/detect-fixed-column-corruption.mjs --fix');
  }
}

// Guarded like the other CLI scripts in scripts/ (import-article.mjs,
// i18n-coverage.mjs) so importing this module — e.g. from a test file —
// doesn't immediately scan (or, with --fix, overwrite) the real
// articles.json as a side effect of the import itself.
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}
