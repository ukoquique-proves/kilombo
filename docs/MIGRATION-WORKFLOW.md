# Article Migration Workflow — Architecture & Usage

**Version:** 0.44.0  
**Date:** 2026-08-24  
**Status:** Stable

---

## Overview

The migration system provides a clean, decoupled way to publish articles from the JSON mirror (`articles.json`) to the SPIP backend (`www.kilombo.top`).

**Key Design Principles:**
- **Separation of concerns** — Each module has one responsibility
- **Testable** — All dependencies are injectable/mockable
- **Reusable** — Modules can be used independently
- **Documented** — Clear interfaces and error messages
- **Resilient** — Graceful failure handling with detailed reporting

---

## Architecture

### Layer 1: Data Layer (Pure Functions)

**File:** `scripts/lib/article-extractor.mjs`

Reads articles from `articles.json` and validates them.

**No side effects:**
- Does not create/modify files
- Does not call external services
- Only reads from disk

**Key methods:**
- `findById(articleId)` — Get article by ID, with validation
- `findByStatus(status)` — Get all articles with given status
- `extractMigrationData(article)` — Extract only fields needed for SPIP

**Example:**
```javascript
import { ArticleExtractor } from './lib/article-extractor.mjs';
const extractor = new ArticleExtractor('./site/assets/content/articles.json');
const article = extractor.findById('terrorismo-estado-mundial');
// → { id, title, contentHtml, section, ... }
```

---

### Layer 2: Client Abstraction (SPIP Integration)

**File:** `scripts/lib/spip-client.mjs`

Manages interactions with SPIP backend without exposing Playwright details.

**Responsibilities:**
- Encapsulate browser automation (Playwright)
- Invoke scripts/ CLI tools (create-article.mjs, and the not-yet-committed delete-article.mjs in scripts/debug/)
- Parse script output into structured results
- Handle errors and timeouts

**No direct file I/O:**
- Uses child_process to spawn scripts
- Scripts return stdout
- Results are parsed, not raw output

**Key methods:**
- `createArticle(params)` — Create article in SPIP
- `changeArticleStatus(params)` — Publish/change status

**Example:**
```javascript
import { SPIPClient } from './lib/spip-client.mjs';
const client = new SPIPClient({ envPath: './.env' });
const result = await client.createArticle({
  title: 'Article Title',
  body: '<p>Content</p>',
  section: '1'
});
// → { success: true, articleId: 90, url: '...' }
```

---

### Layer 3: Reporting (Logging & Progress)

**File:** `scripts/lib/migration-reporter.mjs`

Tracks migration progress and generates reports.

**Features:**
- Track success/failure for each article
- Generate summary statistics
- Format output for console and file
- Silent mode for automation

**Key methods:**
- `startMigration(articleId)`
- `success(articleId, spipArticleId)`
- `failure(articleId, error)`
- `printSummary()`
- `writeReport(filePath)`

**Example:**
```javascript
import { MigrationReporter } from './lib/migration-reporter.mjs';
const reporter = new MigrationReporter();
reporter.startMigration('article-id');
reporter.success('article-id', 90);
reporter.printSummary();
```

---

### Layer 4: CLI Orchestrator (User Interface)

**File:** `scripts/migrate-to-spip.mjs`

Main entry point that ties all layers together.

**Responsibilities:**
- Parse command-line arguments
- Orchestrate data layer → client → reporting
- Provide user-friendly interface
- Handle errors gracefully

**Does NOT:**
- Know internal details of each layer
- Duplicate code from libraries
- Make assumptions about SPIP internals

---

## Usage

### List Articles

See all articles in `articles.json`:

```bash
node scripts/migrate-to-spip.mjs --list
```

Output:
```
📚 Articles in articles.json:

ID                              TITLE                                    STATUS          SECTION
────────────────────────────────────────────────────────────────────────────────────────────────
terrorismo-estado-mundial       El Terrorismo de Estado...                 imported        nom
seisme-oms-2400-postes         Séisme à l'OMS...                          pending-review  actualidad
...
```

