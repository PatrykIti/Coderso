# TASK-038-04: Forms UI Wiring
# FileName: TASK-038-04_Forms_UI_Wiring.md

**Priority:** Medium  
**Category:** CMS/Forms  
**Estimated Effort:** Medium  
**Dependencies:** TASK-038-03, TASK-006-32  
**Status:** Done (2026-01-31)

---

## Overview

Wire Form Builder UI to live API data.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/formsClient.ts` | API client (CRUD + fields) |
| `core/admin/ui/forms/FormBuilderPage.tsx` | replace mocks with API data |
| `core/admin/ui/forms/FieldLibrary.tsx` | wire create/update/delete |
| `core/admin/ui/forms/FieldSettingsPanel.tsx` | bind to API form fields |
| `tests/integration/ui/forms.test.tsx` | render + actions |

## Notes

- Keep local optimistic state and sync on save.
- Show API errors using `isApiClientError`.

## Documentation Updates Required

- `_docs/CMS_API.md` (confirm UI wiring endpoints).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-forms-ui-wiring.md`
