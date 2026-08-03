# Changelog — Kilombo Portal

Todas las modificaciones importantes del proyecto, en orden inverso (últimos cambios arriba).
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

---

## [0.10.0] — 2026-08-03

### Added (nuevo)
- **`site/js/render.mjs`**: módulo ES puro con `escapeHtml`, `buildLangs`, `buildKeypoints`, `renderCard` y tipos JSDoc (`VideoEntry`, `LangChip`). Importable tanto desde el navegador (`plandemismo.js`) como desde Node (`test/render.test.mjs`) sin duplicación.
- **`test/render.test.mjs`**: 32 tests unitarios con `node:test` + `happy-dom` (sin Jest, sin build step). Cubre: 7 casos de `escapeHtml` (payloads XSS, tipos no-string, null/undefined), 5 de `buildLangs`, 4 de `buildKeypoints`, 16 de `renderCard` (estructura DOM, atributos data-*, clases, seguridad). Todos pasan.
- **`scripts/validate-data.mjs`**: validador de esquema para los JSON de vídeos en `site/assets/data/`. Comprueba campos obligatorios, tipos, URLs válidas y valores no vacíos. Falla con `exit 1` y mensaje claro si alguna entrada es inválida — evita que un JSON mal editado se despliegue silenciosamente con cards en blanco.
- **`scripts/check-urls.mjs`**: comprueba que las 7 URLs de la red Kilombo sean consistentes entre `.env.example`, `site/index.html` y `README.md`. Falla con `exit 1` y muestra tabla de presencia si hay drift entre fuentes. Normaliza trailing slashes y puntuación Markdown en la extracción.
- **`happy-dom`** añadido como dev dependency (necesario para el shim de DOM en los tests unitarios de `renderCard`).

### Changed (cambiado)
- **`site/js/plandemismo.js`**: las funciones de render (`escapeHtml`, `buildLangs`, etc.) eliminadas del archivo; ahora importa `renderCard` desde `render.mjs`. El script usa `type="module"` en `plandemismo.html`.
- **`site/plandemismo.html`**: `<script src="js/plandemismo.js">` → `<script src="js/plandemismo.js" type="module">` para soportar el `import` de ES modules.

### Security (seguridad)
- **XSS fix verificado con tests**: `escapeHtml` cubre los 5 caracteres peligrosos (`& < > " '`). El test de attribute breakout en `ctaUrl` confirma que `" onmouseover="bad` no produce un atributo real en el DOM — validado con `happy-dom`.

---

## [0.9.0] — 2026-08-03

### Added (nuevo)
- **`site/assets/data/plandemismo-actualidad.json`**: inventario de los 9 vídeos de la pestaña Actualidad. Cada entrada incluye `id`, `country`, `year`, `tags`, `category`, `title`, `desc`, `langs`, `subtitlesFr`, `ctaUrl`, `ctaPlaceholder`.
- **`site/assets/data/plandemismo-sida-covid.json`**: inventario del documental destacado "ELISA MATO A RUTH" con campos adicionales (`keypoints`, `featured`, `cornerLabel`, `idAlt`).
- **`site/assets/{data,subtitles,audios,transcripts}/.gitkeep`**: estructura de carpetas `assets/` versionada — ya no desaparece tras `git clone`.
- **`// @ts-check`** en `main.js` y `plandemismo.js`: activa inferencia de tipos de TypeScript en el editor sin ningún paso de build ni `tsconfig.json`.

