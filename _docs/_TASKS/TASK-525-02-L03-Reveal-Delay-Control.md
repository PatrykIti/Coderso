# TASK-525-02-L03: `block.style.revealDelay` Editor Control

# FileName: TASK-525-02-L03-Reveal-Delay-Control.md

**Parent Task:** TASK-525
**Parent Subtask:** TASK-525-02
**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

One control in `core/services/pages/pageEditorControlRegistry.ts`
`pageUniversalBlockControls`: a "Reveal delay" number input bound to
`block.style.revealDelay`, mirroring `block.decoration.delay`. Lands after
525-02-L01 (model) so the path resolves.

## Grounded anchors (RE-GREP at implement time)

- **`pageUniversalBlockControls`** (`pageEditorControlRegistry.ts:434`) — the
  block-level control array.
- **`block.decoration.delay`** (`:604-614`) — the exact model to mirror:
  ```ts
  control({
    id: "block.decoration.delay",
    panel: "style", target: "block",
    label: "Decoration delay",
    path: ["style", "decoration", "delay"],
    input: "number", responsive: false,
    clamp: { min: 0, max: 4000 }, unit: "ms",
  }),
  ```
- Clamp must match `PAGE_REVEAL_DELAY_CLAMP` (525-02-L01,
  `{min:0,max:4000}`).

## Implementation pseudocode

```ts
// pageUniversalBlockControls — new control (DISJOINT id namespace):
control({
  id: "block.style.revealDelay",
  panel: "style",
  target: "block",
  label: "Reveal delay",
  path: ["style", "revealDelay"],
  input: "number",
  responsive: false,          // reveal is a base-only stagger; per-device delay is
                              // not css-expressible against the shared reveal CSS
                              // (mirror block.decoration.delay's responsive:false).
  clamp: { min: 0, max: 4000 }, // == PAGE_REVEAL_DELAY_CLAMP
  unit: "ms",
}),
```

- Place adjacent to the other reveal/motion-related block controls (near
  `block.decoration.delay`) for discoverability. If the editor shows a
  resolved-default hint pattern (per prior menu tasks), unset shows "0 ms" /
  "None" per the existing number-control convention — do NOT invent a new hint
  mechanism.
- `responsive:false` matches `block.decoration.delay` — a per-device reveal delay
  is not expressible against the shared static reveal CSS.

## Security note

Control-only leaf. The value flows through the same validated Page v2 `document`
write path (`normalizePageDocument`) where 525-02-L01's `readNumber` clamps it; the
control's `clamp` is a UX affordance, NOT the security boundary (the normalizer is).
No new route, no new write surface.

## Vitest test lane

- If the control registry has a coverage suite (grep
  `pageUniversalBlockControls` in `tests/vitest/pages/`), assert the
  `block.style.revealDelay` descriptor exists with the expected `path`/`input`/
  `clamp`/`unit`. Otherwise this leaf is covered indirectly by the 525-02-L04
  model round-trip + render tests. Confirm at implement time.
- **`tests/vitest/pages/page-editor-control-registry.test.ts` — DECLARED additive
  rebaseline (OWNED by this leaf).** The test `"universal block controls use
  schema-owned array paths and owner options"` (`:260-264`) loops EVERY
  `pageUniversalBlockControls` control through `expectControlPath(control,
  validBlockPaths)`, which asserts `validBlockPaths.has(pathKey(control.path))
  === true` (and the same for `overridePath`) at `:202-207`. `validBlockPaths`
  is a HARDCODED allowlist `Set` (`:103-144`, currently ending `"visibility.
  visible"`) that does NOT yet contain `"style.revealDelay"`. Registering the new
  control WITHOUT extending this Set makes the loop assert `false` → the test goes
  RED. This IS the coupled break for this leaf (the sibling
  `page-editor-control-ui-model.test.ts:73-98` only checks the control RESOLVES to
  a non-`unsupported` UI model, which the well-formed number control does — so
  ONLY this allowlist Set breaks). **Fix in the SAME commit that registers the
  control:** add `"style.revealDelay"` to the `validBlockPaths` Set. Re-grep
  `validBlockPaths` / `expectControlPath` at implement time to confirm the Set
  membership requirement still holds (line numbers drift post-523).

## Regression / breaking-test ownership

- No breaking change to production behavior: purely additive control. Any test
  asserting the exact COUNT or full snapshot of `pageUniversalBlockControls` is an
  OWNED +1 update (the new control is appended) — grep for a control-count/snapshot
  assertion before adding.
- **OWNED coupled-test rebaseline (declared additive, NOT a weakened assertion):**
  extend the `validBlockPaths` allowlist `Set` in
  `tests/vitest/pages/page-editor-control-registry.test.ts` (`:103-144`) with
  `"style.revealDelay"` so the `"universal block controls use schema-owned array
  paths and owner options"` test (`:260-264`, via `expectControlPath`/`pathKey`,
  `:202-207`) accepts the new `["style","revealDelay"]` path (and any
  `overridePath`). This must land in the same commit as the control registration;
  otherwise the loop asserts `false` and the suite goes RED. This break is NOT
  owned by 525-02-L04 (whose owned-test list is `page-document-v2.test.ts` +
  `page-renderer-v2.test.tsx` only), so it is declared HERE.

## Hard Invariants

1. Control bound to `["style","revealDelay"]`, `input:"number"`,
   `clamp:{min:0,max:4000}` (== `PAGE_REVEAL_DELAY_CLAMP`), `unit:"ms"`,
   `responsive:false`, DISJOINT id namespace.
2. The normalizer (525-02-L01), not the control clamp, is the security boundary.
