# Schema-Editor Mismatch: Documentation vs. Validation

**Status:** ✅ RESOLVED (v0.42.6 — author/language fields added to schema and validator)

This document was created to track schema mismatches that have now been fixed. Kept for historical reference and to document the resolution.

---

## What Was Fixed

In v0.42.6, the following changes were made to align schema, validator, and editorial documentation:

1. ✅ **`author` field** — Added to ARTICLES.schema.md as optional metadata field (lines 25-26)
2. ✅ **`language` field** — Added to ARTICLES.schema.md as optional metadata field (lines 64-66)
3. ✅ **Validation rules** — Both fields now have validation in validate-data.mjs with clear requirements
4. ✅ **Documentation updated** — ARTICLE-PUBLISHING-WORKFLOW.md and editorial templates updated

---

## Current Implementation (v0.42.6+)

### Author Field

**Schema (ARTICLES.schema.md, line 25-26):**
```typescript
author?: string;      // Author/creator name (when different from sourceSite)
```

**Validation (validate-data.mjs, lines 321-324):**
```javascript
{
  name: 'author',
  type: 'string',
  required: false,
  validate: (v) => (String(v).trim() ? null : 'author must be non-empty if present'),
}
```

**Status:**
- ✅ Documented in schema
- ✅ Validated if present (must be non-empty)
- ℹ️ Not rendered in UI yet (reserved for future use)
- ℹ️ For visible author attribution, use embedded blockquote in `contentHtml`

### Language Field

**Schema (ARTICLES.schema.md, line 64-66):**
```typescript
language?: string;    // Source language: "ES" | "FR" | "EN" (for multilingual features)
```

**Validation (validate-data.mjs, lines 310-316):**
```javascript
{
  type: 'string',
  required: false,
  validate: (v) => {
    const valid = ['ES', 'FR', 'EN'];
    return valid.includes(String(v).toUpperCase())
      ? null
      : `language must be one of: ${valid.join(', ')} (got "${v}")`;
  },
}
```

**Status:**
- ✅ Documented in schema
- ✅ Validated to ES|FR|EN when present
- ℹ️ Not rendered in UI yet (reserved for multilingual features in Phase 2)
- ℹ️ Tracked in metadata for future language filtering and translation workflows

### sourceUrl Handling

**Resolved separately:** The earlier issue with `sourceUrl` requiring a non-empty absolute URL was documented separately. Current workaround uses `"#"` for sources without a real URL, which passes validation.

---

## Why Both Fields Exist But Aren't Rendered

These optional fields serve editorial workflows and infrastructure planning, not immediate rendering:

- **`author`** — Captures structured author metadata for multi-author articles or when author differs from `sourceSite`. For current simple articles, author goes in `contentHtml` blockquote.
- **`language`** — Tracks source language for translation workflows and future multilingual UI. Allows filtering/sorting by language once rendering is implemented.

This follows the schema philosophy: **define metadata now, render later as features mature.**

---

## Verification

To verify current state:

```bash
# 1. Schema documents both fields
grep -n "author\|language" site/assets/content/ARTICLES.schema.md

# 2. Validator has rules for both
grep -n "author\|language" scripts/validate-data.mjs | head -10

# 3. All tests pass with these fields
npm test
```

