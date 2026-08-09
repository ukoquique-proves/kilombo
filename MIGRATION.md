# MIGRATION — Del sitio original al nuevo diseño

---

## El contexto

`kilombo.top` es el sitio original del cliente. Funciona con **SPIP 4.4.15** bajo YunoHost y tiene su propio contenido, estructura y usuarios. El cliente pidió **reordenarlo por completo**.

En lugar de modificar `kilombo.top` directamente — lo que obligaría a borrar el sitio existente antes de tener el nuevo listo — se optó por construir el diseño nuevo en un **sitio espejo separado** (GitHub Pages). Así se puede ver el original y el nuevo al mismo tiempo, comparar, ajustar, y hacer los cambios con calma sin riesgo.

---

## Los dos sitios

| | Original | Espejo / nuevo diseño |
|---|---|---|
| **URL** | `https://www.kilombo.top/` | `https://ukoquique-proves.github.io/kilombo/` |
| **Tecnología** | SPIP CMS + base de datos | HTML/CSS/JS estático |
| **Estado** | Sitio en producción activo | Propuesta en desarrollo |
| **Propósito** | El sitio que existe hoy | El sitio que irá reemplazando al anterior |

---

## El proceso de actualización

No se espera a que el espejo esté completamente terminado para migrar. El proceso es **incremental y continuo**:

1. Se trabaja en el espejo durante una sesión
2. Cuando hay avances aprovables, el cliente los ve en GitHub Pages
3. Al final de cada sesión se ejecuta `./end-of-session.sh` — actualiza tanto GitHub Pages como `kilombo.top` al mismo estado

```
Sesión de trabajo → avances en el espejo
        ↓
Cliente revisa en GitHub Pages
        ↓
./end-of-session.sh
        ↓
GitHub Pages actualizado  +  kilombo.top actualizado
```

De esta forma `kilombo.top` se va mejorando gradualmente con cada sesión, sin esperar a una gran migración final.

---

## ¿Necesitamos a los administradores del servidor?

**No.** El deploy es completamente autónomo con lo que ya tenemos:

- Usuario `kilombo` confirmado con permisos de admin en YunoHost ✅
- Contraseña correcta en `.env` como `KILOMBOTOP_PASSWORD` ✅
- `sync-to-production.sh` configurado con las credenciales correctas ✅

**El único paso pendiente:** abrir el puerto SSH (22) en el firewall del servidor. Esto lo puede hacer el propio cliente desde el panel YunoHost — sin necesitar a los administradores técnicos:

```
https://kilombo.top/yunohost/admin/
→ Herramientas → Firewall → añadir regla TCP puerto 22
```

Una vez abierto el puerto, `./end-of-session.sh` funciona sin intervención de nadie más.

---

## ¿Habrá problemas por usar un sitio estático donde antes había un CMS?

No. El nuevo diseño es **estático por elección deliberada** — todo el contenido dinámico (vídeos, tarjetas) está resuelto con JSON y JS vanilla, sin necesidad de base de datos ni PHP.

YunoHost ya sirve sitios estáticos en el mismo servidor: `cdrom.kilombo.top` e `icg-old.kilombo.top` son exactamente ese modelo (`my_webapp` en YunoHost). El nuevo portal usará el mismo mecanismo.

Lo único que hay que hacer en el servidor es crear una app `my_webapp` apuntando al dominio raíz `kilombo.top` desde el panel YunoHost (ítem `YunoHost-C` en `TO_FIX.md`). Una tarea de 5 minutos cuando el equipo esté disponible.

SPIP seguirá corriendo en `www.kilombo.top` si hace falta mantener el CMS editorial — el portal raíz y el CMS pueden coexistir en subdominios distintos.

---

## Referencias

- `TROUBLESHOOTING.md` — estado del acceso SSH y opciones para abrir el puerto 22
- `TO_FIX.md` ítem `YunoHost-C` — crear app `my_webapp` para `kilombo.top` raíz
- `ROADMAP.md` paso 9 — deploy final en `kilombo.top`
- `end-of-session.sh` — script que ejecuta el deploy completo al final de cada sesión
