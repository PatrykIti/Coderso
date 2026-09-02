# TASK-105-08-08-L05: Post Editor Canvas Split and Dead-Path Repair
# FileName: TASK-105-08-08-L05-post-editor-canvas-split-and-dead-path-repair.md

**Parent Subtask:** TASK-105-08-08
**Priority:** High
**Category:** UI Reliability + Coverage
**Estimated Effort:** Large
**Dependencies:** TASK-105-08-11 implementation-complete split receipt; TASK-105-08-08-L05-L01 validation-complete receipt (block-item extraction; 2026-08-31 audit proved `postEditorCanvasBlocks.tsx` breaches the 1,000-line gate as originally specified); TASK-105-08-08-L04 validation-complete receipt; fresh L05 source-contract audit (clean as corrected below)
**Status:** ⏳ To Do

---

## Overview

`core/admin/ui/posts/editor/PostEditorCanvas.tsx` is 1,526 physical lines. Its effect-body
SSR guard at `:1297-1300` (`if (typeof window === "undefined") { focusTarget(); return; }`)
is unreachable because React effects run only on the client and the guard body invokes only
client DOM (`focusTarget()` at `:1290-1295`; zero `server-only` tokens in the import graph).
This leaf runs AFTER TASK-105-08-08-L05-L01 has extracted `PostCanvasBlockItem` into
`postEditorCanvasBlockItem.tsx` + `postEditorCanvasBlockItemModel.ts` (without that
extraction this leaf's `postEditorCanvasBlocks.tsx` cannot fit the 1,000-line gate). It then
splits the remaining canvas below 1,000 lines and removes the redundant guard while
preserving selection, focus, insertion, and canvas accessibility behavior (the file's real
surface: `data-post-editor-*` attributes, focus/scroll, the single `aria-label` at `:371`,
and insertion/ordering literals).

## Exact Single-Writer Scope

**Production source writers:**

- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` (split façade; final ≤1,000)
- `core/admin/ui/posts/editor/postEditorCanvasSelection.ts` (new; final ≤1,000)
- `core/admin/ui/posts/editor/postEditorCanvasFocus.ts` (new; final ≤1,000)
- `core/admin/ui/posts/editor/postEditorCanvasBlocks.tsx` (new; final ≤1,000)

**Test writer:**

- `tests/vitest/ui/task-105-08-08-post-editor-canvas-dead-paths.test.tsx` (new; ≤700)

The new DOM suite must begin literally with `// @vitest-environment happy-dom` as its first
physical line, before imports.

Existing canvas fixtures and L02's classic/canvas residual suite are read-only. No hook,
adapter, block service, route, client, schema, task board/changelog, or coverage config may
be modified. (The block-renderer split target named by the original draft was authored
first as the follow-up leaf TASK-105-08-08-L05-L01, exactly as this clause requires.)
Hidden constraint (2026-08-31 audit finding #6):
`tests/vitest/ui/postEditorCanvasFixtures.tsx:254-255` mocks `./richtext/PostRichTextAdapter`
with a factory defining only `PostRichTextAdapter`; no moved module may import anything else
from that adapter path (types included), or the four wave suites see `undefined`.

## Implementation Pseudocode

```tsx
// postEditorCanvasSelection.ts
export const resolveCanvasSelection = /* existing selection/index/active-block logic */;

// postEditorCanvasFocus.ts
export const focusCanvasBlock = /* existing DOM focus/scroll behavior with explicit browser seam */;

// postEditorCanvasBlocks.tsx
export function CanvasBlockList(props: CanvasBlockListProps) { /* existing block rendering */ }

// PostEditorCanvas.tsx
// Retain public props/composition; call focused helpers. In the client effect, use the
// extracted focus seam directly rather than an SSR early return that can never execute.
```

1. Extract cohesive selection/index, focus/scroll, and block-list rendering responsibilities;
   retain public props, keyboard behavior, ARIA attributes, drag/drop, insertion, and block
   ordering exactly.
2. Verify the effect guard at `:1297-1300` has no server invocation before removing only its
   redundant SSR branch. Keep any browser feature guard needed inside a helper where it is
   reachable and semantically required.
3. The regression test renders the public canvas, moves focus/selection through real controls,
   and asserts visible active state plus DOM focus/geometry. It must not mock an effect or use
   an SSR renderer to reach the removed branch.

## Security Contract

Internal admin presentation refactor only. No endpoint, session/RBAC, CSRF, rate-limit,
validation, persistence, block authorization, cache, migration, or public-write behavior may
change. Preserve existing rendering of untrusted authored block content and do not introduce
unsafe HTML or browser storage.

## Testing Requirements and Gates

The V8 command below is scoped diagnostic evidence for retained/extracted regression paths,
not a 100% whole-module gate; L02 owns the combined post-repair proof.

```bash
export TMPDIR=/tmp
set -a && . ./.env && set +a
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/task-105-08-08-post-editor-canvas-dead-paths.test.tsx
coverage_dir="$(mktemp -d /tmp/task105-08-08-l05-v8.XXXXXX)" || exit 1
[[ -d "$coverage_dir" && ! -L "$coverage_dir" ]] || exit 1
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage --coverage.provider=v8 --coverage.reporter=json-summary \
  "--coverage.reportsDirectory=$coverage_dir" \
  --coverage.include=core/admin/ui/posts/editor/PostEditorCanvas.tsx \
  --coverage.include=core/admin/ui/posts/editor/postEditorCanvasSelection.ts \
  --coverage.include=core/admin/ui/posts/editor/postEditorCanvasFocus.ts \
  --coverage.include=core/admin/ui/posts/editor/postEditorCanvasBlocks.tsx
node - "$coverage_dir/coverage-summary.json" <<'NODE'
const fs = require("node:fs");
const summary = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const rows = Object.entries(summary).filter(([key]) => key !== "total")
  .map(([key, value]) => ({ key, covered: value.lines.covered, total: value.lines.total }));
console.log(JSON.stringify({ rows }, null, 2));
if (rows.length === 0 || rows.some((row) => row.covered === 0)) process.exit(1);
NODE
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/ui/posts/editor/PostEditorCanvas.tsx \
  core/admin/ui/posts/editor/postEditorCanvasSelection.ts \
  core/admin/ui/posts/editor/postEditorCanvasFocus.ts \
  core/admin/ui/posts/editor/postEditorCanvasBlocks.tsx \
  tests/vitest/ui/task-105-08-08-post-editor-canvas-dead-paths.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
git diff --check
wc -l \
  core/admin/ui/posts/editor/PostEditorCanvas.tsx \
  core/admin/ui/posts/editor/postEditorCanvasSelection.ts \
  core/admin/ui/posts/editor/postEditorCanvasFocus.ts \
  core/admin/ui/posts/editor/postEditorCanvasBlocks.tsx \
  tests/vitest/ui/task-105-08-08-post-editor-canvas-dead-paths.test.tsx
```

## Closure Checklist

- [ ] The 1,526-line canvas is decomposed into cohesive modules, all at most 1,000 lines.
- [ ] The client-only effect guard is removed without changing real focus/selection behavior.
- [ ] Public canvas DOM/ARIA and block-order behavior is regression-tested.
- [ ] Scoped V8 regression evidence, lint, types, boundary, diff, and line-cap gates pass
  before L06 begins; L02 owns final whole-module V8 including the extracted files.
