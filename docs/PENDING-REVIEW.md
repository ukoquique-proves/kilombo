# PENDING-REVIEW — Artículos que requieren atención manual

Cada artículo listado aquí tiene `status: "pending-review"` en `site/assets/content/articles.json`.
El contenido que se muestra en el portal es un stub incompleto — no representa el artículo original.

Actualizar este archivo siempre que:
- Se complete un artículo (cambiar `status` a `imported` y eliminar la entrada de aquí).
- Se importe un nuevo artículo como `pending-review`.

---

## 1. El fraude de los PCR

| Campo | Valor |
|---|---|
| **id** | `el-fraude-de-los-pcr` |
| **Fuente** | https://www.kilombo.top/spip.php?article37 |
| **Sección** | `nom` |
| **Temas** | plandemismo, pcr, test, fraude, covid |

**Problema:** El artículo original en la fuente consiste únicamente en dos imágenes PNG (`pcr1.png`, `pcr2.png`). No hay texto extraíble — el cuerpo SPIP está vacío. El stub actual es una frase genérica de dos líneas.

**Qué hace falta:**
1. Transcribir manualmente el texto de las imágenes, o
2. Solicitar el texto fuente al cliente, o
3. Reemplazar por otro artículo equivalente con texto completo, o
4. Documentar explícitamente que las imágenes son el contenido intencionado y cambiar `status` a `external-only`

---

## 2. GOUVERNER PAR LE CHAOS

| Campo | Valor |
|---|---|
| **id** | `gouverner-par-le-chaos` |
| **Fuente** | https://www.kilombo.top/spip.php?article33 |
| **Sección** | `nom` |
| **Temas** | imagenes, plandemia |

**Problema:** El cuerpo extraído es solo el texto del `descriptif` (descripción editorial del artículo en SPIP), no el cuerpo real. El artículo de fondo es probablemente un libro o documento externo — el `descriptif` actúa de presentación. No hay snapshot local (`scraped-full/article-33.html` no existe), así que no se puede re-extraer sin acceso en vivo.

