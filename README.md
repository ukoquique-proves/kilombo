# Kilombo — Portal de publicaciones y archivos internacionalistas

Portal central de acceso a la red de sitios de Kilombo. Construido como página estática (HTML, CSS, JS) para ser alojado en la infraestructura YunoHost de `kilombo.top`.

> **Este portal es el nuevo diseño de `kilombo.top`, construido en paralelo para que el cliente pueda comparar original y nuevo sin tocar el sitio en producción.** Cuando el cliente apruebe el espejo, reemplaza a `kilombo.top` con un solo deploy. Ver [`MIGRATION.md`](MIGRATION.md).

---

## Sobre el contenido y las fuentes

**Kilombo no funciona solo.** El portal integra y enlaza materiales producidos por una **red de espacios amigos y aliados políticos** con los que compartimos línea y objetivos de difusión revolucionaria internacionalista.

### Sitio de referencia: www.kilombo.top

El contenido principal proviene de `https://www.kilombo.top/` — sitio editorial SPIP donde se publican artículos, videos y materiales de la red Kilombo. Ver [`docs/SITE_ANALYSIS.md`](docs/SITE_ANALYSIS.md) para un **análisis completo en vivo** del servidor: estructura, secciones, artículos, vídeos identificados, y estado de acceso.

### Fuentes / espacios colaboradores

| Espacio | URL | Tipo de colaboración |
|---------|-----|----------------------|
| **Espacio Tierra y Libertad** | `https://www.kilombo.top/` | Sitio editorial principal (SPIP 4.4.15). Publica artículos, documentales y materiales de la red internacionalista. Análisis detallado: [`docs/SITE_ANALYSIS.md`](docs/SITE_ANALYSIS.md) |
| **Canal7 Salta · TV** | `https://tv.canal7salta.com/` | Comparten sus videos de análisis sobre montajes sanitarios, NOM, médicos éticos. Nosotros lo republicamos/organizamos dentro de la sección **Plandemismo** del portal con subtítulos en francés. |
| *(otras fuentes amigas)* | *(se irán añadiendo)* | Textos, artículos, dosiers, audios, videos de organizaciones y personas de confianza. |

### Principio político respecto a las fuentes

> El contenido externo que entra en el portal nunca se presenta como "seleccionado" o "curado" por encima de los compañeros. **No filtramos calidad de otros;** lo que hacemos es:
> 1.  **Seleccionar por línea editorial** (solo entra lo que encaja con el espacio Kilombo; lo que no encaja se deja fuera sin publicidad ni mención).
> 2.  **Re-presentar / reorganizar** el material de los espacios amigos dentro de las categorías de este portal (por ejemplo: Actualidad / SIDA→COVID / Históricos).
> 3.  **Traducir / subtitular** para ampliar la difusión (p. ej. subtítulos FR sobre materiales originales en ES).
> 4.  **Enlazar SIEMPRE** al espacio compañero de origen como primer referente (los CTA de las fichas de video apuntan al sitio de Canal7, no a un embed cerrado).

Toda exclusión de material (cuando proceda) es una decisión del cliente sobre **adecuación a la línea de este espacio** — nunca un juicio sobre el espacio amigo.

---

## Modificación de la fuente y despliegue

Este repositorio no es el backend original de `kilombo.top`. Es el espejo estático / portal de diseño que se publica desde esta carpeta y luego se sincroniza con la infraestructura YunoHost del cliente.

- El contenido principal se trabaja en el repositorio, bajo `site/`.
- La vista previa local se hace con un servidor HTTP estático.
- El despliegue real a producción se ejecuta con `./sync-to-production.sh` usando los valores de `.env`.
- Los valores de `.env` (host, puerto, usuario y ruta remota) son credenciales de infraestructura para el despliegue del espejo, no para editar el backend SPIP original.

Si el objetivo es cambiar el diseño y el contenido del espejo, se trabaja desde este repositorio y luego se sincroniza con:

```bash
./sync-to-production.sh
```

Si el objetivo es editar directamente el sitio original de SPIP en `kilombo.top`, eso requiere acceso SSH al host real y, además, permisos sobre la instancia de SPIP / YunoHost, que no son los mismos que los usados para publicar este portal estático.

Se puede consultar la guía más detallada en [`docs/DEPLOYMENT-AND-SOURCE-EDITING.md`](docs/DEPLOYMENT-AND-SOURCE-EDITING.md).

---

## Estructura del portal (orden y jerarquía)

El sitio se organiza en **cuatro secciones**, en el siguiente orden de prioridad visual:

| # | Sección | Tratamiento |
|---|---------|-------------|
| ⭐ | **Espacio Tierra y Libertad** | Sección destacada (primera posición, fondo tintado, barra superior roja, etiqueta de "destacada") |
| 01 | **GCI — Grupo Comunista Internacionalista** | División principal con 4 sub-plataformas: Sitio Oficial, International Global Revolution (EN), CD-Rom (archivo), ICG Histórico (legado) |
| 02 | **Proletarios Internacionalistas** | Una tarjeta bilingüe ES/FR (el sitio tiene selector de idioma interno) |
| 03 | **Nuevo Orden Mundial: plandemismo y domesticación** | División temática (dossieres y artículos sobre NOM, controles sociales y confinamiento) |

Dentro de cada sección, las tarjetas indican el **idioma** del sitio mediante una etiqueta con código de color, y el **estado** (Activo / Archivo / Legado) mediante una insignia.

---

## Sitios espejo, referencias y redes de Kilombo analizadas

Este portal nuevo se construye a partir del análisis de una **red ya existente** de espacios Kilombo en la infraestructura YunoHost, más un prototipo de rediseño inicial. Todos son sitios "hermanos" (misma organización, diferentes plataformas).

**Análisis detallado del sitio principal:** Ver [`docs/SITE_ANALYSIS.md`](docs/SITE_ANALYSIS.md) — contiene datos vivos del servidor (estructura SPIP, catálogo de 54 artículos, vídeos identificados, estado de acceso, etc.).

### Prototipo / rediseño inicial (Referencia visual del cliente)

| Sitio | URL | Propósito |
|-------|-----|-----------|
| **Kilombo Redesign (Replit)** | `https://kilombo-redesign--ukoquique.replit.app/` | Primer borrador de estructura, creado por el cliente para visualizar agrupaciones por plataformas. Sirvió de punto de partida, aunque el diseño y la estructura de 3 divisiones + Tierra y Libertad destacada se definieron después. |

### Sitios reales de la red Kilombo (infraestructura YunoHost)

Acceso central por SSO: `https://kilombo.top/yunohost/sso/`

| Sitio | URL | Idiomas | Estado | Función / contenido |
|-------|-----|---------|--------|---------------------|
| **Espacio Tierra y Libertad** | `https://www.kilombo.top/` | ES / FR | Activo | Plataforma editorial principal — artículos, sección NOM/Plandemismo, fundamentos, dossieres. |
| **GCI (ICG) — Sitio oficial** | `https://icg-gci.kilombo.top/` | ES / EN / FR | Activo | Textos programáticos, comunicados oficiales del Grupo Comunista Internacionalista. |
| **Proletarios Internacionalistas** | `https://proletariosinternacionalistas.kilombo.top/` | ES / FR | Activo | Publicación de la corriente P.I. / I.P. — análisis de coyuntura internacional. |
| **International Global Revolution** | `https://in.kilombo.top/` | EN, Kurdish, Persian, Arabic + | Activo | Plataforma anglófona del GCI (plataforma internacionalista). |
| **ICG Sitio Histórico (antiguo)** | `https://icg-old.kilombo.top/` | Varios | Legado | Versión anterior / archivo del sitio del ICG/GCI. |
| **ICG CD-Rom** | `https://cdrom.kilombo.top/` | FR / ES / EN + | Archivo | Archivo multilingüe digital (decadas de textos y documentos del GCI). |

> Estos 6 espacios, más los contenidos de espacios amigos como Canal7 Salta TV, son las fuentes que alimentan el nuevo portal central. La tarea del portal es **agrupar, re-presentar por líneas, traducir y enlazar de vuelta** a cada espacio original.

---

## Credenciales de acceso — qué funciona y qué no

El proyecto usa dos credenciales independientes, con propósitos distintos y estados de acceso distintos. Esta sección documenta el estado **verificado** — no el estado esperado o documentado en otra parte.

### 1. `GITHUB_TOKEN` — acceso al repositorio

Funciona sin restricciones. Se usa para:
- Push a `main` vía HTTPS (cuando `git push` no está disponible)
- Dispatch manual de workflows de GitHub Actions
- Upload de GitHub Actions Secrets (p. ej. `STATICRYPT_PASSWORD`)

### 2. `KILOMBOTOP_PASSWORD` — acceso a la infraestructura YunoHost

La contraseña del usuario `kilombo` en `kilombo.top` autentica correctamente contra el SSO de YunoHost (`/yunohost/portalapi/login` devuelve `200 Logged in`). El usuario pertenece al grupo `admins` de YunoHost.

**Lo que SÍ desbloquea esta contraseña (verificado):**

