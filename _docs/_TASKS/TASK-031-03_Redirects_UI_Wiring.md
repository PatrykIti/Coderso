# TASK-031-03: Redirects UI Wiring
# FileName: TASK-031-03_Redirects_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-031-02, TASK-006-37  
**Status:** To Do

---

## Overview

Wire redirects UI to real API endpoints.

## UI Scope

Use:
- `core/admin/ui/redirects/RedirectsPage.tsx`
- `core/admin/ui/redirects/RedirectsTable.tsx`
- `core/admin/ui/redirects/RedirectDrawer.tsx`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/redirectsClient.ts` | list/create/update/delete |
| `RedirectsPage.tsx` | load list + filters |
| `RedirectDrawer.tsx` | create/edit actions |
| `RedirectsTable.tsx` | bind rows + status badges |

## Testing Requirements

- `tests/unit/admin/redirectsClient.test.ts` (new).
- Update `tests/unit/ui/redirects.test.tsx`.

## Documentation Updates Required

- `_docs/CMS_API.md` confirm redirect endpoints used by UI.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-redirects-ui-wiring.md`
