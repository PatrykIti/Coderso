# TASK-040-04: Webhooks UI Wiring
# FileName: TASK-040-04_Webhooks_UI_Wiring.md

**Priority:** Medium  
**Category:** Settings/Integrations  
**Estimated Effort:** Medium  
**Dependencies:** TASK-040-03, TASK-006-19  
**Status:** To Do

---

## Overview

Wire the Webhooks settings UI to API data.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/webhooksClient.ts` | list/create/update/delete/test |
| `core/admin/ui/settings/WebhooksPage.tsx` | replace mock data |
| `tests/integration/ui/webhooks.test.tsx` | render + actions |

## Notes

- Do not show secret after creation.
- Drawer should refresh deliveries list.

## Documentation Updates Required

- `_docs/CMS_API.md` UI wiring note.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-webhooks-ui.md`
