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
