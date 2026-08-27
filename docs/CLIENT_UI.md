# Dashboard de Cliente — Diseño y Estado de Implementación

Documento de diseño para la interfaz que el cliente usará para gestionar el flujo de artículos desde el contenido bruto hasta la publicación en `kilombo.top`.

---

## Decisiones de diseño

- Flujo completo (no demo/mock): el cliente opera sobre artículos reales
- URL permanente, protegida con contraseña (StatiCrypt)
- El pipeline de borradores (`IN_PROGRESS/` → `READY/`) es el camino principal — la escritura directa a SPIP queda como acción avanzada separada
- Sin infraestructura nueva: el servidor Express existente en `api/server.mjs` es el backend

---

## Flujo objetivo

```
Cliente pega contenido bruto
        │
        ▼
POST /api/drafts  →  articulos_en_trabajo/IN_PROGRESS/<slug>.json
        │
        ▼
GET /api/drafts/:slug  →  preview renderizado (HTML sanitizado)
        │
        ├─ (opcional) POST /api/drafts/:slug/improve  →  sugerencias de IA (no auto-aplicadas)
        │             POST /api/drafts/:slug/apply-suggestion
        │
        ▼
POST /api/drafts/:slug/approve
        │
        ▼
articulos_en_trabajo/READY/<slug>.json  →  listo para publicar en kilombo.top
```

El paso de publicación a SPIP (que usa Playwright) sigue siendo una acción explícita separada, no parte del flujo automático de aprobación.

---

## Estado actual vs. lo que había antes

El tab "Crear Artículo" del dashboard actual llama directamente a `scripts/create-article.mjs`, que escribe en el SPIP de producción via Playwright. Esto es correcto para publicación directa, pero no sirve para el flujo de borradores.

El pipeline `IN_PROGRESS/` → `READY/` ya existe y está activo:
- `articulos_en_trabajo/IN_PROGRESS/` tiene ~70 ficheros (artículos en proceso)
- `articulos_en_trabajo/READY/` tiene 16 artículos aprobados
- El flujo está documentado en `docs/ARTICLE-PUBLISHING-WORKFLOW.md`

Lo que falta es conectar ese pipeline a la UI. Nada de lo que se va a construir modifica el pipeline existente — solo añade una capa programática encima.

---

## Componentes a construir

### 1. Groundwork (previo a todo lo demás)

**Exportar `slugify()` de `scripts/import-article.mjs`**
Actualmente es función interna. Necesaria para generar IDs de borrador consistentes con el resto del sistema. Cambio de una línea: `function slugify` → `export function slugify`.

**Mover `happy-dom` de `devDependencies` a `dependencies`**
`scripts/import-article.mjs` importa `{ Window } from 'happy-dom'` para `reduceToAllowlist()`. Si el servidor corre en un entorno que poda devDependencies (producción, Docker), fallará en runtime. Mover a `dependencies` en `package.json`.

**Crear `scripts/lib/article-validator.mjs`**
Extraer `validateArticleEntry()` y el esquema de campos (`ARTICLE_RULES`) de `scripts/validate-data.mjs`. El motivo: `validate-data.mjs` llama a `process.exit()` al cargarse (sin guardia `import.meta.url`) — no se puede importar como librería. El nuevo módulo exporta la función de validación sin efectos secundarios, para que el endpoint `/approve` reutilice exactamente las mismas reglas que usa CI.

### 2. `scripts/lib/drafts-store.mjs`

Módulo de acceso al filesystem para `articulos_en_trabajo/`. Exporta:

```js
createDraft(fields)          // escribe IN_PROGRESS/<slug>.json, comprueba unicidad de slug
getDraft(slug)               // lee IN_PROGRESS/<slug>.json
listDrafts()                 // lista IN_PROGRESS/*.json
updateDraft(slug, fields)    // sobreescribe IN_PROGRESS/<slug>.json
approveDraft(slug)           // valida con article-validator.mjs + mueve a READY/<slug>.json
listReady()                  // lista READY/*.json
```

La unicidad del slug se comprueba contra `IN_PROGRESS/`, `READY/`, y `site/assets/content/articles.json` para evitar colisiones con artículos ya publicados.

### 3. Nuevos endpoints en `api/server.mjs`

| Método | Ruta | Acción |
|--------|------|--------|
| `POST` | `/api/drafts` | Crear borrador en `IN_PROGRESS/` |
| `GET` | `/api/drafts` | Listar borradores |
| `GET` | `/api/drafts/:slug` | Leer borrador + HTML renderizado para preview |
| `PUT` | `/api/drafts/:slug` | Actualizar borrador |
| `POST` | `/api/drafts/:slug/improve` | Solicitar sugerencias de IA (devuelve sugerencias, no las aplica) |
| `POST` | `/api/drafts/:slug/apply-suggestion` | Aplicar una sugerencia concreta |
| `POST` | `/api/drafts/:slug/approve` | Validar + mover a `READY/` |

Todas las mutaciones se registran en el audit log existente (`live-write-audit.log.jsonl`) a través del patrón de logging ya establecido, para que aparezcan en el tab "Auditoría" del dashboard.

