# Hoja de ruta técnica — Kilombo Portal

> Objetivo: construir, poblar y publicar el portal central de Kilombo con la estructura de 4 secciones definida, integrando contenido de fuentes externas y estableciendo un flujo claro de despliegue. Ver [`MIRROR_GROWING.md`](MIRROR_GROWING.md) para las reglas de incorporación de contenido, criterios de diseño y sincronización con otros procesos.

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

## MEJORA TÉCNICA: Modernización del stack de herramientas (TypeScript, Python)

**Objetivo:** Mejorar la mantenibilidad, tipo-seguridad y experiencia de desarrollo estandarizando el uso de TypeScript y Python de forma pragmática. Actualmente, el proyecto mezcla JavaScript (.mjs), bash y Python de forma inconsistente. Esto debe refactorizarse siguiendo el principio "usar cuando es conveniente" — es decir, elegir la herramienta correcta por razón técnica, no por preferencia personal.

### Contexto actual

| Componente | Lenguaje | Problemas |
|------------|----------|----------|
| Build & validation (`scripts/validate-data.mjs`, `encrypt.mjs`, etc.) | JavaScript (.mjs) | Sin tipos; esquemas y validación definidos manualmente; difícil refactorizar |
| Orchestration (`scripts/test.sh`) | Bash | Bien; no requiere cambios |
| Testing (`test/*.test.mjs`) | JavaScript | Sin tipos; fixtures y helpers no tipados |
| One-off debugging (`sandbox/*.mjs`) | JavaScript | Legítimo; no requiere cambios |
| YunoHost/API integration (`sandbox/check_sso.py`) | Python | Correcto; pero aislado, no parte del build |

### Propuesta de modernización

#### 1. TypeScript para scripts de build y validación

**Aplicar TypeScript a:**
- `scripts/validate-data.mjs` → `scripts/validate-data.ts` (compila a `.mjs`)
- `scripts/encrypt.mjs` → `scripts/encrypt.ts`
- `scripts/import-article.mjs` → `scripts/import-article.ts`
- `scripts/check-urls.mjs`, `check-badges.mjs` — si la lógica lo justifica

**Beneficios:**
- Esquemas definidos como interfaces TypeScript (`interface Article`, `interface VideoMetadata`) — la fuente de verdad única
- Validación automática en tiempo de compilación para muchos errores (tipos faltantes, campos opcionales/requeridos)
- Auto-completado en editor (Intellisense) mejora la velocidad de desarrollo
- Refactorización segura: cambiar estructura de datos y confirmar en compilación que todos los sitios se actualizaron

**Ejemplo: schema de validación en TypeScript vs. JavaScript actual**

```typescript
// Antes (JavaScript): esquema manual en comentarios JSDoc
/** @typedef {{ id: string, title: string, date: string, status: 'imported'|'pending-review', ... }} Article */

// Después (TypeScript): interfaz compilada, reutilizable
interface Article {
  id: string;
  title: string;
  date: string;
  status: 'imported' | 'adapted' | 'translated' | 'pending-review' | 'external-only';
  topics: string[];
  metadata?: ArticleMetadata;
  externalLinks?: ExternalLink[];
}

interface ArticleMetadata {
  mediaType?: 'film' | 'documentary' | 'audio';
  director?: string;
  year?: number;
  country?: string;
  duration?: string;
}

// Función tipada — el compilador rechaza articles malformadas
function validateArticles(articles: unknown[]): Article[] {
  // ...
}
```

#### 2. Python para utilidades de integración y transformación de datos

**Aplicar Python a:**
- `scripts/fetch-external-sources.py` — descargar y limpiar contenido de fuentes externas (scraping, SPIP API, YunoHost)
- `scripts/transcode-audios.py` — conversión de audios WhatsApp a MP3, normalización
- `scripts/transcribe-audios.py` — wrapper sobre Whisper (o similar) para transcripción masiva
- `scripts/deepl-translate.py` — API wrapper para traducciones automáticas (con fallback a manual review)

**Beneficios:**
- Acceso directo a librerías especializadas: `requests` (HTTP), `pydub`/`ffmpeg-python` (audio), `openai` (Whisper), `deepl` (traducción)
- Scripts aislados y reutilizables — no cada sesión reinventa la rueda
- Mejor para scripts de "carga de datos única" — no requieren integración fuerte con el build JavaScript

