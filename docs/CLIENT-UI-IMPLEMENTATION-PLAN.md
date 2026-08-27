# Plan de Implementación: Dashboard de Cliente con Flujo de Borradores

> **Documento base:** [CLIENT_UI.md](CLIENT_UI.md) — Especificación funcional completa y decisiones de diseño.
> **Referencia de flujo:** [ARTICLE-PUBLISHING-WORKFLOW.md](ARTICLE-PUBLISHING-WORKFLOW.md) — Pipeline editorial existente `IN_PROGRESS/` → `READY/`.

---

## 📊 Estado General del Plan

Actualizado por última vez: **2026-08-26**.

- [x] **Fase 0 — Groundwork** (3/3 subtareas) · Hecho 100% · `npm test 234/234 ✅` · `lint 0 errors ✅`
- [x] **Fase 1 — drafts-store.mjs** (6/6 métodos + audit log) · Hecho 100% · 58 tests dedicados en `test/drafts-store.test.mjs`
- [x] **Fase 2 — article-validator.mjs** (extracción + refactor validate-data.mjs) · Hecho 100%
- [x] **Fase 3 — Endpoints API en server.mjs** (7 endpoints + /api/ready-drafts) · Hecho 100% · audit logging integrado · previewHtml via reduceToAllowlist
- [x] **Fase 4 — UI del Dashboard** (tabs reorganizados + 3 subtabs Nuevo Artículo + tab "Listos para Publicar") · Hecho 100% · `api/public/dashboard.html`
- [x] **Fase 5 — Stub IA + E2E Testing** (checklist 12 pasos) · Completada 2026-08-27. Los 12 pasos pasan. Dos hallazgos respecto al checklist original (documentados abajo, no bugs — comportamiento correcto, la expectativa escrita en el checklist estaba desactualizada):
  1. Paso 5a (contentHtml vacío): se bloquea **antes** de llegar a `approve` — `PUT /api/drafts/:slug` ya rechaza `contentHtml` vacío con `400 INVALID_FIELDS` en `preValidate()`. Mismo resultado protector, capa distinta a la que describía el checklist.
  2. Paso 5b (sourceUrl `#`): **no falla** — `#` y `mailto:` están exentos intencionalmente en `article-validator.mjs` (`isAbsoluteOrExempt`), consistente con datos reales existentes (ver TO_FIX.md #30, stub `el-fraude-de-los-pcr` que usa `#` como sourceUrl placeholder). Re-testeado con una URL relativa real no exenta (`/relative/path`) → sí dispara `422 VALIDATION_FAILED` como se esperaba.

---

### Detalle de objetivos de conexión UI ↔ pipeline

- [x] 1. Librerías reutilizables en `scripts/lib/` (slugify ✔, article-validator ✔, drafts-store ✔)
- [x] 2. 7 endpoints REST en `api/server.mjs` (+ /api/ready-drafts alias)
- [ ] 3. Actualización del tab "Crear Artículo" del dashboard con flujo completo (redacción → preview → aprobar)

---

## 1. Objetivo

Conectar el pipeline de borradores ya existente (`data/articulos_en_trabajo/IN_PROGRESS/` → `READY/`) a la UI del cliente mediante:

1. Librerías reutilizables en `scripts/lib/`
2. 7 endpoints REST en `api/server.mjs`
3. Actualización del tab "Crear Artículo" del dashboard con flujo completo (redacción → preview → aprobar)

**No se modifica** el pipeline editorial existente — solo se añade una capa programática encima.

---

## 2. Fases y Dependencias

```
Fase 0: Groundwork (pre-requisitos)
    ↓
Fase 1: drafts-store.mjs (capa de acceso a datos)
    ↓
Fase 2: article-validator.mjs (validador reutilizable)
    ↓
Fase 3: Endpoints API en server.mjs
    ↓
Fase 4: UI del Dashboard (tab de borradores)
    ↓
Fase 5: Stub de IA + End-to-End Testing
```

Cada fase depende completamente de la anterior.

---

## 3. Fase 0 — Groundwork (3 cambios mínimos) · ✅ COMPLETADA

### 3.1 Exportar `slugify()` de `scripts/import-article.mjs` · ✅ HECHO

**Nota de ejecución:** Ya estaba realizado antes del plan. La función `slugify()` se extrajo previamente y vive como única fuente de verdad en [scripts/lib/slugify.mjs](../scripts/lib/slugify.mjs) (export default + named export). No fue necesario tocar `import-article.mjs`.

**Archivo:** [scripts/import-article.mjs](../scripts/import-article.mjs) (línea ~467)

**Cambio:**
```javascript
// ANTES:
function slugify(title) {

// DESPUÉS:
export function slugify(title) {
```

**Justificación:** El endpoint `POST /api/drafts` necesita generar slugs consistentes con el resto del sistema (mismo algoritmo que usa CI).

**Riesgo:** Bajo. Función pura, sin efectos secundarios. Todos los callers internos siguen funcionando igual.

---

### 3.2 Mover `happy-dom` de `devDependencies` → `dependencies` · ✅ HECHO

**Nota de ejecución:** Ya estaba realizado antes del plan. `happy-dom` aparece en `dependencies` de `package.json` (línea 33).

**Archivo:** [package.json](../package.json) (líneas 30-41)

**Cambio:**
```json
// ANTES:
"dependencies": {
  "express": "^4.21.0",
  "dotenv": "^16.4.5"
},
"devDependencies": {
  "@playwright/test": "^1.62.1",
  "eslint": "^9.39.5",
  "eslint-config-prettier": "^10.1.8",
  "happy-dom": "^20.11.1",  // ← mover
  "prettier": "^3.9.6",
  "staticrypt": "3.5.4"
}

// DESPUÉS:
"dependencies": {
  "express": "^4.21.0",
  "dotenv": "^16.4.5",
  "happy-dom": "^20.11.1"   // ← aquí
},
"devDependencies": {
  "@playwright/test": "^1.62.1",
  "eslint": "^9.39.5",
  "eslint-config-prettier": "^10.1.8",
  "prettier": "^3.9.6",
  "staticrypt": "3.5.4"
}
```

**Justificación:** `scripts/import-article.mjs` importa `{ Window } from 'happy-dom'` para `reduceToAllowlist()`. Si `api/server.mjs` (que corre en producción) reutiliza esa función (o `drafts-store.mjs` la usa para renderizar preview), `happy-dom` debe estar en `dependencies` o fallará en runtime cuando se podan devDependencies (Docker, entornos de producción).

**Riesgo:** Bajo. Solo cambia de categoría, no de versión. Requiere `npm install` después del cambio.

---

### 3.3 Asegurar que `data/articulos_en_trabajo/` exista con subdirs · ✅ HECHO

**Ejecutado:**
- `mkdir -p articulos_en_trabajo/{IN_PROGRESS,READY}` en el repositorio local (2026-08-26).
- Además, `drafts-store.mjs` incluye `ensureDirs()` auto-lanzado en carga (IIFE) con `mkdirSync(d, {recursive:true})`, así que incluso si el dir desapareciera, el módulo lo recrea en runtime.

**Verificación:** Si el directorio `data/articulos_en_trabajo/` (y subdirs `IN_PROGRESS/`, `READY/`) no existe en el runtime, `drafts-store.mjs` fallará al escribir.

**Decisión:** Añadir chequeo + `mkdir -p` (recursivo) en el constructor de `drafts-store.mjs` (no como paso aparte). Mejor encapsulado en la propia librería que como script de setup.

---

## 4. Fase 1 — `scripts/lib/drafts-store.mjs` (capa de datos) · ✅ COMPLETADA

**Archivo creado:** [scripts/lib/drafts-store.mjs](../scripts/lib/drafts-store.mjs) · 2026-08-26

**Módulo de acceso al filesystem para `data/articulos_en_trabajo/`.** Toda escritura/lectura de borradores pasa por aquí (nunca endpoints API manipulan fs directamente).

### API exportada · 6/6 métodos ✅

```javascript
export function createDraft(fields)        // ✅ HECHO
export function getDraft(slug)             // ✅ HECHO
export function listDrafts()               // ✅ HECHO
export function updateDraft(slug, fields)  // ✅ HECHO
export function approveDraft(slug)         // ✅ HECHO
export function listReady()                // ✅ HECHO
```

### Detalle de cada método (estado)

#### 4.1 `createDraft(fields)` · ✅ HECHO

- [x] Genera slug via `slugify(title)` (importa `slugify` de `scripts/lib/slugify.mjs`, SSoT)
- [x] Verifica unicidad de slug contra 3 fuentes: IN_PROGRESS, READY, articles.json publicado
- [x] Sufijos `-2`, `-3`, etc. en colisiones (con `slugify()` para respetar 80-char cap)
- [x] Defaults completos: `sourceSite: "Kilombo Cliente Dashboard"`, `sourceUrl: "#"`, `status: "pending-review"`, `date: hoy YYYY-MM-DD`, `createdAt`/`updatedAt` ISO
- [x] Escribe `data/articulos_en_trabajo/IN_PROGRESS/<slug>.json`
- [x] Audit log entry `draft.create`

**Verificado en smoke-test:** Crea 2 borradores con mismo título → slugs `smoke-test-articulo` y `smoke-test-articulo-2`.

#### 4.2 `getDraft(slug)` · ✅ HECHO

- [x] Busca en IN_PROGRESS primero
- [x] Fallback a READY (para preview de aprobados)
- [x] Adjunta `_location: 'IN_PROGRESS' | 'READY'`
- [x] Error con `code: 'DRAFT_NOT_FOUND'` cuando no existe en ninguna

#### 4.3 `listDrafts()` · ✅ HECHO

- [x] Lee IN_PROGRESS/*.json
- [x] Campos resumidos (sin `contentHtml`)
- [x] Orden `updatedAt` → `createdAt` desc

#### 4.4 `updateDraft(slug, fields)` · ✅ HECHO

- [x] Merge shallow sobre IN_PROGRESS
- [x] `updatedAt` actualizado siempre
- [x] `preValidate` rápido falla en campos inválidos (ej: title vacío)
- [x] **Bloquea** si el draft ya está en READY → `code: 'DRAFT_ALREADY_APPROVED'`
- [x] Slug (id) es stable: si cambias el título, el id no cambia (no rompe URLs)
- [x] Audit log entry `draft.update`

#### 4.5 `approveDraft(slug)` · ✅ HECHO · **Paso crítico**

- [x] Bloquea si ya está aprobado (`DRAFT_ALREADY_APPROVED`)
- [x] Llama `validateArticleEntry()` de article-validator (**mismas reglas que CI**)
- [x] Falla → throw `{ code: 'VALIDATION_FAILED', validationErrors: [...] }` (1 error por línea, formato texto exactamente igual que CI, parseable por UI)
- [x] Pasa → `approved: true` + `approvedAt` ISO
- [x] Write tmp → `renameSync(tmp, READY/<slug>.json)` atómico POSIX
- [x] `unlinkSync(IN_PROGRESS/<slug>.json)` post-rename (no hay doble copia)
- [x] Audit log entry `draft.approve`

**Verificado smoke-test:** approve con sourceUrl relativa `/relative/url/kilombo` → `VALIDATION_FAILED` con 1 error: `draft[0].sourceUrl: sourceUrl "/relative/url/kilombo" must be an absolute https?:// URL`. Approve con fields completos (sourceUrl absoluta `https://icg-gci.kilombo.top/...`) → PASS, entry aparece en `listReady()` con `approvedAt` set.

#### 4.6 `listReady()` · ✅ HECHO

- [x] Idéntico a listDrafts pero en READY, incluye `approvedAt` field en cada entry.

---

### Estructura de directorios y paths · ✅ IMPLEMENTADA

```javascript
// drafts-store.mjs (cargado en runtime, resolve correcto desde scripts/lib/)
const REPO_ROOT = resolve(__dirname, '..', '..');
const WORK_DIR = join(REPO_ROOT, 'data', 'articulos_en_trabajo');
const IN_PROGRESS_DIR = join(WORK_DIR, 'IN_PROGRESS');
const READY_DIR = join(WORK_DIR, 'READY');
const ARTICLES_JSON_PATH = join(REPO_ROOT, 'site', 'assets', 'content', 'articles.json');
```

**Inicio seguro:** IIFE `ensureDirs()` al cargar el módulo → `mkdirSync(d, {recursive:true})`. Idempotente.

---

## 5. Fase 2 — `scripts/lib/article-validator.mjs` (validador reutilizable) · ✅ COMPLETADA

**Archivo ya existente (previa extracción):** [scripts/lib/article-validator.mjs](../scripts/lib/article-validator.mjs)

### Motivo

[scripts/validate-data.mjs](../scripts/validate-data.mjs) **no se puede importar como librería** porque:
1. Tiene `#!/usr/bin/env node` y se autoejecuta al cargarse (llama funciones que llaman `process.exit()` sin guardia `import.meta.url`)
2. Contiene validación de VIDEOS + ARTICLES + más — no es modular

**Solución:** Extraer `validateArticleEntry()`, `ARTICLE_RULES`, `ARTICLE_OPTIONAL_RULES`, `ARTICLE_STATUS`, `validateContentHtmlUrls()` a un módulo nuevo que:
- Solo exporta funciones (sin side effects al cargar)
- No llama `process.exit()` nunca
- Es `import.meta.url` agnóstico

Luego, `scripts/validate-data.mjs` **re-importa desde el nuevo módulo** (para no duplicar código y que las reglas sigan siendo una sola fuente de verdad).

### API exportada · 100% exportada ✅

```javascript
export const ARTICLE_STATUS = new Set(...)       // ✅
export const ARTICLE_RULES: FieldRule[]           // ✅
export const ARTICLE_OPTIONAL_RULES: FieldRule[]  // ✅
export function validateArticleEntry(entry, file?, index?): string[]  // ✅
export function validateArticleDraft(entry): string[]  // (wrapper incluido: validateArticleEntry(entry, "draft", 0))
```

### Plan de migración de código · ✅ HECHO 100%

1. [x] Copiar de `validate-data.mjs` al nuevo módulo:
   - `const ARTICLE_STATUS = new Set(...)`
   - `const ID_FORMAT_RE` y `const ID_MAX_LENGTH`
   - `const ARTICLE_RULES = [...]` completo
   - `const ARTICLE_OPTIONAL_RULES = [...]` completo
   - `const URL_ATTR_RE`
   - `function validateContentHtmlUrls(html)`
   - `function validateArticleEntry(entry, file, index)` completo

2. [x] **Imports resueltos:** usa `isSafeUrl`, `isAbsoluteOrExempt` de `site/js/shared/url-safety.mjs` + `hasEnoughBreaksToAnalyze` de `site/js/shared/dewrap.mjs`.

3. [x] **Modificación en `scripts/validate-data.mjs`:**
   - **Ya realizado previamente:** Línea 16: `import { ARTICLE_STATUS, ARTICLE_RULES, ARTICLE_OPTIONAL_RULES, ID_FORMAT_RE, ID_MAX_LENGTH, URL_ATTR_RE, validateContentHtmlUrls, validateArticleEntry } from './lib/article-validator.mjs';`
   - Todas las reglas borradas del archivo principal, validador ahora es **SSoT** (Single Source of Truth).

4. [x] **Test humo:** `npm test` pasa 57 articles OK + 10 videos OK + pipeline 5/5. Validación idéntica a la anterior porque es el mismo código importado.

---

## 6. Fase 3 — Endpoints API en `api/server.mjs`

**Archivo a modificar:** [api/server.mjs](../api/server.mjs)

Añadir 7 nuevos endpoints. Todos usan `drafts-store.mjs` para operaciones fs. Todas las mutaciones se loguean en audit log.

### Convención común para responses

```javascript
// Success 2xx:
{ ok: true, data: {...} }

// Client error 4xx:
{ ok: false, error: "mensaje legible", code: "DRAFT_NOT_FOUND" | "VALIDATION_FAILED" | ..., details?: any }

// Server error 5xx:
{ ok: false, error: "mensaje genérico", internal: err.message }  // ← solo cuando NO existe mejor código
```

### Endpoints a añadir (bloque completo debajo de `/api/env-status` y antes del 404 handler)

---

#### 6.1 `POST /api/drafts` — Crear borrador

```javascript
// Body:
{
  title: string,           // ✅ requerido
  contentHtml: string,     // ✅ requerido
  section: string,         // ✅ requerido
  topics: string[],        // ✅ requerido (array no vacío)
  sourceSite?: string,
  sourceUrl?: string,
  status?: string,         // default: "pending-review"
  date?: string,
  notes?: string,
  language?: string,
  author?: string,
  relatedArticles?: string[],
  externalLinks?: any[],
  metadata?: any
}

// Response 201:
{ ok: true, data: { slug, path, createdAt } }

// Response 400:
{ ok: false, error: "...", code: "INVALID_FIELDS", details: ["title must be non-empty", ...] }
```

---

#### 6.2 `GET /api/drafts` — Listar borradores (IN_PROGRESS)

```javascript
// Query params opcionales:
// ?limit=N   (default 50, max 200)
// ?section=tierra|gci|...  (filtrar por sección)

// Response 200:
{
  ok: true,
  data: {
    drafts: [ { slug, title, date, section, status, topics, createdAt, updatedAt }, ... ],
    total: 23,
    limit: 50
  }
}
```

---

#### 6.3 `GET /api/drafts/:slug` — Leer borrador + HTML renderizado preview

```javascript
// Response 200:
{
  ok: true,
  data: {
    draft: { /* objeto completo */ },
    // HTML sanitizado para preview: pasa por reduceToAllowlist del servidor
    previewHtml: "<h3>Título</h3><p>Contenido limpio...</p>",
    location: "IN_PROGRESS" | "READY"
  }
}

