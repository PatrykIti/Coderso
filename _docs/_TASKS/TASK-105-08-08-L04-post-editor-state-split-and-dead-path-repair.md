# TASK-105-08-08-L04: Post Editor State Split and Dead-Path Repair
# FileName: TASK-105-08-08-L04-post-editor-state-split-and-dead-path-repair.md

**Parent Subtask:** TASK-105-08-08
**Priority:** High
**Category:** State Reliability + Coverage
**Estimated Effort:** Large
**Dependencies:** TASK-105-08-11 implementation-complete split receipt; TASK-105-08-08-L03 validation-complete receipt; fresh L04 source-contract audit
**Status:** ⏳ To Do

---

## Overview

`core/admin/ui/posts/editor/hooks/usePostEditorState.ts` is 2,713 physical lines. It cannot
be touched for the six confirmed dead lines without a cohesive same-change split below the
1,000-line gate. The repair removes only private paths that no supported caller can execute:
`usePostEditorState.ts:1098-1100,1136,1181,1705`.

The fresh audit must recheck each current `refresh()` caller, which supplies a real route
identity and non-loading refresh policy, and the queued-save key/snapshot invariant behind
`:1705`. If either invariant changed, preserve the behavior and revise this contract rather
than delete it.

## Exact Single-Writer Scope

**Production source writers:**

- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` (split façade; final ≤1,000)
- `core/admin/ui/posts/editor/hooks/postEditorStateDocument.ts` (new; final ≤1,000)
- `core/admin/ui/posts/editor/hooks/postEditorStateRefresh.ts` (new; final ≤1,000)
- `core/admin/ui/posts/editor/hooks/postEditorStateSaveQueue.ts` (new; final ≤1,000)
- `core/admin/ui/posts/editor/hooks/postEditorStateSession.ts` (new; final ≤1,000)

**Test writer:**

- `tests/vitest/ui/task-105-08-08-post-editor-state-dead-paths.test.tsx` (new; ≤750)

The new DOM suite must begin literally with `// @vitest-environment happy-dom` as its first
physical line, before imports.

The public exports/imports/hook result and L02 state suites are read-only contracts. Routes,
services, DB/cache code, fixtures, canvas/adapter modules, board/changelog, and coverage
configuration are forbidden. If extraction needs another source file, create a direct L04
follow-up child before editing it.

## Implementation Pseudocode

```ts
// postEditorStateSession.ts: identity, epochs, and snapshot comparators.
export const buildEditorSessionKey = /* existing deterministic key */;
export const sameEditorSession = /* existing comparator */;

// postEditorStateRefresh.ts: injected request/currentness/dirty-state dependencies.
export const createRefreshLifecycle = (deps: RefreshDeps) => async (options: RefreshOptions) => {
  // preserve generations, cache behavior, and visible error state
};

// postEditorStateSaveQueue.ts: injected queue refs and persistence dependencies.
export const createSaveQueue = (deps: SaveQueueDeps) => ({ enqueue(/* target/mode */) {} });

// usePostEditorState.ts: React wiring and the existing public result façade only.
```

1. Split cohesive document, session, refresh/reload, and queued-persistence regions; never
   create a generic helper dump. Keep every resulting module ≤1,000 lines.
2. Preserve cache hydration, dirty-draft, revision, publish, restore, error, and cancellation
   semantics, as well as the current public `UsePostEditorStateResult` shape.
3. Once the audit proves it, make refresh's valid identity/loading policy explicit internally
   and remove only `:1098-1100,1136,1181`; no caller may gain a foreground request.
4. Preserve equal session/snapshot save coalescing and remove `:1705` only after proving the
   same-key conflicting-byte state is impossible.
5. The regression test drives the public hook with deferred real client responses and proves
   valid refresh, stale completion rejection, equal-snapshot coalescing, and visible dirty or
   error state. It never invokes an extracted private helper to fabricate removed execution.

## Security Contract

Internal admin editor state only. No endpoint, auth/session/RBAC rule, CSRF requirement,
rate limit, schema validation, persistence protocol, revision authorization, cache broadcast,
or public-write control may change. Server-authoritative post validation remains in place;
tests contain no secrets or production-like post data.

## Testing Requirements and Gates

The V8 command below is scoped diagnostic evidence for retained/extracted regression paths,
not a 100% whole-module gate; L02 owns the combined post-repair proof.

```bash
export TMPDIR=/tmp
set -a && . ./.env && set +a
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/task-105-08-08-post-editor-state-dead-paths.test.tsx
coverage_dir="$(mktemp -d /tmp/task105-08-08-l04-v8.XXXXXX)" || exit 1
[[ -d "$coverage_dir" && ! -L "$coverage_dir" ]] || exit 1
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage --coverage.provider=v8 --coverage.reporter=json-summary \
  "--coverage.reportsDirectory=$coverage_dir" \
  --coverage.include=core/admin/ui/posts/editor/hooks/usePostEditorState.ts \
  --coverage.include=core/admin/ui/posts/editor/hooks/postEditorStateDocument.ts \
  --coverage.include=core/admin/ui/posts/editor/hooks/postEditorStateRefresh.ts \
  --coverage.include=core/admin/ui/posts/editor/hooks/postEditorStateSaveQueue.ts \
  --coverage.include=core/admin/ui/posts/editor/hooks/postEditorStateSession.ts
node - "$coverage_dir/coverage-summary.json" <<'NODE'
const fs = require("node:fs");
const summary = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const rows = Object.entries(summary).filter(([key]) => key !== "total")
  .map(([key, value]) => ({ key, covered: value.lines.covered, total: value.lines.total }));
console.log(JSON.stringify({ rows }, null, 2));
if (rows.length === 0 || rows.some((row) => row.covered === 0)) process.exit(1);
NODE
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/ui/posts/editor/hooks/usePostEditorState.ts \
  core/admin/ui/posts/editor/hooks/postEditorStateDocument.ts \
  core/admin/ui/posts/editor/hooks/postEditorStateRefresh.ts \
  core/admin/ui/posts/editor/hooks/postEditorStateSaveQueue.ts \
  core/admin/ui/posts/editor/hooks/postEditorStateSession.ts \
  tests/vitest/ui/task-105-08-08-post-editor-state-dead-paths.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
git diff --check
wc -l \
  core/admin/ui/posts/editor/hooks/usePostEditorState.ts \
  core/admin/ui/posts/editor/hooks/postEditorStateDocument.ts \
  core/admin/ui/posts/editor/hooks/postEditorStateRefresh.ts \
  core/admin/ui/posts/editor/hooks/postEditorStateSaveQueue.ts \
  core/admin/ui/posts/editor/hooks/postEditorStateSession.ts \
  tests/vitest/ui/task-105-08-08-post-editor-state-dead-paths.test.tsx
```

The V8 receipt is scoped diagnostic evidence that extracted/retained state paths are observed;
it is not a whole-module 100% gate. L02 owns the combined post-repair whole-module proof,
including these extracted modules. Every `wc -l` result must be at most 1,000 before L05
starts.

## Closure Checklist

- [ ] The 2,713-line hook is replaced by cohesive modules, each at most 1,000 lines.
- [ ] Public exports/result behavior and cache/concurrency contracts are unchanged.
- [ ] Each deleted line is structurally impossible and adjacent supported behavior is tested.
- [ ] Scoped V8 regression evidence, lint, types, boundary, diff, and line-cap gates pass.
