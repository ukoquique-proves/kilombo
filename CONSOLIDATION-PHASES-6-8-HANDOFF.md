# Phases 6–8 Handoff: Code & Data Migration

**Status:** ✅ Complete (Phases 6 and 8 executed in a follow-up session).

**Date:** August 24, 2026 (doc written) / August 27, 2026 (Phases 6 & 8 executed)
**Tests passing:** 234/234 ✅ (before and after)
**All changes reversible:** Yes — tracked in git, `git log` shows one commit per phase.

> **Note on this document:** the audit below (file counts, which scripts read which
> paths) was written speculatively before Phase 6/8 execution and turned out to be
> stale in a few places — e.g. `sandbox/` actually held 16 files, not ~61, and no
> `.py` files were present. The **Session 2 Summary** at the bottom reflects what was
> actually found and done; treat the sections above it as the original plan, not a
> literal record of the repo state.

---

## Overview

Phases 0–7 (doc reorganization) are complete. Phases 6, 8 remain: two high-risk refactorings that move code and mutable data.

| Phase | Title | Type | Risk | Est. Time | Status |
|-------|-------|------|------|-----------|--------|
| **0** | Generate docs cross-reference map | Doc | Low | 30 min | ✅ Done |
| **1** | Consolidate SPIP/Publishing docs | Doc | Low | 1 hr | ✅ Done |
| **2** | Consolidate UI/Architecture docs | Doc | Low | 1 hr | ✅ Done |
| **3** | Consolidate MIGRATION docs | Doc | Low | 30 min | ✅ Done |
| **4** | Consolidate draft-review docs | Doc | Low | 45 min | ✅ Done |
| **5** | Split TO_FIX.md into plans + runbooks | Doc | Low | 1 hr | ✅ Done |
| **7** | Update package.json description | Doc | Low | 15 min | ✅ Done |
| **6** | Resolve sandbox/ vs scripts/ ambiguity | **Code** | **High** | **3–5 hrs** | ⏸ Deferred |
| **8** | Move mutable data out of repo root | **Code+Data** | **Highest** | **1–2 hrs** | ⏸ Deferred |

---

## Phase 6: sandbox/ → scripts/ Migration

### What it is
Promote `sandbox/` debugging scripts to `scripts/` (the production script directory), consolidating both locations into one canonical, tested location.

### Current state
- **`scripts/`** (11 files) — Production migration + article management scripts
  - `migrate-to-spip.mjs` — Core publish workflow
  - `list-draft-articles.mjs` — Dashboard query
  - `manage-article-status.mjs` — Article lifecycle
  - `customize-escal-theme.mjs` — Theme automation
  - Others: test helpers, validators

- **`sandbox/`** (61 files) — Debugging + exploration scripts
  - `.mjs` scripts (Node) — manual SPIP API tests, dashboard debugging
  - `.py` scripts (Python) — SSO testing
  - `.sh` scripts (bash) — file operations, utilities
  - `.html` files — captured UI inspection snapshots
  - `.png` files — screenshot debug artifacts

### Why deferred
1. **Blast radius:** Moving 61 files requires careful classification (which belong in production? which are debug-only?).
2. **Reference updates:** Any import path in production code referencing `sandbox/` must be updated.
3. **Test coverage:** Moved scripts need to pass existing test suite; some may not qualify.
4. **Cleanup:** Some sandbox files are debugging artifacts (`.html`, `.png`) — unclear if they should be archived or deleted.

### Approach (Opción A — promote to scripts/)

**Step 1: Audit & categorize**
- Review each `sandbox/*.mjs` script — does it belong in `scripts/`?
- Review `sandbox/*.py`, `sandbox/*.sh` — production or debug-only?
- Review `sandbox/*.html`, `.png` — archive to `docs/` or delete?

**Step 2: Move production scripts**
- Move qualified `.mjs` files from `sandbox/` to `scripts/`
- Update any production code imports (search for `sandbox/` in codebase)
- Update README.md if new scripts are documented there

**Step 3: Archive debug artifacts**
- Move `.html` + `.png` snapshots to `docs/debug-snapshots/` (new folder)
- OR delete if no longer useful (verify with client first)

**Step 4: Clean up**
- Remove `sandbox/` directory entirely (or leave as symlink to `scripts/` if needed for backward compatibility)
- Run full test suite: `npm test` should pass 234/234

**Step 5: Verify references**
- Search codebase for `sandbox/` — should find zero matches (except this handoff doc)

### Implementation notes
- Use `smart_relocate` tool for moving files (auto-updates import statements)
- Before moving, create a list of all 61 files with classifications (production/debug/archive/delete)
- Get client sign-off before deleting any files (may have sentimental/historical value)

**Estimated time:** 3–5 hours (depends on file count and import complexity)

---

## Phase 8: Move Mutable Data Out of Repo Root

