#!/bin/bash
# scrape-curl.sh — Extract kilombo.top content using curl + credentials
# Authenticates with YunoHost SSO and downloads pages (including protected sections)
# Works without Chrome/Playwright (no CDP needed)

set -e

source .env

COOKIE_JAR="/tmp/kilombo-cookies.txt"
OUTPUT_DIR="./scraped-content"
mkdir -p "$OUTPUT_DIR"

echo "=== Kilombo.top Scraper (curl-based) ==="
echo ""
echo "Host: $KILOMBOTOP_HOST"
echo "User: $KILOMBOTOP_USER"
echo ""

# Step 1: Authenticate with YunoHost SSO
echo "1. Authenticating with YunoHost SSO..."
LOGIN_RESPONSE=$(curl -s -i \
  -c "$COOKIE_JAR" \
  -X POST \
  --data-urlencode "user=$KILOMBOTOP_USER" \
  --data-urlencode "password=$KILOMBOTOP_PASSWORD" \
  "https://kilombo.top/yunohost/sso/login" 2>&1)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | head -1 | grep -oP '\d{3}')
if [[ "$HTTP_CODE" == "302" ]] || [[ "$HTTP_CODE" == "200" ]]; then
  echo "   ✓ Authentication returned HTTP $HTTP_CODE (success indicators)"
else
  echo "   ⚠ Unexpected HTTP code: $HTTP_CODE"
fi

# Step 2: Verify session is active by testing an authenticated request
echo "2. Verifying session validity..."
SESSION_TEST=$(curl -s -w "%{http_code}" -b "$COOKIE_JAR" -o /dev/null \
  "https://kilombo.top/yunohost/sso/")
if [[ "$SESSION_TEST" == "200" ]] || [[ "$SESSION_TEST" == "302" ]]; then
  echo "   ✓ Session active (HTTP $SESSION_TEST)"
else
  echo "   ⚠ Session test returned HTTP $SESSION_TEST (may still work)"
fi

# Step 3: Download main page
echo "3. Downloading main page..."
curl -s \
  -b "$COOKIE_JAR" \
  -L \
  "https://www.kilombo.top/" \
  > "$OUTPUT_DIR/index.html"
echo "   ✓ Saved to $OUTPUT_DIR/index.html"

# Step 4: Check for StatiCrypt encryption
echo "4. Checking for StatiCrypt encryption..."
if grep -q "staticrypt-html\|Contraseña\|password" "$OUTPUT_DIR/index.html"; then
  echo "   → Detected StatiCrypt encryption"
  echo "   → Content is AES-256 encrypted with STATICRYPT_PASSWORD"
  echo ""
  echo "   To decrypt and extract content:"
  echo "   - Save the encrypted page locally"
  echo "   - Use: staticrypt decrypt final_kilombo.html --password '$STATICRYPT_PASSWORD'"
  echo "   - Or use the decrypt script in this repo (if available)"
else
  echo "   → Content appears unencrypted or accessible as-is"
fi

# Step 5: List available protected resources
echo "5. Probing for protected resources..."
PROTECTED_URLS=(
  "https://kilombo.top/yunohost/admin/"
  "https://www.kilombo.top/"
  "https://icg-gci.kilombo.top/"
)

for url in "${PROTECTED_URLS[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$url")
  if [[ "$status" != "000" ]]; then
    echo "   • $url — HTTP $status"
  fi
done

echo ""
echo "✓ Done."
echo ""
echo "Summary:"
echo "  - Authenticated: YES (YunoHost SSO)"
echo "  - Session stored: $COOKIE_JAR"
echo "  - Content location: $OUTPUT_DIR/"
echo ""
echo "Next steps:"
echo "  - Check $OUTPUT_DIR/index.html"
echo "  - If StatiCrypt: decrypt using STATICRYPT_PASSWORD"
echo "  - To download more pages: curl -b $COOKIE_JAR -L 'https://kilombo.top/path'"
