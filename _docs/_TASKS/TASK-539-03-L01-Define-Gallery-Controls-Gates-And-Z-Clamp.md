# TASK-539-03-L01: Define Gallery Controls, Gates, and Z Clamp

# FileName: TASK-539-03-L01-Define-Gallery-Controls-Gates-And-Z-Clamp.md

**Parent Subtask:** TASK-539-03
**Priority:** High
**Category:** Pages / Admin Editor Contract
**Estimated Effort:** Large
**Dependencies:** TASK-539-03-L05
**Status:** ⏳ To Do
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Sole ownership and mandatory split

Own:

- stable facade `core/services/pages/pageEditorControlRegistry.ts` (now 32 lines);
- the landed split modules
  `pageEditorControlDefinition.ts`, `pageEditorBlockControlRegistry.ts`,
  `pageEditorBlockStyleControls.ts`, and `pageEditorSectionControls.ts`;
- `core/services/pages/pageEditorControlUiModel.ts`;
- existing/split suites
  `tests/vitest/pages/page-editor-control-registry.test.ts` (now 942 lines),
  `page-editor-content-controls.test.ts` (287 lines),
  `page-editor-visual-controls.test.ts` (770 lines), and
  `page-editor-control-ui-model.test.ts` (602 lines).

The facade must explicitly re-export the pre-task public symbols; `export *` is
forbidden. TASK-547 split the registry into the four landed modules above and
TASK-554 split the oversized registry suite into the two landed suites above;
re-ground against them instead of the planned
`pageEditorControlTypes.ts`/`pageEditorControlBuilders.ts`/
`pageEditorUniversalControls.ts`/`pageEditorBlockControls.ts`/
`pageEditorResponsiveControls.ts` or any
`page-editor-control-registry-{capabilities,effects,responsive}.test.ts` names
(those three suite files do not exist and must never be authored). Add the new
gallery/z-clamp definitions,
builders, universal controls, per-block controls, and responsive projection into the
landed modules by responsibility, not arbitrary line ranges. Every module and
independently runnable suite must be at most 1,000 lines. Baseline receipts are 32
lines for the registry, 942 for its main suite, 287/770 for the two TASK-554
content/visual suites, and 602 for the UI-model suite.

## Implementation Pseudocode

Extend the vocabulary:

```ts
type PageEditorControlInput =
  | ExistingInputs
  | "galleryItems"
  | "galleryCategoryTokens";

type PageEditorControlCondition = {
  path: readonly string[];
  equals: string | number | boolean | null;
};

type PageEditorControlDefinition = {
  // existing fields
  showWhen?: PageEditorControlCondition;
};

function blockPropControl(type, key, definition: {
  // existing supported options
  responsive?: boolean;
  showWhen?: PageEditorControlCondition;
}) {
  // responsive defaults to true; preserve showWhen
}

export function isPageEditorControlVisible(
  control: PageEditorControlDefinition,
  targets: { baseTarget: unknown; effectiveTarget: unknown }
): boolean {
  if (!control.showWhen) return true;
  const source = control.responsive
    ? targets.effectiveTarget
    : targets.baseTarget;
  // read path without mutation; strict equality; malformed/missing => false
}
```

Registry contract:

- `gallery.props.items` uses `input:"galleryItems"` and is base-only.
- Gallery `layout`, `filterable`, and `filterCategories` are also base-only.
- `filterCategories` uses `input:"galleryCategoryTokens"` and is shown only when
  base `props.filterable === true`.
- Section `parallaxIntensity` is shown only when base
  `style.scrollEffect === "parallax"`.
- Divider `tone`, `thickness`, `gradient`, `width`, and `align` are all base-only.
  The public responsive prop contract supports only heading/text alignment, so none
  of these five controls may author a divider responsive prop. `width` and `align`
  are shown only when base `props.gradient === true`; the effective responsive
  target must not make these controls appear or disappear.
- Import `PAGE_LAYER_Z_CLAMP` and use the owner object directly; no `0..40` mirror.
- Keep optional values present-only.

The UI model maps only the two exact new inputs to
`{kind:"galleryItems"}` / `{kind:"galleryCategoryTokens"}`. `"items"` remains
`{kind:"listItems"}` for the list/switcher contracts only. Unknown inputs remain
non-mutating unsupported controls.

## Tests, security, and compatibility

Source-owner suites pin base-vs-effective condition resolution, all four gallery
controls and all five divider controls as base-only, the base-owned
parallax/divider gates, exact z owner identity, supported UI kinds, and
malformed-condition fail-closed behavior. They explicitly prove that pre-existing
tablet/mobile overrides for every gallery/divider prop cannot change a base-only
displayed value, open a base-only gate, expose an override badge/reset, or receive a
write. Splits preserve all prior assertions.

No route/security boundary changes. The helpers are pure, Bun-free, non-mutating, and
must not import browser/server/runtime adapters.

## Validation and line receipt

Known cross-leaf type transient: the contract-mandated `PageEditorControlUiModel`
union widening adds `{kind:"galleryItems"}` and `{kind:"galleryCategoryTokens"}`.
The consumer default branch in `core/admin/ui/pages/editor/PageEditorRegistryFields.tsx`
(owned by TASK-539-03-L03) therefore fails `lint:types` (TS2322 at ~:776) until L03
lands its render branches for those two kinds (L03 contract lines 112-113). That
single error is the L03-owned file; it is NOT a defect of this leaf. The gate below
is green apart from that one documented transient, which must be resolved (lint:types
fully green) once L03 lands, before any combined gate.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- \
  tests/vitest/pages/page-editor-control-registry.test.ts \
  tests/vitest/pages/page-editor-content-controls.test.ts \
  tests/vitest/pages/page-editor-visual-controls.test.ts \
  tests/vitest/pages/page-editor-control-ui-model.test.ts
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

The workflow line receipt must list every touched/split source and test at `<=1000`.
Rerun a named failure alone before classification.
