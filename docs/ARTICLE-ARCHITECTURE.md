# Complete Article Architecture: JSON → Migration → SPIP Status

## Overview

Kilombo has a **four-layer article management system** that ensures clean separation of concerns while providing multiple publication modes:

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Local Source (articles.json)                           │
│ - Validated JSON schema                                          │
│ - Version controlled (Git)                                       │
│ - Supports status tracking (pending-review, imported, etc.)     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Migration System (scripts/migrate-to-spip.mjs)         │
│ - Decoupled architecture (data → SPIP abstraction → reporting)  │
│ - Two publication modes:                                         │
│   • Mode A: Draft (prepa) — awaiting editorial review          │
│   • Mode B: Direct publish (publie) — live immediately         │
│ - Dry-run preview capability                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: SPIP Status Management (scripts/manage-article-status) │
│ - 5-state article lifecycle:                                    │
│   • prepa (draft) — awaiting approval                           │
│   • prop (proposed) — formal review                            │
│   • publie (published) — live on site                          │
│   • refuse (rejected) — editorial decision                     │
│   • poubelle (trash) — hidden but recoverable                 │
│ - Inspect current state and available transitions              │
│ - Change status with auditing                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Query & Discovery (scripts/list-draft-articles.mjs)   │
│ - Find articles by status or section                            │
│ - Report on approval queue status                               │
│ - Track time-to-publication metrics                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Local Source (articles.json)

### Purpose
- Single source of truth for all article metadata
- Version controlled with Git for audit trail
- Validated before migration to SPIP

### Location
`site/assets/content/articles.json`

### Schema
Each article object contains:
```json
{
  "id": "article-slug-kebab-case",
  "title": "Article Title",
  "date": "YYYY-MM-DD",
  "section": "tierra|nom|actualidad|gci|pi|general",
  "topics": ["tag1", "tag2"],
  "sourceSite": "Source Name",
  "sourceUrl": "https://...",
  "status": "pending-review|imported",
  "contentHtml": "<h3>...</h3><p>...</p>",
  "notes": "Editorial notes"
}
```

### Status Codes (Local Only)
- `pending-review` — Ready to migrate to SPIP
- `imported` — Already migrated and published
- Other custom statuses as needed

### Validation
```bash
npm test
```

Validates:
- JSON schema conformance
- HTML structure
- URL consistency
- No duplicate source URLs

---

## Layer 2: Migration System

### Purpose
Decouple article data from SPIP implementation. Provides two publication modes through a single interface.

### Architecture

Three library modules:

1. **ArticleExtractor** (`scripts/lib/article-extractor.mjs`)
   - Pure data layer: reads articles.json
   - No SPIP knowledge
   - No side effects
   - Testable in isolation

2. **SPIPClient** (`scripts/lib/spip-client.mjs`)
   - SPIP abstraction layer
   - Manages Playwright interactions
   - Handles YunoHost SSO login
   - Creates articles with specified status
   - Manages article status transitions

3. **MigrationReporter** (`scripts/lib/migration-reporter.mjs`)
   - Logging and progress tracking
   - Summary reporting
   - Audit trail generation

4. **CLI Orchestrator** (`scripts/migrate-to-spip.mjs`)
   - User interface
   - Ties layers together
   - Provides both single and batch operations

### Two Publication Modes

#### Mode A: Draft/Review (Default)
```bash
node scripts/migrate-to-spip.mjs --article-id article-slug
```

**What happens:**
1. Article created in SPIP
2. Status set to `prepa` ("En curso de redacción")
3. NOT visible to public
4. Appears in admin dashboard for review
5. Editor/admin must approve (change status to `publie`)

**When to use:**
- Collaborative editorial workflow
- Articles requiring review before publication
- Safety-first approach (no accidental publishing)

**Next step:**
```bash
# Approve and publish
node scripts/manage-article-status.mjs --change --id <ID> --status publie
```

#### Mode B: Direct Publication (--publish)
```bash
node scripts/migrate-to-spip.mjs --article-id article-slug --publish
```

**What happens:**
1. Article created in SPIP
2. Status immediately changed to `publie` ("Publicado")
3. Visible on www.kilombo.top immediately
4. No approval step needed

**When to use:**
- Pre-approved or trusted content
- Time-sensitive articles
- Automated publishing (trusted sources)

### Dry-Run Preview
```bash
node scripts/migrate-to-spip.mjs --article-id article-slug --dry-run
```

