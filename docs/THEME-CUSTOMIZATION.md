# Escal Theme Customization Guide

This guide explains how to use the automated tool to programmatically update hardcoded labels and presentation elements within the Escal theme on `kilombo.top`.

## The Tool

**Script:** `scripts/customize-escal-theme.mjs`

This script drives a headless browser to log into the SPIP admin panel, navigate through the complex sub-menus of the Escal configuration page (`exec=configurer_escal`), locate the target input field, and inject the new value.

### Usage

```bash
cd /root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD/KILOMBO
node scripts/customize-escal-theme.mjs --field <field_name> --value "<new_text>"
```

### Dry Run Mode

Always test a change first using `--dry-run`. This will block the network from actually saving the form and will take a screenshot of what the form would look like.

```bash
node scripts/customize-escal-theme.mjs --field titreongletderniers --value "Noticias Recientes" --dry-run
```

## Known Fields

Based on automated scraping of the Escal configuration panel, here are the known field names you can target to change specific presentation labels:

| Visual Label | Field Name (for `--field`) | Location in Admin Panel |
|--------------|----------------------------|-------------------------|
| "Los últimos artículos" | `titreongletderniers` | Página de inicio (`exec=configurer_escal_accueil`) |
| (Various sidebar block titles) | *(Requires further probing, see `probe-escal-form.mjs`)* | Configuración de bloques laterales |
| (Footer elements) | *(Requires further probing)* | Pie de página |

## Troubleshooting

- **Login Failed:** Make sure your `KILOMBOTOP_PASSWORD` in the `.env` file is correct and up to date.
- **Field not found:** Ensure the field name is exact. If you need to find a new field, you can use the `sandbox/probe-escal-form.mjs` script to dump all available form inputs and their labels across the Escal menus.
