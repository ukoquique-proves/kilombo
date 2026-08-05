# Kilombo — Portal de publicaciones y archivos comunistas internacionalistas

Portal central de acceso a la red de sitios de Kilombo. Construido como página estática (HTML, CSS, JS) para ser alojado en la infraestructura YunoHost de `kilombo.top`.

> **Este portal es el nuevo diseño de `kilombo.top`, construido en paralelo para que el cliente pueda comparar original y nuevo sin tocar el sitio en producción.** Cuando el cliente apruebe el espejo, reemplaza a `kilombo.top` con un solo deploy. Ver [`MIGRATION.md`](MIGRATION.md).

---

## Sobre el contenido y las fuentes

**Kilombo no funciona solo.** El portal integra y enlaza materiales producidos por una **red de espacios amigos y aliados políticos** con los que compartimos línea y objetivos de difusión revolucionaria internacionalista.

### Fuentes / espacios colaboradores

| Espacio | URL | Tipo de colaboración |
|---------|-----|----------------------|
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

## Estructura de archivos

```
KILOMBO/
├── site/                  ← Código fuente del sitio web publicado en GitHub Pages y kilombo.top
│   ├── index.html         ← Página principal — estructura de las 4 secciones
│   ├── plandemismo.html   ← Sección 03: NOM / Plandemismo + videos Canal7 (3 pestañas)
│   ├── css/
│   │   ├── style.css      ← Estilos generales (paleta papel+tinta+rojo, tipografía editorial)
│   │   └── plandemismo.css ← Estilos específicos de la sección Plandemismo (videos, tabs)
│   ├── js/
│   │   ├── main.js        ← Accesibilidad global (teclado Enter/Espacio en tarjetas no-anchor)
│   │   ├── plandemismo.js ← Tabs WAI-ARIA, fetch+render de tarjetas desde JSON, page guard
│   │   └── render.mjs     ← Módulo ES puro: escapeHtml, buildLangs, renderCard (compartido con tests)
│   └── assets/            ← Scaffolding versionado con .gitkeep (contenido pendiente de poblar)
│       ├── data/          ← JSON de vídeos: plandemismo-actualidad.json, plandemismo-sida-covid.json
│       ├── subtitles/     ← Archivos .vtt de subtítulos (FR prioritario — pendiente)
│       ├── audios/        ← Audios WhatsApp en MP3 estandarizado (pendiente)
│       └── transcripts/   ← Transcripciones MD/HTML con timestamps (pendiente)
│
├── test/
│   └── render.test.mjs    ← 32 tests unitarios: escapeHtml, buildLangs, buildKeypoints, renderCard
│
├── scripts/
│   ├── test.sh            ← Runner de tests: unit tests + validate-data + check-urls
│   ├── validate-data.mjs  ← Validador de esquema para los JSON de vídeos
│   └── check-urls.mjs     ← Comprueba consistencia de URLs entre .env.example, index.html y README
│
├── .github/
│   └── workflows/
│       └── deploy.yml     ← GitHub Actions: publica site/ en GitHub Pages en cada push a main
│
├── INICIO/                ← Documentación de fase de diagnóstico
│   ├── ROADMAP.md         ← Hoja de ruta de 5 fases
│   ├── inventario-inicial-kilombo.md
│   └── pasos-trabajo-kilombo.md
│
├── .env                   ← Credenciales y referencias externas (NO SUBIR A REPO PÚBLICO)
├── .env.example           ← Plantilla de .env (segura, para subir al repo)
├── end-of-session.sh      ← Ejecutar al terminar cada sesión: push a GitHub + deploy a kilombo.top
├── start-preview.sh       ← Túnel Serveo para preview local temporal
├── sync-to-production.sh  ← Deploy manual a kilombo.top via rsync/scp
├── README.md              ← Este archivo
├── ROADMAP.md             ← Hoja de ruta técnica (pasos numerados)
├── MIGRATION.md           ← Relación entre kilombo.top (SPIP) y el portal espejo (GitHub Pages)
├── TROUBLESHOOTING.md     ← Diagnóstico de acceso al servidor + flujo de publicación en GitHub Pages
├── TO_FIX.md              ← Bugs y pendientes activos
└── CHANGELOG.md           ← Historial de versiones
```

---

## Convenciones del proyecto

- **Comunicación entre equipo (humano/IA):** Inglés
- **Contenido del sitio, etiquetas y documentación visible del proyecto:** Español
- **URLs externas:** Enlazan a las plataformas reales de `kilombo.top` y abren en pestaña nueva (`target="_blank" rel="noopener"`)

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
| Fondo (papel) | `#f5f2eb` |
| Texto (tinta) | `#0a0a0a` |
| Acento rojo revolucionario | `#c1121f` |
| Rojo oscuro para bordes temáticos | `#8b0000` |
| Idioma ES | Verde `#1b5e20` |
| Idioma FR | Azul `#0d47a1` |
| Idioma EN | Púrpura `#311b92` |
| Multilingüe | Morado `#4a148c` |
| Tipografía general | Verdana, Arial, Helvetica, sans-serif (alineada con SPIP Escal 5.2.9 de producción) |
| Tipografía metadata (etiquetas) | Courier New (monoespacio) |

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
