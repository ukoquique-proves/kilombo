# TROUBLESHOOTING — Kilombo server connection

Diagnóstico completo del intento de conexión al servidor `kilombo.top` realizado el 2026-08-03.

**Para un análisis completo y datos vivos del sitio www.kilombo.top** (estructura SPIP, artículos, vídeos, estado de acceso), ver [`SOURCE_VISITING.md`](SOURCE_VISITING.md).

---

## Resumen ejecutivo

El servidor está en pie y respondiendo. Estado actual de acceso:

1. **Credenciales resueltas** — usuario `kilombo`, contraseña en `.env` como `KILOMBOTOP_PASSWORD`. Ambas APIs de YunoHost autentican correctamente.
2. **Puerto SSH (22) cerrado a nivel de firewall** — no hay acceso directo por SSH/SFTP desde máquinas externas. Es el único bloqueo activo para `sync-to-production.sh`.
3. **`kilombo` no es administrador SPIP** — el usuario tiene acceso al panel YunoHost completo pero no al backend de SPIP en `www.kilombo.top/ecrire/`.

### Qué podemos hacer ahora mismo

| Acción | Método | Estado |
|--------|--------|--------|
| Panel YunoHost (gestión de apps, usuarios, dominios) | `https://kilombo.top/yunohost/admin/` con `kilombo:KILOMBOTOP_PASSWORD` | ✅ Funciona |
| Nextcloud (gestor de ficheros web) | `https://cloud.kilombo.top/` con SSO | ✅ Funciona |
| Webmail | `https://mail.kilombo.top/` con SSO | ✅ Funciona |
| Backend SPIP (`www.kilombo.top/ecrire/`) | SSO + permisos SPIP | ❌ `kilombo` no es admin SPIP |
| SSH / SFTP / `sync-to-production.sh` | Puerto 22 | ❌ Firewall bloquea IPs externas |

---

## 1. Estado de la red

### Lo que funciona
| Puerto | Protocolo | Estado |
|--------|-----------|--------|
| 80 | HTTP | ✅ Abierto (redirige a HTTPS) |
| 443 | HTTPS | ✅ Abierto — todos los servicios responden |

### Lo que está bloqueado
| Puerto | Protocolo | Estado |
|--------|-----------|--------|
| 22 | SSH / SFTP | ❌ `Connection refused` — cerrado en el firewall |
| 2222, 2200, 8022, 8080, 22222 | SSH alternativo | ❌ `Connection timed out` |

**Conclusión:** El puerto 22 no está simplemente sin escuchar — está activamente rechazado (`Connection refused`), lo que indica una regla de firewall explícita. Es probable que YunoHost tenga configurado `fail2ban` o `ufw` bloqueando SSH desde IPs externas, o que el proveedor de hosting filtre ese puerto.

---

## 2. Infraestructura detectada en el servidor

El servidor corre **YunoHost** con las siguientes aplicaciones registradas (obtenidas vía `/yunohost/portalapi/me` con usuario autenticado):

| App ID | Label | Dominio | Tipo | Acceso público |
|--------|-------|---------|------|----------------|
| `spip.main` | Espacio Tierra y Libertad | `www.kilombo.top` | SPIP 4.4.15 | ✅ Público |
| `spip__2.main` | Proletarios Internacionalistas | `proletariosinternacionalistas.kilombo.top` | SPIP | ✅ Público |
| `spip__3.main` | International Global Revolution | `in.kilombo.top` | SPIP | ✅ Público |
| `spip__4.main` | GCI / ICG — Sitio oficial | `icg-gci.kilombo.top` | SPIP | ✅ Público |
| `my_webapp.main` | ICG / GCI CD-Rom | `cdrom.kilombo.top` | Static webapp + SFTP | ✅ Público |
| `my_webapp__3.main` | ICG — Sitio histórico | `icg-old.kilombo.top` | Static webapp + SFTP | ✅ Público |
| `nextcloud.main` | Nextcloud | `cloud.kilombo.top` | Nextcloud | 🔒 SSO |
| `redirect.main` | Redirect PI to Proletarios | `pi.kilombo.top` | Redirect | 🔒 SSO |
| `roundcube.main` | Webmail | `mail.kilombo.top` | Roundcube | 🔒 SSO |

