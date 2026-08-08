# MIRROR_GROWING — Cómo hacer crecer el espejo de forma coherente

Este documento describe el proceso de crecimiento del espejo Kilombo:
cómo incorporar contenido desde `kilombo.top` y fuentes autorizadas,
qué criterios de diseño mantener mientras crece, y cómo sincronizar
ese crecimiento con los demás procesos activos del proyecto.

Para la estrategia de migración técnica ver `MIGRATION.md`.
Para el plan de trabajo ver `ROADMAP.md`.

---

## 1. Fuentes de contenido autorizadas

El espejo puede incorporar material de las siguientes fuentes:

| Fuente | URL | Qué se incorpora | Cómo |
|--------|-----|-----------------|------|
| **Espacio Tierra y Libertad** | `https://www.kilombo.top/` | Artículos de análisis, dossieres, fundamentos | Importar a `articles.json` con `status: imported` o `adapted` |
| **GCI — Sitio oficial** | `https://icg-gci.kilombo.top/` | Comunicados, textos programáticos | Artículos con `section: gci` |
| **Proletarios Internacionalistas** | `https://proletariosinternacionalistas.kilombo.top/` | Análisis, boletines | Artículos con `section: pi` |
| **Canal7 Salta TV** | `https://tv.canal7salta.com/` | Vídeos de análisis sanitario, NOM | Entradas en `plandemismo-*.json` |
| **Otras fuentes amigas** | A confirmar por el cliente | Textos, audios, vídeos | Según sección temática |

### Regla de admisión

Antes de incorporar cualquier material nuevo, verificar:

1. **Encaja con la línea editorial** del espacio Kilombo — si no encaja, se omite sin publicidad ni mención
2. **La fuente es un espacio amigo o aliado** confirmado por el cliente
3. **El material no está ya incorporado** — consultar `articles.json` y los JSON de vídeos para evitar duplicados (ver `ROADMAP.md` §4.5 sobre el futuro registro de fuentes)
4. **El `sourceUrl` apunta al original** — siempre enlazar al espacio de origen como primer referente

---

## 2. Proceso de incorporación de un artículo nuevo

### Paso a paso

```
1. Leer el artículo en la fuente original
2. Verificar admisión (regla arriba)
3. Crear la entrada en articles.json:
   - id:          slug único (kebab-case, sin acentos)
   - title:       título limpio, sin mayúsculas innecesarias
   - date:        fecha del original en YYYY-MM-DD (o vacío si no consta)
   - section:     tierra | gci | pi | nom | general
   - topics:      array de etiquetas en minúsculas
   - sourceSite:  nombre legible del sitio de origen
   - sourceUrl:   URL completa al artículo original
   - status:      imported | adapted | translated | pending-review
   - contentHtml: HTML limpio (solo p, a, strong, em, ul, ol, li,
                  blockquote, h3, h4 — sin script, sin estilos inline)
4. Ejecutar npm test → si hay errores en validate-data.mjs, corregirlos
5. Previsualizar localmente con npm run preview
6. Commit + push → deploy automático
```

### Criterios de calidad del contentHtml

- Sin `<div>`, sin `<span>` de estilo, sin `<table>`
- Sin atributos `style=`, sin `class=`, sin `id=`
- Los enlaces externos llevan `href` pero no `target` ni `rel` — `sanitizeHtml()` los añade automáticamente
- Sin emojis en el cuerpo del texto (pueden usarse en títulos si el original los tiene)
- Citas textuales van en `<blockquote>` — no entre comillas en un párrafo

---

## 3. Proceso de incorporación de un vídeo nuevo

Los vídeos van en `site/assets/data/plandemismo-*.json`.

```
1. Identificar a qué tab pertenece: actualidad | sida-covid | historicos
2. Crear la entrada en el JSON correspondiente siguiendo el schema
   (ver scripts/validate-data.mjs para la definición completa)
3. Usar ctaPlaceholder: true si la URL real del vídeo aún no está disponible
4. Ejecutar npm test → 0 errores
5. Commit + push
```

Cuando se obtenga la URL real del vídeo en Canal7:
- Actualizar `ctaUrl` con la URL exacta
- Cambiar `ctaPlaceholder` a `false`
- Ver `TO_FIX.md` ítem A-2 para el seguimiento de este proceso

---

## 4. Criterios de diseño a mantener mientras el espejo crece

