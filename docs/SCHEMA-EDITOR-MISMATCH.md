# Schema-Editor Mismatch: Documentation vs. Validation

**Status:** ⚠️ CRITICAL — Automation-blocking issue

The editorial documentation (ARTICLE-PUBLISHING-WORKFLOW.md) contains incorrect guidance that will cause drafts to either fail CI unexpectedly or silently lose data if used by automated pipelines.

---

## The Problem

Three fields documented in the template don't match the actual schema or validator:

1. **`author` field** — Template suggests it exists, but it's not in ARTICLES.schema.md and silently dropped by validator
2. **`language` field** — Template suggests it's required, but validator doesn't require it and it's not rendered
3. **`sourceUrl` field** — Template says "full URL or empty string", but validator REJECTS empty strings

---

## Discrepancy #1: Author Field (Silently Dropped)

### What the template says:
```markdown
### 1.4 Create Target JSON File

Create `IN_PROGRESS/[article-slug].json`:

```json
{
  ...
  "author": "Author Name (optional)",
  ...
}
```

### What actually happens:
- **ARTICLES.schema.md** — No `author` field documented at all
- **validate-data.mjs** — No rule for `author` (it's not in ARTICLE_RULES or ARTICLE_OPTIONAL_RULES)
- **Site rendering** — No code to display author (articles.js doesn't read it)
- **Result** — If an editor adds `author`, it silently disappears during validation and is never rendered

### Evidence:
Two existing articles HAVE author fields (both fail validation if run fresh):
- Article "anthony-fauci-fusible-controlado" → author: "Yves Rasir"
- Article "cremas-solares-cambio-climatico" → author: "Almudena Zaragoza"

These authors are currently embedded in `contentHtml` (in blockquotes) as a workaround.

---

## Discrepancy #2: Language Field (Not Required, Not Rendered)

### What the template says:
```json
{
  ...
  "language": "ES|FR|EN",
  ...
}
```

And in the checklist:
```markdown
[ ] language: ES|FR|EN (single language only)
```

### What actually happens:
- **ARTICLES.schema.md** — No `language` field documented
- **validate-data.mjs** — No rule for `language` (optional or required)
- **Site rendering** — No code to display language
- **Result** — If an editor adds `language`, it's silently dropped (or silently ignored if omitted)

### Why it matters:
- Editorial process expects to track article language
- But the data is lost and never used
- Future multilingual features (planned) won't have this metadata

---

## Discrepancy #3: sourceUrl Can't Be Empty String

### What the template says:
```markdown
[ ] sourceUrl: full URL or empty string
```

### What actually happens:
- **ARTICLES.schema.md** — "Required, must be absolute HTTP(S) URL"
- **validate-data.mjs** — sourceUrl validation (line 258):
  ```javascript
  validate: (v) => {
    if (!isSafeUrl(v))
      return `sourceUrl "${v}" uses a forbidden scheme...`;
    if (!isAbsoluteOrExempt(v))
      return `sourceUrl "${v}" must be an absolute https?:// URL...`;
    return null;
  }
  ```
- **Result** — Empty string `""` fails both checks (not safe, not absolute)

### Evidence from test:
```bash
$ npm test
❌ content/articles.json[N].sourceUrl: sourceUrl "" must be an absolute https?:// URL
```

### Workaround currently in use:
Articles without a real source URL currently use:
- `"sourceUrl": "#"` (anchor tag, passes `isAbsoluteOrExempt()`)
- This is a semantic hack (not a real URL, but validator accepts it)

---

## Impact: How This Breaks Automation

### Scenario 1: Unattended Publication Script
```bash
# Editor creates draft following ARTICLE-PUBLISHING-WORKFLOW.md
# Template includes: "author": "Jane Doe"
# And: "sourceUrl": "" (no source available)

# Publication automation runs npm test:
npm test
# ❌ FAILS: missing/invalid sourceUrl (not "author" — silent drop)
# ❌ Draft never publishes
# ❌ No explanation why "author" was removed
```

### Scenario 2: Data Loss Without Error
```bash
# Editor adds structured metadata to support future features:
# "language": "ES"
# "author": "Carlos"