> **Importante:** No existe ninguna app registrada para el dominio raíz `kilombo.top`. El portal nuevo necesita un nuevo `my_webapp` apuntando a `kilombo.top` — se puede crear desde el panel YunoHost con las credenciales actuales.

---

## 3. Fallo de autenticación YunoHost

### Endpoints probados

| Endpoint | Método | Resultado |
|----------|--------|-----------|
| `POST /yunohost/portalapi/login` | JSON `credentials: user:pass` | `401 Invalid password` |
| `POST /yunohost/api/login` | JSON `credentials: user:pass` | `401 Invalid password or username` |
| SPIP `/spip.php?page=login` | Form POST con nonce | Redirige al frontal — no entra |

### Combinaciones probadas

Se probaron 7 combinaciones de usuario/contraseña (3 nombres de usuario × varias contraseñas). Todas fallaron con HTTP 401. Las credenciales concretas no se registran aquí — consultar con el administrador del servidor para obtener las correctas.

### Resultado final (sesión posterior)

**Credenciales correctas:** usuario `kilombo`, contraseña en `.env` como `KILOMBOTOP_PASSWORD`.

- `POST /yunohost/portalapi/login` → ✅ `200 Logged in`
- `POST /yunohost/api/login` → ✅ `200 Logged in`
- El usuario `kilombo` pertenece al grupo `admins` de YunoHost — acceso completo al panel de administración en `https://kilombo.top/yunohost/admin/`

**Por qué fallaron los intentos anteriores:** el username es `kilombo`, no `admin`. Los intentos anteriores usaron `admin`, `kilombo@kilombo.top` y `ukoquique` — ninguno de ellos es correcto.

### Por qué el SPIP login tampoco funciona

El servidor devuelve la cabecera:
```
x-sso-wat: You've just been SSOed
```
Esto significa que SPIP está **detrás del SSO de YunoHost**. Autenticarse directamente en SPIP no funciona porque el proxy SSO intercepta la sesión. Hay que autenticarse primero en YunoHost para que el SSO propague la sesión a SPIP.

---

## 4. Cómo resolver los dos bloqueos restantes

### Bloqueo A — SSH/SFTP (port 22 cerrado desde IPs externas)

Necesario para `sync-to-production.sh`. Opciones:

**Opción A1 — Abrir port 22 desde el panel YunoHost (recomendado)**
Tenemos acceso al panel admin. Desde `https://kilombo.top/yunohost/admin/`:
- Herramientas → Firewall → Añadir regla para TCP puerto 22 desde la IP de esta máquina.

**Opción A2 — Ejecutar desde la red del administrador del servidor**
Si el puerto 22 está abierto solo en la red local del servidor, ejecutar `./sync-to-production.sh` directamente desde esa máquina.

**Opción A3 — Usar Nextcloud como puente de ficheros**
Tenemos acceso a Nextcloud en `https://cloud.kilombo.top/`. Se pueden subir ficheros del portal desde el navegador como solución provisional hasta resolver el SSH.

### Bloqueo B — `kilombo` no es administrador SPIP

El usuario `kilombo` tiene SSO pero no figura en la tabla de administradores de SPIP. Para editar el CMS de `www.kilombo.top`:

**Opción B1 — Añadir como admin desde la CLI de YunoHost**
Tenemos acceso al panel admin — desde allí se puede abrir un terminal o, una vez resuelto el SSH:
```bash
# En el servidor:
php /var/www/spip/ecrire/index.php --action=créer_admin
# o directamente en la base de datos SPIP
```

**Opción B2 — Acceder a la base de datos desde phpMyAdmin / Adminer**
Si YunoHost tiene phpMyAdmin instalado, se puede promover al usuario `kilombo` directamente en la tabla `spip_auteurs`.

---

## 5. Próximos pasos concretos

