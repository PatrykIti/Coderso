# TASK-008-04: Themes Admin API
# FileName: TASK-008-04_Themes_Admin_API.md

**Priority:** Medium  
**Category:** CMS/Themes  
**Estimated Effort:** Medium  
**Dependencies:** TASK-008-02  
**Status:** To Do  

---

## Overview

REST API dla theme list i profili, zabezpieczony RBAC (`themes:read`, `themes:write`).

---

## Endpoints

- `GET /themes` → list installed themes
- `GET /theme-profiles` → list profiles
- `POST /theme-profiles` → create profile
- `PATCH /theme-profiles/:id` → update profile meta/tokens
- `POST /theme-profiles/:id/activate` → activate profile
- `PUT /theme-profiles/:id/routes` → replace routes

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/routes/themeRoutes.ts` | new | routes + RBAC |
| `core/server/validation/themeSchemas.ts` | new | payload validation |
| `core/server/routes/index.ts` | register routes | add to router |
| `tests/integration/routes/themes.test.ts` | new | wiring tests |

**Validation:**
- `themeProfileCreateSchema`
- `themeProfileUpdateSchema`
- `themeRoutesSchema` (array of `{ path, pageId }`)

---

## Testing Requirements

- route wiring
- rejects invalid payload
- activate profile returns ok

---

## Documentation Updates Required

- `_docs/CMS_API.md` (themes endpoints)
- `_docs/THEMES_SPEC.md`

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-themes-api.md`
