# TASK-522-04: Tilt-On-Any-Block (Generalize TASK-521-03 Hero Tilt)

# FileName: TASK-522-04-Tilt-On-Any-Block.md

**Parent Task:** TASK-522
**Priority:** High
**Category:** Site Render / Admin UI / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do
**Depends on:** TASK-522-01 (runtime + resolver), TASK-522-03 (block-frame resolver
live).

---

## Scope

Exposes block-level tilt + optional glare on ANY block. Render is ALREADY handled by
the 522-03 block-frame resolver (which reads `style.tilt`/`style.tiltGlare` and emits
the perspective wrapper + `preserve-3d` + `data-block-tilt`) and the 522-01-L05
runtime binding — so this subtask adds ONLY the controls. Owns:
`pageEditorControlRegistry.ts` `pageUniversalBlockControls` tilt group
(`block.tilt.*`, DISJOINT id-namespace from 522-03's decoration group). Does NOT edit
`hero.tsx` (521-03 owns hero tilt) or `pageRendererV2.tsx` (frame already covers it).

## Leaves

- **522-04-L01** — tilt strength + glare control descriptors.
- **522-04-L02** — tilt (render-shape + runtime-binding) tests.

## Hard Invariants (subtask)

1. Reuses 521's pointer math + `matchMedia('(pointer:fine)')` + reduced-motion gate
   (no duplicate runtime).
2. `tilt:"none"`/unset = byte-identical; coarse pointer / reduced-motion → no tilt.
3. Tilt enum fail-closed; glare is a boolean present-only flag.

## Definition of done

`style.tilt` works on any block via the shared frame + runtime; optional glare
sheen; tests green; `hero.tsx` untouched.
</content>