- [x] Confirmar credenciales correctas — **usuario: `kilombo`, contraseña: ver `.env`**
- [ ] Abrir puerto 22 desde el panel YunoHost → `https://kilombo.top/yunohost/admin/` → Herramientas → Firewall → TCP 22 (lo puede hacer el cliente directamente, sin necesitar a los administradores técnicos)
- [ ] Crear app `my_webapp` para `kilombo.top` raíz desde el panel YunoHost
- [ ] Ejecutar `./end-of-session.sh` al final de la próxima sesión de trabajo para hacer el primer deploy a `kilombo.top`

---

## 6. Publicación de contenido en GitHub Pages (flujo actual activo)

Mientras el acceso SSH a `kilombo.top` esté bloqueado, **GitHub Pages es el método de publicación activo**. Esta sección explica el flujo completo para que cualquier programador o agente IA pueda publicar cambios sin ambigüedad.

### URL pública permanente

```
https://ukoquique-proves.github.io/kilombo/
```

Se actualiza automáticamente en cada push a la rama `main`. No requiere intervención manual.

---

### Cómo funciona el deploy

El fichero `.github/workflows/deploy.yml` define un workflow de GitHub Actions que:

1. Se dispara en cada `push` a `main` (o manualmente vía `workflow_dispatch`).
2. Hace checkout del repo.
3. Sube el contenido de `./site/` como artefacto de Pages.
4. Lo publica en `https://ukoquique-proves.github.io/kilombo/`.

**Regla clave:** solo el contenido de `./site/` se publica. Todo lo demás (scripts, tests, docs, `.env.example`) queda en el repo pero no es visible en la web.

---

### Flujo estándar para publicar cambios (programador con acceso al repo)

```bash
# 1. Editar cualquier fichero dentro de site/
#    (HTML, CSS, JS, JSON de datos, subtítulos .vtt, etc.)

# 2. Verificar localmente
cd site && python3 -m http.server 8080
# abrir http://localhost:8080

# 3. Pasar los tests
npm test   # o: ./scripts/test.sh

# 4. Commit y push a main
git add site/
git commit -m "content: descripción del cambio"
git push origin main

# GitHub Actions despliega automáticamente en ~30 segundos.
```

---

### Flujo para un agente IA sin acceso a git push (entorno restringido)

En entornos donde `git push` sobre HTTPS cuelga (como el entorno actual de desarrollo), usar la **GitHub Contents API** directamente. El token necesario está en `.env` como `GITHUB_TOKEN`.

#### Publicar un archivo modificado

```bash
TOKEN="$(grep GITHUB_TOKEN .env | cut -d= -f2)"
FILE_LOCAL="site/assets/data/plandemismo-actualidad.json"
FILE_REPO="site/assets/data/plandemismo-actualidad.json"

# Obtener el SHA actual del fichero en el repo (necesario para actualizarlo)
SHA=$(curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/ukoquique-proves/kilombo/contents/$FILE_REPO" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('sha',''))")

# Codificar el contenido en base64
CONTENT=$(base64 -w 0 "$FILE_LOCAL")

# Construir el body JSON y hacer el PUT
python3 -c "
import json, sys
d = {'message': 'content: actualizar inventario de vídeos', 'content': sys.argv[1], 'sha': sys.argv[2]}
print(json.dumps(d))
" "$CONTENT" "$SHA" | \
curl -s -X PUT \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/ukoquique-proves/kilombo/contents/$FILE_REPO" \
  -d @- | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ OK:', d['commit']['sha'][:12] if 'commit' in d else '❌ '+str(d)[:100])"
```

El push via API dispara el workflow de Pages igual que un `git push` normal. El site se actualiza en ~30 segundos.

#### Publicar un archivo nuevo (sin SHA previo)

Igual que arriba pero omitir el campo `sha` en el body:

```bash
python3 -c "
import json, sys
print(json.dumps({'message': 'content: nuevo fichero', 'content': sys.argv[1]}))
" "$CONTENT" | \
curl -s -X PUT \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/ukoquique-proves/kilombo/contents/$FILE_REPO" \
  -d @- | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ OK' if 'commit' in d else '❌ '+str(d)[:100])"
```

#### Disparar el deploy manualmente (sin cambiar ningún fichero)

