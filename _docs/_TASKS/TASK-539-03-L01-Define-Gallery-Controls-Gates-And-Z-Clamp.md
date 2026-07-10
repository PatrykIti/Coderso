# TASK-539-03-L01: Define Gallery Controls, Gates, and Z Clamp

# FileName: TASK-539-03-L01-Define-Gallery-Controls-Gates-And-Z-Clamp.md

**Parent Subtask:** TASK-539-03
**Priority:** High
**Category:** Pages / Admin Editor Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-539-01-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Ownership

Own only:

- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageEditorControlUiModel.ts`
- compatibility-expectation updates required before this source gate in
  `tests/vitest/pages/page-editor-control-registry.test.ts` and
  `tests/vitest/pages/page-editor-control-ui-model.test.ts`

Current anchors are gallery controls around registry `:1325-1344`, divider controls
around `:1449-1478`, and layer z around `:960-970`.

## Implementation Pseudocode

Extend the input/model vocabulary with a dedicated `galleryItems` kind. Do not map
gallery data through generic `items`/`ListItemsControl`.

Add a declarative sibling-value gate:

```ts
export type PageEditorControlCondition = {
  path: readonly string[];
  equals: string | number | boolean | null;
};

type PageEditorControlDefinition = {
  // existing fields
  showWhen?: PageEditorControlCondition;
};

export function isPageEditorControlVisible(
  control: PageEditorControlDefinition,
  effectiveTarget: unknown
): boolean {
  // no condition => true
  // resolve the sibling path without mutation; strict equality only
  // missing or mismatched value => false
}
```

The PageEditor consumer passes the effective base/breakpoint target. Do not hide a
control by inspecting DOM or by duplicating per-control conditionals in JSX.

Registry changes:

- Add gallery `props.items` using `input:"galleryItems"` in Content.
- Show gallery `filterCategories` only when `props.filterable === true`.
- Show section `parallaxIntensity` only when `style.scrollEffect === "parallax"`.
- Show divider `width` and `align` only when `props.gradient === true`.
- Import `PAGE_LAYER_Z_CLAMP` and use it directly instead of `{min:0,max:40}`.
- Keep optional controls present-only: no new fallback/default values.

`resolvePageEditorControlUiModel` maps only the new declared input to
`{kind:"galleryItems"}`; unknown inputs remain non-mutating unsupported controls.

## Errors and compatibility

The helper is pure and Bun-free. A malformed condition fails closed to hidden and
must not throw during editor render. Existing controls without `showWhen` retain their
exact model. This leaf does not enforce security; TASK-539-01 remains the write owner.

## Gate test ownership and validation

Update the named suites before this source gate, including the stale layer-z maximum
(`40` -> the imported `PAGE_LAYER_Z_CLAMP.max`, exactly `20`) and the new pure visibility
conditions. TASK-539-03-L04 owns only additive cross-component/editor-flow coverage in
these files and must not re-baseline the landed registry/UI-model expectations.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-editor-control-ui-model.test.ts
git diff --check
```

Rerun any named failing test file once in isolation before classifying the failure.
