# SPIP Article Management Workflow

Complete documentation of article lifecycle management in SPIP 4.4.15 (Escal 5.2.9 theme), based on testing against live kilombo.top instances.

---

## Article Status Lifecycle

SPIP uses a 5-state article workflow. All transitions are reversible except for permanent database deletion (which requires direct DB access).

| Status Code | Spanish Name | English | Visibility | Recoverable |
|---|---|---|---|---|
| `prepa` | En curso de redacción | Draft / In Progress | Admin only | ✅ Yes |
| `prop` | Propuesto a la evaluación | Proposed for Review | Admin only | ✅ Yes |
| `publie` | Publicado | Published | Public | ✅ Yes |
| `refuse` | Rechazado | Refused / Rejected | Admin only | ✅ Yes |
| `poubelle` | A la papelera | Trash / Deleted | Admin only | ✅ Yes (recoverable) |

**Key insight:** "Trash" (`poubelle`) is NOT a terminal state. Articles in trash are hidden from public view but can be restored to any other status at any time.

---

## Article Management Scripts

All scripts are located in `sandbox/` and use Playwright to automate the SPIP admin UI.

### create-article.mjs — Create New Articles

**Purpose:** Create a new article in SPIP without SSH access.

**Modes:**

```bash
# Preview form without creating (no database writes)
node sandbox/create-article.mjs --create --title "Title" --body "<p>Body</p>" --dry-run

# Actually create the article
node sandbox/create-article.mjs --create --title "Title" --body "<p>Body</p>"

# Optional parameters
node sandbox/create-article.mjs --create \
  --title "Title" \
  --body "<p>Body HTML</p>" \
  --section 1 \
  --dry-run
```

**Parameters:**
- `--title` — Article title (required, non-empty)
- `--body` — Article body as HTML (required, non-empty)
- `--section` — Section/rubrique ID (optional, defaults to 1 for root)
- `--dry-run` — Preview without writing (blocks all POST requests at network layer)

**Return value:** Auto-assigned article ID (e.g., `89`) if successful.

