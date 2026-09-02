# TASK-105-08-08-L06: Post Rich-Text Adapter Split and Dead-Path Repair
# FileName: TASK-105-08-08-L06-post-richtext-split-and-dead-path-repair.md

**Parent Subtask:** TASK-105-08-08
**Priority:** High
**Category:** Editor Reliability + Coverage
**Estimated Effort:** Large
**Dependencies:** TASK-105-08-11 implementation-complete split receipt; TASK-105-08-08-L05 validation-complete receipt; fresh L06 source-contract audit
**Status:** ✅ Done (2026-09-02)

---

## Overview

`core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` is 1,352 physical lines. This
leaf must split it below the 1,000-line gate before source repair. It owns two non-testable
paths: `:202`, dominated by `if (!text.trim()) return null` at `:182`, and `:626`, a broken
cross-realm image fallback because a foreign-realm image is neither the current realm's
`HTMLImageElement` nor `HTMLElement`. It does not own the valid optional callback transition
at `:1001-1002`; L02 covers that real rerender behavior.

## Exact Single-Writer Scope

**Production source writers:**

- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` (split façade; final ≤1,000)
- `core/admin/ui/posts/editor/richtext/postRichTextSelection.ts` (new; final ≤1,000)
- `core/admin/ui/posts/editor/richtext/postRichTextMedia.ts` (new; final ≤1,000)
- `core/admin/ui/posts/editor/richtext/postRichTextSlashState.ts` (new; final ≤1,000)

**Test writer:**

- `tests/vitest/ui/task-105-08-08-post-richtext-adapter-dead-paths.test.tsx` (new; ≤700)

The new DOM suite must begin literally with `// @vitest-environment happy-dom` as its first
physical line, before imports.

L02's rich-text residual suite, L03's toolbar suite, existing fixtures, editor command engine,
routes, clients, schemas, task board/changelog, and coverage configuration are read-only. If
the split needs another production path, create a direct L06 follow-up child before changing
it.

## Implementation Pseudocode

```ts
// postRichTextSelection.ts
export const resolveInlineWrapperTextRange = (text: string, offset: number) => {
  if (!text.trim()) return null;
  // retain existing clamped pivot and word-boundary logic; no all-whitespace fallback remains
};

// postRichTextMedia.ts
export const findClosestImageFromNode = (node: Node | null, root: HTMLElement) => {
  // use a realm-independent element/tag-name predicate, then return only an image element
};

// postRichTextSlashState.ts
export const resolveSlashState = /* existing public callback/query logic */;

// PostRichTextAdapter.tsx keeps public props, editor composition, and compatibility exports.
```

1. Extract cohesive text-range/selection, media-node traversal, and slash-state logic without
   changing the adapter's public props, HTML sanitization/escaping, editor command behavior,
   or emitted document format.
2. Remove the all-whitespace fallback at `:202`; the early trim return already establishes
   the proof. Preserve real empty/non-empty range behavior.
3. Replace the cross-realm `instanceof HTMLElement` fallback at `:626` with a safe
   realm-independent image predicate (or remove it after a fresh audit proves it unnecessary).
   Do not retain an impossible cast. The returned node must still be an actual `<img>` inside
   the supplied editor root.
4. Regression tests use the public adapter to prove whitespace/range behavior, media selection
   in a real DOM/foreign document where supported, and retained sanitization/command output.
   They do not forge an `HTMLElement` cast or touch L02's callback-transition case.

## Security Contract

Internal admin editor UI only. Preserve escaping/sanitization of authored rich-text and media
attributes; do not introduce raw HTML insertion, unsafe URL handling, browser storage, or
public endpoint behavior. Existing session/RBAC, CSRF, server validation, persistence,
rate-limit, and revision authorization contracts remain unchanged. Tests must use synthetic,
non-sensitive content.

## Testing Requirements and Gates

The V8 command below is scoped diagnostic evidence for retained/extracted regression paths,
not a 100% whole-module gate; L02 owns the combined post-repair proof.

```bash
export TMPDIR=/tmp
set -a && . ./.env && set +a
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/task-105-08-08-post-richtext-adapter-dead-paths.test.tsx
coverage_dir="$(mktemp -d /tmp/task105-08-08-l06-v8.XXXXXX)" || exit 1
[[ -d "$coverage_dir" && ! -L "$coverage_dir" ]] || exit 1
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage --coverage.provider=v8 --coverage.reporter=json-summary \
  "--coverage.reportsDirectory=$coverage_dir" \
  --coverage.include=core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx \
  --coverage.include=core/admin/ui/posts/editor/richtext/postRichTextSelection.ts \
  --coverage.include=core/admin/ui/posts/editor/richtext/postRichTextMedia.ts \
  --coverage.include=core/admin/ui/posts/editor/richtext/postRichTextSlashState.ts
node - "$coverage_dir/coverage-summary.json" <<'NODE'
const fs = require("node:fs");
const summary = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const rows = Object.entries(summary).filter(([key]) => key !== "total")
  .map(([key, value]) => ({ key, covered: value.lines.covered, total: value.lines.total }));
console.log(JSON.stringify({ rows }, null, 2));
if (rows.length === 0 || rows.some((row) => row.covered === 0)) process.exit(1);
NODE
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx \
  core/admin/ui/posts/editor/richtext/postRichTextSelection.ts \
  core/admin/ui/posts/editor/richtext/postRichTextMedia.ts \
  core/admin/ui/posts/editor/richtext/postRichTextSlashState.ts \
  tests/vitest/ui/task-105-08-08-post-richtext-adapter-dead-paths.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
git diff --check
wc -l \
  core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx \
  core/admin/ui/posts/editor/richtext/postRichTextSelection.ts \
  core/admin/ui/posts/editor/richtext/postRichTextMedia.ts \
  core/admin/ui/posts/editor/richtext/postRichTextSlashState.ts \
  tests/vitest/ui/task-105-08-08-post-richtext-adapter-dead-paths.test.tsx
```

## Closure Checklist

- [ ] The 1,352-line adapter is split into cohesive modules, all at most 1,000 lines.
- [ ] Whitespace range and media-node behavior remain correct without dead/cast fallback paths.
- [ ] L02's valid `onSlashInsertBlock` removal transition remains available for public coverage.
- [ ] Scoped V8 regression evidence, lint, types, boundary, diff, and line-cap gates pass
  before L02 begins; L02 owns final whole-module V8 including the extracted files.

## Closure (2026-09-02)

Closed on tree evidence (commit ef6e2e7c): the richtext subsystem is split into editor/richtext/PostRichTextAdapter.tsx (818), postRichTextSelection.ts (444), postRichTextMedia.ts (131), and postRichTextSlashState.ts (20) — every module at or under 1,000 physical lines — with the realm-independent image predicate documented in postRichTextMedia.ts instead of a window-conditional dead branch.
Owned richtext suites are committed and green in the canonical run; root tsc --noEmit exits 0 with zero diagnostics.
Residual disposition: remaining richtext lines sit in the 08-08 posts attribution in TASK-105-08-12 (9 files / 42 lines).
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines, 291 uncovered / 87 files, canonical run 1186 files / 10444 tests / 0 failures.