---

### Dry-Run Preview (No Changes)

Preview article creation without actually creating it in SPIP:

```bash
node scripts/migrate-to-spip.mjs --article-id terrorismo-estado-mundial --dry-run
```

**What happens:**
- ✅ Article loaded and validated
- ✅ SPIP form filled with data
- ✅ Screenshot saved for review
- ❌ No article created in database
- ❌ Safe to run multiple times

**When to use:**
- Before first migration
- To verify article content
- To check form rendering

---

### Migrate Single Article (Create Only — Draft/Review Mode)

Create article in SPIP **in draft status** (awaiting editorial review):

```bash
node scripts/migrate-to-spip.mjs --article-id terrorismo-estado-mundial
```

**What happens:**
- Article created with status "En curso de redacción" (draft)
- NOT visible to public
- Appears in SPIP admin dashboard for editorial review
- Editor/admin can change status to "Publicado" manually

**When to use:**
- Submitting for editorial review before publication
- Adding to moderation queue
- Preventing accidental live publication
- Standard workflow for collaborative editing

**Result:**
- Article ID returned (e.g., 90)
- Status: Draft (awaiting review)
- Editor/admin decision required for publication

---

### Migrate & Publish (Direct Publication)

Create article **and immediately publish** it (live):

```bash
# Requires explicit approval environment variable (security measure)
KILO_APPROVE_PUBLISHING=true node scripts/migrate-to-spip.mjs --article-id terrorismo-estado-mundial --publish
```

**What happens:**
- Article created with status "En curso de redacción"
- Status immediately changed to "Publicado"
- Visible at `www.kilombo.top/spip.php?article<ID>` (live)
- No editorial review needed

**When to use:**
- Publishing pre-approved content (with team sign-off)
- Automated/trusted sources (with explicit authorization)
- Time-sensitive articles (with explicit authorization)

**Why it requires KILO_APPROVE_PUBLISHING=true:**
- Protects against accidental direct publication
- Forces explicit decision (one-time command override, not default)
- Requires developer awareness of the security implication
- Encourages use of default draft mode for normal workflows

---

### Batch Migration

Migrate all articles with given status:

```bash
node scripts/migrate-to-spip.mjs --migrate-all pending-review
```

Migrate and publish all pending articles:

```bash
node scripts/migrate-to-spip.mjs --migrate-all pending-review --publish
```

---

### Custom Section

Override article's section (SPIP rubrique ID):

```bash
node scripts/migrate-to-spip.mjs --article-id terrorismo-estado-mundial --section 2
```

Default is the article's own `section` field.

---

## Error Handling

### Article Not Found

```
❌ Article not found: typo-in-slug
```

**Fix:** Check article ID in `articles.json` — use `--list` to see available articles.

---

### Missing Required Fields

```
❌ Article "article-id" missing required fields: contentHtml
```

**Fix:** Ensure article JSON has all required fields:
- `id` (string, unique)
- `title` (string, not empty)
- `contentHtml` (string, HTML, not empty)
- `section` (string or number)

---

### SPIP Connection Failed

```
❌ Failed to run node: ECONNREFUSED
```

**Causes:**
1. `www.kilombo.top` is unreachable
2. Network connectivity issue
3. Firewall blocking

**Fix:**
- Check internet connection
- Verify `www.kilombo.top` is running
- Check firewall rules

---

### Script Timeout

```
❌ Script timeout after 120000ms
```

**Causes:**
- SPIP backend very slow
- Network latency
- Large article content

**Fix:**
- Try again (transient network issue)
- Check SPIP server status
- Split article into smaller sections

---

## Testing & Dry-Run Workflow

**Recommended workflow for first migration:**

