# Checking Draft Articles Awaiting Approval

> ⚠️ **This document has been superseded by [`VIEWING-DRAFT-ARTICLES.md`](VIEWING-DRAFT-ARTICLES.md)** — all information below is now maintained there, along with additional architectural context and programmatic access patterns.
>
> **See:** [`docs/VIEWING-DRAFT-ARTICLES.md`](VIEWING-DRAFT-ARTICLES.md) for the complete guide.

---

### Quick Reference (For Immediate Lookup)

**To check draft articles:**

```bash
# Programmatic (recommended)
node scripts/manage-article-status.mjs --inspect --id <ARTICLE_ID>

# Or via web browser
# 1. Go to: https://www.kilombo.top/ecrire/
# 2. Login with YunoHost credentials
# 3. Filter articles by Section: "Tierra y Libertad", Status: "En curso de redacción"
```

**Draft articles have status code `prepa` ("En curso de redacción")** and are not visible to the public.

---

For full context, workflow examples, and architecture discussion, see [`VIEWING-DRAFT-ARTICLES.md`](VIEWING-DRAFT-ARTICLES.md).
