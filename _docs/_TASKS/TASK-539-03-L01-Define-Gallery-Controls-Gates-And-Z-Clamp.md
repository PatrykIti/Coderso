# TASK-539-03-L01: Define Gallery Controls, Gates, and Z Clamp

# FileName: TASK-539-03-L01-Define-Gallery-Controls-Gates-And-Z-Clamp.md

**Parent Subtask:** TASK-539-03
**Priority:** High
**Category:** Pages / Admin Editor Contract
**Estimated Effort:** Large
**Dependencies:** TASK-539-03-L05
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Sole ownership and mandatory split

Own:

- stable facade `core/services/pages/pageEditorControlRegistry.ts`;
- new cohesive modules
  `pageEditorControlTypes.ts`, `pageEditorControlBuilders.ts`,
  `pageEditorUniversalControls.ts`, `pageEditorBlockControls.ts`, and
  `pageEditorResponsiveControls.ts` beside it;
- `core/services/pages/pageEditorControlUiModel.ts`;
- existing/split suites
  `tests/vitest/pages/page-editor-control-registry.test.ts`,
  `page-editor-control-registry-capabilities.test.ts`,
  `page-editor-control-registry-effects.test.ts`,
  `page-editor-control-registry-responsive.test.ts`, and
  `page-editor-control-ui-model.test.ts`.

The facade must explicitly re-export the pre-task public symbols; `export *` is
forbidden. Split definitions/builders, universal controls, per-block controls, and
responsive projection by responsibility, not arbitrary line ranges. Every module and
independently runnable suite must be at most 1,000 lines. Baseline receipts are 1,813
lines for the registry and 1,893 for its main suite.

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

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- \
  tests/vitest/pages/page-editor-control-registry.test.ts \
  tests/vitest/pages/page-editor-control-registry-capabilities.test.ts \
  tests/vitest/pages/page-editor-control-registry-effects.test.ts \
  tests/vitest/pages/page-editor-control-registry-responsive.test.ts \
  tests/vitest/pages/page-editor-control-ui-model.test.ts
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

The workflow line receipt must list every touched/split source and test at `<=1000`.
Rerun a named failure alone before classification.
