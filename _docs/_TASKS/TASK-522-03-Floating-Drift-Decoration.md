# TASK-522-03: Floating-Drift Decoration + Block-Frame Composition Application

# FileName: TASK-522-03-Floating-Drift-Decoration.md

**Parent Task:** TASK-522
**Priority:** High
**Category:** Site Render / Admin UI / Accessibility
**Estimated Effort:** Medium
**Status:** ⏳ To Do
**Depends on:** TASK-522-01, TASK-522-02.

---

## Scope

Implements the floating/drift/pulse/orbit decoration AND wires the shared
block-frame composition resolver that later subtasks (tilt, glass/hover, layer)
reuse. Owns the `pageRendererV2.tsx` block-frame composition seam: **`toPageBlockRenderProps`
(`:748`)** merges the FRAME-level composition attrs (so they ride the real `[data-block-id]`
element on BOTH the front + canvas paths) + **`renderPageBlockWithFrame` (`:2009`)** wraps
`content` in ONE inner effect wrapper — calling the 522-01-L04
`resolveBlockCompositionAttrs(style)` resolver to stamp decoration/tilt/hover/glass/layer
`data-*`/vars (522-04/05 add NO further frame edit — only controls);
`pageEditorControlRegistry.ts` `pageUniversalBlockControls` decoration group
(`block.decoration.*`, DISJOINT id-namespace).

## Leaves

- **522-03-L01** — block-frame resolver wiring + decoration control descriptors.
- **522-03-L02** — decoration + frame tests.

## Hard Invariants (subtask)

1. The frame resolver is present-only: no class/attr emitted for an unstyled block
   (byte-identity preserved).
2. Every decoration keyframe binding gated by `prefers-reduced-motion:
   no-preference`.
3. Decoration `delay` staggers; `duration` clamped; motion enum fail-closed.

## Definition of done

Any block can float/drift/pulse/orbit; the block-frame resolver is live and reused
by 522-04/05; tests green; unstyled blocks byte-identical.
</content>
