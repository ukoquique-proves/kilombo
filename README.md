# Kilombo — Portal de publicaciones y archivos comunistas internacionalistas

Portal central de acceso a la red de sitios de Kilombo. Construido como página estática (HTML, CSS, JS) para ser alojado en la infraestructura YunoHost de `kilombo.top`.

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
├── site/                  ← Código fuente del sitio web (el que se sube al servidor)
│   ├── index.html         ← Página principal — estructura de las 4 secciones
│   ├── plandemismo.html   ← Sección 03: NOM / Plandemismo + videos Canal7 (3 pestañas)
│   ├── css/
│   │   ├── style.css      ← Estilos generales (paleta papel+tinta+rojo, tipografía editorial)
│   │   └── plandemismo.css ← Estilos específicos de la sección Plandemismo (videos, tabs)
│   ├── js/
│   │   ├── main.js        ← Accesibilidad global (teclado Enter/Espacio en tarjetas no-anchor)
│   │   └── plandemismo.js ← Tabs WAI-ARIA, fetch+render de tarjetas desde JSON, page guard
│   └── assets/            ← Scaffolding versionado con .gitkeep (contenido pendiente de poblar)
│       ├── data/          ← Inventarios JSON — plandemismo-actualidad.json, plandemismo-sida-covid.json (ya creados)
│       ├── subtitles/     ← Archivos .vtt de subtítulos (FR prioritario — pendiente)
│       ├── audios/        ← Audios WhatsApp en MP3 estandarizado (pendiente)
│       └── transcripts/   ← Transcripciones MD/HTML con timestamps (pendiente)
│
├── INICIO/                ← Documentación de fase de diagnóstico
│   ├── ROADMAP.md         ← Hoja de ruta de 5 fases
│   ├── inventario-inicial-kilombo.md   ← Inventario de sitios detectados
│   └── pasos-trabajo-kilombo.md        ← Flujos de trabajo con/sin credenciales
│
├── .env                   ← Credenciales y referencias externas (NO SUBIR A REPO PÚBLICO)
├── .env.example           ← Plantilla de .env (segura, para subir al repo)
├── README.md              ← Este archivo
└── ROADMAP.md             ← Hoja de ruta TÉCNICA del proyecto (pasos numerados)
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

## Sitio público permanente (GitHub Pages)

El portal está publicado de forma permanente en GitHub Pages:

**🌍 https://ukoquique-proves.github.io/kilombo/**

- Se actualiza **automáticamente** con cada `git push origin main` — no requiere acción manual.
- El workflow que lo gestiona está en `.github/workflows/deploy.yml`.
- URL estable y permanente — válida para compartir con el cliente en cualquier momento.

---

## Desarrollo local

Levantar un servidor HTTP desde la carpeta `site/` para trabajar en local:

```bash
cd site
python3 -m http.server 8080
```

Abrir `http://localhost:8080` en el navegador.

El sitio es **100% estático** — no requiere build step, dependencias ni backend.

---

## Preview temporal (Serveo) — solo para sesiones de trabajo

Si necesitas compartir cambios locales **antes de hacer push** (por ejemplo para validar algo rápido con el cliente), puedes usar el túnel Serveo:

```bash
./start-preview.sh
```

Levanta el servidor local y abre un túnel HTTPS temporal. La URL cambia en cada sesión y muere cuando se cierra la terminal — **no es apta para compartir con el cliente como referencia permanente**. Para eso, usar la URL de GitHub Pages.

---

## Subida a producción real (kilombo.top)

Cuando el cliente apruebe los cambios y se resuelva el acceso SSH (ver `TROUBLESHOOTING.md`), usar:

```bash
./sync-to-production.sh
```

1.  Lee las credenciales del `.env` (host, usuario, puerto, ruta remota).
2.  Pide escribir la palabra `PROD` como medida de seguridad.
3.  Usa **rsync** (con `--delete` para que quede idéntico) o scp si rsync no existe.

### A mano (si prefieres)

```bash
# Con rsync (recomendado)
rsync -avz --delete -e 'ssh -p 22' site/ admin@kilombo.top:/var/www/kilombo.top/

# Con scp — usar punto final para copiar contenidos, no el directorio
scp -P 22 -r site/. admin@kilombo.top:/var/www/kilombo.top/
```

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
- [ ] Resolver acceso SSH/SFTP al servidor (ver `TROUBLESHOOTING.md`) y subir `site/` a `kilombo.top`
- [ ] Generar archivos `.vtt` de subtítulos FR para los vídeos prioritarios (IDs 167, 1111, 2250, 2252)
