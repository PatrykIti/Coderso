# TASK-539-06: Responsive CSS Parity

# FileName: TASK-539-06-Responsive-Css-Parity.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / Responsive CSS / Public Front
**Estimated Effort:** Large
**Dependencies:** TASK-539-01 through TASK-539-05, including TASK-539-03-L05
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Goal

Keep the stable `pageResponsiveCss` public facade while splitting its implementation
and oversized tests by cohesive responsibility. Make public breakpoint CSS match the
normalized Page model for custom font size, explicit `textTransform: "none"`, actual
grid-item spans, present-key layer offsets, parsed background paint, and full-bleed
surface targeting derived only from the base section/template.

TASK-539 may start only after TASK-540 is terminal and a fresh read-only audit passes
against the post-TASK-540 HEAD and complete dirty state. The implementation workflow
must pin that baseline before the first source edit.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-539-06-L01 | Sole responsive source/test split and behavior implementation | ⏳ To Do |
| TASK-539-06-L02 | New focused TASK-539 responsive parity suite only | ⏳ To Do |

## Ownership

L01 is the sole TASK-539 writer of the `pageResponsiveCss` facade and its cohesive
contracts/declarations/section/block/orchestration modules. It also owns the required
split of the existing oversized `page-responsive-css.test.ts`; every resulting
production, test, and test-support file must be independently meaningful and at most
1,000 physical lines.

L02 creates only
`tests/vitest/pages/task-539-responsive-css-parity.test.ts`. It treats every L01 file
as read-only and may not re-baseline compatibility assertions.

Both leaves consume, without editing or copying:

- `PageSectionResponsiveStyleV2`, `PageBlockResponsiveStyleV2`, and
  `PageBlockResponsiveLayerV2` from the Page model facade;
- `mergePageBlockLayerPresentKeys` from the Page model owner;
- `parseAuthoringCssBackgroundPaint` and the Page authoring sanitizers;
- `PAGE_BLOCK_GRID_ITEM_ATTRIBUTE`,
  `PageBlockGridPlacementTarget`, and
  `resolvePageBlockGridPlacement` from
  `core/services/pages/pageBlockGridPlacement.ts`, owned by TASK-539-03-L05.
  Responsive CSS invokes it with `{includeHiddenBlocks:false}` to match public
  visible-root rendering.

## Security Contract

The generated raw `<style>` remains a public read-only projection of strictly
normalized data. There is no route, auth, RBAC, CSRF, rate-limit, nonce, captcha, or
public-write change. IDs and scope selectors retain conservative escaping/validation;
paint, font-size, color, URL, and numeric values are revalidated before interpolation.
Invalid input produces a deterministic diagnostic and zero unsafe CSS bytes. No
scanner exception is allowed.

## Acceptance

- Existing imports continue through an explicit, stable `pageResponsiveCss.ts`
  facade; no `export *`, import cycle, or Bun/runtime coupling is introduced.
- Collector inputs use the dedicated Page model responsive style types. Section
  `scrollEffect`/`parallaxIntensity`/`surfacePreset`/`composition`/`fullBleed`/
  `noiseOverlay`/`columnTemplate`/`border` and block
  `decoration`/`tilt`/`tiltGlare`/`surfacePreset`/`hoverEffect`/`marquee`/
  `composition`/`revealDelay`/`magnetic` never enter the responsive CSS plan.
- A responsive layer can carry only present `x`, `y`, and `z`; `anchor` is impossible
  after normalization and never reaches CSS.
- Custom font size, explicit transform reset, spans, structured paint, and full-bleed
  declarations target the actual renderer surfaces.
- Placement classification comes only from TASK-539-03-L05; unsupported placement
  emits exact-key diagnostics rather than inert rules. Legal base-only and
  responsive-only spans share the renderer-stamped hook; wholly unauthored spans
  emit neither hook nor CSS.
- The public collector does not create diagnostics for model-forbidden base-only
  style keys. Its deliberately accepted but structurally non-projectable cases remain
  exact and visible: `style.column` emits `not_css_expressible`, while unsupported
  block props emit the existing props diagnostic (`heading`/`text` `props.align`
  remains the explicit projection exception).
- Selectors preserve exact escaping, deterministic order, and trusted-scope checks.
- No override and unrelated legacy documents retain exact zero-byte/byte-identity
  behavior.
- The baseline-through-final family line gate reports every touched human-authored
  production/test file at no more than 1,000 physical lines.

## Validation

Run both leaves' exact Vitest inventories, then:

```bash
bun --cwd core lint:types
bun --cwd core lint
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

Rerun a named failing file once in isolation before classifying it.
