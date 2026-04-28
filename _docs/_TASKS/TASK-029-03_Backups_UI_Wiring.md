# TASK-029-03: Backups UI Wiring
# FileName: TASK-029-03_Backups_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-029-02, TASK-006-21  
**Status:** Done (2026-01-30)

---

## Overview

Wire Backups UI to the real backup API.

## UI Scope

Use:
- `core/admin/ui/backups/BackupsPage.tsx`
- `core/admin/ui/backups/BackupsTable.tsx`
- `core/admin/ui/backups/BackupScheduleCard.tsx`
- `core/admin/ui/backups/BackupNowDialog.tsx`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/backupsClient.ts` | list/create/restore/schedule |
| `BackupsPage.tsx` | load list + schedule |
| `BackupsTable.tsx` | bind rows + actions |
| `BackupNowDialog.tsx` | trigger create |
| `BackupScheduleCard.tsx` | bind schedule update |

## Testing Requirements

- `tests/unit/admin/backupsClient.test.ts` (new).
- Update `tests/unit/ui/backups.test.tsx`.

## Documentation Updates Required

- `_docs/CMS_API.md` link to backups endpoints.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-backups-ui-wiring.md`
