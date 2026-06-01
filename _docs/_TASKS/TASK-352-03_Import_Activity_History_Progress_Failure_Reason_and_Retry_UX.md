# TASK-352-03: Import Activity History, Progress, Failure Reason, and Retry UX
# FileName: TASK-352-03_Import_Activity_History_Progress_Failure_Reason_and_Retry_UX.md

**Priority:** Medium
**Category:** Import Export + Admin UI + API + UX
**Estimated Effort:** Large
**Dependencies:** TASK-352-02
**Status:** To Do

---

## Overview

Replace static Recent Imports with a truthful activity surface. Claude found
failed rows lack a reason/log/retry path and in-progress rows do not show a
real progress indicator. The Playwright report also found Recent Imports search
does not filter.

## Sub-Tasks

- Decide whether import history is local UI-only or backend-backed.
- If backend-backed, add import activity records with status, progress, reason,
  timestamps, and retry source.
- Wire Activity Log button to the activity route/modal or disable it.
- Make Recent Imports search controlled and actually filter the shown rows.
- Add retry action for retryable failed imports, or explain why retry is not
  possible.
- Render real progress for in-progress imports and avoid fake static rows.
- Decide cache behavior for import activity. If retained activity contains
  filenames/status only and is cached, add admin cache keys/invalidation; if not
  cached because payloads can be sensitive, document the uncached rationale.

## Files To Change

| File | Required change |
|---|---|
| `core/services/tools/importExportService.ts` | Add activity record creation/update helpers if backend-backed. |
| `core/server/routes/importExportRoutes.ts` | Add list/retry activity routes if product-supported. |
| `core/server/validation/importExportSchemas.ts` | Add strict activity list/retry schemas if routes are added. |
| `core/admin/services/importExportClient.ts` | Add activity list/retry client methods. |
| `core/admin/services/cachePolicy.ts` | Add import activity cache keys only if the activity surface becomes cached. |
| `core/admin/ui/import-export/ImportExportPage.tsx` | Wire Activity Log button. |
| `core/admin/ui/import-export/ImportDropzone.tsx` | Replace static `importHistory`, wire search/progress/failure/retry. |
| `tests/vitest/ui/import-export.test.tsx` | Cover search, progress, failure reason, retry, Activity Log behavior. |
| `tests/integration/routes/importExport.test.ts` | Cover activity routes if added. |
| `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` | Document cached or intentionally uncached import/export activity. |

## Implementation Pseudocode

```ts
type ImportActivityRow = {
  id: string;
  fileName: string;
  status: "queued" | "in-progress" | "completed" | "failed";
  progress: number;
  failureReason?: string | null;
  retryable: boolean;
  createdAt: string;
};

const filteredHistory = history.filter((row) =>
  [row.fileName, row.type, row.status, row.failureReason].some((value) =>
    value?.toLowerCase().includes(search.toLowerCase())
  )
);

function retryImport(rowId) {
  if (!row.retryable) return;
  return importExportClient.retryImport(rowId);
}
```

Data flow:

- Import preview/apply creates or updates an activity record.
- UI loads history, applies local search, and renders state-specific actions.
- Retry submits the prior saved bundle reference only if the backend can do so
  safely.

Error handling:

- If the backend cannot safely retain import bundle payloads, do not implement
  retry; show a "Upload the file again" action instead.
- Progress values must be clamped 0-100.
- Failure reason must be user-safe and bounded.
- Route errors must map through `mapImportExportError` instead of leaking raw DB
  or parser internals.

Regression-test shape:

- Typing in Recent Imports filters rows.
- Failed row shows reason and retry/upload-again action.
- In-progress row renders a progressbar with correct ARIA value.
- Activity Log button opens route/modal or is disabled with explanatory copy.

## Security Contract

If new activity routes are added:

- Endpoint visibility: internal admin.
- Auth model: session cookie.
- RBAC: `settings:read` for activity list, `settings:write` for retry/apply.
- CSRF: required for retry.
- Rate-limit bucket: `admin_read` for list, `admin_write` for retry.
- Reject-unknown validation: clamped pagination/search and strict retry ID.
- Anti-abuse: no public write.
- Secret handling: activity rows must not store or expose raw imported secrets.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/import-export.test.tsx`
- `bun test tests/integration/routes/importExport.test.ts` if routes are added
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update Import / Export report with activity/progress/retry decision.
- Update `_docs/CMS_API.md` for activity/retry routes if added.
- Update `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` for cache
  behavior or uncached rationale.
- Update user docs if Activity Log becomes a supported screen/modal.

## Acceptance Criteria

- Recent Imports search filters rows.
- Failed imports show user-safe reasons and a real next action.
- In-progress rows do not fake progress from static fixtures.
- Activity Log is not clickable without behavior.