**What happens:**
- Article form filled with data
- Screenshot taken for preview
- ALL network POST requests blocked (no database writes)
- Safe to run multiple times
- No side effects

**When to use:**
- Before first migration (verify form rendering)
- To preview article content in SPIP context
- Testing without database impact

### Batch Operations
```bash
# Migrate all articles with status "pending-review" (to draft)
node scripts/migrate-to-spip.mjs --migrate-all pending-review

# Migrate and publish all pending articles
node scripts/migrate-to-spip.mjs --migrate-all pending-review --publish
```

---

## Layer 3: SPIP Status Management

### Purpose
Manage the full 5-state article lifecycle after creation. Separate from migration system to allow independent workflows.

### Usage

#### Inspect Current Status
```bash
node scripts/manage-article-status.mjs --inspect --id <ARTICLE_ID>
```

Returns:
- Current status with Spanish name
- Available transitions
- Article metadata
- Form field locations (for debugging)
- Screenshot of admin interface

#### Change Article Status
```bash
node scripts/manage-article-status.mjs --change --id <ID> --status <CODE>
```

**Status codes:**
- `prepa` → "En curso de redacción" (Draft)
- `prop` → "Propuesto a la evaluación" (Proposed for review)
- `publie` → "Publicado" (Published)
- `refuse` → "Rechazado" (Rejected)
- `poubelle` → "A la papelera" (Trash)

**Example workflow:**
```bash
# 1. Migrate to draft
node scripts/migrate-to-spip.mjs --article-id my-article

# 2. Inspect status
node scripts/manage-article-status.mjs --inspect --id 90

# 3. After review, publish
node scripts/manage-article-status.mjs --change --id 90 --status publie

# 4. Or reject/move to trash
node scripts/manage-article-status.mjs --change --id 90 --status refuse
```

#### Preview Changes (--dry-run)
```bash
node scripts/manage-article-status.mjs --change --id 90 --status publie --dry-run
```

No database changes. Safe to test status transitions.

### Technical Details

**Why separate from migration?**
- Migration = one-time setup (JSON → SPIP)
- Status management = ongoing workflow (after creation)
- Different tools for different responsibilities
- Can be used independently

**Why two scripts instead of one?**
- `migrate-to-spip.mjs` — Entry point (what most users need)
- `manage-article-status.mjs` — Power user tool (editorial control)
- Simpler mental model: migrate = create, manage = edit status
- Clear separation of "publish new" vs "change existing"

---

## Layer 4: Query & Discovery

### Purpose
Find and report on articles by status or section. Essential for tracking approval queue.

### Usage

#### List All Draft Articles
```bash
node scripts/list-draft-articles.mjs --all
```

Output:
```
ID   STATUS        TITLE                                    DATE
───────────────────────────────────────────────────────────────────
90   📝 Draft      My First Article                        2026-08-24
91   📝 Draft      Second Article Awaiting Approval        2026-08-24
```

#### Filter by Section
```bash
node scripts/list-draft-articles.mjs --section "Tierra y Libertad"
node scripts/list-draft-articles.mjs --section 1  # by ID
```

#### Filter by Status
```bash
# Show all articles in review
node scripts/list-draft-articles.mjs --status prepa,prop

# Show rejected articles
node scripts/list-draft-articles.mjs --status refuse
```

#### Verbose Output
```bash
node scripts/list-draft-articles.mjs --all --verbose
```

Includes:
- Full article URLs
- Timestamps
- Actionable next steps (links to manage-article-status.mjs commands)

---

## Complete Workflow Example

### Scenario: Editorial Review Process

**Step 1: Prepare article locally**
```bash
# Create/edit article in articles.json
# Validate
npm test
```

**Step 2: Submit for review (Mode A)**
```bash
node scripts/migrate-to-spip.mjs --article-id my-article
# → Article created with status "prepa" (draft)
# → Not visible to public
# → Ready for editorial review
```

**Step 3: Check approval queue**
```bash
node scripts/list-draft-articles.mjs --all
# → Shows all articles awaiting approval
```

**Step 4: Review article (manual)**
- Visit https://www.kilombo.top/ecrire/
- Login with credentials
- Review article content
- Make notes for author (if revisions needed)

**Step 5a: Approve and publish**
```bash
node scripts/manage-article-status.mjs --change --id 90 --status publie
# → Article now live at www.kilombo.top
```

**Step 5b: Or reject for revisions**
```bash
node scripts/manage-article-status.mjs --change --id 90 --status refuse
# → Author informed to revise
# → Article back to local editing
```

