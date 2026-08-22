# KILOMBO Project — Comprehensive Bug & Inconsistency Audit Report

**Date:** August 2026  
**Scope:** Full codebase analysis covering code quality, data integrity, documentation, build/test, configuration, UI/UX, deployment, and security  
**Test Status:** ✅ All 157 tests passing  
**GitHub Actions:** ✅ Deployment pipeline working  

---

## EXECUTIVE SUMMARY

The KILOMBO project demonstrates **strong architectural discipline** with comprehensive test coverage (157 passing tests), solid data validation, and excellent documentation of known issues. However, several **critical inconsistencies** exist in documentation and **security gaps** require attention before the next major release.

**Critical Issues Found:** 2 (SPIP access contradiction, credential rotation)  
**Medium Issues Found:** 15+  
**High-Priority Fixes:** 5  

---

## 1. 🔴 CRITICAL ISSUES

### 1.1 Documentation Contradiction: SPIP Backend Access Status
**Priority:** URGENT — Blocks decision-making on article editing workflows  
**Location:** README.md vs. DEPLOYMENT-AND-SOURCE-EDITING.md vs. TROUBLESHOOTING.md vs. TO_FIX.md §67

**The Problem:**
Four key documentation files contain contradictory claims about whether the `kilombo` user has access to SPIP `/ecrire/` admin interface:

| File | Status Claim | Evidence |
|------|--------------|----------|
| README.md | ❌ NO access | Initial diagnostic conclusion (TROUBLESHOOTING.md confirms this) |
| TROUBLESHOOTING.md | ❌ NO access | Same diagnostic conclusion as README |
| DEPLOYMENT-AND-SOURCE-EDITING.md | ✅ YES access | States article creation works via `create-article.mjs` |
| TO_FIX.md §67 | ⚠️ PENDING | Flags this as "URGENT: contradictory documentation" requiring verification |

**Root Cause:**
- Script `create-article.mjs` (v0.40.1) successfully verified that SPIP backend actions work
- **But:** Team never confirmed:
  1. Which credential was used (is it `KILOMBOTOP_PASSWORD` or `KILOMBOTOP_FUTURE_PASSWORD`?)
  2. Scope of access (all SPIP instances or only specific ones?)
  3. Why initial diagnostic concluded NO access if access actually exists

**Instances Affected:**
- `www.kilombo.top` (Espacio Tierra y Libertad)
- `proletariosinternacionalistas.kilombo.top` (Proletarios Internacionalistas)
- `icg-gci.kilombo.top` (GCI)
- `in.kilombo.top` (International Global Revolution)

**Business Impact:**
- Developers following README assume no backend editing possible
- Content editors using DEPLOYMENT-AND-SOURCE-EDITING.md assume full access
- Article update and deletion workflows blocked by uncertainty
- Cannot reliably plan bulk SPIP operations

**Required Resolution (Before Next Deploy):**
1. Test each SPIP instance URL with the actual credential being used in `.env`
2. Document exact results: ✅ Access works / ❌ Access denied / ⚠️ Partial (which instances?)
3. Create single source-of-truth document: `docs/SPIP-BACKEND-ACCESS.md`
4. Update all four conflicting docs to reference that single source
5. Update TO_FIX.md §67 with resolution status

**Test Case to Validate:**
```bash
# For each SPIP instance:
curl -b credentials.txt https://icg-gci.kilombo.top/ecrire/ | grep -q "admin" && echo "✅ Access" || echo "❌ Denied"
```

---

### 1.2 GitHub Token Revoked (RESOLVED, v0.40.2) — Credential Rotation Not Scheduled
**Priority:** HIGH — Security best practice  
**Location:** docs/TOKEN-REVOCATION-STEPS.md (existing guide); TO_FIX.md §24 (proposed solution)

**Current Status:** ✅ Token rotation was emergency-performed in v0.40.2 after exposure in `.git/config`

**Remaining Gap:**
- No automated credential rotation script exists
- No documented rotation schedule (e.g., quarterly, or after each session with credential work)
- TO_FIX.md §24 proposes `scripts/rotate-password.sh` but not yet implemented

**Credentials in Scope:**
- `STATICRYPT_PASSWORD` — encryption key for static pages
- `KILOMBOTOP_PASSWORD` — production server access
- `GITHUB_TOKEN` — GitHub API access
- `GITHUB_ACTIONS_SECRET` — repository secrets storage