### What it is
Move runtime-mutable files (`articulos_en_trabajo/`, `ready-articles.json`) from repo root to a dedicated `data/` folder, keeping the repo clean and read-only except for deploy scripts.

### Current state
- **`articulos_en_trabajo/`** (folder) — In-progress JSON drafts for articles
  - Content: article JSON files being edited before migration
  - Status: Not version-controlled (in `.gitignore`), but physically in repo

- **`ready-articles.json`** (file) — Published articles snapshot
  - Content: Metadata of articles ready for publishing
  - Status: Not version-controlled, but physically in repo
  - Updated by: `scripts/migrate-to-spip.mjs`

- **`sandbox/`** (folder) — Debug output & manual tests (overlaps with Phase 6)
  - Contains `.html`, `.png` snapshots that are also not version-controlled

### Why deferred
1. **Highest risk:** Moving mutable data requires updating all references across the codebase.
2. **Production impact:** Scripts that read/write these files must be updated (e.g., `migrate-to-spip.mjs` reads `ready-articles.json`).
3. **Path management:** Hard-coded paths in scripts + documentation must all change in sync.
4. **Rollback complexity:** If something breaks, recovering `data/` paths from backed-up repo is error-prone.

### Approach

**Step 1: Create data/ folder structure**
```
data/
├── articulos_en_trabajo/    ← Move from repo root
├── ready-articles.json      ← Move from repo root
└── .gitkeep                 ← Keep folder in repo
```

**Step 2: Update all references**
Search codebase for hard-coded paths:
- `./articulos_en_trabajo` → `./data/articulos_en_trabajo`
- `./ready-articles.json` → `./data/ready-articles.json`
- Search: `'articulos_en_trabajo'`, `'ready-articles.json'`, `paths.readyArticles`, etc.

Update in:
- `scripts/migrate-to-spip.mjs`
- `scripts/list-draft-articles.mjs`
- Any other script that reads/writes these files
- `.env.example` (if it documents these paths)
- Documentation (`README.md`, `MIGRATION-WORKFLOW.md`, etc.)

**Step 3: Move files**
```bash
mkdir -p data
mv articulos_en_trabajo data/
mv ready-articles.json data/
```

**Step 4: Update .gitignore**
- Ensure `data/articulos_en_trabajo/` is in `.gitignore` (mutable)
- Ensure `data/ready-articles.json` is in `.gitignore` (mutable)
- Keep `data/.gitkeep` so folder structure is tracked

**Step 5: Verify & test**
- Run `npm test` — should pass 234/234
- Manually run `node scripts/migrate-to-spip.mjs --dry-run` — should find files at new paths
- Verify `list-draft-articles.mjs` still works

**Step 6: Document**
- Update README.md folder structure
- Update any deployment guides that reference these paths

### Implementation notes
- Use `grep_search` to find all references before updating
- Update `.env.example` and `.env` (if deploying elsewhere)
- Consider creating a `data/.gitkeep` to preserve folder in git
- After moving, verify no broken symlinks or import errors

**Estimated time:** 1–2 hours (depends on reference count and test coverage)

---

## Prerequisites for Phases 6–8

All met. Ready to proceed:

- ✅ **Doc foundation solid** — 7 phases complete, all docs consolidated, no fragmentation
- ✅ **Test suite passing** — 234/234 tests, baseline established
- ✅ **Reference map complete** — `docs-crossref.txt` identifies all doc dependencies
- ✅ **Code audit path clear** — All references (old and new) are searchable
- ✅ **No blocking issues** — TO_FIX.md split into focused files (open issues only)
- ✅ **Reversibility confirmed** — All Phase 0–7 changes are non-destructive, no files deleted

---

## Recommended Session Structure (Phases 6–8)

### Option A: Sequential (one phase per session)
- **Session 2a:** Phase 6 only (sandbox/ → scripts/) — 3–5 hrs
- **Session 2b:** Phase 8 only (move data/) — 1–2 hrs

**Pros:** Focused, easier rollback, smaller risk per session  
**Cons:** Two separate sessions

### Option B: Combined (Phases 6+8 in one session)
- **Session 2:** Phase 6 + Phase 8 together — 4–7 hrs
  - Phase 6 first (code refactoring, uses sandbox/)
  - Phase 8 second (data moves, independent of Phase 6)

**Pros:** One focused session, complete code cleanup  
**Cons:** Longer, higher fatigue risk

### Recommendation
**Option A (sequential).** Phases 6 and 8 are independent; separating them allows for:
1. Client feedback between phases
2. Clearer rollback per phase if needed
3. Easier testing / verification after each phase

---

## Checklist for Next Session (Phase 6)

Before starting Phase 6:

- [ ] Review `sandbox/` contents: `ls -la sandbox/ | wc -l` (should be ~61 files)
- [ ] Create audit list: classify each sandbox file (production/debug/archive)
- [ ] Search codebase for existing `sandbox/` references: `grep -r "sandbox/" --include="*.mjs" --include="*.js" scripts/ site/`
- [ ] Review test suite: `npm test` passes 234/234
- [ ] Create backup branch: `git checkout -b phase-6-sandbox-migration`
- [ ] Proceed with Step 1–5 above

