# TASK-042-03: Integrations UI Wiring
# FileName: TASK-042-03_Integrations_UI_Wiring.md

**Priority:** Medium  
**Category:** Settings/Integrations  
**Estimated Effort:** Medium  
**Dependencies:** TASK-042-02, TASK-006-34  
**Status:** To Do

---

## Overview

Wire Integrations UI to live API data.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/integrationsClient.ts` | list/get/update/request |
| `core/admin/ui/settings/IntegrationsPage.tsx` | replace mock data |
| `tests/integration/ui/integrations.test.tsx` | render + actions |

## Notes

- Request flow should post into `integration_requests`.

## Documentation Updates Required

- `_docs/CMS_API.md` UI wiring note.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-integrations-ui.md`
