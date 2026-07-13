# TASK-543-03: Tests, Smoke, and Closure

# FileName: TASK-543-03-Tests-Smoke-And-Closure.md

**Parent Task:** TASK-543
**Priority:** High
**Category:** UI Tests / Accessibility Smoke / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-543-01, TASK-543-02
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Reopened:** 2026-07-13 — full validation and live smoke must be repeated after the cross-session drain fix
**Changelog:** 1255

---

## Scope

Rerun all source-leaf-owned TASK-543 tests without editing/rebaselining them, then own
browser evidence, the two required Posts guide updates named by TASK-543-03-L01,
task/index updates, and changelog 1255. This
subtask edits neither production source nor test source.

## Leaf

TASK-543-03-L01 is the only leaf and the sole rerun/smoke/docs/closure writer. Missing
changed-behavior coverage returns to the owning 543-01/543-02 source leaf before this
closure gate; closure does not patch around it.

The full gate exposed five historical shell/chrome suites whose partial hook mocks described
the real SSR/loading fail-closed boundary while their assertions expected a loaded editor.
The correction was returned to TASK-543-01-L01, which owns and rebaselines those tests with
an explicit loaded post; TASK-543-03 only reruns the resulting 13-file matrix.

## Required proof

Initial and post-hydration clean zero-write, no-predecessor clean revert, pending-write
clean-restoration, identity-transition isolation, dirty/active/failing/double Close paths,
native link/checkbox/action keyboard behavior, and mid-width metadata visibility must be
covered with visible and ARIA assertions in a real browser, including the narrow 390 px
and 768/900/1024 px responsive boundaries. Zero browser console errors in light/dark.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx \
  tests/vitest/ui/post-editor-state-hook-wave.test.tsx \
  tests/vitest/ui/post-block-editor-shell-wave.test.tsx \
  tests/vitest/ui/posts-editor-chrome-wave.test.tsx \
  tests/vitest/ui/post-block-editor-shell.test.tsx \
  tests/vitest/ui/posts-table-wave.test.tsx \
  tests/vitest/ui-integration/post-list-restyle.test.tsx \
  tests/vitest/ui-integration/post-autosave-flow.test.tsx \
  tests/vitest/ui-integration/post-editor-smoke-regression.test.tsx \
  tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx \
  tests/vitest/ui-integration/post-editor-layout-shell.test.tsx \
  tests/vitest/ui/page-row-actions.test.tsx \
  tests/vitest/ui/page-table-wave.test.tsx
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
bun run gates:coderso
set -a && source .env && set +a && bun run test
bun run precommit:check
bun run scan:security:strict
node --check _docs/_workflows/task-543-implement.mjs
~~~

## Superseded pre-fix evidence

The following results are retained only as pre-fix history. They must not be used for closure;
all full gates and the live smoke are required again after the final remediation.

The final targeted matrix passed 112/112 across eight files. Full validation passed Bun 1,687
with one intentional opt-in live skip and zero failures, plus sequential Vitest 836 files / 6,852
tests; static checks, Admin build/boundary/bundle, release gates 5/5, and task-scoped Semgrep also
passed. The seven manual live CLI flows, 11 PNGs, and complete cleanup are recorded in the leaf
and changelog 1255.

## Superseded closure attempt

The evidence below predates the final cross-session drain finding and cannot close this subtask.

The final 13-file targeted matrix passed 144/144. Full `bun run test` passed 1,687 Bun and
6,865 Vitest tests (8,552 total), with one intentional live-provider skip and zero failures.
Type/lint, `precommit:check`, Admin build/boundary/bundle, release gates 5/5, and task Semgrep
passed; the strict scan retains only the exact unchanged TASK-545-owned finding. Seven real
CLI flows passed in light/dark with 11 PNGs and complete fixture/session/process/port cleanup.
The leaf and changelog 1255 carry the detailed evidence.