```bash
TOKEN="$(grep GITHUB_TOKEN .env | cut -d= -f2)"
curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/ukoquique-proves/kilombo/actions/workflows/deploy.yml/dispatches" \
  -d '{"ref":"main"}' -w "HTTP: %{http_code}\n"
# Respuesta esperada: HTTP: 204 (éxito)
```

#### Verificar el estado del último deploy

```bash
TOKEN="$(grep GITHUB_TOKEN .env | cut -d= -f2)"
curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/ukoquique-proves/kilombo/actions/runs?per_page=1" \
  | python3 -c "
import sys,json
r = json.load(sys.stdin)['workflow_runs'][0]
print(r['status'], '|', r.get('conclusion') or 'in_progress', '|', r['created_at'])
"
```

---

### Tipos de contenido y dónde editarlos

| Qué quieres cambiar | Fichero a editar |
|---------------------|-----------------|
| Añadir / editar un vídeo de Actualidad | `site/assets/data/plandemismo-actualidad.json` |
| Añadir / editar el documental SIDA→COVID | `site/assets/data/plandemismo-sida-covid.json` |
| Cambiar textos del portal principal | `site/index.html` |
| Cambiar textos de la página de vídeos | `site/plandemismo.html` |
| Añadir subtítulos FR a un vídeo | `site/assets/subtitles/{video-id}-fr.vtt` |
| Cambiar estilos visuales | `site/css/style.css` o `site/css/plandemismo.css` |
| Cambiar lógica JS | `site/js/plandemismo.js` o `site/js/render.mjs` |

**Regla para los JSON:** cada entrada del JSON de vídeos debe pasar la validación antes de publicar:

```bash
node scripts/validate-data.mjs
```

Si hay errores, se imprimen con el campo y el fichero exacto. Corregir antes de hacer push.

---

### Checklist de publicación rápida

```
[ ] Editar el/los fichero(s) en site/
[ ] node scripts/validate-data.mjs  → 0 errores
[ ] node scripts/check-urls.mjs     → todas consistentes
[ ] npm test                         → 58/58 tests pasan
[ ] git add site/ && git commit && git push origin main
    (o API push si git push no está disponible)
[ ] Verificar deploy: https://ukoquique-proves.github.io/kilombo/
```

---

## 7. Para qué sirve realmente `KILOMBOTOP_PASSWORD`

`kilombo.top` y todos sus subdominios son **públicamente legibles sin contraseña**. Cualquier visitante puede leer todos los artículos desde un navegador sin autenticarse. El servidor devuelve HTTP 200 directamente — el SSO de YunoHost solo protege el backend de gestión, no el contenido publicado.

**Lo que `KILOMBOTOP_PASSWORD` permite hacer — y solo esto:**

| Uso | Por qué necesita la contraseña |
|-----|-------------------------------|
| **SSH/rsync a producción** (`sync-to-production.sh`) | El servidor requiere autenticación para recibir archivos por SSH |
| **Panel de administración YunoHost** (`kilombo.top/yunohost/admin/`) | Gestión de apps, dominios, firewall, usuarios del servidor |
| **API YunoHost** (`/yunohost/portalapi/login`) | Necesaria para automatizar operaciones de infraestructura |
| **Nextcloud** (`cloud.kilombo.top`) | Gestor de ficheros web como alternativa al SSH |

**Lo que NO requiere la contraseña:**

- Leer cualquier artículo publicado en `kilombo.top` o sus subdominios
- Scraping de contenido para importar al espejo (ver sección 8)
- Verificar que un deploy llegó a producción
- Comprobar el estado de los sitios SPIP

En resumen: la contraseña es una **credencial de deploy e infraestructura**, no una credencial de lectura de contenido.

---

## 8. Scraping de contenido SPIP para importar al espejo

Durante la importación de artículos desde `kilombo.top` y subdominios (sesión 2026-08-07) se identificaron los selectores correctos del template SPIP Escal 5.2.9. Esta sección documenta los patrones fiables para no repetir el proceso de descubrimiento.

### Por qué los selectores obvios fallan

