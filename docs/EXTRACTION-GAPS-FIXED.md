# Extraction Gaps Fixed — v0.39.1

Two silent failures in the article import pipeline have been identified and fixed.

## Gap 1: Unextracted Media Silently Shipped as "Complete"

### The Problem

The extraction pipeline determines article completeness using a weak heuristic: text length < 200 chars + no links = "image only, needs review". However, this heuristic **only looked at text inside `id="texte-article"`** (the SPIP body block).

In reality, articles often contain media outside that block:
- **Portfolio images** — live in a separate `<div class="portfolio">` block managed by SPIP's media manager, never scanned
- **Attached documents** — PDFs, spreadsheets, etc., referenced only as bare links with no surrounding context

### Real Example: Article 21 (`basta-de-esclavitud-plandemica`)

- Source page contains **18 `<img>` tags** total
- `<div id="texte-article">` contains **0 images** — all 18 live in the portfolio block
- Body text: ~50 chars (the bare PDF link: "basta_sp-2.pdf")
- `hasLink = true` (the PDF link exists) → `isImageOnly = false`
- **Result shipped:** `status: "imported"` with all 18 images silently dropped, leaving only the dead link

Nobody flagged this because the presence of a link technically passes the heuristic, even though the real content (the flyer) was never extracted.

### Root Cause

The heuristic conflates two separate questions:
1. "Is there enough extracted text to assume the article is complete?" 
2. "Is there evidence of unextracted media that might need deeper scraping?"

Answer to (1) was being used for (2), which fails when the answer differs.

### The Fix

Added explicit detection for unextracted media patterns:

```javascript
// Detect portfolio images outside the body block
const portfolioImages = html.match(/<div[^>]*class="[^"]*portfolio[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
const unextractedImgCount = portfolioImages ? (portfolioImages[1].match(/<img/gi) || []).length : 0;

// Detect document links with insufficient surrounding text
const hasDocumentLink = /<a[^>]*href=(?:['"])?[^'"\s]*\.(?:pdf|doc|docx|xls|xlsx|zip|rar|7z)['"']?/i.test(rawBody);
const documentLinkWithoutContext = hasDocumentLink && plainTextLength < 100;

// Force pending-review if unextracted media is detected
const hasUnextractedMedia = unextractedImgCount > 0 || documentLinkWithoutContext;
```

**Behavior change:**
- If `hasUnextractedMedia = true`, force `status: pending-review` regardless of other heuristics
- Add `notes[]` field to surface the warning to the human reviewer
- Print warning to console during import: `⚠️  {id}: Documento adjunto ... no extraído`

**Result:** Article 21 would now be flagged as `pending-review` with a note about the 18 portfolio images, instead of silently shipping incomplete.

---

## Gap 2: 51% of Imported Articles Have Empty Dates

### The Problem

Date extraction used a hard-coded regex expecting `id="date-article"`:

```javascript
const dateMatch = html.match(/id="date-article"[^>]*>[^<]*<span[^>]*>([^<]+)</);
```

However, SPIP has template variants. On many Tierra pages, the markup uses `class="date-article"` instead. Same semantic meaning, different syntax.

**Result:** 21 out of 43 articles (51%) have empty date fields, because the regex never matched.

### Root Cause

The regex was written for one template variant and never tested against the full spectrum of real-world SPIP markup. No regression test existed to catch this.

### The Fix

Updated the date regex to accept both `id=` and `class=` attributes using an alternation group:

```javascript
// Before:
const dateMatch = html.match(/id="date-article"[^>]*>[^<]*<span[^>]*>([^<]+)</);

// After:
const dateMatch = html.match(/(?:id|class)="date-article"[^>]*>[^<]*<span[^>]*>([^<]+)</);
```

**Behavior change:**
- Both `<div id="date-article">` and `<div class="date-article">` patterns now match
- Date is extracted correctly in both cases

**Verified:** Extracted date from article-12.html (which uses the class variant): `16 de mayo de 2021` ✓

---

## Testing & Verification

### New Unit Tests

Added 5 new tests to `test/import-article.test.mjs`:

1. **Date extraction with `id=` attribute** — existing regex path
2. **Date extraction with `class=` attribute** — new regex path (Gap 2 fix)
3. **Unextracted portfolio image detection** — flags with warning (Gap 1 fix)
4. **Document link + insufficient context** — flags as pending-review (Gap 1 fix)
5. **Normal article with substantial text + document link** — does NOT flag false positive

All 16 import-article tests pass (11 existing + 5 new).

### Full Test Suite

- **142/142** unit tests passing
- **43 articles** valid in data validation
- **7 URLs** consistent across sources
- **11 cards** with correct Level 1/2 badges

### Manual Verification

- Ran import script with `--dry-run --force-update` on article-12.html (class="date-article" variant)
- Date extracted successfully: `"date": "16 de mayo de 2021"`
- No unextractedMediaWarning (article has substantial text, not flagged as false positive)

---

## Impact on Existing Data

The fixes are **detection + classification improvements**, not data corrections. Existing articles are unaffected:

- **Gap 1 fix:** Will catch these issues on **new imports** going forward. Existing articles with silently-dropped media remain as-is (data integrity was never violated; they're just incomplete). A separate pass could re-import articles flagged with `notes` mentioning unextracted media.

- **Gap 2 fix:** Dates remain empty for the 21 existing articles that were imported under the old regex. **No automatic correction** — this is intentional, to preserve the exact HTML extraction state. A separate backfill could re-run extraction on existing articles using the new regex, but that's a separate task.

---

## Going Forward

### For Future Imports

1. Use `npm run import-article -- --url <url> --section <section> --topics <topics> --dry-run` to preview
2. Review the warnings in the console output — if `⚠️ Documento adjunto` appears, manually inspect the source page
3. Decide: extract supplementary media manually, or proceed with `pending-review` status
4. Add `--status imported` only if all media is accounted for

### For Existing Data

- 21 articles with empty dates + 1 with unextracted media are recorded but not automatically corrected
- Add to `docs/TO_FIX.md` as a future enhancement: "Backfill date extraction on articles with empty date field using new regex variant"

---

## Commit Reference

```
Fix gaps in article extraction: date regex variant + unextracted media detection

Gap 1: The extraction previously only looked at body text to detect if an article 
needed review. This missed portfolio images, attached PDFs, and other media that 
live outside the main body block.

Gap 2: Date extraction failed on 51% of articles because the code only matched 
id="date-article" but many pages use class="date-article" instead.

See docs/EXTRACTION-GAPS-FIXED.md for details.
```
