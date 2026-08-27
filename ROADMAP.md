# Hoja de ruta técnica — Kilombo Portal

> Objetivo: construir, poblar y publicar el portal central de Kilombo con la estructura de 4 secciones definida, integrando contenido de fuentes externas y estableciendo un flujo claro de despliegue. Ver [`MIRROR_GROWING.md`](MIRROR_GROWING.md) para las reglas de incorporación de contenido, criterios de diseño y sincronización con otros procesos.

---

## 🎯 PRÓXIMO HITO: Dashboard de Cliente — Flujo de Borradores IN_PROGRESS → READY

**Estado (2026-08-27):** ✅ **Completado.** Fases 0–5 hechas, smoke-test E2E (12/12 pasos) verificado en servidor real. `npm test` 234/234, `npm run lint` 0 errores. Ver detalle en [`docs/CLIENT-UI-IMPLEMENTATION-PLAN.md`](docs/CLIENT-UI-IMPLEMENTATION-PLAN.md) §9 y §12.

**Referencia principal:** [`docs/CLIENT_UI.md`](docs/CLIENT_UI.md) — Arquitectura completa, flujo de trabajo, componentes a construir y tareas de implementación.

**Plan de implementación detallado (activo):** [`docs/CLIENT-UI-IMPLEMENTATION-PLAN.md`](docs/CLIENT-UI-IMPLEMENTATION-PLAN.md) — Fases 0–5, archivos afectados, checklist de tests E2E, riesgos y Definición de Hecho.

**Decisiones tomadas (actualizadas, v2):**
- UI real, flujo completo (no mock) operando sobre artículos reales
- URL permanente, protegida con contraseña (StatiCrypt)
- **Sin infraestructura nueva:** el servidor Express existente en `api/server.mjs` es el backend (v1 ya arranca con `npm start`)
- Pipeline `articulos_en_trabajo/IN_PROGRESS/` → `READY/` ya existe; este hito solo **conecta la UI al pipeline** (no modifica el pipeline)

**Arquitectura:**
```
Cliente (navegador)
    │
    ▼
api/server.mjs (Express existente en puerto 3000)
    ├─ POST /api/drafts                  → scripts/lib/drafts-store.mjs → articulos_en_trabajo/IN_PROGRESS/<slug>.json
    ├─ GET /api/drafts/:slug             → lectura + previewHtml renderizado con sanitizeHtml()
    └─ POST /api/drafts/:slug/approve    → validateArticleEntry() + move → articulos_en_trabajo/READY/<slug>.json
                                                                               │
                                                                               ▼
                                                              Listo para publicar en kilombo.top
                                                              (paso a SPIP via Playwright, separado)
```

**Flujo del cliente (5 pasos):**
1. Cliente pega contenido bruto (título, cuerpo, sección, topics)
2. Botón "Guardar borrador" → `POST /api/drafts` → fichero en `IN_PROGRESS/`
3. Subtab Preview → ve HTML limpio renderizado + metadata
4. (opcional) Edita y vuelve a guardar
5. Botón "Aprobar" → `POST /api/drafts/:slug/approve` → valida con reglas de CI → mueve a `READY/`

La publicación final a SPIP (Playwright) sigue siendo una acción explícita separada; no forma parte del flujo automático de aprobación.

**Componentes construidos (resumen; plan detallado en CLIENT-UI-IMPLEMENTATION-PLAN.md):**
- **Groundwork:** ✅ exportar `slugify()`, mover `happy-dom` a `dependencies`
- **Fase 1:** ✅ `scripts/lib/drafts-store.mjs` — 6 métodos (create/get/list/update/approve/listReady)
- **Fase 2:** ✅ `scripts/lib/article-validator.mjs` — extraer `validateArticleEntry()` + `ARTICLE_RULES` de `scripts/validate-data.mjs` (reutilizable, sin `process.exit()`)
- **Fase 3:** ✅ 7 endpoints nuevos en `api/server.mjs` (`/api/drafts` familia) + audit logging
- **Fase 4:** ✅ Reorganizados tabs de `dashboard.html`: "🆕 Nuevo Artículo" (principal, 3 subtabs: Redacción/Preview/IA) + "Listos para Publicar" + "Publicación Directa" (secundario). De paso se corrigió un bug preexistente: el dashboard nunca enviaba la cabecera `x-kilo-secret` que el servidor exige, así que todas las pestañas protegidas (Jobs, Auditoría, Cambiar Estado) habrían devuelto 401 en un despliegue real. Ahora un wrapper `apiFetch()` la pide una vez y la cachea en `sessionStorage`.
- **Fase 5:** ✅ Stub IA (endpoints 501, ya integrados en Fase 3+4) + smoke-test E2E 12/12 pasos — completado 2026-08-27

**Relación con el hito "Management Dashboard UI":** Este hito entrega el **backend Express + capa de librerías (Fase 1-3)** que también consume el tab "Crear Artículo" del Management Dashboard. Ambos hitos comparten `drafts-store.mjs`, `article-validator.mjs` y los endpoints — no hay duplicación de esfuerzo.

---

## 🎯 PRÓXIMO HITO: Management Dashboard UI

**Referencia:** [`docs/UI-ARCHITECTURE-SPEC.md`](docs/UI-ARCHITECTURE-SPEC.md) — Especificación completa lista para implementación.

**Estado:** v0.46.1 ✅ Todas las brechas arquitectónicas cerradas

- ✅ Security gates unificadas (KILO-001 mitigado)
- ✅ Audit trail privado (.gitignore for .log.jsonl)
- ✅ Patrón interactive-only documentado (sync-to-production.sh)
- ✅ Especificación de dashboard (900 líneas, 4 patrones, 12 endpoints, roadmap 4 fases)