**Step 5c: Or move to trash (hide)**
```bash
node scripts/manage-article-status.mjs --change --id 90 --status poubelle
# → Hidden from public
# → Can be restored later if needed
```

---

## Why Four Layers?

Each layer solves a specific problem:

| Layer | Problem | Solution | Responsibility |
|-------|---------|----------|-----------------|
| 1: JSON | How do we track article metadata? | Version-controlled single source of truth | Data integrity |
| 2: Migration | How do we move articles to SPIP safely? | Decoupled modules with multiple modes | Automation & safety |
| 3: Status | How do we manage editorial workflow? | Independent status manager | Editorial control |
| 4: Query | How do we track approval queue? | Discoverable query tool | Visibility |

**Benefits of this separation:**

✅ **Testability** — Each layer can be tested independently
✅ **Reusability** — Libraries can be used by other scripts
✅ **Flexibility** — Users can mix-and-match tools for their workflow
✅ **Clarity** — Each tool has one responsibility
✅ **Safety** — Dry-run and inspection at every level
✅ **Discoverability** — Clear tools for each task

---

## Architecture Decisions & Rationale

### Decision 1: Two Publication Modes
**Question:** Should migration always create drafts, or always publish?
**Answer:** User choice via --publish flag
**Rationale:** Different workflows need different defaults. Mode A (safe) is default. Mode B (fast) is opt-in.

### Decision 2: Separate Migration from Status Management
**Question:** Should both be in one script?
**Answer:** Two separate scripts (migrate-to-spip.mjs + manage-article-status.mjs)
**Rationale:** Different use cases. Most users just need migrate. Power users need status management for ongoing workflows.

### Decision 3: Decoupled Library Architecture
**Question:** Should migration logic be monolithic or modular?
**Answer:** Three decoupled modules (Extractor, Client, Reporter)
**Rationale:** Each module has one job. Testable in isolation. Reusable by other scripts.

### Decision 4: Dry-Run at Network Layer
**Question:** How to implement safe dry-run preview?
**Answer:** Block all POST requests at network layer (Playwright route interception)
**Rationale:** Guaranteed no database writes. Form fills are visible for inspection. Safe to run unlimited times.

### Decision 5: Query Tool as Separate Script
**Question:** Should list-draft-articles be built into manage-article-status?
**Answer:** Separate script (list-draft-articles.mjs)
**Rationale:** Simpler mental model. Different use case (discovery vs. management). Can be extended independently for metrics/reporting.

---

## File Reference

| File | Purpose | Layer |
|------|---------|-------|
| `site/assets/content/articles.json` | Article source data | 1 |
| `scripts/migrate-to-spip.mjs` | Main CLI orchestrator | 2 |
| `scripts/lib/article-extractor.mjs` | Data layer | 2 |
| `scripts/lib/spip-client.mjs` | SPIP abstraction | 2 |
| `scripts/lib/migration-reporter.mjs` | Logging layer | 2 |
| `scripts/manage-article-status.mjs` | Status workflow | 3 |
| `scripts/list-draft-articles.mjs` | Query & discovery | 4 |
| `docs/MIGRATION-WORKFLOW.md` | Migration system docs | 2 |
| `docs/SPIP-ARTICLE-MANAGEMENT.md` | Status management docs | 3 |
| `docs/VIEWING-DRAFT-ARTICLES.md` | Quick reference | All |
| `PUBLISHING-GUIDE.md` | User-facing guide | All |

---

## Future Extensibility

The architecture supports:

- **Analytics layer** — Track approval times, publication rates
- **Webhook integration** — Notify on status changes
- **Scheduled publishing** — Publish articles at future dates
- **Translation management** — Coordinate multilingual versions
- **Backup/restore** — Article versioning and recovery
- **API interface** — Expose layers as REST API

All without changing existing layer structure.

---

## Summary

The four-layer architecture provides:

✅ **Clarity** — Each layer has one job
✅ **Flexibility** — Multiple publication modes (draft vs. publish)
✅ **Safety** — Dry-run and inspection at every level
✅ **Discoverability** — Clear tools for each task
✅ **Testability** — Decoupled modules
✅ **Extensibility** — Easy to add new capabilities

**The problem solved:** Article management is no longer hidden in an undocumented sandbox/ directory. It's now a first-class citizen in the project architecture with clear documentation, discoverable tools, and multiple workflows to support different editorial processes.
