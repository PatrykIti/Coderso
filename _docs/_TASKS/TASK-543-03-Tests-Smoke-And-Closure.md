# TASK-543-03: Tests, Smoke, and Closure

# FileName: TASK-543-03-Tests-Smoke-And-Closure.md

**Parent Task:** TASK-543
**Priority:** High
**Category:** UI Tests / Accessibility Smoke / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-543-01, TASK-543-02
**Status:** ⏳ To Do
**Changelog:** 1255 (pinned; create only at implementation closure)

---

## Scope

Rerun all source-leaf-owned TASK-543 tests without editing/rebaselining them, then own
browser evidence, optional UX documentation, task/index updates, and changelog 1255. This
subtask edits neither production source nor test source.

## Leaf

TASK-543-03-L01 is the only leaf and the sole rerun/smoke/docs/closure writer. Missing
changed-behavior coverage returns to the owning 543-01/543-02 source leaf before this
closure gate; closure does not patch around it.

## Required proof

Initial and post-hydration clean zero-write, no-predecessor clean revert, pending-write
clean-restoration, identity-transition isolation, dirty/active/failing/double Close paths,
native link/checkbox/action keyboard behavior, and mid-width metadata visibility must be
covered with visible and ARIA assertions. Zero browser console errors in light/dark.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx \
  tests/vitest/ui/post-block-editor-shell-wave.test.tsx \
  tests/vitest/ui/posts-table-wave.test.tsx \
  tests/vitest/ui-integration/post-list-restyle.test.tsx \
  tests/vitest/ui-integration/post-autosave-flow.test.tsx \
  tests/vitest/ui-integration/post-editor-keyboard-a11y.test.tsx
bun run gates:coderso
~~~
