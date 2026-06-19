# TASK-472-01: Surface Block Margin Controls
# FileName: TASK-472-01-Surface-Block-Margin-Controls.md

**Parent Task:** TASK-472
**Priority:** High
**Category:** Pages / Page Editor V2 / Controls
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Block margin controls are registered and already painted, but appear to be
missing from the Spacing panel. This leaf surfaces them (reproduce-first: the fix
may be UI-only, or — like TASK-470 — the controls may already render and this
closes as verify-only).

---

## Current State (verified)

- `core/services/pages/pageEditorControlRegistry.ts:451-476` — for each side
  `top/right/bottom/left`, the registry defines **both** a
  `block.style.padding.<side>` and a `block.style.margin.<side>` control, both
  in `panel: "spacing"`, `target: "block"`, `input: "number"`,
  `clamp: { min: 0, max: 240 }`, `responsive: true`. Margins are registered
  identically to padding.
- `core/services/pages/pageRendererV2.tsx:507-514` — `toPageBlockLayoutStyle`
  already emits `margin: toBoxSpacingValue(style.margin)` (and padding). So a
  stored margin **is** painted; only the panel surfacing is in question.
- `core/admin/ui/pages/PageEditor.tsx` (ToolbarSubpanel, ~2923-3138; block panel
  filter ~2965-2976) — the Spacing panel renders block controls filtered by
  `panel === "spacing"`; the suspected desync is here (padding rows shown,
  margin rows dropped) or in the spacing visual composer.

---

## Sub-Tasks

- [ ] **Reproduce:** open a block, switch to the Spacing panel; confirm whether
      the four margin rows render alongside padding. Record the result.
- [ ] If padding renders but margin does not, find the filter/composer that
      drops margin and include it so all four `block.style.margin.*` controls
      render with the same affordances as padding (incl. responsive overrides
      + reset).
- [ ] If margins already render (TASK-470-style false positive), close
      verify-only with evidence and reconcile the parent note.
- [ ] Add/confirm coverage that the Spacing panel exposes margin controls for a
      representative block type.

---

## Implementation Pseudocode

```ts
// PageEditor.tsx — the Spacing block-panel projection must include margin.*,
// not only padding.*. If a hand-rolled spacing composer enumerates only
// padding sides, add the margin sides symmetrically:
const spacingBlockControls = blockControls.filter((c) => c.panel === "spacing");
// → must yield both block.style.padding.<side> AND block.style.margin.<side>.
```

No schema or renderer change expected (margin is already modelled and painted);
the fix is restricted to the panel projection/render.

Regression-test shape:
- The Spacing panel control set for a block includes the four
  `block.style.margin.*` ids.
- A stored block margin still renders (no renderer regression).

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts`
- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-472*.md` (status), `_docs/_CHANGELOG/` on task closure.
