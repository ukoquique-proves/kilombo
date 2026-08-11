#!/bin/bash
# scrape-curl.sh — Extract kilombo.top content using curl + credentials
# Works without Chrome/Playwright (no CDP needed)

set -e

source .env

COOKIE_JAR="/tmp/kilombo-cookies.txt"
OUTPUT_FILE="final_kilombo.html"

echo "=== Kilombo.top Scraper (curl-based) ==="
echo ""

# Step 1: Hit the YunoHost SSO endpoint
echo "1. Attempting YunoHost SSO login..."
curl -s \
  -c "$COOKIE_JAR" \
  -X POST \
  -d "user=$KILOMBOTOP_USER&password=$KILOMBOTOP_PASSWORD" \
  "https://kilombo.top/yunohost/sso/login" \
  > /dev/null 2>&1 || {
    echo "   ⚠ SSO endpoint returned error (expected — YunoHost redirects on success)"
  }

# Step 2: Access the main page with the session cookie
echo "2. Fetching main page with session cookie..."
curl -s \
  -b "$COOKIE_JAR" \
  -L \
  "https://kilombo.top/" \
  > "$OUTPUT_FILE"

echo "3. Checking if content is StatiCrypt-encrypted..."
if grep -q "staticrypt-html\|Contraseña\|password" "$OUTPUT_FILE"; then
  echo "   → Detected StatiCrypt encryption"
  echo "   → Run 'npm run scrape:decrypt' to decode with STATICRYPT_PASSWORD"
else
  echo "   → Content appears to be unencrypted or accessible"
fi

echo ""
echo "✓ Done. Content saved to: $OUTPUT_FILE"
echo "  Cookie jar: $COOKIE_JAR (for manual inspection)"