## Checklist for Session After Phase 6 (Phase 8)

Before starting Phase 8:

- [ ] Verify Phase 6 complete: all tests pass, no `sandbox/` references remain
- [ ] Review current data/ location: `ls -la articulos_en_trabajo/ ready-articles.json`
- [ ] Search codebase for path references: `grep -r "articulos_en_trabajo\|ready-articles" --include="*.mjs" --include="*.js" scripts/`
- [ ] Review test suite: `npm test` passes 234/234
- [ ] Create backup branch: `git checkout -b phase-8-data-migration`
- [ ] Proceed with Step 1–6 above

---

## Session 1 Summary (Phases 0–7)

**Completed:**
- ✅ Phase 0: Generated `docs-crossref.txt` (449 lines, all docs + ref counts)
- ✅ Phase 1: SPIP/Publishing docs → SPIP-ACCESS.md canonical + scope notes
- ✅ Phase 2: UI/Architecture docs → CLIENT-UI + UI-ARCHITECTURE-SPEC canonical
- ✅ Phase 3: MIGRATION.md + MIGRATION-WORKFLOW.md → scope clarifiers (separate)
- ✅ Phase 4: Draft-review docs → VIEWING-DRAFT-ARTICLES canonical + cross-refs
- ✅ Phase 5: TO_FIX.md split → active issues only + docs/plans/ + docs/runbooks/
- ✅ Phase 7: package.json description updated (Express backend + Groq AI)
- ✅ README.md: Updated directory tree to reflect new folder structure

**Test results:** 234/234 ✅  
**Files modified:** 19 (all tracked, none deleted)  
**Changes reversible:** Yes

**Outcome:** Doc foundation solid. Phases 6–8 (code/data) ready for next focused session(s).

---

## Session 2 Summary (Phases 6 & 8 — August 27, 2026)

**Actual `sandbox/` audit (differs from the speculative plan above):** 16 files, not ~61;
no `.py` files existed.

**Phase 6 — done:**
- Production (spawned/imported by real code) → moved to `scripts/`:
  `create-article.mjs` (spawned by `api/server.mjs`; also referenced via a
  `SANDBOX_DIR` constant in `scripts/lib/spip-client.mjs` that was actually used
  at runtime — this was the highest-risk single fix), `probe-rubriques.mjs`,
  `scrape-curl.sh`, `scrape-comprehensive.sh` (used by `npm run scrape` / `scrape:full`).
- Exploratory/debug-only → moved to new `scripts/debug/`:
  `list-tierra-articles.mjs`, `scrape.cjs`, `decrypt-staticrypt.mjs`, `decrypt-staticrypt.sh`.
- Screenshot/HTML captures → moved to new `docs/debug-snapshots/` (8 files).
- Updated every real reference (code + tests + docs); `sandbox/` directory removed entirely.
- Also fixed several **pre-existing** stale doc references to sandbox scripts that
  had already been deleted before this session even started (e.g.
  `sandbox/test-admin-plugin-access.mjs`, superseded by
  `scripts/test-spip-privilege-tiers.mjs`).

**Phase 8 — done:**
- Real code paths were narrower than this doc assumed: only
  `scripts/lib/drafts-store.mjs` (`WORK_DIR`), `scripts/extract-ready-articles.mjs`,
  and `test/drafts-store.test.mjs` touched these paths — `migrate-to-spip.mjs` does not.
- Moved `articulos_en_trabajo/` → `data/articulos_en_trabajo/` and
  `ready-articles.json` → `data/ready-articles.json`.
- Updated the 3 real code references, `.gitignore` (data contents ignored, `data/`
  itself tracked via `.gitkeep`), `.env.example`, and repo-relative doc mentions in
  README.md, ROADMAP.md, PUBLISHING-GUIDE.md, docs/CLIENT_UI.md,
  docs/CLIENT-UI-IMPLEMENTATION-PLAN.md, .kiro/steering/use-env-vars.md.
- Left `docs/ARTICLE-PUBLISHING-WORKFLOW.md` and `docs/ARTICLE-TRANSFORMATION-LOG.md`
  alone aside from one clarifying note — their `/root/JOB-sda2/...` paths describe a
  specific external machine's historical layout, not this repo.
- Verified live: `drafts-store.mjs`'s `listDrafts()`/`listReady()` correctly resolve
  the new path (7 drafts, 0 ready, matching what's on disk).

**Verification:** `npm test` → 234/234 passing after each phase. `grep -r "sandbox/"`
across code and current-state docs returns zero matches (CHANGELOG.md's historical
entries and this doc's own history are intentionally left untouched).

**Rollback:** each phase is its own git commit (`git log --oneline` in this repo);
`git revert` either commit independently if needed.