**Required Action:**
1. Implement `scripts/rotate-password.sh` template that:
   - Generates new credentials
   - Updates `.env` locally
   - Syncs to GitHub Actions Secrets
   - Documents old credential for audit trail
2. Document rotation schedule in `README.md` section "Maintenance"
3. Add reminder in `end-of-session.sh` if any credential-related work was done

**Until Implemented, Workaround:**
- Rotate credentials manually after any session that involves:
  - Credentials in chat or logs
  - Significant deployment changes
  - Security audit or debugging

---

## 2. 🟡 HIGH-PRIORITY MEDIUM ISSUES

### 2.1 Documentation: SPIP Delete Functionality Not Working
**Priority:** HIGH — Blocks article deletion via script  
**Location:** TO_FIX.md §69, `sandbox/delete-article.mjs`

**Issue:**
- Script successfully finds the trash ("poubelle") radio button in SPIP form
- Clicking the radio via Playwright works
- **But:** SPIP database does not persist the status change
- Likely cause: SPIP's `instituer_article` form uses different autosave JS mechanics than `article_edit` form

**Current Workaround:** Manual deletion via SPIP admin UI

**Business Impact:** Cannot safely delete articles programmatically

**Recommended Action:**
1. Debug SPIP form autosave mechanism for `instituer_article` form
2. Either: implement form submission properly, or document permanent limitation
3. Update docs to clarify manual-only deletion process

---

### 2.2 Code Quality: Unfinished TODO in Production HTML
**Priority:** MEDIUM  
**Location:** `site/js/render.mjs`, lines 229-232

**Issue:**
```javascript
const todoComment = v.ctaPlaceholder
    ? `<!-- TODO (A-2): reemplazar href por URL real del vídeo ${escapeHtml(v.id)} en tv.canal7salta.com -->`
    : '';
```

A developer TODO comment is embedded in the rendered DOM for all videos with `ctaPlaceholder: true`:
- Creates bloat in HTML source (~9 videos × 80+ character comments)
- May be read aloud by screen readers if they parse HTML comments
- Visible to end users in "View Source"
- Unprofessional in production

**Current Status:** 9 video records affected

**Recommended Action:**
1. Remove TODO comment generation from `render.mjs`
2. If tracking is needed, add a separate `notes` field to `plandemismo-actualidad.json`
3. Document procedure for updating placeholder URLs: "When real URLs are available, update `ctaUrl` field in data JSON and remove `ctaPlaceholder: true`"

---

### 2.3 Documentation: Contradictory "No SPIP Access" Claims for GCI Extractors
**Priority:** MEDIUM  
**Location:** TO_FIX.md §63, `docs/GCI-EXTRACTOR.md`

**Issue:**
- Three GCI categories identified (`gci`, `gci-in`, `gci-static`)
- Only detection logic exists; actual content extractors not implemented
- Attempting to import from these sources fails silently in earlier versions
- v0.39.1+ raises explicit error (improvement) but still blocks importing

**Affected Sites:**
- `icg-gci.kilombo.top` (GCI main archive)
- `in.kilombo.top` (International Global Revolution)
- `cdrom.kilombo.top` (CD-ROM archive with static HTML)

**Business Impact:**
- Cannot bulk-import GCI communications, texts, or programs
- Would require manual scraping + JSON entry for each article
- Blocks ROADMAP §4.2 (GCI section expansion)

**Recommended Action:**
1. Implement `scripts/extractors/gci-extractor.mjs` with HTML parsers for each GCI site structure
2. Document how each GCI site organizes content (folder structure, article templates)
3. Test against sample articles from each GCI source
4. Add to `npm test` validation: "GCI extractor can parse sample documents without error"

**Priority:** Medium (not blocking current content import, but needed for future scaling)

---

### 2.4 Configuration: Missing npm Scripts for Developer Workflows
**Priority:** MEDIUM  
**Location:** `package.json`

**Issue:**
- No `npm run lint` — ESLint should be configured to prevent console.log and other quality issues
- No `npm run format` — Prettier for code consistency
- No `npm run build` — implicit build step is `npm run encrypt`, unclear to new developers

**Current Workflow:** Developers must memorize or look up each script individually

**Recommended Action:**
1. Add ESLint with rules:
   - `"no-console": "warn"` — prevents accidental `console.log` commits
   - `"no-debugger": "warn"` — prevents `debugger;` statements
   - `"no-unused-vars": "warn"` — catches dead code
