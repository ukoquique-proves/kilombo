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
  scp -P "${KILOMBOTOP_PORT}" -r "${SOURCE}" "${REMOTE}"
fi

echo ""
echo "✅ Hecho. El contenido de ./site/ ahora está vivo en:"
echo "   https://${KILOMBOTOP_HOST}"
echo ""
