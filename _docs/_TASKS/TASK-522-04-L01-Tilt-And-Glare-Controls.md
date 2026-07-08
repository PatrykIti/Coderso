# TASK-522-04-L01: Block Tilt + Glare Control Descriptors

# FileName: TASK-522-04-L01-Tilt-And-Glare-Controls.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-04
**Priority:** High
**Category:** Admin UI / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Appends the `block.tilt.*` control group to
`pageUniversalBlockControls` (`pageEditorControlRegistry.ts:362`) — DISJOINT
id-namespace from 522-03's `block.decoration.*`. NO renderer edit (the 522-03
block-frame resolver already emits `data-block-tilt`, the perspective wrapper, and
`.cx-glare` from `style.tilt`/`style.tiltGlare`) and NO runtime edit (522-01-L05
already bound `[data-block-tilt]`). Controls only.

## Grounded anchors

- `pageUniversalBlockControls` (`:362`); 522-03-L01 already appended the decoration
  group. `resolveBlockCompositionAttrs` (522-01-L04) reads `style.tilt`/`style.tiltGlare`.
- Reference behaviour: `.blueprint-card[data-tilt]` (`index.html:47`) — the exact UX
  this generalizes; 521-03 shipped it on the hero, 522 exposes it on any block.

## Implementation pseudocode

Descriptors use the LIVE `control({...})` helper: array `path`, `readonly string[]`
enum options (the enum const — `"none"` is the reset, normalize omits it; no bogus
`""`), `input:"select"`/`"switch"` from the live union (NO `toggle`), required `panel`/
`target`/`responsive`, NO `showWhen`/`help`/`kind`. The glare `switch` is always shown
(inert when no tilt — see the parent control-visibility decision).

```ts
// pageEditorControlRegistry.ts — append to pageUniversalBlockControls:
control({ id: "block.tilt.strength", panel: "style", target: "block", label: "Mouse tilt (3D)",
  path: ["style","tilt"], input: "select", responsive: false,
  options: pageTiltStrengths }),   // ["none","subtle","strong"]
control({ id: "block.tilt.glare", panel: "style", target: "block", label: "Tilt glare",
  path: ["style","tiltGlare"], input: "switch", responsive: false }),
```

**`responsive:false`** on tilt + glare: tilt is a base-only `data-block-tilt` attr driven
by the shared runtime; `pageResponsiveCss.ts` cannot express a per-breakpoint attr/runtime
toggle against the inline base, so a per-device tilt override would be a silent no-op
(finding-6 fix; matches parent Acceptance #7). Use per-device block visibility to drop a
tilted block on mobile.

## Regression-test shape (delegated to 522-04-L02, asserted here)

- `pageUniversalBlockControls` includes `block.tilt.strength` (select, options =
  `pageTiltStrengths`) + `block.tilt.glare` (switch); a block with `style.tilt:"subtle"`
  + `tiltGlare:true` renders `data-tilt-parent` on the FRAME + `data-block-tilt="subtle"` +
  `.cx-glare` on the INNER effect wrapper (via the 522-03 frame seam); `tilt:"none"`/unset
  → byte-identical (no inner wrapper).
- **Lane:** Vitest `tests/vitest/pages/page-editor-control-registry.test.ts` +
  `page-renderer-v2.test.tsx`.

## Hard Invariants

1. Controls only; no renderer/runtime edit (reuse 522-03 frame + 522-01-L05 runtime).
2. `"none"` → unset (present-only, normalize omits it); glare switch inert when no
   tilt (no `showWhen`); descriptors use the live `control({...})` shape.
</content>
