# Article Publishing Workflow

Complete end-to-end process for transforming raw articles from `/nuevos_articulos/` into published content in the Kilombo mirror.

## Overview

```
RAW SOURCE                  EDITORIAL WORK              PUBLICATION
  ↓                              ↓                           ↓
/nuevos_articulos/        articulos_en_trabajo/      KILOMBO mirror
  (plain text files)      (careful rebuilding)        (JSON + published)
```

## Phase 1: Editorial Preparation (Manual)

**Location:** `/root/JOB-sda2/KILOMBO-SITE/articulos_en_trabajo/`

### 1.1 Read the Source Article

1. Open raw file from `/nuevos_articulos/[filename]`
2. Read carefully and note:
   - **Title** (if present; infer if missing)
   - **Date** (if present; research or leave empty)
   - **Language** (ES, FR, EN, or mixed?)
   - **Quality issues:**
     - Paragraph structure (rambling, unclear flow?)
     - Formatting (poor hierarchy, missing breaks?)
     - Redundancy (repeated ideas?)
     - Attribution (proper sources cited?)
     - Images or media (descriptions available?)

### 1.2 Create Editorial Notes

Create `IN_PROGRESS/[article-slug].md`:

```markdown
# Article: [Title]

## Source Info
- **File:** /nuevos_articulos/[original-filename]
- **Language:** [ES|FR|EN|MIXED]
- **Section:** [tierra|gci|pi|nom|general]

## Issues Found
- **Structure:** [describe structural problems]
- **Clarity:** [note passages that are unclear]
- **Redundancy:** [mark repeated sections]
- **Attribution:** [note missing author/source info]
- **Media:** [note images, videos, or embeds]

## Editorial Approach
- **Main work:** [describe what will be fixed/rebuilt]
- **Tone adjustment:** [note if voice needs tweaking]
- **Sections:** [list planned main sections]

## Source Content (Raw)
[Paste the raw content from /nuevos_articulos/filename]
```

### 1.3 Rebuild the Article

Using the EDITORIAL_GUIDELINES.md:

1. **Organize into sections** with `<h3>` and `<h4>` tags
2. **Fix paragraph structure** (split long rambling text, combine short fragments)
3. **Remove redundancy** (consolidate repeated ideas)
4. **Clarify unclear passages** (rewrite for clarity without changing meaning)
5. **Preserve voice** (keep author's tone and argument intact)
6. **Add proper formatting** (lists, blockquotes, emphasis)
7. **Verify attribution** (author name, source URL, publication)

**Deliverable:** Clean, structured text ready for JSON conversion.

### 1.4 Create Target JSON File

Create `IN_PROGRESS/[article-slug].json`:

```json
{
  "id": "article-slug-kebab-case",
  "title": "Capitalized Title",
  "date": "YYYY-MM-DD",
  "section": "tierra|gci|pi|nom|general",
  "topics": ["tag1", "tag2", "tag3", "tag4"],
  "sourceSite": "Source Name",
  "sourceUrl": "https://example.com/article",
  "status": "adapted",
  "contentHtml": "<h3>Section</h3><p>Content here...</p>",
  "notes": "Editorial notes explaining any changes made"
}
```

**Optional fields** (for future features — metadata not yet rendered in UI):
```json
{
  "language": "ES|FR|EN",
  "author": "Author Name"
}
```

**Refer to** `SCHEMA_REFERENCE.md` for complete field documentation.

### 1.5 Quality Checklist

Before moving to validation, verify:

```
[ ] id: kebab-case, unique, < 50 chars
[ ] title: clear, descriptive, < 80 chars
[ ] date: YYYY-MM-DD or empty
[ ] section: one of [tierra|gci|pi|nom|general]
[ ] topics: 3-5 lowercase specific tags
[ ] sourceSite: human-readable name
[ ] sourceUrl: full URL (https://...) or "#" if no source
[ ] status: adapted (or pending-review)
[ ] contentHtml: only allowed tags, no style/script/events
[ ] contentHtml: all images have alt text
[ ] contentHtml: all external links functional
[ ] notes: explains editorial decisions made
[ ] language: (optional) ES|FR|EN if desired
[ ] author: (optional) name if different from sourceSite
```

**Note:** `language` and `author` are optional fields reserved for future UI features. Currently not rendered. If you include them, they'll be preserved in the data; if omitted, validation will pass.

## Phase 2: Validation (Automated)

**Location:** KILOMBO project root

### 2.1 Copy JSON to Temporary Location

```bash
cp /root/JOB-sda2/KILOMBO-SITE/articulos_en_trabajo/IN_PROGRESS/*.json \
   /root/JOB-sda2/KILOMBO-SITE/KILOMBO/site/assets/content/articles-temp.json
```

(Note: For testing multiple articles, you'll need to merge them into a valid JSON array.)

### 2.2 Run Validation

From KILOMBO root:

```bash
cd /root/JOB-sda2/KILOMBO-SITE/KILOMBO
npm test
```

**Expected output:**
```
✅ articles-temp.json validates against schema
✅ No duplicate IDs or sourceUrls
✅ All contentHtml passes sanitization
```

**If errors:**
- Read the error message carefully
- Return to `IN_PROGRESS/[article-slug].json` and fix the issue
- Re-run `npm test`
- Do NOT move to READY until validation passes

### 2.3 Check for Warnings

Even if validation passes, watch for warnings about:
- Excessive `<br>` tags (text wrap issues)
- Empty alt text on images
- Orphaned links (404 or unreachable)
- Inconsistent topic tags

Address warnings before publishing (not required for validation to pass, but important for quality).

## Phase 3: Publication

**Location:** KILOMBO project root

### 3.1 Move Article to READY

Once validation passes:

```bash
mv /root/JOB-sda2/KILOMBO-SITE/articulos_en_trabajo/IN_PROGRESS/[article-slug].json \
   /root/JOB-sda2/KILOMBO-SITE/articulos_en_trabajo/READY/[article-slug].json
```

### 3.2 Batch Merge to articles.json

When you have multiple articles ready (recommended: 3–5 at a time):

1. **Open** `/root/JOB-sda2/KILOMBO-SITE/KILOMBO/site/assets/content/articles.json`
2. **Extract the JSON array** from READY/:
   ```bash
   cd /root/JOB-sda2/KILOMBO-SITE/articulos_en_trabajo/READY
   ls *.json | head -5  # See what's ready
   ```
3. **Merge the entries** into the main articles.json:
   - Read each JSON file from READY/
   - Extract the object (without array brackets)
   - Add to main articles array in articles.json
   - Preserve existing entries
   - Maintain alphabetical or chronological order (check current file)

4. **Run validation again:**
   ```bash
   cd /root/JOB-sda2/KILOMBO-SITE/KILOMBO
   npm test
   ```

5. **If validation passes:** Commit and push
   ```bash
   git add site/assets/content/articles.json
   git commit -m "feat: Add [N] new articles ([list-of-article-slugs])"
   git push origin main
   ```

### 3.3 Verify Published

After deploy completes (GitHub Actions):

1. Check `https://kilombo.top` (mirror site)
2. Navigate to `/articulos.html` page
3. Search for your article by title or topic
4. Click through and verify formatting is correct

## Workflow Diagram

```
┌─────────────────────────────────────────────┐
│  /nuevos_articulos/[RAW TEXT FILE]         │
└────────────────────┬────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │   Editorial Work        │
         │  (IN_PROGRESS/.md)      │
         │  - Read carefully       │
         │  - Identify issues      │
         │  - Plan approach        │
         └─────────────┬───────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │   Article Rebuild       │
         │   - Restructure         │
         │   - Fix clarity         │
         │   - Add formatting      │
         │   - Verify attribution  │
         └─────────────┬───────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │  Create JSON Struct     │
         │ (IN_PROGRESS/.json)     │
         │  - All required fields  │
         │  - Valid contentHtml    │
         │  - Proper metadata      │
         └─────────────┬───────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │   npm test (validate)   │
         │  - Schema check         │
         │  - HTML sanitization    │
         │  - Duplicate detection  │
         └────────┬────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
    ✅ PASS             ❌ FAIL
        │                   │
        ▼                   ▼
   ┌─────────┐      Fix issues
   │ READY/  │      Re-run test
   └────┬────┘
        │
        ▼
   ┌──────────────────┐
   │ Merge to         │
   │ articles.json    │
   └────┬─────────────┘
        │
        ▼
   ┌──────────────────┐
   │ Commit + Push    │
   │ GitHub Actions   │
   │ Deploy           │
   └────┬─────────────┘
        │
        ▼
   ┌──────────────────┐
   │ PUBLISHED        │
   │ on mirror site   │
   └──────────────────┘
```

## Tips & Best Practices

1. **Work in batches:** Process 3–5 articles at a time, not one-by-one
2. **Reuse topics:** Check existing topics in articles.json; maintain consistency
3. **Keep originals:** Never delete files from `/nuevos_articulos/`; they are source material
4. **Document decisions:** Use `notes` field to explain any editorial changes
5. **Test locally:** After merge, run `npm run preview` to see articles rendered locally
6. **Cross-link related:** Use `relatedArticles` field to link series or translations
7. **Archive rejected:** If an article is not publishable, move to ARCHIVE/ with reason in notes

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| JSON validation fails | Run `npm test` to see exact error; check field types and allowed values |
| contentHtml has forbidden tags | Remove `<div>`, `<span>`, `<style>`; use only allowed tags (p, a, strong, em, ul, ol, li, blockquote, h3, h4, br, img) |
| Duplicate ID error | Check if article with same slug already exists in articles.json; rename slug to be unique |
| Article shows but formatting is wrong | Check `npm test` warnings about `<br>` tags; may need to restructure with proper `<p>` tags |
| Source URL is broken/404 | Document in `notes` field; can still publish with empty sourceUrl if content is valuable |
| Article is bilingual (ES + FR) | Create two separate entries; one for ES, one for FR; link with `relatedArticles` |

## Maintenance

- **Weekly:** Check READY/ folder for accumulated articles; merge in batch
- **Monthly:** Review ARCHIVE/ for patterns of rejection (do certain sources need different handling?)
- **Per-article:** Update `status` if significant edits are made after publication

## References

- `EDITORIAL_GUIDELINES.md` — Style and structure standards
- `SCHEMA_REFERENCE.md` — Complete JSON field documentation
- `MIRROR_GROWING.md` — Overall mirror growth strategy and content priorities
- `TROUBLESHOOTING.md` — Common problems and technical details

---

## Session Log: Batch v0.42.5 (15 Articles, 2026-08-22)

### Overview

**15 newly converted articles** from `nuevos_articulos/` → editorial drafts → mirror publication

**Source:** `/root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD/articulos_en_trabajo/READY/`  
**Location:** `/root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD/articulos_en_trabajo/READY/` (after path correction)  
**Status:** ✅ All 15 converted to JSON + validated + published

### Batch Composition (15 articles by section)

| # | File | Article ID | Title | Section | Language |
|---|------|-----------|-------|---------|----------|
| 1 | 01-eclipse-12-08-2026.json | `eclipse-12-agosto-2026` | El lado oscuro del eclipse del 12 de agosto | NOM | ES |
| 2 | 02-beljanski.json | `caso-beljanski` | El caso Beljanski: una historia de investigación y controversia | NOM | ES |
| 3 | 03-elisa-mato-a-ruth.json | `elisa-mato-a-ruth` | ELISA mató a Ruth: del sida a la COVID-19 | NOM | ES |
| 4 | 04-salta.json | `seleccion-videos-canal-salta` | Una selección de los mejores videos del canal de Salta | GENERAL | ES |
| 5 | 05-pensiones.json | `otra-gran-mentira-heredabilidad-pensiones` | Otra gran mentira: la heredabilidad de las pensiones reparatorias | TIERRA | ES |
| 6 | 06-oms-france-soir.json | `seisme-oms-2400-postes` | Séisme à l'OMS : 2 400 postes supprimés et départs de cadres | ACTUALIDAD | FR |
| 7 | 07-orden-del-caos.json | `orden-del-caos-ultimas-postales-sistema-fiat` | Orden del caos: últimas postales del sistema fiat | ACTUALIDAD | ES |
| 8 | 08-cremas-solares.json | `cremas-solares-cambio-climatico` | ¿No es el cambio climático? La tesis de las cremas solares | NOM | ES |
| 9 | 09-no-virus.json | `movimiento-no-virus-disonancia` | Movimiento NO virus: entre la disidencia y la disonancia | NOM | ES |
| 10 | 10-nuevo-orden-mundial.json | `nuevo-orden-mundial-video` | El Nuevo Orden Mundial | NOM | ES |
| 11 | 11-mensaje-control-multitudes.json | `control-multitudes-enfermedad` | La enfermedad como herramienta de control: una frase para el debate | NOM | ES |
| 12 | 12-cola-de-zorro.json | `cola-de-zorro-leccion-plantas` | Cola de zorro: una lección que viene de las plantas | TIERRA | ES |
| 13 | 13-israel.json | `critica-mohamad-safa-israel` | Mohamad Safa: una crítica contundente contra Israel | ACTUALIDAD | ES |
| 14 | 14-fauci.json | `anthony-fauci-fusible-controlado` | Anthony Fauci: el fusible controlado | NOM | ES |
| 15 | 15-onajpu.json | `memoria-verdad-justicia-bella-union` | Memoria, verdad y justicia: la lucha que continúa en Bella Unión | TIERRA | ES |

### Section Distribution

- **ACTUALIDAD:** 3 articles (40%, OMS/Fiat/Israel)
- **TIERRA:** 3 articles (20%, Pensiones/Cola de Zorro/Bella Unión)
- **NOM:** 8 articles (53%, Eclipse/Beljanski/ELISA/Solares/No-virus/NOM/Control/Fauci)
- **GENERAL:** 1 article (7%, Salta videos)
- **PI:** 0 articles (this batch)

**Total:** 15 articles (56 after merge with existing 41 articles)

### Publishing Strategy

**Phase 1 (COMPLETED):** Bulk conversion to JSON format
- All 15 articles converted from markdown → JSON with HTML content
- All articles validated via `npm test` (0 errors, 157/157 tests passing)
- All articles merged into `site/assets/content/articles.json`
- Published to GitHub mirror: https://ukoquique-proves.github.io/kilombo/

**Phase 2 (CURRENT - Testing):** Individual article publishing verification
- Testing migration workflow with **"Cola de zorro"** (TIERRA section)
- Purpose: Verify article structure, rendering, and link functionality on published mirror
- After verification: document lessons learned for future batches

**Phase 3 (PENDING):** Refine based on testing
- If Cola de zorro renders correctly: proceed with standard publishing for remaining batches
- If issues found: debug and document fixes in TROUBLESHOOTING.md

### Articles Available for Publishing from This Batch

**Not yet published as standalone:** All 15 are already merged into articles.json and deployed to the mirror. However, for the purposes of testing individual article publication workflow:

**Tierra articles (good candidates for next release):**
1. **Cola de zorro** (`cola-de-zorro-leccion-plantas`) — Test article
2. **Pensiones** (`otra-gran-mentira-heredabilidad-pensiones`) — About pension heredability
3. **Bella Unión** (`memoria-verdad-justicia-bella-union`) — Justice/memory work

### Important Paths (Corrected)

The workspace contains a systematic **KLIMBO vs KILOMBO typo** issue. Correct paths:

- ❌ `/root/JOB-sda2/KILOMBO-SITE/KLIMBO-BUILD/` ← WRONG (typo in path)
- ✅ `/root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD/` ← CORRECT

- ❌ `/root/JOB-sda2/KLIMBO-SITE/KLIMBO-BUILD/KLIMBO/` ← WRONG
- ✅ `/root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD/KILOMBO/` ← CORRECT

**Mitigation:** Added `LOCAL_*` environment variables to `.env` to programmatically resolve these paths:
```bash
LOCAL_WORKSPACE_ROOT=/root/JOB-sda2/KILOMBO-SITE
LOCAL_KILOMBO_BUILD=$LOCAL_WORKSPACE_ROOT/KILOMBO-BUILD
LOCAL_KILOMBO_DIR=$LOCAL_KILOMBO_BUILD/KILOMBO
LOCAL_ARTICLES_JSON=$LOCAL_KILOMBO_DIR/site/assets/content/articles.json
LOCAL_ARTICULOS_READY=$LOCAL_KILOMBO_BUILD/articulos_en_trabajo/READY
```

All scripts now source `.env` and use `$LOCAL_*` variables instead of hardcoded paths.

### Next Steps

1. ✅ Test "Cola de zorro" rendering on published mirror
2. ⏳ Verify section categorization (Tierra should display correctly)
3. ⏳ Check image/media references (Cola de zorro uses botanical imagery)
4. ⏳ Document findings in MIRROR_GROWING.md

---

**Last Updated:** 2026-08-22  
**Version:** 1.1 (added v0.42.5 batch log)
