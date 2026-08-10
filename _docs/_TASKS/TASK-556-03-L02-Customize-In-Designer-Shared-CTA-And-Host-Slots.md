# TASK-556-03-L02: Customize in Designer Shared CTA and Host Slots
# FileName: TASK-556-03-L02-Customize-In-Designer-Shared-CTA-And-Host-Slots.md

**Parent Task:** TASK-556
**Parent Subtask:** TASK-556-03
**Priority:** High
**Category:** Admin UI / Solution Kits / Setup / Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-556 external terminal gate; TASK-556-03-L01
**Start Receipt:** TASK-556-03-L01 reviewed landed receipt; exact post-TASK-555 Solution Kits `review` and Setup `starterContentReview` JSX anchors plus terminal `useSetupStarterController`, `SetupReviewContinuationV1`, `setupAccess: "review"`, and `openSetupReviewRoute` exports recorded
**Completion Receipt:** Reviewed owned diff plus every command below green; TASK-555 direct-install components/callbacks byte-identical outside additive siblings
**Status:** ⏳ To Do
**Changelog:** 1270 pinned

---

## Overview

Add one shared `Customize in Designer` component at exactly two additive successor
anchors inside TASK-555's landed host regions. Do not edit or wrap direct install;
no global slot registry or placeholder export is introduced.

## Sub-Tasks

None; this is an executable leaf.

## Exact Writer and Forbidden Paths

Sole writer paths:

- `core/admin/ui/designer/CustomizeStaticStarterInDesigner.tsx`;
- `core/admin/ui/designer/staticStarterAdminControlDescriptors.ts`;
- `core/admin/ui/designer/useStaticStarterDesignerHandoff.ts`;
- exact additive sibling immediately after TASK-555's terminal `review` region
  and before TASK-489 operational history in `core/admin/ui/kits/SolutionKitsPage.tsx`;
- exact additive sibling at the end of TASK-555's terminal
  `starterContentReview` region and before wizard navigation in
  `core/admin/ui/setup/SetupWizard.tsx`;
- `tests/vitest/ui-integration/customize-static-starter-in-designer.test.tsx`;
- `tests/vitest/ui-integration/solution-kits-static-designer-slot.test.tsx`;
- `tests/vitest/ui-integration/setup-static-designer-slot.test.tsx`;
- `tests/vitest/admin/static-designer-navigation-accessibility.test.tsx`.

Forbidden paths: every other region in `SolutionKitsPage.tsx`/`SetupWizard.tsx`;
`core/admin/app/AdminApp.tsx` and `adminAppContracts.tsx`; TASK-555 direct preview/apply/rollback clients,
services, components and TASK-489 history; prior TASK-556 service; Designer
workspace source; AssistantPanel/events/Agent/provider/site-kit; capability/
smoke/docs, task/changelog indexes, root config, `AGENTS.md`, `_TMP*`, and
non-TASK-556 tasks. Before editing, record the terminal component/JSX anchors
promised by TASK-555-06-L03 (`review`) and TASK-555-05-L03
(`starterContentReview`). If either region did not land or is not safely additive,
stop and correct this contract; do not invent a slot or edit around it.

## Shared Component and Host Contract

The component accepts safe release summary, permission booleans, the 03-L01
client dependency, and a host-provided `openWorkspace(href)` callback. It never
reads provider availability to gate static
customization. It shows a real button only for `formadom-studio` and all three
permissions; otherwise render hidden or an explicit disabled reason according to
the terminal host pattern. It keeps idempotency key in component/reducer memory
only, stable across the same `{sourceId, expectedReleaseDescriptorDigest}`
uncertain attempt/retry. An identity/digest change or explicit
`designer_static_seed_idempotency_conflict` invalidates the failed attempt and
rotates the key before the next user-triggered request. In-progress, timeout,
disconnect, and other uncertain outcomes keep the current key. The first settled
`designer_static_seed_failed`/422 marks that key complete and enables exactly one
user-triggered fresh-key retry for the same identity; a second 422 in the same
mounted identity disables another retry and keeps bounded failure guidance.
Terminal success/unmount clears component memory and never schedules a request.

