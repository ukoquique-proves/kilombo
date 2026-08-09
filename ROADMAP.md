# Hoja de ruta técnica — Kilombo Portal

> Objetivo: construir, poblar y publicar el portal central de Kilombo con la estructura de 4 secciones definida, integrando contenido de fuentes externas y estableciendo un flujo claro de despliegue. Ver [`MIRROR_GROWING.md`](MIRROR_GROWING.md) para las reglas de incorporación de contenido, criterios de diseño y sincronización con otros procesos.

---

## PRIMEROS PASOS (inmediatos / alta prioridad)

### 1. Establecer flujo claro de subida de modificaciones al sitio

**Flujo de trabajo definido:**
- **Durante la sesión** → push libremente a `main` para previsualizar en GitHub Pages (`https://ukoquique-proves.github.io/kilombo/`). Cada push se publica en ~30 segundos.
- **Al finalizar la sesión** → ejecutar `./end-of-session.sh`. Hace ambas cosas en orden: push a GitHub + deploy a `kilombo.top`.

- [x] **1.1 Evaluar opciones de despliegue** — elegida Opción B (GitHub Actions) para preview permanente + rsync/scp para producción
- [x] **1.2 Implementar la opción elegida** — GitHub Pages activo en `https://ukoquique-proves.github.io/kilombo/`
- [x] **1.3 Documentar paso a paso en `README.md` sección "Despliegue"**
- [x] **1.4 Crear `end-of-session.sh`** — script de fin de sesión que pushea a GitHub y sincroniza `kilombo.top` en un solo paso. Si el puerto 22 está cerrado, avisa y deja GitHub Pages actualizado igualmente.
- [ ] **1.5 Prueba de deploy en `kilombo.top`** — pendiente de que el puerto 22 sea accesible (ver TROUBLESHOOTING.md sección 4)

---

### 2. Integrar contenido nuevo: sección Plandemismo + videos de `tv.canal7salta.com`

La sección **"Nuevo Orden Mundial: plandemismo y domesticación"** debe expandirse incorporando materiales compartidos por los compañeros de `tv.canal7salta.com` (espacio amigo y aliado).

#### Criterios de selección y estructura (indicaciones del cliente):
- **Fuentes:** los contenidos provienen de espacios amigos, así que el tono es de colaboración y respeto — nunca de "curación" o "filtro de calidad".
- **Selección de línea:** se integran los videos que encajan con la línea editorial de este espacio; se dejan fuera aquellos que el cliente considera no ajustados.
- **Inclusión obligatoria:** Documental **"Elisa mato a Ruth"** (2018, España) — el montaje SIDA como antecesor del montaje COVID.
- **Orden de publicación:** Empezar por **videos de ACTUALIDAD**. Los videos HISTÓRICOS (más antiguos, de archivo) se cargan después y se titulan de forma distinta, en una sección separada.
- **Idiomas / traducciones:** Facilitar subtítulos en **francés** (y eventualmente otros idiomas) — ver Paso sobre traducciones.
- **Categorías base del material de Canal7:** Datos estadísticos / Crisis médica internacional / Médicos éticos / Falsos virus & no aislamiento / OMS / Grafeno & contenido de viales / SIDA-Antecesor del COVID

- [x] **2.1 Inventario y selección de materiales**
  - 9 vídeos de Actualidad seleccionados (sin Chinda), 1 documental SIDA→COVID destacado.
  - `assets/data/plandemismo-actualidad.json` ✅ creado (9 vídeos)
  - `assets/data/plandemismo-sida-covid.json` ✅ creado (1 documental)
  - `assets/data/plandemismo-historicos.json` — pendiente (lote posterior)
- [x] **2.2 Diseñar la integración en el portal**
  - `plandemismo.html` creada con 3 tabs: Actualidad / SIDA→COVID / Históricos (Próximamente)
  - Enlace desde tarjeta sección 03 del índice ✅
- [x] **2.3 Construir el componente de videos**
  - Tarjetas renderizadas desde JSON por `plandemismo.js` (función `renderVideoCards`) ✅
  - Metadatos de subtítulos en los JSON (`subtitlesFr`) ✅
