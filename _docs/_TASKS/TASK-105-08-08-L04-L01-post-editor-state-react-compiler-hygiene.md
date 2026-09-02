# TASK-105-08-08-L04-L01: Post Editor State React-Compiler Hygiene
# FileName: TASK-105-08-08-L04-L01-post-editor-state-react-compiler-hygiene.md

**Parent Subtask:** TASK-105-08-08
**Priority:** High
**Category:** Source Repair (React hooks semantics)
**Estimated Effort:** Medium
**Dependencies:** TASK-105-08-08-L04 implementation-complete (its receipt documents the
blocking 48 diagnostics). Disjoint writer set from TASK-105-08-08-L05/L05-L01/L06
(canvas/richtext files) — may run concurrently.
**Status:** ✅ Done (2026-09-02)

---

## Overview

TASK-105-08-08-L04's split of `usePostEditorState.ts` moved the three empty-test `for (;;)`
loops out of the hook module. That removed a silent react-hooks compiler HIR bail which had
masked this file's analysis at HEAD (proven 2026-08-31: a HEAD copy of the original
2,713-line file lints clean under the same config; the split façade emits 48 errors). The
48 diagnostics are pre-existing conditions newly made visible:

- 36 × `react-hooks/refs` — ref reads/writes during render (e.g. the route-epoch pattern at
  `:156-161` of the façade, verbatim at HEAD `:494-497`).
- 12 × `react-hooks/preserve-manual-memoization` — memo/deps pairs the compiler can prove
  inconsistent.

This leaf repairs them FOR REAL. Forbidden shortcuts: no `eslint-disable`, no `@ts-ignore`,
no `any`-injection, no re-introduction of a bail-inducing construct, no behavior change.

## Exact Single-Writer Scope

**Production source writers (final ≤1,000 physical lines each):**

- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/ui/posts/editor/hooks/postEditorStateDocument.ts`
- `core/admin/ui/posts/editor/hooks/postEditorStateRefresh.ts`
- `core/admin/ui/posts/editor/hooks/postEditorStateSaveQueue.ts`
- `core/admin/ui/posts/editor/hooks/postEditorStateSession.ts`

No test, fixture, route, client, schema, task board/changelog, or coverage configuration is
writable. If a correct repair needs a path outside this list, stop and report.

## Repair Rules

1. `refs` violations: move ref writes into effects (or replace ref-based epoch/generation
   bookkeeping with a compliant derivation). Rendering output must remain byte-identical
   for all observable states — the sixteen suites listed in TASK-105-08-08-L04's receipt
   are the proof, especially `task-105-08-08-post-editor-state-dead-paths.test.tsx`.
2. `preserve-manual-memoization` violations: align the memo/deps pairs so the compiler can
   verify them; prefer extracting pure calculations to the non-hook modules over adding
   memoization.
3. Preserve the stable public façade contract of `usePostEditorState` byte-for-byte
   (signature, return shape, call-order side effects as pinned by the suites).

## Testing Requirements and Gates

```bash
export TMPDIR=/tmp
set -a && . ./.env && set +a
# one invocation per file; every suite in the L04 receipt's 16-file list, all green:
# (usePostEditorState-{media,save-ordering,normalization,crud,barriers,debt,cross-epoch,
#  identity,refresh-revisions-wave,revisions}, task-105-08-08-post-editor-state-dead-paths,
#  posts-editor-chrome-wave, post-editor-state-normalization, post-editor-save-sync,
#  post-editor-state-metadata-boundary, ui-integration/post-editor-shell-restyle)
bun --cwd core lint          # MUST now exit 0 — zero diagnostics anywhere
bun --cwd core lint:types    # exit 0
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
wc -l core/admin/ui/posts/editor/hooks/usePostEditorState.ts \
  core/admin/ui/posts/editor/hooks/postEditorState*.ts
```

The `bun --cwd core lint` exit 0 is the leaf's defining gate: the tree must return to a
clean static-gate state, not a documented-exception state.

## Closure Checklist

- [ ] `bun --cwd core lint` exits 0 with zero diagnostics across the whole glob.
- [ ] All sixteen regression suites pass unmodified (one invocation per file).
- [ ] Root tsc, `git diff --check`, and the 1,000-line cap hold for all five files.
- [ ] No forbidden suppression anywhere in the diff; receipt returned to the orchestrator.

## Closure (2026-09-02)

Closed on tree evidence (commit ef6e2e7c): all five owned hook modules were rewritten as final files at or under 1,000 lines (800/537/736/828/436) with no blocking diagnostics; bun --cwd core lint exits 0 on this tree and root tsc -p tsconfig.json --noEmit exits 0 with zero diagnostics.
Proof suite tests/vitest/ui/task-105-08-08-post-editor-state-dead-paths.test.tsx is committed and green in the canonical run.
Residual disposition: the 08-08 posts attribution in TASK-105-08-12 (9 files / 42 lines) covers the remaining uncovered lines; no hygiene-owned line is left unattributed.
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines, 291 uncovered / 87 files, canonical run 1186 files / 10444 tests / 0 failures.