**Próximas fases:** 
- Fase 1 (Semanas 1-2): MVP backend + UI básico
- Fase 2 (Semanas 3-4): Security hardening
- Fase 3 (Semanas 5-6): Advanced features (WebSocket, terminal emulator)
- Fase 4 (Semanas 7-8): Operations (Docker, health checks)

Ver `docs/UI-ARCHITECTURE-SPEC.md` sección "Implementation Roadmap" para detalles completos.

---

## FASE INMEDIATA (Próximas 3 sesiones) — Visual distinction for draft content + System de filtrado interactivo 3-tiers + Quality improvements

### v0.42.0 — Quality improvements sprint: code quality, tooling, documentation

**Objetivo:** Mejorar la mantenibilidad del código, experiencia de desarrollador, y calidad general del proyecto mediante herramientas automáticas (linting, formatting) y eliminación de código técnico deuda.

#### Cambios completados

### v0.38.0 — Visual signals for incomplete content (pending-review articles)

**Objetivo:** El espejo sirve como guía para **futuras ediciones**, no como publicación final. Los artículos importados como borradores (sin contenido completo o con imágenes que necesitan descripción) llevan etiqueta `status: pending-review` + notas sobre qué falta. Esta versión hace que esa etiqueta sea **visualmente imposible de pasar por alto** — no solo texto, sino un indicador visual claro en listas y en páginas de detalle.

