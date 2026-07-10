# TASK-539-04-L02: Prove Independent Transform Composition

# FileName: TASK-539-04-L02-Prove-Independent-Transform-Composition.md

**Parent Subtask:** TASK-539-04
**Priority:** High
**Category:** Pages / Vitest / CSS Contract Proof
**Estimated Effort:** Medium
**Dependencies:** TASK-539-04-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Ownership

Own only additive cross-effect cases in:

- `tests/vitest/pages/page-composition-effects.test.ts`
- `tests/vitest/pages/task-534-interactivity-css.test.ts`

TASK-539-04-L01 already updated and gated compatibility expectations in both files; do
not re-baseline them.

## Implementation Pseudocode

### Test Shape

- Assert the exact eleven exported variable names and deterministic transform order.
- Assert every transform-bearing reveal, decoration, hover, tilt, and magnetic
  declaration writes only its owned transform variables and never a competing
  transform/reset. Preserve and separately assert intended non-transform opacity,
  filter, and box-shadow channels.
- Assert layer anchor continues to use independent `translate` and the full/auto
  layer-width selectors have bounded geometry declarations.
- `resolveBlockCompositionAttrs({magnetic:true})` emits the hook; false/unset does not.
- Combined style emits one transform-host contract and all required variables without
  losing layer, surface, glare, or tilt attributes.
- Pin `PAGE_BLOCK_TRANSFORM_HOST_SELECTOR` byte-for-byte as exactly two arms: the
  explicit host attribute and the section-reveal descendant. A reveal-only section
  fixture must consume the fixed transform chain on its descendant block even though
  that block has no block-owned transform-host attribute.
- Assert the exact marquee viewport→rail→segment selectors, one rail animation,
  nowrap/nonshrinking segments, direction, speed and reduced-motion stop.
- Assert every glow pseudo-overlay has `pointer-events:none` while interactive hosts do
  not.
- Pin empty/unrelated style output byte identity.

String assertions must pin complete owned selectors/declarations, not merely search for
the word `transform`. TASK-539-08 supplies computed-style browser proof.

An invalid/unknown composition value must remain omitted; a failed assertion is fixed
in the owning source contract rather than by weakening the selector or byte-identity
expectation.

## Validation

```bash
bun run test:vitest -- tests/vitest/pages/page-composition-effects.test.ts tests/vitest/pages/task-534-interactivity-css.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Rerun each failing file alone before classification.
