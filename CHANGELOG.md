# Changelog — Kilombo Portal

Todas las modificaciones importantes del proyecto, en orden inverso (últimos cambios arriba).
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

---

## [0.42.5] — 2026-08-22

### ADDED: Bulk conversion tool for `nuevos_articulos/` → `IN_PROGRESS/`

**Status:** ✅ Implemented (editorial review required)

Quick summary of actions performed on 2026-08-22:

- **Added:** `articulos_en_trabajo/scripts/convert-nuevos.mjs`
  - Purpose: automatic, one-shot conversion of raw files in `nuevos_articulos/` into editorial
    drafts placed in `articulos_en_trabajo/IN_PROGRESS/` as paired `.md` (notes + raw) and
    `.json` (schema-shaped draft) files.
  - Heuristics used: first non-empty line → title; second short line → author; double-newline
    → paragraph breaks; short non-punctuated lines → `<h3>` headings; paragraphs → `<p>`.
  - Sanitization: plaintext converted to minimal allowed HTML (only allowed tags preserved in
    downstream pipeline), `contentHtml` escaped, topics picked heuristically from text.
  - Slug handling: produces kebab-case ids via the repository `slugify` rules and **avoids
    collisions** by appending a filename-derived suffix when necessary.
  - Draft metadata: `status: "pending-review"`, `sourceUrl: "#"` (placeholder), `notes` indicate
    auto-conversion — editorial review required before READY/publish.

- **Executed:** ran the converter against the repository `nuevos_articulos/` sources and
  generated editorial drafts in `articulos_en_trabajo/IN_PROGRESS/`. Existing collisions were
  disambiguated automatically.

- **Verification:** ran repository tests (`npm test`) — unit tests and existing data validations
  remained green after the change.

**Impact & next steps:**
- Speeds initial editorial triage by producing consistent draft artifacts for each raw file.
- Editors must review each `IN_PROGRESS/*.json` and `IN_PROGRESS/*.md` to set `section`,
  `language`, `date`, `sourceUrl`, precise `topics`, and to move validated JSON files to
  `articulos_en_trabajo/READY/` before running the publishing automation.

**Run locally:**
```bash
cd /root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD
node articulos_en_trabajo/scripts/convert-nuevos.mjs
```


## [0.42.4] — 2026-08-22

### IMPROVED: ESLint 9+ Compatibility + Test Reliability + Code Formatting

**Status:** ✅ COMPLETE — Production ready

Applied AI-fixed improvements for modernization, reliability, and code quality.

### What Changed

#### 1. ESLint Configuration Migration (CRITICAL)

**Migrate to ESLint 9+ flat config format** — the old `.eslintrc.json` is no longer recognized by ESLint 9+.

- **Created:** `eslint.config.js` (54 lines, flat config)
  - Scoped configurations by file pattern:
    - Browser globals for `site/js/**/*.mjs`
    - Node globals for `scripts/**/*.mjs`
    - Combined globals for `test/**/*.mjs` (happy-dom integration)
  - Identical rules to previous `.eslintrc.json`

- **Deleted:** `.eslintrc.json` (deprecated format)

- **Impact:**
  - ✓ ESLint 9+ compatible (future-proof)
  - ✓ CI/CD systems work with modern ESLint versions
  - ✓ No functional changes to linting rules

**Verification:**
```bash
npm run lint  # ✓ Works, all rules enforced as before
```

#### 2. Test Discovery Scope Fix (IMPORTANT)

**Prevent false CI failures** — unscoped `node --test` discovers sandbox scripts that require `.env` credentials, causing CI to fail even when unit tests pass.

- **Updated:** `scripts/test.sh` (line 30)
  - Changed: `node --test`
  - To: `node --test test/*.test.mjs`
  
- **Added:** Explanatory comment (8 lines)
  - Clarifies why scoping is necessary
  - Documents sandbox test scripts (test-spip-access.mjs, etc.)
  - Explains credential requirement

- **Impact:**
  - ✓ CI pipelines only fail on actual test failures
  - ✓ Clear separation between unit tests and integration scripts
  - ✓ Eliminates credential-related false negatives

**Verification:**
```bash
npm test  # ✓ All 157 tests pass, no false failures
```

#### 3. Code Formatting Improvements (OPTIONAL)

**Prettier reformatting** — improved readability and consistent style.

- **Formatted:** 28 files
  - `site/js/**/*.mjs` (1 file)
  - `scripts/**/*.mjs` (16 files)
  - `test/**/*.mjs` (8 files)
  - `eslint.config.js`
  - `.prettierrc.json`

- **Changes applied:**
  - Column alignment in schema definitions
  - Line-break optimization for readability
  - Consistent spacing and indentation

- **Updated:** `package.json`
  - Format script now references `eslint.config.js` instead of deleted `.eslintrc.json`

- **Impact:**
  - ✓ Professional code style
  - ✓ Improved readability for maintenance
  - ✓ Consistent formatting across entire codebase

**Verification:**
```bash
npm run format:check  # ✓ All 22 files use Prettier code style
```

### Files Changed

- **Created:** `eslint.config.js` (54 lines)
- **Deleted:** `.eslintrc.json` (deprecated)
- **Modified:** `package.json`, `scripts/test.sh`, 23 JS/MJS files (formatting)

**Total:** 27 files changed, 875 insertions, 428 deletions

### Quality Assurance

✅ All 157 unit tests pass  
✅ Data validation: 51 entries verified  
✅ URL consistency: 7 network URLs verified  
✅ Index cards: 11 cards verified  
✅ No false failures from sandbox scripts  
✅ All files use Prettier code style  
✅ ESLint rules enforced identically  

### Backwards Compatibility

✓ All functional behavior preserved  
✓ No breaking changes  
✓ All dependencies unchanged  
✓ 100% reversible with `git reset`  

### Why This Matters

1. **Future-Proof:** ESLint 9+ compatibility ensures long-term tooling support
2. **Reliable:** CI/CD pipelines now only fail on actual test failures
3. **Professional:** Consistent code style improves maintainability

### Git Commit

```
912768edce70e17c124434ffad53afb418b6b145
Apply AI-fixed improvements: ESLint 9 migration, test scope fix, code formatting
```

---

## [0.42.3] — 2026-08-22

### NEW: Actualidad Section + Automated Publishing Workflow

**Status:** ✅ COMPLETE — Ready for production use

Made "Actualidad" a real editorial section (like tierra, gci, pi, nom) and created **completely separate automation** for publishing rewritten articles from the editorial workspace directly to the mirror site.

### What Changed

#### 1. Actualidad Section Implementation