**Status:** ✅ FULLY WORKING (verified on Article #87, 2026-08-21)

---

### delete-article.mjs — Manage Article Status

**Purpose:** Change article status (move to trash, restore from trash, change visibility, etc.) without SSH access.

**Modes:**

```bash
# Inspect current status and available transitions
node scripts/manage-article-status.mjs --inspect --id 87

# Change status to trash
node scripts/manage-article-status.mjs --change --id 87 --status poubelle

# Restore from trash to draft
node scripts/manage-article-status.mjs --change --id 87 --status prepa

# Preview status change without executing
node scripts/manage-article-status.mjs --change --id 87 --status poubelle --dry-run
```

**Parameters:**
- `--inspect --id <N>` — Show current status + available transitions (read-only)
- `--change --id <N> --status <CODE>` — Move article to target status (codes: prepa, prop, publie, refuse, poubelle)
- `--dry-run` — Preview changes without database writes

**Test Results (Article #87):**
- ✅ `prepa → poubelle` (Draft to Trash)
- ✅ `poubelle → prepa` (Trash back to Draft)
- ✅ Repeatable across multiple transitions

**Status:** ✅ FULLY WORKING (comprehensive testing 2026-08-21 to 2026-08-22)

---

## Technical Details

### Root Cause: Collapsed Fieldset

Previous investigation identified a `window.confirm()` dialog as the blocker. The real issue was simpler:

**Problem:** Status radios (`input[name="statut"][value="prepa"]`, etc.) are hidden inside a collapsed HTML fieldset (`<fieldset>` with `display: none`). Clicking the radio directly does nothing because the browser's click event is blocked by CSS.

**Solution:** Click the "Modificar esta sección" button (`<button>` with `name="btn_modifier"`) to expand the fieldset, then click the status radio.

**Why confirm() doesn't appear:** `page.evaluate(js)` in Playwright executes JavaScript directly without triggering the native event handlers that would fire `window.confirm()`. The backend form submission still occurs and persists the status change, but the browser-side dialog is skipped.

---

## Status Transitions: Allowed vs. Blocked

All transitions are technically allowed in SPIP 4.4. The UI doesn't enforce blocking — any status can transition to any other status. This is by design.

**Normal editorial workflow:**
1. Author creates article (starts in `prepa`)
2. Submitted for review (change to `prop`)
3. Editor publishes (change to `publie`)
4. Article appears on live site

**Common maintenance operations:**
- **Unpublish:** `publie → prepa` (remove from public, back to draft for edits)
- **Delete temporarily:** `publie → poubelle` (hide from public, keep in system)
- **Recover:** `poubelle → prepa` or `poubelle → publie` (restore to any status)
- **Reject:** `prop → refuse` (don't publish, explain why)

**Permanent deletion:** Only via direct database access (`DELETE FROM spip_articles WHERE id_article = N`). SPIP UI does not provide this option by design (safety feature).

---

## Architectural Notes for Future Scripting

### Session Management

Both scripts handle YunoHost SSO automatically:
1. Navigate to `/ecrire/` 
2. Detect SSO redirect to YunoHost login
3. Authenticate with credentials from `.env` (`KILOMBOTOP_USER`, `KILOMBOTOP_PASSWORD`)
4. Follow redirects back to SPIP dashboard
5. Session persists for script duration

**Credentials required:** `.env` variables `KILOMBOTOP_USER` and `KILOMBOTOP_PASSWORD` (same as SSH/SFTP credentials)

### Selector Reliability

The following CSS selectors are stable across repeated testing:

| Element | Selector | Notes |
|---|---|---|
| Status fieldset | `fieldset[id*="instituer_article"]` | Always present on article page |
| Expand button | `button[name="btn_modifier"]` | Toggles fieldset visibility |
| Status radio (draft) | `input[name="statut"][value="prepa"]` | Works after fieldset expanded |
| Status radio (trash) | `input[name="statut"][value="poubelle"]` | Works after fieldset expanded |
| Current status display | `.majuscules` inside `#statut_actuel` | Read-only, for inspection |

### Error Handling

- **Article not found:** `--inspect` returns empty/error message; `--change` fails gracefully
- **Permission denied:** Login fails if credentials wrong (detected at SSO redirect)
- **Network timeout:** Playwright default 30s timeout; can be extended with `--timeout <ms>`

---

## When to Use Each Script

| Goal | Script | Mode |
|---|---|---|
| Create new article for SPIP | `create-article.mjs` | `--create` |
| Test article creation without DB writes | `create-article.mjs` | `--create --dry-run` |
| Check current article status | `delete-article.mjs` | `--inspect --id <N>` |
| Move article to trash | `delete-article.mjs` | `--change --id <N> --status poubelle` |
| Restore article from trash | `delete-article.mjs` | `--change --id <N> --status prepa` |
| Publish article | `delete-article.mjs` | `--change --id <N> --status publie` |
| Preview any status change | `delete-article.mjs` | `--change --id <N> --status <CODE> --dry-run` |

---

## Related Documentation

- **Article creation workflow:** `docs/SPIP-ACCESS.md` § Workflow A (direct SPIP editing)
- **Article deletion workflow:** `docs/TROUBLESHOOTING.md` § 5 (SPIP Article Deletion Workflow)
- **Architecture & future work:** `docs/TO_FIX.md` #68 (SPIP management scripts — refactoring plan)
- **Testing notes:** `scripts/manage-article-status.mjs` (inline comments document root cause investigation)

---

## Status & Version

- **Created:** 2026-08-22 (v0.42.8)
- **Based on:** CHANGELOG v0.41.0 resolution notes + live testing
- **Last tested:** 2026-08-22 on Article #87 (prepa ↔ poubelle cycle)
- **Status:** ✅ PRODUCTION READY — both create and status-change workflows fully operational

---