# Publication runs validation:
npm test
# ✅ PASSES (these fields are ignored)

# Article publishes, but metadata is lost
# ❌ Future language-filtering feature has no data
# ❌ Author credit is missing (despite being provided)
```

---

## Required Fixes

### Option A: Add Missing Fields to Schema (Recommended)

**If we want to support author/language:**

1. **Update ARTICLES.schema.md:**
   ```typescript
   interface Article {
     ...
     language?: string; // "ES" | "FR" | "EN" — language of content
     author?: string;   // Author name (when different from sourceSite)
     ...
   }
   ```

2. **Add validation to validate-data.mjs:**
   ```javascript
   {
     name: 'language',
     type: 'string',
     required: false,
     validate: (v) => {
       const valid = ['ES', 'FR', 'EN'];
       return valid.includes(String(v)) ? null : `language must be ES, FR, or EN`;
     }
   },
   {
     name: 'author',
     type: 'string',
     required: false,
     validate: (v) => (String(v).trim() ? null : 'author must be non-empty if present')
   }
   ```

3. **Update site/js/articles.js to render author** (in detail view or credits section)

4. **Update editorial documentation** to clarify these are optional and explain rendering

---

### Option B: Remove From Editorial Template (Simpler)

**If we don't need author/language yet:**

1. **Update ARTICLE-PUBLISHING-WORKFLOW.md:**
   - Remove `"language"` from template
   - Remove `"author"` from template
   - Update checklist to remove these fields
   - Clarify in notes: "Language is implicit from content. Author attribution goes in contentHtml blockquote."

2. **Update sourceUrl guidance:**
   - Change `"sourceUrl: full URL or empty string"` to `"sourceUrl: full URL (use '#' if none available)"`

3. **Add note to SCHEMA_REFERENCE.md:**
   ```markdown
   ### Author Attribution
   Author name should be embedded in contentHtml if needed:
   
   ```html
   <blockquote><strong>Por Jane Doe</strong></blockquote>
   ```
   
   This allows author styling and is always visible to readers.
   ```

---

### Option C: Middle Ground (Recommended)

**Add optional author/language fields AND update documentation:**

This gives editorial tooling the metadata without breaking existing validation.

1. **Add optional fields** (via Option A, steps 1-2)
2. **Don't render them yet** (site/js doesn't need changes)
3. **Update editorial docs** (via Option B, step 2) — clarify these are OPTIONAL metadata for future use
4. **Add a CI warning** (in validate-data.mjs) if author is present but can't be rendered:
   ```javascript
   if (obj.author) {
     console.warn(`⚠️  ${file}[${i}].author: present but not yet rendered in UI`);
   }
   ```

---

## Immediate Actions Required

**Before any automation uses ARTICLE-PUBLISHING-WORKFLOW.md:**

1. ✅ **Decide on author/language support** — A, B, or C above?

2. **Update ARTICLES.schema.md** accordingly

3. **Update validate-data.mjs** accordingly

4. **Update ARTICLE-PUBLISHING-WORKFLOW.md** template to match actual validation

5. **Update SCHEMA_REFERENCE.md** (editorial reference)

6. **Test with real drafts** — run npm test on sample articles following updated template

7. **Update existing articles** (the 2 with author fields):
   - Either: Add proper validation support + keep authors
   - Or: Move author info into contentHtml, remove author field

---

## Testing Checklist

After fixes:

```bash
# 1. New draft following updated template should pass npm test
npm test

# 2. Validation should catch both real errors and mismatches
# (test with sourceUrl: "", language: "invalid", missing required fields)

# 3. No silent data loss
# (author/language, if optional, should have clear warnings if dropped)

# 4. Existing articles should still pass
cd /root/JOB-sda2/KILOMBO-SITE/KILOMBO
npm test
```

---

## Related Issues

- **TO_FIX #71** — ESLint/Prettier coverage (related: tests must catch schema mismatches)
- **TO_FIX #[pending]** — Article publishing backlog (blocked by this fix)

---

**Document created:** 2026-08-22  
**Severity:** CRITICAL (automation will fail silently or lose data without fix)  
**Blocking:** Article publishing automation
