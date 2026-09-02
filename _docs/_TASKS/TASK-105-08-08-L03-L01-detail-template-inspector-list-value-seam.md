# TASK-105-08-08-L03-L01: Detail Template Inspector List-Value Seam
# FileName: TASK-105-08-08-L03-L01-detail-template-inspector-list-value-seam.md

**Parent Subtask:** TASK-105-08-08-L03
**Priority:** High
**Category:** UI Reliability + Coverage
**Estimated Effort:** Small
**Dependencies:** TASK-105-08-08-L03 fresh source-contract audit (the owner-boundary
decision recorded below); disjoint from the L03 single-writer set — it owns the one file
that audit proved was outside it.
**Status:** ✅ Done (2026-09-02)
**Started:** 2026-09-02

---

## Overview

TASK-105-08-08-L03 step 3 requires `ListItemsControl.tsx:62` to be narrowed or removed only
after all supported callers are proven, and forbids hitting it with `as unknown as`. The L03
audit proved the scalar fallback dead through owner flows but stopped at one caller that L03
may not write, exactly as its "stop and author a direct child" clause demands. That inherited
evidence, re-verified line-by-line on this tree before implementation:

- `core/admin/ui/pages/editorControls/ListItemsControl.tsx:62` — scalar fallback
  `return { label: "", href: "" }` for elements that are neither string nor object.
- `core/services/pages/pageDocumentV2Contract.ts:395` — `PageListItemV2` is the closed union
  `string | { label: string; href: string }`; `createPageListItem` (`:403-407`) collapses any
  empty href back to the plain-string item, so an object item always carries a usable target.
- `core/services/pages/pageBlockNormalizerV2.ts:206-249` — `normalizeListItems` emits only
  those two shapes; stored reads are non-destructive (scalar legacy values keep their text).
- `core/admin/ui/pages/editorControls/ListItemsControl.tsx:66` — the control's own commit
  path already routes every row through `createPageListItem`.
- The narrowing blocker: `core/admin/ui/content-types/DetailTemplateInspector.tsx:115` holds
  `rawValue: unknown` and `:231` forwards `Array.isArray(value) ? value : []` into
  `ListItemsControl`'s `value: readonly unknown[]` prop. That file was outside L03's writer
  set, so L03 stopped here and this child owns it. (Line numbers are the audit-time file;
  the seam below shifts them.)

The second production caller, `PageEditorRegistryFields.tsx:838-840`, needs no edit: its
`rawValue` is likewise `unknown` and already narrowed by `Array.isArray` before the call, and
its value source is the same normalized block-props data.

This child adapts the inspector's list-items seam to the owner union, then lets L03's own
narrowing of `ListItemsControl` land without casts. No API, behavior, or security change.

## Exact Single-Writer Scope

**Production source writers:**

- `core/admin/ui/content-types/DetailTemplateInspector.tsx` (type import + one list-items
  seam helper + the `listItems` case)
- `core/admin/ui/pages/editorControls/ListItemsControl.tsx` (`:62` scalar fallback removal
  and the `value` prop narrowing it unblocks)

**Test writer:**

- `tests/vitest/ui/detail-template-inspector.test.tsx` (existing suite, extended with the
  typed-seam regression; no new suite file needed — this suite already covers the inspector)

