# Implementar `extractGCI()` — guía técnica

Guía para implementar el extractor de artículos del sitio `icg-gci.kilombo.top`
y habilitarlo en el pipeline de importación (`scripts/import-article.mjs`).

Ver también: `docs/TO_FIX.md #63` (ítem de seguimiento) y
`TROUBLESHOOTING.md §8` (flujo general de importación).

---

## 1. Contexto y estado actual

`detectSite()` ya clasifica `icg-gci.kilombo.top` como `'gci'` (corregido en
v0.39.1, TO_FIX #61). Pero `buildArticleEntry()` lanza un error explícito para
ese tipo porque no existe todavía `extractGCI()`. Para habilitar los imports del
GCI hay que:

1. Escribir `extractGCI()` en `scripts/import-article.mjs`
2. Añadir su rama en `buildArticleEntry()`
3. Quitar el `throw` para `site === 'gci'`
4. Añadir tests unitarios en `test/import-article.test.mjs`
5. Importar los artículos con `npm run import-article`

---

## 2. Estructura HTML de `icg-gci.kilombo.top` — selectores verificados

Inspeccionado en vivo el 2026-08-19 contra los artículos 22 y 29.

### Título

```html
<h1 class="surlignable entry-title">Texto del título</h1>
```

**Atención:** el título puede contener una etiqueta `<img>` (artículos con imagen
de portada). El selector debe extraer el texto completo del `<h1>`, ignorando
etiquetas internas.

Regex sugerida:
```javascript
const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
const title = titleMatch
  ? titleMatch[1].replace(/<[^>]+>/g, '').trim()   // strip inner tags (img, etc.)
  : '';
```

### Fecha

```html
<p class="info-publi">
  <abbr class="published" title="2024-03-24T16:36:00Z">Domingo 24 de marzo de 2024</abbr>
  ...
</p>
```

La fecha ISO-8601 ya está en el atributo `title` de `<abbr class="published">` —
no requiere normalización de strings ES/FR como en `extractTierra()`.

Regex sugerida:
```javascript
const dateMatch = html.match(/<abbr[^>]*class="published"[^>]*title="(\d{4}-\d{2}-\d{2})/);
const date = dateMatch ? dateMatch[1] : '';
```

### Cuerpo del artículo

```html
<div class="texte surlignable clearfix">
  <p>Contenido del artículo...</p>
</div><!--.content-->
```

**Mismo selector de clase que `extractPI()`** (`class="texte surlignable clearfix"`),
pero el marcador de cierre fiable es el comentario `<!--.content-->` que sigue
al `</div>` de cierre, **no** un comentario SPIP como en Tierra. También puede
truncarse en `<footer` o `<aside`.

El problema de `extractPI()` al aplicarse a GCI sin modificar es que captura
4MB de HTML (comentarios de spam del foro) porque su truncación busca
`<section id=` o `<footer` que aparecen demasiado tarde. El marcador correcto
para GCI es `</div><!--.content-->`.

Regex sugerida para el cuerpo:
```javascript
const bodyStart = html.search(/class="texte surlignable clearfix"/);
let bodyHtml = '';
if (bodyStart !== -1) {
  const afterDiv = html.indexOf('>', bodyStart) + 1;
  const endMarker = html.indexOf('</div><!--.content-->', afterDiv);
  bodyHtml = endMarker !== -1
    ? html.slice(afterDiv, endMarker)
    : html.slice(afterDiv, html.search(/<footer|<aside/i));
}
```

---

## 3. Implementación de `extractGCI()` en `import-article.mjs`

Añadir la función después de `extractPI()`, antes de la sección
"4. Absolute-URL rewriting":

```javascript
/**
 * Extracts title/date/body from an icg-gci.kilombo.top article page.
 * GCI uses a different SPIP theme from Tierra y Libertad:
 *   - Title: <h1 class="surlignable entry-title"> (may contain <img>)
 *   - Date: <abbr class="published" title="YYYY-MM-DDT..."> (already ISO)
 *   - Body: <div class="texte surlignable clearfix"> … </div><!--.content-->
 * @param {string} html
 * @returns {{ title: string, date: string, bodyHtml: string, isImageOnly: boolean }}
 */
export function extractGCI(html) {
  // Title — strip any inner tags (e.g. <img> used as article header image)
  const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
  const title = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
    : '';

  // Date — already ISO-8601 in the `title` attribute of <abbr class="published">
  const dateMatch = html.match(/<abbr[^>]*class="published"[^>]*title="(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : '';

  // Body — truncate at <!--.content--> marker or <footer / <aside
  const bodyStart = html.search(/class="texte surlignable clearfix"/);
  let bodyHtml = '';
  if (bodyStart !== -1) {
    const afterDiv = html.indexOf('>', bodyStart) + 1;
    const endMarker = html.indexOf('</div><!--.content-->', afterDiv);
    bodyHtml = endMarker !== -1
      ? html.slice(afterDiv, endMarker)
      : html.slice(afterDiv, html.search(/<footer|<aside/i));
  }

  const plainTextLength = bodyHtml.replace(/<[^>]+>/g, '').trim().length;
  const isImageOnly = plainTextLength < 200 && !/<a\s+[^>]*href=/i.test(bodyHtml);

  return { title, date, bodyHtml, isImageOnly };
}
```

---

## 4. Modificar `buildArticleEntry()` para usar `extractGCI()`

Localizar el bloque `if (site === 'gci')` que actualmente lanza un error
y reemplazarlo por la rama real:

```javascript
// ANTES (lanza error):
if (site === 'gci') {
  throw new Error(`... No existe todavía extractGCI() ...`);
}

// DESPUÉS (usa el extractor):
// (eliminar el bloque if (site === 'gci') { throw ... } por completo)
```

Y en la línea que elige el extractor según el sitio:

```javascript
// ANTES:
const extracted = site === 'tierra' ? extractTierra(html) : extractPI(html);

// DESPUÉS:
const extracted =
  site === 'tierra' ? extractTierra(html) :
  site === 'gci'    ? extractGCI(html)    :
  extractPI(html);
```

También actualizar el campo `sourceSite` para el caso `gci`:

```javascript
// ANTES:
sourceSite: site === 'tierra' ? 'Espacio Tierra y Libertad (kilombo.top)' : 'Proletarios Internacionalistas',

// DESPUÉS:
sourceSite:
  site === 'tierra' ? 'Espacio Tierra y Libertad (kilombo.top)' :
  site === 'gci'    ? 'GCI — Grupo Comunista Internacionalista (icg-gci.kilombo.top)' :
  'Proletarios Internacionalistas',
```

---

## 5. Tests unitarios a añadir

En `test/import-article.test.mjs`, añadir después de los tests de `extractPI`:

```javascript
test('extractGCI extracts title stripping inner tags', () => {
  const html = `<h1 class="surlignable entry-title"><img src="x.jpg"> Título del comunicado</h1>`;
  const { title } = extractGCI(html);
  assert.equal(title, 'Título del comunicado');
});

test('extractGCI extracts ISO date from abbr.published title attribute', () => {
  const html = `<abbr class="published" title="2024-03-24T16:36:00Z">Domingo 24 de marzo de 2024</abbr>`;
  const { date } = extractGCI(html);
  assert.equal(date, '2024-03-24');
});

test('extractGCI truncates body at <!--.content--> marker', () => {
  const html = `<div class="texte surlignable clearfix"><p>Contenido real.</p></div><!--.content-->
    <div class="comments"><p>Spam comentario.</p></div>`;
  const { bodyHtml } = extractGCI(html);
  assert.ok(bodyHtml.includes('Contenido real'));
  assert.ok(!bodyHtml.includes('Spam comentario'));
});

test('buildArticleEntry accepts gci hosts after extractGCI is wired up', async () => {
  const mockHtml = `
    <h1 class="surlignable entry-title">Comunicado de prueba</h1>
    <abbr class="published" title="2024-01-15T00:00:00Z">15 enero 2024</abbr>
    <div class="texte surlignable clearfix"><p>Texto del comunicado.</p></div><!--.content-->
  `;
  const fetchHtml = async () => mockHtml;
  const entry = await buildArticleEntry(
    { url: 'https://icg-gci.kilombo.top/spip.php?article22', section: 'gci', topics: ['comunicado'] },
    fetchHtml,
    []
  );
  assert.equal(entry.status, 'imported');
  assert.equal(entry.title, 'Comunicado de prueba');
  assert.equal(entry.date, '2024-01-15');
  assert.ok(entry.contentHtml.includes('comunicado'));
});
```

Recuerda importar `extractGCI` junto a los demás imports del test.

---

## 6. Importar artículos del GCI

Una vez implementado y testeado (`npm test` en verde), importar artículos:

```bash
# Importar un artículo individual (online)
node scripts/import-article.mjs \
  --url https://icg-gci.kilombo.top/spip.php?article22 \
  --section gci \
  --topics comunicado,capital,guerra \
  --dry-run

# Sin --dry-run para escribir en articles.json
node scripts/import-article.mjs \
  --url https://icg-gci.kilombo.top/spip.php?article22 \
  --section gci \
  --topics comunicado,capital,guerra
```

Los IDs de artículos disponibles en el sitio del GCI (verificados el 2026-08-19):
`22, 29, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41` — y probablemente más.
Hacer un scrape completo antes de importar en lote:

```bash
# Descubrir todos los artículos disponibles
curl -s "https://icg-gci.kilombo.top/" | grep -o 'spip\.php?article[0-9]*' | sort -u
```

---

## 7. Qué queda fuera de esta guía (TO_FIX #63 parcial)

Esta guía cubre únicamente `icg-gci.kilombo.top` (`site === 'gci'`). Los otros
tres hosts del bloque GCI tienen su propio estado:

| Host | Tipo | Estado |
|------|------|--------|
| `icg-gci.kilombo.top` | SPIP (spip__4) | **Esta guía** |
| `in.kilombo.top` | SPIP (spip__3), multilingüe | Pendiente — verificar si comparte selectores con `extractGCI()` o necesita `extractGCIIn()` |
| `cdrom.kilombo.top` | Webapp estática (my_webapp) | Pendiente — no es SPIP, requiere enfoque distinto |
| `icg-old.kilombo.top` | Webapp estática (my_webapp) | Pendiente — ídem |

---

## 8. Actualizar TO_FIX.md cuando esté implementado

Cuando `extractGCI()` esté en producción, cerrar el subítem 1 de TO_FIX #63
y actualizar el estado del ítem a "parcialmente resuelto (icg-gci ✅, in/cdrom/old pendientes)".
