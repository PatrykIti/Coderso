# TASK-539-05-L02: Prove Renderer Effects and Geometry

# FileName: TASK-539-05-L02-Prove-Renderer-Effects-And-Geometry.md

**Parent Subtask:** TASK-539-05
**Priority:** High
**Category:** Pages / Vitest / Renderer Proof
**Estimated Effort:** Large
**Dependencies:** TASK-539-05-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Ownership

Own only additive geometry/combination cases in:

- `tests/vitest/pages/page-renderer-v2.test.tsx`
- `tests/vitest/pages/task-534-interactivity-render.test.tsx`

TASK-539-05-L01 already updated and gated compatibility expectations in both files; do
not re-baseline them.

## Implementation Pseudocode

### Test Shape

- Render a normalized **magnetic-only** block and assert the renderer itself produces
  `[data-magnetic]`, the transform-host hook, and
  `PAGE_COMPOSITION_EFFECTS_CSS`; do not inject selectors or composition CSS into a
  fake fixture. Repeat with magnetic false/unset and pin zero additional bytes.
- Combined layer/reveal/decoration/hover/tilt/magnetic markup retains every owned
  hook/variable and never contains reveal `transform:none`.
- A section with reveal and an otherwise effect-free block produces no redundant
  block-owned host attribute, but the shared two-arm host selector applies the fixed
  transform chain and reveal variable to that descendant. Assert the renderer emitted
  `PAGE_COMPOSITION_EFFECTS_CSS` solely because `section.style.scrollEffect` is present;
  the same no-effect section without `scrollEffect` emits zero additional bytes.
- Full tilt+layer wrapper carries full width; auto carries auto; unrelated blocks have
  no layer-width attribute.
- Base spans style the actual section grid item for default and template-wrapper
  paths, and are absent for per-column/media-split paths. No-span output remains exact.
- Gallery renders only canonical items, safe image URLs/categories, accessible filter
  state and caption-only placeholders; unknown aliases are not interpreted here.
- Background tests pin separate image/color properties for single gradient, gradient
  stack, final color, full-bleed section and invalid fail-closed input. Assert no color
  token appears in a `background-image` value.
- Marquee has exactly one rail and two adjacent segment nodes; the clone is
  `aria-hidden` and obsolete track markup is absent.
- Divider width/alignment appear only for the gradient branch.
- Timeline first/middle/last/single markup carries the exact marker-center top/bottom
  geometry for default and compact; horizontal markup is unchanged.
- Pin legacy/no-effect rendered markup byte identity.
- Render the same magnetic-only document through the footer renderer input and prove
  the same composition predicate/style bytes are present; TASK-539-07-L02 owns the
  subsequent real main+footer runtime movement/reset proof.

DOM structure assertions supplement, not replace, TASK-539-08 browser bounding-box
proof.

## Validation

```bash
bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/task-534-interactivity-render.test.tsx
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Rerun each failing file alone before classification.