2. Add Prettier for consistent formatting
3. Update `package.json`:
   ```json
   "lint": "eslint site/js/**/*.mjs scripts/**/*.mjs test/**/*.mjs",
   "format": "prettier --write site/**/*.{mjs,css,html} scripts/**/*.mjs test/**/*.mjs",
   "build": "npm run encrypt",
   "dev": "npm run preview"
   ```
4. Document in README: "Development workflow: `npm run format` → `npm run lint` → `npm test`"

---

### 2.5 Data Quality: Six Articles Missing Publication Dates
**Priority:** MEDIUM  
**Location:** `site/assets/content/articles.json`, articles #24, #25, #26, #27, #33, #48

**Issue:**
- These articles have `"date": ""` (empty string)
- TO_FIX.md §64 documents: local snapshots don't exist for these specific articles
- Backfill script couldn't determine dates from source
- Display shows "—" in date column (cosmetic, but incomplete)

**Root Cause:**
- Articles were scraped but corresponding detail pages weren't saved locally
- Requires re-scraping from `www.kilombo.top` or manual lookup

**Business Impact:** Low — cosmetic only. Articles still readable.

**Recommended Action (When Convenient):**
1. Re-scrape these 6 articles from www.kilombo.top
2. Extract publication dates from page metadata or archive context
3. Update articles.json with `date` field
4. Run `npm test` to confirm schema validation passes

---

## 3. 🟡 MEDIUM-PRIORITY INCONSISTENCIES

### 3.1 Documentation: ROADMAP.md Cluttered With Completed Tasks
**Location:** ROADMAP.md, multiple sections

**Issue:**
- v0.38.0, v0.39.0, v0.40.1+ tasks all marked with ✅ but not removed
- Makes it harder to scan for actual **pending** work
- Document length: 500+ lines (hard to navigate)

**Recommended Action:**
1. Archive completed sections into `CHANGELOG.md` with version tags
2. Keep ROADMAP.md focused on:
   - IMMEDIATE (next 3 sessions)
   - PHASE 2 and beyond
   - Link to CHANGELOG for historical record
3. Example restructure:
   ```markdown
   # ROADMAP (Active Development)
   
   ## IMMEDIATE (Next 3 Sessions)
   - v0.32.0 — 3-tier filtering system [NEW]
   
   ## PHASE 2 (Next Month)
   - Transcription + audio publishing
   
   See CHANGELOG.md for v0.38.0–v0.41.1 completion history
   ```

---

### 3.2 Code Quality: No Console Logging Guard
**Priority:** MEDIUM  
**Location:** Scripts, site/js/

**Issue:**
- Grep for `console.log|error|warn|debug` found zero matches ✅ (good)
- **But:** No ESLint rule to prevent future commits with console statements
- Someone could accidentally commit debug code during troubleshooting

**Recommended Action:**
- See section 2.4 above (add ESLint with `"no-console": "warn"`)

---

### 3.3 Data: Placeholder URLs in 9 Videos
**Priority:** MEDIUM (known & tracked)  
**Location:** `site/assets/data/plandemismo-actualidad.json`

**Issue:**
- All 9 videos have `"ctaUrl": "https://tv.canal7salta.com/"` (root domain)
- Marked with `"ctaPlaceholder": true` to indicate incomplete
- ROADMAP.md §2.4 and TO_FIX.md identify as "A-2: URLs pendientes"

**Status:** ✅ Known and intentional

**Action When Ready:** Replace with actual video URLs from Canal7

---

### 3.4 Data: Empty French Subtitle Fields
**Priority:** LOW (gracefully handled)  
**Location:** `site/assets/data/plandemismo-actualidad.json` + plandemismo-sida-covid.json

**Issue:**
- All videos have `"subtitlesFr": ""` (empty string)
- Indicates FR subtitles not yet available

**Verification Needed:** Confirm UI doesn't render dead subtitle links when field is empty

**Action When Ready:** ROADMAP §5.3 addresses this — add FR subtitles per prioritization

---

### 3.5 Accessibility: Empty alt Attributes in Pending-Review Article
**Priority:** MEDIUM  
**Location:** `site/assets/content/articles.json`, article id `imagenes`

**Issue:**
- Article #20 contains gallery images with `alt=""`
- Violates WCAG AA standard (alt text must be descriptive)
- Article marked `status: "pending-review"` — intentional