#### 3. Migración path y timeline

**Fase 1 (v0.42.0) — TypeScript para validación:**
- [ ] 3.1 Instalar TypeScript + herramientas (`npm install --save-dev typescript ts-node @types/node`)
- [ ] 3.2 Crear `tsconfig.json` con configuración para ES modules, `outDir: './dist/scripts'`
- [ ] 3.3 Refactorizar `scripts/validate-data.mjs` → `scripts/validate-data.ts` con interfaces
- [ ] 3.4 Refactorizar `scripts/check-urls.mjs` → `scripts/check-urls.ts`
- [ ] 3.5 Actualizar `package.json` scripts: `"test": "tsc && bash scripts/test.sh"` (compila TS primero)
- [ ] 3.6 Tests: `npm test` sigue pasando; compiled JS en `dist/scripts/` se ejecuta como antes
- [ ] 3.7 Documentar para desarrolladores: "Escribe nuevos scripts en TypeScript en la carpeta `scripts/`, no en `.mjs`"

**Fase 2 (v0.43.0) — Python para utilidades de datos:**
- [ ] 3.8 Crear `requirements.txt` con dependencias Python (requests, pydub, openai-whisper, deepl)
- [ ] 3.9 Escribir `scripts/transcode-audios.py` — convertir audios WhatsApp a MP3 estándar
- [ ] 3.10 Escribir `scripts/transcribe-audios.py` — wrapper sobre Whisper con cli amigable
- [ ] 3.11 Escribir `scripts/fetch-external-sources.py` — scraping y normalización de fuentes SPIP/GCI
- [ ] 3.12 Documentar uso en `README.md` sección "Python scripts" — cómo invocar, dependencias del sistema (ffmpeg para audio, modelo Whisper)
- [ ] 3.13 Integrar en CI si es apropiado (ej: `transcribe-audios.py` como paso opcional pre-deploy)

**Fase 3 (futuro) — Refactor de test suite:**
- [ ] 3.14 Migrar `test/*.test.mjs` → TypeScript con tipos para fixtures y helpers
- [ ] 3.15 Considerar framework de testing tipado (ej: Vitest con TypeScript nativo)

### Guía de decisión: cuándo usar cada lenguaje

| Tarea | Lenguaje | Razón |
|------|----------|-------|
| Validación de esquemas JSON | TypeScript | Seguridad de tipos; reutilización de interfaces |
| Transformación de datos (mapeo, filtrado, sanitización) | TypeScript | Tipado; integración con build |
| Tests y assertions | TypeScript | Tipado; fixtures seguras |
| Orchestration (run tests, build, deploy) | Bash | Ligero; directo; no necesita tipos |
| HTTP / APIs externas | Python (o TypeScript + fetch) | Python si requiere librerías pesadas (requests, oauth); TS si es ligero |
| Audio / vídeo (transcode, normalizar) | Python | ffmpeg-python, pydub maduros |
| ML/AI (transcripción, traducción) | Python | openai-whisper, deepl-python, etc. |
| One-off debugging / exploratorio | JavaScript (.mjs) | Rápido; sin overhead de compilación |

### Beneficios esperados

1. **Mantenibilidad:** Código tipado es más fácil de refactorizar; esquemas compartidos evitan duplicación
2. **Confiabilidad:** Menos bugs en tiempo de runtime; compilador atrapa errores de tipo antes de ejecución
3. **DX mejorada:** Auto-completado del editor; documentación integrada en tipos
4. **Separación de concerns:** Scripts Python aislados no pollucionan la stack JavaScript
5. **Escalabilidad:** A medida que crezca el contenido (100+ artículos, 50+ videos, 1000+ audios), scripts tipados son más mantenibles

### Consideraciones

- **No es obligatorio para todo:** Scripts una-sola-vez o exploratorios (sandbox) pueden seguir siendo JavaScript
- **Retrocompatibilidad:** Los scripts actuales siguen funcionando; migración es gradual
- **Curva de aprendizaje:** TypeScript tiene costo de aprendizaje, pero el equipo lo puede absorbér durante las tareas normales
- **CI/CD:** El paso de compilación TypeScript en el build debe ser rápido (~1-2 segundos); si no, considerar esbuild o swc para acelerar

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

