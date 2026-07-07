# TASK-521-03-L02: Hero Tilt Editor Control

# FileName: TASK-521-03-L02-Hero-Tilt-Editor-Control.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-03
**Priority:** Medium
**Category:** Widgets (Hero) / Admin UI
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the editor region of `core/widgets/core/hero.tsx`:
declares `style.tilt` as a writable path and adds the segmented control to the
hero Appearance editor cluster, beside the existing `style.motion` control.
Disjoint from L01 (model) and L03 (render).

## Grounded anchors

Editor `writablePaths` for the "Appearance" section (`:1395-1408`) lists
`"style.motion"` (`:1406`); a second `writablePaths` block at `:1537` also
references `"style.motion"` (wizard/advanced surface). The hero editor renders
`style.motion` as a control in the visual editor cluster (search the visual editor
body for the motion field — it maps the schema enum to a segmented/select control).
`heroTilts` from L01.

## Implementation pseudocode

```ts
// (1) Add "style.tilt" to the Appearance writablePaths (:1399-1407) AND the
//     mirrored block at :1537 if hero surfaces both:
writablePaths: [ /* …existing… */ "style.motion", "style.tilt" ],

// (2) Render a segmented "Hover tilt" control next to the entrance-motion field,
//     using the hero editor's existing control primitive (match how style.motion
//     is rendered — same SegmentedControl / SelectControl helper):
<SegmentedControl
  label="Hover tilt"
  value={style.tilt ?? "none"}
  onChange={(v) => patchStyle({ tilt: v as HeroTilt })}
  options={heroTilts.map((t) => ({ value: t, label: capitalize(t) }))}
/>
```

**Match the existing motion control's exact primitive + patch helper** — read the
visual-editor body first and copy the `style.motion` control verbatim, swapping
key/label/options. Keep it in the same Appearance group so authors see entrance
motion + hover tilt together.

## Regression-test shape (delegated to L04)

- Editor contract test: hero writablePaths include `"style.tilt"`; selecting a
  tilt option patches `style.tilt`.

## Hard Invariants

1. Reuse the existing hero control primitive (no bespoke widget).
2. Writes `style.tilt` only; `"none"` clears (present-only).
