# TASK-470: Pages Editor Image Fit And Video Title Render Wiring
# FileName: TASK-470_Pages_Editor_Image_Fit_And_Video_Title_Render_Wiring.md

**Priority:** Low
**Category:** Pages / Page Editor V2 / Renderer
**Estimated Effort:** Small
**Dependencies:** TASK-440, TASK-441

**Status:** ⏳ To Do

---

## Overview

Carried-forward residual from the audit follow-up closure
(`_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §9.4 item 2; same dead-prop class
as the Phase 3A renderer fixes).

Two block props are editable, persisted, and validated, but never painted by
`core/services/pages/pageRendererV2.tsx`:

- **`image.fit`** — `renderImage` hardcodes `object-cover`, ignoring the
  editable/persisted `fit` value, so the panel control is inert on the front.
- **`video.title`** — exposed in the control registry and persisted, but the
  emitted `<video>` element carries no `title` / `aria-label`, so the value
  never reaches the DOM.

Goal: wire `image.fit` to the `<img>` `object-fit` class and `video.title` to
the `<video>` `title`/`aria-label`, so both floating-panel controls produce a
visible/accessible effect — closing the "every panel option works" contract for
these two targets.

---

## Sub-Tasks

- [ ] Map `image.fit` to the object-fit class in `renderImage` (cover/contain/fill per the schema enum).
- [ ] Emit `title`/`aria-label` on the rendered `<video>` from `video.title`.
- [ ] Add renderer regression coverage for both props (non-default value changes the painted output).

---

## Testing Requirements

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry on completion
- Reconcile `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §9.4 residual status on closure.
