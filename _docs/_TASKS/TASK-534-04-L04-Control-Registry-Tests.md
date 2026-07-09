# TASK-534-04-L04: Control-Registry Tests

# FileName: TASK-534-04-L04-Control-Registry-Tests.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-04
**Priority:** High
**Category:** Tests
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Extends the control-registry Vitest coverage for 534-04 (switcher
tabs/variant/activeIndex, gallery filter controls, scrollHint glyph/label, universal
magnetic toggle, section + page noise toggle, palette copy). Owns/extends its test
files; imports the registry + UI model read-only.

## Test lane (rationale)

**Vitest `tests/vitest/pages/page-editor-control-registry.test.ts`** (the existing
control-registry suite) — pure control-descriptor + UI-model resolution (no DB, no
DOM), matching how 521/522 covered their controls. The PageEditor Effects-panel
`updateEffects` present-only cleanup is covered in the existing PageEditor/effects
Vitest suite (extend it).

## Grounded anchors

`page-editor-control-registry.test.ts` (existing; customSvg/filters cases are the
precedent). `getPageEditorControlsForTarget` `:1340`; the UI-model mapping
`pageEditorControlUiModel.ts:407` (`"items"` → `listItems`).

## Implementation pseudocode

```ts
// EXTEND tests/vitest/pages/page-editor-control-registry.test.ts
it("switcher resolves tabs (items/switcherTabs) + variant segmented + clamped activeIndex");
it("gallery resolves filterable switch + filterCategories list");
it("scrollHint resolves glyph segmented + label text");
it("pageUniversalBlockControls contains exactly one block.style.magnetic switch");
it("pageUniversalSectionControls contains section.style.noiseOverlay switch");
it("UI model maps the new inputs to expected kinds (switch/segmented/listItems/switcherTabs?)");
// EXTEND the PageEditor effects suite:
it("updateEffects keeps noiseOverlay present-only (true kept, false dropped)");
```

## Security note

The control tests confirm the editor cannot author a value that bypasses the write
normalizer (enum fail-closed, category kebab-drop) — the controls only surface the
already-validated shapes.

## Regression / owned-breaking-test notes

- This leaf lands the owned-breaking count/snapshot updates flagged in
  534-04-L01/L02/L03 (registry per-type counts, universal-control counts, palette
  option count, UI-model exhaustive switch). Run the named file + root
  `tsc -p tsconfig.json --noEmit` after merge (test excess-prop errors surface on
  prop-shape changes — MEMORY typecheck-scope gotcha).

## Hard Invariants

1. Vitest control-registry lane.
2. Asserts present-only cleanup + single universal/section/page toggle (no dup).