El template SPIP de estos sitios pone el **cuerpo del artículo** y la **barra lateral** ("En la misma sección") dentro de `divs` con clases similares. Los selectores genéricos como `class="texte"` o el fallback de `<h1>` a `<footer>` capturan la barra lateral en lugar del artículo.

### Selectores correctos — sitios Tierra y Libertad / subdominios Tierra

```python
# Título del artículo actual
id="titre-article"

# Fecha de publicación
id="date-article"  →  buscar <span class="majuscules"> dentro

# Autor
id="auteur-article"  →  buscar <a> dentro

# Cuerpo del artículo (delimitado explícitamente por comentarios SPIP)
id="texte-article"  →  terminar en el comentario <!-- Fin texte-article -->

# Descripción breve (cuando el artículo es solo imágenes)
id="descriptif-article"
```

Ejemplo de extracción fiable en Python:

```python
import urllib.request, re

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as r:
    body = r.read().decode('utf-8', errors='replace')

title = re.search(r'id="titre-article"[^>]*>([^<]{3,300})', body)
date  = re.search(r'id="date-article"[^>]*>[^<]*<span[^>]*>([^<]+)</span>', body)
body_content = re.search(r'id="texte-article"[^>]*>([\s\S]+?)<!-- Fin texte-article', body)
```

### Selectores correctos — Proletarios Internacionalistas (PI)

El subdomain PI usa una plantilla SPIP diferente (más cercana a WordPress en estructura):

```python
# Título — dentro de <h2 class="spip">
re.search(r'<h2[^>]+class="spip"[^>]*>([\s\S]{5,300}?)</h2>', body)

# Fecha — primer párrafo con fecha en el bloque texte
# (PI no usa id="date-article" — la fecha está en el primer <p> del cuerpo)

# Cuerpo del artículo
class="texte surlignable clearfix"
# No tiene comentario de cierre — truncar al encontrar <section id= o <footer
```

**Atención:** En PI, muchos artículos ponen el título de la serie directamente dentro del cuerpo como primer párrafo (`<p>FALSOS INTERNACIONALISTAS 3<br>...`), no en un `<h2>`. Hay que extraerlo manualmente del texto del cuerpo cuando el `<h2 class="spip">` está vacío o ausente.

### Casos especiales documentados

**Artículos solo de imágenes** (`article37` — El fraude de los PCR):
- `id="texte-article"` contiene únicamente tags `<img>` sin texto
- Detectar: si el cuerpo extraído tiene menos de 200 caracteres de texto plano, tratar como imagen-only
- Solución: usar `id="descriptif-article"` para el texto y añadir nota de que el contenido es gráfico

**Barra lateral ("En la misma sección")**:
- Vive en `class="texte meme-rub"` — nombre confusamente similar al cuerpo del artículo
- Aparece después del cuerpo en el HTML
- Si el regex termina en `<!-- Fin texte-article -->` en sitios Tierra, nunca la captura
- En PI, truncar en `<section id=` o `<footer` para evitarla

**Atributos de evento en imágenes PI**:
- Algunas imágenes en PI tienen `onclick="location.href=..."` — no pasan la validación de `validate-data.mjs`
- Eliminar con: `re.sub(r'\s+on\w+\s*=\s*(?:"[^"]*"|\'[^\']*\')', '', html, flags=re.I)`

**Imágenes de cabecera/logo en PI**:
- Algunas entradas del cuerpo empiezan con una imagen SPIP que es el logo del autor, no contenido editorial
- Eliminar con: `re.sub(r'<img[^>]*(?:spip_logo|cache-vignettes)[^>]*/>', '', html, flags=re.I)`

### Flujo de importación recomendado

El flujo descrito abajo ahora también está implementado de forma reproducible en
`./scripts/import-article.mjs`. Ese script ejecuta el chequeo de duplicados,
fetch, extracción Tierra/PI, limpieza, reescritura de URLs relativas y salida a
`site/assets/content/articles.json` o a JSON en modo `--dry-run`.

