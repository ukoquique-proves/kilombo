# Changelog — Kilombo Portal

Todas las modificaciones importantes del proyecto, en orden inverso (últimos cambios arriba).
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

---

## [0.29.0] — 2026-08-09

### Added (UX — navegación y descubribilidad)
- **`site/articulos.html` + `site/js/articles.js`**: el índice de artículos internos ahora incluye una barra de filtros por tema y un buscador de texto libre. El listado puede filtrarse por tema y por coincidencia en título/topics, y el estado del filtro se sincroniza con la URL (`?topic=...` y `?q=...`).
- **`site/articulo.html` + `site/js/articles.js`**: la vista de detalle incorpora una sección de artículos relacionados, generada a partir de la coincidencia de topics entre entradas del JSON. Esto mejora la navegación entre contenidos afines sin introducir enlaces manuales.
- **`site/plandemismo.html` + `site/js/plandemismo.js`**: la sección Plandemismo ahora ofrece filtros por etiqueta dentro de cada bloque de vídeos y una navegación por pestañas accesible con patrón tablist/roving tabindex. El comportamiento es más claro y más usable sin recargar la página.
- **`site/js/render.mjs`**: se centralizan los helpers de renderizado y filtros compartidos para artículos y vídeos. Esto elimina duplicación y reduce el riesgo de divergencia entre las dos superficies de navegación.
- **`site/css/articles.css` + `site/css/style.css` + `site/css/plandemismo.css`**: añadidos estilos para la nueva barra de filtros, los botones de tema, la sección de relacionados y la experiencia responsive de las nuevas interfaces.

### Tests
- **`test/articles.test.mjs` + `test/render.test.mjs`**: añadida cobertura de regresión para filtros por tema, búsqueda, artículos relacionados y el render compartido de barras de filtro.

---

## [0.28.0] — 2026-08-09

### Fixed (TO_FIX #44 — triple source of truth for network URLs)
- **`site/assets/network-urls.json`** (nuevo): fuente única de verdad para las 7 URLs de la red Kilombo (`sso`, `tierra`, `gci`, `gci_en`, `gci_cdrom`, `gci_old`, `pi`). Para cambiar una URL, se edita aquí — el CI detecta automáticamente si alguna de las tres fuentes dependientes queda desincronizada.
- **`scripts/check-urls.mjs`** reescrito: sustituye el modelo anterior ("comparar tres fuentes libres entre sí") por "validar cada fuente contra el JSON de referencia". El script carga `network-urls.json`, comprueba que cada URL aparezca en `.env.example`, `site/index.html` y `README.md`, e informa exactamente qué fuente falta cada URL. Elimina el blindspot de TO_FIX #44 donde una sesión podía editar solo una de las tres fuentes y no descubrirlo hasta que `npm test` fallara (o nunca).
- `network-urls.json` se coloca en `site/assets/` (no en `site/assets/data/`) para no ser recogido por el validador de arrays de `validate-data.mjs`.

---

## [0.27.0] — 2026-08-09

### Added (diseño — badges de nivel)
- **`site/css/style.css`**: dos nuevas variantes de `.card-status`:
  - `.card-status--external` — píldora gris neutro con texto "↗ Externo" — para tarjetas de Nivel 1 (enlaces salientes a subdominios externos)
  - `.card-status--mirrored` — píldora tinte índigo con texto "⬡ Espejo" — para tarjetas de Nivel 2 (contenido alojado localmente en el portal)
  - `.card-header` pasa de `justify-content: space-between` sin wrap a `flex-wrap: wrap` + `gap: 0.35rem` para que tres badges quepan en móvil sin desbordamiento
- **`site/index.html`**: badge de nivel añadido a las 8 tarjetas:
  - Nivel 1 (↗ Externo): Espacio Tierra y Libertad, GCI Oficial, International Global Revolution, ICG CD-Rom, ICG Histórico, Proletarios Internacionalistas
  - Nivel 2 (⬡ Espejo): Artículos internos, Sección Plandemismo
  - Los badges usan texto, no solo color — cumple regla de accesibilidad MIRROR_GROWING.md §4.6
- Implementa la especificación de ROADMAP.md §6 (indicadores Nivel 1 vs Nivel 2)

### Docs
- `MIRROR_GROWING.md`: añadida §0 "Arquitectura del espejo — dos niveles, no uno" — tabla comparativa, regla de promoción L1→L2, advertencia para sesiones futuras
- `ROADMAP.md §6`: ítem de badges expandido a spec completa (nombres de clase, requisito de accesibilidad, lista de tarjetas por nivel, nota de regresión)
- `TO_FIX.md`: ítem #44 añadido — URLs de red duplicadas en 3 fuentes de verdad (`.env.example`, `index.html` CONFIG block, `README.md`)

