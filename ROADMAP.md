# Hoja de ruta técnica — Kilombo Portal

> Objetivo: construir, poblar y publicar el portal central de Kilombo con la estructura de 4 secciones definida, integrando contenido de fuentes externas y estableciendo un flujo claro de despliegue.

---

## PRIMEROS PASOS (inmediatos / alta prioridad)

### 1. Establecer flujo claro de subida de modificaciones al sitio
Definir y documentar cómo pasar de cambios en local (`/site`) a producción en `kilombo.top`:

- [ ] **1.1 Evaluar opciones de despliegue**
  - Opción A: SFTP/SCP manual al directorio de YunoHost
  - Opción B: Repositorio GitHub + Action de despliegue automático (rsync/SFTP)
  - Opción C: Script `deploy.sh` local con rsync + credenciales SSH
- [x] **1.2 Implementar la opción elegida**
  - GitHub Pages via GitHub Actions (`gh-pages` branch → luego `main` + workflow). URL permanente: `https://ukoquique-proves.github.io/kilombo/`
- [x] **1.3 Documentar paso a paso en `README.md` sección "Despliegue"**
- [ ] **1.4 Prueba de despliegue en `kilombo.top`** — *bloqueado hasta resolver acceso SSH (ver TROUBLESHOOTING.md)*

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
No solo enlaces externos; agregar dentro del propio portal:

- [ ] **4.1 Espacio Tierra y Libertad** — artículos destacados, últimos textos publicados, sección "En portada"
- [ ] **4.2 GCI** — últimos comunicados oficiales, biblioteca de textos programáticos por idioma (ES/EN/FR), acceso directo al CD-Rom con categorías
- [ ] **4.3 Proletarios Internacionalistas** — últimos números/artículos separados por edición (ES / FR)
- [ ] **4.4 NOM / Plandemismo** — además de los videos: artículos, dossieres, infografías, líneas de tiempo cronológicas

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

---

## FASE 3 — Publicación y ajustes finales

### 7. Revisión de diseño y experiencia de usuario
- [ ] Revisión visual completa con el cliente (paleta, tipografía, sensación)
- [ ] Incorporar logotipos / marcas de cada plataforma en sus tarjetas correspondientes
- [ ] Imagen de portada / banner principal en la cabecera
- [ ] Testear en móvil, tablet y escritorio
- [ ] Testear accesibilidad (contrastes, teclado, lectores de pantalla)

### 8. SEO y metadatos
- [ ] Meta tags (description, Open Graph, Twitter Cards) por página
- [ ] Favicon y apple-touch-icon
- [ ] `sitemap.xml`
- [ ] `robots.txt`

### 9. Despliegue final
- [ ] Ejecutar el flujo de subida definido en el Paso 1
- [ ] Configurar en `kilombo.top` que la URL raíz o la URL del portal apunte a este nuevo sitio
- [ ] Verificar que todos los enlaces salientes funcionan
- [ ] Probar desde red externa (no solo intranet/local)

---

## FASE 4 — Mantenimiento

### 10. Rutina de actualización
- [ ] Documentar cómo agregar un nuevo artículo/video/comunicado/audio/traducción
- [ ] Calendario sugerido de revisión (semanal de enlaces, mensual de contenido, trimestral de atraso de traducciones)
- [ ] Checklist rápido de publicación (ver formato, enlaces, idiomas disponibles, categorías)

### 11. Monitoreo
- [ ] Detección de enlaces rotos (herramienta de crawl automático)
- [ ] Registro de mejoras pendientes (`issues` en GitHub o lista en markdown)

---

## Resumen de prioridad

| Bloque | Estado | Tiempo estimado |
|--------|--------|-----------------|
| **1. Flujo de subida / deploy** | ✅ GitHub Pages activo (`ukoquique-proves.github.io/kilombo/`) — deploy a `kilombo.top` aplazado a fase futura | — |
| **2. Plandemismo + videos Canal7 (Actualidad + SIDA→COVID)** | ✅ Construido y poblado — pendiente URLs reales y subtítulos FR | — |
| **3. Transcripción + publicación audios WhatsApp** | Pendiente | 2 – 7 días |
| 4. Contenido editorial por sección | Pendiente | 2 – 4 días |
| **5. Traducciones / puesta al día de idiomas (GCI, subtítulos FR)** | Pendiente | 3 – 10 días |
| 6. Organización por idiomas dentro de cada sección | Pendiente | 1 – 2 días |
| 7. Revisión diseño + UX | Pendiente | 1 día |
| 8. SEO y metadatos | Pendiente | 0.5 día |
| **9. Migración a `kilombo.top`** | ⏸ Aplazado — requiere coordinación con el equipo YunoHost (otra fase) | — |
| 10–11. Mantenimiento (documentación) | Pendiente | 0.5 día |