Estos principios deben respetarse en cada nueva pieza de contenido o página que se añada. No son opcionales — son lo que diferencia un espejo coherente de un archivo desordenado.

### 4.1 Paleta y tipografía — no improvisar

| Elemento | Valor fijo |
|----------|-----------|
| Fondo | `#fcfbf7` |
| Texto | `#121212` |
| Acento rojo | `#b91c2a` |
| Rojo oscuro (bordes temáticos) | `#8b0000` |
| Titulares | Playfair Display (serif) — nunca sustituir por otra fuente |
| Cuerpo | Inter (sans-serif) |
| Metadata / badges | Courier New (monospace) |

Si se necesita un nuevo componente visual, usar las variables CSS de `style.css` (`:root`), no inventar colores nuevos.

### 4.2 Jerarquía de secciones — no añadir secciones sin consultar

El portal tiene **4 secciones fijas** en orden de prioridad visual:

```
⭐ Espacio Tierra y Libertad  (destacada)
01 GCI
02 Proletarios Internacionalistas
03 Nuevo Orden Mundial / Plandemismo
```

Nuevo contenido siempre va dentro de una de estas secciones, nunca en una sección nueva inventada. Si el contenido no encaja claramente, usar `section: general` en `articles.json` — se reclasificará cuando el volumen lo justifique.

### 4.3 Cards — no hardcodear HTML, usar los JSON

Nunca añadir tarjetas de vídeo o artículo directamente en el HTML.
El flujo correcto es siempre:

```
JSON data file → JS render (plandemismo.js / articles.js) → DOM
```

Esto garantiza que el cifrado de StatiCrypt, la validación de esquema, y los tests unitarios cubran todo el contenido sin excepción.

### 4.4 Badges y etiquetas — usar las clases existentes

Las etiquetas de idioma, estado y tipo ya tienen clases CSS definidas:
`.lang-chip--es`, `.lang-chip--en`, `.lang-chip--fr`, `.tag--type`, `.card-status--active`, etc.
No crear variantes nuevas sin añadir la regla correspondiente en el CSS.

### 4.5 Responsive — comprobar en móvil antes de publicar

Cada vez que se añada un componente nuevo o se modifique una página existente, redimensionar el navegador a menos de 480px y verificar que:
- Los badges no se salen del contenedor
- Los títulos no se cortan
- Los botones/links son fácilmente pulsables (mínimo ~44px de área táctil)

### 4.6 Accesibilidad — requisitos mínimos

- Toda imagen lleva `alt` descriptivo
- Los enlaces externos llevan `rel="noopener noreferrer"` (gestionado automáticamente por `sanitizeHtml()` y `renderCard()`)
- Los elementos interactivos que no son `<a>` o `<button>` llevan `tabindex="0"` y listener de teclado (ver `main.js`)
- No usar color como único indicador de estado — los badges llevan texto además del color

---

## 5. Sincronización con otros procesos activos

### 5.1 Con el deploy a kilombo.top

El espejo y `kilombo.top` se sincronizan en cada `./end-of-session.sh`. Esto significa que **todo lo que se añade al espejo llega a producción en la misma sesión**. Consecuencias:

- No mergear contenido a `main` que no esté listo para producción
- Si un artículo está en borrador, mantenerlo en una rama separada hasta que esté completo
- El `npm test` que corre en CI es la última línea de defensa antes de que algo llegue a `kilombo.top`

### 5.2 Con el cifrado StatiCrypt

El cifrado se aplica en el paso de deploy de GitHub Actions — el repo contiene siempre el contenido en claro. Implicaciones para el crecimiento:

- Añadir una nueva página de contenido (ej. `tierra.html`) requiere añadir su nombre a la lista `HTML_PAGES` en `scripts/encrypt.mjs`
- Añadir un nuevo directorio de JSON cifrados requiere añadir la ruta a `JSON_DIRS` en el mismo script
- `index.html` siempre queda pública — no añadir contenido sensible en ella

### 5.3 Con las traducciones

Regla activa desde `ROADMAP.md` §5.4: ningún texto nuevo se publica en una sola lengua si su traducción se puede cubrir. En la práctica:

- Si se importa un artículo en ES que tiene versión en FR en la fuente original, importar ambas
- Si no hay traducción disponible, marcar `status: pending-review` y anotar en `notes` (campo libre) que falta la versión FR
- El deficit de traducción existente está documentado en `ROADMAP.md` §5.1

