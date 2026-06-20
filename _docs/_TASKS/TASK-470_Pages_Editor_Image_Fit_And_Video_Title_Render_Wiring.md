# TASK-470: Pages Editor Image Fit And Video Title Render Wiring
# FileName: TASK-470_Pages_Editor_Image_Fit_And_Video_Title_Render_Wiring.md

**Priority:** Low
**Category:** Pages / Page Editor V2 / Renderer
**Estimated Effort:** Small
**Dependencies:** TASK-440, TASK-441

**Status:** ✅ Done
**Completed:** 2026-06-19

---

## Completion Note (2026-06-19)

Closed after verification, not new implementation: both render-wiring fixes
already landed on `feature/visual` in commit `540c7131` ("Fix Pages phase 3a
post-impl drift", 2026-06-16) — the same drift-fix pass that closed the Phase 3A
dead-prop class. The board/roadmap still listed this as open because the audit
that generated `_ROADMAP-open-tasks-2026-06-17.md` ran against `main`, where the
commit is not yet merged.

Current `core/services/pages/pageRendererV2.tsx` state:

- **`image.fit`** — `renderImage` now applies `pageImageFitClass(block.props.fit)`
  (`object-contain` / `object-cover`) to the `<img>` class, replacing the
  hardcoded `object-cover`.
- **`video.title`** — the rendered `<video>` emits `title={title || undefined}`
  and `aria-label={title || undefined}` from `block.props.title`.

Verification evidence:

- **Tests (green):** `bun run test:vitest tests/vitest/pages/page-renderer-v2.test.tsx`
  → 51/51 passed, including `"image fit prop changes the rendered image
  object-fit class"` (asserts `object-contain` vs `object-cover`) and
  `"video autoplay prop reaches the rendered video with policy companions"`
  (asserts `title="Intro"` + `aria-label="Intro"` on the autoplay block and
  `title="Manual"` on the manual block).
- **Live (`playwright-cli`, dev host `coderso-a.localhost`):** published a
  throwaway page with an image block set to `fit=contain`; the public-runtime
  DOM rendered `<img class="w-full rounded object-contain">` — confirming
  panel → persistence → front paint end-to-end. The verify page was deleted
  afterward (front now returns not-found).
- **`video.title` live limitation:** the front `<video>` element could not be
  rendered live because the renderer's `src` guard emits a placeholder when no
  video source is set, and this environment has no `video/*` asset (a synthetic
  142-byte MP4 was correctly rejected by media validation with HTTP 400; no
  `ffmpeg` available to author a decodable clip). The panel Title value persists
  and the renderer→DOM step is proven deterministically by the vitest assertion
  above.

No API routes are touched (renderer-only change), so no Security Contract
subsection applies.

## Post-Closure Drift Reconciliation (2026-06-20)

Local reconciliation confirmed the renderer code still has no TASK-470 drift:
`image.fit` is mapped through `pageImageFitClass`, and `video.title` is emitted
only on a rendered `<video>`. The remaining drift was closure hygiene:

- `_docs/_TASKS/README.md` moved TASK-470 from `To Do` to `Done` and refreshed
  board statistics.
- `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §9.4 item 2 is now marked
  resolved against TASK-470 and changelog 1183.
- `_docs/_TASKS/_ROADMAP-open-tasks-2026-06-17.md` no longer counts TASK-470
  as an open residual or future "do together" item.
- `_docs/_CHANGELOG/1185-2026-06-20-task-470-drift-reconciliation.md` records
  this reconciliation, and changelog 1183 now points to the follow-up.
- `tests/vitest/pages/page-renderer-v2.test.tsx` adds a negative guard proving
  that an empty or unsafe video `src` renders the placeholder without leaking
  `title` / `aria-label` onto inert markup.

Reconciliation validation:

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

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

- [x] Map `image.fit` to the object-fit class in `renderImage` (cover/contain per the schema enum; `pageImageFitClass`).
- [x] Emit `title`/`aria-label` on the rendered `<video>` from `video.title`.
- [x] Add renderer regression coverage for both props (non-default value changes the painted output).

---

## Testing Requirements

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry on completion
- Reconcile `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §9.4 residual status on closure.