| Servicio | URL | Acceso |
|----------|-----|--------|
| Panel de administración YunoHost | `https://kilombo.top/yunohost/admin/` | ✅ Acceso completo |
| Nextcloud (ficheros, drafts, media) | `https://cloud.kilombo.top/` | ✅ Acceso completo |
| Webmail | `https://mail.kilombo.top/` | ✅ Acceso completo |
| API YunoHost (`/yunohost/portalapi/me`) | Lista de apps, grupos, email | ✅ Acceso completo |

**Lo que NO desbloquea esta contraseña (verificado):**

| Servicio | URL | Estado |
|----------|-----|--------|
| SSH / SFTP / rsync | Puerto 22 | ❌ Firewall bloquea acceso externo |

**Lo que SÍ desbloquea para SPIP (verificado en v0.42.0):**

| Servicio | URL | Estado |
|----------|-----|--------|
| Backend SPIP — Tierra y Libertad | `https://www.kilombo.top/ecrire/` | ✅ Acceso verificado (HTTP 302 + SSO) |
| Backend SPIP — Proletarios Internacionalistas | `https://proletariosinternacionalistas.kilombo.top/ecrire/` | ✅ Acceso verificado (HTTP 302 + SSO) |
| Backend SPIP — International Global Revolution | `https://in.kilombo.top/ecrire/` | ✅ Acceso verificado (HTTP 302 + SSO) |
| Backend SPIP — GCI Oficial | `https://icg-gci.kilombo.top/ecrire/` | ✅ Acceso verificado (HTTP 302 + SSO) |

**Nota importante sobre SPIP:** El usuario `kilombo` pertenece al grupo `admins` de YunoHost, que otorga acceso al backend SPIP de todas las cuatro instancias. Esto fue verificado por:
1. Test de conectividad: script `test-spip-access.mjs` confirma 4/4 instancias reachables
2. Test funcional: `create-article.mjs` creó Article #87 exitosamente el 2026-08-21
3. Documentación: Ver `docs/SPIP-BACKEND-ACCESS.md` para detalles técnicos completos

**Por qué funciona ahora (era incorrecto antes):**
La documentación anterior (agosto 3) afirmaba que `kilombo` NO tenía acceso a SPIP basándose en una prueba fallida que usaba credenciales incorrectas (username `admin` en lugar de `kilombo`). La verificación de agosto 22 confirma que el usuario SÍ tiene acceso completo a todas las cuatro instancias SPIP.

### Qué aporta Nextcloud para este proyecto

Nextcloud (`cloud.kilombo.top`) es el recurso de mayor valor que la contraseña desbloquea. Puede contener:
- Archivos de audio (WhatsApp, grabaciones) pendientes de transcripción — ver `ROADMAP.md` §3
- Imágenes, PDFs y documentos de apoyo para artículos
- Borradores de artículos no publicados aún en SPIP
- Materiales compartidos por espacios aliados antes de publicación

Acceso WebDAV verificado: `https://cloud.kilombo.top/remote.php/dav/files/kilombo/`

### Contenido público sin contraseña

Las 4 instancias SPIP de la red más las 2 webapps estáticas son **completamente públicas** sin autenticación — todos los artículos publicados son accesibles por scraping anónimo. Ver `TROUBLESHOOTING.md` §7 para más detalle sobre este punto.

---



