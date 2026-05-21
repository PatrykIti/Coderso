# TASK-284-04: Spacer Horizontal Orientation Contract

# FileName: TASK-284-04_Spacer_Horizontal_Orientation_Contract.md

**Priority:** Low
**Category:** Widgets + Layout + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-284-02, TASK-284
**Status:** Done (2026-05-21)

---

## Overview

Decide whether the horizontal Spacer request from
`_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` should ship now or be explicitly
deferred.

Resolution (2026-05-21): defer BF-05. Spacer remains a vertical-only
primitive because the current builder still renders every widget through the
shared full-width `WidgetRenderer` section/container shell. A local
`orientation` or `width` field on Spacer would therefore behave like a
wrapped block, not a truthful inline or row-flow gap. Future implementation
is reassigned to the new shared follow-up `TASK-326`.

This leaf covers BF-05 only. It intentionally does not add `orientation`,
`width`, or parent-mutating flex-filler behavior to the current Spacer
payload.

## Scope Boundary

In scope:

- inspect current page-builder and nested container owners before changing
  the Spacer schema;
- make an explicit implement-vs-defer decision grounded in the current
  shared renderer/layout contract;
- if deferred, record the blocker and future owner in task/docs/report/board
  state.

Out of scope:

- Chakra-style flex filler behavior that only works by mutating parent
  layout;
- adding `orientation` or `width` to Spacer without a truthful shared
  row-flow/container-aware rendering owner;
- broad page-builder inline layout or flex/grid container redesign inside
  this leaf;
- arbitrary width classes or raw CSS;
- changing existing vertical Spacer payload behavior.

## Sub-Tasks

- [x] Inspect the current shared widget shell and nested layout owners
  before implementation.
- [x] Confirm that Stack/Grid/Split-style layout widgets already own
  horizontal flow and spacing semantics, while Spacer still renders as a
  full-width block primitive.
- [x] Defer BF-05 instead of adding misleading `orientation`/`width` fields
  to the current Spacer contract.
- [x] Create `TASK-326` as the future shared owner for nested row-flow
  widget rendering truthfulness.
- [x] Update Spacer docs, report evidence, task board, and changelog to
  record the defer decision.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/spacer.tsx` | No change in this leaf. Spacer stays vertical-only until a shared nested row-flow rendering owner exists. |
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | No change in this leaf. Existing height/preset editor IA stays truthful while horizontal support is deferred. |
| `tests/vitest/widgets/spacer.test.tsx` | Re-run only as a regression guard; no new assertions are required because the runtime contract is unchanged. |
| `tests/vitest/ui/spacer-editor-wave.test.tsx` | Re-run only as a regression guard; no editor contract changed in this defer leaf. |
| `_docs/_TASKS/TASK-326_Shared_Nested_Widget_Row_Flow_Layout_Truthfulness_Contract.md` | Create the future shared follow-up task for row-flow/container-aware nested widget rendering. |
| `_docs/_WIDGETS/SPACER.md` | Document the explicit vertical-only decision and the blocker for future horizontal support. |
| `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` | Record BF-05 as deferred with a concrete blocker and future owner. |
| `_docs/_TASKS/README.md` | Move `TASK-284-04` to Done, add `TASK-326`, and keep board statistics synchronized. |
| `_docs/_CHANGELOG/*` | Add and index a changelog entry for the BF-05 defer decision. |

## Decision Outcome

```ts
type HorizontalSpacerDecision = {
  status: "defer";
  blocker: "shared-full-width-widget-shell";
  futureOwner: "TASK-326";
};

const spacerHorizontalDecision: HorizontalSpacerDecision = {
  status: "defer",
  blocker: "shared-full-width-widget-shell",
  futureOwner: "TASK-326",
};
```

Evidence behind the decision:

1. `WidgetRenderer` still wraps every widget in a block-level `<section>`
   plus container shell, even when nested inside layout widgets.
2. Existing layout owners such as Stack, Grid Columns, and Split Layout
   already own row/column structure and gap semantics for their children.
3. A Spacer-local `width` field would therefore be misleading today because
   it would not create a general-purpose inline or row-flow gap primitive.

Future owner contract:

- `TASK-326` owns the shared nested row-flow rendering truthfulness work
  that must land before any honest horizontal Spacer implementation can
  reopen.
- Until that shared task lands, Spacer continues to store and render only
  vertical `height` values plus `showGuideInEditor`.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged in this defer leaf because no new
  persisted field is added.
- Anti-abuse: the defer decision explicitly avoids introducing raw width
  classes, style strings, parent selectors, script, or layout-mutating
  parent payloads into Spacer data.
- Secret handling: no secrets in Spacer data, DOM markers, reports, or
  diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Because this leaf is committed separately from TASK-284-05, also run root
  `bun run lint`, `bun run gates:coderso`, `bun run scan:security:strict`,
  and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/SPACER.md` with the explicit vertical-only decision
  and the blocker for future horizontal support.
- Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` with BF-05 deferred
  evidence.
- Create the shared follow-up `TASK-326` and synchronize
  `_docs/_TASKS/README.md`.

## Changelog Policy

- Covered by the TASK-284 family changelog or a leaf-specific changelog
  entry before moving to `Done`.

## Acceptance Criteria

- BF-05 is either implemented with truthful bounded runtime behavior or
  deferred with a concrete blocker and future owner.
- Existing vertical Spacer payloads remain the default and render unchanged.
- The leaf does not mutate parent layout or introduce a context-only flex
  filler disguised as a general page spacer.

## Completion Notes (2026-05-21)

- BF-05 is deferred, not implemented.
- Spacer remains vertical-only because the current shared widget shell is
  still block-first and full-width, which makes a local horizontal Spacer
  contract misleading.
- `TASK-326` now owns the future shared row-flow/container-aware rendering
  work required before horizontal Spacer support can reopen.