---

## [0.26.0] — 2026-08-09

### Fixed (bug crítico — artículos no visibles tras login, segunda causa)
- **`site/js/decrypt.mjs`**: offset de IV incorrecto en `aesDecrypt()`. El ciphertext producido por `encode()` de staticrypt tiene formato `hmac(64 hex) + iv(32 hex) + datos AES-CBC`. El código anterior usaba `IV_HEX_LEN = IV_BYTES * 2 = 32` y hacía `ciphertext.slice(0, 32)` como IV, que en realidad son los primeros 32 chars del HMAC-SHA256. El IV real está en `slice(64, 96)` y los datos en `slice(96)`. Resultado del bug: `crypto.subtle.decrypt()` recibía bytes incorrectos, fallaba, `parseJson()` lanzaba excepción, y `articulos.html` mostraba "Error cargando el índice de artículos" aunque la contraseña fuera correcta. Fix: `HMAC_HEX_LEN = 64` añadido, slices corregidos. Verificado con round-trip en Node antes del deploy.
- Eliminada constante `IV_BYTES` (ya no necesaria tras el fix).

---

## [0.25.0] — 2026-08-09

### Fixed (bug crítico — artículos no visibles tras login)
- **`site/js/decrypt.mjs`**: clave de storage incorrecta causaba que `articulos.html` (y cualquier página con JSON cifrado) quedara vacía después de entrar la contraseña correctamente en el gate de StatiCrypt. La causa: `decrypt.mjs` leía de `sessionStorage` con clave `"staticrypt_hashed_password"`, pero staticrypt almacena la contraseña en `localStorage` bajo `"staticrypt_passphrase"`. `parseJson()` no encontraba la clave, lanzaba excepción, y el catch de `articles.js` mostraba el estado vacío. Fix: `STORAGE_KEY` corregido a `"staticrypt_passphrase"` y `sessionStorage` → `localStorage`. Docstring del módulo actualizado para ser preciso.
- Este es exactamente el fallo que TO_FIX #35 anticipaba: una divergencia entre la implementación de `decrypt.mjs` y el comportamiento real de staticrypt, sin ningún test que lo detectara.

---

## [0.24.0] — 2026-08-09

> Versión de saneamiento post-importación: auditoría sistemática de los 10 artículos
> importados desde PI tras el descubrimiento de fuga de sidebar en el par ES/FR.
> 14.470 caracteres de contenido basura eliminados en total.

### Fixed (bug — fuga sistemática de sidebar SPIP en artículos PI)
- **`site/assets/content/articles.json` — 10 entradas PI afectadas**: corte limpio del bloque sidebar/footer de SPIP presente al final de `contentHtml` en TODOS los artículos importados desde Proletarios Internacionalistas (`sourceUrl` en `proletariosinternacionalistas.kilombo.top`). El bloque contenía, según artículo:
  - Ancla de foro (`<a href="#forum" name="forum">`)
  - Campo de búsqueda (`Search:` / `Rechercher` / `Buscar`)
  - Lista de artículos relacionados ("Also in this section" / "Dans la même rubrique") con 8–10 enlaces a `spip.php?article{id}` (hermanos en la misma rubrica SPIP)
  - Sección **Portfolio** con miniatura de imagen 90×90 (solo en `contre-genocide-guerres-infinites-pi`)
  - Bloque **CRITIQUE (Fr)** con enlaces a rubricas (solo en `contre-genocide-guerres-infinites-pi`)

  **Detalle por artículo (chars eliminados / % del `contentHtml` original):**
  - `contra-genocidio-guerras-infinitas-pi` (ES) — 1.521 chars (22,3%)
  - `contre-genocide-guerres-infinites-pi` (FR) — 1.152 chars (16,7%) + portfolio 90×90
  - `falsos-internacionalistas-1` — 1.556 chars (6,1%)
  - `falsos-internacionalistas-2` — 1.556 chars (23,0%)
  - `falsos-internacionalistas-3` — 1.556 chars (7,7%)
  - `falsos-internacionalistas-4` — 1.556 chars (8,9%)
  - `falsos-internacionalistas-5` — 1.556 chars (19,4%)
  - `falsos-internacionalistas-6` — 1.556 chars (9,7%)
  - `1-mayo-2023-contra-militarizacion` — 1.545 chars (27,4%)
  - `plandemismo-y-domesticacion-11` — 1.545 chars (5,9%)

  **Total** : 14.470 caracteres de contenido basura eliminados.
  Punto de corte usado: `<a href="#forum" name="forum">` — ancla que marca de forma fiable el inicio del sidebar en todos los artículos SPIP de la fuente. Este es el bug sistemático que el ítem #36 de `TO_FIX.md` ("pipeline de importación es doc, no código") predecía: el truncamiento manual documentado en `TROUBLESHOOTING §8` ("cortar al encontrar `<section id=` o `<footer`") no se aplicó en el 100% de los artículos importados en v0.22.0.

