// test/drafts-store.test.mjs
//
// Locks in two things that MUST stay true as drafts-store.mjs evolves:
//
//   (1) Every public function that accepts a user-supplied "slug" calls
//       validateSlugOrThrow() BEFORE touching the filesystem. This is our
//       main path-traversal guard — if a future refactor removes or weakens
//       that call, these tests fail loudly.
//
//   (2) Basic functional correctness of createDraft / listDrafts / listReady
//       so the read/write shapes don't silently drift from what the dashboard
//       UI expects.
//
// We write to an isolated temp directory and clean up on test exit. The
// drafts-store module resolves paths at import-time, so we patch its
// constants by monkey-patching the filesystem — simpler: each test creates
// drafts with deterministic, unique titles so slugs collide only with
// themselves, and final cleanup removes only files we own.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, unlinkSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createDraft,
  getDraft,
  listDrafts,
  updateDraft,
  approveDraft,
  listReady,
} from '../scripts/lib/drafts-store.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const IN_PROGRESS_DIR = join(REPO_ROOT, 'articulos_en_trabajo', 'IN_PROGRESS');
const READY_DIR = join(REPO_ROOT, 'articulos_en_trabajo', 'READY');

for (const d of [IN_PROGRESS_DIR, READY_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

// Slugs created by this test suite. We delete them on exit so the local
// IN_PROGRESS / READY dirs aren't polluted.
/** @type {Set<string>} */
const ownedSlugs = new Set();

function cleanOwned() {
  for (const slug of ownedSlugs) {
    for (const dir of [IN_PROGRESS_DIR, READY_DIR]) {
      const p = join(dir, `${slug}.json`);
      if (existsSync(p)) {
        try {
          unlinkSync(p);
        } catch {
          /* ignore */
        }
      }
    }
  }
}

after(cleanOwned);

// Minimal valid draft body. createDraft() pre-validates these fields, so
// every test that needs a real draft can use this + title override.
function validFields(extra = {}) {
  const title = extra.title || 'Drafts Store Smoke Test Title Default';
  return {
    title,
    contentHtml: '<p>Cuerpo de prueba válido para el test.</p>',
    section: 'actualidad',
    topics: ['prueba', 'integracion'],
    language: 'ES',
    status: 'pending-review',
    sourceSite: 'Kilombo Test Suite',
    sourceUrl: '#',
    ...extra,
  };
}

function createOwnedDraft(fields = {}) {
  const result = createDraft(validFields(fields));
  ownedSlugs.add(result.slug);
  return result;
}

// ========================================================================
// BLOCK 1 — validateSlugOrThrow integration: every slug-accepting public
//           API must throw INVALID_SLUG on dangerous or malformed input,
//           BEFORE touching filesystem state.
// ========================================================================

const PATH_TRAVERSAL_CASES = [
  { label: 'parent relative', slug: '../etc/passwd' },
  { label: 'parent relative double', slug: '../../x' },
  { label: 'slash prefix', slug: '/etc/hosts' },
  { label: 'trailing slash', slug: 'foo/' },
  { label: 'embedded slash', slug: 'foo/bar' },
  { label: 'backslash', slug: 'foo\\bar' },
  { label: 'dot only', slug: '..' },
  { label: 'dot single', slug: '.' },
  { label: 'null byte', slug: 'x\x00y' },
  { label: 'space', slug: 'hello world' },
  { label: 'uppercase', slug: 'UPPERCASE-SLUG' },
  { label: 'underscores', slug: 'snake_case_here' },
  { label: 'diacritics', slug: 'artículo-con-acentos' },
];

function assertThrowsInvalidSlug(fn, desc) {
  assert.throws(
    fn,
    (err) => {
      assert.equal(
        Object(err).code,
        'INVALID_SLUG',
        `${desc} expected { code: 'INVALID_SLUG' }, got { code: ${String(err && err.code)} }: ${String(
          err && err.message
        )}`
      );
      return true;
    },
    desc
  );
}

// ---- getDraft ----

test('getDraft() throws INVALID_SLUG on empty string', () => {
  assertThrowsInvalidSlug(() => getDraft(''), 'getDraft("")');
});

test('getDraft() throws INVALID_SLUG on non-string (null)', () => {
  assertThrowsInvalidSlug(() => getDraft(/** @type {any} */ (null)), 'getDraft(null)');
});

test('getDraft() throws INVALID_SLUG on non-string (number)', () => {
  assertThrowsInvalidSlug(() => getDraft(/** @type {any} */ (42)), 'getDraft(42)');
});

for (const c of PATH_TRAVERSAL_CASES) {
  test(`getDraft() throws INVALID_SLUG on path traversal: ${c.label} (${JSON.stringify(
    c.slug
  )})`, () => {
    assertThrowsInvalidSlug(() => getDraft(c.slug), `getDraft(${JSON.stringify(c.slug)})`);
  });
}

// ---- updateDraft ----

test('updateDraft() throws INVALID_SLUG on empty string', () => {
  assertThrowsInvalidSlug(() => updateDraft('', { notes: 'x' }), 'updateDraft("")');
});

test('updateDraft() throws INVALID_SLUG on non-string', () => {
  assertThrowsInvalidSlug(
    () => updateDraft(/** @type {any} */ (undefined), { notes: 'x' }),
    'updateDraft(undefined)'
  );
});

for (const c of PATH_TRAVERSAL_CASES) {
  test(`updateDraft() throws INVALID_SLUG on path traversal: ${c.label}`, () => {
    assertThrowsInvalidSlug(
      () => updateDraft(c.slug, { notes: 'x' }),
      `updateDraft(${JSON.stringify(c.slug)})`
    );
  });
}

// ---- approveDraft ----

test('approveDraft() throws INVALID_SLUG on empty string', () => {
  assertThrowsInvalidSlug(() => approveDraft(''), 'approveDraft("")');
});

test('approveDraft() throws INVALID_SLUG on non-string', () => {
  assertThrowsInvalidSlug(
    () => approveDraft(/** @type {any} */ ({})),
    'approveDraft({})'
  );
});

for (const c of PATH_TRAVERSAL_CASES) {
  test(`approveDraft() throws INVALID_SLUG on path traversal: ${c.label}`, () => {
    assertThrowsInvalidSlug(
      () => approveDraft(c.slug),
      `approveDraft(${JSON.stringify(c.slug)})`
    );
  });
}

// Guard against a subtle future refactor: validateSlugOrThrow requires
// slug === slugify(slug). A form that passes "Article Title" (pre-slugify)
// must NOT be accepted — that would bypass the path checks.
test('getDraft() rejects input that slugify() would change but is itself a valid slug (canonical mismatch)', () => {
  const nonCanonical = 'my-slug--with-double-hyphen';
  // We can't just use any string — it must survive the first typeof check
  // but fail the `slug !== canonical` equality. Hyphens inside are allowed
  // but double-hyphen collapse: 'my-slug--with-double-hyphen' -> 'my-slug-with-double-hyphen'
  // per slugify's `[^a-z0-9]+ -> '-' rule.
  assertThrowsInvalidSlug(
    () => getDraft(nonCanonical),
    `getDraft(${JSON.stringify(nonCanonical)}) should fail slug !== canonical check`
  );
});

test('getDraft() rejects leading hyphen (stripped by slugify = mismatch)', () => {
  assertThrowsInvalidSlug(() => getDraft('-leading-hyphen'), 'getDraft("-leading-hyphen")');
});

test('getDraft() rejects trailing hyphen (stripped by slugify = mismatch)', () => {
  assertThrowsInvalidSlug(() => getDraft('trailing-hyphen-'), 'getDraft("trailing-hyphen-")');
});

// ========================================================================
// BLOCK 2 — getDraft / updateDraft throw DRAFT_NOT_FOUND (not INVALID_SLUG)
//           on well-formed slugs that don't exist. This ensures the two
//           error codes stay correctly layered.
// ========================================================================

test('getDraft() throws DRAFT_NOT_FOUND (not INVALID_SLUG) for well-formed nonexistent slug', () => {
  assert.throws(
    () => getDraft('no-tale-slug-existe-9999999999'),
    /** @param {any} err */ (err) => {
      assert.equal(err.code, 'DRAFT_NOT_FOUND');
      return true;
    }
  );
});

test('updateDraft() throws DRAFT_NOT_FOUND for well-formed nonexistent slug', () => {
  assert.throws(
    () => updateDraft('no-tale-slug-existe-9999999999', { notes: 'x' }),
    /** @param {any} err */ (err) => {
      assert.equal(err.code, 'DRAFT_NOT_FOUND');
      return true;
    }
  );
});

test('approveDraft() throws DRAFT_NOT_FOUND for well-formed nonexistent slug', () => {
  assert.throws(
    () => approveDraft('no-tale-slug-existe-9999999999'),
    /** @param {any} err */ (err) => {
      assert.equal(err.code, 'DRAFT_NOT_FOUND');
      return true;
    }
  );
});

// ========================================================================
// BLOCK 3 — Functional: createDraft / listDrafts / getDraft return the
//           shapes the dashboard contract expects.
// ========================================================================

test('createDraft() returns { slug, path, createdAt } and writes file to IN_PROGRESS', () => {
  const r = createOwnedDraft({ title: 'Draft Store Create Smoke Test Alpha' });
  assert.ok(r.slug && typeof r.slug === 'string', 'createDraft must return string slug');
  assert.ok(/^[a-z0-9-]+$/.test(r.slug), `slug "${r.slug}" must match [a-z0-9-]+`);
  assert.ok(r.path && r.path.endsWith(`${r.slug}.json`), `path ${r.path} must end in <slug>.json`);
  assert.ok(existsSync(r.path), `${r.path} must exist on disk`);
  assert.equal(typeof r.createdAt, 'string');
  assert.ok(
    r.path.includes('IN_PROGRESS'),
    `new draft path must be in IN_PROGRESS dir, got ${r.path}`
  );
});

test('listDrafts() includes newly-created draft with expected fields', () => {
  const { slug } = createOwnedDraft({ title: 'Draft Store List Smoke Test Beta' });
  const list = listDrafts();
  const found = list.find((d) => d.slug === slug);
  assert.ok(found, `listDrafts() must include newly created slug ${slug}`);
  // Dashboard renders these fields directly — names/shapes are part of contract.
  assert.equal(typeof found.title, 'string');
  assert.equal(typeof found.date, 'string');
  assert.equal(typeof found.section, 'string');
  assert.equal(typeof found.status, 'string');
  assert.ok(Array.isArray(found.topics));
});

test('getDraft() returns draft with _location: "IN_PROGRESS" for unapproved draft', () => {
  const { slug } = createOwnedDraft({ title: 'Draft Store Get Smoke Test Gamma' });
  const d = getDraft(slug);
  assert.equal(typeof d.title, 'string');
  assert.equal(typeof d.contentHtml, 'string');
  assert.equal(d._location, 'IN_PROGRESS');
});

// ========================================================================
// BLOCK 4 — updateDraft DRAFT_ALREADY_APPROVED guard + approveDraft
//           VALIDATION_FAILED / happy path.
//
// We can't exercise VALIDATION_FAILED fully without seeding a known-bad
// draft (the validator's own tests are in validate-data.test.mjs). But we
// CAN confirm the code path exists by writing a valid IN_PROGRESS entry,
// approve it, then confirm the "already approved" error fires on update.
// ========================================================================

test('updateDraft() throws DRAFT_ALREADY_APPROVED after approveDraft() succeeds', () => {
  // Build a draft with EVERY required field filled in so approveDraft()'s
  // full validateArticleEntry() check passes — not just the createDraft()
  // pre-validate. This proves approveDraft really runs the CI rules.
  const fullFields = {
    title: 'Draft Store Approve Smoke Test Delta',
    contentHtml:
      '<p>Párrafo uno con <strong>énfasis</strong> y <em>énfasis itálico</em>. Otro <a href="https://example.com">enlace externo</a> con texto.</p><ul><li>Item A</li><li>Item B</li></ul><blockquote>Cita de prueba</blockquote><h3>Subtítulo h3</h3><p>Último párrafo para llegar a 250 palabras y cumplir la regla de longitud. Hay que escribir lo suficiente para superar el umbral mínimo del validador que revisa que los artículos tengan cuerpo sustancial y no sean meras entradas de placeholder. Agregamos más oraciones: la revolución no se televisa, se organiza en las calles y en los barrios, entre compañeros y compañeras que comparten la misma lucha por la dignidad. Seguimos sumando palabras: el internacionalismo proletario no es un lema, es una práctica concreta de solidaridad con todas las luchas del mundo trabajador, aquí y allá, sin fronteras ni banderas que nos separen de nuestra clase. Continuamos para asegurar el mínimo de contenido: cada artículo publicado en este portal debe reflejar un análisis serio y documentado, fruto del debate colectivo y del estudio riguroso, no de ocurrencias aisladas ni de consignas vacías repetidas sin comprender su sentido histórico. Concluimos este párrafo final, que ya nos lleva sin dudas muy por encima del mínimo de 250 palabras requerido por el validador.</p>',
    section: 'actualidad',
    topics: ['test', 'validacion', 'aprobacion'],
    sourceSite: 'Kilombo Cliente Dashboard',
    sourceUrl: '#',
    status: 'adapted',
    date: '2026-08-26',
    language: 'ES',
  };
  const { slug } = createOwnedDraft(fullFields);

  const approveRes = approveDraft(slug);
  assert.equal(approveRes.approved, true);
  assert.equal(approveRes.slug, slug);
  assert.ok(approveRes.path.endsWith(`${slug}.json`));
  assert.ok(
    approveRes.path.includes('READY'),
    `approved path must be in READY dir, got ${approveRes.path}`
  );
  assert.equal(approveRes.validationErrors.length, 0);

  // Approved entry must exist in READY, gone (or presence-ignored) from IN_PROGRESS:
  assert.ok(existsSync(approveRes.path), `${approveRes.path} must exist after approveDraft`);

  // Second approveDraft on same slug must hit DRAFT_ALREADY_APPROVED:
  assert.throws(
    () => approveDraft(slug),
    /** @param {any} err */ (err) => {
      assert.equal(err.code, 'DRAFT_ALREADY_APPROVED');
      return true;
    },
    'second approveDraft() throws DRAFT_ALREADY_APPROVED'
  );

  // And updateDraft must too, not DRAFT_NOT_FOUND:
  assert.throws(
    () => updateDraft(slug, { notes: 'tricky edit after approve' }),
    /** @param {any} err */ (err) => {
      assert.equal(
        err.code,
        'DRAFT_ALREADY_APPROVED',
        `updateDraft on approved slug must return DRAFT_ALREADY_APPROVED, got code=${String(err.code)}`
      );
      return true;
    }
  );
});

test('approveDraft() returns VALIDATION_FAILED when draft breaks ARTICLE_STATUS allowlist', () => {
  // preValidate() in createDraft / updateDraft is deliberately lenient
  // (doesn't check ARTICLE_STATUS from article-validator.mjs), but
  // approveDraft() runs the full CI validator and must surface every
  // violation as { code: 'VALIDATION_FAILED', validationErrors: [...] }
  // so the dashboard can render a 422 form UI.
  //
  // To hit this code path reliably we write an IN_PROGRESS JSON file
  // directly to disk with status = 'legacy' (absent from ARTICLE_STATUS).
  const slug = 'draftstore-validation-fail-' + Date.now();
  const ip = join(IN_PROGRESS_DIR, `${slug}.json`);
  ownedSlugs.add(slug);
  const entry = {
    id: slug,
    title: 'Validation Fail Fixture',
    date: '2026-08-26',
    section: 'actualidad',
    topics: ['test', 'fixture'],
    sourceSite: 'Kilombo Test Suite',
    sourceUrl: '#',
    status: 'legacy',
    contentHtml:
      '<p>Contenido de prueba más que suficiente para que el validador no encuentre problemas en la longitud del cuerpo. Añadimos muchas palabras más aquí: la organización del proletariado no se improvisa, se construye todos los días con paciencia y rigor en los barrios, en las fábricas, en los centros de estudio, en los hospitales, en cada espacio donde la clase trabajadora hace su vida cotidiana. No hay fórmulas mágicas ni atajos estratégicos; hay que leer, estudiar, debatir, equivocarse y aprender de la práctica. Cada error cometido en una asamblea, cada derrota sufrida en una negociación, cada triunfo parcial obtenido en una huelga son lecciones que nos fortalecen colectivamente si somos capaces de sistematizarlas y transmitirlas a las nuevas generaciones de militantes. Con esto ya superamos con creces cualquier umbral mínimo de palabras que el validador pueda imponer sobre el cuerpo del artículo.</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(ip, JSON.stringify(entry, null, 2) + '\n', 'utf8');

  assert.throws(
    () => approveDraft(slug),
    /** @param {any} err */ (err) => {
      assert.equal(
        err.code,
        'VALIDATION_FAILED',
        `expected VALIDATION_FAILED for status=legacy, got ${String(err.code)}: ${String(err.message)}`
      );
      assert.ok(
        Array.isArray(err.validationErrors),
        'err.validationErrors must be an array for 422 UI rendering'
      );
      assert.ok(
        err.validationErrors.length >= 1,
        'must report at least 1 validation error (status not in ARTICLE_STATUS)'
      );
      assert.match(
        err.validationErrors.join(' | '),
        /status|legacy/i,
        `one validation error must mention status/legacy, got: ${err.validationErrors.join('; ')}`
      );
      return true;
    }
  );
});

// ========================================================================
// BLOCK 5 — listReady() picks up approved drafts. This locks in the shape
//           the "Listos para Publicar" dashboard tab will consume.
// ========================================================================

test('listReady() includes approved draft with expected metadata fields', () => {
  const fullFields = {
    title: 'Draft Store ListReady Smoke Test Zeta',
    contentHtml:
      '<p>Otro artículo suficientemente largo para pasar la validación. Añadimos muchas palabras: la historia de la clase trabajadora no es la historia de héroes individuales, sino la historia de millones de personas comunes que decidieron organizarse contra la opresión. Cada huelga, cada manifestación, cada asamblea obrera, cada sindicato nacido de la lucha clandestina durante las dictaduras, cada levantamiento popular y cada victoria parcial son eslabones de una misma cadena que nos une ayer, hoy y mañana. Sin memoria histórica no hay estrategia posible, pero sin acción concreta en el presente la memoria se convierte en mera nostalgia impotente. Por eso este artículo combina recuerdo y propuesta: recordamos las derrotas para no repetirlas, celebramos las victorias para alimentar la esperanza, y construimos el programa que permita pasar de la resistencia a la ofensiva. Con esto ya superamos sin dudas el umbral de 250 palabras del validador de contenido.</p>',
    section: 'tierra',
    topics: ['test', 'listready', 'z'],
    sourceSite: 'Kilombo Cliente Dashboard',
    sourceUrl: '#',
    status: 'adapted',
    date: '2026-08-26',
    language: 'ES',
  };
  const { slug } = createOwnedDraft(fullFields);
  approveDraft(slug);

  const list = listReady();
  const found = list.find((d) => d.slug === slug);
  assert.ok(found, `listReady() must include approved slug ${slug}`);
  assert.equal(typeof found.title, 'string');
  assert.equal(typeof found.date, 'string');
  assert.equal(typeof found.section, 'string');
  assert.ok(Array.isArray(found.topics));
  // approvedAt is the extra field listReady() exposes vs listDrafts():
  assert.equal(
    typeof found.approvedAt,
    'string',
    `listReady entries must include .approvedAt string, got ${String(typeof found.approvedAt)}`
  );
  assert.ok(/\d/.test(found.approvedAt), 'approvedAt must look like a timestamp');
});
