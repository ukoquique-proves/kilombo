# Phase 1 MVP — KILOMBO Management Dashboard

**Status:** ✅ Scaffolding Complete (v0.47.0)  
**Timeline:** Weeks 1-2  
**Last Updated:** 2026-08-25

---

## Overview

Phase 1 delivers a minimal but functional web-based dashboard for managing articles in the KILOMBO portal. The MVP focuses on:

1. **Core Commands:** Article creation and status management via HTTP
2. **Security-First Design:** KILO_APPROVE_PUBLISHING gate enforces editorial review before direct publication
3. **Minimal Frontend:** Polling-based dashboard (no WebSocket yet) for operator ease of use
4. **Audit Trail:** All operations logged to `live-write-audit.log.jsonl`

## What's Included

### Backend (Express.js)

**Stack:** Node.js 18+ + Express.js 4.21  
**Entry Point:** `npm start` → launches `api/server.mjs` on port 3000

**Components:**

1. **api/server.mjs** (300 lines)
   - Express bootstrap
   - Environment variable loading (respects .env)
   - 7 API endpoints
   - KILO_APPROVE_PUBLISHING gate for direct publication
   - Audit logging

2. **api/lib/job-manager.mjs** (150 lines)
   - In-memory job tracking
   - Child process spawning with output buffering
   - Job status queries (pending, running, completed, failed)
   - Auto-cleanup for old jobs

### Frontend (Vanilla JavaScript)

**File:** `api/public/dashboard.html` (500 lines, self-contained)

**Features:**

- **Tab 1: Create Article** — Form to submit new articles
  - Fields: Title, Body (HTML), Section, Dry-Run toggle
  - Polling-based job status display
  - Real-time stdout/stderr output

- **Tab 2: Manage Status** — Change article workflow state
  - Fields: Article ID, Status (dropdown), Confirm checkbox, Dry-Run toggle
  - **Security UI:** Shows warning if KILO_APPROVE_PUBLISHING is disabled
  - Blocks UI submission if publishing directly without confirmation

- **Tab 3: Jobs** — View recent job history
  - (Placeholder; jobs endpoint not yet exposed)

- **Tab 4: Audit Log** — Read-only access to mutation history
  - Fetches from `/api/audit-log` endpoint
  - Shows timestamp, action, and details

- **Tab 5: System Status** — Environment and health checks
  - Server uptime, version
  - KILO_APPROVE_PUBLISHING status (✅/❌)

## API Endpoints

### Health & Status

```
GET /api/health
```
Returns server version, uptime, status.

```
GET /api/env-status
```
Returns non-secret environment status:
- `KILO_APPROVE_PUBLISHING` (boolean)
- `hasEnv` (whether .env was found)

### Job Management

```
GET /api/jobs/:jobId/status
```
Returns current job state:
```json
{
  "id": "a1b2c3",
  "status": "running",           // running | completed | failed | pending
  "command": "node",
  "args": ["scripts/create-article.mjs", ...],
  "startTime": "2026-08-25T...",
  "endTime": null,
  "exitCode": null,
  "stdout": "...",
  "stderr": ""
}
```

### Commands

#### Create Article

```
POST /api/commands/create-article
Content-Type: application/json

{
  "title": "Article Title",
  "body": "<p>Article body...</p>",
  "section": "general",           // general | actualidad | tierra | nom | pi | gci
  "dryRun": false
}
```

Response (201 Accepted):
```json
{
  "jobId": "a1b2c3",
  "startTime": "2026-08-25T10:30:00Z",
  "message": "Article creation job started"
}
```

Spawns: `node scripts/create-article.mjs --title "..." --body "..." --section "..." [--dry-run]`

#### Manage Article Status

```
POST /api/commands/manage-article-status
Content-Type: application/json

{
  "id": 90,
  "status": "publie",             // prepa | prop | publie | refuse | poubelle
  "change": true,                 // Must be true to apply changes
  "dryRun": false
}
```

