# TASK-489-02-L02: Rollback Control (privileged, confirm-gated)
# FileName: TASK-489-02-L02-Rollback-Control-With-Confirm.md

**Parent Subtask:** TASK-489-02
**Priority:** Medium
**Category:** Solution Kits / Admin UI / Privileged Action / Safety-Critical
**Estimated Effort:** Medium
**Dependencies:** TASK-489-01 (shared `runsState`) · TASK-489-02-L01 (action bar host + `canWrite`). Consumes `useSolutionKitRuns` `rollback` / `isMutating` / `mutationError` / `latestApplyRunId` and `POST /solution-kits/:id/rollback` (via `rollbackSolutionKit`). Reuses `core/admin/ui/shared/ConfirmActionDialog.tsx`.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Provide the **safety-critical rollback** entry point. A rollback
  reverts a prior **successful apply** run (restoring `update` snapshots and
  removing `create`d resources per the install engine). The control MUST be:
  (1) gated on `solution-kits:write`; (2) behind an **explicit confirm step**
  (reuse `ConfirmActionDialog`, `variant="destructive"`); (3) **source-scoped** —
  it rolls back a chosen source run, defaulting to `latestApplyRunId` (or the
  currently selected run when it is a successful `apply`). It calls the hook's
  `rollback(sourceRunId)`.
- **Owning module(s) to create-or-extend:**
  - Create `core/admin/ui/kits/SolutionKitRollbackTrigger.tsx` — the "Roll back
    this install" button + `ConfirmActionDialog` wiring. Receives the shared
    `runsState` and `canWrite`.
  - Inject it into the L01 action bar via the `extraActions` slot (one action bar,
    no duplicate state).
- **Source-of-truth docs:** `_docs/CMS_API.md` ("Coderso Solution Kits" → Rollback
  request payload + install-engine rollback semantics + permissions),
  `_docs/SECURITY_SPEC.md` (privileged internal write: RBAC + CSRF + confirm),
  `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** dry-run/apply (L01), history/detail rendering (TASK-489-01),
  multi-run batch rollback, any backend change to rollback semantics (the engine
  + route already exist and are frozen).

---

## Security Contract

- **Endpoint visibility:** `internal` — `POST /admin/api/solution-kits/:id/rollback`.
  No new/public surface.
- **Auth model:** session cookie (admin) via the shared `apiClient`.
- **RBAC:** requires `solution-kits:write` (route-enforced). The UI **must** gate
  the trigger on `canWrite = useAdminAuth().can("solution-kits:write")` — render
  nothing (or a disabled control) when absent. Defence-in-depth; the route is the
  boundary.
- **CSRF:** required; carried by `rollbackSolutionKit` (`withCsrf: true`). Never a
  raw `fetch`.
- **Rate-limit bucket:** `admin` (route-enforced).
- **Validation:** server-owned `solutionKitRollbackRequestSchema` (strict). The UI
  sends only `{ sourceRunId?: string, continueOnError?: boolean }`. The route maps
  domain errors via `mapSolutionKitError`:
  `solution_kit_rollback_source_not_found` (404),
  `solution_kit_rollback_invalid_source` (409, source must be a successful apply
  run) — both surfaced to the user as `mutationError`.
- **Privileged-action safety (the core requirement of this leaf):**
  - **Confirm step is mandatory.** Use `ConfirmActionDialog` with
    `variant="destructive"`, a clear destructive description naming the target run
    + kit. Consider `requireTypedValue` (e.g. the kit id) for the strongest
    affordance on this irreversible-class action — decide per UX, but the plain
    confirm is the minimum.
  - **Source clarity.** The dialog states exactly which source run is being
    reverted (`sourceRunId` resolved from `latestApplyRunId` or the selected
    successful apply run) so the operator cannot roll back blindly.
  - **No write without confirm + permission.** The button is hidden when
    `!canWrite`; `rollback` is only called from the dialog's `onConfirm`.
- **Anti-abuse:** internal admin write (session + RBAC + CSRF + admin rate-limit);
  no public surface, so nonce/HMAC/reCAPTCHA do not apply.
- **Secret/PII handling:** the rollback result carries restored CMS resource
  snapshots, not secrets; only `summary` counters + run id are shown. No snapshot
  bodies logged; nothing cached beyond the hook-owned caches.

---

## Implementation Pseudocode

### Resolve the source run

```ts
// Prefer the user's explicit selection when it's a successful apply; else latest apply.
const resolveSourceRunId = (runsState): string | null => {
  const sel = runsState.selectedRun?.run;
  if (sel && sel.mode === "apply" && sel.status === "success") return sel.id;
  return runsState.latestApplyRunId; // hook-derived: first run with mode === "apply"
};
```

### Rollback trigger (`SolutionKitRollbackTrigger.tsx`)

```tsx
type Props = { runsState: ReturnType<typeof useSolutionKitRuns>; canWrite: boolean };

