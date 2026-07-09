# TASK-533-03-L01: Add Vertical Axis (+ Glow Dots) to the Native Timeline Render

# FileName: TASK-533-03-L01-Timeline-Axis-Render.md

**Parent Task:** TASK-533
**Parent Subtask:** TASK-533-03
**Priority:** High
**Category:** Site Render / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Add a continuous vertical axis line connecting the existing timeline dots (vertical
variant), in a labelled `TASK-533` region of the `wrapSectionTemplateBlock` timeline
branch (`core/services/pages/pageRendererV2.tsx`). Optionally upgrade the dot to a
glow. Keep the horizontal variant intact. No model field.

## Grounded anchors (RE-GREP at implement time)

- **`wrapSectionTemplateBlock` timeline branch** — `pageRendererV2.tsx:2468-2500`.
  Per item: `<div … grid grid-cols-[auto_minmax(0,1fr)] gap-4 …
  data-page-timeline-item={index+1}> <span … data-page-timeline-marker
  style={{backgroundColor:"var(--coderso-section-accent,#0d9488)"}}/> <div …
  data-page-timeline-content>{rendered}</div> </div>` (vertical). Horizontal variant
  uses `grid gap-3 md:grid-rows-[auto_1fr]` (`:2474-2476`).
- **`pageSectionTemplateClass` timeline branch** — `pageRendererV2.tsx:540-544` sets
  the section content-grid class per variant.
- **Reference** — `.timeline:before{position:absolute;left:24px;top:0;bottom:0;
  width:1px;background:linear-gradient(var(--aqua),rgba(255,255,255,.06))}` (axis on
  the CONTAINER) + `.timeline article:before{…width:13px;height:13px;border-radius:
  50%;background:var(--aqua);box-shadow:0 0 28px var(--aqua)}` (glow dot),
  `_docs/projekty-domow-wow-site/assets/styles.css:79`.

## Implementation pseudocode

Pick ONE grounded option (prefer B — robust to the section grid, no absolute-position
math against the container height):

```tsx
// ── OPTION B (recommended): per-item connector segment in the marker column ──
// Each timeline row's marker column gets a vertical connector that visually joins
// into a continuous axis. The marker column is the `auto` track; add a relative
// wrapper drawing a full-height 1px line behind the dot, tinted off the accent.
if (template.template === "timeline" && template.variant !== "horizontal") {
  return (
    <div className={joinPageRenderClasses("relative min-w-0",
      "grid grid-cols-[auto_minmax(0,1fr)] gap-4",
      template.variant === "compact" ? "py-2" : "py-3")}
      data-page-timeline-item={index + 1}>
      {/* marker column: axis segment + glow dot */}
      <span className="relative flex justify-center" data-page-timeline-axis="true">
        {/* continuous axis: full-height 1px rule behind the dot (accent → fade) */}
        <span aria-hidden="true"
          className="absolute inset-y-0 w-px"
          style={{ background:
            "linear-gradient(var(--coderso-section-accent,#0d9488), rgba(148,163,184,.12))" }}
          data-page-timeline-axis-line="true" />
        <span className="relative mt-1 h-3 w-3 rounded-full ring-4 ring-white"
          style={{ backgroundColor: "var(--coderso-section-accent,#0d9488)",
                   boxShadow: "0 0 16px var(--coderso-section-accent,#0d9488)" }}  // glow dot
          data-page-timeline-marker="true" />
      </span>
      <div className="min-w-0" data-page-timeline-content="true">{rendered}</div>
    </div>
  );
}
// horizontal variant: keep the existing branch UNCHANGED (top-row markers), or add a
// horizontal axis symmetrically if trivial — but do NOT regress it.
```

- The axis segments in adjacent rows abut (each row's segment is full row height,
  `inset-y-0`) so they READ as one continuous line — matching `.timeline:before`
  without needing container-height math.
- Alternatively OPTION A: draw a single absolutely-positioned axis on the timeline
  CONTAINER (the section content grid). Requires the container to be `relative` and a
  left offset matching the marker column; only take A if grounding shows the content
  grid is a stable positioned ancestor. B is preferred.
- Keep ALL existing hooks: `data-page-timeline-item`, `data-page-timeline-marker`,
  `data-page-timeline-content` stay present (additive DOM). New hooks:
  `data-page-timeline-axis` / `data-page-timeline-axis-line` for the smoke assertion.
- Dot glow (`box-shadow` off accent) added to match `.timeline article:before`.
- Reduced-motion: the axis/dot are static (no animation) — no motion gate needed.

## Documentation (discoverability)

Confirm the `timeline` section template is offered in the section-template picker
(grep the admin section-add UI + `pageSectionTemplates.ts:62`). If it is present,
document in the closure (`PAGE_MODEL.md`) how to add a `timeline` section and that it
now renders a native axis; if it is NOT surfaced, note the gap as a follow-up (do not
expand scope here).

## Security note

No author-controlled value. The axis + dot are fixed structure/CSS tinted off
`--coderso-section-accent` (already sanitized via `sanitizeAuthoringCssColor` when the
section `accent` is normalized). No new field, no markup accepting author strings, no
URL, no route.

## Vitest test lane (authored in 533-03-L02)

`tests/vitest/pages/page-renderer-v2.test.tsx` — render a `timeline` section with 3
blocks; assert each item has `data-page-timeline-axis-line` present with a non-empty
`background` (the axis) AND `data-page-timeline-marker` retained; assert the
horizontal variant still renders.

## Regression / breaking-test ownership

If an existing test pins the OLD (axis-less) timeline DOM shape (child count / exact
node tree under `data-page-timeline-item`), it is an OWNED structural rebaseline for
533-03-L02 (declared — the axis is additive DOM). Preserve the
`data-page-timeline-marker`/`content` assertions; only update a shape/count assertion
that the added axis node changes.

## Hard Invariants

1. A vertical-variant timeline renders a continuous visible axis line (non-zero
   height, tinted off accent) connecting the dots; the horizontal variant is not
   regressed.
2. All existing `data-page-timeline-*` hooks retained (additive DOM).
3. No model field, no author-controlled value, no schemaVersion bump, no migration,
   no dependency; additions in a labelled `TASK-533` region.
