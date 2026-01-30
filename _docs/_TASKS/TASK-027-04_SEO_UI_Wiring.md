# TASK-027-04: SEO UI Wiring
# FileName: TASK-027-04_SEO_UI_Wiring.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-027-03, TASK-006-26  
**Status:** To Do

---

## Overview

Wire SEO Manager UI to real API endpoints.

## UI Scope

Use existing components:
- `core/admin/ui/seo/SeoManagerPage.tsx`
- `core/admin/ui/seo/SeoTable.tsx`
- `core/admin/ui/seo/SeoDrawer.tsx`
- `core/admin/ui/seo/SeoAuditDialog.tsx`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/seoClient.ts` | `listSeo`, `getSeo`, `updateSeo`, `runAudit` |
| `core/admin/ui/seo/SeoManagerPage.tsx` | Load data + error/loading states |
| `core/admin/ui/seo/SeoDrawer.tsx` | Bind form -> `updateSeo` |
| `core/admin/ui/seo/SeoAuditDialog.tsx` | Trigger audit + refresh list |

### UX notes

- Show last audit time + status badges from API.
- On save/audit, show toast and re-fetch list.

## Testing Requirements

- `tests/unit/admin/seoClient.test.ts` (new).
- Update `tests/unit/ui/seo-manager.test.tsx` for new states.

## Documentation Updates Required

- `_docs/CMS_API.md` confirm SEO endpoints are used by UI.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-seo-ui-wiring.md`
