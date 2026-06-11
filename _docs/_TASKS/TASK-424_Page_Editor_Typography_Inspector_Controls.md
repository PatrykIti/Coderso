# TASK-424: Page Editor Typography Inspector Controls
# FileName: TASK-424_Page_Editor_Typography_Inspector_Controls.md

**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-421, TASK-422
**Status:** ⏳ To Do

---

## Overview

Deliver the missing Typography path from
`_docs/AUDIT/_cross-canvas-inline-typography-2026-06-10.md`. The current
floating inspector exposes only scattered `level`, `textAlign`, and raw-hex
color fields; there is no coherent Typography surface and no contract for
`fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, or `letterSpacing`.

This family owns the shared text-style contract used by section text content
and text-bearing blocks. TASK-422 canvas inline editing writes block props
(text content) through its own commit path and does not write these style
fields; the typography style fields defined here are written only by this
family's inspector controls, rendered with the dedicated widgets owned by
TASK-421. The TASK-421/TASK-422 entries in Dependencies express sequencing
only (the widget primitives and the inline-edit text path land first), not a
claim that TASK-422 writes through this family's style fields.

Per the 4-layer rule (`_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md:175-182`:
registry descriptor + schema/normalizer + renderer + panel widget), every typography
control in this family must land with its renderer mapping in
`core/services/pages/pageRendererV2.tsx` (`toPageBlockStyle`,
`renderPageBlockContent`), a mandatory owner file: the fields are painted on
the same rendered node on the editor canvas (`PageSectionContent`) and the
published front (`PageDocumentRender`), otherwise the controls are dummies.

---

## Sub-Tasks

- [ ] TASK-424-01: Typography style schema and registry contract.
- [ ] TASK-424-01-L01: Add normalized typography fields and shared text-control
      descriptors to the Pages owner.
- [ ] TASK-424-02: Typography panel widgets and text-surface IA.
- [ ] TASK-424-02-L01: Render segmented, swatch, slider, picker, and token
      controls for typography inputs.
- [ ] TASK-424-03: Validation, docs, and text-path closure.

---

## Testing Requirements

- New Vitest coverage for typography schema/registry ownership.
- Renderer regression coverage: typography style fields emit the expected CSS
  through `core/services/pages/pageRendererV2.tsx` on both the editor canvas
  and the published front.
- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Real browser smoke through `coderso-dev-core-host` and `playwright-cli`.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/DESIGN_TOKENS.md`
- `docs/guide/` Page editor docs
- `_docs/_TASKS/README.md`

