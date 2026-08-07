To establish logical coherence and transform the portal into an intuitive, well-structured hub, here is a recommended step-by-step roadmap for your next actions:

## 1. Map & Audit the Information Architecture (IA)

Currently, the portal acts as a directory linking out to distinct subdomains (icg-gci, in, cdrom, icg-old, proletariosinternacionalistas, kilombo.top) and local static pages (articulos.html, plandemismo.html).

- [ ] **Define clear entity relationships** — Categorize the content into 3–4 primary dimensions:
  - [ ] Organizations / Publications (GCI, Proletarios Internacionalistas, Espacio Tierra y Libertad)
  - [ ] Thematic Archives & Dossiers (Nuevo Orden/Plandemismo, Science & Fundamentals)
  - [ ] Historical Repositories (CD-Rom Archive, Legacy Site)
- [ ] **Create a Global Navigation Bar** — Add a consistent header navigation across all mirror pages so users can jump between sections without returning to the root homepage every time

## 2. Unify Subdomain Navigation & Cross-Linking

Because the ecosystem spans multiple subdomains and languages (ES, EN, FR), users easily get lost when clicking off to external subdomains (icg-gci.kilombo.top, etc.).

- [ ] **Subdomain Header Banner** — Implement a lightweight top navigation bar or breadcrumb on subdomains that links back to Kilombo Portal (kilombo.top)
  - ⚠️ Out of scope for this repo — the external subdomains (icg-gci.kilombo.top, cdrom.kilombo.top, etc.) are separate SPIP/webapp installations not managed here
- [ ] **Explicit External vs. Internal Indicators** — Clearly separate links that keep users within the portal (articulos.html, plandemismo.html) from those that open external subdomains or standalone archives
  - → Tracked in ROADMAP.md §6

## 3. Structural & Content Refinements on Key Pages

### articulos.html (Internal Articles)

- [ ] Implement a filtering / sorting mechanism by tag, language, date, or source publication
- [ ] Add metadata fields for each article (publication date, reading time, author/source)

### plandemismo.html (Thematic Dossiers)

- [ ] Structure the content chronologically or by medium (e.g., Documentaries, Canal7 Video Series, Written Dossiers)
- [ ] Include direct media embeds or clear video player interfaces rather than just raw link lists

## 4. Search & Discovery Layer

Given that Kilombo stores decades of revolutionary texts, multilingual archives, and historical documents:

- [ ] **Implement client-side search** — Integrate a lightweight search tool (e.g., Pagefind, Lunr.js, or Algolia) across all articles and archive indexes
  - → Tracked in ROADMAP.md §6b
- [ ] **Multilingual Switcher** — Place a global language selector (ES | FR | EN) in the top header rather than relying solely on individual card badges
  - → Tracked in ROADMAP.md §6

## 5. Metadata, Accessibility & SEO Clean-up

- [ ] **Meta Tags & OpenGraph** — Ensure each page has appropriate `<title>`, `<meta name="description">`, and OpenGraph tags for previewing when shared on social channels or messaging apps
- [ ] **Semantic HTML Review** — Upgrade plain `<div>` link containers to accessible semantic structures (`<article>`, `<nav>`, `<aside>`) and use proper `aria-label`s for language tags and external link indicators
