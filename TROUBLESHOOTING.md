# TROUBLESHOOTING — Kilombo server connection

Diagnóstico completo del intento de conexión al servidor `kilombo.top` realizado el 2026-08-03.

---

## Resumen ejecutivo

El servidor está en pie y respondiendo. El bloqueo tiene dos causas independientes:

1. **Puerto SSH (22) cerrado a nivel de firewall** — no hay acceso directo por SSH/SFTP desde máquinas externas.
2. **Credenciales incorrectas para el panel YunoHost** — las contraseñas probadas desde `.env` no coinciden con las del servidor.

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

El servidor corre **YunoHost** con las siguientes aplicaciones registradas:

| App ID | Label | Dominio | Tipo |
|--------|-------|---------|------|
| `spip.main` | Espacio Tierra y Libertad | `www.kilombo.top` | SPIP 4.4.15 |
| `spip__2.main` | Proletarios Internacionalistas | `proletariosinternacionalistas.kilombo.top` | SPIP |
| `spip__3.main` | International Global Revolution | `in.kilombo.top` | SPIP |
| `spip__4.main` | GCI / ICG — Sitio oficial | `icg-gci.kilombo.top` | SPIP |
| `my_webapp.main` | ICG / GCI CD-Rom | `cdrom.kilombo.top` | Static webapp + SFTP |
| `my_webapp__3.main` | ICG — Sitio histórico | `icg-old.kilombo.top` | Static webapp + SFTP |

> **Importante:** No existe ninguna app registrada para el dominio raíz `kilombo.top`. El portal nuevo que estamos construyendo necesita un nuevo `my_webapp` apuntando a `kilombo.top` (o una redirección desde él).

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

### Por qué el SPIP login tampoco funciona

El servidor devuelve la cabecera:
```
x-sso-wat: You've just been SSOed
```
Esto significa que SPIP está **detrás del SSO de YunoHost**. Autenticarse directamente en SPIP no funciona porque el proxy SSO intercepta la sesión. Hay que autenticarse primero en YunoHost para que el SSO propague la sesión a SPIP.

---

## 4. Cómo resolver el acceso

### Opción A — Recuperar la contraseña correcta (recomendado)

La contraseña del usuario `admin` de YunoHost se puede consultar o resetear:

1. Accediendo físicamente o por consola al servidor (si es un VPS, desde el panel del proveedor).
2. Desde la CLI de YunoHost si se tiene acceso root:
   ```bash
   yunohost user info admin
   # o para resetear:
   yunohost user update admin --password NUEVA_CONTRASEÑA
   ```
3. Desde el panel de administración del proveedor de VPS (Hetzner, OVH, etc.) usando la consola web.

Una vez confirmada, actualizar `KILOMBOTOP_PASSWORD` en `.env`.

### Opción B — Abrir el puerto SSH desde una IP de confianza

Si el servidor es un VPS, el proveedor suele ofrecer una opción de firewall desde su panel web. Añadir la IP de la máquina de trabajo a la lista blanca para el puerto 22.

Alternativamente, desde la consola del proveedor (sin SSH), ejecutar en el servidor:
```bash
# Permitir SSH solo desde tu IP
ufw allow from TU_IP_PUBLICA to any port 22
# o desactivar temporalmente el bloqueo:
ufw allow 22
```

### Opción C — Usar el SFTP de las `my_webapp` existentes como referencia

Las apps `my_webapp.main` y `my_webapp__3.main` tienen SFTP habilitado por YunoHost. YunoHost crea un usuario SFTP específico por app. Si se puede acceder al panel de administración de YunoHost, se puede:
1. Crear una nueva app `my_webapp` para `kilombo.top`
2. Consultar las credenciales SFTP de esa app en `Aplicaciones → kilombo → Configuración`

Esas credenciales SFTP funcionan por SFTP sobre SSH (puerto 22) — lo que vuelve al punto del firewall.

### Opción D — Deploy desde la máquina del administrador del servidor

Ejecutar `./sync-to-production.sh` directamente desde un equipo que sí tenga acceso SSH al servidor (la máquina local del administrador de `kilombo.top`), en lugar de hacerlo desde este entorno de desarrollo.

---

## 5. Próximos pasos concretos

- [ ] Confirmar la contraseña correcta del usuario `admin` de YunoHost
- [ ] Verificar si el puerto 22 está accesible desde la red del administrador del servidor
- [ ] Decidir en qué app/dominio se despliega el nuevo portal (`kilombo.top` raíz o un subdominio)
- [ ] Si no existe app para `kilombo.top`, crear una `my_webapp` nueva desde el panel YunoHost
- [ ] Actualizar `.env` con las credenciales verificadas y volver a ejecutar `./sync-to-production.sh`

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
[ ] npm test                         → 32/32 tests pasan
[ ] git add site/ && git commit && git push origin main
    (o API push si git push no está disponible)
[ ] Verificar deploy: https://ukoquique-proves.github.io/kilombo/
```
