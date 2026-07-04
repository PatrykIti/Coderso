# TASK-489-02-L01: Dry-Run & Apply Controls
# FileName: TASK-489-02-L01-Dry-Run-And-Apply-Controls.md

**Parent Subtask:** TASK-489-02
**Priority:** Medium
**Category:** Solution Kits / Admin UI / Privileged Action
**Estimated Effort:** Small–Medium
**Dependencies:** TASK-489-01 (shared `runsState`). Consumes `useSolutionKitRuns` `apply` / `isMutating` / `mutationError` / `lastResult` and `POST /solution-kits/:id/apply` (via `applySolutionKit`).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Add **Dry run** and **Install** (apply) controls for the active kit,
  gated on `solution-kits:write`. Dry run calls `apply({ dryRun: true })`; Install
  calls `apply({ dryRun: false })`. Both surface `isMutating` (busy), the resulting
  `lastResult` summary, and `mutationError`. Because the hook auto-selects the new
  `result.run.id`, the L01 history list and L02 detail update automatically — no
  extra refetch wiring here.
- **Owning module(s) to create-or-extend:**
  - Create `core/admin/ui/kits/SolutionKitRunActions.tsx` (the action bar:
    Dry-run + Install buttons + `continueOnError` toggle + busy/result/error
    readout). Receives `canWrite`, `isMutating`, `mutationError`, `lastResult`,
    and `onApply(input)` from the page.
  - Extend `core/admin/ui/kits/SolutionKitsPage.tsx` to render
    `<SolutionKitRunActions/>` using the shared `runsState` and the
    `useAdminAuth().can("solution-kits:write")` snapshot.
- **Source-of-truth docs:** `_docs/CMS_API.md` ("Coderso Solution Kits" → Apply
  request payload + permissions), `_docs/SECURITY_SPEC.md` (CSRF/RBAC for internal
  writes), `_docs/ASSISTANT_SITE_BUILDER.md` (distinction from the reviewed
  intake), `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** rollback (L02), the `plan` payload / reviewed-intake step
  selection (that path stays in the LLM-Guide assistant — this control applies the
  kit's default blueprint, sending no `plan`), history/detail rendering
  (TASK-489-01), any backend change.

---

## Security Contract

- **Endpoint visibility:** `internal` — `POST /admin/api/solution-kits/:id/apply`.
  No new/public surface.
- **Auth model:** session cookie (admin) via the shared `apiClient`.
- **RBAC:** requires `solution-kits:write` (route-enforced via
  `requirePermission("solution-kits:write")`). The UI gates both buttons
  client-side: `const canWrite = useAdminAuth().can("solution-kits:write")` — when
  false, the action bar is hidden (or buttons disabled with an explanatory note).
  This is defence-in-depth; the route is the boundary.
- **CSRF:** required on the write; carried automatically by `applySolutionKit`
  (`apiRequest(..., { withCsrf: true })`). The control MUST call the client, never
  a raw `fetch`.
- **Rate-limit bucket:** `admin` (route-enforced).
- **Validation:** server-owned `solutionKitApplyRequestSchema` (strict,
  reject-unknown). The UI sends only `{ dryRun: boolean, continueOnError: boolean }`
  — no `plan` (default-blueprint apply). The client validates the response with
  `isInstallResult`.
- **Anti-abuse:** internal admin write (session + RBAC + CSRF + admin rate-limit);
  no public/anonymous surface, so no nonce/HMAC/reCAPTCHA path applies.
- **Secret/PII handling:** the apply result carries CMS resource snapshots, not
  secrets; the readout shows only the `summary` counters + run id. No snapshot
  bodies are logged. Nothing is cached beyond the hook-owned caches.

---

## Implementation Pseudocode

### Action bar (`SolutionKitRunActions.tsx`)

```tsx
type ApplyInput = { dryRun?: boolean; continueOnError?: boolean };

type Props = {
  canWrite: boolean;
  isMutating: boolean;
  mutationError: string | null;
  lastResult: SolutionKitInstallResult | null;
  onApply: (input: ApplyInput) => void; // page passes runsState.apply
  // L02 injects its rollback trigger via `extraActions` to keep one action bar.
  extraActions?: ReactNode;
};

export function SolutionKitRunActions({ canWrite, isMutating, mutationError, lastResult, onApply, extraActions }: Props) {
  const [continueOnError, setContinueOnError] = useState(true);
  if (!canWrite) {
    return <p className="text-xs text-muted-foreground">You need the Solution Kits write permission to run or roll back installs.</p>;
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Install actions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={continueOnError} onChange={(e) => setContinueOnError(e.target.checked)} disabled={isMutating} />
          Continue on per-item error
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={isMutating}
            onClick={() => onApply({ dryRun: true, continueOnError })}>
            {isMutating ? "Running…" : "Run install (dry run)"}
          </Button>
          <Button type="button" disabled={isMutating}
            onClick={() => onApply({ dryRun: false, continueOnError })}>
            {isMutating ? "Installing…" : "Install kit"}
          </Button>
          {extraActions /* rollback trigger from L02 */}
        </div>
        {mutationError ? <Alert variant="destructive"><AlertDescription>{mutationError}</AlertDescription></Alert> : null}
        {lastResult ? (
          <p className="text-xs text-muted-foreground">
            Last run: {formatRunMode(lastResult.run.mode)} · {lastResult.run.status} · {formatRunSummary(lastResult.summary)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

### Page wiring (`SolutionKitsPage.tsx`)

```tsx
const adminAuth = useAdminAuth();
const canWrite = adminAuth.can("solution-kits:write");
// ...
<SolutionKitRunActions
  canWrite={canWrite}
  isMutating={runsState.isMutating}
  mutationError={runsState.mutationError}
  lastResult={runsState.lastResult}
  onApply={(input) => void runsState.apply(input)}
  extraActions={<SolutionKitRollbackTrigger /* TASK-489-02-L02 */ runsState={runsState} canWrite={canWrite} />}
/>
```

**Data flow:** click → `runsState.apply({ dryRun, continueOnError })` → hook calls
`applySolutionKit(kitId, input)` (CSRF + response-validate) → hook sets
`lastResult`, refreshes runs, selects `result.run.id` → L01 list + L02 detail
re-render. Action bar reflects `isMutating` while in flight.

**Error handling:** the hook resolves failures to `mutationError` (string) and the
domain code mapping (`mapSolutionKitError`) already happens at the route boundary;
the bar renders `mutationError` in a destructive alert. Buttons are disabled while
`isMutating` to prevent double-submit.

**Regression-test shape (Vitest ui-integration, authored in 03-L01):**

- Without `solution-kits:write`: the bar shows the permission note; no
  Install/Dry-run buttons.
- With write: "Run install (dry run)" calls `apply({ dryRun: true, ... })`;
  "Install kit" calls `apply({ dryRun: false, ... })`.
- `isMutating` disables buttons + shows busy labels; `mutationError` renders the
  alert; `lastResult` renders the summary line.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest ui-integration (authored in TASK-489-03-L01):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/solution-kits-runs.test.tsx`
  — gating, dry-run vs apply call args, busy/error/result states (client mocked).
- `tests/vitest/admin/solutionKitsClient.test.ts` and
  `tests/integration/routes/solutionKitsRoutes.test.ts` stay green (not extended).
- No DB migration artifacts (frontend wiring only).
</content>