#### Filosofía del cambio
- **Principio:** La incompletitud no es un "error" sino una invitación a la acción futura. El mirror preserva los candidatos y marca explícitamente qué necesita completarse.
- **Implementación:** 
  - En tarjetas de lista: badge de color ámbar (#f57c00) con emoji ⚠️ + animación de pulso
  - En página de detalle: badge + banner prominente antes del contenido explicando que es un borrador
  - Notas en JSON (`notes` field) guían qué falta (sinopsis, ficha técnica, enlaces, contexto)

#### Especificación visual

**Card level (articulos.html):**
- Status `pending-review` → badge naranja (#f57c00) con ⚠️ emoji
- Texto: "⚠️ pending-review" (en lugar del texto plano "pending-review")
- Animación: pulso suave (opacidad + box-shadow) cada 2 segundos
- Contraste: es lo primero que ves en la tarjeta, visualmente distinto de otros status

**Detail page (articulo.html):**
- Status badge: mismo color ámbar, misma animación
- Banner prominente encima del contenido:
  - Título: "⚠️ Artículo pendiente de revisión"
  - Texto: "Este contenido ha sido importado como borrador y necesita ser completado, revisado y adaptado antes de su publicación final. El texto a continuación es preliminar y servirá como guía para futuras ediciones."
  - Fondo: naranja claro (#fff3e0), borde izquierdo grueso naranja (#f57c00)
  - Icono grande, tipografía clara para lectura rápida

#### Casos de uso del mirror como guía

Los 6 artículos importados en v0.37.0 ejemplifican esto:

- **36, 46 (películas):** stubs de 1 frase → Notas indican: añadir sinopsis, ficha técnica, cómo/dónde verlas, por qué relevantes para Tierra y Libertad
- **76, 85, 86 (image-only):** imágenes sin texto → Notas: transcribir texto de imágenes o añadir descripción, fecha, contexto
- **84 (ensayo plandemismo):** único con texto real (~800 chars) → Notas: limpiar artefactos, estructurar mejor, añadir contexto sobre el documental

Cada nota es un **task list** para futura edición. El mirror es el mapa de trabajo.

### v0.39.0 — Schema extension: metadata fields for movies, documentaries, media articles

**Objetivo:** Permitir que artículos con contenido multimedia (películas, documentales, vídeos) lleven metadatos estructurados (director, año, país, duración, idioma, subtítulos) y enlaces externos (YouTube, IMDb, ok.ru, etc.), renderizados en el detalle del artículo como tarjetas visuales clara.

#### Filosofía del cambio
- Muchos artículos importados son referencias a películas, documentales o contenido multimedia que requieren contexto técnico (director, año, país) y múltiples enlaces de visualización en diferentes plataformas.
- Antes: metadata embebido en el texto del artículo (difícil de mantener, sin estructura)
- Después: campos JSON opcionales (`externalLinks[]`, `metadata{}`) renderizados como tarjetas visuales en el detalle

#### Implementación (v0.39.0)

#### Ejemplo: Artículo 36 (Quilombo película)

```json
{
  "id": "quilombo-pelicula",
  "title": "Quilombo — Película",
  "date": "1984-01-01",
  "section": "tierra",
  "topics": ["cine", "quilombo", "historia", "tierra-y-libertad", "brasil", "cinema-novo"],
  "sourceSite": "Espacio Tierra y Libertad (kilombo.top)",
  "sourceUrl": "https://www.kilombo.top/spip.php?article36",
  "status": "imported",
  "contentHtml": "<p>Sinopsis completa...</p>",
  "externalLinks": [
    {"type": "youtube", "url": "https://www.youtube.com/watch?v=icuIeOoU_3k", "title": "Quilombo película completa"},
    {"type": "imdb", "url": "https://www.imdb.com/title/tt0091816", "title": "IMDb: Quilombo (1984)"}
  ],
  "metadata": {
    "mediaType": "film",
    "director": "Carlos Diegues (Cacá Diegues)",
    "year": 1984,
    "country": "Brasil",
    "duration": "110 min",
    "language": "Portugués",
    "subtitles": "English, Spanish",
    "source": "IMDb, Filmaffinity, research",
    "filmFestival": "Festival de Cannes 1984 (Selección Oficial)"
  },
  "relatedArticles": ["kilombo-quilombo-pelicula"]
}
```

#### Impacto en UI

- **Artículo detail page:** Dos tarjetas nuevas aparecen después del contenido HTML pero antes de la fuente:
  - Tarjeta de ficha técnica (fondo rojo claro, borde izquierdo rojo): director, año, país, duración, idioma, subtítulos
  - Tarjeta de enlaces externos (fondo azul claro, borde izquierdo azul): botones de enlace a YouTube, IMDb, ok.ru, etc. con tipo visible
- **Backward compatibility:** Artículos sin metadata o externalLinks no muestran las tarjetas — cero cambios visuales ni breaking changes
- **Total articulos:** 41 (39 sin metadata + 2 con metadata)

#### Próximos pasos (futuro)

- Usar este patrón para otros artículos multimedia (documentales, audios, vídeos)
- Extender `relatedArticles` para crear una red visual de referencias cruzadas automáticas entre películas/variantes
- Considerar schema similar para audios y otros tipos de contenido

---

### v0.32.0 — Transformar badges estáticos en controles funcionales

**Objetivo:** Convertir los badges de lenguaje, estado y tipo en botones interactivos que dan al usuario control real sobre lo que ve. Esto alinea el proyecto con su misión de **empoderamiento del usuario** en lugar de solo proporcionar enlaces a "páginas aburridas mal ordenadas".

#### Filosofía del cambio
- ❌ **Antes:** Las tarjetas de contenido son solo enlaces (el usuario tiene que seguirlas, sin control)
- ✅ **Después:** Los badges son botones de filtro; el usuario organiza el contenido según sus preferencias

#### Especificación del sistema de filtrado

**3-tiers de filtrado:**

1. **Idioma** (ES / EN / FR)
   - Muestra/oculta tarjetas según idioma disponible
   - Botón toggle: hacer clic marca el idioma como activo/inactivo
   - Lógica: mostrar tarjeta si contiene **cualquiera** de los idiomas seleccionados (OR)
   - Persistencia: guardar selección en URL como `?lang=es,en` y sessionStorage

2. **Estado** (Activo / Archivo / Legado)
   - Muestra/oculta tarjetas según estado de contenido
   - Botón toggle: Activo vs. Archivo vs. Legado — se puede mezclar
   - Lógica: mostrar tarjeta si su estado está en la selección (OR)
   - Persistencia: guardar como `?status=active,archive`

3. **Tipo** (Editorial / Artículos / Oficial / Etc.)
   - Muestra/oculta tarjetas según clasificación temática
   - Botón toggle: cada tipo es independiente
   - Lógica: mostrar tarjeta si su tipo está en la selección (OR)
   - Persistencia: guardar como `?type=editorial,official`

**Combinación de filtros:** Usar **lógica AND entre tiers, OR dentro de cada tier**
```
Mostrar si: (idioma seleccionado) AND (estado seleccionado) AND (tipo seleccionado)
```

Ejemplo: "Mostrar TODOS los contenidos en ES, que sean ACTIVOS O de ARCHIVO, y sean del tipo EDITORIAL u OFICIAL"

#### Persistencia en URL + sessionStorage

- **URL:** `https://kilombo.top/?lang=es,en&status=active&type=editorial,official`
- **sessionStorage:** Al cargar la página, el estado persiste en la sesión del navegador (si el usuario recarga o navega dentro del sitio, los filtros se mantienen)
- **Convención:** Si no hay parámetros, mostrar TODO por defecto (sin restricciones)
- **Botón "Reset":** Limpiar filtros y volver al estado inicial

#### Indicadores visuales

- Botones de filtro con dos estados visuales: **inactivo** (gris, no seleccionado) vs. **activo** (coloreado, seleccionado)
- Contador: "Mostrando X de Y tarjetas"
- Transiciones suaves (fade in/out) al mostrar/ocultar tarjetas
- Si no hay tarjetas que coincidan con los filtros: mostrar mensaje "No hay contenido que coincida con los filtros seleccionados"

#### Anatomía del marcado HTML

```html
<!-- ANTES: badge estático -->
<span class="card-lang">ES / EN / FR</span>

<!-- DESPUÉS: button interactivo con atributos de datos -->
<button class="filter-badge filter-badge--lang" 
        data-lang="es,en,fr" 
        data-active="false"
        aria-pressed="false"
        aria-label="Filtrar por idiomas: Español, Inglés, Francés">
  ES / EN / FR
</button>
```

Las tarjetas tendrán atributos `data-lang`, `data-status`, `data-type` para que el JS pueda evaluarlas:

```html
<a class="card" 
   data-lang="es,en,fr" 
   data-status="active" 
   data-type="editorial,official"
   href="...">
  <!-- contenido -->
</a>
```

#### Tareas de implementación

- [ ] **v0.32.1 — Refactorizar HTML: convertir badges en botones**
  - [ ] Actualizar `index.html`: reemplazar `<span class="card-lang">` con `<button class="filter-badge filter-badge--lang">`
  - [ ] Reemplazar `<span class="card-status">` con `<button class="filter-badge filter-badge--status">`
  - [ ] Reemplazar `<span class="tag">` con `<button class="filter-badge filter-badge--type">` (para tags de tipo: Editorial, Artículos, Oficial)
  - [ ] Añadir atributos `data-lang`, `data-status`, `data-type` a cada tarjeta (`<a class="card">`)

- [ ] **v0.32.2 — Estilos CSS para botones de filtro**
  - [ ] Nueva clase `.filter-badge` base: hereda del estilo de badge existente
  - [ ] Estado inactivo vs. activo (uso de `[aria-pressed="false"]` y `[aria-pressed="true"]`)
  - [ ] Cursor pointer, transiciones de color
  - [ ] Hover/focus estados claros
  - [ ] No envolver botones con enlaces (`<a>`) — son independientes

- [ ] **v0.32.3 — JavaScript: lógica de filtrado**
  - [ ] Crear `site/js/filter.mjs` (módulo ES6)
  - [ ] Función `getFilterState()`: lee URL params + sessionStorage, devuelve estado actual de filtros
  - [ ] Función `setFilterState(state)`: actualiza URL (history.replaceState) + sessionStorage
  - [ ] Función `isCardVisible(card, filterState)`: evalúa si la tarjeta debe mostrarse según filtros
  - [ ] Función `applyFilters()`: itera todas las tarjetas, muestra/oculta según `isCardVisible()`
  - [ ] Event listeners en botones de filtro: al hacer clic, toggle el filtro, aplica cambios
  - [ ] Contador de tarjetas visibles en tiempo real
  - [ ] Mensaje vacío si no hay coincidencias

- [ ] **v0.32.4 — Integración en index.html**
  - [ ] Importar `filter.mjs` con `<script type="module">`
  - [ ] Inicializar filtros al cargar la página
  - [ ] Div para el contador: `<div id="filter-count">Mostrando 12 de 25</div>`
  - [ ] Div para mensaje vacío: `<div id="filter-empty" style="display:none;">No hay contenido...</div>`
  - [ ] Botón reset: `<button id="filter-reset">Limpiar filtros</button>`

- [ ] **v0.32.5 — Tests**
  - [ ] Test: URL con parámetros → filtros aplicados correctamente
  - [ ] Test: Click en botón de filtro → URL actualizada, tarjetas filtradas
  - [ ] Test: Navegación (reload) → estado persiste desde sessionStorage
  - [ ] Test: Combinación de filtros → lógica AND entre tiers, OR dentro de tiers
  - [ ] Test: sin coincidencias → mostrar mensaje vacío
  - [ ] Test: reset → volver al estado inicial

- [ ] **v0.32.6 — Documentación**
  - [ ] Añadir sección en `README.md` explicando cómo usar los filtros
  - [ ] Documentar para desarrolladores cómo agregar nuevos atributos `data-*` a tarjetas futuras
  - [ ] Ejemplo: "Si añades una tarjeta nueva, asegúrate de incluir `data-lang`, `data-status`, `data-type` con valores separados por comas"

#### Accesibilidad

- Botones con `aria-pressed` para indicar estado (activo/inactivo)
- Labels descriptivos en cada botón (`aria-label`)
- Soporte para navegación con teclado (Tab, Enter, Space)
- Anunciar cambios dinámicos con `aria-live` en el contador (screen readers)

#### Timeline

- **Sesión 1:** v0.32.1 – v0.32.2 (refactor HTML + CSS, ~2 horas)
- **Sesión 2:** v0.32.3 – v0.32.5 (JS logic + tests, ~3 horas)
- **Sesión 3:** v0.32.6 (documentación + ajustes finales, ~1 hora)

**Total:** 3 sesiones de trabajo concentrado (~6 horas)

---

## MEJORA TÉCNICA: Modernización del stack de herramientas (TypeScript, Python) — revisado

**Objetivo:** Evaluar el uso de TypeScript y Python con criterio pragmático — "usar cuando es conveniente", por razón técnica concreta, no por preferencia o por completitud percibida del stack.

> **Nota de esta revisión:** la versión anterior de esta sección justificaba Python casi enteramente con un pipeline de audio (WhatsApp → MP3 → Whisper → traducción) que **no existe todavía**: `site/assets/audios/`, `subtitles/` y `transcripts/` están vacíos salvo `.gitkeep`. Proponer scripts Python para ese flujo ahora significa construir y mantener código sin datos reales contra los que probarlo. Esta revisión sustituye esa justificación por el cuello de botella que **sí es real hoy**: convertir los textos crudos pegados en `nuevos_articulos/` (16 archivos sin procesar a la fecha de esta revisión — fauci, onajpu, pensiones, terapiaLiberal, israel, cremas, viruses, etc.) en posts elaborados con gráficos para el sitio.

### El cuello de botella real: texto crudo → post gráfico elaborado

Este paso es distinto del que ya cubre `scripts/import-article.mjs`:

| | `import-article.mjs` (ya existe) | Conversión de `nuevos_articulos/` (sin cubrir) |
|---|---|---|
| **Entrada** | HTML de SPIP con selectores conocidos (`id="texte-article"`, etc.) | Texto plano pegado sin estructura fija — mezcla de bylines, fechas, cuerpo, a veces URLs de video, sin marcado |
| **Extracción** | Regex contra posiciones HTML fijas | Requiere heurística/NLP-ligero: separar autor/fecha/título/cuerpo de un bloque de texto libre |
| **Salida visual** | Reutiliza el `<article>` renderer existente (`render.mjs`) | Necesita generar el activo gráfico (thumbnail / tarjeta / imagen OG) que hoy es un placeholder (`video-card__thumb--placeholder`) |

Los dos primeros son problemas de **parseo de texto no estructurado**; el tercero es un problema de **generación de imágenes**. Ninguno de los dos se resuelve con un sistema de tipos — se resuelven con las librerías correctas.

### Dónde Python sí importa ahora

**Aplicar Python a:**
- `scripts/build-post-from-raw.py` — ingiere un archivo de `nuevos_articulos/`, separa heurísticamente autor/fecha/título/cuerpo de texto sin marcado, y escribe un borrador de entrada a `articulos_en_trabajo/IN_PROGRESS/` (status `pending-review`, nunca publicación directa) para revisión editorial humana antes de tocar `articles.json`.
- `scripts/generate-card-image.py` — genera la imagen de tarjeta/OG a partir de título + metadata (Pillow), sustituyendo el placeholder `video-card__thumb--placeholder` por un gráfico real, consistente en tipografía/paleta con `css/style.css`.

**Por qué Python y no TypeScript aquí:** `Pillow` (composición de imágenes/texto sobre plantilla) y las heurísticas de parseo de texto libre (regex flexible, o un paso opcional de limpieza asistida por LLM) tienen mejor soporte de librerías en Python que en el ecosistema Node para este caso concreto. No es una preferencia — es la herramienta con menos fricción para *este* trabajo.

**Salvaguarda obligatoria:** ambos scripts producen *borradores*, nunca escriben directamente en `site/assets/content/articles.json`. Deben pasar por el mismo `validate-data.mjs` que ya audita todo el catálogo antes de que un borrador se promueva a `READY/` y de ahí a publicación — ver `docs/ARTICLE-PUBLISHING-WORKFLOW.md`. Esto evita que contenido generado heurísticamente (y, en el caso de `nuevos_articulos/`, con carga política/factual sensible — ver ejemplos en la carpeta) entre al sitio sin revisión editorial.

### Dónde TypeScript sigue sin justificarse (por ahora)

`scripts/validate-data.mjs`, `import-article.mjs` y `render.mjs` ya comparten JSDoc + `@ts-check` (ver CHANGELOG v0.1.0), que da autocompletado e inferencia de tipos en el editor **sin paso de compilación**. A la escala actual (57 artículos, ~3.800 líneas en `scripts/`, 11 archivos de test, 175 tests pasando) migrar a `.ts` añade un paso de build a cambio de una ganancia marginal sobre lo que `@ts-check` ya da gratis.

**Disparadores concretos para reconsiderar TypeScript** (en vez de "cuando parezca prudente"):
- El esquema de `Article` gana más de ~3 variantes de `status` o campos condicionales anidados (hoy: `imported | adapted | translated | pending-review | external-only`, manejable a mano).
- Más de una persona edita `validate-data.mjs`/`import-article.mjs` en paralelo con regularidad (hoy: flujo de una sesión a la vez).
- Los scripts de generación de posts (`build-post-from-raw.py` de arriba, o su eventual equivalente Node) crecen lo suficiente como para que el *shape* de su salida y el de `render.mjs` diverjan sin que nada lo detecte — en ese punto, una interfaz compartida sí paga su costo de build.

Hasta que se cumpla alguno de estos, mantener `@ts-check` + JSDoc es la opción de menor fricción.

### Fase 1 (ahora) — Python para el pipeline texto-crudo → post

- [ ] 3.1 Crear `requirements.txt` con `Pillow` (imágenes) y, si se opta por asistencia LLM en el parseo, el cliente HTTP correspondiente (sin credenciales hardcodeadas — seguir el patrón de `.env` ya establecido).
- [ ] 3.2 Escribir `scripts/build-post-from-raw.py --file nuevos_articulos/<nombre>` → borrador en `articulos_en_trabajo/IN_PROGRESS/`, nunca en `articles.json` directamente.
- [ ] 3.3 Escribir `scripts/generate-card-image.py` con 1-2 plantillas (tarjeta normal / tarjeta destacada) que reflejen la paleta de `css/style.css`.
- [ ] 3.4 Documentar el flujo en `articulos_en_trabajo/README.md`: raw → `build-post-from-raw.py` → revisión humana en `IN_PROGRESS/` → `validate-data.mjs` → `READY/` → publicación.
- [ ] 3.5 Procesar los 16 archivos actuales de `nuevos_articulos/` con el script y **revisar editorialmente cada borrador** antes de mover ninguno a `READY/` (varios tienen contenido factual/políticamente sensible que ya requiere juicio editorial, no solo estructuración).

### Fase 2 (diferida) — Audio (Whisper/DeepL)

Sin cambios de fondo respecto a la propuesta original, pero movida a "diferida hasta que exista contenido de audio real" — no tiene sentido construir `transcode-audios.py` / `transcribe-audios.py` contra directorios vacíos. Revisar cuando `site/assets/audios/` deje de contener solo `.gitkeep`.

### Fase 3 (diferida, con disparador explícito) — TypeScript

Ver "Disparadores concretos" arriba. No programar como tarea de un roadmap fijo (`v0.42.0`, etc.) — revisar cuando se cumpla alguno de los tres disparadores.

---

## PRIMEROS PASOS (inmediatos / alta prioridad)

### 1. Establecer flujo claro de subida de modificaciones al sitio

**Flujo de trabajo definido:**
- **Durante la sesión** → push libremente a `main` para previsualizar en GitHub Pages (`https://ukoquique-proves.github.io/kilombo/`). Cada push se publica en ~30 segundos.
- **Al finalizar la sesión** → ejecutar `./end-of-session.sh`. Hace ambas cosas en orden: push a GitHub + deploy a `kilombo.top`.

- [ ] **1.5 Prueba de deploy en `kilombo.top`** — pendiente de que el puerto 22 sea accesible (ver `docs/TROUBLESHOOTING.md` sección 4)

---

### 2. Integrar contenido nuevo: sección Plandemismo + videos de `tv.canal7salta.com`

**Referencia de contenido disponible:** [`docs/SITE_ANALYSIS.md`](docs/SITE_ANALYSIS.md) enumera todos los 54 artículos actuales en www.kilombo.top, 5+ vídeos identificados, estructura SPIP, y URLs de descarga.

La sección **"Nuevo Orden Mundial: plandemismo y domesticación"** debe expandirse incorporando materiales compartidos por los compañeros de `tv.canal7salta.com` (espacio amigo y aliado).

#### Criterios de selección y estructura (indicaciones del cliente):
- **Fuentes:** los contenidos provienen de espacios amigos, así que el tono es de colaboración y respeto — nunca de "curación" o "filtro de calidad".
- **Selección de línea:** se integran los videos que encajan con la línea editorial de este espacio; se dejan fuera aquellos que el cliente considera no ajustados.
- **Inclusión obligatoria:** Documental **"Elisa mato a Ruth"** (2018, España) — el montaje SIDA como antecesor del montaje COVID.
- **Orden de publicación:** Empezar por **videos de ACTUALIDAD**. Los videos HISTÓRICOS (más antiguos, de archivo) se cargan después y se titulan de forma distinta, en una sección separada.
- **Idiomas / traducciones:** Facilitar subtítulos en **francés** (y eventualmente otros idiomas) — ver Paso sobre traducciones.
- **Categorías base del material de Canal7:** Datos estadísticos / Crisis médica internacional / Médicos éticos / Falsos virus & no aislamiento / OMS / Grafeno & contenido de viales / SIDA-Antecesor del COVID

- [ ] **2.6 Poblar lote 3: Históricos** (después, no prioritario)
  - Cuando el cliente dé el OK, cargar los videos históricos con su titulación propia
- [ ] **2.7 Subtítulos en francés (fase inicial)**
  - Para los videos más relevantes, generar subtítulos FR (archivos `.vtt`)
  - Estructura de archivos: `assets/subtitles/{video-id}-fr.vtt`
  - Priorizar subtitulado FR para: documental "Elisa mato a Ruth", los videos más importantes de Actualidad y los comunicados de médicos internacionales

---

### 3. Transcripción y publicación de audios históricos de WhatsApp

Material oral histórico (audios de WhatsApp, notas de voz, comunicados grabados) debe digitalizarse, transcribirse y publicarse en el portal.

- [ ] **3.1 Inventario y recepción de audios**
  - Recopilar todos los archivos de audio (formato típico: opus/ogg/mp4/aac de WhatsApp)
  - Clasificar por: fecha aproximada, autor o interlocutor, tema, duración, idioma (ES/FR)
  - Generar `assets/data/audios-whatsapp-inventario.json` (o CSV) con los metadatos iniciales
- [ ] **3.2 Formateo y estandarización de archivos**
  - Convertir todos los audios a un formato web común (MP3 128 kbps mono) para minimizar peso y maximizar compatibilidad
  - Normalizar volumen y eliminar ruido de fondo si es posible (opcional, útil para audios antiguos)
  - Estructura de almacenamiento: `assets/audios/YYYY-MM-DD_tema-resumido.mp3`
- [ ] **3.3 Transcripción (automática + corrección manual)**
  - Opción A: Whisper (open-source, modelo `medium` o `large`) — ideal por calidad en ES y FR
  - Opción B: herramienta online (WhisperX, AssemblyAI, etc.) si no se quiere correr modelo local
  - Salida inicial: transcripción bruta (texto + timestamps) en `assets/transcripts/`
  - Corrección manual: revisar errores del reconocimiento (nombres propios, términos políticos, abreviaturas), añadir puntuación, párrafos y notas aclaratorias `[sic]` o `[inaudible]` cuando corresponda
  - Formato final de transcripción: Markdown o HTML con timestamps vinculados al audio (`#t=mm:ss`)
- [ ] **3.4 Diseñar la integración en el portal**
  - Página dedicada: `audios-historicos.html`
  - Orden sugerido: cronológico inverso (más recientes primero) o por tema
  - Cada entrada: reproductor de audio HTML5, título/tema, fecha, duración, autor/interlocutor, etiquetas, botón "ver transcripción" (colapsable o enlace a transcripción completa)
  - Buscador y filtros: por tema, fecha, autor, idioma
  - Decidir en qué sección(s) del índice enlazar esta página (candidatos: GCI → Archivo histórico / Espacio Tierra y Libertad como material de referencia)
- [ ] **3.5 Publicar lotes progresivamente**
  - No esperar a transcribir los 100%. Publicar por tandas (primer lote de 20–30 audios priorizados por relevancia) y seguir transcribiendo en paralelo
  - Marcar audios pendientes de transcripción como "Solo audio" en el listado
- [ ] **3.6 Revisión ética**
  - Confirmar que todos los interlocutores dan consentimiento a la publicación de sus voces y textos (materiales de difusión pública por parte del grupo suelen estar autorizados, pero documentar la decisión)
  - Si es necesario, ofrecer opción de anonimizar voces de participantes que no sean ponentes oficiales

---

## FASE 2 — Ampliación de contenido y estructura

### 4. Poblar cada sección con contenido editorial propio
No solo enlaces externos; agregar dentro del propio portal. Ver [`MIRROR_GROWING.md`](MIRROR_GROWING.md) para el proceso detallado de incorporación, criterios de admisión y checklist de publicación.

- [ ] **4.1 Espacio Tierra y Libertad** — artículos destacados, últimos textos publicados, sección "En portada"
  - [ ] Filtrado y ordenación en `articulos.html` — por etiqueta (topic), idioma, fecha y fuente/publicación de origen
  - [ ] Campos de metadatos adicionales por artículo: tiempo estimado de lectura, autor/fuente visible en la tarjeta
- [ ] **4.2 GCI** — últimos comunicados oficiales, biblioteca de textos programáticos por idioma (ES/EN/FR), acceso directo al CD-Rom con categorías
- [ ] **4.3 Proletarios Internacionalistas** — últimos números/artículos separados por edición (ES / FR)
- [ ] **4.4 NOM / Plandemismo** — además de los videos: artículos, dossieres, infografías, líneas de tiempo cronológicas
  - [ ] Estructura cronológica o por medio en `plandemismo.html` (Documentales / Serie Canal7 / Dossieres escritos)
  - [ ] Reproductores de vídeo embebidos o interfaces de player claras, en lugar de listas de enlaces externos
- [ ] **4.5 Referencias cruzadas automáticas en artículos** — cada artículo tendrá una sección oculta (expandible o cargada bajo demanda) con referencias generadas automáticamente a otros artículos del portal y/o fuentes externas que complementen su contenido
### 5. Traducciones y puesta al día de idiomas
Hay **atraso histórico de traducciones**, especialmente las revistas del GCI que están disponibles en español pero no en francés, y viceversa. También hay que prever subtítulos en francés para los videos de Canal7.

- [ ] **5.1 Inventario del déficit de traducción GCI**
  - Hacer inventario de todas las revistas, comunicados y textos programáticos del sitio oficial `icg-gci.kilombo.top`
  - Marcar qué existen en ES pero faltan en FR, cuáles en FR faltan en EN, etc.
  - Generar `assets/data/gci-traducciones-pendientes.json` con prioridad (textos programáticos primero → comunicados → artículos secundarios)
- [ ] **5.2 Flujo de traducción**
  - Motor sugerido: DeepL / Whisper (para texto) + corrección humana obligatoria (los matices políticos y términos específicos requieren edición manual)
  - Estructura en el portal: cada artículo/comunicado tendrá banderitas de idiomas disponibles (ES ✓ / EN ✓ / FR ?) — si falta un idioma, mostrar "Pendiente de traducción"
  - Convención de archivos: artículos en `site/content/{slug}/es.md`, `{slug}/fr.md`, `{slug}/en.md`
- [ ] **5.3 Subtítulos FR para videos de Canal7 (sección Plandemismo)**
  - Ver detalle en el Paso 2.7
  - Generar archivos `.vtt` por video prioritario
  - Etiquetar en la ficha del video qué subtítulos hay disponibles (FR = primero)
- [ ] **5.4 Actualización continua**
  - Regla: a partir de ahora, **ningún texto nuevo se publica en una sola lengua si su traducción se puede cubrir**. Publicar lote de ES+FR juntos siempre que sea posible, para no generar nuevo atraso.

### 6. Organización por idiomas dentro de cada sección
- [ ] Sistema de pestañas (tabs) o selector de idioma dentro de cada sección numerada (GCI, P.I., NOM)
- [ ] Páginas individuales por idioma con contenido filtrado
- [ ] Selector global de idioma en la cabecera (ES / EN / FR / Multilingüe)
### 6b. Búsqueda y descubrimiento de contenido
- [ ] **Búsqueda client-side** — integrar herramienta ligera (Pagefind, Lunr.js, o Algolia) sobre todos los artículos e índices de archivo del portal
- [ ] Nota: el banner de "volver al portal" en subdominios externos (icg-gci, cdrom, etc.) está fuera de alcance — esos sitios no están bajo control de este repo

---

## FASE 3 — Publicación y ajustes finales

### 7. Protección de acceso al espejo (StatiCrypt)

El espejo en GitHub Pages es de acceso público por diseño de la plataforma. Para restringir la lectura del contenido a personas que conozcan la contraseña compartida, se usa **cifrado AES-256 en el lado del cliente** mediante [StatiCrypt](https://github.com/robinmoisson/staticrypt).

#### Qué es StatiCrypt y cómo funciona

StatiCrypt es una herramienta open-source que cifra páginas HTML estáticas con AES-256-CBC usando una clave derivada con PBKDF2. El resultado es un archivo HTML autónomo que:

1. Muestra un formulario de contraseña al visitante
2. Deriva la clave criptográfica de la contraseña introducida
3. Descifra el contenido en memoria, directamente en el navegador
4. Muestra la página solo si la contraseña es correcta

El repositorio de GitHub contiene únicamente texto cifrado — no hay contenido legible en el código fuente ni en los archivos JSON servidos.

#### Modelo de seguridad honesto

| Amenaza | Protegido |
|---------|-----------|
| Bots y scrapers sin JS | ✅ Sí — solo ven ciphertext |
| Visitante casual sin contraseña | ✅ Sí |
| Alguien que inspecciona el repo en GitHub | ✅ Sí — solo ve blobs cifrados |
| Alguien que tiene la contraseña y usa devtools | ❌ No — puede extraer el DOM descifrado |
| Borrado o modificación del contenido | ❌ No aplica — GitHub Pages es de solo lectura para visitantes; kilombo.top actúa como backup permanente |

La protección es equivalente a una puerta con cerrojo de combinación: detiene a quien no sabe el código, pero no a quien sí lo tiene. Es el nivel máximo alcanzable en un host estático sin servidor.

#### Arquitectura de implementación

- `index.html` — **queda pública** (es el directorio del portal, sin contenido sensible)
- `plandemismo.html`, `articulos.html`, `articulo.html` — **cifradas** en el paso de build
- Archivos JSON de datos (`assets/data/*.json`, `assets/content/*.json`) — **cifrados** con la misma contraseña
- La contraseña se almacena como **GitHub Actions Secret** (`STATICRYPT_PASSWORD`) — nunca en el repo
- El paso de cifrado se añade en `deploy.yml` entre checkout y upload del artifact
- En desarrollo local, `npm run preview` sirve el sitio sin cifrar para no bloquear el flujo de trabajo
- Un script `scripts/encrypt.mjs` orquesta el cifrado de páginas y JSON antes del deploy

#### Flujo de build con cifrado activo

```
git push → GitHub Actions →
  1. npm ci + npm test  (igual que ahora)
  2. node scripts/encrypt.mjs  (cifra HTML + JSON con STATICRYPT_PASSWORD)
  3. upload artifact (site/ con archivos cifrados)
  4. deploy to GitHub Pages
```

### 8. Revisión de diseño y experiencia de usuario
- [ ] Revisión visual completa con el cliente (paleta, tipografía, sensación)
- [ ] **Ilustraciones / iconografía por sección** — el sitio `kilombo.top` original usaba logos y dibujos que daban calidez visual a cada sección. El espejo debe incorporar imágenes representativas propias, diseñadas con coherencia real respecto al significado de cada sección (Tierra y Libertad, GCI, Proletarios Internacionalistas, NOM/Plandemismo) — no copias de las originales, que carecían de representación coherente. Pueden ser ilustraciones SVG, iconografía editorial o imágenes de dominio público seleccionadas por criterio político y estético.
- [ ] Incorporar logotipos / marcas de cada plataforma en sus tarjetas correspondientes (pendiente de obtener assets de cada espacio amigo)
- [ ] Imagen de portada / banner principal en la cabecera
- [ ] Testear en móvil, tablet y escritorio
- [ ] Testear accesibilidad (contrastes, teclado, lectores de pantalla)

### 9. SEO y metadatos
- [ ] `sitemap.xml`
- [ ] `robots.txt`
- [ ] Twitter Cards (opcional — OG cubre la mayoría de plataformas)

### 10. Deploy final en `kilombo.top`

El deploy se hace al final de cada sesión de trabajo con `./end-of-session.sh`, en cuanto el cliente apruebe el estado del espejo. No es un evento único al final del proyecto — ocurre de forma incremental.

**Único prerrequisito:** abrir el puerto 22 desde el panel YunoHost (lo puede hacer el propio cliente, sin necesitar a los administradores técnicos). Ver `TROUBLESHOOTING.md` sección 4.

- [ ] Abrir puerto SSH desde `https://kilombo.top/yunohost/admin/` → Herramientas → Firewall → TCP 22
- [ ] Crear app `my_webapp` para `kilombo.top` raíz desde el panel YunoHost
- [ ] Ejecutar `./end-of-session.sh` y verificar deploy en `kilombo.top`
- [ ] Verificar que todos los enlaces salientes funcionan desde el dominio final

---

## FASE 4 — Mantenimiento

### 11. Rutina de actualización
- [ ] Documentar cómo agregar un nuevo artículo/video/comunicado/audio/traducción
- [ ] Calendario sugerido de revisión (semanal de enlaces, mensual de contenido, trimestral de atraso de traducciones)
- [ ] Checklist rápido de publicación (ver formato, enlaces, idiomas disponibles, categorías)

### 12. Monitoreo
- [ ] Detección de enlaces rotos (herramienta de crawl automático)
- [ ] Registro de mejoras pendientes (`issues` en GitHub o lista en markdown)

---

## Resumen de prioridad

| Bloque | Estado | Tiempo estimado |
|--------|--------|-----------------|
| **0. Señalización visual para artículos pendientes (v0.38.0)** | ✅ Completado — badges ámbar + animación + banner en detalle | — |
| **0b. Sistema de filtrado interactivo 3-tiers (v0.32)** | Pendiente — spec completa, sin empezar | 3 sesiones (~6h) |
| **0c. Dashboard de cliente — Flujo de borradores (Express backend)** | ✅ Completado (Fases 0–5, ver [CLIENT-UI-IMPLEMENTATION-PLAN.md](docs/CLIENT-UI-IMPLEMENTATION-PLAN.md)) — smoke-test E2E 12/12 pasos verificados 2026-08-27 | — |
| **1. Flujo de subida / deploy** | ✅ GitHub Pages activo (`ukoquique-proves.github.io/kilombo/`) — deploy a `kilombo.top` aplazado a fase futura | — |
| **2. Plandemismo + videos Canal7 (Actualidad + SIDA→COVID)** | ✅ Construido y poblado — pendiente URLs reales y subtítulos FR | — |
| **3. Transcripción + publicación audios WhatsApp** | Pendiente | 2 – 7 días |
| 4. Contenido editorial por sección (incl. referencias cruzadas automáticas) | Pendiente | 2 – 4 días |
| **5. Traducciones / puesta al día de idiomas (GCI, subtítulos FR)** | Pendiente | 3 – 10 días |
| 6. Organización por idiomas dentro de cada sección | Parcial — indicadores Nivel 1/2 ✅ implementados y con test de regresión; pestañas/selector de idioma pendientes | 1 – 2 días |
| **7. Protección de acceso — StatiCrypt (cifrado AES-256 client-side)** | ✅ Implementado y verificado en GitHub Pages | — |
| 8. Revisión diseño + UX | Pendiente | 1 día |
| 9. SEO y metadatos | Parcial — favicon ✅ + OG metadata ✅ (v0.36.0); sitemap.xml y robots.txt pendientes | 0.25 día |
| **10. Deploy a `kilombo.top`** | Pendiente — solo requiere abrir puerto 22 desde el panel YunoHost (sin necesitar a los administradores) | 0.5 día |
| 11–12. Mantenimiento (documentación) | Pendiente | 0.5 día |