### Changed (cambiado)
- **`site/js/plandemismo.js` — refactor completo (A-3 + B-4 + #22)**:
  - Añadido guard de página: `if (document.body.dataset.page !== 'plandemismo') return` — el script se auto-limita al HTML que lo necesita.
  - Nueva función `renderVideoCards(jsonPath, gridId)`: hace `fetch` al JSON correspondiente, construye el DOM de cada tarjeta y lo inyecta en el grid. Añadir un vídeo nuevo = editar el JSON, sin tocar HTML.
  - Funciones auxiliares `buildLangs()` y `buildKeypoints()` para mantener el render limpio y sin repetición.
  - Todo el código anterior de tabs (WAI-ARIA, roving tabindex, ←/→/Home/End) conservado íntegramente.
  - JSDoc `@param`/`@type` en todas las funciones para aprovechar el `// @ts-check`.
- **`site/plandemismo.html` — reducido de ~360 a ~90 líneas (A-3)**:
  - Los 10 bloques `<article class="video-card">` hardcodeados eliminados.
  - Sustituidos por dos grids vacíos (`#grid-actualidad`, `#grid-sida-covid`) con `<noscript>` fallback.
  - `<body data-page="plandemismo">` añadido para el guard de JS (B-4).
- **`site/index.html` — bloque de config de URLs (A-2)**:
  - Añadido comentario-bloque al inicio del `<body>` listando las 7 URLs de la red Kilombo con instrucción de mantenerlo sincronizado con `.env.example`.
- **`sync-to-production.sh` — validación pre-deploy (B-5)**:
  - Nuevo bloque de pre-flight antes del prompt `PROD`: verifica que `KILOMBOTOP_PASSWORD` esté configurado, que `rsync` o `scp` estén disponibles, y avisa si `sshpass` no está instalado.
- **`plandemismo.html` — TODOs en CTAs (A-2 parcial)**:
  - Cada enlace "Ver en tv.canal7salta.com" tiene un comentario `<!-- TODO (A-2): reemplazar href por URL real del vídeo {id} -->` hasta que se obtengan las URLs reales de Canal7.

### Fixed (corregido)
- **README.md**: sección 02 corregida de "2 ediciones por idioma" a "tarjeta bilingüe ES/FR"; árbol de archivos actualizado con descripción correcta de `plandemismo.js` y estado real de `assets/`; URL Serveo actualizada; "Próximos pasos" sincronizados con el estado real del proyecto; ejemplo `scp` manual corregido (`site/*` → `site/.`).
- **ROADMAP.md**: pasos 1.2, 1.3, 2.1–2.5 marcados como completados; tabla resumen de prioridad actualizada con estado real de cada bloque.

---

## [0.8.0] — 2026-08-03

> Versión de saneamiento completo: auditoría TO_FIX.md cerrada al 100% (10/10 items).
> 5 bugs rojos + 5 inconsistencias amarillas resueltas. Mejora importante de
> accesibilidad (tablist WAI-ARIA) y consistencia de datos.

### Fixed (corregido — 5 bugs rojos cerrados)

- **Bug #2 · Rutas de subtítulos `.vtt` rotas** (`plandemismo.html`): 4 vídeos (IDs 167, 1111, 2250, 2252) tenían `data-subtitles-fr="subtitles/…"` → corregido a `assets/subtitles/…` conforme a la estructura documentada en ROADMAP.
- **Bug #4 · Navegación flechas ←/→ faltante en tabs** (`site/js/plandemismo.js`): implementado patrón **WAI-ARIA tablist completo** con roving tabindex. Teclas soportadas: `←` / `→` cambian foco entre tabs habilitadas, `Home` / `End` saltan a la primera / última, `Enter` / `Espacio` activan la tab enfocada. Las pestañas con `aria-disabled="true"` (Históricos) se saltan automáticamente en el ciclo.
- **Bug #5 · Fallback `scp` en deploy a ruta incorrecta** (`sync-to-production.sh`): ya corregido en línea — usa `"${SITE_DIR}/."` (con punto final) en vez de `"${SOURCE}"` con trailing slash, garantizando que se copian los *contenidos* de `site/` directamente en `REMOTE_PATH` sin crear `REMOTE_PATH/site/`.
- **Bug #13 · Atributos `data-subtitles-en` muertos** (`plandemismo.html`): eliminados de todas las tarjetas de vídeo. No había lógica CSS/JS que los leyera; se documenta que, si se implementan subtítulos EN en el futuro, hay que añadir el atributo + un chip de idioma equivalente a la pila FR.
- **Bug #14 · Gaps de accesibilidad ARIA en el tablist** (`plandemismo.html` + `plandemismo.js`):
  - ✅ `aria-controls` y `aria-labelledby` ya cruzados correctamente entre cada `role="tab"` y su `role="tabpanel"`.
  - ✅ Pestaña "Históricos" ya **no usa `disabled` nativo**. Reemplazado por `aria-disabled="true"` + `tabindex="-1"` — permanece en el DOM y en el orden de enfoque del roving tabindex pero no es activable, cumpliendo el patrón ARIA.
  - ✅ Nueva función `activateTab()` en JS retorna temprano si `aria-disabled="true"`.

### Changed (cambiado — 5 inconsistencias amarillas resueltas)

- **#6 · Tarjetas PI duplicadas apuntando a la misma URL** (`index.html`): confirmado vía `.env.example` (`KILOMBO_SITE_PI_LANGS=es,fr`) y búsqueda DNS que sólo existe *un* dominio PI bilingüe (`proletariosinternacionalistas.kilombo.top`), típico SPIP con selector de idioma interno. Las 2 tarjetas separadas (ES / FR) se **fusionaron en 1 tarjeta destacada** con:
  - Clase `card--lang-multi card--featured` (cabecera multi-idioma morada + estilo destacado).
  - Etiqueta de idioma `Español · Français`.
  - Título bilingüe `Proletarios Internacionalistas / Prolétaires Internationalistes`.
  - 2 chips de idioma independientes: `[ES]` + `[FR]` (negro/blanco).
  - Descripción que explica que el sitio tiene selector de idioma interno.
- **#11 · `page-lead` centrado vs. contenido a ancho completo** (`css/plandemismo.css`): la introducción tenía `max-width: 80ch; margin: 0 auto`, creando un salto de alineación brusco con `tabs` y `video-grid` inferiores. Corregido a `max-width: 100%; margin: 0 0 2.5rem` — mismo ancho que el resto del contenido dentro del `.container` (1200px máx.), conservando fondo `paper-alt` + borde izquierdo rojo distintivo.
- **#15 · Tipografía documentada ≠ tipografía real** (`README.md`): tabla "Paleta y diseño" actualizada de `Georgia / Times New Roman` a `Verdana, Arial, Helvetica, sans-serif` con la nota `(alineada con SPIP Escal 5.2.9 de producción)`, cerrando la desactualización de docs desde el cambio de fuentes de v0.7.0.
- **#16 · Carpetas `assets/*` descritas como pobladas pero vacías** (`README.md`): línea `assets/` del árbol de archivos documentada ahora como `(vacío — scaffolding pendiente de poblar)`. Las 4 subcarpetas (`data/`, `subtitles/`, `audios/`, `transcripts/`) mantienen su propósito descrito pero se indica explícitamente que aún no tienen contenido.
- **#17 · Contradicción `repo/` entre README y `.gitignore`** (`README.md` + `.gitignore`): eliminada la línea `├── repo/ ← Repositorio GitHub (solo docs en este momento)` del árbol de archivos en el README. Coincide ahora con `.gitignore`, que marca `repo/` como *"Old nested clone from initial setup (redundant)"* y la excluye del versionado.

### TO_FIX.md actualizado

- Todos los 10 items (5 🔴 + 5 🟡) marcados `[x]`.
- Añadida columna **Estado** en la tabla resumen final: `✅ FIXED` para los 8 corregidos en esta sesión, `✅ FIXED` (ya estaba) para #5 y #13.
- Añadida fecha `Última actualización: 2026-08-03` en la cabecera.
- Los 2 items (#6, #11) que requerían confirmación con cliente se resolvieron con decisión de producto razonada (1 tarjeta bilingüe, page-lead al ancho) y documentadas como reversibles si el cliente prefiere la otra opción.

---

## [0.7.0] — 2026-08-03

### Added (nuevo)
- **`TROUBLESHOOTING.md`**: diagnóstico completo del intento de conexión al servidor `kilombo.top`. Documenta: estado de puertos (22 cerrado, 80/443 abiertos), infraestructura YunoHost detectada (6 apps, sin app para el dominio raíz), fallos de autenticación con todas las combinaciones probadas, y 4 opciones de resolución con checklist de próximos pasos.

### Changed (cambiado)
- **Tipografía del portal** alineada con `kilombo.top`: se reemplaza la pila Georgia/Times New Roman (editorial) por `Verdana, Arial, Helvetica, sans-serif`, que es la pila exacta que usa el servidor SPIP de producción (`cssdyn-config_css` de Escal 5.2.9). Los elementos monoespaciados (chips, etiquetas, CTA) pasan a `'Courier New', 'Lucida Console', monospace` con fallback explícito. Afecta a `style.css` y `plandemismo.css`.
- **Preview Serveo relanzado**: nueva URL pública activa: `https://b795d3c3f8bbbf7c-190-132-104-107.serveousercontent.com`. `.env` actualizado con `PREVIEW_PUBLIC_URL`.

---

## [0.6.0] — 2026-08-03

### Added (nuevo)
- **`TO_FIX.md`**: auditoría completa de bugs e inconsistencias detectados. 5 bugs rojos y 7 inconsistencias amarillas, cada uno con descripción, archivo afectado y fix propuesto. Checkboxes para seguimiento.

### Fixed (corregido)
- **`plandemismo.css` — `.warning-block`**: `margin-top: 1.5rem 0 0` (shorthand inválido) → `margin: 1.5rem 0 0`.
- **`style.css` — `.cards-grid--featured`**: clase usada en `index.html` (secciones Tierra y Libertad y Nuevo Orden Mundial) pero nunca definida. Añadida regla `grid-template-columns: 1fr` para forzar columna única en tarjetas destacadas.
- **`plandemismo.css` — cabecera de dependencias**: añadido comentario de bloque documentando todas las variables CSS de `style.css` de las que depende esta hoja (`--paper`, `--rule`, `--lang-*`, etc.), y nota explícita sobre la equivalencia entre `--plandem-red` y `--red-dark`.
- **`main.js`**: selector cambiado de `.card` a `.card:not(a)` — elimina la adición redundante de `tabindex="0"` y listeners de teclado a elementos `<a>` que ya son focusables de forma nativa.
- **`index.html` — typo**: "plataforms" → "plataformas" en el tagline de la sección GCI.
- **`start-preview.sh` — alias Serveo**: eliminado el alias nombrado `kilombo-preview` (requería cuenta en serveo.net para funcionar). El túnel ahora usa `-R 80:localhost:PORT` sin alias, comportamiento consistente para todos los usuarios.

---

## [0.5.0] — 2026-08-03

### Added (nuevo)
- **README → Sección "Sitios espejo, referencias y redes de Kilombo analizadas"**: tabla con el prototipo Replit (`kilombo-redesign--ukoquique.replit.app`) y los 6 sitios reales de la red YunoHost (Tierra y Libertad, GCI oficial, P.I., ICR inglés, ICG-old, CD-Rom), con idiomas, estado y función.
- **README → Sección "Sobre el contenido y las fuentes"**: explicita la relación de amistad política con espacios aliados (p. ej. Canal7 Salta TV), enumera los 4 principios respecto a fuentes (selección por línea, no filtrado de calidad, re-presentación ordenada, traducción, enlace SIEMPRE al origen).
- **Nuevo `CHANGELOG.md`**: este archivo.

### Changed (cambiado)
- **Tono en plandemismo.html, index.html y ROADMAP.md**: se elimina todo lenguaje de "curación" que podía ofender a espacios amigos. "Archivo curado" → "Recopilación de materiales compartidos por nuestros compañeros"; "criterios de curación" → "criterios de selección y estructura"; "nota de curación" → "criterio de presentación".
- **Tarjeta sección 03 (index.html)**: ya no enlaza a `www.kilombo.top` externo, sino internamente a `plandemismo.html`. Descripción actualizada y tags nuevos: `Videos Canal7`, `SIDA→COVID`.

---

## [0.4.0] — 2026-08-03

### Added (nuevo)
- **`.env` reformateado**: archivo estándar `KEY=VALUE` con secciones comentadas para GitHub, servidor YunoHost y credencial futura.
- **`.env.example`**: plantilla sin credenciales reales, lista para subir al repositorio público.
- **`start-preview.sh`** (ejecutable): arranca servidor local + túnel HTTPS Serveo en 1 paso. Imprime URLs local y pública para el cliente.
- **`sync-to-production.sh`** (ejecutable): sube TODO `./site/` 1:1 a `kilombo.top` por rsync (o scp), leyendo credenciales del `.env` y pidiendo confirmación `PROD`.
- **Subcarpetas `site/assets/`**: `data/`, `subtitles/`, `audios/`, `transcripts/` para inventarios JSON, subtítulos `.vtt`, MP3 y transcripciones con timestamps.
- **README → Sección "Mostrar avances al cliente"** y **"Subida a producción real"**: explica el flujo preview → producción 1:1.
- **URL preview pública activa (Serveo)**: `https://3e52f2a4e4aae552-179-29-35-153.serveousercontent.com`

---

## [0.3.0] — 2026-08-03

### Added (nuevo)
- **Página `plandemismo.html`**: sección 03 propia, independiente del índice, con:
  - 3 **pestañas (tabs)**: 01 Actualidad (activa por defecto) / 02 SIDA → COVID (Antecesores) / 03 Históricos (deshabilitada, "Próximamente").
  - **Lote 1 — Actualidad**: 9 videos de Canal7 Salta, **sin Chinda Brandolino** (cumpliendo criterio del cliente). Incluyen: "2020 el año del miedo", Analía Álvarez, APSIIN Chile, 100.000 médicos, Dr. Martínez, Dr. Monteverde (niños), Dr. David Martin Parlamento Europeo, Dra. Stückelberger (OMS), Dr. Yeadon ex-Pfizer.
  - **Lote 2 — SIDA→COVID**: documental **"ELISA MATO A RUTH" (España 2018, ID 167/1201)** en tarjeta GRANDE destacada, con el texto íntegro del cliente sobre "montaje SIDA antecesor de COVID", "del genocidio SIDA al humanicidio COVID", "víctimas atrapadas en los nada fiables test", keypoints y badge de subtítulos FR prioritarios ★★★.
  - Cada tarjeta lleva `data-subtitles-fr` / `data-subtitles-en` (estructura lista para enchufar `.vtt`).
  - Chips de idioma con 3 niveles de subtítulos FR: `pendiente` / `a subtitular ★` / `prioritarios ★★★`.
- **`css/plandemismo.css`**: paleta rojo oscuro NOM (`#8b0000`), miniaturas con botón play, chips de idioma coloreados, efecto pulse en "a subtitular", tab nav con subrayado activo, blockquote `warning-block` para la intro SIDA→COVID.
- **`js/plandemismo.js`**: navegación por tabs (click + teclado), focus + Enter/Space en tarjetas.

---

## [0.2.0] — 2026-08-03

### Added (nuevo)
- **ROADMAP.md técnico** (Pasos 1–11):
  1.  Flujo de subida / deploy
  2.  Videos Canal7 (Actualidad + SIDA→COVID + Históricos después, sin Chinda, subtítulos FR `.vtt`)
  3.  Transcripción audios de WhatsApp (inventario → MP3 normalizado → Whisper + corrección manual → página `audios-historicos.html`)
  4.  Contenido editorial por sección
  5.  **Traducciones / puesta al día de idiomas** (déficit GCI ES→FR, flujo DeepL + corrección humana obligatoria, regla "no publicar unilíngüe a partir de ahora")
  6.  Organización por idiomas en cada sección
  7–9. Revisión diseño, SEO, despliegue final
  10–11. Rutinas de actualización + monitoreo
- **Tabla "Resumen de prioridad"** al final de ROADMAP.md con tiempos estimados por bloque.

---

## [0.1.0] — 2026-08-03

### Added (nuevo)
- **Estructura inicial del proyecto local** en `site/`:
  - `index.html` — portal central con **4 secciones en orden de prioridad**:
    1.  ⭐ **Espacio Tierra y Libertad** (destacada: fondo tintado, barra roja superior, "Sección destacada", intro, tarjeta grande ES)
    2.  **01 GCI** — 4 tarjetas: Sitio Oficial ES/EN/FR, International Global Revolution (EN), CD-Rom (fondo rayado "archivo"), ICG Sitio Histórico "legado"
    3.  **02 Proletarios Internacionalistas** — 2 tarjetas lado a lado: ES + FR
    4.  **03 Nuevo Orden Mundial: plandemismo y domesticación** — tarjeta temática con borde izquierdo rojo oscuro
  - `css/style.css` — paleta papel + tinta + rojo revolucionario (`#f5f2eb / #0a0a0a / #c1121f`), Georgia editorial + Courier New mono para metadata, códigos de color por idioma (ES verde, FR azul, EN púrpura, Multi morado), status badges Activo / Archivo / Legado, tarjetas con sombra hover, fully responsive.
  - `js/main.js` — accesibilidad: tab + Enter/Espacio activan tarjetas.
- **README.md inicial** (versión 0.1): estructura del portal en 4 secciones, árbol de archivos, convenciones (IA-inglés vs. contenido-español), servidor local Python, paleta, próximos pasos.
- **Inventario inicial de la red**: documento ya presente en `INICIO/inventario-inicial-kilombo.md` (7 sitios detectados + priorización), `INICIO/pasos-trabajo-kilombo.md` (trabajo con/sin credenciales), `INICIO/ROADMAP.md` (5 fases: Diagnóstico → Clasificación → Preparación → Publicación → Mantenimiento).