Everything else — normalizers, contracts, registry fields, routes, clients, task board,
changelog, coverage configuration — is read-only. If a correct seam needs a path outside this
list (for example the inspector's parent state type), stop and report instead of widening.

## Implementation Steps

1. In `DetailTemplateInspector.tsx`, import `PageListItemV2` from the existing
   `pageDocumentV2` type import and add a `listItemsValue(value: unknown): PageListItemV2[]`
   helper beside the other coercion helpers (`stringValue`, `numberValue`, `booleanValue`),
   mirroring the owner read semantics of `normalizeListItems`: strings stay strings;
   `{ label, href }` records keep their string fields; number/boolean legacy scalars keep
   their text; anything else defaults to the empty plain-string item; a non-array raw value
   becomes `[]`. Do not trim and do not drop entries — trimming stays at the persist
   boundary (`pageBlockNormalizerV2`), so a live label edit such as `"Docs "` round-trips
   untouched instead of eating the trailing space mid-typing. No casts, no `any`.
2. Replace the `listItems` case's `Array.isArray(value) ? value : []` with
   `listItemsValue(value)`. Leave the adjacent `facetList` case untouched.
3. In `ListItemsControl.tsx`, narrow `value` to `readonly PageListItemV2[]`, delete the
   structurally unreachable scalar fallback at `:62` and the `as { label?: unknown }` record
   cast it required, and keep the string branch plus the `createPageListItem` commit path.
4. Extend `tests/vitest/ui/detail-template-inspector.test.tsx`: type the mocked
   `ListItemsControl` props as `readonly PageListItemV2[]` (a compile-time proof that the
   inspector forwards the owner union), and add the seam regression — stored owner shapes
   pass through unchanged, raw scalar/malformed entries adapt per owner read semantics, and
   a non-array raw value renders an empty list instead of crashing.

## Security Contract

Internal admin UI typing seam only; no behavior, API, endpoint, session/RBAC, CSRF, rate
limit, strict server validation, cache, persistence, schema, migration, or anti-abuse change.
The adaptation is display-side only: commits still flow through the unchanged
`createPageListItem` path, so nothing new reaches a write boundary. Tests contain no secrets
or privileged payloads.

## Testing Gates

```bash
export TMPDIR=/tmp
set -a && . ./.env && set +a
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/detail-template-inspector.test.tsx
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/page-editor-list-items-control.test.tsx
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/task-105-08-08-pages-dead-paths.test.tsx \
  tests/vitest/ui/task-105-08-08-post-classic-dead-paths.test.tsx \
  tests/vitest/ui/task-105-08-08-post-richtext-toolbar-dead-paths.test.tsx
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/ui/content-types/DetailTemplateInspector.tsx \
  core/admin/ui/pages/editorControls/ListItemsControl.tsx \
  tests/vitest/ui/detail-template-inspector.test.tsx
bun --cwd core lint
bun --cwd core lint:types
./node_modules/.bin/tsc -p tsconfig.json --noEmit
git diff --check
wc -l core/admin/ui/content-types/DetailTemplateInspector.tsx \
  core/admin/ui/pages/editorControls/ListItemsControl.tsx \
  tests/vitest/ui/detail-template-inspector.test.tsx
```

## Acceptance Criteria

- [ ] The inspector forwards `PageListItemV2[]` into `ListItemsControl` with no cast and no
      new semantics beyond the owner read normalizer's.
- [ ] The `ListItemsControl` scalar fallback and its record cast are gone; the string branch
      and the `createPageListItem` commit path remain.
- [ ] The seam suite and the adjacent list-items/dead-paths suites are green; static gates
      pass; every owned file stays under its line cap.

## Closure Receipt (2026-09-02)

Implemented exactly as scoped; no writer outside the list above was touched and the L03 leaf
file itself was left untouched (this document is the audit artifact its step 3 demanded).

- Seam: `DetailTemplateInspector.tsx` gained `listItemsValue` (`:87-112`) mirroring the owner
  read semantics, and the `listItems` case now passes `listItemsValue(value)`
  (`:259`; `rawValue: unknown` now at `:143`). `ListItemsControl.tsx` narrowed `value` to
  `readonly PageListItemV2[]` (`:22`) and lost the `:62` scalar fallback plus its
  `as { label?: unknown }` cast; string branch and the `createPageListItem` commit path
  (`:63`) intact. No `as unknown as`, no `any`.
- Gates (real runs on this tree): `detail-template-inspector.test.tsx` +
  `page-editor-list-items-control.test.tsx` — 2 files / 19 tests passed; the three
  `task-105-08-08-*-dead-paths` suites — 3 files / 31 tests passed; eslint
  `--max-warnings=0` on the three owned files — exit 0; `bun --cwd core lint` — exit 0;
  `bun --cwd core lint:types` — exit 0; root `tsc -p tsconfig.json --noEmit` — exit 0;
  `git diff --check` — clean.
- Line counts: `DetailTemplateInspector.tsx` 461, `ListItemsControl.tsx` 127,
  `detail-template-inspector.test.tsx` 599 (extended in place; no new test file) — all under
  the 1,000-line production cap.
- Residual: none. L03's `ListItemsControl.tsx:62` item is unblocked; its registry item and
  the L03 status/closure receipt remain owned by the L03 closure pass.