Nota: `guardedWrite()` de `scripts/lib/live-write-gateway.mjs` está diseñado exclusivamente para mutaciones sobre el SPIP vivo — no usarlo para escrituras locales de ficheros. El logging de operaciones de borrador va directo al audit log por otro camino.

### 4. Dashboard UI — cambios al tab "Crear Artículo"

El tab actual "Crear Artículo" (que escribe directamente a SPIP) pasa a llamarse "Publicación Directa" y se mueve a una posición secundaria. El nuevo tab principal "Nuevo Artículo" implementa el flujo de borradores:

**Subtab A — Redacción:**
- Campos: título, cuerpo (textarea verde), sección, topics
- Botón "Guardar borrador" → `POST /api/drafts`
- Confirmación con el slug generado

**Subtab B — Preview:**
- Renderiza el `contentHtml` del borrador usando `reduceToAllowlist()` del servidor
- Muestra los campos de metadatos (sección, topics, fecha, status)
- Botones: "Editar", "Mejorar con IA", "Aprobar → mover a READY"

**Subtab C — Mejorar con IA (opcional):**
- Muestra las sugerencias devueltas por el endpoint `/improve`
- El cliente puede aceptar o descartar cada sugerencia individualmente
- Nunca se auto-aplica nada

**Botón "Aprobar":**
- Llama a `POST /api/drafts/:slug/approve`
- Si la validación falla, muestra los errores concretos (mismos que CI)
- Si pasa, confirma que el fichero está en `READY/` y listo para publicar

### 5. Paso de IA — alcance pendiente de definir

El endpoint `/improve` requiere:
- Una API key de Claude (u otro modelo) configurada como variable de entorno
- Definir qué significa "mejorar": corrección gramatical, restructuración, traducción, enriquecimiento de contexto, o alguna combinación

Este componente puede dejarse como stub ("Próximamente") mientras se implementan los pasos 1–4. No bloquea el resto del flujo.

---

## Autenticación del cliente (sin cambios respecto al diseño anterior)

El cliente necesita un **GitHub Fine-Grained Personal Access Token** con permisos mínimos:
- Contents: Read and Write
- Actions: Write

Usar fine-grained PAT (no classic): un classic PAT con scope `repo` da acceso a todos los repos del propietario. El fine-grained se genera scoped a `ukoquique-proves/kilombo` únicamente.

**Configuración:**
- Tipo: Fine-grained PAT (`github.com/settings/tokens?type=beta`)
- Repository access: solo `ukoquique-proves/kilombo`
- Expiration: máximo 366 días (límite de GitHub para fine-grained)
- Almacenamiento: `sessionStorage` únicamente — se borra al cerrar el navegador

**Política de rotación:** añadir recordatorio en el calendario 2 semanas antes de la expiración. Generar nuevo token → actualizar en la UI → revocar el anterior.

**Secrets de GitHub Actions necesarios:**
- `KILOMBOTOP_PASSWORD` — credencial SPIP (username `kilombo` hardcodeado en los scripts)
- `KILO_APPROVE_PUBLISHING=true` — gate para publicación directa
- `STATICRYPT_PASSWORD` — ya existe para el deploy actual

No existe `SPIP_LOGIN` ni `SPIP_PASSWORD`. El único secret de credencial SPIP es `KILOMBOTOP_PASSWORD`.

---

## Protección de la URL

La página cifrada con StatiCrypt requiere dos factores independientes:
1. La contraseña StatiCrypt para descifrar la página
2. El GitHub token para que las llamadas a la API funcionen

Quien tenga la contraseña del sitio pero no el token puede ver la UI pero no puede escribir nada.

---

## Puntos abiertos

- **TO_FIX #69** (status changes via Playwright) — no bloquea este flujo. El flujo de borradores no usa status changes. Solo afecta a quien quiera cambiar el estado de un artículo ya publicado directamente en SPIP.
- **Alcance del paso de IA** — definir antes de implementar el endpoint `/improve`.
- **Sign-off del cliente** — registrar explícitamente si aprueba el flujo tras ver la primera demo funcional.

---

## Tareas de implementación (orden)

- [ ] Exportar `slugify()` de `scripts/import-article.mjs`
- [ ] Mover `happy-dom` a `dependencies` en `package.json`
- [ ] Crear `scripts/lib/article-validator.mjs` (extraer de `validate-data.mjs`)
- [ ] Crear `scripts/lib/drafts-store.mjs` con los 6 métodos documentados
- [ ] Añadir los 7 endpoints de `/api/drafts` a `api/server.mjs`
- [ ] Actualizar dashboard: renombrar tab actual, añadir nuevo tab de borradores con preview y aprobación
- [ ] Definir alcance del paso de IA y decidir si se implementa en esta fase o se deja como stub
- [ ] Probar flujo completo end-to-end: pegar → guardar → previsualizar → aprobar → verificar en `READY/`
- [ ] Registrar decisión del cliente tras primera demo funcional