// Response 404:
{ ok: false, error: "Draft not found", code: "DRAFT_NOT_FOUND" }
```

**Para `previewHtml`:** Reutilizar `sanitizeHtml()` + `reduceToAllowlist()` importados de `site/js/render.mjs` (ya están siendo usados por `import-article.mjs`). Si happy-dom está en dependencies (Fase 0.2), esto funciona.

---

#### 6.4 `PUT /api/drafts/:slug` — Actualizar borrador

```javascript
// Body: mismos campos que POST, todos opcionales (merge)

// Response 200:
{ ok: true, data: { slug, updatedAt } }

// Response 400:
{ ok: false, error: "Cannot update already-approved draft", code: "DRAFT_ALREADY_APPROVED" }

// Response 404:
{ ok: false, error: "Draft not found", code: "DRAFT_NOT_FOUND" }
```

---

#### 6.5 `POST /api/drafts/:slug/improve` — Sugerencias de IA (STUB)

**En esta fase: stub.** Devuelve mensaje "Próximamente". No bloquea el resto.

```javascript
// Response 501 Not Implemented:
{
  ok: false,
  error: "AI improvement endpoint not yet implemented",
  code: "NOT_IMPLEMENTED",
  hint: "Define ALGO_PROVIDER + API key para activar esta funcionalidad. Puedes aprobar el artículo manualmente sin este paso."
}
```

**Futuro (Fase 5):** Llamar API LLM, devolver array de sugerencias con:
```javascript
{
  ok: true,
  data: {
    suggestions: [
      { id: "sug-1", kind: "rewrite" | "add" | "remove" | "metadata", selector: "p:nth(3)", original: "...", proposed: "...", rationale: "..." },
      ...
    ]
  }
}
```

---

#### 6.6 `POST /api/drafts/:slug/apply-suggestion` — Aplicar sugerencia concreta (STUB)

```javascript
// Body: { suggestionId: "sug-1" }

