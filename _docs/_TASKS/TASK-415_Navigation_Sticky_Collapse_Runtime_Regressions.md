# TASK-415: Navigation Sticky Collapse Runtime Regressions
# FileName: TASK-415_Navigation_Sticky_Collapse_Runtime_Regressions.md

**Priority:** High
**Category:** CMS Widgets / Navigation / Runtime / Admin Preview / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-412
**Status:** ✅ Done
**Started:** 2026-06-07
**Completed:** 2026-06-07

---

## Overview

Fix the Navigation widget regression found after TASK-412: collapse-on-scroll
does not persist after duplicate/no-delta scroll events, and sticky ownership is
ambiguous because both the outer widget surface and inner `<nav>` can own sticky
positioning in normal page rendering.

Read-only audit evidence:

- Direct Playwright CLI verified `/homepage` sticky remains at the viewport top
  after public page scroll, while the old single-block
  `/codex-navigation-qa-20260606` page no longer has enough natural scroll range
  to prove collapse behavior.
- A browser-only spacer probe on `/codex-navigation-qa-20260606` confirmed the
  runtime listener updates `navigationLastScrollY` but resets
  `data-navigation-collapsed` to `false` after same-position scroll events.
- Claude `--effort xhigh` and a read-only subagent audit both identified the
  duplicated collapse logic in `navigation.tsx`, the short-parent sticky fixture
  gap, and missing same-scroll regression coverage.

## Sub-Tasks

- [x] Make collapse-on-scroll idempotent for duplicate/no-delta scroll events in
      both the exported admin-preview binder and the inline public runtime
      script.
- [x] Preserve collapsed state during preview/runtime rebinding when the scroll
      target is already past the collapse threshold.
- [x] Make the outer widget surface the sticky owner for normal rendered
      Navigation blocks while preserving standalone `NavigationBlock` fallback
      behavior.
- [x] Add Vitest coverage for duplicate scroll events, element scroll targets,
      rebind behavior, and rendered sticky-surface ownership.
- [x] Update Navigation docs, task board, and changelog with the final contract
      and validation evidence.

## Implementation Pseudocode

```ts
function resolveNavigationCollapsedState(currentY, previousY, wasCollapsed) {
  const delta = currentY - previousY;
  if (currentY <= 24) return false;
  if (delta > 16) return true;
  if (delta < -16) return false;
  return wasCollapsed;
}
```

Data flow:

- `updateNavigationCollapseState()` reads the current scroll target and previous
  root state, computes idempotent collapse state, writes stable
  `data-navigation-collapsed`, toggles the local collapsed class, and then
  updates `navigationLastScrollY`.
- The inline public script mirrors the same algorithm so admin preview and
  public runtime cannot diverge.
- `initializeNavigationRuntimeRoot()` sets initial collapsed state from the
  current scroll position and previous root state instead of blindly resetting
  to expanded.
- `WidgetRenderer` passes a render-context hint to widget renderers when the
  outer surface owns sticky positioning; `NavigationBlock` suppresses its inner
  sticky class only in that normal surfaced render path.

Error handling:

- Missing or malformed `navigationLastScrollY` falls back to the current scroll
  target position.
- No-scroll pages remain expanded; collapse does not invent scroll range.
- Standalone `NavigationBlock` renders continue to provide inner sticky behavior
  when no `WidgetRenderer` sticky surface exists.

Regression-test shape:

- Public inline runtime: `0 -> 60` collapses, a second event at `60` stays
  collapsed, jitter stays collapsed, and `60 -> 10` expands.
- Exported binder with element scroll target mirrors the same behavior.
- Rebinding at an already-scrolled position preserves collapsed state.
- SSR/render tests prove normal `WidgetRenderer` output delegates sticky to the
  outer surface and standalone `NavigationBlock` still emits sticky markup.

## Security Contract

This task does not add or change API routes.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Validation: Navigation data remains schema-first through `navigationSchema`,
  `normalizeNavigationData`, and widget block validation.
- Anti-abuse: not applicable; public Navigation rendering remains read-only.
- Secret handling: docs and validation evidence must not include credentials,
  provider keys, database URLs, or raw sensitive logs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/navigationRuntimeScript.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx tests/vitest/site/publicRenderer.test.tsx tests/vitest/widgets/section.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Direct Playwright CLI smoke against the local dev host when feasible, using a
  Navigation page with in-flow scroll content rather than the old single-block
  QA page.

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1136-2026-06-07-navigation-sticky-collapse-runtime-regressions.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes

- Added a shared TypeScript collapse-state helper and mirrored the same
  idempotent algorithm in the inline public runtime script.
- Collapse now survives duplicate/no-delta scroll events, small jitter, and
  runtime rebinds while already scrolled below the threshold.
- Normal `WidgetRenderer` output passes sticky ownership to the outer widget
  surface so the inner `<nav>` no longer also owns sticky positioning; standalone
  `NavigationBlock` renders keep inner sticky fallback behavior.
- Updated Navigation docs and added regression coverage for the exact browser
  behavior found during the Playwright/Claude/subagent audit.

## Validation Evidence

- `bun run test:vitest -- tests/vitest/widgets/navigationRuntimeScript.test.ts tests/vitest/widgets/navigation.test.tsx tests/vitest/site/publicRenderer.test.tsx tests/vitest/widgets/section.test.tsx`: passed, 4 files / 75 tests.
- `git diff --check`: passed.
- `bun --cwd core lint`: passed.
- `bun --cwd core lint:types`: passed.
- `bun run gates:coderso`: passed. Gate summary: functional, UX,
  performance, security, and reliability all passed.
- Playwright CLI smoke against `/codex-navigation-qa-20260606` with temporary
  in-flow scroll content: passed. The sticky surface stayed at viewport top,
  the inner `<nav>` rendered as non-sticky, scrolling down collapsed the
  navigation, duplicate same-position scroll events preserved collapse, and
  returning to top expanded it again with no captured page errors.