**Status:** Tracked in PENDING-REVIEW.md §3

**Action:** During editorial review phase (ROADMAP §4), add descriptive alt text before publishing

---

### 3.6 UI: 3-Tier Filtering System Not Yet Implemented
**Priority:** MEDIUM (planned feature)  
**Location:** ROADMAP.md §v0.32.0

**Issue:**
- Comprehensive spec exists for language/status/type filtering
- UI currently has only static badges (no interactive filtering)
- Blocks: ROADMAP §0.32 implementation phase

**Status:** ✅ Spec complete, ⏳ Implementation pending

**When to Prioritize:** After content reaches 50+ articles or per user request

---

### 3.7 Infrastructure: SSH Port Blocked — Deploy to Production Halted
**Priority:** MEDIUM (infrastructure limitation)  
**Location:** TROUBLESHOOTING.md §1-2, TO_FIX.md

**Issue:**
- Port 22 (SSH) closed by firewall to external IPs
- Blocks `./sync-to-production.sh` (rsync/scp to `kilombo.top`)
- Workaround: GitHub Pages serves as interim; can open port manually when needed

**Status:** ✅ Documented & workaround in place

**When Ready for Prod Deploy:**
1. Open port 22 from YunoHost admin panel (client can do this)
2. Verify SSH connectivity: `ssh -i key kilombo@kilombo.top`
3. Run `./end-of-session.sh` to sync site/ folder

---

### 3.8 Build: CI/CD Context Exclusion Warning
**Priority:** MEDIUM (awareness)  
**Location:** `.github/workflows/deploy.yml`, lines 2-5

**Issue:**
- Comments warn that `.github/` is often excluded from AI session context bundles
- Creates blind spots if future session needs to debug CI/CD pipeline
- Risk: CI/CD configuration changes made without full context

**Mitigation:** 
- Ensure `.github/workflows/deploy.yml` is included in session context when any deployment changes needed
- Document in pre-session checklist: "Include .github/ folder if touching build/deploy logic"

---

## 4. 🟢 POSITIVE FINDINGS (No Issues)

✅ **Build & Test:** All 157 tests passing, no failures or flaky tests  
✅ **Data Validation:** All 51 articles + 10 video records pass schema and safety checks  
✅ **GitHub Actions:** Deploy pipeline working reliably, encryption functioning  
✅ **Configuration:** .env.example properly documents all variables  
✅ **Code Organization:** Strong separation of concerns (render.mjs, articles.js, validation.mjs)  
✅ **Documentation:** MIRROR_GROWING.md, TROUBLESHOOTING.md, TOKEN-REVOCATION-STEPS.md exemplary  
✅ **Accessibility:** ARIA labels, semantic HTML, color contrast checks documented  
✅ **Security:** Client-side encryption working; token rotation completed in v0.40.2  

---

## 5. SUMMARY TABLE: Issue Severity & Status

| Issue | Severity | Category | Status | Action Required |
|-------|----------|----------|--------|-----------------|
| SPIP access contradictory docs | 🔴 Critical | Documentation | Pending resolution | Verify & update all 4 docs |
| Credential rotation not scheduled | 🔴 Critical | Security | Pending implementation | Implement rotation script |
| Delete articles via script not working | 🔴 High | Functionality | Known limitation | Debug or document permanent limitation |
| TODO comment in production HTML | 🟡 Medium | Code quality | Fixable | Remove render.mjs TODO generation |
| GCI extractors not implemented | 🟡 Medium | Data import | Blocking future | Implement extractor module |
| Missing npm scripts (lint, format) | 🟡 Medium | Developer experience | Fixable | Add ESLint + Prettier |
| Six articles missing dates | 🟡 Medium | Data quality | Cosmetic | Re-scrape when convenient |
| ROADMAP cluttered with completed tasks | 🟡 Medium | Documentation | Refactoring | Archive to CHANGELOG.md |
| No console.log guard in linting | 🟡 Medium | Code quality | Preventive | Add ESLint no-console rule |
| Placeholder video URLs (9 videos) | 🟡 Medium | Data | Tracked | Update when URLs available |
| Empty FR subtitle fields | 🟡 Medium | Data | Tracked | Add subtitles per ROADMAP §5.3 |
| Pending-review article alt text missing | 🟡 Medium | Accessibility | Tracked | Complete during editorial review |
| 3-tier filtering not implemented | 🟡 Medium | UI feature | Planned | Implement per ROADMAP §v0.32.0 |
| SSH port blocked for production deploy | 🟡 Medium | Infrastructure | Workaround in place | Open port when ready |
| CI/CD context exclusion warning | 🟡 Medium | Documentation | Awareness | Include .github/ in future sessions |

