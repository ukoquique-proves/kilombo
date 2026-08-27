#!/usr/bin/env node
// @ts-check
/**
 * scripts/list-pending-review.mjs
 *
 * Generates docs/PENDING-REVIEW.md from site/assets/content/articles.json.
 *
 * WHY THIS EXISTS (see docs/TO_FIX.md and the conversation that led here):
 * docs/PENDING-REVIEW.md used to be a hand-maintained checklist, kept in
 * sync manually every time an article's `status` changed. In practice it
 * drifted: as of the audit that produced this script, articles.json had
 * 22 entries with status "pending-review" but the hand-written doc only
 * listed 8 of them — 15 had silently fallen off. The doc also duplicated,
 * word for word in places, prose that already lived in the `notes` field
 * on the article's JSON entry, giving two copies of the same fact that
 * could (and did, see docs/TO_FIX.md #30 vs the old PENDING-REVIEW.md #1)
 * drift apart.
 *
 * This script closes that gap structurally instead of procedurally:
 * articles.json (specifically each entry's `notes` field) is the only
 * place editorial problem/action notes are written. This script is a
 * pure projection of that data into a readable Markdown doc — it never
 * introduces new facts of its own, so the generated doc cannot go stale
 * relative to the data it describes as long as it's regenerated.
 *
 * USAGE:
 *   node scripts/list-pending-review.mjs           # regenerate docs/PENDING-REVIEW.md
 *   node scripts/list-pending-review.mjs --check    # exit 1 if the file on
 *                                                    # disk doesn't match what
 *                                                    # would be generated
 *                                                    # (wired into npm test)
 *
 * To update an article's pending-review notes: edit its `notes` field in
 * articles.json, then re-run this script. Do not hand-edit
 * docs/PENDING-REVIEW.md — it will be overwritten.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ARTICLES_PATH = resolve(ROOT, 'site/assets/content/articles.json');
const OUTPUT_PATH = resolve(ROOT, 'docs/PENDING-REVIEW.md');

/** Notes values that carry no real signal — don't present these as if
 * they were a documented problem. */
const GENERIC_NOTES = new Set(['convertido de markdown a json']);

/**
 * @param {string | string[] | undefined} notes
 * @returns {{ hasSpecificNotes: boolean, lines: string[] }}
 */
function normalizeNotes(notes) {
  if (!notes) return { hasSpecificNotes: false, lines: [] };
  const lines = Array.isArray(notes) ? notes : [notes];
  const hasSpecificNotes = lines.some((n) => !GENERIC_NOTES.has(String(n).trim().toLowerCase()));
  return { hasSpecificNotes, lines };
}

/**
 * @param {object} article
 * @param {number} index
 * @returns {string}
 */
function renderEntry(article, index) {
  const { id, title, sourceUrl, sourceSite, section, topics } = article;
  const { hasSpecificNotes, lines } = normalizeNotes(article.notes);

  const notesBlock = hasSpecificNotes
    ? lines.map((n) => `- ${n}`).join('\n')
    : '- Sin problema específico registrado en `notes`. Pendiente de revisión editorial general (verificar contenido, fuente y encaje temático antes de cambiar `status` a `imported`).';

  return `## ${index}. ${title}

| Campo | Valor |
|---|---|
| **id** | \`${id}\` |
| **Fuente** | ${sourceSite ? `${sourceSite} — ` : ''}${sourceUrl && sourceUrl !== '#' ? sourceUrl : '_(sin fuente externa — contenido de autoría propia)_'} |
| **Sección** | \`${section}\` |
| **Temas** | ${topics && topics.length ? topics.join(', ') : '_(ninguno)_'} |

**Notas:**

${notesBlock}
`;
}

function generateMarkdown(articles) {
  const pending = articles.filter((a) => a.status === 'pending-review');

  const header = `# PENDING-REVIEW — Artículos que requieren atención manual

> ⚠️ **Este archivo se genera automáticamente. No editar a mano.**
> Fuente única de verdad: el campo \`notes\` de cada artículo en
> \`site/assets/content/articles.json\`. Para actualizar una entrada, edita
> \`notes\` ahí y vuelve a correr:
>
>     node scripts/list-pending-review.mjs
>
> Este archivo se regenera automáticamente y se compara contra el estado
> real en cada \`npm test\` (ver \`scripts/test.sh\`), así que no puede
> quedar desincronizado del dato real sin que el build falle.

Cada artículo listado aquí tiene \`status: "pending-review"\` en \`site/assets/content/articles.json\`.
El contenido que se muestra en el portal puede ser un stub incompleto o un texto completo aún sin
aprobación editorial final — revisar cada caso antes de asumir cuál es.

---

`;

  const body = pending.map((a, i) => renderEntry(a, i + 1)).join('\n---\n\n');

  const summaryRows = pending
    .map((a) => {
      const { hasSpecificNotes, lines } = normalizeNotes(a.notes);
      const summary = hasSpecificNotes
        ? String(lines[0])
            .replace(/^PENDIENTE:\s*/, '')
            .slice(0, 80) + (String(lines[0]).length > 80 ? '…' : '')
        : 'Revisión editorial general (sin problema específico registrado)';
      return `| \`${a.id}\` | \`${a.section}\` | ${summary} |`;
    })
    .join('\n');

  const summary = `\n## Resumen de estado (${pending.length} artículo${pending.length === 1 ? '' : 's'})

| id | sección | nota |
|---|---|---|
${summaryRows}
`;

  return header + body + '\n---\n' + summary;
}

function main() {
  const check = process.argv.includes('--check');

  const articles = JSON.parse(readFileSync(ARTICLES_PATH, 'utf-8'));
  const generated = generateMarkdown(articles);

  if (check) {
    if (!existsSync(OUTPUT_PATH)) {
      console.error(`❌ ${OUTPUT_PATH} does not exist. Run: node scripts/list-pending-review.mjs`);
      process.exit(1);
    }
    const current = readFileSync(OUTPUT_PATH, 'utf-8');
    if (current !== generated) {
      console.error(
        '❌ docs/PENDING-REVIEW.md is out of date with articles.json.\n' +
          '   Run: node scripts/list-pending-review.mjs\n' +
          '   (then commit the updated file)'
      );
      process.exit(1);
    }
    console.log('✅ docs/PENDING-REVIEW.md is up to date with articles.json.');
    return;
  }

  writeFileSync(OUTPUT_PATH, generated);
  const pendingCount = articles.filter((a) => a.status === 'pending-review').length;
  console.log(`✅ docs/PENDING-REVIEW.md regenerated — ${pendingCount} pending-review article(s).`);
}

main();
