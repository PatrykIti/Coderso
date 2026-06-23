# TASK-472-01-L01: Surface Block Margin Controls
# FileName: TASK-472-01-L01-Surface-Block-Margin-Controls.md

**Parent Subtask:** TASK-472-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Controls
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-06-23
**Completed:** 2026-06-23

---

## Overview

Block margin controls are registered and painted but appear missing from the
Spacing panel. Surface them (reproduce-first: the fix may be UI-only, or — like
TASK-470 — they may already render and this closes verify-only).

## Current State (verified)

- `core/services/pages/pageEditorControlRegistry.ts:451-476` — for each side,
  both `block.style.padding.<side>` and `block.style.margin.<side>` controls
  exist (`panel:"spacing"`, `input:"number"`, clamp 0–240, responsive).
- `core/services/pages/pageRendererV2.tsx:507-514` — `toPageBlockLayoutStyle`
  emits `margin: toBoxSpacingValue(style.margin)` — a stored margin is painted.
- `core/admin/ui/pages/PageEditor.tsx` (ToolbarSubpanel ~2923-3138; block panel
  filter ~2965-2976) — Spacing panel projection; suspected desync here.

## Sub-Tasks

- [x] Reproduce: open a block → Spacing panel; do the four margin rows render
      alongside padding? Record the result.
- [x] If padding renders but margin does not, fix the filter/composer so all four
      `block.style.margin.*` controls render with the same affordances (responsive
      override + reset).
- [x] If margins already render, close verify-only with evidence.
- [x] Confirm coverage that the Spacing panel exposes margin controls.

## Implementation Pseudocode

```ts
// PageEditor.tsx — Spacing block-panel projection must include margin.*, not
// only padding.*. If a hand-rolled composer enumerates only padding sides,
// add the margin sides symmetrically.
const spacingBlockControls = blockControls.filter((c) => c.panel === "spacing");
// → must yield both block.style.padding.<side> AND block.style.margin.<side>.
```

No schema/renderer change expected (margin already modelled + painted); the fix
is restricted to the panel projection.

Regression-test shape:
- Spacing panel control set for a block includes the four `block.style.margin.*`
  ids.
- A stored block margin still renders (no renderer regression).

## Security Contract

- No new endpoints. Margin is a numeric clamp (0–240), already schema-owned. No
  new input surface; admin session + existing perms/CSRF.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts`
- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-472-01*.md` status; changelog rolled up by TASK-472-06.