Response (200 OK):
```json
{
  "jobId": "a1b2c3",
  "startTime": "2026-08-25T10:30:00Z",
  "message": "Status management job started"
}
```

Response (403 Forbidden, if KILO_APPROVE_PUBLISHING not set):
```json
{
  "error": "Direct publication requires KILO_APPROVE_PUBLISHING=true",
  "risk": "KILO-001",
  "alternative": "Change status to \"prop\" (proposed for review) instead.",
  "blocked": true
}
```

**Security Gate:**
- If `status === "publie"` and `change === true`:
  - Check environment variable `KILO_APPROVE_PUBLISHING`
  - If not set to `"true"`, return 403
  - Log attempt to console

Spawns: `node scripts/manage-article-status.mjs --id 90 --status publie --change [--dry-run]`

### Audit Log

```
GET /api/audit-log?limit=50
```

Returns entries from `live-write-audit.log.jsonl` (most recent first):
```json
{
  "entries": [
    {
      "timestamp": "2026-08-25T10:30:15Z",
      "action": "article:create",
      "details": "Created article 'Example Title'"
    },
    ...
  ],
  "total": 15
}
```

## Setup

### Prerequisites

- Node.js 18+
- npm 9+
- `.env` file with environment variables (optional but recommended)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Set KILO_APPROVE_PUBLISHING to enable direct publication
echo "KILO_APPROVE_PUBLISHING=true" >> .env

# 3. Start the server
npm start

# 4. Open dashboard in browser
open http://localhost:3000/dashboard.html
```

### Environment Variables

**Optional:**

```bash
PORT=3000                              # Default: 3000
KILO_APPROVE_PUBLISHING=true           # Default: not set (direct publication blocked)
KILOMBOTOP_HOST=kilombo.top            # For future sync-to-production integration
KILOMBOTOP_PORT=22                     # For future sync-to-production integration
```

The backend reads `.env` on startup. If not found, defaults are used (KILO_APPROVE_PUBLISHING defaults to false).

## Usage

### Creating an Article

1. Open http://localhost:3000/dashboard.html
2. Click **➕ Crear Artículo** tab
3. Fill in:
   - **Título** (required)
   - **Cuerpo** (required) — HTML or plain text
   - **Sección** (optional) — choose from dropdown
   - **Modo simulación** (optional) — preview changes without saving
4. Click **Crear Artículo**
5. Monitor job status in real-time:
   - Polling updates every 500ms
   - Stops polling once job completes (success or failure)
   - Displays stdout/stderr output

### Changing Article Status

1. Click **🔄 Cambiar Estado** tab
2. Fill in:
   - **ID del Artículo** (required) — SPIP article ID
   - **Nuevo Estado** (required) — dropdown with 5 options:
     - En curso de redacción (prepa)
     - Propuesto para revisión (prop)
     - Publicado (publie) ⚠️
     - Rechazado (refuse)
     - A la papelera (poubelle)
   - **Aplicar el cambio** (checkbox) — must check to confirm
   - **Modo simulación** (optional)
3. Click **Enviar Cambio de Estado**
4. If publishing directly without KILO_APPROVE_PUBLISHING set:
   - UI shows warning: "⚠️ Publicación Directa Bloqueada"
   - Backend returns 403 with explanation
5. Otherwise, job starts and status is polled

### Viewing Job Status

Real-time updates shown inline below the form:
- **Estado:** running | completed | failed
- **ID:** job ID (for reference)
- **Inicio:** start timestamp
- **Código de salida:** exit code (if applicable)
- **Salida:** command stdout (if any)
- **Errores:** command stderr (if any)

### Checking Audit Log

1. Click **📋 Auditoría** tab
2. Click **Refrescar** to load latest entries
3. View entries in chronological order (most recent first)
4. Each entry shows:
   - Timestamp
   - Action name
   - Details (varies by action type)

### System Status

1. Click **ℹ️ Estado del Sistema** tab
2. View:
   - Server version (0.47.0-MVP)
   - Server uptime
   - KILO_APPROVE_PUBLISHING status (✅/❌)

## Architecture Decisions

### Why Polling (Not WebSocket)

**Phase 1 constraint:** Polling-based job status updates

**Rationale:**
- Simpler frontend code (vanilla JS, no Socket.io or ws library)
- No persistent connection overhead
- Suitable for MVP with ~5-10 concurrent users
- Can upgrade to WebSocket in Phase 3 without breaking API

**Polling Interval:** 500ms (configurable in frontend)

### In-Memory Job Storage

**Current:** Map-based in-memory storage  
**Limitations:**
- Jobs lost on server restart
- Not suitable for production >1000 concurrent jobs
- Suitable for MVP (typical session has 2-5 active jobs)

**Phase 2 Upgrade Path:**
- Replace Map with persistent store (SQLite, PostgreSQL)
- Add job history endpoint
- Implement long-term audit retention

### Security Gate Placement

The KILO_APPROVE_PUBLISHING check happens in two places:

1. **Frontend:** UI warning + checkbox confirmation
2. **Backend:** Environment variable check + 403 response

**Why both?**
- Frontend check improves UX (immediate feedback)
- Backend check enforces policy (prevents API bypass)
- Security gates are not disabled by frontend bypasses

## Limitations & Known Issues

1. **No job history endpoint** — Jobs are queried individually by ID, not listed
2. **No WebSocket streaming** — Polling has 500ms latency; Phase 3 adds real-time terminal
3. **No batch operations** — One article at a time; Phase 3 adds batch migration UI
4. **No error recovery** — Failed jobs don't auto-retry; user must restart
5. **No authentication** — MVP assumes single-user or trusted environment; Phase 2 adds auth
6. **No rate limiting** — Phase 2 adds API rate limits and DoS prevention
7. **Job cleanup** — Old jobs auto-deleted after 1 hour; consider retention policy

## Testing

### Manual Testing

```bash
# Start server
npm start