export function SolutionKitRollbackTrigger({ runsState, canWrite }: Props) {
  const [open, setOpen] = useState(false);
  if (!canWrite) return null;
  const sourceRunId = resolveSourceRunId(runsState);
  const disabled = !sourceRunId || runsState.isMutating;

  return (
    <>
      <Button type="button" variant="destructive" disabled={disabled} onClick={() => setOpen(true)}>
        Roll back this install
      </Button>
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        tone="destructive"
        title="Roll back this solution kit install"
        description={
          <>This restores resources changed by the selected apply run and removes resources it created.
          This cannot be undone except by re-installing. Source run: <code>{sourceRunId}</code>.</>
        }
        confirmLabel="Roll back install"
        confirmingLabel="Rolling back…"
        isConfirming={runsState.isMutating}
        // Optional strongest affordance: requireTypedValue set to the active kit id.
        // `useSolutionKitRuns` does NOT return kitId (it takes it only as a param), so
        // thread the page's active kit id in as a prop — e.g. requireTypedValue={kitId ?? undefined}.
        onConfirm={async () => {
          if (!sourceRunId) return;
          const result = await runsState.rollback(sourceRunId);
          if (!result) throw new Error(runsState.mutationError ?? "Rollback failed");
          // success: hook already refreshed runs + selected the new rollback run
        }}
      />
    </>
  );
}
```

> The button mounts inside the L01 action bar's `extraActions` slot. The dialog's
> `onConfirm` throwing on failure lets `ConfirmActionDialog` keep itself open and
> show the inline error; on success the dialog closes and the L01 history/L02
> detail re-render via the hook's post-mutation refresh.

**Data flow:** click → confirm dialog → `onConfirm` → `runsState.rollback(sourceRunId)`
→ hook calls `rollbackSolutionKit(kitId, { sourceRunId, continueOnError: true })`
(CSRF + response-validate) → hook refreshes runs, selects the new rollback run →
history + detail update; result summary shows in the L01 readout.

**Error handling:** domain codes are mapped at the route (`mapSolutionKitError`)
and reach the UI as `mutationError`. The dialog surfaces the failure inline (via
its `onConfirm` throw → internal error alert), and the action bar also shows
`mutationError`. The button is disabled when there is no eligible source run
(`!sourceRunId`) or while mutating.

**Regression-test shape (Vitest ui-integration, authored in 03-L01):**

- Hidden without `solution-kits:write`.
- Disabled when there is no successful apply run to revert (`latestApplyRunId`
  null and no eligible selected run).
- Clicking opens the confirm dialog; `rollback` is **not** called until confirm.
- Confirm calls `rollback(sourceRunId)` with the resolved source id.
- A rejected `rollback` (mocked) keeps the dialog open and surfaces the error.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest ui-integration (authored in TASK-489-03-L01):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/solution-kits-runs.test.tsx`
  — gating, source resolution, confirm-before-call, success refresh, error keeps
  dialog open (client + `ConfirmActionDialog` exercised; `solutionKitsClient`
  mocked at the boundary).
- `tests/vitest/admin/solutionKitsClient.test.ts` and
  `tests/integration/routes/solutionKitsRoutes.test.ts` stay green (rollback route
  + error codes already covered there; not extended).
- No DB migration artifacts (frontend wiring only; rollback engine + tables exist).
</content>