- [x] **2.4 Poblar lote 1: Actualidad** — 9 vídeos en `plandemismo-actualidad.json` ✅
- [x] **2.5 Poblar lote 2: SIDA → COVID** — documental "ELISA MATO A RUTH" en `plandemismo-sida-covid.json` ✅
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
- [ ] **Indicadores visuales explícitos Nivel 1 (directorio) vs. Nivel 2 (espejo real)** — ver `MIRROR_GROWING.md §0` para la definición de los dos niveles. Especificación mínima para cerrar este ítem:
  - [ ] Nueva variante de badge, p. ej. `.card-status--external` (Nivel 1) vs. `.card-status--mirrored` (Nivel 2), añadida junto a las existentes `.card-status--active` / `--archive` / `--legacy` en `style.css`
  - [ ] Icono o texto corto y consistente en el badge (p. ej. "↗ Externo" vs. "Espejo") — no solo color, para cumplir el requisito de accesibilidad de `MIRROR_GROWING.md §4.6` ("no usar color como único indicador de estado")
  - [ ] Aplicar la nueva clase a **todas** las tarjetas de `index.html`: Nivel 1 = las que apuntan a `icg-gci.kilombo.top`, `in.kilombo.top`, `cdrom.kilombo.top`, `icg-old.kilombo.top`, `proletariosinternacionalistas.kilombo.top`, `www.kilombo.top`; Nivel 2 = las que apuntan a `articulos.html` / `plandemismo.html`
  - [ ] Test de regresión simple (o checklist manual) que falle si se añade una tarjeta nueva a `index.html` sin badge de nivel — evita que este ítem se resuelva una vez y luego se erosione con el siguiente artículo/enlace añadido

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

- [x] **7.1 Instalar staticrypt** como devDependency (`npm install --save-dev staticrypt`) ✅
- [x] **7.2 Crear `scripts/encrypt.mjs`** — cifra las 3 páginas de contenido y todos los JSON de assets usando la CLI de staticrypt ✅
- [x] **7.3 Actualizar `deploy.yml`** — paso de cifrado añadido entre `npm test` y upload; lee contraseña desde el secret `STATICRYPT_PASSWORD` ✅
- [x] **7.4 Añadir `STATICRYPT_PASSWORD` como GitHub Actions Secret** en la configuración del repositorio ✅
- [x] **7.5 Verificar en GitHub Pages** — páginas cifradas muestran el formulario de contraseña; el contenido se descifra correctamente al introducirla ✅
- [x] **7.6 Verificar que `index.html` sigue siendo público** — confirmado: `index.html` PUBLIC, las otras tres GATED ✅

---

### 8. Revisión de diseño y experiencia de usuario
- [ ] Revisión visual completa con el cliente (paleta, tipografía, sensación)
- [ ] **Ilustraciones / iconografía por sección** — el sitio `kilombo.top` original usaba logos y dibujos que daban calidez visual a cada sección. El espejo debe incorporar imágenes representativas propias, diseñadas con coherencia real respecto al significado de cada sección (Tierra y Libertad, GCI, Proletarios Internacionalistas, NOM/Plandemismo) — no copias de las originales, que carecían de representación coherente. Pueden ser ilustraciones SVG, iconografía editorial o imágenes de dominio público seleccionadas por criterio político y estético.
- [ ] Incorporar logotipos / marcas de cada plataforma en sus tarjetas correspondientes (pendiente de obtener assets de cada espacio amigo)
- [ ] Imagen de portada / banner principal en la cabecera
- [ ] Testear en móvil, tablet y escritorio
- [ ] Testear accesibilidad (contrastes, teclado, lectores de pantalla)

### 9. SEO y metadatos
- [ ] Meta tags (description, Open Graph, Twitter Cards) por página
- [ ] Favicon y apple-touch-icon
- [ ] `sitemap.xml`
- [ ] `robots.txt`

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
| **1. Flujo de subida / deploy** | ✅ GitHub Pages activo (`ukoquique-proves.github.io/kilombo/`) — deploy a `kilombo.top` aplazado a fase futura | — |
| **2. Plandemismo + videos Canal7 (Actualidad + SIDA→COVID)** | ✅ Construido y poblado — pendiente URLs reales y subtítulos FR | — |
| **3. Transcripción + publicación audios WhatsApp** | Pendiente | 2 – 7 días |
| 4. Contenido editorial por sección (incl. referencias cruzadas automáticas) | Pendiente | 2 – 4 días |
| **5. Traducciones / puesta al día de idiomas (GCI, subtítulos FR)** | Pendiente | 3 – 10 días |
| 6. Organización por idiomas dentro de cada sección | Pendiente | 1 – 2 días |
| **7. Protección de acceso — StatiCrypt (cifrado AES-256 client-side)** | ✅ Implementado y verificado en GitHub Pages | — |
| 8. Revisión diseño + UX | Pendiente | 1 día |
| 9. SEO y metadatos | Pendiente | 0.5 día |
| **10. Deploy a `kilombo.top`** | Pendiente — solo requiere abrir puerto 22 desde el panel YunoHost (sin necesitar a los administradores) | 0.5 día |
| 11–12. Mantenimiento (documentación) | Pendiente | 0.5 día |

