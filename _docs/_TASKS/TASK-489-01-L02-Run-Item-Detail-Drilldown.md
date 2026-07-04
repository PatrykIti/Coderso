# TASK-489-01-L02: Run-Item Detail Drill-Down
# FileName: TASK-489-01-L02-Run-Item-Detail-Drilldown.md

**Parent Subtask:** TASK-489-01
**Priority:** Medium
**Category:** Solution Kits / Admin UI
**Estimated Effort:** Small–Medium
**Dependencies:** TASK-489-01-L01 (the selected run drives this panel). Consumes `useSolutionKitRuns` `selectedRun` (`{ run, items }`) and `GET /solution-kits/runs/:runId` (via `getSolutionKitRunCached`).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Render the **run-item detail** for the currently selected run: the
  hook's `selectedRun.items` (`SolutionKitInstallItemRecord[]`) as an ordered
  (by `position`) table/list showing `resourceType` (`content_type|form|page|menu`),
  `resourceKey`, `operation` (`create|update|noop|delete|restore`), `status`
  (`planned|success|failed|skipped`), and per-item `error`. Provide an expandable
  inspector for `beforeSnapshot` / `afterSnapshot` / `rollbackAction` (read-only
  JSON, collapsed by default). Render `isDetailLoading` / `detailError` /
  empty states.
- **Owning module(s) to create-or-extend:**
  - Create `core/admin/ui/kits/SolutionKitRunDetail.tsx` (presentational; receives
    `run`, `items`, `isLoading`, `error`).
  - Create `core/admin/ui/kits/SolutionKitItemSnapshotInspector.tsx` (collapsible
    read-only JSON viewer for the three snapshot fields).
  - Reuse `solutionKitRunFormatting.ts` from L01; extend it with
    `formatItemOperation`, `itemStatusBadgeVariant`, `formatResourceType`.
  - Wire `<SolutionKitRunDetail .../>` into `SolutionKitsPage.tsx` using the shared
    `runsState` from L01 (`selectedRun`, `isDetailLoading`, `detailError`).
- **Source-of-truth docs:** `_docs/CMS_API.md` ("Coderso Solution Kits" → Item
  shape + install-engine notes on snapshots/rollback hints),
  `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** write actions / rollback (TASK-489-02), editing snapshots,
  diffing before/after (render raw collapsed JSON only — no diff engine), history
  list rendering (L01).

---

## Security Contract

- **Endpoint visibility:** `internal` — consumes
  `GET /admin/api/solution-kits/runs/:runId` only. No new/public surface.
- **Auth model:** session cookie (admin) via the shared `apiClient`.
- **RBAC:** read requires `solution-kits:read` (route-enforced). No write
  permission. A failed detail read surfaces `detailError` via an inline
  destructive alert.
- **CSRF:** not applicable (GET).
- **Rate-limit bucket:** `admin` (route-enforced).
- **Validation:** response validated client-side by `isInstallRunDetail` inside
  `getSolutionKitRunCached`; the panel renders only typed
  `SolutionKitInstallItemRecord[]`.
- **Secret/PII handling:** snapshots are CMS resource bodies (content type / form /
  page / menu definitions), **not** credentials or secrets — but they can be
  large and content-bearing. The snapshot inspector renders them **read-only,
  collapsed by default**, and must **not** log snapshot bodies to the console or
  write them anywhere beyond the hook-owned `solutionKitRunDetail` cache. No
  separate persistence. JSON is rendered as text (no `dangerouslySetInnerHTML`).

---

## Implementation Pseudocode

### Formatting extensions (`solutionKitRunFormatting.ts`)

```ts
export const formatResourceType = (t: SolutionKitInstallItemRecord["resourceType"]) =>
  ({ content_type: "Content type", form: "Form", page: "Page", menu: "Menu" }[t] ?? t);

export const formatItemOperation = (op: SolutionKitInstallItemOperation) =>
  op[0]!.toUpperCase() + op.slice(1); // Create/Update/Noop/Delete/Restore

export const itemStatusBadgeVariant = (s: SolutionKitInstallItemStatus) =>
  s === "success" ? "default" : s === "failed" ? "destructive"
  : s === "skipped" ? "secondary" : "outline"; // planned
```

### Snapshot inspector (`SolutionKitItemSnapshotInspector.tsx`)

```tsx
function SnapshotBlock({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);
  if (!value) return null;
  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs text-muted-foreground underline">
        {open ? "Hide" : "Show"} {label}
      </button>
      {open ? (
        <pre className="mt-1 max-h-64 overflow-auto rounded bg-muted p-2 text-[11px]">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
// renders beforeSnapshot / afterSnapshot / rollbackAction, each via SnapshotBlock.
```

### Detail panel (`SolutionKitRunDetail.tsx`)

```tsx
type Props = { run: SolutionKitInstallRunRecord | null; items: SolutionKitInstallItemRecord[]; isLoading: boolean; error: string | null };

export function SolutionKitRunDetail({ run, items, isLoading, error }: Props) {
  if (!run) return null; // nothing selected
  if (error) return <Alert variant="destructive"><AlertTitle>Unable to load run detail</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  const ordered = [...items].sort((a, b) => a.position - b.position);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Run detail</CardTitle>
        <CardDescription>{formatRunMode(run.mode)} · {run.status} · {formatRunSummary(run.summary)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading items…</p> : null}
        {!isLoading && ordered.length === 0 ? <p className="text-sm text-muted-foreground">No item trace recorded.</p> : null}
        {ordered.map((item) => (
          <div key={item.id} className="rounded-md border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{formatResourceType(item.resourceType)}</Badge>
              <span className="font-mono text-xs">{item.resourceKey}</span>
              <Badge variant="secondary">{formatItemOperation(item.operation)}</Badge>
              <Badge variant={itemStatusBadgeVariant(item.status)}>{item.status}</Badge>
            </div>
            {item.error ? <p className="mt-1 text-xs text-destructive">{item.error}</p> : null}
            <SolutionKitItemSnapshotInspector item={item} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

### Page wiring (`SolutionKitsPage.tsx`)

```tsx
<SolutionKitRunDetail
  run={runsState.selectedRun?.run ?? null}
  items={runsState.selectedRun?.items ?? []}
  isLoading={runsState.isDetailLoading}
  error={runsState.detailError}
/>
```

**Data flow:** L01 sets `selectedRunId` → hook effect calls
`getSolutionKitRunCached(selectedRunId)` (hook owns it) → `selectedRun = { run, items }`
→ this panel renders items ordered by `position`, with collapsed snapshot
inspectors.

**Error handling:** `detailError` (string from the hook) → inline destructive
alert; empty items → explicit "No item trace recorded." No throws on null
snapshots (each `SnapshotBlock` returns null when its field is null).

**Regression-test shape (Vitest ui-integration, authored in 03-L01):**

- Selecting a run renders its items ordered by `position`, with resourceType /
  operation / status badges and `resourceKey`.
- Per-item `error` renders; a null snapshot field renders no inspector toggle.
- Toggling a snapshot reveals read-only JSON; `detailError` renders the alert.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest ui-integration (authored in TASK-489-03-L01):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/solution-kits-runs.test.tsx`
  — item ordering, badges, snapshot toggle, detail-error state.
- `tests/vitest/admin/solutionKitsClient.test.ts` stays green (client reused).
- No DB migration artifacts (frontend wiring only).
</content>