```
KILOMBO/
├── site/                  ← Código fuente del sitio web publicado en GitHub Pages y kilombo.top
│   ├── index.html         ← Página principal — estructura de las 4 secciones
│   ├── plandemismo.html   ← Sección 03: NOM / Plandemismo + videos Canal7 (3 pestañas)
│   ├── articulos.html     ← Índice de artículos internos (JSON → HTML)
│   ├── articulo.html      ← Página de detalle de un artículo (por `?id=...`)
│   ├── css/
│   │   ├── style.css      ← Estilos generales (paleta papel+tinta+rojo, tipografía editorial)
│   │   └── plandemismo.css ← Estilos específicos de la sección Plandemismo (videos, tabs)
│   │   └── articles.css   ← Estilos mínimos para el sistema de artículos internos
│   ├── js/
│   │   ├── main.js        ← Accesibilidad global (teclado Enter/Espacio en tarjetas no-anchor)
│   │   ├── plandemismo.js ← Tabs WAI-ARIA, fetch+render de tarjetas desde JSON, page guard
│   │   ├── articles.js    ← Índice y detalle de artículos internos (fetch+render desde JSON)
│   │   ├── render.mjs     ← Módulo ES puro: escapeHtml, sanitizeHtml, buildLangs, renderCard (compartido con tests)
│   │   └── decrypt.mjs    ← Módulo ES puro: descifra envelopes JSON cifrados por StatiCrypt (no-op en dev)
│   └── assets/            ← Scaffolding versionado con .gitkeep (contenido pendiente de poblar)
│       ├── data/          ← JSON de vídeos: plandemismo-actualidad.json, plandemismo-sida-covid.json
│       ├── content/       ← JSON de contenido interno: `articles.json` (artículos)
│       ├── subtitles/     ← Archivos .vtt de subtítulos (FR prioritario — pendiente)
│       ├── audios/        ← Audios WhatsApp en MP3 estandarizado (pendiente)
│       └── transcripts/   ← Transcripciones MD/HTML con timestamps (pendiente)
│
├── test/
│   ├── render.test.mjs    ← Tests unitarios: escapeHtml, sanitizeHtml, buildLangs, buildKeypoints, renderCard
│   └── articles.test.mjs  ← Tests unitarios: sectionLabel, renderTopics, renderArticleCard
│
├── scripts/
│   ├── test.sh            ← Runner de tests: unit tests + validate-data + check-urls
│   ├── encrypt.mjs        ← Cifra HTML + JSON con StatiCrypt antes del deploy a GitHub Pages
│   ├── validate-data.mjs  ← Validador de esquemas para JSON (videos + contenido interno)
│   └── check-urls.mjs     ← Comprueba consistencia de URLs entre .env.example, index.html y README
│
├── .github/
│   └── workflows/
│       └── deploy.yml     ← GitHub Actions: publica site/ en GitHub Pages en cada push a main
│
├── INICIO/                ← Documentación de fase de diagnóstico
│   ├── ROADMAP-fase-diagnostico.md ← Hoja de ruta de 5 fases
│   ├── inventario-inicial-kilombo.md
│   └── pasos-trabajo-kilombo.md
│
├── docs/                  ← Documentación operativa y de referencia
│   ├── MIGRATION.md               ← Relación entre kilombo.top (SPIP) y el portal espejo (GitHub Pages)
│   ├── TROUBLESHOOTING.md         ← Diagnóstico de acceso al servidor + flujo de publicación en GitHub Pages
│   ├── TO_FIX.md                  ← Bugs y pendientes activos
│   ├── SITE_ANALYSIS.md           ← Inventario en vivo del sitio origen (www.kilombo.top)
│   ├── MIRROR_GROWING.md          ← Guía de crecimiento del espejo (qué importar y cómo)
│   ├── PENDING-REVIEW.md          ← Artículos con status: pending-review y sus pasos de resolución
│   ├── EXTRACTION-GAPS-FIXED.md   ← Historial de gaps de extracción corregidos
│   ├── DEPLOYMENT-AND-SOURCE-EDITING.md ← Notas de despliegue y edición de fuente
│   └── BUILD-TRIGGER.md           ← Notas sobre disparo de build
│
├── .env                   ← Credenciales y referencias externas (NO SUBIR A REPO PÚBLICO)
├── .env.example           ← Plantilla de .env (segura, para subir al repo)
├── end-of-session.sh      ← Ejecutar al terminar cada sesión: push a GitHub + deploy a kilombo.top
├── start-preview.sh       ← Túnel Serveo para preview local temporal
├── sync-to-production.sh  ← Deploy manual a kilombo.top via rsync/scp
├── README.md              ← Este archivo
├── ROADMAP.md             ← Hoja de ruta técnica (pasos numerados)
└── CHANGELOG.md           ← Historial de versiones
```

---
## Preparación para subir a GitHub

Antes de publicar, asegúrate de que el repositorio cumple estas condiciones:

- Ejecuta `npm test` y confirma que todas las comprobaciones pasan.
- Comprueba que `.env` y `dist/` no estén rastreados por Git.
- Usa `.env.example` como plantilla pública y no subas credenciales reales.
- Verifica que `.github/workflows/deploy.yml` existe para publicar en GitHub Pages.
- Tiene un hook `pre-push` que puede pausar `git push` si hay cambios en `site/`; revisa la vista previa local antes de continuar.
- Si necesitas hacer push desde un entorno automatizado, usa `SKIP_PREVIEW_CHECK=1 git push origin main`.
- Revisa `package.json` y añade `author`, `repository`, `homepage` o descripción si quieres mejorar el metadata del paquete.
- Asegúrate de que no hay datos sensibles en los archivos versionados.

> Esta sección resume las recomendaciones necesarias para subir el proyecto de forma segura y coherente.