```python
from urllib.parse import urljoin
import re

# 0. *** DEDUP CHECK — hacer ANTES de cualquier fetch ***
#    Verificar que el sourceUrl (y el id previsto) no existe ya en articles.json.
#    MIRROR_GROWING.md §1 regla #3 lo exige explícitamente.
import json
with open('site/assets/content/articles.json') as f:
    existing = json.load(f)
existing_urls = {a['sourceUrl'] for a in existing}
existing_ids  = {a['id']        for a in existing}
if source_url in existing_urls:
    raise SystemExit(f"SKIP: {source_url} ya está en articles.json")

# 1. Fetch
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
body = urllib.request.urlopen(req).read().decode('utf-8', errors='replace')

# 2. Extraer con los selectores correctos según el sitio (Tierra vs. PI)

# 3. Limpiar HTML
#    - Eliminar <script>, <style>, <!-- comentarios -->
#    - Eliminar atributos on* (event handlers)
#    - Eliminar class= e id= en elementos de contenido
#    - Convertir {{texto}} → <strong>, {texto} → <em> (markup SPIP)
#    - Eliminar imágenes de logo/cabecera
#    - Reducir a etiquetas del allowlist de sanitizeHtml()
#    - Si queda algún <img>, verificar que alt sea descriptivo —
#      alt="" vacío viola MIRROR_GROWING.md §4.6; escribirlo manualmente

# 4. *** REESCRIBIR URLs RELATIVAS A ABSOLUTAS ***
#    SIEMPRE hacer este paso antes de guardar en articles.json.
#    src/href relativos resuelven contra la URL del espejo, no contra
#    el sitio fuente — las imágenes y enlaces darán 404 en producción.
def rewrite_relative_urls(html, source_url):
    def rewrite(m):
        attr, quote, val = m.group(1), m.group(2), m.group(3)
        if re.match(r'https?://', val) or val.startswith('#') or val.startswith('mailto:'):
            return m.group(0)
        return f'{attr}={quote}{urljoin(source_url, val)}{quote}'
    return re.sub(r'(src|href)=(["\'])([^"\']+)\2', rewrite, html, flags=re.I)

html = rewrite_relative_urls(html, source_url)

# 5. Validar: ejecutar npm test — validate-data.mjs detecta
#    <script>, on*, javascript:, y ahora también URLs relativas en src/href
```

**Por qué validate-data.mjs lo detecta ahora:** la regla `contentHtml` en `scripts/validate-data.mjs` incluye desde v0.23.0 un check que falla si cualquier `src=` o `href=` tiene un valor no-absoluto (que no empiece por `https?://`, `#`, o `mailto:`). El CI bloqueará el deploy si se intenta publicar una entrada con URLs relativas.

> Nota de integración: se ha añadido `scripts/import-article.mjs` como la implementación
> segura y reproducible de este flujo de importación. El fix de TO_FIX #36 ya está aplicado.
> También se han agregado los parches `url-safety.mjs` e `i18n-coverage.mjs` al repositorio.
>   - `url-safety.mjs` se usa ahora en `site/js/render.mjs` y `scripts/validate-data.mjs`.
>   - `i18n-coverage.mjs` proporciona `npm run i18n-coverage` para reportar gaps de traducción.

**Restricciones conocidas del allowlist de `sanitizeHtml()`:**
- `<h1>` y `<h2>` **no están en el allowlist** — se eliminan silenciosamente. Si el artículo fuente usa encabezados, aplanarlos en `<p><strong>...</strong></p>` antes de guardar, o usarlos solo como `<h3>`/`<h4>` (que sí están permitidos).
- `<img alt="">` vacío pasa la sanitización pero viola MIRROR_GROWING.md §4.6. Si el `alt` del original está vacío, escribir uno descriptivo manualmente (ver TO_FIX #32).

**Verificación del truncado en PI (heurística `<section id=` / `<footer`):**
La heurística de truncado del bloque `texte surlignable` en PI es fiable para los artículos de las semanas 1–2, pero no ha sido verificada contra todas las variantes de plantilla PI. Antes de importar artículos PI de Week 3+, hacer un spot-check: abrir el HTML crudo del artículo y confirmar que el marcador de fin (`<section id=` o `<footer`) aparece después del cuerpo completo y antes de la barra lateral "meme-rub".