### 5.4 Con el sistema de referencias cruzadas (futuro)

Cuando se implemente `ROADMAP.md` §4.5 (sección oculta de referencias automáticas en artículos), los `topics` de cada entrada en `articles.json` serán la clave de indexación. Por eso es importante asignar topics descriptivos y consistentes desde ahora — no genéricos (`articulo`, `texto`) sino concretos (`israel`, `oms`, `vacunas-arnm`, `gci-comunicado`).

### 5.5 Con la búsqueda (futuro)

Cuando se integre búsqueda client-side (`ROADMAP.md` §6b), el índice se construirá desde los JSON de contenido. La calidad de los resultados dependerá directamente de la calidad de los campos `title`, `topics`, y `contentHtml` que se escriban ahora. Invertir tiempo en estos campos hoy evita tener que reindexar más adelante.

---

## 6. Checklist rápido antes de publicar contenido nuevo

```
[ ] La fuente está en la lista de fuentes autorizadas
[ ] No es un duplicado de algo ya en el repo
[ ] El sourceUrl apunta al artículo/vídeo original exacto
[ ] Los topics son específicos y consistentes con los ya existentes
[ ] contentHtml solo usa las etiquetas permitidas (p, a, strong, em, ul, ol,
    li, blockquote, h3, h4, br, img) — sin div, sin style, sin script
[ ] npm test pasa con 0 errores
[ ] Previsualizado localmente en escritorio y móvil (<480px)
[ ] Si es una página HTML nueva: añadida a HTML_PAGES en scripts/encrypt.mjs
[ ] Commit con mensaje descriptivo (content: / feat: / fix:)
[ ] Push → verificar deploy en GitHub Pages
```

---

## 7. Contenido prioritario — qué traer primero

Esta sección es concreta e inmediatamente accionable. Lista los artículos y series que deben incorporarse antes que cualquier otro, con la URL exacta de la fuente, la sección de destino en el espejo y el motivo de la prioridad.

El criterio de orden es: **coherencia temática con lo ya publicado** → **series completas antes que artículos sueltos** → **textos que dan fundamento a los vídeos ya incorporados en Plandemismo**.

---

### 7.1 Espacio Tierra y Libertad — prioridad inmediata

Estos artículos están en `https://www.kilombo.top/` y corresponden directamente a las secciones ya activas en el espejo.

| Título | URL fuente | Sección espejo | Por qué primero |
|--------|-----------|----------------|-----------------|
| El fraude de los PCR | `spip.php?article37` | `nom` | Texto fundacional — complementa directamente los vídeos ya publicados en la tab Actualidad |
| REPRESIÓN PLANDÉMICA 1: ocultan la HECATOMBE | `spip.php?article79` | `nom` | Serie de 4 partes — traer las 4 juntas para mantener coherencia |
| REPRESIÓN PLANDÉMICA 2: ocultan la HECATOMBE | `spip.php?article80` | `nom` | Parte 2 de la misma serie |
| REPRESIÓN PLANDÉMICA 3 | `spip.php?article81` | `nom` | Parte 3 |
| REPRESIÓN PLANDÉMICA 4 | `spip.php?article82` | `nom` | Parte 4 |
| 1er MAI 2023 | `spip.php?article40` | `tierra` | Comunicado político de referencia — ancla temporal la sección Tierra |
| FUNDAMENTOS CIENTÍFICOS (sección) | `spip.php?rubrique6` | `tierra` | Sección entera — varios artículos bajo esta rúbrica dan base científica al resto del contenido |

**Nota sobre la serie REPRESIÓN PLANDÉMICA:** son 4 artículos que forman una unidad. Importarlos todos antes de publicar el primero, para no dejar la serie incompleta en el espejo.

---

### 7.2 Proletarios Internacionalistas — prioridad inmediata

Artículos en `https://proletariosinternacionalistas.kilombo.top/`.

