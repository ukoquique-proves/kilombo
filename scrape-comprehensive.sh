#!/bin/bash
# scrape-comprehensive.sh — Full site crawl of www.kilombo.top
# Downloads: homepage + RSS + all article pages + archives

set -e

source .env

COOKIE_JAR="/tmp/kilombo-cookies.txt"
OUTPUT_DIR="./scraped-full"
mkdir -p "$OUTPUT_DIR"

echo "=== Kilombo.top — Comprehensive Site Crawl ==="
echo ""

# Step 1: Authenticate
echo "1. Authenticating with YunoHost SSO..."
curl -s -c "$COOKIE_JAR" -X POST \
  --data-urlencode "user=$KILOMBOTOP_USER" \
  --data-urlencode "password=$KILOMBOTOP_PASSWORD" \
  "https://kilombo.top/yunohost/sso/login" > /dev/null 2>&1

echo "   ✓ Session established"

# Step 2: Download main page
echo "2. Downloading main pages..."
curl -s -b "$COOKIE_JAR" -L "https://www.kilombo.top/" \
  > "$OUTPUT_DIR/index.html"
echo "   ✓ Homepage saved"

# Step 3: Download RSS feed
echo "3. Downloading RSS feed..."
curl -s -b "$COOKIE_JAR" \
  "https://www.kilombo.top/spip.php?page=backend" \
  > "$OUTPUT_DIR/rss-feed.xml"

# Extract article IDs from RSS
ARTICLE_IDS=$(grep -oP 'article\d+' "$OUTPUT_DIR/rss-feed.xml" | sort -u | sed 's/article//')
ARTICLE_COUNT=$(echo "$ARTICLE_IDS" | wc -w)
echo "   ✓ RSS feed saved — found $ARTICLE_COUNT articles"

# Step 4: Download each article
echo "4. Downloading $ARTICLE_COUNT article pages..."
count=0
for id in $ARTICLE_IDS; do
  url="https://www.kilombo.top/spip.php?article$id"
  curl -s -b "$COOKIE_JAR" -L "$url" \
    > "$OUTPUT_DIR/article-$id.html"
  count=$((count + 1))
  
  # Show progress every 10 articles
  if [ $((count % 10)) -eq 0 ]; then
    echo "   ✓ Downloaded $count/$ARTICLE_COUNT articles"
  fi
done
echo "   ✓ Downloaded all $ARTICLE_COUNT articles"

# Step 5: Download sections/categories
echo "5. Downloading section pages..."
SECTIONS="rubrique4 rubrique6 rubrique19 rubrique20 rubrique24 rubrique25"
for section in $SECTIONS; do
  url="https://www.kilombo.top/spip.php?$section"
  curl -s -b "$COOKIE_JAR" -L "$url" \
    > "$OUTPUT_DIR/section-$section.html"
done
echo "   ✓ Downloaded $(echo $SECTIONS | wc -w) section pages"

# Step 6: Try to crawl archive/index pages (SPIP standard)
echo "6. Attempting archive discovery..."
for year in 2023 2024 2025; do
  for month in {01..12}; do
    url="https://www.kilombo.top/spip.php?var_recherche=&$year-$month"
    status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$url")
    if [ "$status" = "200" ]; then
      curl -s -b "$COOKIE_JAR" -L "$url" \
        > "$OUTPUT_DIR/archive-$year-$month.html"
      echo "   • $year-$month (HTTP 200)"
    fi
  done
done

# Step 7: Summary
echo ""
echo "=== CRAWL COMPLETE ==="
echo ""
echo "Downloaded to: $OUTPUT_DIR/"
echo ""
ls -1 "$OUTPUT_DIR" | head -20
echo ""
echo "Statistics:"
echo "  • Articles downloaded: $(ls -1 $OUTPUT_DIR/article-*.html 2>/dev/null | wc -l)"
echo "  • Sections downloaded: $(ls -1 $OUTPUT_DIR/section-*.html 2>/dev/null | wc -l)"
echo "  • Archives downloaded: $(ls -1 $OUTPUT_DIR/archive-*.html 2>/dev/null | wc -l)"
echo "  • Total files: $(ls -1 $OUTPUT_DIR | wc -l)"
echo ""
echo "To analyze article content, run:"
echo "  grep -h '<h1\|<title\|<h2' $OUTPUT_DIR/article-*.html | head -50"
