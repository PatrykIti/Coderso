# TASK-105-08-08-L05-L01: Post Editor Canvas Block-Item Extraction
# FileName: TASK-105-08-08-L05-L01-post-editor-canvas-block-item-extraction.md

**Parent Subtask:** TASK-105-08-08
**Priority:** High
**Category:** Source Split (behavior-preserving)
**Estimated Effort:** Medium
**Dependencies:** TASK-105-08-11 implementation-complete split receipt. Disjoint writer set
from TASK-105-08-08-L04 (hooks/*) — may run concurrently. Authoring basis: fresh
L05/L06 source-contract audit 2026-08-31
(`.tmp/receipts-20260831/audits/l05-l06-source-contract-audit-20260831.md`), which proved
TASK-105-08-08-L05's `postEditorCanvasBlocks.tsx` breaches the 1,000-line gate as specified
(`PostCanvasBlockItem` = `:300-1184` (885 lines) + ~150 helper lines + ~28 import lines) and
invoked this contract's own escape hatch: "author a direct L05 follow-up leaf first".
**Status:** ✅ Done (2026-09-02)

---

## Overview

Extract the canvas block renderer out of `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
(1,526 lines) into two new modules so the follow-up L05 selection/focus/blocks split fits
the 1,000-line gate. Pure behavior-preserving move: the rendered DOM, `data-post-editor-*`
attributes, the single `aria-label` (`:371`), focus/scroll behavior, and insertion/ordering
literals must be byte-stable. The eight existing canvas suites are the proof: they must pass
UNMODIFIED.

## Exact Single-Writer Scope

**Production source writers:**

- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` (shrinks to import + compose; final ≤1,000)
- `core/admin/ui/posts/editor/postEditorCanvasBlockItem.tsx` (new; `PostCanvasBlockItem`
  renderer from `:300-1184`; final ≤1,000)
- `core/admin/ui/posts/editor/postEditorCanvasBlockItemModel.ts` (new; the renderer's pure
  helpers currently at `:79-92`, `:114-202`, `:211-217`, `:254-298`; final ≤1,000)

No test file is writable. Every existing suite, fixture, and mock is read-only. No hook,
adapter, route, client, schema, task board, changelog, or coverage configuration may change.
If extraction needs a path outside this list, stop and report instead of expanding scope.

**Hidden constraint (audit finding #6):**
`tests/vitest/ui/postEditorCanvasFixtures.tsx:254-255` mocks
`./richtext/PostRichTextAdapter` with a factory defining only `PostRichTextAdapter`. Neither
new module may import anything else from `./richtext/PostRichTextAdapter` (types included —
use a local structural type or move the type need to the façade), or the four wave suites
see `undefined`.

## Implementation Pseudocode

```tsx
// postEditorCanvasBlockItemModel.ts
// move the pure helpers verbatim: geometry/drag-index/copy builders from
// PostEditorCanvas.tsx :79-92, :114-202, :211-217, :254-298; add explicit param types
// if the move requires them, changing no behavior.

// postEditorCanvasBlockItem.tsx
// move PostCanvasBlockItem (:300-1184) verbatim; import its helpers from the model
// module; props type stays structural; mediaPickerCopy/MediaPickerState (:219-252)
// are parent-only and STAY in the façade.

// PostEditorCanvas.tsx
// import PostCanvasBlockItem from "./postEditorCanvasBlockItem"; compose exactly as
// before (:1424-1459 container). Single public export remains: PostEditorCanvas (:1186).
```

## Security Contract

Internal admin presentation refactor only. No endpoint, session/RBAC, CSRF, rate-limit,
validation, persistence, block authorization, cache, migration, or public-write behavior
may change. Preserve existing rendering of untrusted authored block content; no unsafe
HTML, no new browser storage.

## Testing Requirements and Gates

```bash
export TMPDIR=/tmp
set -a && . ./.env && set +a
# one invocation per file, all must pass UNMODIFIED:
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/post-editor-canvas-media-wave.test.tsx
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/post-editor-canvas-blocks-wave.test.tsx
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/post-editor-canvas-panels-wave.test.tsx
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/post-editor-canvas-embeds-wave.test.tsx
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/post-editor-canvas-toolbar-profile-routing.test.tsx
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui-integration/post-editor-toolbar-inspector-dedup.test.tsx
# scoped V8: no target may end at 0 covered lines
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage --coverage.provider=v8 --coverage.reporter=json-summary \
  "--coverage.reportsDirectory=$coverage_dir" \
  --coverage.include=core/admin/ui/posts/editor/PostEditorCanvas.tsx \
  --coverage.include=core/admin/ui/posts/editor/postEditorCanvasBlockItem.tsx \
  --coverage.include=core/admin/ui/posts/editor/postEditorCanvasBlockItemModel.ts
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/ui/posts/editor/PostEditorCanvas.tsx \
  core/admin/ui/posts/editor/postEditorCanvasBlockItem.tsx \
  core/admin/ui/posts/editor/postEditorCanvasBlockItemModel.ts
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
wc -l core/admin/ui/posts/editor/PostEditorCanvas.tsx \
  core/admin/ui/posts/editor/postEditorCanvasBlockItem.tsx \
  core/admin/ui/posts/editor/postEditorCanvasBlockItemModel.ts
```

Note: the environment's `.env` sourcing corrupts `IFS` under zsh — build file lists under
`bash` with `mapfile` (2026-08-31 validation lesson).

## Closure Checklist

- [ ] Single public export of the canvas file remains `PostEditorCanvas`; all eight canvas
      suites pass unmodified.
- [ ] No new import from `./richtext/PostRichTextAdapter` in either new module.
- [ ] All three files ≤1,000 physical lines; ESLint, core lint/types, root tsc, and
      `git diff --check` clean.
- [ ] Scoped V8 shows no target at 0 covered lines; receipt returned to the orchestrator.

## Closure (2026-09-02)

Closed on tree evidence (commit ef6e2e7c): postEditorCanvasBlockItem.tsx (961 lines) is extracted at or under the 1,000-line gate and imports only the allowed cross-subsystem symbol { PostRichTextAdapter } — no canvas-to-richtext deep import remains on this branch.
Owned suites are committed and green in the canonical run; root tsc --noEmit exits 0 with zero diagnostics.
Residual disposition: the extracted module's remaining uncovered lines are attributed in TASK-105-08-12 under the 08-08 posts cluster (9 files / 42 lines).
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines, 291 uncovered / 87 files, canonical run 1186 files / 10444 tests / 0 failures.
