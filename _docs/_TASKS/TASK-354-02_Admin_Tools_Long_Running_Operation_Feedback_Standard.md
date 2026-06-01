# TASK-354-02: Admin Tools Long-Running Operation Feedback Standard
# FileName: TASK-354-02_Admin_Tools_Long_Running_Operation_Feedback_Standard.md

**Priority:** Medium
**Category:** Admin Tools + Async UX + Reliability
**Estimated Effort:** Large
**Dependencies:** TASK-349, TASK-351, TASK-352
**Status:** Done (2026-06-01)

---

## Overview

Standardize feedback for Tools operations that are not instant: SEO audit,
backup execution, and import processing. Reports found pre-scan `0%`, queued
backups with no worker explanation, and import rows without real progress or
failure reasons.

## Sub-Tasks

- Define shared state vocabulary: `not-run`, `queued`, `running`,
  `completed`, `failed`, `external-worker`, `no-data`.
- Ensure each async tool shows one state at a time with user-safe reason.
- Add age-aware warnings for long-queued jobs where applicable.
- Add refresh/polling policy per tool without mount-force loops.
- Make tests assert no stale progress is presented as current.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/seo/SeoManagerPage.tsx` | Use `not-run`/`running`/`completed` audit state. |
| `core/admin/ui/backups/BackupsPage.tsx` | Use queued/running/completed/failed/external-worker state and refresh policy. |
| `core/admin/ui/backups/BackupsTable.tsx` | Show aged queued warnings and action reasons. |
| `core/admin/ui/import-export/ImportDropzone.tsx` | Show real progress/failure/retry state. |
| `tests/vitest/ui/seo-manager.test.tsx` | Cover SEO audit state labels. |
| `tests/vitest/ui/backups-page-wave.test.tsx` | Cover queue health and aged warnings. |
| `tests/vitest/ui/import-export.test.tsx` | Cover progress/failure/retry state. |

## Implementation Pseudocode

```ts
type ToolAsyncState =
  | { kind: "not-run"; message: string }
  | { kind: "queued"; queuedAt: string; message: string }
  | { kind: "running"; progress?: number; message: string }
  | { kind: "completed"; completedAt: string; message: string }
  | { kind: "failed"; reason: string; retryable: boolean };

function resolveQueuedWarning(state: ToolAsyncState, now = Date.now()) {
  if (state.kind !== "queued") return null;
  return now - Date.parse(state.queuedAt) > QUEUED_WARNING_MS
    ? "This job has been queued longer than expected."
    : null;
}
```

Data flow:

- Tool-specific service/API state -> page-level async state resolver -> compact
  status component or local status area.
- Polling/refresh happens only when queued/running states exist.

Error handling:

- Failed states show bounded user-safe reasons.
- External worker state must not expose internal hostnames, paths, or secrets.
- Polling must stop on unmount and avoid overwriting a dirty local edit.

Regression-test shape:

- SEO before first audit does not show `0%`.
- Backup queued > threshold shows warning.
- Import failed row shows reason and retry/upload-again action.
- No stale progress remains after a failed/completed transition.

## Security Contract

No new route changes are required by the standard itself.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.
- Secret handling: async status/failure reasons must be redacted and bounded.

## Testing Requirements

- Relevant per-screen Vitest suites.
- Focused Playwright pass for SEO audit, Backups queued/completed, and Import
  failed/in-progress states.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Tools overview report with async-state vocabulary.
- Per-tool reports where state handling changes.

## Acceptance Criteria

- Tools do not present queued, failed, no-data, or not-run states as ambiguous
  zeros.
- Long-running operations expose refresh/health behavior clearly.
- Failure messages are useful without leaking internals.

## Closure Notes

Done (2026-06-01): the matrix locks the shared async vocabulary for SEO,
Backups, and Import / Export. Backups now auto-refreshes only while queued,
running, or external-worker-unhealthy states are present, and existing Vitest
coverage proves queued worker copy, disabled reasons, progress, failure, and
retry behavior.
