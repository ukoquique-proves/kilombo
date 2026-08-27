#!/bin/bash
# decrypt-staticrypt.sh — Decrypt StatiCrypt-protected content
# Usage: bash decrypt-staticrypt.sh <input.html> [output.html]

set -e

INPUT_FILE="${1:-./scraped-content/index.html}"
OUTPUT_FILE="${2:-./scraped-content/index-decrypted.html}"

if [[ ! -f "$INPUT_FILE" ]]; then
  echo "❌ Error: File not found: $INPUT_FILE"
  exit 1
fi

source .env

if [[ -z "$STATICRYPT_PASSWORD" ]]; then
  echo "❌ Error: STATICRYPT_PASSWORD not set in .env"
  exit 1
fi

echo "=== StatiCrypt Decryption ==="
echo "Input:  $INPUT_FILE"
echo "Output: $OUTPUT_FILE"
echo "Password: ${STATICRYPT_PASSWORD:0:5}***"
echo ""

# Use staticrypt CLI to decrypt
echo "Decrypting with staticrypt CLI..."
npx staticrypt decrypt "$INPUT_FILE" --password "$STATICRYPT_PASSWORD" --output "$OUTPUT_FILE"

echo ""
echo "✓ Decrypted successfully!"
echo "   Open in browser: file://$(pwd)/$OUTPUT_FILE"
