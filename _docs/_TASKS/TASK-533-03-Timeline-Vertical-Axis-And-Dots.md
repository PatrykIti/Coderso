# TASK-533-03: Native Timeline Vertical Axis + Dots

# FileName: TASK-533-03-Timeline-Vertical-Axis-And-Dots.md

**Parent Task:** TASK-533
**Priority:** High
**Category:** Site Render / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

VERIFY the native `timeline` section render state, then ADD the missing continuous
vertical AXIS line so the existing per-item dots sit on a real axis — reproducing
`.timeline:before` (aqua gradient axis) + `.timeline article:before` (glow dots). No
model field required (the axis is fixed structure keyed off the already-sanitized
`--coderso-section-accent`). Also document how to add/select a `timeline` section so
it is discoverable. Renderer-only; DISJOINT from 533-01/02. NO migration / NO
schemaVersion bump / NO npm dep.

## Verification finding (grounded)

- The `timeline` section type EXISTS and IS rendered — NOT unused
  (`_TMP-cms-ograniczenia.md:157` asked "do sprawdzenia czy daje oś"; ANSWER below).
  `pageSectionTemplates.ts:62-64` defines it (`type/template:"timeline"`, variants
  incl. `horizontal`/`compact`); `wrapSectionTemplateBlock` timeline branch
  (`pageRendererV2.tsx:2468-2500`) wraps each block in a `grid
  grid-cols-[auto_minmax(0,1fr)]` row with a `data-page-timeline-marker` DOT
  (`:2481-2488`, `h-3 w-3 rounded-full ring-4 ring-white` tinted
  `var(--coderso-section-accent,#0d9488)`) + `data-page-timeline-content`
  (`:2489-2497`).
- **CONCLUSION: it delivers the DOTS but NOT a connecting vertical AXIS LINE.** No
  element draws a continuous line between the dots. This is exactly why the owner's
  smoke used a manual GRID instead of the native `timeline`
  (`_TMP-cms-ograniczenia.md:120`). 533-03 ADDS the axis.

## Leaves

| Leaf | Title | Owns |
|------|-------|------|
| 533-03-L01 | Add vertical axis (+ glow dots) to the native timeline render | `pageRendererV2.tsx` (`wrapSectionTemplateBlock` timeline branch + optional container axis) |
| 533-03-L02 | Tests + owned timeline structural rebaseline (if any) | `tests/vitest/pages/page-renderer-v2.test.tsx` |

## Coordination / collision guards

- DISJOINT from 533-01 (`toPageBlockRenderProps`/`toPageSectionRenderProps` regions)
  and 533-02 (`toPageSectionStyle` region) — 03 owns only the timeline branch of
  `wrapSectionTemplateBlock` (`:2468-2500`) + any timeline-scoped CSS. Additions in a
  labelled `TASK-533` region.
- 533-03 MUST grep for existing `data-page-timeline-*` structural assertions before
  editing; preserve them if the axis is purely additive DOM, else rebaseline
  explicitly in L02 (declared owned change, not drift).
- rg misdetects `pageRendererV2.tsx` as binary — use `Read`/`grep -an`.

## Security note

No author-controlled value: the axis is fixed render structure/CSS tinted off the
already-sanitized `--coderso-section-accent` custom property (set from the section
`accent`, normalized via `sanitizeAuthoringCssColor`). No new field, no new attacker
surface, no route.