| Título | URL fuente | Sección espejo | Por qué primero |
|--------|-----------|----------------|-----------------|
| ¡Contra el genocidio y las guerras infinitas de la Gobernanza Mundial del Capital! | `spip.php?article54` | `pi` | Texto de coyuntura internacional — el más reciente y directamente vinculado al artículo Israel ya publicado |
| 1 de mayo 2023 — ¡CONTRA LA MILITARIZACIÓN DEL MUNDO Y EL NUEVO ORDEN MUNDIAL! | `spip.php?article44` | `pi` | Comunicado de referencia, bilingüe ES/FR |
| FALSOS INTERNACIONALISTAS 1–6 (serie completa) | `spip.php?article52` a `article48` | `pi` | Serie de 6 partes — traer completa; da contexto político al espacio PI |
| PLANDEMISMO Y DOMESTICACIÓN (11) NOTAS de DECANTACIÓN | `spip.php?article41` | `nom` | Articula PI con la sección NOM — puente entre las dos secciones |
| LA PLANDEMIA Y "LAS ASAMBLEAS DEL PUEBLO" (6 y 7) | `spip.php?article40`, `article42` | `pi` | Serie sobre estrategia organizativa — complementa los análisis de coyuntura |

---

### 7.3 GCI — segunda oleada (después de PI y Tierra)

Los textos del GCI son más largos y requieren más trabajo de adaptación. Traerlos en una segunda oleada, una vez que PI y Tierra estén suficientemente pobladas.

| Título / Serie | URL base | Sección espejo | Nota |
|----------------|---------|----------------|------|
| COMUNISM 17, 18, 19 (últimos números) | `icg-gci.kilombo.top/` | `gci` | Traer en orden inverso — más reciente primero |
| COMMUNISME 68 (versión FR) | `icg-gci.kilombo.top/` | `gci` | Importar junto con la versión ES del mismo número si existe |
| Theses on the Historical Arc of Value and the State (series 6 y 7) | `icg-gci.kilombo.top/` | `gci` | Textos programáticos — base teórica de todo el espacio GCI; priorizar en inglés + traducir/adaptar |

---

### 7.4 Artículo ya en el espejo — referencia de ejemplo

El único artículo actualmente en `articles.json` es:

```
id:        israel-mohamad-safa-siempre-victimas
section:   general
topics:    israel, gaza, medio-oriente, derecho-internacional, ONU
status:    imported
sourceUrl: https://x.com/MohamadSafa
```

Está en `section: general` porque no encaja estrictamente en ninguna sección temática. Cuando se añadan artículos de PI sobre el mismo conflicto (ítem 7.2, primer artículo), mover este a `section: pi` o crear un topic cruzado `guerra-israel-gaza` que los enlace cuando se implemente el sistema de referencias (ROADMAP §4.5).

---

### 7.5 Orden de trabajo recomendado

```
Semana 1:
  [x] Serie REPRESIÓN PLANDÉMICA 1-4 (Tierra → nom) ✅ importada 2026-08-07
  [x] El fraude de los PCR (Tierra → nom) ✅ importada 2026-08-07 (artículo solo imágenes — publicado con nota y enlace al original)
  [x] Artículo "¡Contra el genocidio!" de PI (PI → pi) ✅ importado ES + FR (articles 54 + 53) 2026-08-07

Semana 2:
  [x] Serie FALSOS INTERNACIONALISTAS 1-6 (PI → pi) ✅ importada completa 2026-08-07
  [x] 1 de mayo 2023 PI + Tierra (bilingüe) ✅ completo — PI ES (article44) + Tierra FR (article40) 2026-08-07. Nota: Tierra publicó solo la versión FR; PI publicó la versión ES. No son traducciones entre sí sino dos comunicados independientes del mismo espacio político.
  [x] PLANDEMISMO Y DOMESTICACIÓN 11 (PI → nom) ✅ importada 2026-08-07

Semana 3:
  [ ] FUNDAMENTOS CIENTÍFICOS de Tierra (rubrique6 — varios artículos)
  [ ] LA PLANDEMIA Y LAS ASAMBLEAS DEL PUEBLO 6-7 (PI → pi)

Semana 4+:
  [ ] COMUNISM 17-19 y COMMUNISME 68 (GCI → gci)
  [ ] Theses on Historical Arc (GCI → gci, en inglés primero)
```

---

## Referencias

- `MIGRATION.md` — relación entre el espejo y `kilombo.top`, proceso de deploy
- `ROADMAP.md` — plan completo de crecimiento por fases
- `TO_FIX.md` — problemas abiertos que afectan al contenido actual
- `scripts/validate-data.mjs` — schema completo de artículos y vídeos
- `site/js/render.mjs` — allowlist de etiquetas HTML permitidas en contentHtml