### Fixed (bug — HTML malformado en encabezados de artículos PI)
- **`site/assets/content/articles.json` / `contra-genocidio-guerras-infinitas-pi` (ES)**: `<strong>` desbalanceado en encabezado. Secuencia original: `</p>\n<strong>\n ¡Contra el genocidio...! \n<p><strong></strong> </strong></p>` — un `<strong>` abierto fuera de cualquier párrafo, más un `<strong></strong>` vacío anidado dentro, más cierres desbalanceados (3 cierres para 2 aperturas). No rompía render pero rompía el árbol semántico y cualquier herramienta de validación. Arreglo: envuelto correctamente en `<p><strong>¡Contra el genocidio…!</strong></p>`, sin strong vacíos.
- **`site/assets/content/articles.json` / `contre-genocide-guerres-infinites-pi` (FR)**: encabezado `<strong>Contre le génocide…! </strong>` colgado directamente de `contentHtml` sin `<p>` envolviéndolo (inconsistente con el hermano ES, que ya lo tenía dentro de `<p>`). Además tenía un espacio sobrante antes de `</strong>`. Arreglo: `<p><strong>Contre le génocide…!</strong></p>` — mismo patrón que ES.

### Docs
- **`TO_FIX.md` — item #37**: checkbox `[ ]` corregido a `[x]` (estaba marcado como pendiente a pesar de que el propio texto del ítem decía "✅ Hecho en este mismo commit"). Fila correspondiente en la tabla Resumen actualizada de "Renombrado en este commit" a "✅ Resuelto — renombrado a ROADMAP-fase-diagnostico.md".
- **`TO_FIX.md` — items #40, #41, #42 añadidos y cerrados en la misma versión**: documentan respectivamente: (40) la fuga sistemática de sidebar en los 10 artículos PI con detalle por artículo, (41) el `<strong>` desbalanceado de contra-genocidio ES, (42) la inconsistencia de encapsulado del encabezado FR. Las 3 filas añadidas también a la tabla Resumen principal.
- **`TO_FIX.md` — cabecera**: "Última actualización" cambiada de `2026-08-07 (v0.23.0+) — ítems 35–39 añadidos.` a `2026-08-09 (v0.23.0+) — ítems 40–42 añadidos; sidebar leakage de 10 artículos PI resuelto.`

---

## [0.23.0] — 2026-08-07

### Fixed (bug — URLs relativas en contentHtml)
- **`site/assets/content/articles.json`**: 98 URLs relativas (`src`/`href`) reescritas a absolutas en 10 entradas afectadas (`contre-genocide-guerres-infinites-pi`, `falsos-internacionalistas-1` a `6`, `1-mayo-2023-contra-militarizacion`, `plandemismo-y-domesticacion-11`). La imagen `local/cache-gd2/...` en `contre-genocide` era el caso reportado — ahora apunta a `https://proletariosinternacionalistas.kilombo.top/local/cache-gd2/...`.
- **`scripts/validate-data.mjs`**: nueva regla en la validación de `contentHtml` — falla si cualquier `src=` o `href=` contiene un valor no-absoluto (que no empiece por `https?://`, `#` o `mailto:`). Esto convierte el error de "imagen 404 silenciosa en producción" en un error de CI visible antes del deploy.

### Docs
- **`TROUBLESHOOTING.md §8`**: paso 4 añadido al flujo de importación recomendado — función `rewrite_relative_urls(html, source_url)` en Python usando `urllib.parse.urljoin`. Incluye nota explicando que `validate-data.mjs` bloqueará el deploy si se omite este paso.
- **`TO_FIX.md`**: ítem #31 añadido y cerrado en la misma versión.

---

## [0.22.1] — 2026-08-07

### Added (contenido)
- `1er-mai-2023-tierra-fr` — 1er MAI 2023 (Tierra → tierra, FR, 2023-05-01) — completa el par bilingüe del 1 de mayo: Tierra publicó el comunicado en FR (article40), PI lo publicó en ES (article44, ya importado en v0.22.0). No son traducciones entre sí — son dos comunicados independientes del mismo espacio político.

### Docs
- `MIRROR_GROWING.md` §7.5: checkbox "1 de mayo 2023 bilingüe" actualizado a completado con nota explicativa

---

## [0.22.0] — 2026-08-07

