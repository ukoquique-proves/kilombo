# SPIP Article Status Management — Script Guide

## Overview

`sandbox/delete-article.mjs` provides a command-line interface to manage article status transitions in SPIP 4.4.19 (kilombo.top backend).

**Key Discovery:** SPIP uses a 5-state workflow for articles, with state-dependent available transitions.

## Article Statuses

All SPIP articles in kilombo.top can transition through these states:

| Status Code | Spanish Label | English | Description |
|-------------|---------------|---------|-------------|
| `prepa` | En curso de redacción | Draft | Article being created/edited, not visible to public |
| `prop` | propuesto a la evaluación | Proposed | Article submitted for review |
| `publie` | Publicado | Published | Article live on the website |
| `refuse` | Rechazado | Refused/Rejected | Article rejected, not visible |
| `poubelle` | A la papelera | Trash | Article deleted, admin-only |

## State Transition Rules

SPIP enforces state-dependent availability:
- **From Draft (prepa):** Can transition to Proposed, Published, Refused, **or Trash**
- **From any state:** Can transition to any other state (no linear path enforced)
- **Trash is recoverable:** Articles in trash can be moved back to any non-trash status

## Script Usage

### Inspect Status

```bash
node sandbox/delete-article.mjs --inspect --id 87
```

Shows current status and available transitions.

### Change Status

```bash
node sandbox/delete-article.mjs --change --id 87 --status poubelle
node sandbox/delete-article.mjs --change --id 87 --status prepa
```

### Dry Run

```bash
node sandbox/delete-article.mjs --change --id 87 --status poubelle --dry-run
```

## Test Results (Article 87)

✅ **prepa → poubelle** (Draft to Trash): WORKING
✅ **poubelle → prepa** (Trash back to Draft): WORKING
✅ **prepa → poubelle** (repeated): WORKING

Confirms workflow is fully functional for all transitions.