The pure descriptor module exports exactly two deeply frozen controls and no
runtime registration side effect:

| Host | `controlId` | `routeId` | `controlIdInRoute` | Product area |
|---|---|---|---|---|
| Solution Kits review | `docs.control.solution-kits.customize-static-starter-in-designer` | `core.advanced.solution-kits` | `setup-customize-static-starter-in-designer` | `docs.area.solution-kits` |
| Setup starter review | `docs.control.setup.customize-static-starter-in-designer` | `core.root` | `setup-customize-static-starter-in-designer` | `docs.area.solution-kits` |

`controlIdInRoute` follows the terminal `setup-`-prefixed route-local key
convention used by TASK-555-03-L03 on the same route; route-local uniqueness is
preserved. The full control IDs in the TASK-556-04-L01 relation map remain
unchanged and are unrelated to this route-local key.

Both use feature source `core:designer/code-owned-static-starter` and exact
`allOf` permissions `designer:read`, `designer:write`, and
`solution-kits:read`. Each host passes its matching descriptor to the shared
component, which emits the terminal stable route-local control marker. The
descriptor module imports only terminal pure Admin descriptor types; it contains
no label, href, React value, permission decision, or path inference.

On success:

1. derive canonical href with terminal `adminPaths` Designer workspace helper;
2. call terminal `prefetchAdminRoute(href, adminBasePath, { activeHref })` as
   best effort; its registered Designer entry owns `{ force: false }` warmup;
3. pass the canonical href to the host callback: Solution Kits uses terminal SPA
   navigation, while Setup uses TASK-555's `openSetupReviewRoute`, which validates
   the route descriptor and creates the actor/auth-epoch-bound memory continuation;
4. move focus to the destination workspace heading through terminal route focus behavior.

Setup must not mutate/submit starter install state, settings dirty state, current
step, selected starter, or pending Finish. A user edit made during the request
remains authoritative. Navigation-away protection follows terminal dirty-state
policy. Failure returns focus to CTA, preserves current host state, and shows a
bounded actionable error. Repeat click/reopen navigates to the same workspace.
Returning from Designer remounts the controlled Setup wizard with the same
values/step/selection/Finish state. Reload/manual deep link/auth change has no
continuation and therefore fails closed back to Setup.

The Setup host is a consumer of TASK-555's terminal architecture, not a new
owner. `useSetupStarterController` remains instantiated by terminal `AdminApp`;
the existing controlled `state/actions/barrier` props reach `SetupWizard`. The
additive CTA receives only the existing host callback `openSetupReviewRoute`.
That callback creates terminal `SetupReviewContinuationV1` only after the real
workspace descriptor resolves with `setupAccess: "review"`. TASK-556 neither
edits nor re-exports `AdminApp.tsx`/`adminAppContracts.tsx`, creates no second
continuation, and does not reconstruct route matching or actor/auth-epoch gates.

TASK-555 direct install remains visible and behavior/permissions/provider-offline
availability unchanged. Static CTA never invokes direct preview/apply/rollback,
AssistantPanel, Agent, provider, or `site-kit.*`.

## Implementation Pseudocode

```tsx
function classifySettledOrUncertainFailure(error, key, state) {
  const safe = safeUiError(error);
  if (safe.code === "designer_static_seed_failed") {
    return state.deterministicRetryUsed
      ? { type: "terminalFailure", error: safe, key: null }
      : {
          type: "retryableDeterministicFailure",
          error: safe,
          key: null,
          deterministicRetryUsed: true,
        };
  }
  if (safe.code === "designer_static_seed_idempotency_conflict") {
    return { type: "failed", error: safe, key: null };
  }
  return { type: "failed", error: safe, key };
}

async function handleCustomize() {
  const key = state.currentAttemptKey ?? createMemoryOnlyIdempotencyKey();
  dispatch({ type: "pending", key });
  try {
    const result = await createStaticStarterWorkspace("formadom-studio", {
      expectedReleaseDescriptorDigest,
      idempotencyKey: key,
    });
    const href = adminPaths.designerWorkspace(result.workspace.id);
    prefetchAdminRoute(href, adminBasePath, { activeHref });
    openWorkspace(href); // host chooses normal SPA or Setup review continuation
  } catch (error) {
    dispatch(classifySettledOrUncertainFailure(error, key, state));
    restoreTriggerFocus();
  }
}
```

