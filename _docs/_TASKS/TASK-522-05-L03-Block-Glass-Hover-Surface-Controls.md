# TASK-522-05-L03: Block Glass/Glow + Hover Preset Controls

# FileName: TASK-522-05-L03-Block-Glass-Hover-Surface-Controls.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-05
**Priority:** High
**Category:** Admin UI / Accessibility
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Appends the block `block.surface.*` + `block.hover.*` control group
to `pageUniversalBlockControls` (`pageEditorControlRegistry.ts:362`) — DISJOINT
id-namespace from 522-03 (decoration), 522-04 (tilt), 522-05-L02 (layer/composition).
NO renderer edit: the 522-03 block-frame resolver already emits `data-surface` +
`data-hover` from `style.surfacePreset`/`style.hoverEffect`, and the 522-01-L04 CSS
paints them. Controls only.

## Grounded anchors

- `pageUniversalBlockControls` (`:362`); `resolveBlockCompositionAttrs` reads
  `style.surfacePreset`/`style.hoverEffect` (522-01-L04). Reference presets:
  `.service-card` glass (`styles.css:77`), `:hover:after` glow-reveal (`:77`),
  `.project-card:hover` lift + inner scale (`:79`).

## Implementation pseudocode

Descriptors use the live `control({...})` shape (array `path`, `readonly string[]`
enum options that include the reset `"none"`, required `panel`/`target`/`responsive`;
NO `kind`/`help`/`{value,label}`):

```ts
// pageEditorControlRegistry.ts — append to pageUniversalBlockControls:
control({ id:"block.surface.preset", panel:"style", target:"block", label:"Surface preset",
  path:["style","surfacePreset"], input:"select", responsive:false, options:pageSurfacePresets }),
  // pageSurfacePresets = ["none","glass","glass-grid","radial-glow","ambient-orbs"]
control({ id:"block.hover.effect", panel:"style", target:"block", label:"Hover effect",
  path:["style","hoverEffect"], input:"select", responsive:false, options:pageBlockHoverEffects }),
  // pageBlockHoverEffects = ["none","glow-reveal","lift","scale","lift-glow"]
```

**`responsive:false`** on block surface + hover: both are base-only
`data-surface`/`data-hover` attrs; `pageResponsiveCss.ts` cannot express a per-breakpoint
class/attr delta against the inline base, so a per-device override would be a silent no-op
(finding-6 fix; matches parent Acceptance #7).

## Regression-test shape (delegated to 522-05-L05, asserted here)

- `pageUniversalBlockControls` includes `block.surface.preset` + `block.hover.effect`;
  a block with `style.surfacePreset:"glass"` → frame `data-surface="glass"`;
  `hoverEffect:"lift-glow"` → `data-hover="lift-glow"`; `""`/unset → neither
  (byte-identical).
- **Lane:** Vitest `page-editor-control-registry.test.ts` + `page-renderer-v2.test.tsx`.

## Hard Invariants

1. Controls only (reuse 522-03 frame + 522-01-L04 CSS).
2. `""` → unset (present-only).
3. Glass/glow STATIC (apply under reduced-motion); only the hover TRANSITION gates on
   `prefers-reduced-motion: no-preference` (in the 522-01-L04 CSS).
</content>
