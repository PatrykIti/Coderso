# 1136 - Navigation sticky collapse runtime regressions

Date: 2026-06-07
Version: unreleased
Tasks: TASK-415

## Key Changes

### Navigation Runtime

- Fixed `collapseOnScroll` so duplicate/no-delta scroll events no longer expand
  a collapsed Navigation header immediately after scrolling down.
- Preserved collapsed state across runtime rebinds when the page or admin canvas
  is already scrolled below the collapse threshold.
- Kept admin preview and public runtime behavior aligned by applying the same
  collapse algorithm to the exported binder and inline public runtime script.

### Sticky Surface Ownership

- Normal rendered Navigation blocks now delegate sticky positioning to the outer
  widget surface instead of also applying sticky to the inner `<nav>`.
- Standalone `NavigationBlock` renders retain inner sticky fallback behavior for
  direct widget rendering.

### QA And Audit

- Direct Playwright CLI analysis identified the old single-block QA page as an
  invalid sticky/collapse proof fixture because it has no natural scroll range.
- Claude `--effort xhigh` and a read-only subagent audit confirmed the duplicate
  scroll collapse bug, sticky containment risk, and missing regression coverage.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/navigationRuntimeScript.test.ts tests/vitest/widgets/navigation.test.tsx tests/vitest/site/publicRenderer.test.tsx tests/vitest/widgets/section.test.tsx`: passed, 4 files / 75 tests.
- `git diff --check`: passed.
- `bun --cwd core lint`: passed.
- `bun --cwd core lint:types`: passed.
- `bun run gates:coderso`: passed. Gate summary: functional, UX,
  performance, security, and reliability all passed.
- Playwright CLI smoke against `/codex-navigation-qa-20260606` with temporary
  in-flow scroll content: passed. Sticky stayed owned by the outer widget
  surface, collapse persisted across duplicate scroll events, and returning to
  the top expanded the header again with no captured page errors.