**Data flow:** terminal TASK-555 safe release summary + host permissions -> shared
CTA -> 03-L01 client -> canonical adminPaths/prefetch -> host navigation callback
-> terminal Designer workspace. Direct install and controlled Setup state are
parallel untouched flows.

**Errors:** map 401 to session recovery, 403 to permission copy, 404/stale to
refresh release copy, 409 in-progress/idempotency to safe retry/reopen copy,
422 to deterministic failure copy, 429 with bounded retry guidance, 503 to
temporary unavailable; never expose raw body/digest/path/stack.

## Tests

- Both exact additive host regions render the same component and no third host exists.
- Permission matrix requires all three; server 403 remains authoritative.
- Provider disabled/offline: static CTA and TASK-555 direct install both usable;
  explicit later AI revision alone reports provider unavailable.
- Success uses exact `adminPaths`, `AdminLink`/SPA navigation, and the real
  three-argument `prefetchAdminRoute`; the registered warmup is `force:false`
  and prefetch failure does not block navigation.
- Loading/double-click/retry/reopen, stable memory-only key for one request
  identity across uncertain/in-progress results, key rotation on descriptor or
  explicit idempotency conflict, and no storage/cache leak. A first deterministic
  422 permits exactly one next-click fresh-key retry; a second deterministic 422
  creates no third attempt until identity/remount reset, while same-key failure
  replay and backend no-second-retry remain pinned.
- Exact two-control descriptor bytes, route IDs, route-local keys, feature source,
  product areas, require-all permissions, host marker parity, and no third control.
- Focus return, destination focus, keyboard name/state, light/dark and narrow host layout.
- Setup dirty edits/step/Finish remain unchanged on pending/success/failure/navigation.
- Setup continuation accepts only the real `setupAccess: "review"` workspace
  route, survives SPA return in memory, and rejects reload/manual URL/auth change.
- Read-only TASK-555 regressions prove `useSetupStarterController` still has one
  AdminApp owner, `SetupReviewContinuationV1` stays memory-only, and
  `openSetupReviewRoute` remains the sole review-continuation creator; no
  TASK-556 diff touches `AdminApp.tsx` or `adminAppContracts.tsx`.
- Direct install preview/apply/rollback tests and snapshots remain unchanged.
- Import guard forbids AssistantPanel/events/Agent/provider/site-kit/direct-install calls.

## Security Contract

- **Visibility:** browser component calls only internal 03-L01 endpoint.
- **Authentication/RBAC:** UI require-all gating is defense in depth; server authoritative.
- **CSRF/rate:** shared client owns CSRF and production rate handling.
- **Validation:** only strict safe response; server-derived canonical workspace href helper.
- **Anti-abuse:** no public write/nonce/HMAC/reCAPTCHA.
- **Privacy:** no TASK-556 binding/brief/request/idempotency/receipt/package/staged
  data in storage/logs; the attempt key is memory-only. TASK-555's safe scoped
  release summary remains unchanged.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/ui-integration/customize-static-starter-in-designer.test.tsx tests/vitest/ui-integration/solution-kits-static-designer-slot.test.tsx tests/vitest/ui-integration/setup-static-designer-slot.test.tsx tests/vitest/admin/static-designer-navigation-accessibility.test.tsx
bun run check:admin-boundary
bun --cwd core build:admin
bun run check:admin-bundle
git diff --check
```

Run terminal TASK-555 direct install, Setup dirty-state, and
`tests/vitest/admin/admin-app-contracts.test.ts` regressions read-only.
Run `wc -l` on every touched human-authored production/test file; fail >1,000.

## Documentation Updates Required

Record exact component/slot symbols, copy, permission/focus/dirty/provider-offline
and direct-install parity receipts for TASK-556-04-L02. Edit no shared docs/metadata.
