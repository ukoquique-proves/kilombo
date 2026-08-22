# KILOMBO Audit — Quick Reference Summary

**Full audit report:** See `BUG-AUDIT-REPORT.md` for comprehensive analysis

---

## 🔴 CRITICAL — Fix Before Next Deploy

### 1. Resolve SPIP Access Contradiction
**Files affected:** README.md, TROUBLESHOOTING.md, DEPLOYMENT-AND-SOURCE-EDITING.md, TO_FIX.md §67

**The problem:** Docs say both "NO access to SPIP backend" and "YES access works". Need to verify.

**Action:**
1. Test each SPIP instance with actual credential:
   - `www.kilombo.top`
   - `proletariosinternacionalistas.kilombo.top`
   - `icg-gci.kilombo.top`
   - `in.kilombo.top`
2. Create single source-of-truth: `docs/SPIP-BACKEND-ACCESS.md`
3. Update all four conflicting docs to reference it

**Impact:** Blocks article editing/deletion workflows

---

### 2. Implement Credential Rotation Script
**Location:** TO_FIX.md §24, `.env` management

**The problem:** GitHub token was revoked in v0.40.2, but no automated rotation schedule exists.

**Action:**
1. Create `scripts/rotate-password.sh` to automate credential updates
2. Add to `README.md`: credential rotation schedule (e.g., quarterly)
3. Update `end-of-session.sh` to prompt if credentials were used

**Impact:** Prevents future token exposure incidents

---

## 🟡 HIGH-PRIORITY — Fix This Session

### 3. Remove TODO Comment From Production HTML
**Location:** `site/js/render.mjs`, lines 229–232

**The problem:** Developer TODO embedded in rendered DOM (9 videos affected), visible in "View Source", read by screen readers

```javascript
// REMOVE THIS:
const todoComment = v.ctaPlaceholder
    ? `<!-- TODO (A-2): reemplazar href... -->`
    : '';
```

**Action:**
1. Delete lines 229–232 from `render.mjs`
2. Use `notes` field in JSON instead if tracking is needed
3. Run `npm test` to verify

**Impact:** Unprofessional appearance; potential accessibility issue

---

### 4. Add ESLint + Prettier for Code Quality
**Location:** `package.json`, no linting currently

**The problem:** No guard against accidental `console.log`, `debugger`, or unused variables in commits

**Action:**
```bash
npm install --save-dev eslint prettier eslint-config-prettier
# Create .eslintrc.json with "no-console": "warn" rule
# Add to package.json: "lint": "eslint site/js/**/*.mjs"
```

**Impact:** Prevents future debug code from reaching production

---

### 5. Fix Script: Delete Articles Not Persisting
**Location:** `sandbox/delete-article.mjs`

**The problem:** Article status changes to trash but SPIP database doesn't persist it

**Action:**
1. Debug SPIP form autosave for `instituer_article` form
2. Document findings in `docs/SPIP-ARTICLE-MANAGEMENT.md`
3. Document permanent limitation if can't fix: "Use SPIP admin UI for deletions"

**Impact:** Cannot programmatically delete articles

---

## 🟢 MEDIUM-PRIORITY — Nice to Have

### 6. Archive Completed Tasks From ROADMAP
**Location:** ROADMAP.md

**The problem:** v0.38–v0.41 completed tasks clutter the 500+ line document; hard to find actual pending work

**Action:**
1. Move completed sections to CHANGELOG.md with version tags
2. Keep ROADMAP focused on IMMEDIATE + PHASE 2+
3. Link to CHANGELOG for historical record

---

### 7. Implement GCI Extractors
**Location:** TO_FIX.md §63

**The problem:** Cannot bulk-import from GCI sites — only detection logic exists, no actual extractors

**Action:**
1. Implement `scripts/extractors/gci-extractor.mjs`
2. Parser for each GCI site structure (icg-gci.kilombo.top, in.kilombo.top, cdrom.kilombo.top)
3. Test against sample documents

**Impact:** Enables bulk GCI content import (ROADMAP §4.2)

---

### 8. Update Missing Publication Dates
**Location:** `site/assets/content/articles.json`, articles #24, #25, #26, #27, #33, #48

**The problem:** 6 articles have empty date fields (cosmetic only)

**Action:**
1. Re-scrape from `www.kilombo.top`
2. Extract dates from page metadata
3. Update articles.json, run `npm test`

**Impact:** Cosmetic fix; low priority

---

## ✅ WHAT'S WORKING WELL

- ✅ **Tests:** 157 passing, excellent coverage
- ✅ **Data:** All 51 articles + 10 videos pass validation
- ✅ **Deploy:** GitHub Actions working reliably
- ✅ **Docs:** MIRROR_GROWING.md, TROUBLESHOOTING.md excellent
- ✅ **Security:** Client-side encryption working; token rotation completed

---

## 📋 QUICK CHECKLIST

**Before next deploy:**
- [ ] SPIP access contradiction resolved
- [ ] Credential rotation script created
- [ ] TODO comment removed from render.mjs
- [ ] ESLint + Prettier added
- [ ] Delete script limitation documented

**Next sprint:**
- [ ] Archive ROADMAP completed tasks
- [ ] Implement GCI extractors
- [ ] Update missing dates
- [ ] Refactor SPIP auth code (DRY principle)

---

**See `BUG-AUDIT-REPORT.md` for full details and code locations.**
