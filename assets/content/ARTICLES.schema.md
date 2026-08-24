# articles.json Schema

TypeScript-style JSDoc reference for the articles.json data structure.

## Article Object

```typescript
interface Article {
  // REQUIRED FIELDS
  id: string;           // Unique identifier (slug: lowercase alphanumeric + hyphens, max 80 chars)
  title: string;        // Article title
  date: string;         // ISO 8601 date (YYYY-MM-DD), or empty string for undated articles
  section: string;      // Section: "general" | "actualidad" | "tierra" | "nom" | "pi" | "gci"
  topics: string[];     // Topic tags for filtering
  sourceSite: string;   // Source attribution
  sourceUrl: string;    // URL to original article
  status: string;       // "imported" | "adapted" | "translated" | "pending-review" | "external-only"
  contentHtml: string;  // Sanitized HTML body (allowlist: p, a, strong, em, blockquote, br, etc.)

  // OPTIONAL INTERNAL FIELDS
  notes?: string;       // Editor notes (e.g., "PENDIENTE: agregar datos")
  _lastDewrapped?: string; // ISO timestamp of last hard-break reflow (audit trail)
  
  // OPTIONAL METADATA FOR FUTURE USE
  language?: string;    // Source language: "ES" | "FR" | "EN" (for multilingual features)
  author?: string;      // Author/creator name (when different from sourceSite)

  // OPTIONAL MEDIA FIELDS (movies, documentaries, videos)
  externalLinks?: ExternalLink[];
  metadata?: ArticleMetadata;
  relatedArticles?: string[]; // Array of related article IDs
}

interface ExternalLink {
  type: string;   // "youtube", "vimeo", "ok.ru", "imdb", "wikipedia", etc.
  url: string;    // Full URL to external resource
  title?: string; // Human-readable title/description
}

interface ArticleMetadata {
  mediaType?: string;    // "film", "documentary", "video", "podcast", etc.
  director?: string;     // Director/producer name(s)
  year?: number;         // Release/publication year
  country?: string;      // Country of origin (e.g., "Brasil", "France")
  duration?: string;     // Duration (e.g., "110 min", "1h 50m")
  language?: string;     // Original language (e.g., "Portuguese", "French")
  subtitles?: string;    // Available subtitles (e.g., "Spanish, English")
  source?: string;       // Metadata source for verification (e.g., "IMDb", "Wikipedia")
  filmFestival?: string; // Film festival (e.g., "Cannes 1984")
  [key: string]: any;    // Additional custom metadata fields
}
```

## Validation Rules

| Field | Rules |
|-------|-------|
| `id` | Required, unique, lowercase alphanumeric + hyphens, max 80 chars |
| `status` | One of: "imported" | "adapted" | "translated" | "pending-review" | "external-only". Values in active use today are primarily "imported" and "pending-review"; the others are reserved for future editorial states. |
| `contentHtml` | Required; must pass allowlist validation (no scripts, event handlers, styles) |
| `date` | Optional in the validator for every article; if present it must be a valid ISO date in `YYYY-MM-DD` format. |
| `externalLinks` | Optional; present on media/complete articles, omitted on text-only imports |
| `metadata` | Optional; typically paired with `externalLinks` |
| `sourceUrl` | Required, must be absolute HTTP(S) URL or `#` (if source unknown), unique per article |
| `language` | Optional; one of: "ES" &#124; "FR" &#124; "EN" — used for future multilingual filtering |
| `author` | Optional; author/creator name. If present, not currently rendered in UI (reserved for future use). Use embedded blockquote in `contentHtml` for visible author attribution. |

## Examples

### Complete Movie Article

```json
{
  "id": "quilombo-pelicula",
  "title": "Quilombo — Película",
  "date": "1984-01-01",
  "section": "tierra",
  "topics": ["cine", "quilombo", "historia"],
  "sourceSite": "Espacio Tierra y Libertad (kilombo.top)",
  "sourceUrl": "https://www.kilombo.top/spip.php?article36",
  "status": "imported",
  "contentHtml": "<p>Film synopsis...</p>",
  "externalLinks": [
    {
      "type": "youtube",
      "url": "https://www.youtube.com/watch?v=...",
      "title": "Full film"
    },
    {
      "type": "imdb",
      "url": "https://www.imdb.com/title/tt0091816",
      "title": "IMDb"
    }
  ],
  "metadata": {
    "mediaType": "film",
    "director": "Carlos Diegues",
    "year": 1984,
    "country": "Brasil",
    "duration": "110 min",
    "language": "Portugués",
    "subtitles": "English, Spanish"
  },
  "relatedArticles": ["kilombo-quilombo-pelicula"]
}
```

### Simple Text Article (No Metadata)

```json
{
  "id": "example-article",
  "title": "Example Article",
  "date": "2026-08-17",
  "section": "general",
  "topics": ["example", "test"],
  "sourceSite": "Example Source",
  "sourceUrl": "https://example.com/article",
  "status": "imported",
  "contentHtml": "<p>Article body...</p>"
}
```

## Notes

- The `notes` field is internal documentation only and is not rendered in the UI
- The `_lastDewrapped` timestamp is set automatically by the hard-break reflow process
- `relatedArticles` is used for cross-linking variant versions of the same content
- The `metadata` object is extensible — additional fields can be added as needed