```bash
# Step 1: List articles to find the one you want
node scripts/migrate-to-spip.mjs --list

# Step 2: Dry-run preview (no changes)
node scripts/migrate-to-spip.mjs --article-id my-article --dry-run

# Step 3: Review screenshot at docs/debug-snapshots/article_create_dryrun.png

# Step 4: If satisfied, create article (draft status)
node scripts/migrate-to-spip.mjs --article-id my-article

# Step 5: Verify in SPIP admin at www.kilombo.top/ecrire/

# Step 6: Publish
node scripts/migrate-to-spip.mjs --article-id my-article --publish
```

Or combine steps 4 & 6:

```bash
node scripts/migrate-to-spip.mjs --article-id my-article --publish
```

---

## Integration with Publishing Workflow

The migration system is part of the complete publishing workflow (see `PUBLISHING-GUIDE.md`):

### WORKFLOW C (Recommended: Everywhere)

1. **Create in JSON mirror** — Add to `articles.json`
2. **Test on GitHub Pages** — Push to main, verify at GitHub Pages
3. **Migrate to SPIP** — Run `migrate-to-spip.mjs`
4. **Deploy to production** — Run `sync-to-production.sh`

**Complete command sequence:**

```bash
# 1. Add article to articles.json and commit
git add site/assets/content/articles.json
git commit -m "feat: Add article 'my-article'"
git push origin main

# 2. Wait for GitHub Actions deployment (~30s)
# Verify at: https://ukoquique-proves.github.io/kilombo/articulos.html

# 3. Migrate to SPIP with publish
node scripts/migrate-to-spip.mjs --article-id my-article --publish

# 4. Sync to production server
./sync-to-production.sh
```

---

## Extending the System

### Adding a New Migration Target

To migrate articles to a system other than SPIP:

1. Create `scripts/lib/[system]-client.mjs` following `SPIPClient` pattern
2. Implement `createArticle(params)` and `changeStatus(params)` methods
3. Use in `migrate-to-spip.mjs` (or create new orchestrator)

**No changes needed to:**
- Article extractor
- Reporting layer
- Data format

This is the power of decoupling!

---

### Testing Migrations Programmatically

```javascript
import { migrateSingleArticle } from './scripts/migrate-to-spip.mjs';

// In your test:
const result = await migrateSingleArticle('test-article', {
  dryRun: true,
  verbose: false,
});

if (result.success) {
  console.log('✅ Test passed');
} else {
  console.error(`❌ Test failed: ${result.error}`);
}
```

---

## Troubleshooting

### "Port 22 not accessible"

This only affects `sync-to-production.sh`. The SPIP migration doesn't need SSH.

### "SPIP form fields not found"

The create-article.mjs script uses CSS selectors based on standard SPIP layout. If SPIP was customized, selectors may need updating in `scripts/create-article.mjs`.

### "Article appears in SPIP but not on www.kilombo.top"

SPIP has caching. Try:
1. Clear SPIP cache at `www.kilombo.top/ecrire/` → Outils → Maintenance
2. Wait 1-2 minutes for HTTP cache to clear
3. Verify article status is "Publicado" (not "En curso de redacción")

---

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/migrate-to-spip.mjs` | Main CLI entry point |
| `scripts/lib/article-extractor.mjs` | Data layer (articles.json) |
| `scripts/lib/spip-client.mjs` | SPIP abstraction layer |
| `scripts/lib/migration-reporter.mjs` | Logging & reporting |
| `scripts/create-article.mjs` | Low-level SPIP article creation (Playwright) |
| `scripts/manage-article-status.mjs` | Low-level SPIP status change (Playwright) |

---

## Version History

- **0.44.0** (2026-08-24) — Initial release with article extraction, SPIP client, and CLI orchestrator
- **Future:** Add batch reporting to file, migration rollback, dry-run with detailed diff

---

**Questions or issues?** See `PUBLISHING-GUIDE.md` or `TROUBLESHOOTING.md`.