---
## Convenciones del proyecto

- **Comunicación entre equipo (humano/IA):** Inglés
- **Contenido del sitio, etiquetas y documentación visible del proyecto:** Español
- **URLs externas:** Enlazan a las plataformas reales de `kilombo.top` y abren en pestaña nueva (`target="_blank" rel="noopener"`)

### Modelo de confianza del contenido — `articles.json`

Los campos simples de un artículo (`title`, `date`, `status`, `sourceSite`, cada `topic`) siempre pasan por `escapeHtml()` antes de insertarse en el DOM. El campo `contentHtml` es HTML enriquecido — pensado para párrafos, enlaces, listas — así que **no** se puede simplemente escapar como texto plano; en su lugar pasa por `sanitizeHtml()` (`site/js/render.mjs`), que reduce el HTML a un allowlist de etiquetas de formato y elimina `<script>`, atributos de evento y URLs `javascript:`/`data:`. `scripts/validate-data.mjs` aplica una comprobación equivalente en `npm test`, así que un `contentHtml` peligroso falla el build antes de llegar a producción, no solo en el navegador. Aun así: dado que el esquema permite varios valores de `status` (ver enum completo en `site/assets/content/ARTICLES.schema.md`) para artículos provenientes de `sourceUrl` externas, cualquier `contentHtml` importado debe revisarse editorialmente antes de mergear a `main` — el saneado técnico evita XSS, no sustituye la revisión de contenido.

---

## Desarrollo local

Levantar un servidor HTTP desde la carpeta `site/`:

```bash
cd site
python3 -m http.server 8080
```

Abrir `http://localhost:8080` en el navegador.

El sitio es **100% estático** — no requiere build step, dependencias ni backend.

---

## Flujo de trabajo por sesión

### Durante la sesión — previsualizar en GitHub Pages

Edita libremente en `site/`, haz commit y push a `main`:

```bash
git add site/
git commit -m "content: descripción del cambio"
git push origin main
```

> **Nota sobre el hook `pre-push`:** Si el commit incluye cambios en `site/`, `git push` pausará pidiendo confirmación interactiva de que has revisado los cambios en local (`npm run preview`). Debes pulsar `ENTER` para continuar. Si haces push desde un entorno automatizado o sin terminal interactiva, utiliza `SKIP_PREVIEW_CHECK=1 git push origin main` para saltarte la pausa.

GitHub Pages publica los cambios en **~30 segundos**:
**🌍 https://ukoquique-proves.github.io/kilombo/**

### Al terminar la sesión — deploy completo

```bash
./end-of-session.sh
```

Hace en orden:
1. Push a GitHub → GitHub Pages actualizado
2. Sincroniza `kilombo.top` via rsync/scp

Si el puerto SSH (22) no está accesible en ese momento, el script lo detecta, avisa, y deja GitHub Pages actualizado igualmente. Instrucciones para abrir el puerto en `TROUBLESHOOTING.md` sección 4.

---

## Paleta y diseño

| Elemento | Valor |
|----------|-------|
| Fondo (papel) | `#fcfbf7` |
| Texto (tinta) | `#121212` |
| Acento rojo / crimson | `#b91c2a` |
| Rojo oscuro para bordes temáticos | `#8b0000` |
| Idioma ES | Verde `#1b5e20` |
| Idioma FR | Azul `#0d47a1` |
| Idioma EN | Púrpura `#311b92` |
| Multilingüe | Morado `#4a148c` |
| Tipografía titulares | Playfair Display (serif) |
| Tipografía cuerpo | Inter (sans-serif) |
| Tipografía metadata / badges | Courier New (monoespacio) |

---

## Próximos pasos (pendientes)

- [ ] Revisar estilos visuales con el cliente (paleta, tipografía, sensación general)
- [ ] Incorporar logos o imágenes de cabecera (`assets/`)
- [ ] Ajustar los textos descriptivos de cada tarjeta al tono editorial definitivo
- [ ] Obtener URLs reales de cada vídeo en Canal7 y actualizar `assets/data/plandemismo-actualidad.json`
- [ ] Validar enlaces y URLs con el cliente antes de publicar
- [ ] Resolver acceso SSH/SFTP al servidor (ver `TROUBLESHOOTING.md` sección 4) — necesario para `./end-of-session.sh` paso 2
- [ ] Generar archivos `.vtt` de subtítulos FR para los vídeos prioritarios (IDs 167, 1111, 2250, 2252)
- [ ] Continuar construyendo el espejo hasta que el cliente apruebe el reemplazo de `kilombo.top` (ver `MIGRATION.md`)