# In another terminal:

# Test health check
curl http://localhost:3000/api/health | jq .

# Test env status
curl http://localhost:3000/api/env-status | jq .

# Test security gate (should return 403)
curl -X POST http://localhost:3000/api/commands/manage-article-status \
  -H "Content-Type: application/json" \
  -d '{"id": 90, "status": "publie", "change": true}' | jq .

# Test create-article (note: scripts/create-article.mjs must exist)
curl -X POST http://localhost:3000/api/commands/create-article \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "Body", "dryRun": true}' | jq .

# Query job status (replace a1b2c3 with actual jobId from above)
curl http://localhost:3000/api/jobs/a1b2c3/status | jq .
```

### Automated Testing

TODO: Add Jest/Supertest integration tests in Phase 2

```bash
npm run test:api
```

(not yet implemented)

## Related Documentation

- `docs/UI-ARCHITECTURE-SPEC.md` — Full Phase 1-4 design
- `docs/SYNC-TO-PRODUCTION-DESIGN.md` — Why production sync is interactive-only
- `scripts/lib/live-write-gateway.mjs` — Security gate implementation
- `.env.example` — Environment variable template
- `CHANGELOG.md` — Release notes

## Next Steps (Phase 2)

1. Add WebSocket for real-time output streaming
2. Implement job history and filtering
3. Add basic authentication (single password or OAuth)
4. Add rate limiting and DoS prevention
5. Migrate job storage to persistent database
6. Add error recovery and retry logic
7. Expand frontend: batch operations, advanced filtering

## Rollout Plan

### Week 1
- [x] Express backend scaffold
- [x] Core endpoints (create-article, manage-article-status)
- [x] Polling-based frontend
- [x] Security gates

### Week 2
- [ ] Manual testing with real articles
- [ ] Documentation (this file)
- [ ] Staging deployment and QA
- [ ] Team training and feedback

### Post-Phase 1
- Gather feedback from team
- Prioritize Phase 2 features based on usage patterns
- Consider deployment options (systemd service, Docker, etc.)

---

**Questions?** See docs/TROUBLESHOOTING.md or contact the development team.
