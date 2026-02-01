# TASK-045-01: Site Theme DB Schema
# FileName: TASK-045-01_Site_Theme_DB_Schema.md

**Priority:** 🔴 High  
**Category:** Site/Appearance  
**Estimated Effort:** Medium  
**Dependencies:** TASK-045 (Index)  
**Status:** 🟡 To Do

---

## Overview

Add persistent storage for **public site themes** (templates + profiles) so all appearance customization is stored in DB and controlled from the admin UI.

We need two entities:
- `site_theme_templates` → token definitions (colors, typography, spacing, etc.)
- `site_theme_profiles` → human-friendly profile that points to a template and can be activated.

---

## Data Model

### `site_theme_templates`
- `id` (uuid, pk)
- `name` (string, unique)
- `description` (string, nullable)
- `tokens` (jsonb) — full token object
- `created_at`
- `updated_at`

### `site_theme_profiles`
- `id` (uuid, pk)
- `name` (string, unique)
- `description` (string, nullable)
- `template_id` (fk → site_theme_templates)
- `is_active` (bool, default false)
- `created_at`
- `updated_at`

Constraints:
- Only **one profile** can be active at a time (enforced in service layer).

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| DB | `core/db/schema.ts` | Add `siteThemeTemplates`, `siteThemeProfiles` |
| DB | `core/db/migrations/XXXX_*.sql` | Create tables + indexes |
| DB | `core/db/migrations/meta/*` | Snapshot + journal |
| Docs | `_docs/DATA_MODEL.md` | Add two tables |

---

## Migration Notes

Create indexes:
- `site_theme_templates_name_idx`
- `site_theme_profiles_name_idx`
- `site_theme_profiles_active_idx`

---

## Testing Requirements

Unit:
- `tests/unit/themes/siteThemeService.test.ts` (schema inserts, unique name error, active profile logic)

Integration:
- `tests/integration/routes/siteThemes.test.ts` (route wiring) — stub for later tasks

---

## Documentation Updates Required

- `_docs/DATA_MODEL.md`
- `_docs/SITE_THEMES.md` (new file, schema section)
- `_docs/_CHANGELOG/<new>.md`