// Response 501:
{ ok: false, error: "Not implemented", code: "NOT_IMPLEMENTED" }
```

---

#### 6.7 `POST /api/drafts/:slug/approve` — ⭐ VALIDAR + MOVER A READY

**Punto más importante del flujo.** (La línea 118 de CLIENT_UI.md.)

```javascript
// Response 200 (VALIDACIÓN OK):
{
  ok: true,
  data: {
    approved: true,
    slug,
    path: "data/articulos_en_trabajo/READY/<slug>.json",
    approvedAt: "2026-08-26T...",
    validationErrors: []  // array vacío cuando pasa
  }
}

// Response 422 (VALIDACIÓN FALLA — mismas reglas que CI):
{
  ok: false,
  error: "Validation failed — same rules as CI. Fix issues and retry.",
  code: "VALIDATION_FAILED",
  details: {
    validationErrors: [
      "draft[0].sourceSite: sourceSite must be non-empty",
      "draft[0].sourceUrl: must be an absolute https?:// URL",
      "draft[0].contentHtml: must not contain relative URLs — found: /img/foo.png"
    ]
  }
}

// Response 400 (ya aprobado):
{ ok: false, error: "Draft already approved", code: "DRAFT_ALREADY_APPROVED" }

// Response 404:
{ ok: false, error: "Draft not found", code: "DRAFT_NOT_FOUND" }
```

---

## 7. Audit Logging para operaciones de drafts

**Patrón a seguir:** Reutilizar el formato de entrada de `live-write-audit.log.jsonl` (ya leído por `/api/audit-log` en server.mjs línea ~296).

**Ubicación:** `scripts/lib/live-write-gateway.mjs` define `appendAuditEntry()` (línea ~86). Pero **no usar `guardedWrite()`** — ese es exclusivo para mutaciones sobre SPIP vivo, y el comentario en CLIENT_UI.md línea 96 lo especifica explícitamente.

**Enfoque correcto:** Extraer `appendAuditEntry()` a una función compartida (o reimplementar idéntica en `drafts-store.mjs`) — formato JSONL con:

```javascript
{
  timestamp: new Date().toISOString(),
  actor: "client-dashboard",
  action: "draft.create" | "draft.update" | "draft.approve",
  target: { slug, path, ...campos_identificadores },
  result: "success" | "error",
  error?: "mensaje"   // solo si error
}
```

Estas entradas aparecerán automáticamente en el tab "Auditoría" del dashboard porque `/api/audit-log` ya lee todo el fichero sin filtrar por tipo de acción.

---

## 8. Fase 4 — UI del Dashboard

**Archivo a modificar:** [api/public/dashboard.html](../api/public/dashboard.html)

### Reorganización de tabs

**ANTES (actual):**
```
[ Crear Artículo ]    →   Publicación directa via scripts/create-article.mjs → SPIP
[ Auditoría    ]
[ Jobs         ]
[ Estado       ]
```

**DESPUÉS (nuevo orden):**
```
[ 🆕 Nuevo Artículo  ]    →   PRINCIPAL. Flujo IN_PROGRESS → REDACTAR → PREVIEW → APROBAR → READY
[ Publicación Directa ]  →   SECUNDARIO. Tab actual movido aquí (mismo comportamiento)
[ Listos para Publicar ] →   Lista READY/*.json (artículos aprobados esperando publicación SPIP)
[ Auditoría          ]
[ Jobs               ]
[ Estado             ]
```

### Contenido del tab 🆕 "Nuevo Artículo"

Implementar **3 subtabs internas**:

#### Subtab A — Redacción

```
┌─────────────────────────────────────────────────────────┐
│  Título:        [_______________________________]        │
│  Sección:       [▼ tierra  ]                              │
│  Topics (coma): [cine, quilombo, historia, ...]           │
│                                                           │
│  Cuerpo (HTML o texto):                              ↗max│
│  ┌──────────────────────────────────────────────────┐    │
│  │ (textarea fondo verde claro, font monospace)     │    │
│  │ <h3>Introducción</h3>                            │    │
│  │ <p>El concepto de quilombo en Brasil...</p>      │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
│  [ 💾 Guardar borrador ]   (POST /api/drafts)             │
│                                                           │
│  ✅ Borrador guardado. Slug: quilombo-pelicula-2          │
│     → [ Ir a Preview → ]                                  │
└─────────────────────────────────────────────────────────┘
```

**Comportamiento:**
- Click "Guardar borrador" → `POST /api/drafts` con los campos
- Si OK → mostrar slug + botón para saltar a Subtab B
- Si error → mostrar mensajes debajo del campo correspondiente
- Guardar en `sessionStorage.currentDraftSlug` para recordarlo entre refrescos

---

#### Subtab B — Preview

```
┌─────────────────────────────────────────────────────────┐
│  Seleccionar borrador: [▼ quilombo-pelicula-2    ]       │
│                                                           │
│  [ Editar ← ]   [ ✨ Mejorar con IA (Próximamente) ]     │
│                                        [ ✅ Aprobar → ]   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │              PREVIEW RENDERIZADO                  │    │
│  │  (recuadro borde azul, fondo blanco,              │    │
│  │   usa previewHtml del server)                     │    │
│  │                                                   │    │
│  │  📋 SECCIÓN: tierra  |  📅 Fecha: 2026-08-26      │    │
│  │  🏷️ Topics: cine, quilombo, historia              │    │
│  │  🟡 Estado: pending-review                         │    │
│  │                                                   │    │
│  │  ─────────────────────────────                    │    │
│  │                                                   │    │
│  │  <h3>Introducción</h3>                            │    │
│  │  <p>El concepto de quilombo en Brasil...</p>      │    │
│  │  ...                                              │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
│  Estado de la aprobación:                                 │
│  ⬜ No intentada    🟡 Validando...   ✅ Aprobado   ❌ Errores
└─────────────────────────────────────────────────────────┘
```

**Comportamiento:**
- Al cargar (o al cambiar selector de slug): `GET /api/drafts/:slug` → pintar `previewHtml` en un `<div>` + mostrar metadata
- "Editar ←": volver a Subtab A cargando los datos actuales
- "Aprobar →": **llamada crítica** → `POST /api/drafts/:slug/approve`
  - `200 OK` → Mostrar banner verde: "✅ Artículo aprobado y movido a `data/articulos_en_trabajo/READY/<slug>.json`. Listo para publicar en kilombo.top"
  - `422 VALIDATION_FAILED` → Mostrar cada error en rojo, con el path del campo y el mensaje. NINGÚN paso automático: el usuario tiene que volver a Subtab A, corregir, guardar, reintentar aprobar.
  - `400 DRAFT_ALREADY_APPROVED` → Mostrar info: este artículo ya está en READY

---

#### Subtab C — Mejorar con IA (visible pero deshabilitado)

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│           🚧  PRÓXIMAMENTE                                │
│                                                           │
│   La funcionalidad de sugerencias de IA se activará       │
│   cuando se configure la API key del modelo (Claude u     │
│   otro).                                                  │
│                                                           │
│   Mientras tanto, puedes editar y aprobar el artículo     │
│   manualmente sin problemas.                              │
│                                                           │
│   [ ← Volver a Preview ]                                  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

### Nuevo tab: "Listos para Publicar"

```
┌──────────────────────────────────────────────────────────────────┐
│ Artículos aprobados en data/articulos_en_trabajo/READY/              │
│                                                                   │
│   SLUG                  FECHA APROBADO    SECCIÓN   ACCIONES      │
│ ─────────────────────────────────────────────────────────────    │
│   quilombo-pelicula-2    2026-08-26        tierra     [Ver detalle]│
│   pensiones-reforma      2026-08-25        nom        [Ver detalle]│
│   ...                                                             │
│                                                                   │
│ N = 16 artículos listos para publicar a SPIP                     │
└──────────────────────────────────────────────────────────────────┘
```

Implementación simple: llamar `GET /api/ready-drafts` (endpoint nuevo, alias de `listReady()` de drafts-store) → tabla HTML.

---

## 9. Fase 5 — Stub de IA + End-to-End Testing

### 9.1 Stub de IA (ejecutar junto con Fase 3)

Ya descrito en §6.5 y §6.6: endpoints `/improve` y `/apply-suggestion` devuelven `501 NOT_IMPLEMENTED` con mensaje explicativo. UI muestra "Próximamente" en Subtab C.

### 9.2 Test End-to-End manual (obligatorio antes de dar por terminado)

**Checklist de smoke-test ejecutar en orden:**

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | `npm run start` → abrir `http://localhost:3000/dashboard.html` | Server arranca, dashboard carga sin errores JS en consola |
| 2 | Tab "🆕 Nuevo Artículo" → Subtab A: rellenar campos, click "Guardar borrador" | Crea fichero en `data/articulos_en_trabajo/IN_PROGRESS/<slug>.json`. Slug visible en UI. |
| 3 | Ir a Subtab B → comprobar preview | `previewHtml` renderiza correctamente, metadata visible |
| 4 | Volver a A, modificar cuerpo → Guardar → volver a B | Cambios reflejados, `updatedAt` actualizado |
| 5 | **Casos FAIL de approve** (probar varios): |
|   | 5a. body vacío → Aprobar | Error `contentHtml must be non-empty`, artículo sigue en IN_PROGRESS |
|   | 5b. sourceUrl relativa `#` → Aprobar | Error `sourceUrl must be an absolute https?:// URL` |
|   | 5c. topics `[]` vacío → Aprobar | Error `topics must be a non-empty array` |
| 6 | Corregir todos los errores, rellenar sourceUrl real (`https://kilombo.top/...`) |  |
| 7 | **Aprobar** | ✅ Éxito. Fichero DESAPARECE de `IN_PROGRESS/`, APARECE en `READY/<slug>.json` con `approvedAt`. |
| 8 | Tab "Listos para Publicar" → recargar | El nuevo artículo aparece en la lista |
| 9 | Reintentar aprobar el mismo slug | Error `DRAFT_ALREADY_APPROVED` |
| 10 | Tab "Auditoría" → recargar | Se ven entradas `draft.create`, `draft.update`, `draft.approve` con timestamps correctos |
| 11 | `npm test` | Tests actuales siguen pasando (ningún cambio rompe CI) |
| 12 | `npm run lint` | Sin errores de ESLint |

**Si TODO lo anterior pasa → FUNCIONALIDAD COMPLETA.** Si alguno falla → arreglar antes de continuar.

---

## 10. Archivos afectados (resumen)

> **Estado al 2026-08-26:** ✅ = completado; ⬜ = pendiente.

| Tipo | Ruta | Acción | Estado |
|------|------|--------|--------|
| Modificar | `scripts/import-article.mjs` | Exportar `slugify()` (ya no fue necesario — SSoT es `scripts/lib/slugify.mjs`) | ✅ Hecho |
| Modificar | `package.json` | Mover `happy-dom` a dependencies (ya hecho antes de plan) | ✅ Hecho |
| **Crear** | `scripts/lib/article-validator.mjs` | Extraer validador de articles (ya extraído) | ✅ Hecho |
| Modificar | `scripts/validate-data.mjs` | Re-importar desde article-validator (ya hecho) | ✅ Hecho |
| **Crear** | `scripts/lib/drafts-store.mjs` | 6 métodos CRUD + approve + audit log | ✅ Hecho |
| Modificar | `scripts/lib/live-write-audit.log.jsonl` | append automático vía `appendAudit()` en drafts-store | ✅ Integrado |
| Modificar | `api/server.mjs` | Añadir 7 endpoints + `/api/ready-drafts` | ✅ Hecho · 2026-08-26 |
| **Crear** | `test/drafts-store.test.mjs` | 58 tests: INVALID_SLUG + DRAFT_NOT_FOUND + DRAFT_ALREADY_APPROVED + VALIDATION_FAILED + list/listReady/create contract | ✅ Hecho · 2026-08-26 |
| Modificar | `api/public/dashboard.html` | Reorganizar tabs + 3 subtabs nuevo flujo + tab Listos | ✅ Hecho · 2026-08-26 |

**Total:** 3 archivos creados, 5 modificados. Cero archivos eliminados.

---

## 11. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Estado | Mitigación |
|--------|-------|---------|--------|------------|
| `slugify()` cambia al exportarse | Baja | Alto | ✅ Cerrado | `slugify` es pura; SSoT confirmada (`lib/slugify.mjs`, export named + default). `npm test` OK. |
| `happy-dom` en dependencies → build más pesado | Baja | Bajo | ✅ Cerrado | Ya en dependencies línea 33 de `package.json`. Sin cambios tamaño perceptible. |
| Validador extraído no coincide 100% con original | Media | Alto | ✅ Cerrado | `validate-data.mjs` importa directo desde `article-validator.mjs`; mismas referencias. `npm test` 57 articles OK. |
| `previewHtml` usa JS modules de `site/` que dependen de browser APIs | Alta | Medio | ⬜ Pendiente de probar en Fase 3 | `sanitizeHtml()` y `reduceToAllowlist()` ya se usan con éxito en `scripts/import-article.mjs` (Node) con happy-dom. No hay APIs de browser allí. |
| Borrador en IN_PROGRESS se aprueba pero el move falla a mitad | Baja | Crítico | ✅ Mitigado en código | `write(tmp) + renameSync(tmp, READY)` es atómico en mismo FS; unlink ip posterior es post-hoc, no crítico. |
| Slug collisions (dos artículos con mismo título) | Media | Alto | ✅ Mitigado en código | `createDraft()` itera `-2`, `-3` verificando 3 fuentes (IN_PROGRESS + READY + published). Smoke-test confirmado. |
| IA stub implementado luego se olvida | Media | Bajo | ⬜ Pendiente (Fase 5) | UI muestra banner explícito. Endpoints devuelven `code: "NOT_IMPLEMENTED"` que la UI detecta y renderiza amigablemente. |

---

## 12. Definición de Hecho (DoD)

> **Snapshot al 2026-08-27 — PLAN 100% COMPLETADO:**
> - [x] Fase 0 Groundwork 100% (3/3 subtareas)
> - [x] Fase 1 drafts-store.mjs 100% (6/6 métodos + audit) + **58 tests dedicados** en `test/drafts-store.test.mjs`
> - [x] Fase 2 article-validator.mjs 100% (extracción + SSoT)
> - [x] Fase 3 Endpoints API 100% (8 endpoints: drafts family + /api/ready-drafts + stubs IA 501)
> - [x] Fase 4 UI Dashboard 100% (tabs reorganizados, 3 subtabs Nuevo Artículo, tab Listos para Publicar; bug preexistente de cabecera `x-kilo-secret` ausente corregido de paso)
> - [x] Fase 5 Smoke-test E2E 12 pasos — **12/12 pasos ✅** (2026-08-27). Dos matices vs. la redacción original del checklist, documentados en la sección 9 arriba (no bugs, comportamiento correcto en capa distinta a la esperada)
> - [x] npm test pasa (**234/234** tests unitarios + 5/5 pipeline)
> - [x] `validateSlugOrThrow` bloqueado contra regresiones: 42 tests INVALID_SLUG × 3 métodos (get/update/approve)
> - [x] npm run lint pasa (0 errors, solo warnings no-console preexistentes)
> - [x] Este documento está referenciado desde [ROADMAP.md](../ROADMAP.md) como plan de implementación activo

Este plan se considera **100% completado** cuando:

- [x] Fase 0-5 ejecutadas
- [x] Smoke test manual §9.2 pasa los 12 pasos
- [x] `npm test` pasa (incluyendo `validate-data.mjs`)
- [x] `npm run lint` pasa
- [x] Todo cambio en [docs/CLIENT_UI.md](CLIENT_UI.md) se corresponde con código real ejecutable
- [x] Este documento está referenciado desde [ROADMAP.md](../ROADMAP.md) como plan de implementación activo

---

*Plan creado 2026-08-26. Completado 2026-08-27 tras pasar Fase 5 (smoke-test E2E 12/12). Actualizar este archivo (no CLIENT_UI.md) si cambian detalles de implementación.*
