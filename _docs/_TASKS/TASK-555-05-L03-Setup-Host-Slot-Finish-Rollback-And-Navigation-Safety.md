# TASK-555-05-L03: Setup Host Slot Finish Rollback and Navigation Safety
# FileName: TASK-555-05-L03-Setup-Host-Slot-Finish-Rollback-And-Navigation-Safety.md

**Parent Subtask:** TASK-555-05
**Priority:** High
**Category:** Setup Wizard / Host Integration / Reliability
**Estimated Effort:** Large
**Status:** ⏳ To Do
**Dependencies:** landed TASK-555-05-L02 receipt and the parent tracked-workflow/start
receipts; no later TASK-414 product leaf is a prerequisite.

---

## Overview

Compose the reviewed starter region into Setup, make Finish consume the latest
authoritative wizard values after starter operations settle, and expose the
memory-only product-neutral continuation seam that a later explicitly
setup-compatible protected route can consume without completing Setup.

## Sub-Tasks

None; this is an executable leaf.

## Scope and Exact Single-Writer Files

Compose one additive `starterContentReview` region inside the existing Starter step
between its selector and wizard navigation; do not replace Setup/Finish. Sole writer:
`core/admin/ui/setup/SetupWizard.tsx`, `core/admin/app/AdminApp.tsx`,
new `core/admin/app/adminAppContracts.tsx`,
`tests/vitest/ui-integration/setup-wizard.test.tsx`, and
`tests/vitest/ui-integration/setupFinalize.test.tsx`, plus new
`tests/vitest/admin/admin-app-contracts.test.ts`. The focused contract test injects a
synthetic protected review descriptor; no TASK-414 component/route/fixture is imported.

Before adding behavior, cohesively move the module-level pure route matching,
settings projection/update, setup/installer gating, and small fallback UI
contracts from `AdminApp.tsx` into `adminAppContracts.tsx` with stable re-exports.
This is a responsibility split, not an arbitrary line-range move; browser/auth/
effectful orchestration remains in `AdminApp`. Pin every moved helper with the
focused test and require `AdminApp.tsx <=1000` before the Setup change lands.

Instantiate L02's `useSetupStarterController` above `AdminApp`'s Setup/protected-route
switch and pass its authoritative `state/actions/barrier` into `SetupWizard`;
unmounting the wizard for an allowed
review route must not discard dirty values, current step, starter selection, or
pending Finish state. `adminAppContracts.tsx` owns the product-neutral optional route
metadata type `setupAccess: "requires-complete" | "review"`, resolves omission to
`"requires-complete"`, and owns `SetupReviewContinuationV1`. The continuation is
created only by a mounted Setup host callback after it canonicalizes an href,
matches a real protected route whose descriptor is `review`, and binds the
current authenticated actor/auth epoch. It stays component memory only. Manual
URL entry, another route, actor/auth-epoch change, reload, logout, or Finish
clears/denies it and renders Setup. Route metadata is UX gating, never server
authorization.

Setup is an interception of the canonical protected Admin root, not a registered
screen. The canonical entry is `/admin` (or the configured Admin base root through the
shared path helper); `/admin/setup` must never be registered, linked, pushed, replaced,
or used by tests. After a successful Finish, clear any review continuation and replace
the route with the canonical Admin root so the Dashboard is visibly rendered at
`/admin`. A failed Finish leaves Setup on the canonical root with its state intact.
For rollback settlement, terminal `failed` leaves the active head unchanged but clears
all pending reservation fields and re-enables an explicit retry. Only
`recovery_required` retains the reservation and recovery/navigation guard.

## Forbidden Paths

Other Setup/client files, Solution Kits/TASK-489 UI, server/DB/artifacts, named
forbidden tasks, indexes/changelogs/workflows/smokes/root/TMP.
In particular, all TASK-414 files and real product routes are read-only; remaining
TASK-414 consumes this terminal seam later. The tracked TASK-555 workflow is read-only.

## Security Contract

Internal client only. Finish/settings and starter mutations retain server permissions,
CSRF, and admin_write. Host never accepts provider/package/path input. No mutation
state/raw key/snapshot persists. Navigation is blocked only while outcome is uncertain
and always provides safe retry/status feedback.

## Implementation Pseudocode

```ts
type SetupAccess = "requires-complete" | "review";
type RouteDefinition = ExistingRouteDefinition & { setupAccess?: SetupAccess };

const readSetupAccess = (route: RouteDefinition): SetupAccess =>
  route.setupAccess ?? "requires-complete";

async function completeSetup() {
  const settled = await setupStarterController.barrier.requireSettled();
  await updateSettings({
    ...toBasicSettingsPayload(settled.values),
    "setup.completed": true,
  });
  clearSetupReviewContinuation();
  router.replace(adminBasePath);
}

function openSetupReviewRoute(href: string) {
  const target = requireCanonicalSetupReviewRoute(href, protectedRoutes);
  setSetupReviewContinuation(bindToCurrentActorAndAuthEpoch(target));
  router.push(target.href);
}

const mayRenderSetupReview = matchesSetupReviewContinuation({
  continuation: setupReviewContinuation,
  route: matchedProtectedRoute,
  actorId: authUser.id,
  authEpoch,
});
if (showSetupWizard && !mayRenderSetupReview) return renderControlledSetupWizard();
if (showSetupWizard && mayRenderSetupReview) return renderMatchedProtectedRoute();
```

Reducer emits authoritative patches into controller-owned wizard values -> user may
edit -> barrier settles -> Finish reads the returned post-settlement values. Rollback patches restored effective values
with the same revision guard. Errors leave Setup incomplete and preserve form state.

## Error Handling

Barrier/setup failures keep `setup.completed` false and preserve current form state.
A terminal rollback `failed` clears pending reservation state and remains visibly
retryable; `recovery_required` keeps the reservation, remains visibly recoverable, and
continues to block unsafe navigation. Late-response failures remain visible and
retryable under the same settlement state.

## Testing Requirements

Test additive slot order, skipped starter, in-flight Finish block, FormaDom apply then
Finish preserving name/locale, a response settling during Finish await, later user edit
winning, late response, rollback, navigation/retry, controlled-state unmount/remount,
omitted metadata defaulting to `requires-complete`, injected synthetic `review`
descriptor allowlisting, manual/deep-link/reload/auth-epoch denial, and unchanged
nonstarter Setup fields. Enter Setup through canonical `/admin`, prove no
`/admin/setup` route/href/history mutation exists, and after successful Finish assert
the canonical `/admin` URL plus visibly rendered Dashboard. Cover failed rollback
clearing the pending reservation and enabling retry versus `recovery_required`
retaining the reservation and blocking unsafe navigation. A source scan proves no
TASK-414 test/product import.

```bash
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/setup-wizard.test.tsx tests/vitest/ui-integration/setupFinalize.test.tsx tests/vitest/admin/admin-app-contracts.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/admin/ui/setup/SetupWizard.tsx core/admin/app/AdminApp.tsx core/admin/app/adminAppContracts.tsx tests/vitest/ui-integration/setup-wizard.test.tsx tests/vitest/ui-integration/setupFinalize.test.tsx tests/vitest/admin/admin-app-contracts.test.ts
```

Every touched file must finish <=1000 lines; the named cohesive split is a
precondition, not an implementation-time optional fallback.

## Documentation Updates Required

TASK-555-07-L01 owns the documentation handoff before smoke; L03 is closure metadata
only.
