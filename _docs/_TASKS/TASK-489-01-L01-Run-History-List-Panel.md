# TASK-489-01-L01: Run History List Panel
# FileName: TASK-489-01-L01-Run-History-List-Panel.md

**Parent Subtask:** TASK-489-01
**Priority:** Medium
**Category:** Solution Kits / Admin UI
**Estimated Effort:** Small–Medium
**Dependencies:** None new. Consumes `useSolutionKitRuns` and `GET /solution-kits/runs` (via `listSolutionKitRunsCached`).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Mount `useSolutionKitRuns(effectiveSelectedId)` in
  `SolutionKitsPage.tsx` and render an **install-run history list** for the active
  kit: one row per `SolutionKitInstallRunRecord` showing `mode`
  (`dry_run|apply|rollback`), `status` (`running|success|failed`), a compact
  `summary` readout (total/success/failed/skipped), `createdAt`, and a
  rollback-of marker when `rollbackOfRunId` is set. Clicking a row selects it
  (`setSelectedRunId`) and highlights the active run. Render loading / empty /
  error states from the hook.
- **Owning module(s) to create-or-extend:**
  - Extend `core/admin/ui/kits/SolutionKitsPage.tsx` (mount the hook; add the
    history panel into the existing right-rail / below the selected-kit card).
  - Create `core/admin/ui/kits/SolutionKitRunHistory.tsx` (presentational list;
    receives `runs`, `selectedRunId`, `onSelect`, `isLoading`, `error`).
  - Create `core/admin/ui/kits/solutionKitRunFormatting.ts` (pure label/badge
    helpers: `formatRunMode`, `runStatusBadgeVariant`, `formatRunSummary`,
    `formatRunTimestamp`) so formatting is unit-testable and shared with L02.
- **Source-of-truth docs:** `_docs/CMS_API.md` ("Coderso Solution Kits" → Runs
  query params + Run shape), `_docs/ASSISTANT_SITE_BUILDER.md` (operational
  history vs reviewed intake), `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** run-item drill-down (L02), any write controls / rollback
  (TASK-489-02), pagination/search beyond the hook's default, the legacy
  reviewed-intake wizard.

---

## Security Contract

- **Endpoint visibility:** `internal` — consumes `GET /admin/api/solution-kits/runs`
  only (admin `apiClient` prefixes `/admin/api`; route registered as
  `/solution-kits/runs`). No new/public surface.
- **Auth model:** session cookie (admin) via the shared `apiClient`.
- **RBAC:** read requires `solution-kits:read`
  (`requirePermission("solution-kits:read")` on the route). This is a read panel;
  no write permission involved. If the read fails with a permission error, the
  hook's `error` is surfaced via `<Alert variant="destructive">` (no silent
  empty state).
- **CSRF:** not applicable (GET).
- **Rate-limit bucket:** `admin` (route-enforced).
- **Validation:** response shape is validated client-side by
  `isInstallRunRecordList` inside `listSolutionKitRunsCached`; the panel renders
  only typed `SolutionKitInstallRunRecord[]`. Unknown/extra fields are not read.
- **Secret/PII handling:** the list renders only `mode/status/summary/createdAt`
  + ids — no snapshot bodies, no secrets. Nothing new is logged or cached (the
  hook owns caching via `cachePolicy.solutionKitRunsList`).

---

## Implementation Pseudocode

### Formatting helpers (`solutionKitRunFormatting.ts`)

```ts
export const formatRunMode = (mode: SolutionKitInstallMode) =>
  mode === "dry_run" ? "Dry run" : mode === "rollback" ? "Rollback" : "Apply";

export const runStatusBadgeVariant = (status: SolutionKitInstallStatus) =>
  status === "success" ? "default"
  : status === "failed" ? "destructive"
  : "secondary"; // running

export const formatRunSummary = (s: SolutionKitInstallSummary) =>
  `${s.success}/${s.total} ok` + (s.failed ? ` · ${s.failed} failed` : "")
    + (s.skipped ? ` · ${s.skipped} skipped` : "");

export const formatRunTimestamp = (iso: string) =>
  new Date(iso).toLocaleString(); // locale-aware, no secret data
```

### History panel (`SolutionKitRunHistory.tsx`)

```tsx
type Props = {
  runs: SolutionKitInstallRunRecord[];
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
  isLoading: boolean;
  error: string | null;
};

export function SolutionKitRunHistory({ runs, selectedRunId, onSelect, isLoading, error }: Props) {
  if (error) return <Alert variant="destructive"><AlertTitle>Unable to load install history</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (isLoading && runs.length === 0) return <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading install history…</CardContent></Card>;
  if (runs.length === 0) return <Card><CardContent className="py-8 text-sm text-muted-foreground">No installs yet for this kit.</CardContent></Card>;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Install history</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {runs.map((run) => (
          <button
            key={run.id}
            type="button"
            aria-pressed={run.id === selectedRunId}
            onClick={() => onSelect(run.id)}
            className={cn("w-full rounded-md border px-3 py-2 text-left", run.id === selectedRunId && "border-primary bg-muted")}
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline">{formatRunMode(run.mode)}</Badge>
              <Badge variant={runStatusBadgeVariant(run.status)}>{run.status}</Badge>
              {run.rollbackOfRunId ? <Badge variant="secondary">reverts a run</Badge> : null}
              <span className="ml-auto text-xs text-muted-foreground">{formatRunTimestamp(run.createdAt)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{formatRunSummary(run.summary)}</p>
            {run.error ? <p className="mt-1 text-xs text-destructive">{run.error}</p> : null}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
```

### Page wiring (`SolutionKitsPage.tsx`)

```tsx
// inside SolutionKitsPage, after effectiveSelectedId is computed:
const runsState = useSolutionKitRuns(effectiveSelectedId);
// ...render in the right-rail column, after the "Selected kit details" card:
<SolutionKitRunHistory
  runs={runsState.runs}
  selectedRunId={runsState.selectedRunId}
  onSelect={runsState.setSelectedRunId}
  isLoading={runsState.isLoading}
  error={runsState.error}
/>
// runsState is shared down to L02 (detail) and TASK-489-02 (controls) — call the hook ONCE.
```

**Data flow:** kit selection → `effectiveSelectedId` → `useSolutionKitRuns` force-
fetches on mount/kit-change (hook owns the effect + cache) → typed
`runs[]` → presentational list → `onSelect` updates `selectedRunId` (drives L02).

**Error handling:** the hook resolves client errors to a string `error`; the panel
renders a destructive `Alert`. No domain-error mapping here — that lives at the
route boundary (`mapSolutionKitError`), already shipped. Pure formatting helpers
never throw on missing optional fields.

**Regression-test shape (Vitest ui-integration, authored in 03-L01):**

- Renders one row per mocked run with mode + status + summary text.
- Clicking a row calls `setSelectedRunId` and marks the row `aria-pressed`.
- Loading state (no runs yet) and empty state ("No installs yet") render.
- A hook `error` renders the destructive alert.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest ui-integration (authored in TASK-489-03-L01):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/solution-kits-runs.test.tsx`
  — history render, selection, loading/empty/error.
- Optional pure-unit coverage for `solutionKitRunFormatting.ts` may live in the
  same Vitest file or `tests/vitest/admin/solutionKitRunFormatting.test.ts`.
- `tests/vitest/ui/solution-kits-page.test.tsx` stays green (reconciled in 03-L02).
- No DB migration artifacts (frontend wiring only; the run tables already exist).
</content>
