# TASK-105-08-03: Content Types UI
# FileName: TASK-105-08-03-content-types.md

**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Small, split into three test-only leaves
**Dependencies:** TASK-105-08; fresh pre-implementation audit for each child
**Parent Task:** TASK-105-08
**Status:** ✅ Done (2026-09-02)
**Started:** 2026-08-22

---

## Overview

The former 21-file / 787-line scope is the 2026-08-21 planning baseline, not the
current executable contract. The 2026-08-26 L12 extraction reports 62 residual lines for
this cluster. Fresh source review leaves **48 reachable lines** in ten source modules and
classifies **14 lines as unreachable** (the eleven existing L12 records plus the three
corrections below). This parent coordinates only the three narrowly owned test leaves; it
does not authorize a directory-wide content-types sweep or production-source change.

## Current Reconciliation Scope

| Source target | Reachable lines | Child owner |
|---|---|---|
| `CollectionWorkspacePage.tsx` | 379, 439, 459 | L01 |
| `ContentTypeFieldsPanel.tsx` | 75, 76 | L01 |
| `ContentTypeList.tsx` | 88, 261, 276, 277, 305, 306, 358, 361, 449, 479, 499, 629 | L01 |
| `ContentTypeSettingsCard.tsx` | 130 | L01 |
| `ContentTypeTable.tsx` | 91, 126, 172, 177 | L01 |
| `DetailTemplateCanvas.tsx` | 91-96, 102, 105, 117, 123, 126 | L02 |
| `DetailTemplateEditorPage.tsx` | 298, 299, 321, 322 | L02 |
| `DetailTemplateInspector.tsx` | 246 | L02 |
| `FieldEditor.tsx` | 81, 82, 108, 109, 396, 571 | L03 |
| `SchemaBuilderPage.tsx` | 116, 117, 214, 326 | L03 |

The child budgets are L01 **22**, L02 **16**, and L03 **10** lines.

### Source-Proven Reclassification

`DetailTemplateInspector.tsx:321,322,328` are **UNREACHABLE**, not test targets. Every
currently declared page-section variant list has at most four options
(`core/services/pages/pageSectionTemplates.ts:38-103`), while
`resolvePageEditorControlUiModel` renders declared selects with at most six options as a
segmented control (`core/services/pages/pageEditorControlUiModel.ts:380-392`). The native
select branch at 315-334 therefore cannot mount through current product data. L02 must not
fake a large option list or invoke a private callback merely to execute it.

## Child Order and Single-Writer Boundaries

1. `TASK-105-08-03-L01-content-list-workspace-residuals.md` — five list/workspace
   sources and five named UI suites, 22 lines.
2. `TASK-105-08-03-L02-detail-template-residuals.md` — three detail-template sources and
   three named/direct suites, 16 lines.
3. `TASK-105-08-03-L03-field-schema-residuals.md` — field/schema sources and two named
   UI suites, 10 lines.

Each child is the sole writer of its named test paths. All production sources above are
read-only under this restart: a source change would require a fresh contract and the
1,000-line gate. The parent, all other TASK-105 leaves, and the child siblings must not
edit a child-owned suite. Current untracked drafts are not receipts; their writer verifies
their fresh diff/ownership before adopting them.

## Implementation Pseudocode

```ts
for (const child of ["L01", "L02", "L03"]) {
  assertOnlyNamedTestPathsChanged(child);
  runNamedVitestSuites(child);
  assertVisibleEffectOrPureExportContract(child);
  assertScopedV8RowsCoverMappedLines(child);
}
```

Children use real admin client/cache/router seams and visible DOM effects. The one pure
exception is the exported `findDetailTemplateBlockPath` helper, which receives a nested
valid document and must return the exact block path or `null`; this is its public pure
contract, not a fabricated UI seam. Error cases retain real API/cache errors and must not
weaken existing behavior assertions.

## Testing Requirements

Each child runs its exact one-file-at-a-time Vitest loop and a scoped V8 report for its
listed source targets, then:

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
```

The final L12 canonical rebaseline is additional evidence; no child may claim it or claim
that all historical content-types files are at 100% lines.

## 1000-Line Rule

Do not extend `detail-template-editor-residual.test.tsx` (942 lines) or
`detail-template-editor.test.tsx` (954 lines). The modified
`detail-template-canvas.test.tsx` is read-only; L02 uses a new focused pure-helper suite.
Every changed/new test module is measured after editing and must remain at most 1,000
physical lines.

## Security Contract

Test-only, non-API work. Existing internal admin session/RBAC/CSRF and schema-first client
contracts remain unchanged. Tests may model existing client failures but must not introduce a
route, public write, credential, cache bypass, or browser-stored privileged payload.

## Historical Receipt

The 2026-08-22 broad test receipt remains historical evidence only. It predates the L12
residual extraction and does not close these three leaves or the parent.

## Sub-Tasks

- [ ] `TASK-105-08-03-L01-content-list-workspace-residuals.md`
- [ ] `TASK-105-08-03-L02-detail-template-residuals.md`
- [ ] `TASK-105-08-03-L03-field-schema-residuals.md`

## Documentation Updates Required

After each child has a validated receipt, update only this parent and L12's reconciliation
record through its designated documentation owner. Board statistics, changelog, staging,
and commits remain orchestrator-owned.

## Acceptance Criteria

1. The 48 lines above have behavior-meaningful tests under exactly one child writer.
2. `DetailTemplateInspector.tsx:321,322,328` remains documented as source-proven
   unreachable rather than artificially covered.
3. L12 receives fresh artifact-derived evidence before this parent can become terminal.

## Closure (2026-09-02)

All physical children are terminal: TASK-105-08-03-L01, L02, and L03 each flipped Done (2026-09-02) on landing commit 85b4c725 "test(task-105): close 08-03 content types and entries residuals".
Leaf receipts record focused V8 re-verification (22 + 10 + 10 mapped rows hit, 10/10, 16/16 where mapped) against the committed suites.
Residual disposition: the 08-03 cluster attribution in TASK-105-08-12 is 6 files / 14 lines, including the source-proven unreachable DetailTemplateInspector 321/322/328.
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines, 291 uncovered / 87 files, canonical run 1186 files / 10444 tests / 0 failures.
