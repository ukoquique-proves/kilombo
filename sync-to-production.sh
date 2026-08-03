#!/bin/bash
# =========================================================
# sync-to-production.sh
# =========================================================
# Copia TODO el contenido de ./site/ al servidor real de
# kilombo.top por SCP/rsync, sustituyendo la versión del
# portal publicada. Los archivos de ./site se transportan
# TAL CUAL — lo que ves en local (y en preview) es 1:1 lo
# que acaba en producción.
#
# ANTES DE USARLO:
#   1. Rellena las credenciales correctas en .env
#      (KILOMBOTOP_HOST, KILOMBOTOP_PORT, KILOMBOTOP_USER,
#       KILOMBOTOP_PASSWORD, KILOMBOTOP_REMOTE_PATH)
#   2. Asegúrate de tener rsync o scp disponible
#   3. Haz una copia de seguridad del servidor antes del
#      primer despliegue, por si acaso.
#
# USO:
#   chmod +x sync-to-production.sh   (solo la primera vez)
#   ./sync-to-production.sh
# =========================================================

set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
SITE_DIR="${HERE}/site"

# Cargar .env (crudo, sin librerías externas)
if [ -f "${HERE}/.env" ]; then
  set -a; . "${HERE}/.env"; set +a
fi

# Valores por defecto (si .env no los define)
: "${KILOMBOTOP_HOST:=kilombo.top}"
: "${KILOMBOTOP_PORT:=22}"
: "${KILOMBOTOP_USER:=admin}"
: "${KILOMBOTOP_REMOTE_PATH:=/var/www/kilombo.top}"

# ---- Pre-flight validation ----
PREFLIGHT_OK=1

if [ -z "${KILOMBOTOP_PASSWORD}" ] || echo "${KILOMBOTOP_PASSWORD}" | grep -qi "cambia\|change\|placeholder\|your_password"; then
  echo "❌ KILOMBOTOP_PASSWORD no está configurado en .env (valor vacío o placeholder)."
  PREFLIGHT_OK=0
fi

if ! command -v rsync >/dev/null 2>&1 && ! command -v scp >/dev/null 2>&1; then
  echo "❌ Ni rsync ni scp están disponibles. Instala uno de los dos antes de continuar."
  PREFLIGHT_OK=0
fi

if ! command -v sshpass >/dev/null 2>&1; then
  echo "⚠️  sshpass no encontrado. La conexión SSH pedirá contraseña de forma interactiva."
  echo "   Si estás en un entorno no-interactivo (CI, cron), instala sshpass primero."
  echo "   Continuando de todas formas (puede funcionar si tienes clave SSH configurada)."
fi

if [ "${PREFLIGHT_OK}" = "0" ]; then
  echo ""
  echo "Corrige los errores anteriores antes de continuar. Abortando."
  exit 1
fi
# ---- /Pre-flight validation ----

echo "============================================================"
echo "🚀 Subida a producción → ${KILOMBOTOP_USER}@${KILOMBOTOP_HOST}:${KILOMBOTOP_REMOTE_PATH}"
echo "============================================================"
echo ""

if [ ! -d "${SITE_DIR}" ]; then
  echo "❌ Carpeta ./site no existe. Abortando."
  exit 1
fi

# Pedir confirmación
echo "Esto SOBREESCRIBIRÁ el contenido remoto de:"
echo "   ${KILOMBOTOP_REMOTE_PATH}"
echo ""
read -p "¿Seguro? Escribe PROD para continuar:  " CONFIRM
if [ "${CONFIRM}" != "PROD" ]; then
  echo "Cancelado."
  exit 0
fi

# ---- Método de subida: rsync si existe, si no scp ----
SOURCE="${SITE_DIR}/"
REMOTE="${KILOMBOTOP_USER}@${KILOMBOTOP_HOST}:${KILOMBOTOP_REMOTE_PATH}"

if command -v rsync >/dev/null 2>&1; then
  echo ""
  echo "[sync] Usando rsync (recomendado)..."
  rsync -avz --delete \
        -e "ssh -p ${KILOMBOTOP_PORT}" \
        "${SOURCE}" "${REMOTE}"
else
  echo ""
  echo "[sync] rsync no encontrado — usando scp..."
  # Use "${SITE_DIR}/." (not trailing slash) so scp copies the *contents*
  # of site/ into REMOTE_PATH, not the directory itself.
  scp -P "${KILOMBOTOP_PORT}" -r "${SITE_DIR}/." "${REMOTE}"
fi

echo ""
echo "✅ Hecho. El contenido de ./site/ ahora está vivo en:"
echo "   https://${KILOMBOTOP_HOST}"
echo ""
