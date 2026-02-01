# TASK-045-05: Site Themes API Routes
# FileName: TASK-045-05_Site_Themes_API_Routes.md

**Priority:** 🔴 High  
**Category:** Site/Appearance  
**Estimated Effort:** Medium  
**Dependencies:** TASK-045-02  
**Status:** 🟡 To Do

---

## Overview

Expose CRUD endpoints for **site theme templates and profiles** and provide an endpoint for active profile.

---

## API Routes

### Templates
- `GET /site-themes/templates`
- `POST /site-themes/templates`
- `PATCH /site-themes/templates/:id`
- `DELETE /site-themes/templates/:id`

### Profiles
- `GET /site-themes/profiles`
- `POST /site-themes/profiles`
- `PATCH /site-themes/profiles/:id`
- `DELETE /site-themes/profiles/:id`
- `POST /site-themes/profiles/:id/activate`

### Active
- `GET /site-themes/active`

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| Routes | `core/server/routes/siteThemeRoutes.ts` | new router |
| Validation | `core/server/validation/siteThemeSchemas.ts` | schemas |
| Wiring | `core/server/routes/index.ts` | register |

---

## Testing Requirements

- Integration: route wiring test
- Service unit tests (covered in TASK-045-02)

---

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/_CHANGELOG/<new>.md`
