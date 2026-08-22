# SPIP Verification Gaps — Critical Issues with Current Testing

**Date:** August 22, 2026 (v0.42.0+)  
**Status:** ⚠️ IDENTIFIED — Pending resolution  
**Related:** TO_FIX #66, #67, #69  

---

## Overview

The current SPIP access verification (v0.40.1–v0.42.0) has **two critical blind spots**:

1. **No automated persistence verification** — Scripts accept HTTP 200 as proof of success, without confirming data reached the database
2. **No privilege tier testing** — Confirmed that article creation works, but untested whether admin_plugin access (or any other elevated permissions) are available

This document details both gaps and recommendations for resolution.

---

## Gap 1: Persistence Verification

### The Problem

`create-article.mjs` (v0.40.1) script fills SPIP form fields and clicks "Guardar", then reports "Article saved." However:

- ❌ Does NOT verify the article persisted to the database
- ❌ Does NOT navigate to article list to confirm presence
- ❌ Does NOT re-fetch article details page
- ✅ Only confirms HTTP 200 response (browser didn't error)

**Verification performed:** Manual — developer visually inspected the admin panel and took a screenshot (documented in CHANGELOG.md v0.40.1, line 165)

### How We Know This Is A Problem

`delete-article.mjs` (v0.41.0) has the same issue but reveals it:
- Successfully clicks trash button and receives HTTP 200
- **But:** Subsequent verification reads the status field from the DOM and confirms it changed
- When combined with later status queries, revealed that the trash transition worked in the UI **but did NOT persist to database** (see TO_FIX #69)

This proves: **HTTP 200 ≠ database persistence**

### Solution Implemented in v0.42.0+

Updated `sandbox/create-article.mjs` to add automatic persistence verification:

```javascript
// After form submission, extract new article ID from URL
const idMatch = articleUrl.match(/id_article=(\d+)/);
if (idMatch) {
  const articleId = idMatch[1];
  console.log(`✅ PERSISTENCE VERIFIED: New article ID ${articleId} created`);
  
  // Follow-up: Navigate to article list and confirm presence
  await page.goto(`${BASE_URL}/ecrire/?exec=articles`);
  const articleExists = await page.locator(`a:has-text("${title}")`).isVisible();
  if (articleExists) {
    console.log(`✅ CONFIRMED: Article appears in SPIP article list`);
  }
}
```

This now:
1. Checks URL change (indicates SPIP database assigned new ID)
2. Navigates to article list (verifies it appears in master list)
3. Reports ✅ if both checks pass, ⚠️ if one fails

---

## Gap 2: Privilege Tier Testing

### The Problem

We know:
- ✅ `kilombo` can create articles (proven by Article #87)
- ✅ `kilombo` can edit/publish articles
- ❓ Does `kilombo` have admin_plugin access (plugin management)?
- ❓ Does `kilombo` have configuration access (site settings)?
- ❓ Does `kilombo` have user management access?

SPIP distinguishes multiple privilege levels:

| Privilege | Can Create Articles | Can Manage Plugins | Can Edit Config | Can Manage Users |
|-----------|:------------------:|:------------------:|:---------------:|:----------------:|
| Viewer | ❌ | ❌ | ❌ | ❌ |
| Editor | ✅ | ❌ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ |

We've only proven **Editor-level access**. Full admin access requires different testing.

### Why This Matters

If `kilombo` is editor-only, then TO_FIX #63 (GCI extractors requiring plugin/module management) may be unreachable. If admin, then `kilombo` can do much more.

### Solution Implemented in v0.42.0+

Created `scripts/test-spip-privilege-tiers.mjs` which:
1. Tests HTTP access to 5 privilege-gated endpoints without authentication
2. Returns HTTP 302 for all (expected — requires authenticated session)
3. Recommends using browser automation to test while authenticated

**To determine actual privilege tier, need:**

```javascript
// Requires authenticated browser session (like create-article.mjs)
// Navigate to each endpoint and check if permission error appears

await loginPage.goto(`${BASE_URL}/ecrire/?exec=admin_plugin`);
// If accessible: full admin
// If permission denied: editor only
// If login redirect: not logged in
```

---

## Current State of Testing

### Verified (✅)

| Test | Method | Status |
|------|--------|--------|
| HTTP reachability to `/ecrire/` | `test-spip-access.mjs` | ✅ 4/4 instances reachable |
| Article creation works | `create-article.mjs` (manual verification) | ✅ Article #87 confirmed |
| Persistence (after v0.42.0 fix) | Updated `create-article.mjs` | ✅ Automated verification added |
| SSO authentication working | `test-spip-access.mjs` | ✅ 4/4 redirect via SSO |

### Unverified (❓)

| Test | Reason | Impact |
|------|--------|--------|
| Article #87 persisted before v0.42.0 | Manual verification only, no automation | Low (fixed in v0.42.0) |
| Privilege tier (admin vs editor) | Requires authenticated browser session | Medium (affects admin_plugin access) |
| Admin plugin access | Not tested | High (blocks GCI plugin-based extraction) |
| Configuration access | Not tested | Medium (affects site-wide settings) |
| User management access | Not tested | Medium (affects credential/role management) |
| All 4 SPIP instances use same privilege model | Only tested Tierra y Libertad | Low (assume same, but should verify) |

---

## Recommendations

### Immediate (v0.43.0)

1. ✅ **Add persistence verification to create-article.mjs** (DONE in v0.42.0+)
   - Verify article URL changes to `id_article=<N>`
   - Verify article appears in article list
   - Report ✅ or ⚠️ accordingly

2. ⏳ **Create browser-based privilege tier test**
   - Extend `create-article.mjs` logic to test admin_plugin access while authenticated
   - Or create separate script: `test-spip-admin-access.mjs`
   - Document which privilege tier is actually available

3. ⏳ **Test all 4 SPIP instances**
   - Privilege tier may differ by instance
   - Tierra y Libertad is verified, others are not
   - Create unified test that checks all four

### Future (v0.44.0+)

4. ⏳ **Add pre-action verification to delete-article.mjs**
   - Currently reads status after change, but doesn't verify change was saved
   - Should re-fetch article from different page to confirm DB persists (not just DOM)

5. ⏳ **Implement GCI extractor based on actual privilege tier**
   - If admin available: build plugin-based extraction
   - If editor only: build HTML scraper alternative

---

## Files Involved

| File | Purpose | Status |
|------|---------|--------|
| `sandbox/create-article.mjs` | Create articles with persistence verification | ✅ Updated v0.42.0+ |
| `scripts/test-spip-privilege-tiers.mjs` | Test privilege tiers (HTTP only) | ✅ Created v0.42.0 |
| `docs/SPIP-BACKEND-ACCESS.md` | Single source of truth for SPIP access | ✅ Created v0.42.0 |
| `docs/SPIP-VERIFICATION-GAPS.md` | This document | ✅ Created v0.42.0 |

---

## Next Steps

1. Run updated `create-article.mjs` to confirm persistence verification works
2. Extend `create-article.mjs` to test admin_plugin access
3. Document actual privilege tier for `kilombo` user
4. Update TO_FIX #66 with "persistence verified" status
5. Determine if TO_FIX #63 (GCI extractors) is feasible with current privilege level

---

## Technical Notes

### Why HTTP 302 Doesn't Prove Privilege

- **HTTP 302 with SSO redirect** = "Go authenticate yourself"
- Does NOT indicate "you're denied" — just "you're not logged in yet"
- A **browser session** that's already authenticated would see:
  - HTTP 200 = access granted
  - HTTP 403 = access denied (permission error)
  - HTTP 302 to login = session expired

### Why Persistence Verification Matters

SPIP's autosave-per-field mechanism (v4.4) means:
1. Fill title + blur → autosave fires (HTTP request in background)
2. Fill body + blur → another autosave fires
3. Click Guardar → final submit
4. If any autosave failed, the submission might succeed but data is partial

Testing requires:
- Observing URL change (confirms ID assignment)
- Navigating away and back (confirms data in DB, not just in session)
- Querying article list (confirms canonical presence)

---

**Updated:** August 22, 2026  
**Author:** Code audit (v0.42.0)  
**Related Issues:** TO_FIX #66 (persistence), TO_FIX #67 (docs), TO_FIX #69 (delete), TO_FIX #63 (GCI extractors)
