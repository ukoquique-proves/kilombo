/**
 * site/js/shared/dewrap.mjs
 *
 * Restructures article bodies that use <br> where real paragraph markup
 * (</p><p>) belongs. extractTierra()/extractPI() in import-article.mjs
 * faithfully copy whatever structure the source SPIP page has — when the
 * source itself has none, the result renders as an unreadable wall of
 * text even after sanitizeHtml() has reduced it to allowed tags. Two
 * distinct source patterns were found across the existing content
 * (see test/dewrap.test.mjs fixtures, both taken from real articles):
 *
 *   A. "Hard-wrapped" (e.g. REPRESIÓN PLANDÉMICA 1): one <br> after every
 *      ~60–100 characters, the way text looks when pasted from a PDF —
 *      each individual line is a fragment of a sentence, not a paragraph.
 *   B. "<br>-as-paragraph-break" (e.g. PLANDEMISMO Y DOMESTICACIÓN 11):
 *      each <br>-separated segment is already several sentences long —
 *      i.e. already a well-formed paragraph, just using the wrong tag.
 *
 * Rather than branch on which case a <p> "looks like", both are handled
 * by a single rule applied per line (per <br>-separated segment):
 *
 *   - A line shorter than LONG_LINE_THRESHOLD is assumed to be a sentence
 *     fragment cut off mid-flow → joined to its neighbors with a space.
 *   - A line at-or-above LONG_LINE_THRESHOLD is assumed to already be a
 *     complete paragraph → becomes a paragraph boundary on both sides.
 *   - A run of 2+ consecutive <br> (an actual blank line in the source)
 *     is always a paragraph boundary, regardless of line length.
 *
 * Whatever comes out of that (case A produces one long joined block,
 * case B produces several already-reasonable paragraphs) is then passed
 * through a final length cap: any block still longer than
 * PARAGRAPH_TARGET_CHARS is cut at the nearest sentence boundary at or
 * after the target, so a reader never gets one 4,000-word paragraph.
 * This cap is the one "editorial" default in the module, applied
 * identically to every article — not judged per case.
 *
 * A <p> with fewer than MIN_BR_COUNT <br> is left completely untouched
 * (too little signal to safely restructure; more likely an intentional
 * line break than a formatting artifact).
 *
 * Bullet characters (•, -, "1.") are left as plain text rather than
 * reconstructed into <ul>/<li>. An earlier version of this module tried
 * to detect and rebuild lists automatically; dropped after it silently
 * absorbed the rest of an article into one <li> — the sources here use a
 * single <br> per line with *no* blank-line marker anywhere, so there is
 * no reliable signal for where a wrapped bullet item ends and the next
 * paragraph begins. Rebuilding real list markup is an editorial judgment
 * call, not a mechanical one — left for a manual pass, see
 * `docs/MIRROR_GROWING.md` §2.
 *
 * This runs *before* reduceToAllowlist() in the import pipeline (see
 * scripts/import-article.mjs), so its output is itself plain p/br markup
 * the sanitizer/allowlist has no trouble with.
 */

/** A <br>-separated line at or above this length is treated as an
 * already-complete paragraph rather than a wrapped fragment. */
const LONG_LINE_THRESHOLD = 180;
/** Minimum <br> count in a <p> before it's analyzed at all. */
const MIN_BR_COUNT = 3;
/** Target paragraph length (chars) for the final sentence-boundary cut. */
const PARAGRAPH_TARGET_CHARS = 600;

/**
 * @param {string} innerHtml  content of a single <p>...</p>
 * @returns {boolean}
 */
export function hasEnoughBreaksToAnalyze(innerHtml) {
  const brCount = (innerHtml.match(/<br\s*\/?>/gi) || []).length;
  return brCount >= MIN_BR_COUNT;
}

/**
 * Splits `text` into chunks of roughly `target` characters, breaking only
 * at a sentence boundary (. ! ? followed by whitespace + uppercase/quote)
 * at-or-after the target so words are never cut mid-sentence. Text
 * shorter than `target` is returned as a single chunk.
 * @param {string} text
 * @param {number} [target]
 * @returns {string[]}
 */
export function splitAtSentenceBoundaries(text, target = PARAGRAPH_TARGET_CHARS) {
  if (text.length <= target) return [text];

  const sentenceEnd = /[.!?]["')\]]?\s+(?=[A-ZÁÉÍÓÚÑ¿¡«"'(])/g;
  const boundaries = [0];
  let m;
  while ((m = sentenceEnd.exec(text))) boundaries.push(m.index + m[0].length);
  boundaries.push(text.length);

  const chunks = [];
  let chunkStart = 0;
  let lastBoundary = 0;
  for (const b of boundaries) {
    if (b - chunkStart >= target && lastBoundary > chunkStart) {
      chunks.push(text.slice(chunkStart, lastBoundary).trim());
      chunkStart = lastBoundary;
    }
    lastBoundary = b;
  }
  chunks.push(text.slice(chunkStart).trim());
  return chunks.filter(Boolean);
}

/**
 * Reflows a single <p>'s inner HTML into real paragraphs using the
 * per-line rule described in the module doc comment.
 * @param {string} innerHtml
 * @returns {string} one or more <p> blocks (no outer <p> wrapper)
 */
function reflowParagraph(innerHtml) {
  // A run of 2+ <br> is always a forced paragraph boundary — split on
  // those first so blank-line breaks are never merged away below.
  const blankSeparated = innerHtml.split(/(?:<br\s*\/?>\s*){2,}/i);

  /** @type {string[]} */
  const paragraphs = [];

  for (const segment of blankSeparated) {
    const lines = segment
      .split(/<br\s*\/?>\s*/i)
      .map((l) => l.trim())
      .filter(Boolean);

    let buffer = [];
    const flushBuffer = () => {
      if (buffer.length === 0) return;
      paragraphs.push(buffer.join(' ').replace(/\s+/g, ' ').trim());
      buffer = [];
    };

    for (const line of lines) {
      if (line.length >= LONG_LINE_THRESHOLD) {
        // Already a complete paragraph on its own — close whatever was
        // buffering before it, emit it standalone, and start fresh after.
        flushBuffer();
        paragraphs.push(line);
      } else {
        buffer.push(line);
      }
    }
    flushBuffer();
  }

  return paragraphs
    .filter(Boolean)
    .flatMap((p) => splitAtSentenceBoundaries(p))
    .map((chunk) => `<p>${chunk}</p>`)
    .join('');
}

/**
 * Scans `html` for <p> blocks and restructures any with enough <br> to
 * analyze. Well-formed paragraphs and <p> with only an occasional
 * (likely intentional) <br> are left untouched. Content outside <p> tags
 * (already-correct <ul>, <blockquote>, <figure>, etc.) is left untouched.
 * @param {string} html
 * @returns {string}
 */
export function dewrapHardBreaks(html) {
  return html.replace(/<p>([\s\S]*?)<\/p>/gi, (full, inner) => {
    if (!hasEnoughBreaksToAnalyze(inner)) return full;
    return reflowParagraph(inner);
  });
}
