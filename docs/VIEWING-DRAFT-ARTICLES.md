# Viewing & Managing Draft Articles Awaiting Approval

> **See also:** [`CHECKING-DRAFT-ARTICLES.md`](CHECKING-DRAFT-ARTICLES.md) for a quick reference guide.

## Quick Start: Check Draft Articles

There are **two ways** to see articles awaiting approval in the Tierra y Libertad section:

### Option 1: Using the Existing manage-article-status.mjs Script (Recommended)

This is the PROPER way — the project already has the infrastructure:

```bash
# Inspect a specific article's status
node scripts/manage-article-status.mjs --inspect --id 87

# This shows:
# - Current status (e.g., "En curso de redacción")
# - Available status transitions
# - Full HTML inspection of the form
```

### Option 2: Directly Access SPIP Admin Dashboard

Manual access via web browser:

1. **Go to:** https://www.kilombo.top/ecrire/
2. **Login:** Username `kilombo`, YunoHost password
3. **Navigate to:** Articles (admin menu)
4. **Filter:**
   - Section: Tierra y Libertad
   - Status: "En curso de redacción" (shows drafts only)

---

## Article Status Codes

SPIP uses these status codes for articles:

| Code | Spanish | English | Visibility | Notes |
|------|---------|---------|------------|-------|
| `prepa` | En curso de redacción | Draft / In Progress | Admin only | ← **AWAITING APPROVAL** |
| `prop` | Propuesto a la evaluación | Proposed for Review | Admin only | Formal review stage |
| `publie` | Publicado | Published | Public | ✅ Live on site |
| `refuse` | Rechazado | Refused/Rejected | Admin only | Rejected from review |
| `poubelle` | A la papelera | Trash | Admin only | Hidden but recoverable |

**Draft articles are those with status `prepa` ("En curso de redacción")**

---

## Managing Draft Articles Programmatically

### View Current Status

```bash
node scripts/manage-article-status.mjs --inspect --id <ARTICLE_ID>
```

**Example:**
```bash
node scripts/manage-article-status.mjs --inspect --id 90
```

Returns:
- Current status
- Article metadata
- Available transitions
- Form field locations

### Change Status to Published

```bash
# Publish a draft article (draft → published)
node scripts/manage-article-status.mjs --change --id 90 --status publie

# Preview without making changes
node scripts/manage-article-status.mjs --change --id 90 --status publie --dry-run
```

### Move to Trash (Hide from Public)

```bash
# Hide draft without deleting (draft → trash)
node scripts/manage-article-status.mjs --change --id 90 --status poubelle
```

### Restore from Trash

```bash
# Recover article back to draft
node scripts/manage-article-status.mjs --change --id 90 --status prepa
```

---

## Finding Articles Awaiting Approval

### Using Migration System

The new migration system integrates with this workflow:

```bash
# Mode A: Create article AS DRAFT (awaiting approval)
node scripts/migrate-to-spip.mjs --article-id article-slug

# Check its status once created
node scripts/manage-article-status.mjs --inspect --id <NEW_ARTICLE_ID>

# Approve it: change from draft (prepa) to published (publie)
node scripts/manage-article-status.mjs --change --id <NEW_ARTICLE_ID> --status publie
```

---

## Architecture & Why This Might Be Hidden

The project has multiple layers of article management:

1. **Local JSON layer** (`articles.json`)
   - Source of truth for articles
   - Validated before migration

2. **Migration system** (`scripts/migrate-to-spip.mjs`)
   - Handles moving articles from JSON to SPIP
   - Mode A: Creates drafts (awaiting approval)
   - Mode B: Creates and publishes immediately

3. **SPIP status management** (`scripts/manage-article-status.mjs`)
   - Handles all 5 status states
   - Transitions between statuses
   - Inspection and audit

4. **Admin interface** (web-based)
   - Manual access point
   - UI for editorial review

**Status (as of v0.45.0):** This has been addressed — `manage-article-status.mjs` and `list-draft-articles.mjs` now live in `scripts/` (production tools) instead of `sandbox/` (which no longer exists), and are documented in `PUBLISHING-GUIDE.md` and `README.md`.

---

## Listing All Drafts in a Section

Use `list-draft-articles.mjs` to query all draft articles across a section:

```bash
node scripts/list-draft-articles.mjs --section "Tierra y Libertad"
```

This shows:
- Article IDs
- Titles
- Creation dates
- Authors
- Time since creation (for SLA tracking)

---

## Related Files

- **Migration system:** `docs/MIGRATION-WORKFLOW.md`
- **Article management:** `docs/SPIP-ARTICLE-MANAGEMENT.md` 
- **Status workflow:** `scripts/manage-article-status.mjs` (implementation)
- **Publication guide:** `PUBLISHING-GUIDE.md`

---

## Summary

✅ **Existing capability:** Check draft articles via `scripts/manage-article-status.mjs --inspect --id <ID>`
⚠️ **Hidden issue:** Not documented in main guides or easily discoverable
🚀 **Next step:** Integrate into clearer workflow documentation

The infrastructure is there — it just needs better visibility and organization.
