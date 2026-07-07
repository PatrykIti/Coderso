# TASK-521-03: Hero Image Mouse-Tilt (3D parallax-on-hover)

# FileName: TASK-521-03-Hero-Mouse-Tilt.md

**Parent Task:** TASK-521
**Priority:** Medium
**Category:** Widgets (Hero) / Site Render / Accessibility
**Estimated Effort:** Medium
**Status:** ⏳ To Do
**Depends on:** TASK-521-01 (shared reduced-motion discipline; NO model import —
hero tilt vocabulary is self-contained in `hero.tsx`).

---

## Scope

Adds a present-only `hero.style.tilt` option (`"none"|"subtle"|"strong"`) giving
the hero card/media a 3D parallax-on-hover: CSS `perspective` on a wrapper + a tiny
dependency-free `mousemove` runtime that sets clamped `rotateX/rotateY`, OFF under
`prefers-reduced-motion` or a coarse pointer. **Sole writer** of
`core/widgets/core/hero.tsx` (self-contained widget — schema, normalize, defaults,
editor control, front render, and its own runtime tilt script all live here, in
DISJOINT intra-file regions across the leaves).

## Leaves

| Leaf | Title | Region in `hero.tsx` |
|------|-------|----------------------|
| TASK-521-03-L01 | Hero tilt model (type, schema, normalize, default) | `HeroData.style` (`:133`), `heroSchema` (`:285`), `normalizeHeroStyle` (`:680-709`), `heroDefaults` (`:323`) |
| TASK-521-03-L02 | Hero tilt editor control | editor `writablePaths` (`:1399-1407`) + the appearance control cluster |
| TASK-521-03-L03 | Hero tilt front render + runtime script | `HeroBlock` render (`:910`,`:1016`) + `motionClassMap` neighborhood + `renderSharedWidgetRuntimeScript` emit |
| TASK-521-03-L04 | Hero tilt tests | Vitest only — `tests/vitest/widgets/hero.test.tsx` + `tests/vitest/widgets/heroEditors.test.tsx` + `tests/vitest/content/heroTilt.test.tsx` (no Bun `tests/unit/widgets/hero*` file exists) |

**Land order:** L01 → L02 → L03 → L04 (disjoint regions of one file, strict
sequential).

## Coordination

- ONLY `hero.tsx`. No other file. The tilt runtime is emitted via
  `renderSharedWidgetRuntimeScript({ renderContext, id:"hero-tilt", source })`
  (`runtimeScripts.tsx:27`). **Grounded correction:** the hero does NOT carry
  `renderContext` today — `HeroBlock` (`hero.tsx:814`) destructures only
  `{ data, variant, slots, previewDevice }` and has no existing runtime-script
  needs. L03 WIRES `renderContext` through `HeroBlock` (the widget render contract
  already exposes it — `types.ts:211`, passed by the widget renderer
  `widgetRenderer.tsx:236`/`:249`) to enable a single deduped emit across multiple
  heroes; this is an intra-`hero.tsx` change, still no page-shell edit. If left
  unwired, `renderContext` is `undefined` and `renderSharedWidgetRuntimeScript`
  falls back to an inline `<script>` per hero — the IIFE binds per element and is
  idempotency-safe (duplicate re-bind harmless), but wiring `renderContext` is the
  correct single-emit path.
- `tilt` is a SEPARATE axis from the existing entrance `motion` — both may be set;
  `motion` animates entrance (existing), `tilt` animates hover (new).

## Hard Invariants

1. Present-only: unset/`"none"` tilt ⇒ no wrapper, no perspective, no script,
   byte-identical hero.
2. Reduced-motion OR coarse pointer ⇒ NO tilt (CSS `motion-safe:` gate + runtime
   `matchMedia('(prefers-reduced-motion: reduce)')` and `('(pointer:fine)')`
   guards).
3. No new dependency; runtime is a static IIFE string (no interpolation).
4. Tilt is clamped (max rotation small, e.g. ≤8deg) — no nausea, no layout shift
   (transform-only, `transform-style: preserve-3d`).

## Definition of done

`hero.style.tilt` persists/round-trips/reject-unknown; editor control shows;
front hero tilts on hover (subtle/strong) with pointer, resets on leave, disabled
for reduced-motion/touch; unset = byte-identical; tests green.