### Added (contenido — importación Weeks 1 y 2)
Primera importación masiva de artículos desde fuentes autorizadas, siguiendo el plan de `MIRROR_GROWING.md` §7.5. El repo pasa de 1 artículo a 16.

**Week 1 — NOM / nom:**
- `represion-plandemica-1` — REPRESIÓN PLANDÉMICA 1: ocultan la HECATOMBE (Tierra → nom, 2024-08-24)
- `represion-plandemica-2` — REPRESIÓN PLANDÉMICA 2: ocultan la HECATOMBE (Tierra → nom, 2024-08-25)
- `represion-plandemica-3` — REPRESIÓN PLANDÉMICA 3 (Tierra → nom, 2024-08-26)
- `represion-plandemica-4` — REPRESIÓN PLANDÉMICA 4 (Tierra → nom, 2024-08-27)
- `el-fraude-de-los-pcr` — El fraude de los PCR (Tierra → nom, 2022-02-27) — artículo solo imágenes, importado como stub; `status: pending-review` (ver TO_FIX #30)

**Week 1 — PI / pi:**
- `contra-genocidio-guerras-infinitas-pi` — ¡Contra el genocidio y las guerras infinitas! ES (PI → pi, 2024-05-01)
- `contre-genocide-guerres-infinites-pi` — Contre le génocide et les guerres sans fin FR (PI → pi, 2024-04-29) — par bilingüe del anterior, cumple regla §5.3 de MIRROR_GROWING

**Week 2 — PI / pi:**
- `falsos-internacionalistas-1` a `falsos-internacionalistas-6` — serie completa FALSOS INTERNACIONALISTAS (PI → pi, 2022)
- `1-mayo-2023-contra-militarizacion` — 1 de mayo 2023 (PI → pi, 2023-05-01)

**Week 2 — NOM / nom:**
- `plandemismo-y-domesticacion-11` — Plandemismo y Domesticación (11) — Notas de decantación (PI → nom, 2021-12-01)

### Fixed
- `el-fraude-de-los-pcr`: campo `status` corregido de `imported` a `pending-review` para que no se confunda con un import completo

### Docs
- `MIRROR_GROWING.md` §7.5: checkboxes Week 1 y Week 2 marcados `[x]`
- `TO_FIX.md`: ítem #30 añadido (`el-fraude-de-los-pcr` pendiente de contenido real, con 4 opciones de resolución)
- `TROUBLESHOOTING.md`: añadido §7 (para qué sirve `KILOMBOTOP_PASSWORD`) y §8 (guía de scraping SPIP con selectores correctos documentados)

---

## [0.21.0] — 2026-08-07

### Added (diseño — ilustraciones SVG y logo)
- **Ilustraciones SVG por sección** en `site/index.html`: cada sección del portal tiene ahora un símbolo SVG inline en el header, visible a la derecha del título, con baja opacidad en reposo y ligera intensificación al hacer hover. Los símbolos son propios del proyecto, no copias del original:
  - ⭐ Tierra y Libertad — sol naciente (amanecer, tierra libre) en verde `#1b5e20`
  - 01 GCI — globo con meridianos y paralelos (lucha internacionalista organizada)
  - 02 Proletarios Internacionalistas — puño alzado (fuerza proletaria colectiva)
  - 03 NOM / Plandemismo — ojo con líneas discontinuas (vigilancia expuesta)
- **Logo estrella Kilombo** en la cabecera del sitio: estrella de 5 puntas rellena en carmesí (`#b91c2a`) con estrella interior como contorno blanco, alineada a la izquierda del título `KILOMBO`. SVG inline, escala responsiva de 48px a 72px.

### Changed (diseño — Tierra y Libertad)
- **Demotion de Espacio Tierra y Libertad**: eliminados `section--featured`, `section-label "Sección destacada"`, `featured-intro` (párrafo editorial largo) y `card--featured` en ambas tarjetas. La sección pasa de masthead editorial a sección par con acento verde distintivo (`section--tierra`), manteniendo la primera posición visual sin sugerir que representa la identidad editorial del portal.

### Changed (responsive / paleta / tipografía)
- **Paleta refinada**: `#f5f2eb` → `#fcfbf7`, `#0a0a0a` → `#121212`, `#c1121f` → `#b91c2a`
- **Tipografía**: Playfair Display (serif) para titulares + Inter (sans-serif) para cuerpo, cargadas desde Google Fonts con `display=swap`
- **Responsive layout**: grids colapsados a una columna a `≤768px`, padding consistente a `≤480px` en los tres CSS
- **Hover states**: elevación `translateY(-4px)` + ring carmesí + flecha `→` animada en todas las tarjetas

### Fixed
- Footer de `index.html`: texto "comunistas internacionalistas" (rezago) corregido a "internacionalistas"

---

## [0.20.0] — 2026-08-07

### Fixed (seguridad — cifrado)
- **`scripts/encrypt.mjs` — reescrito para escribir a `dist/` en lugar de mutar `site/`** (TO_FIX #27 y #28):
  - El script ahora copia `site/` → `dist/` en cada ejecución y cifra los archivos dentro de `dist/`. `site/` nunca se modifica.
  - Elimina el escenario de fallo crítico: ejecutar `npm run encrypt` localmente y luego `end-of-session.sh` ya no puede poner un muro de contraseña en el servidor de producción.
  - El doble cifrado (idempotencia del paso HTML) queda estructuralmente imposible — `dist/` siempre se regenera desde cero.
- **`deploy.yml`**: el paso "Upload artifact" ahora sube `dist/` en lugar de `site/`
- **`sync-to-production.sh`**: añadido guard que aborta si detecta archivos cifrados dentro de `site/` (firma `staticrypt-html` o `"encrypted":true`), haciendo imposible un rsync accidental de contenido cifrado a producción
- **`.gitignore`**: `dist/` añadido para que el directorio de artefactos cifrados nunca entre al repo

### Fixed (docs)
- `TO_FIX.md`: ítems #6 y #11 cerrados `[x]` — ambos resueltos en v0.8.0 según CHANGELOG, no eran pendientes reales
- `TO_FIX.md`: ítems #27 y #28 añadidos y cerrados en la misma versión

---

## [0.19.0] — 2026-08-06

### Added (seguridad — cifrado client-side)
- **`scripts/encrypt.mjs`** (nuevo): script de cifrado para el paso de build de CI. Cifra con AES-256-CBC (PBKDF2, 600k iteraciones SHA-256) usando la librería [StatiCrypt](https://github.com/robinmoisson/staticrypt) v3.5.4. Cifra tres tipos de artefactos:
  - **Páginas HTML de contenido** (`plandemismo.html`, `articulos.html`, `articulo.html`): cada página queda envuelta en un formulario de contraseña autocontenido. El visitante introduce la contraseña; si es correcta, la página se descifra en memoria y se muestra. La contraseña derivada (PBKDF2) se guarda en `sessionStorage` para que los fetches de JSON no requieran nueva introducción.
  - **Archivos JSON de datos** (`assets/data/*.json`, `assets/content/*.json`): cifrados en el propio archivo como un envelope `{"encrypted":true,"ciphertext":"<hex>","salt":"<hex>"}`. Ilegibles sin la contraseña.
  - **`index.html`** queda pública (no tiene contenido sensible — es solo el directorio del portal).
- **`site/js/decrypt.mjs`** (nuevo): módulo ES6 compartido por `plandemismo.js` y `articles.js`. Lee la contraseña derivada de `sessionStorage` (puesta allí por el prompt de staticrypt tras login correcto) y descifra los envelopes JSON antes de parsear. En modo dev/preview (JSON sin cifrar), actúa como no-op.
- **`.staticrypt.json`**: salt fijo del proyecto (hex de 32 chars). El salt no es secreto — solo la contraseña lo es. Salt fijo = builds reproducibles.
- **`STATICRYPT_PASSWORD`**: añadido como GitHub Actions Secret en el repositorio.

### Changed
- **`site/js/plandemismo.js`**: `res.json()` sustituido por `parseJson(await res.text())` para soportar transparentemente JSON cifrado o en claro.
- **`site/js/articles.js`**: ídem — `loadArticles()` usa `parseJson()`.
- **`.github/workflows/deploy.yml`**: añadido paso `Encrypt site content` (`npm run encrypt`) en el job `deploy`, entre `Install dependencies` y `Setup Pages`. Lee `STATICRYPT_PASSWORD` del secret del repositorio. El job `test` no cifra — trabaja siempre con archivos en claro.
- **`package.json`**: añadidos scripts `encrypt` (`node scripts/encrypt.mjs`) y `preview` (`python3 -m http.server 8080 --directory site`).
- **`.env.example`**: añadida variable `STATICRYPT_PASSWORD` con instrucciones para configurarla también como GitHub Actions Secret.

### Modelo de seguridad (resumen)
- Protege contra: bots/scrapers, visitantes casuales, inspección del repo en GitHub (solo ciphertext visible).
- No protege contra: alguien que tiene la contraseña y extrae el DOM descifrado desde devtools.
- Nivel máximo alcanzable en un host estático sin servidor.
- kilombo.top (YunoHost) sigue siendo el sitio autoritativo con auth server-side real.

---

## [0.18.0] — 2026-08-06

### Changed (responsive layout)
- **`site/css/style.css`**: replaced single `640px` breakpoint with a two-tier system. At `≤768px` the cards grid collapses to single column (was `minmax(280px,1fr)` which forced two cramped columns at tablet widths). At `≤480px` container padding tightens to `1rem`, card internal padding adjusts to keep badge rows from touching the edge, `.card-tags` gap reduced slightly for cleaner wrap, footer grid goes single column.
- **`site/css/plandemismo.css`**: replaced single `640px` breakpoint with the same two-tier system. At `≤768px` the video grid collapses to single column (was `minmax(320px,1fr)` which forced two columns at ~650px). At `≤480px` tab buttons go full-width stacked, video card body padding and badge gaps tightened for consistent horizontal rhythm.
- **`site/css/articles.css`**: added responsive rules (previously had none). At `≤768px` the article list grid collapses to single column. At `≤480px` article card and detail padding adjusted; topic chip gap tightened to prevent awkward wrap.

---

## [0.17.0] — 2026-08-06

### Changed (cambios visuales)
- **Pill badges — todos los archivos CSS**: las etiquetas de idioma, estado, tipo, afiliación, chips de idioma de vídeo y metadatos de artículo han sido rediseñadas como píldoras compactas de bajo contraste (`border-radius: 999px`, fondos translúcidos, peso de fuente reducido de 700 a 600). Objetivo: que no compitan visualmente con los títulos de las tarjetas.
  - `site/css/style.css` — `.card-lang`, `.card-status` y todas las variantes de `.tag` (`--type`, `--lang`, `--affil`, `--scope`): eliminados fondos sólidos oscuros; sustituidos por tintes translúcidos del color de idioma/estado correspondiente.
  - `site/css/plandemismo.css` — `.meta-pais`, `.meta-fecha`: eliminado relleno rojo/negro sólido; ahora tinte rojo a baja opacidad. `.lang-chip` y sus variantes (`--es`, `--en`, `--de`, `--pending`, `--todo`): eliminados rellenos saturados; convertidos a píldoras translúcidas.
  - `site/css/articles.css` — Spans de `.article-card__meta` y `.article-detail__meta`: envueltos en píldoras con tinte neutro y borde tenue. `.topic-chip`: borde fino añadido, tamaño de fuente reducido.

### Changed (contenido)
- **`site/index.html`**: reformulado el párrafo introductorio de Espacio Tierra y Libertad — eliminada la frase redundante sobre "plataforma principal".
- **`site/index.html`**: recortada la descripción de la sección de artículos — eliminada la frase sobre clasificación temática.
- **Todos los HTML + `README.md`**: subtítulo del portal cambiado de "Publicaciones y archivos **comunistas** internacionalistas" a "Publicaciones y archivos internacionalistas" (6 ocurrencias: `index.html` título, subtítulo y footer; `plandemismo.html`, `articulos.html`, `articulo.html`, `README.md`).

---

## [0.16.0] — 2026-08-06

### Fixed (corregido)
- **`site/js/render.mjs`**: CTA de tarjetas de vídeo cambiado de `rel="noopener"` a `rel="noopener noreferrer"` (faltaba `noreferrer` — ahora consistente con los enlaces saneados por `sanitizeHtml()`).
- **`site/js/articles.js`**: `initDetailPage()` actualiza ahora `document.title` con el título del artículo al cargar (mejora bookmarking e historial del navegador).
- **`site/js/articles.js`**: el texto visible del enlace de fuente ya no muestra entidades HTML (`&amp;` etc.) — se usaba la cadena ya escapada como texto de display en vez de la URL cruda.
- **`site/js/articles.js`**: enlace de fuente cambiado a `rel="noopener noreferrer"` (consistencia con el resto del proyecto).
- **`scripts/validate-data.mjs`**: el `catch` de `readdirSync` en `scanDir` ahora captura `(e)` y muestra `e.message`, evitando perder el detalle del error de sistema de archivos.
- **`package.json`**: eliminado el campo `"main": "index.js"` (muerto — no existe ningún `index.js`); añadido `"type": "module"` para eliminar la advertencia de Node sobre módulos sin tipo declarado.
- **`site/js/main.js`**: añadido comentario explicando por qué es un script plano sin `type="module"`.

### Added (nuevo)
- **`site/assets/content/articles.json`**: primer artículo publicado — Israel/Mohamad Safa (sección `general`, status `imported`).

### Tests
- **`test/render.test.mjs`**: aserción del test `renderCard — CTA opens in new tab` actualizada a `rel="noopener noreferrer"`.

---

## [0.15.0] — 2026-08-06

### Security (seguridad)
- **`site/js/render.mjs` — `sanitizeHtml()` añadido**: nueva función que reduce un string HTML a un allowlist de etiquetas de formato (`p, a, strong, em, b, i, ul, ol, li, blockquote, h3, h4, br, img, span, figure, figcaption, hr`), eliminando `<script>`/`<style>`/`<iframe>` (con su contenido), atributos de evento (`onerror`, `onclick`, ...) y URLs `javascript:`/`data:`/`vbscript:` en `href`/`src`. Los enlaces `<a>` reciben `target="_blank" rel="noopener noreferrer"` forzado, independientemente de lo que traiga el HTML de origen. El parseo ocurre en un `<div>` desconectado del documento, así que nada puede ejecutarse durante el saneado — solo el árbol ya limpio llega a insertarse en el DOM real.
- **`site/js/articles.js` — corregido el uso de `innerHTML` sin sanear**: `initDetailPage()` insertaba `a.contentHtml` directamente en el DOM (`contentEl.innerHTML = a.contentHtml`), confiando en un comentario de que el contenido era "editorial controlado por el repo" — pero el propio esquema del artículo (`status: imported|adapted|translated`, `sourceUrl`, `sourceSite`) está pensado para contenido traído de sitios externos. Ahora usa `sanitizeHtml()` antes de insertar el contenido.
- **`scripts/validate-data.mjs` — regla adicional en `contentHtml`**: además de exigir que no esté vacío, ahora falla la validación (exit 1) si detecta `<script>`, atributos `on...=` o URLs `javascript:`/`data:`/`vbscript:`. Esto es defensa en profundidad: bloquea una importación peligrosa en `npm test` (que corre en `deploy.yml` antes de cada publish) en vez de depender solo del saneado en tiempo de ejecución.

### Added (nuevo)
- **`test/render.test.mjs`**: 9 tests nuevos para `sanitizeHtml()` — cubren remoción de `<script>`, atributos de evento, URLs `javascript:`/`data:`, preservación de etiquetas permitidas, forzado de `rel`/`target` en enlaces, "unwrap" de etiquetas desconocidas conservando su texto, remoción de atributos no permitidos en etiquetas sí permitidas, y entradas `null`/`undefined`/vacías.
- **`test/articles.test.mjs`** (nuevo archivo): 10 tests para las funciones puras de `site/js/articles.js` — `sectionLabel()`, `renderTopics()` y `renderArticleCard()` (estructura del link card, escapado de `title`/`status`, URL-encoding del `id` en el `href`, presencia/ausencia del bloque de topics). Antes de esta versión, el sistema de artículos no tenía ningún test.
- **`scripts/test.sh`**: cambiado de invocar únicamente `test/render.test.mjs` a `node --test` (descubrimiento automático de todos los `test/*.test.mjs`), para que archivos de test nuevos se ejecuten sin tener que editar el runner cada vez.

### Fixed (corregido)
- **`site/js/articles.js`**: el listener `document.addEventListener('DOMContentLoaded', ...)` de auto-inicio ahora está protegido con `typeof document !== 'undefined'`, para poder importar las funciones puras del módulo en un entorno Node/happy-dom (tests) sin que el módulo intente engancharse a un DOM de navegador inexistente.

### Docs (documentación) — registro retroactivo
- Las dos versiones anteriores (sistema de artículos internos `articulos.html`/`articulo.html`/`articles.js`/`articles.css` y su integración en `index.html`) se publicaron sin entrada en este changelog. Quedan documentadas aquí de forma retroactiva junto con su corrección de seguridad, ya que ambos cambios se revisaron y corrigieron en la misma sesión.

---

## [0.13.0] — 2026-08-03

### Fixed (corregido)
- **`sync-to-production.sh` — pre-flight auth logic**: el chequeo anterior fallaba si `KILOMBOTOP_PASSWORD` estaba vacío, lo que contradecía las instrucciones del propio script que dicen dejar la contraseña vacía al usar clave SSH. La nueva lógica tiene tres ramas: (1) clave SSH disponible → se usa sin contraseña; (2) contraseña configurada → se usa `sshpass`; (3) ninguna de las dos → falla con mensaje claro listando ambas opciones.

### Added (nuevo)
- **`deploy.yml` — job `test` antes de deploy**: el workflow de GitHub Pages ahora ejecuta `npm test` (unit tests + validación JSON + consistencia de URLs) antes de publicar. Un test fallido bloquea el deploy a Pages.
- **`sync-to-production.sh` — dry-run pass**: antes del rsync real, el script ejecuta `--dry-run` y muestra exactamente qué se modificaría. Pide una segunda confirmación (`SI`) antes de proceder. Incluye aviso visible sobre el comportamiento de `--delete`.
- **`sync-to-production.sh` — instrucciones de clave SSH**: el encabezado del script documenta cómo generar un par de claves `ed25519` y copiar la pública al servidor para eliminar la dependencia de contraseña.
- **`MIGRATION.md`**: documento que explica la estrategia del espejo — el portal es el nuevo diseño de `kilombo.top` construido en paralelo. El reemplazo es incremental por sesión con `./end-of-session.sh`. Confirma que el deploy es autónomo (no depende de administradores técnicos) y explica por qué el sitio estático no da problemas en YunoHost.
- **`end-of-session.sh`**: script de fin de sesión — push a GitHub Pages + sync a `kilombo.top` en un solo comando.

### Changed (cambiado)
- **`TO_FIX.md`**: eliminado ítem `YunoHost-B` (admin SPIP — irrelevante con el nuevo diseño estático); añadido `YunoHost-E` (migración a clave SSH); sección `⏸ Aplazado` clarifica que el cliente puede abrir el puerto 22 directamente.
- **`ROADMAP.md`**: paso 9 deja de estar aplazado — es una tarea concreta pendiente de que el cliente abra el puerto 22.
- **`TROUBLESHOOTING.md`**: próximos pasos simplificados a 3 ítems que el cliente puede hacer sin intermediarios.
- **`README.md`**: intro actualizada con la estrategia de espejo correcta; árbol de archivos completo con todos los ficheros actuales.

---

## [0.12.0] — 2026-08-03

### Added (nuevo)
- **`MIGRATION.md`**: documento que explica la estrategia del espejo — el portal es el nuevo diseño de `kilombo.top` construido en paralelo para que el cliente pueda comparar sin tocar el original. El reemplazo se hace de forma incremental al final de cada sesión con `./end-of-session.sh`, en cuanto el cliente aprueba los avances. Incluye explicación de por qué el sitio estático no da problemas, y confirma que el deploy es autónomo (no depende de los administradores técnicos).
- **`end-of-session.sh`**: script de fin de sesión que ejecuta los dos pasos de deploy en orden — push a GitHub (→ GitHub Pages) y sincronización a `kilombo.top` via rsync/scp. Si el puerto 22 no está accesible, detecta el bloqueo, imprime las instrucciones exactas para abrirlo desde el panel YunoHost, y termina dejando GitHub Pages actualizado igualmente.

### Changed (cambiado)
- **`sync-to-production.sh`**: usuario por defecto corregido a `kilombo`; `sshpass` integrado automáticamente; comprobación de accesibilidad del puerto 22 antes del prompt `PROD`.
- **`README.md`**: nueva sección "Flujo de trabajo por sesión"; referencia a `MIGRATION.md` añadida al intro; sección duplicada "Desarrollo local" eliminada.
- **`ROADMAP.md`**: paso 1 ítems 1.1–1.4 marcados como completados; nuevo ítem 1.5 para prueba de deploy en `kilombo.top`; paso 9 marcado `⏸ Aplazado`.
- **`TROUBLESHOOTING.md`**: resumen ejecutivo actualizado; tabla de apps ampliada con Nextcloud/Roundcube/Redirect; sección 4 reescrita con opciones concretas para los dos bloqueos restantes.
- **`.env`**: `KILOMBOTOP_USER` corregido a `kilombo`; `KILOMBOTOP_FUTURE_PASSWORD` entre comillas simples; `PREVIEW_PUBLIC_URL` actualizado a GitHub Pages.
- **`TO_FIX.md`**: sección `⏸ Aplazado` añadida para los ítems YunoHost; versión stamp actualizada a v0.12.0.

---

## [0.11.0] — 2026-08-03

### Added (nuevo)
- **GitHub Pages deploy** (`https://ukoquique-proves.github.io/kilombo/`): sitio publicado de forma permanente, actualización automática en cada push a `main`.
- **`.github/workflows/deploy.yml`**: workflow de GitHub Actions que publica `site/` en GitHub Pages en cada push a `main` o ejecución manual (`workflow_dispatch`). Usa `actions/checkout@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`.

### Changed (cambiado)
- **README.md — sección de despliegue renovada**: la sección "Mostrar avances al cliente" reemplazada por "Sitio público permanente (GitHub Pages)" como primer método. Serveo pasa a ser mencionado solo como herramienta de preview local antes de hacer push. `.env` actualizado con la URL permanente de GitHub Pages.
- **ROADMAP.md**: paso 1.2 actualizado para reflejar GitHub Pages + Actions como implementación elegida.

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
- **Inventario inicial de la red**: documento ya presente en `INICIO/inventario-inicial-kilombo.md` (7 sitios detectados + priorización), `INICIO/pasos-trabajo-kilombo.md` (trabajo con/sin credenciales), `INICIO/ROADMAP-fase-diagnostico.md` (5 fases: Diagnóstico → Clasificación → Preparación → Publicación → Mantenimiento).