**Qué hace falta:**
1. Acceder a la fuente en vivo y revisar si hay un cuerpo de texto real más allá del descriptif, o si el artículo es solo la presentación editorial de un enlace externo.
2. Si hay texto real: re-importar con `node scripts/import-article.mjs --url https://www.kilombo.top/spip.php?article33 --section nom --topics imagenes,plandemia --force-update`.
3. Si es solo presentación de un enlace: documentar el enlace en `externalLinks[]` y dejar el descriptif como `contentHtml`, cambiando `status` a `imported`.
4. Nota: este artículo también tiene la fecha vacía (TO_FIX #64) — no hay snapshot local para el backfill.

---

## 3. Imágenes — Plandemismo

| Campo | Valor |
|---|---|
| **id** | `imagenes` |
| **Fuente** | https://www.kilombo.top/spip.php?article20 |
| **Sección** | `nom` |
| **Temas** | plandemismo, plandemia |

**Problema:** El artículo original es una galería de imágenes (3 JPG sobre plandemia). El contenido extraído incluye las imágenes con sus `<figure>` y enlaces a la fuente original, pero los `alt=""` están vacíos — incumple accesibilidad (WCAG AA). Además el título "Imágenes — Plandemismo" es genérico y no describe el contenido.

**Qué hace falta:**
1. Añadir texto `alt` descriptivo a cada imagen (describe qué muestra la imagen).
2. Revisar si el artículo merece un título más específico.
3. Considerar si este tipo de entrada (solo imágenes sin texto) tiene suficiente valor para el espejo, o si es mejor `status: external-only` con enlace a la fuente.

---

## 4. Futuras generaciones

| Campo | Valor |
|---|---|
| **id** | `futuras-generaciones` |
| **Fuente** | https://www.kilombo.top/spip.php?article34 |
| **Sección** | `nom` |
| **Temas** | control-social, educacion, domesticacion |

**Problema:** El cuerpo extraído es una sola frase: *"Como deshumanizan a los niños en las escuelas."* (53 caracteres). El artículo original probablemente consiste en imágenes, un vídeo embebido, o un documento externo — el extractor no encontró texto real. No hay snapshot local (`scraped-full/article-34.html` no existe).

**Qué hace falta:**
1. Acceder a la fuente en vivo y revisar el contenido real del artículo.
2. Si hay texto: re-importar con `--force-update`.
3. Si es vídeo: añadir enlace en `externalLinks[]` con `type: "youtube"` o similar.
4. Si es imagen: transcribir o añadir descripción contextual.
5. Nota: este artículo también tiene fecha recuperada (2023-02-27) del backfill — verificar que es correcta contra la fuente.

---

## 5. Transformación — Registros Akáshicos

| Campo | Valor |
|---|---|
| **id** | `transformacion-registros-akashicos` |
| **Fuente** | https://www.kilombo.top/spip.php?article76 |
| **Sección** | `tierra` |
| **Temas** | salud-alternativa, espiritualidad |

**Problema:** El artículo original consiste únicamente en imágenes (documentos gráficos). El stub actual tiene una frase genérica.

**Qué hace falta:**
1. Transcribir o describir el contenido de las imágenes.
2. Añadir contexto sobre los Registros Akáshicos y su relación con la línea editorial del espacio Tierra y Libertad.

---

## 6. TERRAIN — El Filme (2022)

| Campo | Valor |
|---|---|
| **id** | `terrain-the-film` |
| **Fuente** | https://www.kilombo.top/spip.php?article84 |
| **Sección** | `nom` |
| **Temas** | plandemismo, documental, salud |

**Problema:** El cuerpo de texto se extrajo correctamente (~590 chars) pero el título en la fuente incluía metadatos embebidos (`"2022 feb 12, Subtitulos en Español"`) que se limpiaron al importar. Falta: enlace directo al documental, información de dónde verlo con subtítulos en español, y contexto editorial.

**Qué hace falta:**
1. Limpiar/verificar el `contentHtml` actual — puede quedar texto artefacto del título original.
2. Añadir `externalLinks[]` con el enlace directo al documental.
3. Añadir `metadata{}` con año (2022), idioma, subtítulos (español).
4. Añadir contexto sobre el argumento central del film (crítica al dogmatismo de la medicina oficial).

---

## 7. El Negacionista — Cortometraje

| Campo | Valor |
|---|---|
| **id** | `el-negacionista-cortometraje` |
| **Fuente** | https://www.kilombo.top/spip.php?article85 |
| **Sección** | `tierra` |
| **Temas** | cine, negacionismo, plandemismo |

**Problema:** El artículo original consiste únicamente en imágenes. El stub actual tiene una frase genérica.

**Qué hace falta:**
1. Añadir sinopsis del cortometraje.
2. Añadir ficha técnica en `metadata{}`: director, duración, año.
3. Añadir enlace para verlo en `externalLinks[]`.
4. Añadir contexto sobre el tema central (negacionismo de la plandemia).

---

## 8. Curso de Salud Holística — University of Terrain

| Campo | Valor |
|---|---|
| **id** | `curso-salud-holistica` |
| **Fuente** | https://www.kilombo.top/spip.php?article86 |
| **Sección** | `tierra` |
| **Temas** | salud-alternativa, educacion |

**Problema:** El artículo original consiste únicamente en imágenes. El stub actual tiene una frase genérica.

**Qué hace falta:**
1. Añadir descripción del curso y su temario.
2. Identificar la institución organizadora ("University of Terrain" — verificar nombre exacto).
3. Añadir enlace de acceso al curso en `externalLinks[]`.
4. Añadir relación con la línea de salud natural/holística del espacio Tierra y Libertad.

---

## Resumen de estado

| # | id | Problema raíz | Esfuerzo estimado |
|---|---|---|---|
| 1 | `el-fraude-de-los-pcr` | Solo imágenes, sin texto | Medio — transcripción manual |
| 2 | `gouverner-par-le-chaos` | Solo descriptif, sin snapshot local | Bajo — re-fetch en vivo |
| 3 | `imagenes` | Galería de imágenes, alt vacíos | Bajo — añadir alt text |
| 4 | `futuras-generaciones` | Una frase, sin snapshot local | Bajo — re-fetch en vivo |
| 5 | `transformacion-registros-akashicos` | Solo imágenes | Medio — transcripción manual |
| 6 | `terrain-the-film` | Texto ok, faltan metadatos y enlace | Bajo — investigación + JSON |
| 7 | `el-negacionista-cortometraje` | Solo imágenes | Medio — investigación + transcripción |
| 8 | `curso-salud-holistica` | Solo imágenes | Medio — investigación |