---

## 6. IMMEDIATE ACTION CHECKLIST (Before Next Deploy)

- [ ] **URGENT:** Resolve SPIP access contradiction (section 1.1)
  - [ ] Test `www.kilombo.top`, `proletariosinternacionalistas.kilombo.top`, `icg-gci.kilombo.top`, `in.kilombo.top` with actual credential
  - [ ] Create `docs/SPIP-BACKEND-ACCESS.md` with findings
  - [ ] Update README.md, TROUBLESHOOTING.md, DEPLOYMENT-AND-SOURCE-EDITING.md to reference single source
  - [ ] Mark TO_FIX.md §67 as resolved

- [ ] **HIGH:** Implement credential rotation script (section 1.2)
  - [ ] Create `scripts/rotate-password.sh` template
  - [ ] Document in README.md
  - [ ] Update `end-of-session.sh` to prompt if credentials modified

- [ ] **HIGH:** Remove TODO comment generation (section 2.2)
  - [ ] Edit `site/js/render.mjs` lines 229-232
  - [ ] Add `notes` field to `plandemismo-actualidad.json` if needed
  - [ ] Run `npm test` to verify

- [ ] **MEDIUM:** Add ESLint + Prettier (section 2.4)
  - [ ] `npm install --save-dev eslint prettier eslint-config-prettier`
  - [ ] Create `.eslintrc.json` with recommended rules
  - [ ] Add `lint` and `format` npm scripts
  - [ ] Run `npm run format && npm run lint` to validate

- [ ] **MEDIUM:** Document SPIP delete limitation (section 2.1)
  - [ ] Test `delete-article.mjs` against test SPIP instance
  - [ ] Document findings in `docs/SPIP-ARTICLE-MANAGEMENT.md`
  - [ ] Add warning to README: "Article deletion requires manual SPIP UI access"

---

## 7. FUTURE ROADMAP ITEMS (Derived From This Audit)

### v0.42.0 — Quality Assurance Sprint
- [ ] Implement credential rotation script
- [ ] Add ESLint + Prettier to build pipeline
- [ ] Resolve SPIP access contradiction
- [ ] Refactor ROADMAP.md → archive completed tasks to CHANGELOG

### v0.43.0+ — Content & Feature Expansion
- [ ] Implement GCI extractors for bulk import
- [ ] Populate missing publication dates
- [ ] Implement 3-tier filtering system (v0.32.0 spec)
- [ ] Add French subtitles for videos (ROADMAP §5.3)

### v0.44.0+ — Infrastructure & Security
- [ ] Open SSH port 22 and test production deploy
- [ ] Implement credential rotation on deployment schedule
- [ ] Set up automated link-checking for content
- [ ] Full accessibility audit against WCAG AA

---

## 8. DOCUMENT REFERENCES

Key documents for ongoing reference:

- **Ongoing Issues:** `docs/TO_FIX.md` (active tracking of 69 known items)
- **Known Inconsistencies:** `docs/PENDING-REVIEW.md` (8 articles needing editorial completion)
- **Troubleshooting Guide:** `docs/TROUBLESHOOTING.md` (diagnostics & workarounds)
- **Content Import Rules:** `docs/MIRROR_GROWING.md` (comprehensive import checklist)
- **Security Procedures:** `docs/TOKEN-REVOCATION-STEPS.md` (credential rotation guide)
- **Project Roadmap:** `ROADMAP.md` (phased development plan)
- **Development Log:** `CHANGELOG.md` (version history & resolved issues)

---

## CONCLUSION

The KILOMBO project is **well-maintained with strong architectural discipline** and comprehensive testing. The issues identified in this audit are primarily:

1. **Documentation clarity** — contradictions that need resolution before next major work
2. **Developer experience** — missing tooling that would catch future bugs
3. **Known limitations** — documented issues awaiting resources or client input

**No critical blocking bugs were found.** All identified issues have workarounds or are intentionally deferred.

**Recommended Priority:** Resolve the two critical documentation/security issues (sections 1.1 and 1.2) before the next major deployment.

---

**Audit conducted:** August 2026  
**Next review recommended:** October 2026 (post-implementation of high-priority fixes)