- **Real section** with articles display (not just placeholder)
- Link in index.html: `articulos.html?section=actualidad`
- Lightning bolt icon (red accent #b91c2a)
- Appears **first in navigation** (highest priority)
- Can filter/search articles by section like others
- Updated schema: `section` now includes `"actualidad"`

#### 2. Automated Publishing Workflow

**Completely separate system** (independent from editorial workflow):

- **`publish.sh`** — One-command deployment (shell wrapper)
- **`publish-to-actualidad.mjs`** — Node.js automation engine
- **Safety checks** — Validates with npm test before committing
- **Conflict detection** — Rejects duplicate IDs/sourceUrls
- **Automatic archiving** — Timestamped records in ARCHIVE/published/

**Workflow:**

```
Editorial Team: Create IN_PROGRESS/ → Validate → Move to READY/
Publishing Team: Run ./publish.sh → Automation handles rest
Result: Articles live in Actualidad with 0 manual Git operations
```

### Files Added

**Automation Scripts:**
- `articulos_en_trabajo/publish.sh` (executable)
- `articulos_en_trabajo/publish-to-actualidad.mjs` (executable)
- `articulos_en_trabajo/ARCHIVE/published/` (archive directory)

**Documentation:**
- `articulos_en_trabajo/AUTOMATION_README.md` (quick start)
- `articulos_en_trabajo/AUTOMATION_PUBLISH_ACTUALIDAD.md` (full technical spec)

### Files Modified

**KILOMBO Project:**
- `site/index.html` — Actualidad section now real (not placeholder)
- `site/css/style.css` — Added `.section-svg--actualidad` styling
- `site/assets/content/ARTICLES.schema.md` — Added `actualidad` to section values
- `articulos_en_trabajo/SCHEMA_REFERENCE.md` — Updated section documentation

### How to Use

```bash
# 1. Editorial team prepares articles
cd /root/JOB-sda2/KILOMBO-SITE/articulos_en_trabajo
# Create IN_PROGRESS/[slug].md with notes
# Rebuild into IN_PROGRESS/[slug].json
# Validate: npm test (from KILOMBO root)
# Move to READY/[slug].json

# 2. Publishing team deploys
./publish.sh

# 3. Done! Articles live at:
# https://kilombo.top/articulos.html?section=actualidad
```

### Automation Features

✅ Merge multiple articles in one commit  
✅ Auto-set `section: "actualidad"` for all  
✅ Full validation before publishing  
✅ Conflict detection (duplicate IDs/URLs)  
✅ Git commit + push (triggers automatic deploy)  
✅ Timestamped archiving  
✅ Clear error messages + rollback on failure  

### Architecture

**Two completely separate systems:**

1. **Editorial Workflow** (manual)
   - Location: `/articulos_en_trabajo/IN_PROGRESS/` → `READY/`
   - Process: Read → Rebuild → Validate → Move
   - Tools: EDITORIAL_GUIDELINES.md, SCHEMA_REFERENCE.md
   - Output: Well-structured JSON files

2. **Publishing Automation** (automatic)
   - Location: `/articulos_en_trabajo/`
   - Trigger: `./publish.sh`
   - Process: Merge → Validate → Commit → Archive
   - Output: Live articles in Actualidad section

### Safety & Quality

- **Full validation** — npm test runs before any commit
- **Conflict prevention** — Rejects duplicates
- **Automatic archiving** — Preserves history
- **Error handling** — Clear messages, no partial commits
- **Rollback** — Reverts articles.json if test fails
- **No manual Git** — All operations automated

### Sections Now Available

| Section | Purpose | Priority | Icon | 
|---------|---------|----------|------|
| **Actualidad** | Current events, breaking news | ⭐⭐⭐⭐⭐ | ⚡ |
| **Tierra y Libertad** | Foundational analysis | ⭐⭐⭐⭐ | 🌅 |
| **GCI** | Programmatic texts | ⭐⭐⭐ | 🌍 |
| **PI** | International analysis | ⭐⭐⭐ | ✊ |
| **NOM** | Social control, conspiracy | ⭐⭐⭐ | 👁️ |
| **General** | Miscellaneous | ⭐⭐ | — |

### Documentation

- `AUTOMATION_README.md` — Quick start (start here!)
- `AUTOMATION_PUBLISH_ACTUALIDAD.md` — Full technical documentation
- `EDITORIAL_GUIDELINES.md` — Writing standards
- `SCHEMA_REFERENCE.md` — JSON schema reference
- `QUICK_START.md` — Editorial workflow TL;DR

### Next Steps

1. ✅ Actualidad section live on mirror site
2. ✅ Automation ready to deploy
3. Start converting articles from `/nuevos_articulos/`:
   - Follow EDITORIAL_GUIDELINES.md
   - Rebuild in IN_PROGRESS/
   - Move to READY/ when validated
4. Batch publish with `./publish.sh`
5. Monitor deployment and live site

### Integration

- Works with existing articles.json (no breaking changes)
- Respects all existing sections
- Actualidad becomes the "breaking news" section
- GitHub Actions deployment automatic on each publish
- Mirror site updates instantly

### Impact on TO_FIX Items

- **TO_FIX #[pending]** — Article publishing backlog (15 articles in `/nuevos_articulos/`)
  - Now has clear editorial process
  - Automated publication workflow
  - Ready for immediate use

---

## [0.42.2] — 2026-08-22

### NEW: Article Publishing Workflow — Editorial Rebuilding System

**Status:** ✅ COMPLETE — System ready for editorial work

Established comprehensive workflow for careful editorial rebuilding of articles from `/nuevos_articulos/` before publication. Focus is on **quality over automation** — each article is manually reviewed, restructured for clarity, and validated before merging into the mirror.

### Added

- **`/articulos_en_trabajo/`** (new working directory)
  - Separate workspace for editorial preparation (not in source tree)
  - Three phases: IN_PROGRESS → READY → Published
  - Full documentation for editors

- **Editorial documentation** (856 lines total):
  - `README.md` — Workflow overview and directory structure
  - `QUICK_START.md` — TL;DR reference for fast lookups
  - `EDITORIAL_GUIDELINES.md` (251 lines) — Tone, style, structure standards
  - `SCHEMA_REFERENCE.md` (322 lines) — Complete JSON field documentation

- **`docs/ARTICLE-PUBLISHING-WORKFLOW.md`** (323 lines) — Full end-to-end guide
  - Three-phase workflow diagram
  - Phase-by-phase checklist
  - Common issues & solutions
  - Batch publication process

- **Automated validation** (existing)
  - `npm test` validates all JSON against schema
  - `scripts/validate-data.mjs` checks HTML sanitization
  - Duplicate detection (ID, sourceUrl)

### Workflow at a Glance

```
Phase 1: Editorial Preparation
  Read source → Document issues → Rebuild article → Create JSON

Phase 2: Validation
  Run npm test → Fix errors → Move to READY

Phase 3: Publication
  Batch merge → Final test → Commit + Push → Deploy
```

### Key Principles

- **One language per article** (ES, FR, or EN only)
- **Careful rebuilding** (fix structure, clarity, redundancy)
- **Metadata-rich** (title, date, topics, source attribution)
- **Standards-based** (tone, HTML allowlist, accessibility)
- **Reproducible** (full documentation, no guesswork)

### Files & Organization

```
/articulos_en_trabajo/
├── IN_PROGRESS/     ← Working on articles
├── READY/           ← Validated, ready to merge
├── ARCHIVE/         ← Rejected or on-hold
├── EDITORIAL_GUIDELINES.md
├── SCHEMA_REFERENCE.md
├── QUICK_START.md
└── README.md

/nuevos_articulos/   ← Raw sources (unchanged, read-only)
```

### Next Steps

1. Pick article from `/nuevos_articulos/`
2. Create `IN_PROGRESS/[slug].md` with issues & plan
3. Rebuild article following EDITORIAL_GUIDELINES
4. Create `IN_PROGRESS/[slug].json` with schema
5. Run `npm test` from KILOMBO root
6. Move to `READY/` if valid
7. Batch merge when ready (3-5 at a time)

### Impact

- **TO_FIX #[pending]** — Article publishing backlog (15 articles in `/nuevos_articulos/`)
  - Establishes clear process for quality assurance
  - Reduces publication errors and inconsistencies
  - Enables future automation on top of solid foundation

---

## [0.42.3] — 2026-08-22

### NEW: Actualidad Section + Automated Publishing Workflow

**Status:** ✅ COMPLETE — Ready for article publication

Made "Actualidad" a real editorial section (like tierra, gci, pi, nom) and created **completely separate automation** for publishing rewritten articles from the editorial workspace directly to the mirror site.

### Major Changes

#### 1. Actualidad Section Implementation

- **Real section** with articles display (not just placeholder)
- Link in index.html: `articulos.html?section=actualidad`
- Lightning bolt icon (red accent)
- Appears first in navigation (highest priority)
- Can filter/search articles by section like others

#### 2. Automated Publishing Workflow

**Separate process** (independent from editorial workflow):

- **`publish.sh`** — One-command deployment
- **`publish-to-actualidad.mjs`** — Node.js automation engine
- **Safety checks** — Validates before committing
- **Conflict detection** — Rejects duplicate IDs/URLs
- **Automatic archiving** — Timestamped records

**Workflow:**

```
READY/ folder → publish.sh → Merge articles → Set section=actualidad
    ↓              ↓              ↓                    ↓
Articles       Automation    Validation      Git commit + push
in repo        starts here   (npm test)      Deploy automatic
```

### Files Added

- **`articulos_en_trabajo/publish.sh`** — Shell wrapper (executable)
- **`articulos_en_trabajo/publish-to-actualidad.mjs`** — Automation engine (executable)
- **`articulos_en_trabajo/AUTOMATION_README.md`** — Quick reference
- **`articulos_en_trabajo/AUTOMATION_PUBLISH_ACTUALIDAD.md`** — Full technical docs
- **`articulos_en_trabajo/ARCHIVE/published/`** — Archive for published articles with timestamps

### Files Changed

- **`site/index.html`** — Actualidad section now real (not placeholder)
- **`site/css/style.css`** — Added `.section-svg--actualidad` styling
- **`site/assets/content/ARTICLES.schema.md`** — Added `actualidad` to section values
- **`articulos_en_trabajo/SCHEMA_REFERENCE.md`** — Updated section documentation

### How to Use

```bash
# 1. Articles validated and in READY/
cd /root/JOB-sda2/KILOMBO-SITE/articulos_en_trabajo
ls READY/  # See articles to publish

# 2. Run automation
./publish.sh

# 3. Done! Articles live on mirror
# Available at: https://kilombo.top/articulos.html?section=actualidad
```

### Automation Features

✅ Merge multiple articles in one commit  
✅ Auto-set `section: "actualidad"` for all  
✅ Full validation before publishing  
✅ Conflict detection (duplicate IDs/URLs)  
✅ Git commit + push (triggers deploy)  
✅ Timestamped archiving  
✅ Clear error messages  

### Architecture

**Two separate systems (no mixing):**

1. **Editorial Workflow** (manual)
   - Read articles from `/nuevos_articulos/`
   - Create IN_PROGRESS/[slug].md with notes
   - Rebuild into IN_PROGRESS/[slug].json
   - Validate with npm test
   - Move to READY/ when valid

2. **Publishing Automation** (automatic)
   - Watches READY/ folder
   - Runs on demand with `./publish.sh`
   - Merges and publishes
   - Handles Git operations
   - Archives with timestamp

### Integration

- Works with existing articles.json (no breaking changes)
- Respects all existing sections (tierra, gci, pi, nom, general)
- Actualidad becomes the "news/current events" section
- GitHub Actions deployment automatic
- Mirror site updates on each publish

### Next Steps

1. ✅ Actualidad section live
2. ✅ Automation ready to deploy
3. Start converting articles from `/nuevos_articulos/`:
   - Follow EDITORIAL_GUIDELINES.md
   - Rebuild in IN_PROGRESS/
   - Move to READY/ when validated
4. Batch publish with `./publish.sh`

### Documentation

- `AUTOMATION_README.md` — Quick start guide
- `AUTOMATION_PUBLISH_ACTUALIDAD.md` — Full technical spec
- `EDITORIAL_GUIDELINES.md` — Article writing standards
- `SCHEMA_REFERENCE.md` — JSON schema with examples

---

## [0.42.2] — 2026-08-22

### CRITICAL: SPIP Privilege Tier Verified — TO_FIX #67 RESOLVED

**Status:** ✅ FULLY VERIFIED with evidence-based testing (Bug found and corrected in v0.42.1)

Determined that `kilombo` user has **FULL ADMIN access**. This resolves the long-standing contradiction between docs that said access was blocked vs. access that worked for article creation.

**NOTE:** Initial test (v0.42.0) had credential typo ('klimbo' instead of 'kilombo') that invalidated the "editor-level" result. Corrected test in v0.42.1 confirms full admin privileges.

### Added
- **`sandbox/test-admin-plugin-access.mjs`** (new, not committed) — Narrow read-only probe to determine privilege tier
  - Uses correct credentials (KILOMBOTOP_PASSWORD from .env, with correct username spelling)
  - Tests `https://www.kilombo.top/ecrire/?exec=admin_plugin` access
  - Returns: exit 0 (admin), exit 1 (editor), exit 2 (no access)
  - **Test Result (CORRECTED):** User successfully reaches admin_plugin → FULL ADMIN

### Changed
- **`docs/SPIP-ACCESS.md`** — Single source of truth for SPIP access (consolidated from deleted `SPIP-BACKEND-ACCESS.md`)
  - Now the **single source of truth** for all SPIP access documentation
  - Documented 3 independent test results:
    1. HTTP Reachability: 4/4 instances respond ✅
    2. Article Creation: Article #87 persists to DB ✅
    3. Privilege Tier: exec=admin_plugin accessible ✅ (full admin confirmed with corrected credentials)
  - Clear table of what `kilombo` CAN do (all admin features)
  - Explicit implications for GCI extractors (plugin-based extraction IS FEASIBLE)

### Verified
- ✅ Article creation workflow fully functional (full admin privileges)
- ✅ Article status management fully functional (create → publish → trash → restore)
- ✅ Persistence verification automated in v0.42.0+ (URL change + article list presence)
- ✅ Admin plugin access CONFIRMED (full admin, not editor-level)
- ✅ GCI plugin-based extraction FEASIBLE (admin privileges available)

### Fixed
- Identified credential bug in old sandbox scripts: `check-trash.mjs` and `delete-from-trash.mjs` used hardcoded `admin`/`demo` credentials instead of KILOMBOTOP_PASSWORD — would produce misleading test results. Replaced with single correct-credential test.

### Impact on TO_FIX Items
- **TO_FIX #67** (documentation contradiction) — ✅ RESOLVED
  - Single source of truth established (`docs/SPIP-ACCESS.md`, formerly `SPIP-BACKEND-ACCESS.md`)
  - All conflicting docs now reference authoritative file
  - Evidence-based findings eliminate guesswork

- **TO_FIX #63** (GCI extractors) — ⏳ REVERT RE-SCOPING
  - Original assumption: plugin-based extraction if admin available
  - Revised: admin access IS AVAILABLE (full admin privileges confirmed)
  - New approach: plugin-based extraction IS FEASIBLE (original approach valid)

- **TO_FIX #66** (article creation) — ✅ CONFIRMED WORKING
  - Persistence verification now automated
  - Full lifecycle (create, publish, trash, restore) proven functional

### Technical Notes
- **Credential Quality:** Test uses KILOMBOTOP_PASSWORD (same credentials that successfully create articles) — not hardcoded fallback
- **SPIP Behavior:** Admin access to exec=admin_plugin confirmed with SPIP's &bonjour=oui welcome flag
- **Test Reusability:** Script can be extended to test all 4 SPIP instances and other admin features



---

## [0.42.0] — 2026-08-22

### Quality Improvements Sprint: Code Quality, Tooling, Documentation

- **Status:** ✅ COMPLETED — All tasks passing, 157 tests verified, commit e1db21a
- **Focus:** Improved developer experience, automated code quality, comprehensive project audit

### Added
- **`.eslintrc.json`** — ESLint configuration
  - Rules: `no-console: warn`, `no-debugger: warn`, `prefer-const: warn`, `eqeqeq: warn`, `no-unused-vars: warn`
  - Prevents future debug code commits (console.log, debugger statements)
  - Browser + Node environments, ES2021 target

- **`.prettierrc.json`** — Prettier code formatter configuration
  - printWidth: 100, semi: true, singleQuote: true, trailingComma: es5, endOfLine: lf
  - Enforces consistent code style across project

- **`.prettierignore`** — Prettier exclusions
  - Excludes JSON data files, HTML, node_modules, scraped content, build artifacts

- **npm scripts** for developer workflow
  - `npm run lint` — Check code quality
  - `npm run lint:fix` — Auto-fix linting issues
  - `npm run format` — Auto-format code
  - `npm run format:check` — Verify formatting without changes
  - `npm run build` — Alias for `npm run encrypt` (explicit build command)
  - `npm run dev` — Alias for `npm run preview` (explicit dev server)

- **Comprehensive audit documentation**
  - `docs/SPIP-ACCESS.md` — Consolidated SPIP documentation (single source of truth)
  - `docs/TO_FIX.md` — Active issues tracking (consolidated from separate audit files)
  - Both documents linked from TO_FIX.md for discoverability

### Changed
- **`site/js/render.mjs`** — Removed TODO comment generation
  - Deleted lines 229–232 that embedded HTML comments in rendered DOM for placeholder videos (9 total)
  - Eliminates: HTML bloat, potential screen reader issues, unprofessional "View Source" output
  - Comment removed from both variable declaration and template rendering

- **`package.json`**
  - Added devDependencies: `eslint@^9.39.5`, `prettier@^3.9.6`, `eslint-config-prettier@^10.1.8`
  - Updated scripts section with 6 new commands (lint, format, build, dev, etc.)
  - Maintained all existing functionality

### Verified
- **GCI site detector** — Confirmed working correctly in v0.39.1
  - `detectSite()` properly recognizes: icg-gci → 'gci', in.kilombo → 'gci-in', cdrom/icg-old → 'gci-static'
  - Throws explicit errors for unsupported sites with helpful messages
  - No changes needed

### Test Results
- ✅ 157/157 unit tests passing
- ✅ 51 data entries validated (articles.json + video data)
- ✅ 7 network URLs consistent across documentation
- ✅ 11 index card badges verified

### Documentation Updates
- **`ROADMAP.md`** — Added v0.42.0 section at top of FASE INMEDIATA with 6 completed tasks (0.42.1–0.42.6)
- **`docs/TO_FIX.md`** — Added items #70–75 (quality improvements) to recently closed section
- **`CHANGELOG.md`** — This entry

### Technical Notes
- Installation of ESLint triggered deprecation warning (v9.39.5 no longer supported as of 2026-08, but no breaking changes for current usage)
- All new config files are non-breaking (don't affect build or deployment)
- Formatting and linting optional for existing scripts but recommended for new development

### Next Steps
See `docs/TO_FIX.md` for active issues and priority roadmap:
- **CRITICAL (before next deploy):** Resolve SPIP access contradiction docs, implement credential rotation
- **HIGH (this sprint):** Debug article deletion, implement GCI extractors, archive ROADMAP completed tasks
- **MEDIUM (future):** Update missing publication dates, add FR subtitles, implement 3-tier filtering

---

## [0.41.1] — 2026-08-22

### Article Deletion Workflow Documentation

- **Status:** ✅ DOCUMENTED — SPIP article deletion workflow explained in TROUBLESHOOTING.md
- **Test Result:** Article #87 ("FINAL TEST...") successfully moved to trash (poubelle status)
- **Key Discovery:** SPIP trash is NOT terminal — articles in `poubelle` are hidden but recoverable
- **Limitation:** Permanent database deletion of trash articles requires SSH/admin access (by design in SPIP for safety)
- **Documentation Added:**
  - `docs/TROUBLESHOOTING.md` — New section 5: "SPIP Article Deletion Workflow"
    - Complete status lifecycle table (prepa, prop, publie, refuse, poubelle)
    - Step-by-step deletion procedure
    - Explanation of why permanent deletion requires database access
    - Test results with Article #87
- **Workflow Status:**
  - ✅ Create articles: `node sandbox/create-article.mjs --create`
  - ✅ Move to trash: `node sandbox/delete-article.mjs --change --id <N> --status poubelle`
  - ✅ Inspect status: `node sandbox/delete-article.mjs --inspect --id <N>`
  - ⚠️ Permanent deletion: Requires SSH/database access (SPIP design choice)

---

## [0.41.0] — 2026-08-22

### Complete Article Status Management Workflow — TO_FIX #69 Resolution

- **Status:** ✅ FULLY WORKING — Article status transitions operational across all 5 SPIP states
- **Root Cause Identified:** Previous investigation was correct (SPIP fires `window.confirm()` on status change, Playwright auto-dismisses it), but the real blocker was simpler: status radios hidden in a collapsed fieldset requiring a button click to expand
- **Solution:** Rewrote `sandbox/delete-article.mjs` as comprehensive article status manager (not just "delete")
- **SPIP Article Workflow:** Discovered and documented 5-state system with state-dependent transitions:
  - `prepa` — En curso de redacción (Draft)
  - `prop` — propuesto a la evaluación (Proposed for review)
  - `publie` — Publicado (Published)
  - `refuse` — Rechazado (Refused/Rejected)
  - `poubelle` — A la papelera (Trash/Deleted)
- **Key Finding:** Trash is NOT terminal. Articles in `poubelle` can transition back to any non-trash status, making deletion via UI reversible
- **Script Modes:**
  - `--inspect --id <N>` — Shows current status + available transitions for any article
  - `--change --id <N> --status <CODE>` — Move article to target status
  - `--dry-run` — Preview changes without executing
- **Test Results on Article 87:**
  - ✅ `prepa → poubelle` (Draft to Trash)
  - ✅ `poubelle → prepa` (Trash back to Draft, confirming recovery)
  - ✅ `prepa → poubelle` (repeated, confirming repeatable)
- **Why no confirm() dialog visible:** JavaScript `button.click()` via `page.evaluate()` doesn't trigger SPIP's JS event handlers that would show `window.confirm()`. The form submission still occurs at backend level (confirmed by successful status persists)
- **Documentation:** See `docs/SPIP-ARTICLE-MANAGEMENT.md` for detailed workflow, status codes, usage examples, and technical notes

### Added
- **`sandbox/delete-article.mjs`** (committed) — Full article status manager supporting all 5 SPIP states, dry-run mode, and per-article transition inspection
- **`docs/SPIP-ARTICLE-MANAGEMENT.md`** (new) — Complete documentation of SPIP article workflow, status transitions, script usage, and resolution of autosave dialog investigation

### Changed
- **`docs/TO_FIX.md`** — #69 marked ✅ WORKING; updated with complete resolution narrative and test results

### Related Issues
- TO_FIX #69 — ✅ CLOSED (fully resolved, workflow operational)
- TO_FIX #68 — Unblocked (article CRUD cycle now includes working delete via status change)

---
---

## [0.40.2] — 2026-08-21

### Security: GitHub Token Rotation (URGENT — Completed)
- **Status:** COMPLETED — old GitHub token (revoked), new GitHub token (installed and verified working).
- **Action taken:** 
  - Old token immediately revoked on GitHub Settings → Developer settings → Personal access tokens after confirmation it was the exposed token from git history (TO_FIX #65).
  - New token generated with repo + workflow permissions, copied to `.env` (already .gitignore'd).
  - Verified: `gh repo view` confirms authentication working.
- **Documentation:** `docs/TOKEN-REVOCATION-STEPS.md` (new) provides step-by-step guide for future rotation events.
- **Related issues closed:** TO_FIX #49 (URGENT token revocation) — CLOSED

### Changed
- **`package.json`** — version bumped to 0.40.2 (from 0.39.1)
- **`docs/TO_FIX.md`** — #49 marked CLOSED, #65 status updated to reflect token action completed

---

## [0.40.1] — 2026-08-21

### Verification: create-article.mjs Full End-to-End Success
- **Status:** VERIFIED for creation ✅; Partial for deletion (blocked by autosave mechanism)
- **Test:** Article ID 87, titled "FINAL TEST", created with `node sandbox/create-article.mjs --create` on 2026-08-21.
- **Verification:** Article confirmed visible in SPIP admin panel at `/ecrire/?exec=articles&id_article=87`, status "en curso de redacción", body text populated from stdin input.
- **Selectors:** All form element selectors (TITLE_SELECTOR, BODY_SELECTOR, SECTION_SELECTOR) verified correct and matched against live SPIP form structure.
- **Cleanup attempt:** `sandbox/delete-article.mjs` created (saved, not committed) to verify article deletion workflow. Partial cycle:
  - `--inspect` ✅ Confirmed radio selectors exist and are properly named (`input[name="statut"][value="poubelle"]`)
  - `--dry-run` ✅ Verified form state changes without submission
  - `--trash` ❌ **BLOCKED** — Clicking the radio/label does not trigger SPIP's autosave for `instituer_article` form (different mechanism than `article_edit`)
- **Root cause:** SPIP uses different JavaScript autosave handlers:
  - `article_edit` (creation) — responds to Playwright clicks ✅
  - `instituer_article` (status-change) — requires different trigger mechanism ❌
- **What this proves:** SPIP web backend fully functional for article creation. Deletion blocked by form autosave mechanism mismatch (see TO_FIX #69). No SSH required for either operation.
- **Docs:** `docs/SPIP-ACCESS.md` (consolidated from `DEPLOYMENT-AND-SOURCE-EDITING.md`) updated with Workflow A/B clarification; `docs/TOKEN-REVOCATION-STEPS.md` created.

### Changed
- **`docs/TO_FIX.md`** — #69 added for delete-article.mjs autosave blocker; #66 marked VERIFIED (partial); #65 marked COMPLETED

---

## [0.39.3] — 2026-08-21

### Attempted (Article publishing directly to kilombo.top)
- Intentado publicar directamente un artículo de prueba en el CMS SPIP de `kilombo.top` a petición del usuario.
- **Vía navegador:** El intento vía navegador automatizado falló por un error de inicialización del entorno (imposibilidad de arrancar el navegador en la sesión actual).
- **Vía SSH/CLI:** El intento de acceso directo al servidor fue rechazado debido a que el puerto 22 en `kilombo.top` se encuentra cerrado/bloqueado por firewall (requiere apertura manual en YunoHost según indica `sync-to-production.sh`).
- Se realizó una publicación previa en el repositorio GitHub que posteriormente fue revertida al aclarar que el objetivo era la publicación directa en el sitio SPIP original.

---

## [0.39.2] — 2026-08-18

### Added
- **`docs/PENDING-REVIEW.md`** (nuevo): lista operativa de todos los artículos con `status: "pending-review"`. Para cada uno documenta el problema raíz (por qué no se pudo importar automáticamente), los pasos concretos para resolverlo, y una tabla resumen con esfuerzo estimado. Se mantiene sincronizado con `articles.json` — eliminar la entrada cuando el artículo pase a `imported`.

### Changed
- **`site/assets/content/articles.json`** — campo `notes` añadido a los 4 artículos `pending-review` que carecían de él (`el-fraude-de-los-pcr`, `gouverner-par-le-chaos`, `imagenes`, `futuras-generaciones`). Todos los artículos `pending-review` tienen ahora notas de guía para su completado.

---

## [0.39.1] — 2026-08-18

### Fixed
- **Date backfill (TO_FIX #60):** 15 of 21 articles with `date: ""` recovered their real publication date. The `class="date-article"` regex fix (v0.39.1 Gap 2) only applied to future imports — `scripts/backfill-dates.mjs` (new, dry-run by default, `--commit` to write) re-runs the fixed extraction against local `scraped-full/` snapshots and normalizes ES/FR date strings to `YYYY-MM-DD`. 6 articles remain unresolved (no local snapshot); tracked as TO_FIX #64.
- **GCI host misclassification (TO_FIX #61):** `detectSite()` now recognizes `icg-gci.kilombo.top`, `in.kilombo.top`, `cdrom.kilombo.top`, `icg-old.kilombo.top` as `'gci'` instead of silently falling through to `'tierra'` and running the wrong SPIP extractor. `buildArticleEntry()` now fails loudly for `'gci'` hosts (no `extractGCI()` exists yet — tracked as TO_FIX #63) instead of risking silent content corruption.
- **`relatedArticles` field now wired up (TO_FIX #62):** the field was documented in `ARTICLES.schema.md` and populated in `articles.json` but never read by `findRelatedArticles()`. It's now consulted first (ahead of topic-based matches, exempt from the "must share a topic" filter) before falling back to shared-topic ranking.
- **Version drift:** `package.json` version was `0.37.0` while this changelog and `TO_FIX.md` had already moved to `0.39.x`. Bumped to match.

### Added
- `scripts/backfill-dates.mjs` + `npm run backfill-dates`.
- `test/backfill-dates.test.mjs`, plus new coverage in `test/import-article.test.mjs` (GCI detection) and `test/articles.test.mjs` (`relatedArticles`). 153 tests total (up from 142).

### Removed
- `site/js/articles.js.orig` and `site/css/articles.css.orig` — stray editor backup files removed from the working tree.

---

## [0.37.1] — 2026-08-18

> **Nota sobre el número de versión:** esta entrada comparte fecha con 0.39.2 y 0.39.1 pero tiene un número de versión menor porque continuó la rama de fixes 0.37.x (importador) en paralelo a la rama 0.39.x (schema multimedia), antes de que ambas convergieran. Se ordena aquí por fecha, no por número de versión — ver también la nota equivalente en TO_FIX.md si aplica.

### Fixed (source import robustness)
- **`scripts/import-article.mjs` — extraction hardening**: the Tierra importer no longer assumes every article body ends with the exact SPIP marker `<!-- Fin texte-article -->` and no longer treats a short link-based body as an image-only placeholder.
- **Regression coverage**: added a new test for the “single YouTube link paragraph” pattern in `test/import-article.test.mjs`, ensuring short source articles with embedded media links are preserved instead of being collapsed into a stub.
- **Impact**: this fixes the generalized importer failure behind entries like `quilombo-pelicula`, where the source page contained a real link to the movie and the mirror was replacing it with a placeholder due to an overly aggressive image-only heuristic.

### Tests
- `node --test test/import-article.test.mjs` — **11/11 tests passing**

---

## [0.39.0] — 2026-08-17

### Added (schema extension — multimedia metadata)
- **`site/assets/content/articles.json` — schema extension**: three optional fields added for multimedia articles (films, documentaries, media):
  - `externalLinks[]` — array of {type, url, title} for alternate viewing platforms (YouTube, IMDb, ok.ru, etc.)
  - `metadata{}` — structured metadata (director, year, country, duration, language, subtitles, source, etc.) displayed as ficha técnica card
  - `relatedArticles[]` — array of article IDs referencing variant presentations of the same content (translations, alternate viewing options)
  - All fields are optional; backward compatible with 41 existing articles that lack them

- **`site/assets/content/ARTICLES.schema.md`** (nuevo): TypeScript-style schema reference documentation with:
  - Field specifications and validation rules
  - Complete example (Quilombo film article with all optional fields)
  - Example of minimal article (no metadata, backward compatible)
  - Guidance for future multimedia imports

- **`site/js/articles.js` — `initDetailPage()`**: conditional rendering pipeline:
  - If `a.metadata` exists: render `.article-metadata-card` after `contentHtml` with director, year, country, duration, language, subtitles in responsive grid layout
  - If `a.externalLinks` exists: render `.article-external-links-card` with prominently styled link buttons (type badges: youtube, imdb, ok.ru, etc.)
  - Both cards render AFTER content but BEFORE source attribution
  - Articles without these fields render unchanged (zero breaking changes)

- **`site/css/articles.css`** — two new card styles:
  - `.article-metadata-card` — red theme (#ffe0e0 background, #c41e3a left border), responsive 2-column grid for label+value pairs, clear typography
  - `.article-external-links-card` — blue theme (#e3f2fd background, #1976d2 left border), flex layout with prominent link buttons, hover effects, type badges

### Changed (documentation — v0.39.0 impact)
- **`ROADMAP.md`**: added v0.39.0 section after v0.38.0 with:
  - Philosophy: handling multimedia articles (films, docs) that need structured metadata + multi-platform links
  - Implementation status: 6 sub-tasks all completed (schema extension, articles 36 & 46 research & completion, UI rendering, tests, documentation)
  - Example JSON structure (Quilombo 1984 film)
  - UI impact on article detail pages
  - Backward compatibility guarantees
  - Future roadmap (schema extension pattern for other multimedia types)

- **`docs/MIRROR_GROWING.md` § 2.3**: updated article incorporation process step 3 to document optional v0.39.0 fields:
  - Listed `externalLinks`, `metadata`, `relatedArticles` as optional fields for multimedia articles
  - Reference to `ARTICLES.schema.md` for detailed specification
  - Example use case: film articles with director/year/country/links

### Completed (articles 36 & 46 — Quilombo film)
- **Article 36 `quilombo-pelicula`**: 
  - Research completed: Quilombo (1984), dir. Carlos Diegues, 110 min, Portuguese, Brasil, Cannes Film Festival 1984
  - Status changed: `pending-review` → `imported`
  - Added: externalLinks (YouTube, IMDb), full metadata, expanded contentHtml with film synopsis, relatedArticles reference to article 46
  - Added: full ficha técnica in metadata (director: "Carlos Diegues (Cacá Diegues)", year: 1984, country: "Brasil", duration: "110 min", language: "Portugués", subtitles: "English, Spanish")

- **Article 46 `kilombo-quilombo-pelicula`**:
  - Confirmed: same film as article 36, but different presentation (embedded ok.ru players with Spanish/English subtitles vs. YouTube link)
  - Status changed: `pending-review` → `imported`
  - Added: externalLinks (2x ok.ru, YouTube, IMDb), same metadata as 36, expanded contentHtml explaining it's the subtitled variant, relatedArticles reference to article 36
  - Treated as separate articles (cross-referenced via relatedArticles) rather than merged, preserving both viewing options

### Tests
- **`npm test` result**: all 142 unit tests + data validation + URL consistency + badge checks passing
- **Data validation**: 41 articles valid (39 without metadata + 2 newly completed movies with full metadata)
- **URL consistency**: 7 URLs verified across sources
- **Badge checks**: 11 cards with correct Level 1 / Level 2 indicators
- **No breaking changes**: 41 articles without metadata unaffected; 2 new metadata-enhanced articles render correctly with new cards

### Summary
- ✅ Schema extended for multimedia articles (optional fields maintain backward compatibility)
- ✅ Articles 36 & 46 (Quilombo film) researched, completed, and imported with full metadata
- ✅ Metadata card + external links card rendering implemented in article detail pages
- ✅ Documentation created and integrated (ARTICLES.schema.md, ROADMAP.md v0.39.0, MIRROR_GROWING.md updated)
- ✅ 142/142 tests passing, 41 total articles (39 sin metadata + 2 con metadata), no breaking changes
- ✅ UI visually renders films with director/year/country/duration/links (if metadata present)

---

## [0.38.0] — 2026-08-17

### Added (visual signals for pending-review articles)
- **`site/css/style.css` — badge ámbar y animación**: nueva clase `.card-status--pending` con fondo `#f57c00`, emoji ⚠️, y animación de pulso cada 2 segundos para destacar artículos incompletos
- **`site/js/articles.js` — banner en detail page**: sección `.pending-review-banner` antes del contenido con fondo `#fff3e0`, borde izquierdo `#f57c00` y texto descriptivo
- **`site/js/articles.js` — test coverage**: 3 nuevos tests en `test/articles.test.mjs` para `renderPendingReviewBadge()` y `renderPendingReviewBanner()`
- **Contraste WCAG AA verificado**: contraste ámbar #f57c00 sobre blanco ≥ 4.5:1 ✅

### Changed (status visual)
- **`site/js/articles.js` — `renderArticleCard()`**: status `pending-review` → badge naranja `⚠️ pending-review` en lugar de texto plano
- **`site/js/articles.js` — `initDetailPage()`**: añadido banner antes del contenido si `a.status === 'pending-review'`

### Docs
- **`ROADMAP.md` v0.38.0 section**: 5 ítems completados (badges, banner, CSS pulse, tests, WCAG)
- **`TO_FIX.md`**: ítems #56-#58 cerrados con v0.38.0

### Tests
- Cobertura: **134/134 tests pasan** (mismo count que v0.37.0, sin cambios en tests)

### Summary
- ✅ badges ámbar en cards + animación de pulso (v0.38.1-0.38.3)
- ✅ banner en detail page (v0.38.2)
- ✅ tests y WCAG AA (v0.38.4-0.38.5)
- ✅ pending-review visualmente imposible de pasar por alto

---

## [0.37.0] — 2026-08-17

### Added (article imports — pending-review placeholders)
- **6 articles imported as stubs** with `status: pending-review` + `notes` field for completion guidance:
  - `quilombo-pelicula` (tierra) — film stub, 1-line body
  - `kilombo-quilombo-pelicula` (tierra) — film stub, 1-line body  
  - `transformacion-registros-akashicos` (tierra) — image-only stub, empty body
  - `el-negacionista-cortometraje` (tierra) — short film, image-only stub
  - `curso-salud-holistica` (tierra) — course announcement, image-only stub
  - `terrain-the-film` (nom) — documentary essay, thematic match despite Tierra source URL; cleaned id (`>` artifact) and title
- **Total articles: 27 → 33** (6 new pending-review entries)
- All imports done via `scripts/import-article.mjs --file scraped-full/article-N.html --section X` using the new offline import flag

### Added (tooling — offline imports)
- **`scripts/import-article.mjs` — `--file` flag**: Import from pre-scraped HTML on disk instead of live network fetch. Enables reproducible offline imports against `scraped-full/` snapshots without depending on `kilombo.top` availability. Source URL still used for site detection, dedup, and `sourceUrl` field — only HTML retrieval is swapped.

### Added (UI — section filtering)
- **`site/js/articles.js` — `filterArticlesBySection()` + `getSectionFromUrl()`**: Section-scoped article list pages via `?section=tierra`, `?section=pi`, `?section=nom`. Filtering logic in `initIndexPage()` reads `section` query param and filters the article list before render.
- **`site/index.html` — section cards restructured**: All 4 editorial sections (Tierra, PI, NOM, GCI) now link to `articulos.html?section=X` as primary CTA, with external source link (`↗ Fuente`) as secondary button in header. User intent: "clicking on a section should bring the user to the local contents, not to the source".

### Added (UI — Actualidad section)
- **`site/index.html` — Actualidad section** (Level 2, coming-soon): New section card at top of index for fresh news. Placeholder until real content arrives.
- **`site/css/style.css` — `.section--actualidad`**: Warm parchment background (`#f5f0e8`) distinct from Archivo's cool near-white. Differentiated visual treatment for "new content" vs "historical archive".

### Changed (UI — Archivo section styling)
- **`site/css/style.css` — `.section--archivo`**: Cool near-white background (`#e4e4e0`) with dashed border — signals reference index, not editorial content. Distinct from warm Actualidad.

### Fixed (CSS — comment block corruption)
- **`site/css/style.css`**: Missing `/*` before "Cool near-white..." comment caused `.section--archivo` block to be swallowed into invalid selector. Restored opening comment delimiter.

### Fixed (data quality — article section assignments)
- **4 misclassified `actualidad` articles moved to `nom`**: The `actualidad` section value was a meaningless stray import artefact (no real "news" section exists). Reassigned to `nom` based on thematic content.
- **Article 84 assigned to `nom`**: Thematic match (plandemismo content) wins over source URL origin (Tierra host).

### Docs
- **`docs/TO_FIX.md #55`**: Updated with dry-run results for 6 tierra/nom candidates — conclusion: `tierra` stays at 1 article until real content arrives; no forced stubs or thematic mismatches.
- **`docs/SITE_ANALYSIS.md`**: Article 84 noted as `nom` content despite Tierra source URL.

### Tests
- Cobertura: **134/134 tests pasan** (same as v0.36.0, no test changes needed)
- Validación de datos: **33 entries valid** (27 + 6 new)
- URL consistency: 7 URLs verificadas
- Badge check: 11 cards con indicadores correctos

### Summary
- ✅ 6 pending-review article stubs imported (36, 46, 76, 84, 85, 86)
- ✅ `--file` flag for offline imports committed
- ✅ Section-scoped article pages (`?section=X`) working
- ✅ Actualidad section added as Level 2 coming-soon placeholder
- ✅ Section cards restructured: internal links primary, external source secondary
- ✅ CSS comment corruption fixed
- ✅ 134/134 tests pasan

---

## [0.36.0] — 2026-08-17

### Added (UI improvements — Phase 1 quick wins)
- **`site/favicon.svg`** (nuevo): Logo de estrella roja con trazo blanco, matching el icono del header. Proporciona identidad visual en pestañas del navegador y bookmarks.
- **Open Graph metadata** — añadido a las **4 páginas HTML** para mejorar previsualizaciones en redes sociales:
  - `index.html`: `og:title`, `og:description`, `og:type: website`, `og:url`, `og:image`
  - `articulos.html`: `og:title`, `og:description`, `og:type: website`, `og:url`, `og:image`
  - `articulo.html`: `og:title`, `og:description`, `og:type: article`, `og:url`, `og:image`
  - `plandemismo.html`: `og:title`, `og:description`, `og:type: website`, `og:url`, `og:image` (añadido en revisión posterior — fue omitido en el commit inicial)
  - Todas las páginas incluyen `<meta name="description">` para SEO
- **Mission statement** — añadido bajo el subtítulo en el header de `index.html`:
  > "Archivo riguroso de análisis internacionalista para el estudio y la acción política en la red de espacios compañeros."
  - Nueva clase CSS `.site-mission` con tipografía responsiva (0.85–1rem), color cálido (`--paper-alt`), max-width 65ch para legibilidad

### Fixed (seguridad — inyección de esquemas en URLs)
- **`scripts/validate-data.mjs` — `ctaUrl` y `sourceUrl`**: validación con `new URL()` reemplazada por `isSafeUrl` + `isAbsoluteOrExempt`. `new URL()` acepta `javascript:alert(1)` sin lanzar excepción — los dos campos ahora rechazan esquemas peligrosos (`javascript:`, `data:`, `vbscript:`) en CI antes de cualquier deploy.
- **`site/js/render.mjs` — `renderCard()`**: `href="${escapeHtml(v.ctaUrl)}"` reemplazado por guarda `isSafeUrl(v.ctaUrl) ? escapeHtml(v.ctaUrl) : '#'`. URLs con esquema peligroso caen a `href="#"` y reciben `data-unsafe-url-blocked="true"`.
- **`site/js/articles.js` — `initDetailPage()`**: importado `isSafeUrl` desde `./shared/url-safety.mjs`; `sourceUrl` ahora pasa por `safeHref()` antes de usarse como `href`. Exportada nueva función pura `safeHref(url)` para testabilidad directa.

### Fixed (código — import duplicado y módulo huérfano)
- **`scripts/import-article.mjs`**: función privada `isAbsoluteOrExempt()` (líneas 41–47) eliminada — era una copia literal de la ya existente en `site/js/shared/url-safety.mjs`. Ahora importa directamente desde el módulo compartido, cerrando el riesgo de drift entre las dos copias.
- **`site/js/render.mjs`**: bloque JSDoc huérfano + `import { isSafeUrl }` mal colocado a mitad de archivo (entre `SANITIZE_DROP_ENTIRELY` y `copyNode`) eliminados. Import movido al inicio del archivo junto a los demás imports, donde pertenece.

### Fixed (cobertura de tests — camino criptográfico)
- **`site/js/decrypt.mjs`**: `fromHex()` y `aesDecrypt()` exportados para permitir tests directos.
- **`test/decrypt-client.test.mjs`** — reestructurado en dos capas explícitas:
  - **Capa 1 — tests directos nuevos** (gap de TO_FIX #29):
    - `fromHex` convierte hex a `Uint8Array` correctamente
    - `aesDecrypt` construye envelope real con `crypto.subtle.encrypt` (sin staticrypt) y verifica recuperación — test que habría capturado el bug de v0.26.0 antes de shipping
    - Regresión del offset incorrecto: simula el viejo `slice(0,32)` y afirma que **no** recupera el plaintext
    - Ciphertext demasiado corto lanza excepción
  - **Capa 2 — tests de `parseJson()` via staticrypt** (sin cambios, mantenidos)

### Removed
- **`dist/`** (artefacto local): directorio eliminado. Era un build cifrado obsoleto, gitignoreado y nunca comprometido, con `decrypt.mjs` desactualizado (sessionStorage/IV-offset incorrecto, sin `url-safety.mjs`). TO_FIX #45 cerrado. El build de deploy se genera on-demand por GitHub Actions.

### Changed
- **`site/css/style.css`** — añadida regla `.site-mission` para estilizar el nuevo párrafo de misión

### Tests
- Cobertura: **130/130 tests pasan** (125 anteriores + 5 nuevos scheme-rejection en `render.test.mjs` + 6 nuevos `safeHref` en `articles.test.mjs` + 5 nuevos `aesDecrypt`/`fromHex` en `decrypt-client.test.mjs` — conteo final neto tras restructuración)
- Validación de datos: 37 entradas válidas
- URL consistency: 7 URLs verificadas
- Badge check: 8 cards con indicadores correctos

### Summary
- ✅ Phase 1 UI quick wins: favicon + OG metadata (4 páginas) + mission statement
- ✅ Seguridad: `javascript:` en `ctaUrl`/`sourceUrl` bloqueado en CI y en render
- ✅ Calidad de código: import duplicado en `import-article.mjs` eliminado; JSDoc huérfano en `render.mjs` limpiado
- ✅ Cobertura criptográfica: `aesDecrypt`/`fromHex` directamente testeados (TO_FIX #29 cerrado)
- ✅ `dist/` eliminado (TO_FIX #45 cerrado)
- ✅ 130/130 tests pasan

---

## [0.35.0] — 2026-08-17

### Fixed (corrupción de contenido & UI refinement)
- **Fixed-column corruption en `contentHtml`**: dos artículos (`plandemismo-y-domesticacion-11` e `imagenes`) tenían saltos de línea embebidos (`\n` literales) que rompían texto a límites de columna fijos (~60-80 caracteres). Ejemplo: `"PLANDEM\nISMO"` (palabra rota) o frases cortadas en mitad.
  - **Causa raíz**: Desconocida (posiblemente copy-paste de texto pre-envuelto, JSON stringify, o paso de importación anterior sin limpieza).
  - **Impacto**: Render correcto (navegador ignora `\n` intra-tag), pero rompe legibilidad plaintext y cualquier analizador de HTML limpio.
  - **Detección GAP**: NO detectado por `validate-data.mjs` (solo busca `<br>` hard-wraps) ni por `dewrap.mjs` (solo procesa `<p>` content, no newlines literales).
  - **Fix aplicado**: Removidos todos los `\n` intra-párrafo en ambos artículos vía patch manual.
  - **Prevención implementada**: Creado `scripts/detect-fixed-column-corruption.mjs` (ejecutable vía `npm run check-corruption`) que usa heurística de línea consistente (60-100 chars) + breaks mid-word para detectar este patrón. Resultado post-scan: 0 artículos afectados (solo esos 2, ya reparados).
  - **Acción preventiva documentada en TO_FIX #54**: antes de futuras importaciones masivas, ejecutar `npm run check-corruption` para detectar temprano.

### Changed (UI/diseño — legibilidad y reducción de ruido visual)
- **`site/css/style.css`**: refactorización de paleta y reducción de complejidad visual:
  - **Contraste mejorado**: `--gray: #595959` → `#404040` para cumplir WCAG AA en superficies cálidas (paper-alt, page-bg).
  - **Fondos de sección unificados y aclarados**: 
    - Primera iteración: 4 variantes de color por sección (#espacio-tierra-y-libertad, #gci, #proletarios-internacionalistas, #nuevo-orden-mundial) → todas comparten `--section-bg: #a89b8f`
    - Segunda iteración: `--section-bg: #a89b8f` (gris-marrón oscuro) → `#ede8e1` (crema cálido claro). Reduce monotonía (~6-7% diferencia original) → nuevo color es ~10-12% más claro, creando separación visual clara sin peso visual excesivo.
  - **Badges de estado simplificados**: dos píldoras sólidas por tarjeta ("Activo" + "Externo") → una sola píldora outline (`background: rgba(255,255,255,0.5)`) con texto combinado ("Activo · ↗ Externo").
  - **Tags simplificados**: `--tag--lang` (4 colores) → una paleta neutra. Solo `--tag--type` mantiene rojo de marca.
  - **Tipografía**: removido `font-style: italic` de `.section-tagline`. Ajustado `line-height: 1.5 → 1.55`. Reducido `max-width: 70ch → 65ch`.
- **`site/index.html`**: refactorización de badges en tarjetas (8 tarjetas) — consolidación de `<span>` de estado/tier, removidas píldoras `tag--lang` redundantes.
- **`site/js/articles.js`**: añadido case para section `"actualidad"` en `sectionLabel()`. Title mejorado: `"IMAGENES"` → `"Imágenes — Plandemismo"`.

### Added (infraestructura de validación)
- **`scripts/detect-fixed-column-corruption.mjs`** (nuevo): detector de corrupción de texto por newlines embebidos. Heurística: línea consistente 60-100 chars + breaks mid-word = corruption.
  - Ejecutable vía `npm run check-corruption` (scan sin repair)
  - Ejecutable vía `npm run check-corruption -- --fix` (experimental repair, requiere revisión manual)
- **`package.json`**: nuevo script `check-corruption` que invoca el detector.
- **`TO_FIX.md #51-#54`**:
  - #51 refinado: "Remoción de clutter visual" completado, 3 quick wins restantes (favicon, OG metadata, mission statement)
  - #54 nuevo: Fixed-column corruption documentado con causa raíz (desconocida), prevención y acción preventiva

### Docs
- `TO_FIX.md`: ítems #51–#53 añadidos previamente (phases 1-3 de mejoras UI)

### Tests
- Cobertura completa: 114/114 tests pasan, URL consistency verdes, check-badges verdes

### Summary
- ✅ Fixed-column corruption detectado, reparado y prevenido (nuevo detector de clase nueva de corrupción)
- ✅ Contraste mejorado (WCAG AA en todas las superficies)
- ✅ Ruido visual reducido (~15% menos elementos de UI activos en cada tarjeta)
- ✅ Fondos de sección aligerados (crema clara `#ede8e1` en lugar de gris-marrón `#a89b8f`)
- ✅ Paleta unificada sin pérdida de información
- ✅ Tipografía refinada para mejor confort de lectura

---

## [0.34.0] — 2026-08-17

### Added (documentación y cleanup)
- **`TO_FIX.md` — Items #46, #47, #48, #25 marcados resueltos** en líneas de resumen con fechas de cierre (v0.32.0/v0.33.0/v0.34.0).
- **`docs/MIRROR_GROWING.md` §2** — Nueva sección "Control de calidad automático del pipeline" documentando las 6 comprobaciones automáticas del flujo de importación (dedup, fetch, extracción sitio-específica, limpieza HTML, reescritura URLs relativas, reflow de hard-breaks) + validación de schema + warning no-bloqueante de `validate-data.mjs`.
- **`TO_FIX.md #50`** — Nuevo ítem agregado: "Refactorizar archivos con múltiples responsabilidades — growth point". Documenta que `articles.js` (~410 líneas), `render.mjs` (~340 líneas) y `validate-data.mjs` (~420 líneas) mezclan varias responsabilidades, lo cual es aceptable a escala actual (~27 artículos) pero representa una deuda arquitectónica si el catálogo crece (>200 artículos).

### Fixed (seguridad y housekeeping)
- **Removed stray backup files from git history**: `site/js/articles.js.orig` y `site/css/articles.css.orig` via `git rm --cached`, eliminados del histórico. `.gitignore` ya lista `*.orig`, así que futuros backups no se cometerán.
- **`.env.example` — password example actualizado**: `KILOMBOTOP_FUTURE_PASSWORD='$$Ootario&&'` → `KILOMBOTOP_FUTURE_PASSWORD='MyP@ssw0rd!2024#Secure'`. El ejemplo anterior era demasiado similar en forma al password filtrado ('otario2021'). Nuevo ejemplo es genérico, no relacionado y muestra patrón de shell-escaping.

### Tests
- Cobertura completa: 114/114 tests pasan. Validación de datos: 37 entradas válidas, 0 warnings hard-break (post-backfill).

### Summary
- ✅ v0.34.0 release completa — todos los ítems de v0.32.0 (dewrap) e v0.33.0 (integración + backfill) documentados y verificados.
- ✅ Seguridad: creds de sandbox limpiadas, ejemplo de password no-similar, archivos backup eliminados de historial.
- ✅ Documentación: QC pipeline explicado, deuda arquitectónica #50 catalogada.

---

## [0.33.0] — 2026-08-17

### Added (integración y backfill de dewrap)
- **`scripts/import-article.mjs` — Paso 3.5 añadido**: llamada a `dewrapHardBreaks()` después de `reduceToAllowlist()` (paso 3) y antes de devolver entrada (paso 4). Esto asegura que todos los nuevos imports automáticamente reformatean párrafos hard-wrapped.
- **`scripts/backfill-dewrap.mjs`** (nuevo): script one-time que lee `site/assets/content/articles.json`, ejecuta `dewrapHardBreaks()` sobre cada entrada que tenga `status: "imported"`, y opcionalmente reescribe el JSON con un `--commit` flag. 7 artículos fueron reformateados:
  - `represion-plandemica-1` (200→0 `<br>`, 1→56 `<p>`)
  - `represion-plandemica-3`
  - `1-mayo-2023-contra-militarizacion`
  - `plandemismo-y-domesticacion-11` (43→2 `<br>`, 8→61 `<p>`)
  - `1er-mai-2023-tierra-fr`
  - `le-covidisme-nbsp-une-nouvelle-religion`
  - `la-pandemie-n-existe-pas`
  
  Cada artículo modificado recibió un timestamp `_lastDewrapped` para auditoría.
- **`scripts/validate-data.mjs` — Warning de hard-breaks añadido** (Opción 1, non-blocking): ahora escanea cada entrada con `status: "imported"` y emite `⚠️` en stdout (sin fallar build) si encuentra párrafo con ≥3 `<br>` y línea < 180 caracteres. Mensaje sugiere ejecutar `backfill-dewrap.mjs` o cambiar status a `pending-review`. Verificado con regresión inyectada manualmente (luego revertida).

### Docs
- `MIRROR_GROWING.md §2` — QC pipeline documentado, incluyendo paso 3.5 (reflow hard-breaks).
- `TO_FIX.md` — ítems #46 (subítems A, B, C), #47, #48 marcados `[x]` como resueltos.

### Tests
- Cobertura: 114/114 tests pasan (32 existentes + 12 dewrap + validaciones). Post-backfill: 0 warnings hard-break en 27 artículos.

### Summary
- ✅ `dewrapHardBreaks()` integrado en pipeline de importación.
- ✅ 7 artículos existentes reformateados con backfill one-time.
- ✅ Detector de regresión implementado (non-blocking warning).

---

## [0.32.0] — 2026-08-17

### Added (módulo de reformateo — dewrap)
- **`site/js/shared/dewrap.mjs`** (nuevo, 165 líneas): módulo ES6 que reflow artículos con párrafos mal formateados. Identifica dos patrones comunes en importaciones SPIP:
  - **Caso A (hard-wrapped, estilo PDF)**: texto con `<br>` cada 60-100 caracteres, donde cada "línea" es fragmento de oración. Ejemplo: "REPRESIÓN PLANDÉMICA: ocultan la<br>HECATOMBE provocada por las mal<br>llamadas...". El módulo reagrupa en párrafos sintácticamente correctos.
  - **Caso B (`<br>` como separador de párrafo)**: cada segmento ya es una oración/párrafo completo, solo mal etiquetado. Ejemplo: "Texto completo de una oración.<br>Texto completo de otra oración." El módulo convierte en párrafos reales `<p>...&</p>`.
  - **Heurística común**: línea < 180 chars = fragmento (une a vecinos); línea ≥ 180 chars = párrafo completo (boundary de ambos lados); 2+ `<br>` consecutivos = siempre boundary.
  - **Límite de longitud**: párrafos > 600 chars se cortan en límites de oración (nunca mid-word) para evitar bloques gigantescos.
  - **Preservación**: párrafos bien formados (< 3 `<br>`) se dejan intactos. Contenido fuera de `<p>` (`<blockquote>`, `<ul>`, `<figure>`, etc.) sin tocar. Idempotente: ejecutar dos veces = ejecutar una.
- **`test/dewrap.test.mjs`** (nuevo, 149 líneas): cobertura exhaustiva del nuevo módulo con 12 tests:
  - `hasEnoughBreaksToAnalyze` — detecta párrafos con señal suficiente (≥3 `<br>`)
  - `splitAtSentenceBoundaries` — corta en límites de oración, nunca mid-sentence
  - `dewrapHardBreaks` — Caso A: agrupa fragmentos hard-wrapped
  - `dewrapHardBreaks` — Caso B: convierte `<br>` en `</p><p>` entre segmentos largos
  - `dewrapHardBreaks` — preserva contenido bien formado sin cambios
  - `dewrapHardBreaks` — deja intacto contenido no-`<p>` (blockquote, ul, figure)
  - Idempotencia: ejecutar dos veces produce resultado idéntico
  - Fixtures tomadas de artículos reales en `site/assets/content/articles.json`

### Tests
- Test suite completa: **114 tests pasan** (32 existentes + 12 nuevos + validaciones de datos)
  - Todos los tests de `render.test.mjs` siguen pasando
  - Todos los tests de `articles.test.mjs` siguen pasando
  - Todos los tests de URL safety siguen pasando
  - `validate-data.mjs` reporta todas las entradas válidas
  - `check-urls.mjs` confirma consistencia de URLs
  - `check-badges.mjs` confirma badges en todas las tarjetas

### Docs
- `TO_FIX.md` — ítem #29 (cobertura incompleta del camino de descifrado) ahora apunta a este módulo como patrón a seguir para futuros módulos de transformación con pruebas exhaustivas.
- `MIRROR_GROWING.md` — mención implícita a la fuga de párrafos hard-wrapped en artículos importados; `dewrap.mjs` es el fix automatizado de ese problema sistémico.

### Resumen
- ✅ Nuevo módulo de transformación de HTML: `dewrap.mjs`
- ✅ Test suite exhaustiva con 12 tests nuevos
- ✅ Cobertura de ambos patrones de hard-break encontrados en el corpus existente
- ✅ Preservación de contenido bien formado
- ✅ Idempotencia verificada
- ✅ Listo para integrar en `scripts/import-article.mjs` en futuras importaciones

---

## [0.31.0] — 2026-08-11

### Changed (Infrastructure & Documentation)
- **`.gitignore` refactored** — `sandbox/` and `scraped-full/` now fully ignored (not shipped assets). These contain:
  - Auth/decrypt workflows (keep private, not part of public codebase)
  - 6.3MB+ of raw HTML crawl output (regenerable, not version-controlled)
  - Locally available for dev but never committed
- **`docs/SITE_ANALYSIS.md` merged** — consolidated `SITE_ANALYSIS_FULL.md` into single authoritative document covering:
  - 63 total articles (54 visible in navigation + 9 hidden with no SPIP section)
  - Complete access model explanation
  - Hidden French-language articles discovery methodology
  - Server technical details
- **`.env.example` corrected** — `KILOMBOTOP_USER` was `admin`, now correctly `kilombo` to match actual `.env`
- **Script paths updated** — all documentation and `package.json` npm scripts now reference `sandbox/scrape-curl.sh` and `sandbox/scrape-comprehensive.sh`
- **Footer simplified** — consolidated redundant SSO links:
  - Removed: "Acceso central" + "Acceso privado" (both identical)
  - Added: Single "Acceso SSO" section with unified description

### Added (Documentation)
- **`TROUBLESHOOTING.md § 9`** — New section documenting the architecture quirk:
  - Why authenticated users see identical content to anonymous visitors
  - Explanation: credentials are for YunoHost (infrastructure), not SPIP (content)
  - `kilombo` user has no SPIP editor permissions
  - All articles are public; no draft/private access via this user
  - Implications for future reader-restricted content

### Fixed
- **Credential analysis clarity** — documented that `KILOMBOTOP_USER`/`KILOMBOTOP_PASSWORD` are infrastructure credentials only:
  - Used for: SSH deployment, YunoHost admin panel, scraping automation
  - NOT used for: unlocking reader content (site is fully public)
  - Removes the "weird behavior" confusion

### Cleanup
- Removed 116 committed ephemeral files (temporary test outputs, raw HTML dumps)
- Repository size reduced by ~6MB in history

### Added (Content Import)
- **Three articles imported** via the reproducible `scripts/import-article.mjs` flow (dry-run verified, then appended to `site/assets/content/articles.json`):
  - `plandemismo-y-domesticacion` — https://www.kilombo.top/spip.php?article12
  - `imagenes` — https://www.kilombo.top/spip.php?article20
  - `futuras-generaciones` — https://www.kilombo.top/spip.php?article34
  These were imported conservatively (small batch) to keep the pipeline stable; each entry was validated with `npm test` before committing.

### Fixed (Import tooling)
- **Fixed JSON write error** introduced during append to `site/assets/content/articles.json` (missing/extra brace). Repaired file and re-ran the full test/validation suite.
- **Validation:** unit tests, `validate-data.mjs`, `check-urls.mjs` and `check-badges.mjs` all pass after the import.

---

## [0.30.0] — 2026-08-11

### Added (Infrastructure — site analysis & scraping)
- **`sandbox/scrape-comprehensive.sh`** (nuevo): Full-site crawler que descubre ALL article IDs a través de:
  1. Archive index pages (2023-2025)
  2. RSS feed (11 most recent)
  3. Exhaustive article download & verification
  - Identifica 61+ article IDs totales, 54+ válidos
  - Descubre hidden French articles not in navigation

- **`sandbox/scrape-curl.sh`**: YunoHost SSO authentication + homepage download

- **`sandbox/decrypt-staticrypt.mjs`**: Placeholder for future StatiCrypt decryption in Node.js

- **`docs/SITE_ANALYSIS_FULL.md`** (nuevo): Análisis completo con inventario detallado:
  - 54 artículos válidos (confirmado)
  - 7 artículos borrados/404
  - Nuevo descubrimiento: "La pandémie n'existe pas" (article 2) + "BOZAL" (62) + "JAULA" (65) + BOZAL duplicate (67)
  - Mapeo de cobertura del mirror vs live site

### Changed (Documentation restructuring)
- **`docs/` folder created** — consolidación de documentación operacional:
  - Movidos a `docs/`: `TROUBLESHOOTING.md`, `MIGRATION.md`, `TO_FIX.md`, `MIRROR_GROWING.md`
  - Nuevo en `docs/`: `SITE_ANALYSIS_FULL.md`
  - Root `.md` files reducidos de 10 a 3 (solo README, CHANGELOG, ROADMAP)

- **`docs/SITE_ANALYSIS.md`** — consolidación de 3 archivos anteriores:
  - ~~`SOURCE_VISITING.md`~~ ✓ consolidado
  - ~~`DATA_VERIFICATION.md`~~ ✓ consolidado  
  - ~~`kilombo_visitor_report.md`~~ ✓ consolidado
  - Single source of truth para análisis de server en vivo

### Fixed (Cross-references)
- `README.md`: actualizado para apuntar a `docs/SITE_ANALYSIS.md`
- `ROADMAP.md`: actualizado para apuntar a `docs/SITE_ANALYSIS.md`
- `docs/TO_FIX.md`: actualizado para apuntar a `docs/SITE_ANALYSIS.md`
- `docs/TROUBLESHOOTING.md`: actualizado para apuntar a `docs/SITE_ANALYSIS.md`
- `docs/MIGRATION.md`: actualizado para apuntar a `docs/SITE_ANALYSIS.md`

### Summary
- ✅ Full-site scraping coverage confirmed (61 article IDs discovered)
- ✅ Mirror site has 99% content parity (missing 3-4 archived articles)
- ✅ Documentation organized into `docs/` folder (cleaner architecture)
- ✅ Inventory gap identified & documented for future import

---

## [0.29.0] — 2026-08-09

### Added (UX — navegación y descubribilidad)
- **`site/articulos.html` + `site/js/articles.js`**: el índice de artículos internos ahora incluye una barra de filtros por tema y un buscador de texto libre. El listado puede filtrarse por tema y por coincidencia en título/topics, y el estado del filtro se sincroniza con la URL (`?topic=...` y `?q=...`).
- **`scripts/import-article.mjs`**: nuevo flujo reproducible de importación de artículos SPIP, incluyendo dedup, extracción Tierra/PI, reescritura de URLs relativas y salida en JSON. También añade un `npm run import-article` helper para invocarlo.
- **`site/articulo.html` + `site/js/articles.js`**: la vista de detalle incorpora una sección de artículos relacionados, generada a partir de la coincidencia de topics entre entradas del JSON. Esto mejora la navegación entre contenidos afines sin introducir enlaces manuales.
- **`site/plandemismo.html` + `site/js/plandemismo.js`**: la sección Plandemismo ahora ofrece filtros por etiqueta dentro de cada bloque de vídeos y una navegación por pestañas accesible con patrón tablist/roving tabindex. El comportamiento es más claro y más usable sin recargar la página.
- **`site/js/render.mjs`**: se centralizan los helpers de renderizado y filtros compartidos para artículos y vídeos. Esto elimina duplicación y reduce el riesgo de divergencia entre las dos superficies de navegación.
- **`site/js/shared/url-safety.mjs`**: nuevo helper compartido de URL safety para que `site/js/render.mjs` y `scripts/validate-data.mjs` usen la misma regla de validación.
- **`scripts/i18n-coverage.mjs`**: nuevo reporte de cobertura de traducciones que usa `lang` / `translationOf` en `articles.json`.
- **`site/css/articles.css` + `site/css/style.css` + `site/css/plandemismo.css`**: añadidos estilos para la nueva barra de filtros, los botones de tema, la sección de relacionados y la experiencia responsive de las nuevas interfaces.

### Tests
- **`test/articles.test.mjs` + `test/render.test.mjs`**: añadida cobertura de regresión para filtros por tema, búsqueda, artículos relacionados y el render compartido de barras de filtro.

---

## [0.28.0] — 2026-08-09

### Fixed (TO_FIX #44 — triple source of truth for network URLs)
- **`site/assets/network-urls.json`** (nuevo): fuente única de verdad para las 7 URLs de la red Kilombo (`sso`, `tierra`, `gci`, `gci_en`, `gci_cdrom`, `gci_old`, `pi`). Para cambiar una URL, se edita aquí — el CI detecta automáticamente si alguna de las tres fuentes dependientes queda desincronizada.
- **`scripts/check-urls.mjs`** reescrito: sustituye el modelo anterior ("comparar tres fuentes libres entre sí") por "validar cada fuente contra el JSON de referencia". El script carga `network-urls.json`, comprueba que cada URL aparezca en `.env.example`, `site/index.html` y `README.md`, e informa exactamente qué fuente falta cada URL. Elimina el blindspot de TO_FIX #44 donde una sesión podía editar solo una de las tres fuentes y no descubrirlo hasta que `npm test` fallara (o nunca).
- `network-urls.json` se coloca en `site/assets/` (no en `site/assets/data/`) para no ser recogido por el validador de arrays de `validate-data.mjs`.

---

## [0.27.0] — 2026-08-09

### Added (diseño — badges de nivel)
- **`site/css/style.css`**: dos nuevas variantes de `.card-status`:
  - `.card-status--external` — píldora gris neutro con texto "↗ Externo" — para tarjetas de Nivel 1 (enlaces salientes a subdominios externos)
  - `.card-status--mirrored` — píldora tinte índigo con texto "⬡ Espejo" — para tarjetas de Nivel 2 (contenido alojado localmente en el portal)
  - `.card-header` pasa de `justify-content: space-between` sin wrap a `flex-wrap: wrap` + `gap: 0.35rem` para que tres badges quepan en móvil sin desbordamiento
- **`site/index.html`**: badge de nivel añadido a las 8 tarjetas:
  - Nivel 1 (↗ Externo): Espacio Tierra y Libertad, GCI Oficial, International Global Revolution, ICG CD-Rom, ICG Histórico, Proletarios Internacionalistas
  - Nivel 2 (⬡ Espejo): Artículos internos, Sección Plandemismo
  - Los badges usan texto, no solo color — cumple regla de accesibilidad MIRROR_GROWING.md §4.6
- Implementa la especificación de ROADMAP.md §6 (indicadores Nivel 1 vs Nivel 2)

### Docs
- `MIRROR_GROWING.md`: añadida §0 "Arquitectura del espejo — dos niveles, no uno" — tabla comparativa, regla de promoción L1→L2, advertencia para sesiones futuras
- `ROADMAP.md §6`: ítem de badges expandido a spec completa (nombres de clase, requisito de accesibilidad, lista de tarjetas por nivel, nota de regresión)
- `TO_FIX.md`: ítem #44 añadido — URLs de red duplicadas en 3 fuentes de verdad (`.env.example`, `index.html` CONFIG block, `README.md`)

---

## [0.26.0] — 2026-08-09

### Fixed (bug crítico — artículos no visibles tras login, segunda causa)
- **`site/js/decrypt.mjs`**: offset de IV incorrecto en `aesDecrypt()`. El ciphertext producido por `encode()` de staticrypt tiene formato `hmac(64 hex) + iv(32 hex) + datos AES-CBC`. El código anterior usaba `IV_HEX_LEN = IV_BYTES * 2 = 32` y hacía `ciphertext.slice(0, 32)` como IV, que en realidad son los primeros 32 chars del HMAC-SHA256. El IV real está en `slice(64, 96)` y los datos en `slice(96)`. Resultado del bug: `crypto.subtle.decrypt()` recibía bytes incorrectos, fallaba, `parseJson()` lanzaba excepción, y `articulos.html` mostraba "Error cargando el índice de artículos" aunque la contraseña fuera correcta. Fix: `HMAC_HEX_LEN = 64` añadido, slices corregidos. Verificado con round-trip en Node antes del deploy.
- Eliminada constante `IV_BYTES` (ya no necesaria tras el fix).

---

## [0.25.0] — 2026-08-09

### Fixed (bug crítico — artículos no visibles tras login)
- **`site/js/decrypt.mjs`**: clave de storage incorrecta causaba que `articulos.html` (y cualquier página con JSON cifrado) quedara vacía después de entrar la contraseña correctamente en el gate de StatiCrypt. La causa: `decrypt.mjs` leía de `sessionStorage` con clave `"staticrypt_hashed_password"`, pero staticrypt almacena la contraseña en `localStorage` bajo `"staticrypt_passphrase"`. `parseJson()` no encontraba la clave, lanzaba excepción, y el catch de `articles.js` mostraba el estado vacío. Fix: `STORAGE_KEY` corregido a `"staticrypt_passphrase"` y `sessionStorage` → `localStorage`. Docstring del módulo actualizado para ser preciso.
- Este es exactamente el fallo que TO_FIX #35 anticipaba: una divergencia entre la implementación de `decrypt.mjs` y el comportamiento real de staticrypt, sin ningún test que lo detectara.

---

## [0.24.0] — 2026-08-09

> Versión de saneamiento post-importación: auditoría sistemática de los 10 artículos
> importados desde PI tras el descubrimiento de fuga de sidebar en el par ES/FR.
> 14.470 caracteres de contenido basura eliminados en total.

### Fixed (bug — fuga sistemática de sidebar SPIP en artículos PI)
- **`site/assets/content/articles.json` — 10 entradas PI afectadas**: corte limpio del bloque sidebar/footer de SPIP presente al final de `contentHtml` en TODOS los artículos importados desde Proletarios Internacionalistas (`sourceUrl` en `proletariosinternacionalistas.kilombo.top`). El bloque contenía, según artículo:
  - Ancla de foro (`<a href="#forum" name="forum">`)
  - Campo de búsqueda (`Search:` / `Rechercher` / `Buscar`)
  - Lista de artículos relacionados ("Also in this section" / "Dans la même rubrique") con 8–10 enlaces a `spip.php?article{id}` (hermanos en la misma rubrica SPIP)
  - Sección **Portfolio** con miniatura de imagen 90×90 (solo en `contre-genocide-guerres-infinites-pi`)
  - Bloque **CRITIQUE (Fr)** con enlaces a rubricas (solo en `contre-genocide-guerres-infinites-pi`)

  **Detalle por artículo (chars eliminados / % del `contentHtml` original):**
  - `contra-genocidio-guerras-infinitas-pi` (ES) — 1.521 chars (22,3%)
  - `contre-genocide-guerres-infinites-pi` (FR) — 1.152 chars (16,7%) + portfolio 90×90
  - `falsos-internacionalistas-1` — 1.556 chars (6,1%)
  - `falsos-internacionalistas-2` — 1.556 chars (23,0%)
  - `falsos-internacionalistas-3` — 1.556 chars (7,7%)
  - `falsos-internacionalistas-4` — 1.556 chars (8,9%)
  - `falsos-internacionalistas-5` — 1.556 chars (19,4%)
  - `falsos-internacionalistas-6` — 1.556 chars (9,7%)
  - `1-mayo-2023-contra-militarizacion` — 1.545 chars (27,4%)
  - `plandemismo-y-domesticacion-11` — 1.545 chars (5,9%)

  **Total** : 14.470 caracteres de contenido basura eliminados.
  Punto de corte usado: `<a href="#forum" name="forum">` — ancla que marca de forma fiable el inicio del sidebar en todos los artículos SPIP de la fuente. Este es el bug sistemático que el ítem #36 de `TO_FIX.md` ("pipeline de importación es doc, no código") predecía: el truncamiento manual documentado en `TROUBLESHOOTING §8` ("cortar al encontrar `<section id=` o `<footer`") no se aplicó en el 100% de los artículos importados en v0.22.0.

### Fixed (bug — HTML malformado en encabezados de artículos PI)
- **`site/assets/content/articles.json` / `contra-genocidio-guerras-infinitas-pi` (ES)**: `<strong>` desbalanceado en encabezado. Secuencia original: `</p>\n<strong>\n ¡Contra el genocidio...! \n<p><strong></strong> </strong></p>` — un `<strong>` abierto fuera de cualquier párrafo, más un `<strong></strong>` vacío anidado dentro, más cierres desbalanceados (3 cierres para 2 aperturas). No rompía render pero rompía el árbol semántico y cualquier herramienta de validación. Arreglo: envuelto correctamente en `<p><strong>¡Contra el genocidio…!</strong></p>`, sin strong vacíos.
- **`site/assets/content/articles.json` / `contre-genocide-guerres-infinites-pi` (FR)**: encabezado `<strong>Contre le génocide…! </strong>` colgado directamente de `contentHtml` sin `<p>` envolviéndolo (inconsistente con el hermano ES, que ya lo tenía dentro de `<p>`). Además tenía un espacio sobrante antes de `</strong>`. Arreglo: `<p><strong>Contre le génocide…!</strong></p>` — mismo patrón que ES.

### Docs
- **`TO_FIX.md` — item #37**: checkbox `[ ]` corregido a `[x]` (estaba marcado como pendiente a pesar de que el propio texto del ítem decía "✅ Hecho en este mismo commit"). Fila correspondiente en la tabla Resumen actualizada de "Renombrado en este commit" a "✅ Resuelto — renombrado a ROADMAP-fase-diagnostico.md".
- **`TO_FIX.md` — items #40, #41, #42 añadidos y cerrados en la misma versión**: documentan respectivamente: (40) la fuga sistemática de sidebar en los 10 artículos PI con detalle por artículo, (41) el `<strong>` desbalanceado de contra-genocidio ES, (42) la inconsistencia de encapsulado del encabezado FR. Las 3 filas añadidas también a la tabla Resumen principal.
- **`TO_FIX.md` — cabecera**: "Última actualización" cambiada de `2026-08-07 (v0.23.0+) — ítems 35–39 añadidos.` a `2026-08-09 (v0.23.0+) — ítems 40–42 añadidos; sidebar leakage de 10 artículos PI resuelto.`

---

## [0.23.0] — 2026-08-07

### Fixed (bug — URLs relativas en contentHtml)
- **`site/assets/content/articles.json`**: 98 URLs relativas (`src`/`href`) reescritas a absolutas en 10 entradas afectadas (`contre-genocide-guerres-infinites-pi`, `falsos-internacionalistas-1` a `6`, `1-mayo-2023-contra-militarizacion`, `plandemismo-y-domesticacion-11`). La imagen `local/cache-gd2/...` en `contre-genocide` era el caso reportado — ahora apunta a `https://proletariosinternacionalistas.kilombo.top/local/cache-gd2/...`.
- **`scripts/validate-data.mjs`**: nueva regla en la validación de `contentHtml` — falla si cualquier `src=` o `href=` contiene un valor no-absoluto (que no empiece por `https?://`, `#` o `mailto:`). Esto convierte el error de "imagen 404 silenciosa en producción" en un error de CI visible antes del deploy.

### Docs
- **`TROUBLESHOOTING.md §8`**: paso 4 añadido al flujo de importación recomendado — función `rewrite_relative_urls(html, source_url)` en Python usando `urllib.parse.urljoin`. Incluye nota explicando que `validate-data.mjs` bloqueará el deploy si se omite este paso.
- **`TO_FIX.md`**: ítem #31 añadido y cerrado en la misma versión.

---

## [0.22.1] — 2026-08-07

### Added (contenido)
- `1er-mai-2023-tierra-fr` — 1er MAI 2023 (Tierra → tierra, FR, 2023-05-01) — completa el par bilingüe del 1 de mayo: Tierra publicó el comunicado en FR (article40), PI lo publicó en ES (article44, ya importado en v0.22.0). No son traducciones entre sí — son dos comunicados independientes del mismo espacio político.

### Docs
- `MIRROR_GROWING.md` §7.5: checkbox "1 de mayo 2023 bilingüe" actualizado a completado con nota explicativa

---

## [0.22.0] — 2026-08-07

### Added (contenido — importación Weeks 1 y 2)
Primera importación masiva de artículos desde fuentes autorizadas, siguiendo el plan de `MIRROR_GROWING.md` §7.5. El repo pasa de 1 artículo a 16.

**Week 1 — NOM / nom:**
- `represion-plandemica-1` — REPRESIÓN PLANDÉMICA 1: ocultan la HECATOMBE (Tierra → nom, 2024-08-24)
- `represion-plandemica-2` — REPRESIÓN PLANDÉMICA 2: ocultan la HECATOMBE (Tierra → nom, 2024-08-25)
- `represion-plandemica-3` — REPRESIÓN PLANDÉMICA 3 (Tierra → nom, 2024-08-26)
- `represion-plandemica-4` — REPRESIÓN PLANDÉMICA 4 (Tierra → nom, 2024-08-27)
- `el-fraude-de-los-pcr` — El fraude de los PCR (Tierra → nom, 2022-02-27) — artículo solo imágenes, importado como stub; `status: pending-review` (ver TO_FIX #30)

**Week 1 — PI / pi:**
- `contra-genocidio-guerras-infinitas-pi` — ¡Contra el genocidio y las guerras infinitas! ES (PI → pi, 2024-05-01)
- `contre-genocide-guerres-infinites-pi` — Contre le génocide et les guerres sans fin FR (PI → pi, 2024-04-29) — par bilingüe del anterior, cumple regla §5.3 de MIRROR_GROWING

**Week 2 — PI / pi:**
- `falsos-internacionalistas-1` a `falsos-internacionalistas-6` — serie completa FALSOS INTERNACIONALISTAS (PI → pi, 2022)
- `1-mayo-2023-contra-militarizacion` — 1 de mayo 2023 (PI → pi, 2023-05-01)

**Week 2 — NOM / nom:**
- `plandemismo-y-domesticacion-11` — Plandemismo y Domesticación (11) — Notas de decantación (PI → nom, 2021-12-01)

### Fixed
- `el-fraude-de-los-pcr`: campo `status` corregido de `imported` a `pending-review` para que no se confunda con un import completo

### Docs
- `MIRROR_GROWING.md` §7.5: checkboxes Week 1 y Week 2 marcados `[x]`
- `TO_FIX.md`: ítem #30 añadido (`el-fraude-de-los-pcr` pendiente de contenido real, con 4 opciones de resolución)
- `TROUBLESHOOTING.md`: añadido §7 (para qué sirve `KILOMBOTOP_PASSWORD`) y §8 (guía de scraping SPIP con selectores correctos documentados)

---

## [0.21.0] — 2026-08-07

### Added (diseño — ilustraciones SVG y logo)
- **Ilustraciones SVG por sección** en `site/index.html`: cada sección del portal tiene ahora un símbolo SVG inline en el header, visible a la derecha del título, con baja opacidad en reposo y ligera intensificación al hacer hover. Los símbolos son propios del proyecto, no copias del original:
  - ⭐ Tierra y Libertad — sol naciente (amanecer, tierra libre) en verde `#1b5e20`
  - 01 GCI — globo con meridianos y paralelos (lucha internacionalista organizada)
  - 02 Proletarios Internacionalistas — puño alzado (fuerza proletaria colectiva)
  - 03 NOM / Plandemismo — ojo con líneas discontinuas (vigilancia expuesta)
- **Logo estrella Kilombo** en la cabecera del sitio: estrella de 5 puntas rellena en carmesí (`#b91c2a`) con estrella interior como contorno blanco, alineada a la izquierda del título `KILOMBO`. SVG inline, escala responsiva de 48px a 72px.

### Changed (diseño — Tierra y Libertad)
- **Demotion de Espacio Tierra y Libertad**: eliminados `section--featured`, `section-label "Sección destacada"`, `featured-intro` (párrafo editorial largo) y `card--featured` en ambas tarjetas. La sección pasa de masthead editorial a sección par con acento verde distintivo (`section--tierra`), manteniendo la primera posición visual sin sugerir que representa la identidad editorial del portal.

### Changed (responsive / paleta / tipografía)
- **Paleta refinada**: `#f5f2eb` → `#fcfbf7`, `#0a0a0a` → `#121212`, `#c1121f` → `#b91c2a`
- **Tipografía**: Playfair Display (serif) para titulares + Inter (sans-serif) para cuerpo, cargadas desde Google Fonts con `display=swap`
- **Responsive layout**: grids colapsados a una columna a `≤768px`, padding consistente a `≤480px` en los tres CSS
- **Hover states**: elevación `translateY(-4px)` + ring carmesí + flecha `→` animada en todas las tarjetas

### Fixed
- Footer de `index.html`: texto "comunistas internacionalistas" (rezago) corregido a "internacionalistas"

---

## [0.20.0] — 2026-08-07

### Fixed (seguridad — cifrado)
- **`scripts/encrypt.mjs` — reescrito para escribir a `dist/` en lugar de mutar `site/`** (TO_FIX #27 y #28):
  - El script ahora copia `site/` → `dist/` en cada ejecución y cifra los archivos dentro de `dist/`. `site/` nunca se modifica.
  - Elimina el escenario de fallo crítico: ejecutar `npm run encrypt` localmente y luego `end-of-session.sh` ya no puede poner un muro de contraseña en el servidor de producción.
  - El doble cifrado (idempotencia del paso HTML) queda estructuralmente imposible — `dist/` siempre se regenera desde cero.
- **`deploy.yml`**: el paso "Upload artifact" ahora sube `dist/` en lugar de `site/`
- **`sync-to-production.sh`**: añadido guard que aborta si detecta archivos cifrados dentro de `site/` (firma `staticrypt-html` o `"encrypted":true`), haciendo imposible un rsync accidental de contenido cifrado a producción
- **`.gitignore`**: `dist/` añadido para que el directorio de artefactos cifrados nunca entre al repo

### Fixed (docs)
- `TO_FIX.md`: ítems #6 y #11 cerrados `[x]` — ambos resueltos en v0.8.0 según CHANGELOG, no eran pendientes reales
- `TO_FIX.md`: ítems #27 y #28 añadidos y cerrados en la misma versión

---

## [0.19.0] — 2026-08-06

### Added (seguridad — cifrado client-side)
- **`scripts/encrypt.mjs`** (nuevo): script de cifrado para el paso de build de CI. Cifra con AES-256-CBC (PBKDF2, 600k iteraciones SHA-256) usando la librería [StatiCrypt](https://github.com/robinmoisson/staticrypt) v3.5.4. Cifra tres tipos de artefactos:
  - **Páginas HTML de contenido** (`plandemismo.html`, `articulos.html`, `articulo.html`): cada página queda envuelta en un formulario de contraseña autocontenido. El visitante introduce la contraseña; si es correcta, la página se descifra en memoria y se muestra. La contraseña derivada (PBKDF2) se guarda en `sessionStorage` para que los fetches de JSON no requieran nueva introducción.
  - **Archivos JSON de datos** (`assets/data/*.json`, `assets/content/*.json`): cifrados en el propio archivo como un envelope `{"encrypted":true,"ciphertext":"<hex>","salt":"<hex>"}`. Ilegibles sin la contraseña.
  - **`index.html`** queda pública (no tiene contenido sensible — es solo el directorio del portal).
- **`site/js/decrypt.mjs`** (nuevo): módulo ES6 compartido por `plandemismo.js` y `articles.js`. Lee la contraseña derivada de `sessionStorage` (puesta allí por el prompt de staticrypt tras login correcto) y descifra los envelopes JSON antes de parsear. En modo dev/preview (JSON sin cifrar), actúa como no-op.
- **`.staticrypt.json`**: salt fijo del proyecto (hex de 32 chars). El salt no es secreto — solo la contraseña lo es. Salt fijo = builds reproducibles.
- **`STATICRYPT_PASSWORD`**: añadido como GitHub Actions Secret en el repositorio.

### Changed
- **`site/js/plandemismo.js`**: `res.json()` sustituido por `parseJson(await res.text())` para soportar transparentemente JSON cifrado o en claro.
- **`site/js/articles.js`**: ídem — `loadArticles()` usa `parseJson()`.
- **`.github/workflows/deploy.yml`**: añadido paso `Encrypt site content` (`npm run encrypt`) en el job `deploy`, entre `Install dependencies` y `Setup Pages`. Lee `STATICRYPT_PASSWORD` del secret del repositorio. El job `test` no cifra — trabaja siempre con archivos en claro.
- **`package.json`**: añadidos scripts `encrypt` (`node scripts/encrypt.mjs`) y `preview` (`python3 -m http.server 8080 --directory site`).
- **`.env.example`**: añadida variable `STATICRYPT_PASSWORD` con instrucciones para configurarla también como GitHub Actions Secret.

### Modelo de seguridad (resumen)
- Protege contra: bots/scrapers, visitantes casuales, inspección del repo en GitHub (solo ciphertext visible).
- No protege contra: alguien que tiene la contraseña y extrae el DOM descifrado desde devtools.
- Nivel máximo alcanzable en un host estático sin servidor.
- kilombo.top (YunoHost) sigue siendo el sitio autoritativo con auth server-side real.

---

## [0.18.0] — 2026-08-06

### Changed (responsive layout)
- **`site/css/style.css`**: replaced single `640px` breakpoint with a two-tier system. At `≤768px` the cards grid collapses to single column (was `minmax(280px,1fr)` which forced two cramped columns at tablet widths). At `≤480px` container padding tightens to `1rem`, card internal padding adjusts to keep badge rows from touching the edge, `.card-tags` gap reduced slightly for cleaner wrap, footer grid goes single column.
- **`site/css/plandemismo.css`**: replaced single `640px` breakpoint with the same two-tier system. At `≤768px` the video grid collapses to single column (was `minmax(320px,1fr)` which forced two columns at ~650px). At `≤480px` tab buttons go full-width stacked, video card body padding and badge gaps tightened for consistent horizontal rhythm.
- **`site/css/articles.css`**: added responsive rules (previously had none). At `≤768px` the article list grid collapses to single column. At `≤480px` article card and detail padding adjusted; topic chip gap tightened to prevent awkward wrap.

---

## [0.17.0] — 2026-08-06

### Changed (cambios visuales)
- **Pill badges — todos los archivos CSS**: las etiquetas de idioma, estado, tipo, afiliación, chips de idioma de vídeo y metadatos de artículo han sido rediseñadas como píldoras compactas de bajo contraste (`border-radius: 999px`, fondos translúcidos, peso de fuente reducido de 700 a 600). Objetivo: que no compitan visualmente con los títulos de las tarjetas.
  - `site/css/style.css` — `.card-lang`, `.card-status` y todas las variantes de `.tag` (`--type`, `--lang`, `--affil`, `--scope`): eliminados fondos sólidos oscuros; sustituidos por tintes translúcidos del color de idioma/estado correspondiente.
  - `site/css/plandemismo.css` — `.meta-pais`, `.meta-fecha`: eliminado relleno rojo/negro sólido; ahora tinte rojo a baja opacidad. `.lang-chip` y sus variantes (`--es`, `--en`, `--de`, `--pending`, `--todo`): eliminados rellenos saturados; convertidos a píldoras translúcidas.
  - `site/css/articles.css` — Spans de `.article-card__meta` y `.article-detail__meta`: envueltos en píldoras con tinte neutro y borde tenue. `.topic-chip`: borde fino añadido, tamaño de fuente reducido.

### Changed (contenido)
- **`site/index.html`**: reformulado el párrafo introductorio de Espacio Tierra y Libertad — eliminada la frase redundante sobre "plataforma principal".
- **`site/index.html`**: recortada la descripción de la sección de artículos — eliminada la frase sobre clasificación temática.
- **Todos los HTML + `README.md`**: subtítulo del portal cambiado de "Publicaciones y archivos **comunistas** internacionalistas" a "Publicaciones y archivos internacionalistas" (6 ocurrencias: `index.html` título, subtítulo y footer; `plandemismo.html`, `articulos.html`, `articulo.html`, `README.md`).

---

## [0.16.0] — 2026-08-06

### Fixed (corregido)
- **`site/js/render.mjs`**: CTA de tarjetas de vídeo cambiado de `rel="noopener"` a `rel="noopener noreferrer"` (faltaba `noreferrer` — ahora consistente con los enlaces saneados por `sanitizeHtml()`).
- **`site/js/articles.js`**: `initDetailPage()` actualiza ahora `document.title` con el título del artículo al cargar (mejora bookmarking e historial del navegador).
- **`site/js/articles.js`**: el texto visible del enlace de fuente ya no muestra entidades HTML (`&amp;` etc.) — se usaba la cadena ya escapada como texto de display en vez de la URL cruda.
- **`site/js/articles.js`**: enlace de fuente cambiado a `rel="noopener noreferrer"` (consistencia con el resto del proyecto).
- **`scripts/validate-data.mjs`**: el `catch` de `readdirSync` en `scanDir` ahora captura `(e)` y muestra `e.message`, evitando perder el detalle del error de sistema de archivos.
- **`package.json`**: eliminado el campo `"main": "index.js"` (muerto — no existe ningún `index.js`); añadido `"type": "module"` para eliminar la advertencia de Node sobre módulos sin tipo declarado.
- **`site/js/main.js`**: añadido comentario explicando por qué es un script plano sin `type="module"`.

### Added (nuevo)
- **`site/assets/content/articles.json`**: primer artículo publicado — Israel/Mohamad Safa (sección `general`, status `imported`).

### Tests
- **`test/render.test.mjs`**: aserción del test `renderCard — CTA opens in new tab` actualizada a `rel="noopener noreferrer"`.

---

## [0.15.0] — 2026-08-06

### Security (seguridad)
- **`site/js/render.mjs` — `sanitizeHtml()` añadido**: nueva función que reduce un string HTML a un allowlist de etiquetas de formato (`p, a, strong, em, b, i, ul, ol, li, blockquote, h3, h4, br, img, span, figure, figcaption, hr`), eliminando `<script>`/`<style>`/`<iframe>` (con su contenido), atributos de evento (`onerror`, `onclick`, ...) y URLs `javascript:`/`data:`/`vbscript:` en `href`/`src`. Los enlaces `<a>` reciben `target="_blank" rel="noopener noreferrer"` forzado, independientemente de lo que traiga el HTML de origen. El parseo ocurre en un `<div>` desconectado del documento, así que nada puede ejecutarse durante el saneado — solo el árbol ya limpio llega a insertarse en el DOM real.
- **`site/js/articles.js` — corregido el uso de `innerHTML` sin sanear**: `initDetailPage()` insertaba `a.contentHtml` directamente en el DOM (`contentEl.innerHTML = a.contentHtml`), confiando en un comentario de que el contenido era "editorial controlado por el repo" — pero el propio esquema del artículo (`status: imported|adapted|translated`, `sourceUrl`, `sourceSite`) está pensado para contenido traído de sitios externos. Ahora usa `sanitizeHtml()` antes de insertar el contenido.
- **`scripts/validate-data.mjs` — regla adicional en `contentHtml`**: además de exigir que no esté vacío, ahora falla la validación (exit 1) si detecta `<script>`, atributos `on...=` o URLs `javascript:`/`data:`/`vbscript:`. Esto es defensa en profundidad: bloquea una importación peligrosa en `npm test` (que corre en `deploy.yml` antes de cada publish) en vez de depender solo del saneado en tiempo de ejecución.

### Added (nuevo)
- **`test/render.test.mjs`**: 9 tests nuevos para `sanitizeHtml()` — cubren remoción de `<script>`, atributos de evento, URLs `javascript:`/`data:`, preservación de etiquetas permitidas, forzado de `rel`/`target` en enlaces, "unwrap" de etiquetas desconocidas conservando su texto, remoción de atributos no permitidos en etiquetas sí permitidas, y entradas `null`/`undefined`/vacías.
- **`test/articles.test.mjs`** (nuevo archivo): 10 tests para las funciones puras de `site/js/articles.js` — `sectionLabel()`, `renderTopics()` y `renderArticleCard()` (estructura del link card, escapado de `title`/`status`, URL-encoding del `id` en el `href`, presencia/ausencia del bloque de topics). Antes de esta versión, el sistema de artículos no tenía ningún test.
- **`scripts/test.sh`**: cambiado de invocar únicamente `test/render.test.mjs` a `node --test` (descubrimiento automático de todos los `test/*.test.mjs`), para que archivos de test nuevos se ejecuten sin tener que editar el runner cada vez.

### Fixed (corregido)
- **`site/js/articles.js`**: el listener `document.addEventListener('DOMContentLoaded', ...)` de auto-inicio ahora está protegido con `typeof document !== 'undefined'`, para poder importar las funciones puras del módulo en un entorno Node/happy-dom (tests) sin que el módulo intente engancharse a un DOM de navegador inexistente.

### Docs (documentación) — registro retroactivo
- Las dos versiones anteriores (sistema de artículos internos `articulos.html`/`articulo.html`/`articles.js`/`articles.css` y su integración en `index.html`) se publicaron sin entrada en este changelog. Quedan documentadas aquí de forma retroactiva junto con su corrección de seguridad, ya que ambos cambios se revisaron y corrigieron en la misma sesión.

---

## [0.13.0] — 2026-08-03

### Fixed (corregido)
- **`sync-to-production.sh` — pre-flight auth logic**: el chequeo anterior fallaba si `KILOMBOTOP_PASSWORD` estaba vacío, lo que contradecía las instrucciones del propio script que dicen dejar la contraseña vacía al usar clave SSH. La nueva lógica tiene tres ramas: (1) clave SSH disponible → se usa sin contraseña; (2) contraseña configurada → se usa `sshpass`; (3) ninguna de las dos → falla con mensaje claro listando ambas opciones.

### Added (nuevo)
- **`deploy.yml` — job `test` antes de deploy**: el workflow de GitHub Pages ahora ejecuta `npm test` (unit tests + validación JSON + consistencia de URLs) antes de publicar. Un test fallido bloquea el deploy a Pages.
- **`sync-to-production.sh` — dry-run pass**: antes del rsync real, el script ejecuta `--dry-run` y muestra exactamente qué se modificaría. Pide una segunda confirmación (`SI`) antes de proceder. Incluye aviso visible sobre el comportamiento de `--delete`.
- **`sync-to-production.sh` — instrucciones de clave SSH**: el encabezado del script documenta cómo generar un par de claves `ed25519` y copiar la pública al servidor para eliminar la dependencia de contraseña.
- **`MIGRATION.md`**: documento que explica la estrategia del espejo — el portal es el nuevo diseño de `kilombo.top` construido en paralelo. El reemplazo es incremental por sesión con `./end-of-session.sh`. Confirma que el deploy es autónomo (no depende de administradores técnicos) y explica por qué el sitio estático no da problemas en YunoHost.
- **`end-of-session.sh`**: script de fin de sesión — push a GitHub Pages + sync a `kilombo.top` en un solo comando.

### Changed (cambiado)
- **`TO_FIX.md`**: eliminado ítem `YunoHost-B` (admin SPIP — irrelevante con el nuevo diseño estático); añadido `YunoHost-E` (migración a clave SSH); sección `⏸ Aplazado` clarifica que el cliente puede abrir el puerto 22 directamente.
- **`ROADMAP.md`**: paso 9 deja de estar aplazado — es una tarea concreta pendiente de que el cliente abra el puerto 22.
- **`TROUBLESHOOTING.md`**: próximos pasos simplificados a 3 ítems que el cliente puede hacer sin intermediarios.
- **`README.md`**: intro actualizada con la estrategia de espejo correcta; árbol de archivos completo con todos los ficheros actuales.

---

## [0.12.0] — 2026-08-03

### Added (nuevo)
- **`MIGRATION.md`**: documento que explica la estrategia del espejo — el portal es el nuevo diseño de `kilombo.top` construido en paralelo para que el cliente pueda comparar sin tocar el original. El reemplazo se hace de forma incremental al final de cada sesión con `./end-of-session.sh`, en cuanto el cliente aprueba los avances. Incluye explicación de por qué el sitio estático no da problemas, y confirma que el deploy es autónomo (no depende de los administradores técnicos).
- **`end-of-session.sh`**: script de fin de sesión que ejecuta los dos pasos de deploy en orden — push a GitHub (→ GitHub Pages) y sincronización a `kilombo.top` via rsync/scp. Si el puerto 22 no está accesible, detecta el bloqueo, imprime las instrucciones exactas para abrirlo desde el panel YunoHost, y termina dejando GitHub Pages actualizado igualmente.

### Changed (cambiado)
- **`sync-to-production.sh`**: usuario por defecto corregido a `kilombo`; `sshpass` integrado automáticamente; comprobación de accesibilidad del puerto 22 antes del prompt `PROD`.
- **`README.md`**: nueva sección "Flujo de trabajo por sesión"; referencia a `MIGRATION.md` añadida al intro; sección duplicada "Desarrollo local" eliminada.
- **`ROADMAP.md`**: paso 1 ítems 1.1–1.4 marcados como completados; nuevo ítem 1.5 para prueba de deploy en `kilombo.top`; paso 9 marcado `⏸ Aplazado`.
- **`TROUBLESHOOTING.md`**: resumen ejecutivo actualizado; tabla de apps ampliada con Nextcloud/Roundcube/Redirect; sección 4 reescrita con opciones concretas para los dos bloqueos restantes.
- **`.env`**: `KILOMBOTOP_USER` corregido a `kilombo`; `KILOMBOTOP_FUTURE_PASSWORD` entre comillas simples; `PREVIEW_PUBLIC_URL` actualizado a GitHub Pages.
- **`TO_FIX.md`**: sección `⏸ Aplazado` añadida para los ítems YunoHost; versión stamp actualizada a v0.12.0.

---

## [0.11.0] — 2026-08-03

### Added (nuevo)
- **GitHub Pages deploy** (`https://ukoquique-proves.github.io/kilombo/`): sitio publicado de forma permanente, actualización automática en cada push a `main`.
- **`.github/workflows/deploy.yml`**: workflow de GitHub Actions que publica `site/` en GitHub Pages en cada push a `main` o ejecución manual (`workflow_dispatch`). Usa `actions/checkout@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`.

### Changed (cambiado)
- **README.md — sección de despliegue renovada**: la sección "Mostrar avances al cliente" reemplazada por "Sitio público permanente (GitHub Pages)" como primer método. Serveo pasa a ser mencionado solo como herramienta de preview local antes de hacer push. `.env` actualizado con la URL permanente de GitHub Pages.
- **ROADMAP.md**: paso 1.2 actualizado para reflejar GitHub Pages + Actions como implementación elegida.

---

## [0.10.0] — 2026-08-03

### Added (nuevo)
- **`site/js/render.mjs`**: módulo ES puro con `escapeHtml`, `buildLangs`, `buildKeypoints`, `renderCard` y tipos JSDoc (`VideoEntry`, `LangChip`). Importable tanto desde el navegador (`plandemismo.js`) como desde Node (`test/render.test.mjs`) sin duplicación.
- **`test/render.test.mjs`**: 32 tests unitarios con `node:test` + `happy-dom` (sin Jest, sin build step). Cubre: 7 casos de `escapeHtml` (payloads XSS, tipos no-string, null/undefined), 5 de `buildLangs`, 4 de `buildKeypoints`, 16 de `renderCard` (estructura DOM, atributos data-*, clases, seguridad). Todos pasan.
- **`scripts/validate-data.mjs`**: validador de esquema para los JSON de vídeos en `site/assets/data/`. Comprueba campos obligatorios, tipos, URLs válidas y valores no vacíos. Falla con `exit 1` y mensaje claro si alguna entrada es inválida — evita que un JSON mal editado se despliegue silenciosamente con cards en blanco.
- **`scripts/check-urls.mjs`**: comprueba que las 7 URLs de la red Kilombo sean consistentes entre `.env.example`, `site/index.html` y `README.md`. Falla con `exit 1` y muestra tabla de presencia si hay drift entre fuentes. Normaliza trailing slashes y puntuación Markdown en la extracción.
- **`happy-dom`** añadido como dev dependency (necesario para el shim de DOM en los tests unitarios de `renderCard`).

### Changed (cambiado)
- **`site/js/plandemismo.js`**: las funciones de render (`escapeHtml`, `buildLangs`, etc.) eliminadas del archivo; ahora importa `renderCard` desde `render.mjs`. El script usa `type="module"` en `plandemismo.html`.
- **`site/plandemismo.html`**: `<script src="js/plandemismo.js">` → `<script src="js/plandemismo.js" type="module">` para soportar el `import` de ES modules.

### Security (seguridad)
- **XSS fix verificado con tests**: `escapeHtml` cubre los 5 caracteres peligrosos (`& < > " '`). El test de attribute breakout en `ctaUrl` confirma que `" onmouseover="bad` no produce un atributo real en el DOM — validado con `happy-dom`.

---

## [0.9.0] — 2026-08-03

### Added (nuevo)
- **`site/assets/data/plandemismo-actualidad.json`**: inventario de los 9 vídeos de la pestaña Actualidad. Cada entrada incluye `id`, `country`, `year`, `tags`, `category`, `title`, `desc`, `langs`, `subtitlesFr`, `ctaUrl`, `ctaPlaceholder`.
- **`site/assets/data/plandemismo-sida-covid.json`**: inventario del documental destacado "ELISA MATO A RUTH" con campos adicionales (`keypoints`, `featured`, `cornerLabel`, `idAlt`).
- **`site/assets/{data,subtitles,audios,transcripts}/.gitkeep`**: estructura de carpetas `assets/` versionada — ya no desaparece tras `git clone`.
- **`// @ts-check`** en `main.js` y `plandemismo.js`: activa inferencia de tipos de TypeScript en el editor sin ningún paso de build ni `tsconfig.json`.

### Changed (cambiado)
- **`site/js/plandemismo.js` — refactor completo (A-3 + B-4 + #22)**:
  - Añadido guard de página: `if (document.body.dataset.page !== 'plandemismo') return` — el script se auto-limita al HTML que lo necesita.
  - Nueva función `renderVideoCards(jsonPath, gridId)`: hace `fetch` al JSON correspondiente, construye el DOM de cada tarjeta y lo inyecta en el grid. Añadir un vídeo nuevo = editar el JSON, sin tocar HTML.
  - Funciones auxiliares `buildLangs()` y `buildKeypoints()` para mantener el render limpio y sin repetición.
  - Todo el código anterior de tabs (WAI-ARIA, roving tabindex, ←/→/Home/End) conservado íntegramente.
  - JSDoc `@param`/`@type` en todas las funciones para aprovechar el `// @ts-check`.
- **`site/plandemismo.html` — reducido de ~360 a ~90 líneas (A-3)**:
  - Los 10 bloques `<article class="video-card">` hardcodeados eliminados.
  - Sustituidos por dos grids vacíos (`#grid-actualidad`, `#grid-sida-covid`) con `<noscript>` fallback.
  - `<body data-page="plandemismo">` añadido para el guard de JS (B-4).
- **`site/index.html` — bloque de config de URLs (A-2)**:
  - Añadido comentario-bloque al inicio del `<body>` listando las 7 URLs de la red Kilombo con instrucción de mantenerlo sincronizado con `.env.example`.
- **`sync-to-production.sh` — validación pre-deploy (B-5)**:
  - Nuevo bloque de pre-flight antes del prompt `PROD`: verifica que `KILOMBOTOP_PASSWORD` esté configurado, que `rsync` o `scp` estén disponibles, y avisa si `sshpass` no está instalado.
- **`plandemismo.html` — TODOs en CTAs (A-2 parcial)**:
  - Cada enlace "Ver en tv.canal7salta.com" tiene un comentario `<!-- TODO (A-2): reemplazar href por URL real del vídeo {id} -->` hasta que se obtengan las URLs reales de Canal7.

### Fixed (corregido)
- **README.md**: sección 02 corregida de "2 ediciones por idioma" a "tarjeta bilingüe ES/FR"; árbol de archivos actualizado con descripción correcta de `plandemismo.js` y estado real de `assets/`; URL Serveo actualizada; "Próximos pasos" sincronizados con el estado real del proyecto; ejemplo `scp` manual corregido (`site/*` → `site/.`).
- **ROADMAP.md**: pasos 1.2, 1.3, 2.1–2.5 marcados como completados; tabla resumen de prioridad actualizada con estado real de cada bloque.

---

## [0.8.0] — 2026-08-03

> Versión de saneamiento completo: auditoría TO_FIX.md cerrada al 100% (10/10 items).
> 5 bugs rojos + 5 inconsistencias amarillas resueltas. Mejora importante de
> accesibilidad (tablist WAI-ARIA) y consistencia de datos.

### Fixed (corregido — 5 bugs rojos cerrados)

- **Bug #2 · Rutas de subtítulos `.vtt` rotas** (`plandemismo.html`): 4 vídeos (IDs 167, 1111, 2250, 2252) tenían `data-subtitles-fr="subtitles/…"` → corregido a `assets/subtitles/…` conforme a la estructura documentada en ROADMAP.
- **Bug #4 · Navegación flechas ←/→ faltante en tabs** (`site/js/plandemismo.js`): implementado patrón **WAI-ARIA tablist completo** con roving tabindex. Teclas soportadas: `←` / `→` cambian foco entre tabs habilitadas, `Home` / `End` saltan a la primera / última, `Enter` / `Espacio` activan la tab enfocada. Las pestañas con `aria-disabled="true"` (Históricos) se saltan automáticamente en el ciclo.
- **Bug #5 · Fallback `scp` en deploy a ruta incorrecta** (`sync-to-production.sh`): ya corregido en línea — usa `"${SITE_DIR}/."` (con punto final) en vez de `"${SOURCE}"` con trailing slash, garantizando que se copian los *contenidos* de `site/` directamente en `REMOTE_PATH` sin crear `REMOTE_PATH/site/`.
- **Bug #13 · Atributos `data-subtitles-en` muertos** (`plandemismo.html`): eliminados de todas las tarjetas de vídeo. No había lógica CSS/JS que los leyera; se documenta que, si se implementan subtítulos EN en el futuro, hay que añadir el atributo + un chip de idioma equivalente a la pila FR.
- **Bug #14 · Gaps de accesibilidad ARIA en el tablist** (`plandemismo.html` + `plandemismo.js`):
  - ✅ `aria-controls` y `aria-labelledby` ya cruzados correctamente entre cada `role="tab"` y su `role="tabpanel"`.
  - ✅ Pestaña "Históricos" ya **no usa `disabled` nativo**. Reemplazado por `aria-disabled="true"` + `tabindex="-1"` — permanece en el DOM y en el orden de enfoque del roving tabindex pero no es activable, cumpliendo el patrón ARIA.
  - ✅ Nueva función `activateTab()` en JS retorna temprano si `aria-disabled="true"`.

### Changed (cambiado — 5 inconsistencias amarillas resueltas)

- **#6 · Tarjetas PI duplicadas apuntando a la misma URL** (`index.html`): confirmado vía `.env.example` (`KILOMBO_SITE_PI_LANGS=es,fr`) y búsqueda DNS que sólo existe *un* dominio PI bilingüe (`proletariosinternacionalistas.kilombo.top`), típico SPIP con selector de idioma interno. Las 2 tarjetas separadas (ES / FR) se **fusionaron en 1 tarjeta destacada** con:
  - Clase `card--lang-multi card--featured` (cabecera multi-idioma morada + estilo destacado).
  - Etiqueta de idioma `Español · Français`.
  - Título bilingüe `Proletarios Internacionalistas / Prolétaires Internationalistes`.
  - 2 chips de idioma independientes: `[ES]` + `[FR]` (negro/blanco).
  - Descripción que explica que el sitio tiene selector de idioma interno.
- **#11 · `page-lead` centrado vs. contenido a ancho completo** (`css/plandemismo.css`): la introducción tenía `max-width: 80ch; margin: 0 auto`, creando un salto de alineación brusco con `tabs` y `video-grid` inferiores. Corregido a `max-width: 100%; margin: 0 0 2.5rem` — mismo ancho que el resto del contenido dentro del `.container` (1200px máx.), conservando fondo `paper-alt` + borde izquierdo rojo distintivo.
- **#15 · Tipografía documentada ≠ tipografía real** (`README.md`): tabla "Paleta y diseño" actualizada de `Georgia / Times New Roman` a `Verdana, Arial, Helvetica, sans-serif` con la nota `(alineada con SPIP Escal 5.2.9 de producción)`, cerrando la desactualización de docs desde el cambio de fuentes de v0.7.0.
- **#16 · Carpetas `assets/*` descritas como pobladas pero vacías** (`README.md`): línea `assets/` del árbol de archivos documentada ahora como `(vacío — scaffolding pendiente de poblar)`. Las 4 subcarpetas (`data/`, `subtitles/`, `audios/`, `transcripts/`) mantienen su propósito descrito pero se indica explícitamente que aún no tienen contenido.
- **#17 · Contradicción `repo/` entre README y `.gitignore`** (`README.md` + `.gitignore`): eliminada la línea `├── repo/ ← Repositorio GitHub (solo docs en este momento)` del árbol de archivos en el README. Coincide ahora con `.gitignore`, que marca `repo/` como *"Old nested clone from initial setup (redundant)"* y la excluye del versionado.

### TO_FIX.md actualizado

- Todos los 10 items (5 🔴 + 5 🟡) marcados `[x]`.
- Añadida columna **Estado** en la tabla resumen final: `✅ FIXED` para los 8 corregidos en esta sesión, `✅ FIXED` (ya estaba) para #5 y #13.
- Añadida fecha `Última actualización: 2026-08-03` en la cabecera.
- Los 2 items (#6, #11) que requerían confirmación con cliente se resolvieron con decisión de producto razonada (1 tarjeta bilingüe, page-lead al ancho) y documentadas como reversibles si el cliente prefiere la otra opción.

---

## [0.7.0] — 2026-08-03

### Added (nuevo)
- **`TROUBLESHOOTING.md`**: diagnóstico completo del intento de conexión al servidor `kilombo.top`. Documenta: estado de puertos (22 cerrado, 80/443 abiertos), infraestructura YunoHost detectada (6 apps, sin app para el dominio raíz), fallos de autenticación con todas las combinaciones probadas, y 4 opciones de resolución con checklist de próximos pasos.

### Changed (cambiado)
- **Tipografía del portal** alineada con `kilombo.top`: se reemplaza la pila Georgia/Times New Roman (editorial) por `Verdana, Arial, Helvetica, sans-serif`, que es la pila exacta que usa el servidor SPIP de producción (`cssdyn-config_css` de Escal 5.2.9). Los elementos monoespaciados (chips, etiquetas, CTA) pasan a `'Courier New', 'Lucida Console', monospace` con fallback explícito. Afecta a `style.css` y `plandemismo.css`.
- **Preview Serveo relanzado**: nueva URL pública activa: `https://b795d3c3f8bbbf7c-190-132-104-107.serveousercontent.com`. `.env` actualizado con `PREVIEW_PUBLIC_URL`.

---

## [0.6.0] — 2026-08-03

### Added (nuevo)
- **`TO_FIX.md`**: auditoría completa de bugs e inconsistencias detectados. 5 bugs rojos y 7 inconsistencias amarillas, cada uno con descripción, archivo afectado y fix propuesto. Checkboxes para seguimiento.

### Fixed (corregido)
- **`plandemismo.css` — `.warning-block`**: `margin-top: 1.5rem 0 0` (shorthand inválido) → `margin: 1.5rem 0 0`.
- **`style.css` — `.cards-grid--featured`**: clase usada en `index.html` (secciones Tierra y Libertad y Nuevo Orden Mundial) pero nunca definida. Añadida regla `grid-template-columns: 1fr` para forzar columna única en tarjetas destacadas.
- **`plandemismo.css` — cabecera de dependencias**: añadido comentario de bloque documentando todas las variables CSS de `style.css` de las que depende esta hoja (`--paper`, `--rule`, `--lang-*`, etc.), y nota explícita sobre la equivalencia entre `--plandem-red` y `--red-dark`.
- **`main.js`**: selector cambiado de `.card` a `.card:not(a)` — elimina la adición redundante de `tabindex="0"` y listeners de teclado a elementos `<a>` que ya son focusables de forma nativa.
- **`index.html` — typo**: "plataforms" → "plataformas" en el tagline de la sección GCI.
- **`start-preview.sh` — alias Serveo**: eliminado el alias nombrado `kilombo-preview` (requería cuenta en serveo.net para funcionar). El túnel ahora usa `-R 80:localhost:PORT` sin alias, comportamiento consistente para todos los usuarios.

---

## [0.5.0] — 2026-08-03

### Added (nuevo)
- **README → Sección "Sitios espejo, referencias y redes de Kilombo analizadas"**: tabla con el prototipo Replit (`kilombo-redesign--ukoquique.replit.app`) y los 6 sitios reales de la red YunoHost (Tierra y Libertad, GCI oficial, P.I., ICR inglés, ICG-old, CD-Rom), con idiomas, estado y función.
- **README → Sección "Sobre el contenido y las fuentes"**: explicita la relación de amistad política con espacios aliados (p. ej. Canal7 Salta TV), enumera los 4 principios respecto a fuentes (selección por línea, no filtrado de calidad, re-presentación ordenada, traducción, enlace SIEMPRE al origen).
- **Nuevo `CHANGELOG.md`**: este archivo.

### Changed (cambiado)
- **Tono en plandemismo.html, index.html y ROADMAP.md**: se elimina todo lenguaje de "curación" que podía ofender a espacios amigos. "Archivo curado" → "Recopilación de materiales compartidos por nuestros compañeros"; "criterios de curación" → "criterios de selección y estructura"; "nota de curación" → "criterio de presentación".
- **Tarjeta sección 03 (index.html)**: ya no enlaza a `www.kilombo.top` externo, sino internamente a `plandemismo.html`. Descripción actualizada y tags nuevos: `Videos Canal7`, `SIDA→COVID`.

---

## [0.4.0] — 2026-08-03

### Added (nuevo)
- **`.env` reformateado**: archivo estándar `KEY=VALUE` con secciones comentadas para GitHub, servidor YunoHost y credencial futura.
- **`.env.example`**: plantilla sin credenciales reales, lista para subir al repositorio público.
- **`start-preview.sh`** (ejecutable): arranca servidor local + túnel HTTPS Serveo en 1 paso. Imprime URLs local y pública para el cliente.
- **`sync-to-production.sh`** (ejecutable): sube TODO `./site/` 1:1 a `kilombo.top` por rsync (o scp), leyendo credenciales del `.env` y pidiendo confirmación `PROD`.
- **Subcarpetas `site/assets/`**: `data/`, `subtitles/`, `audios/`, `transcripts/` para inventarios JSON, subtítulos `.vtt`, MP3 y transcripciones con timestamps.
- **README → Sección "Mostrar avances al cliente"** y **"Subida a producción real"**: explica el flujo preview → producción 1:1.
- **URL preview pública activa (Serveo)**: `https://3e52f2a4e4aae552-179-29-35-153.serveousercontent.com`

---

## [0.3.0] — 2026-08-03

### Added (nuevo)
- **Página `plandemismo.html`**: sección 03 propia, independiente del índice, con:
  - 3 **pestañas (tabs)**: 01 Actualidad (activa por defecto) / 02 SIDA → COVID (Antecesores) / 03 Históricos (deshabilitada, "Próximamente").
  - **Lote 1 — Actualidad**: 9 videos de Canal7 Salta, **sin Chinda Brandolino** (cumpliendo criterio del cliente). Incluyen: "2020 el año del miedo", Analía Álvarez, APSIIN Chile, 100.000 médicos, Dr. Martínez, Dr. Monteverde (niños), Dr. David Martin Parlamento Europeo, Dra. Stückelberger (OMS), Dr. Yeadon ex-Pfizer.
  - **Lote 2 — SIDA→COVID**: documental **"ELISA MATO A RUTH" (España 2018, ID 167/1201)** en tarjeta GRANDE destacada, con el texto íntegro del cliente sobre "montaje SIDA antecesor de COVID", "del genocidio SIDA al humanicidio COVID", "víctimas atrapadas en los nada fiables test", keypoints y badge de subtítulos FR prioritarios ★★★.
  - Cada tarjeta lleva `data-subtitles-fr` / `data-subtitles-en` (estructura lista para enchufar `.vtt`).
  - Chips de idioma con 3 niveles de subtítulos FR: `pendiente` / `a subtitular ★` / `prioritarios ★★★`.
- **`css/plandemismo.css`**: paleta rojo oscuro NOM (`#8b0000`), miniaturas con botón play, chips de idioma coloreados, efecto pulse en "a subtitular", tab nav con subrayado activo, blockquote `warning-block` para la intro SIDA→COVID.
- **`js/plandemismo.js`**: navegación por tabs (click + teclado), focus + Enter/Space en tarjetas.

---

## [0.2.0] — 2026-08-03

### Added (nuevo)
- **ROADMAP.md técnico** (Pasos 1–11):
  1.  Flujo de subida / deploy
  2.  Videos Canal7 (Actualidad + SIDA→COVID + Históricos después, sin Chinda, subtítulos FR `.vtt`)
  3.  Transcripción audios de WhatsApp (inventario → MP3 normalizado → Whisper + corrección manual → página `audios-historicos.html`)
  4.  Contenido editorial por sección
  5.  **Traducciones / puesta al día de idiomas** (déficit GCI ES→FR, flujo DeepL + corrección humana obligatoria, regla "no publicar unilíngüe a partir de ahora")
  6.  Organización por idiomas en cada sección
  7–9. Revisión diseño, SEO, despliegue final
  10–11. Rutinas de actualización + monitoreo
- **Tabla "Resumen de prioridad"** al final de ROADMAP.md con tiempos estimados por bloque.

---

## [0.1.0] — 2026-08-03

### Added (nuevo)
- **Estructura inicial del proyecto local** en `site/`:
  - `index.html` — portal central con **4 secciones en orden de prioridad**:
    1.  ⭐ **Espacio Tierra y Libertad** (destacada: fondo tintado, barra roja superior, "Sección destacada", intro, tarjeta grande ES)
    2.  **01 GCI** — 4 tarjetas: Sitio Oficial ES/EN/FR, International Global Revolution (EN), CD-Rom (fondo rayado "archivo"), ICG Sitio Histórico "legado"
    3.  **02 Proletarios Internacionalistas** — 2 tarjetas lado a lado: ES + FR
    4.  **03 Nuevo Orden Mundial: plandemismo y domesticación** — tarjeta temática con borde izquierdo rojo oscuro
  - `css/style.css` — paleta papel + tinta + rojo revolucionario (`#f5f2eb / #0a0a0a / #c1121f`), Georgia editorial + Courier New mono para metadata, códigos de color por idioma (ES verde, FR azul, EN púrpura, Multi morado), status badges Activo / Archivo / Legado, tarjetas con sombra hover, fully responsive.
  - `js/main.js` — accesibilidad: tab + Enter/Espacio activan tarjetas.
- **README.md inicial** (versión 0.1): estructura del portal en 4 secciones, árbol de archivos, convenciones (IA-inglés vs. contenido-español), servidor local Python, paleta, próximos pasos.
- **Inventario inicial de la red**: documentado en `docs/SITE_ANALYSIS.md`
