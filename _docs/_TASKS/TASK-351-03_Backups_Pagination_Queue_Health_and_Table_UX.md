# TASK-351-03: Backups Pagination, Queue Health, and Table UX
# FileName: TASK-351-03_Backups_Pagination_Queue_Health_and_Table_UX.md

**Priority:** Medium
**Category:** Backups + Admin UI + API + UX
**Estimated Effort:** Large
**Dependencies:** TASK-351-02
**Status:** Done (2026-06-01)

---

## Overview

Make the Backups table and status UX truthful. The report shows `Next` is
enabled without pagination behavior, and Claude found queued rows give no worker
health or reason for disabled actions.

## Sub-Tasks

- Add list pagination contract with `page`, `limit`, `total`, `hasNext`, and
  `hasPrevious`, or hide/disable pagination when unsupported.
- Wire table controls to page state and API params if pagination is supported.
- Add queue age calculation and warning for backups queued longer than the
  accepted threshold.
- Show why restore/download/delete are unavailable per row.
- Add optional auto-refresh or manual refresh for queued/running rows.
- Keep search filtering consistent with pagination: document and test whether
  search is local-on-current-page or server-side.
- Decide the admin cache contract for Backups. If intentionally uncached because
  backup state is sensitive/fast-changing, document that in admin cache docs;
  otherwise add cache keys, TTLs, invalidation, and cacheBus behavior.

## Files To Change

| File | Required change |
|---|---|
| `core/services/backups/backupService.ts` | Add paginated list helper and worker health summary if needed. |
| `core/server/validation/backupSchemas.ts` | Add strict pagination query schema. |
| `core/server/routes/backupRoutes.ts` | Parse/validate pagination and return list metadata. |
| `core/admin/services/backupsClient.ts` | Return paginated payload and optional worker health. |
| `core/admin/services/cachePolicy.ts` | Add Backups cache keys/TTLs only if the resource becomes cached; otherwise document the uncached decision. |
| `core/admin/ui/backups/BackupsPage.tsx` | Own page/search/refresh state and avoid mount-force loops. |
| `core/admin/ui/backups/BackupsTable.tsx` | Render stateful pagination, queue warnings, and disabled-action reasons. |
| `tests/vitest/ui/backups-page-wave.test.tsx` | Cover pagination, queued warning, refresh, disabled reasons. |
| `tests/integration/routes/backups.test.ts` | Cover pagination query validation and list metadata. |
| `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` | Document cached or intentionally uncached Backups behavior. |

## Implementation Pseudocode

```ts
type BackupListResult = {
  items: BackupRecord[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
  worker?: { mode: "inline" | "external"; healthy: boolean; message?: string };
};

function getBackupActionState(row) {
  if (row.status === "complete" && row.artifactPath) return { canDownload: true, reason: null };
  if (row.status === "queued") return { canDownload: false, reason: "Backup is waiting for processing." };
  if (row.status === "failed") return { canDownload: false, reason: row.error ?? "Backup failed." };
}
```

Data flow:

- Page state -> `listBackups({ page, limit, query })` -> route -> service list
  result -> table.
- Table emits page changes, refresh, restore/download/delete actions.

Error handling:

- Clamp page/limit and reject non-numeric invalid values.
- If the current page becomes empty after deletion, move to the previous valid
  page.
- Auto-refresh must pause when the component unmounts and avoid overwriting a
  visible error with stale data.
- Cached state, if introduced, must not overwrite queued/running refresh
  results or dirty UI state.

Regression-test shape:

- Empty list hides/disables pagination.
- Single-page list disables Previous/Next.
- Multi-page list changes API params on Next/Previous.
- Queued row older than threshold shows an explanatory warning.
- Disabled action buttons expose accessible labels/reasons.
- Cache behavior is tested or the uncached decision is documented.

## Security Contract

- Endpoint visibility: internal admin `GET /admin/api/backups`.
- Auth model: session cookie.
- RBAC: `backups:read`.
- CSRF: not required for GET.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: `page` and `limit` are integers with explicit
  min/max bounds; unknown query params must not influence DB queries.
- Anti-abuse: no public write.
- Data handling: worker health messages must be user-safe and not expose
  filesystem paths or credentials.

## Testing Requirements

- `bun test tests/integration/routes/backups.test.ts`
- `bun run test:vitest -- tests/vitest/admin/backupsClient.test.ts tests/vitest/ui/backups-page-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update Backups report with pagination/queue UX resolution.
- Update `_docs/CMS_API.md` for pagination and worker-health fields.
- Update `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` for cache
  behavior or explicit uncached rationale.
- Update user docs if queue health or refresh policy becomes visible.

## Acceptance Criteria

- Pagination controls are never placeholders.
- Queued/running rows explain what is happening.
- Disabled actions tell users why they are unavailable.
- Search, pagination, and refresh behavior are deterministic and tested.

## Closure Notes

Done (2026-06-01): `listBackups` now returns paginated list metadata plus
external worker health, the route strictly parses/rejects query parameters, and
the admin client/table use `page`, `limit`, `query`, `total`, `hasNext`, and
`hasPrevious` instead of local placeholder pagination. The table shows worker
messages, aged queued warnings, per-action disabled reasons, search-empty copy,
and refresh/Previous/Next states from the server result. Backups are documented
as intentionally uncached.
