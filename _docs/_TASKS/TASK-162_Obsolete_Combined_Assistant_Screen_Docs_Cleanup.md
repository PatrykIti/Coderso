# TASK-162: Obsolete Combined Assistant Screen Docs Cleanup
# FileName: TASK-162_Obsolete_Combined_Assistant_Screen_Docs_Cleanup.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/_COVERAGE_MATRIX.md`, `docs/screens/*`  
**Status:** Done (2026-03-22)

---

## Overview

Remove old combined assistant screen docs that are no longer referenced by the
coverage matrix after the route-by-route documentation split. The goal is to
reduce assistant-corpus ambiguity and keep `docs/screens/` aligned with the
current canonical route mapping.

## Scope

1. Identify obsolete combined screen docs no longer referenced by
   `docs/_COVERAGE_MATRIX.md`.
2. Remove the obsolete docs from `docs/screens/`.
3. Synchronize task board and changelog after cleanup.

## Sub-Tasks

1. Verify orphaned combined docs are no longer route-canonical.
2. Delete the obsolete files from `docs/screens/`.
3. Record the cleanup in the changelog and task board.

## Acceptance Criteria

1. No stale combined screen docs remain in `docs/screens/` for routes already
   split into dedicated canonical docs.
2. The task board and changelog reflect the cleanup.

## Testing Requirements

- Verify orphaned docs against `docs/_COVERAGE_MATRIX.md`
- Confirm the deleted files are no longer canonical route targets

## Documentation Updates Required

- `docs/screens/*`
- `_docs/_TASKS/TASK-162_Obsolete_Combined_Assistant_Screen_Docs_Cleanup.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Verified the following screen docs were no longer referenced by
  `docs/_COVERAGE_MATRIX.md`:
  - `docs/screens/analytics-audit-access-logs-backups-and-import-export.md`
  - `docs/screens/email-storage-integrations-api-keys-and-webhooks.md`
  - `docs/screens/general-site-and-assistant-settings.md`
  - `docs/screens/seo-and-redirects.md`
  - `docs/screens/users-roles-and-permissions.md`
- Removed the obsolete combined docs from `docs/screens/`.
- No automated lint or test commands were run because this was a docs-only
  cleanup.
