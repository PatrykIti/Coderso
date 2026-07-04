# 1183 - TASK-470 Image Fit And Video Title Render Wiring Closure

**Date:** 2026-06-19
**Version:** Unreleased
**Tasks:** TASK-470

## Key Changes

### Task Board
- Closed TASK-470 (`Pages Editor Image Fit And Video Title Render Wiring`) as
  `Done`. This was a **verify-not-reimplement** closure: both render-wiring
  fixes already landed on `feature/visual` in commit `540c7131` ("Fix Pages
  phase 3a post-impl drift", 2026-06-16), the same Phase 3A drift pass that
  closed the dead-prop class. The roadmap still listed it open because
  `_ROADMAP-open-tasks-2026-06-17.md` was generated against `main`, where that
  commit is not yet merged.
- Set the TASK-470 task file to `✅ Done` with a verification completion note.
- Board table sync note: `_docs/_TASKS/README.md` (move the TASK-470 row from
  `To Do` to `Done`, stats To Do −1 / Done +1) and the audit §9.4 item-2
  reconciliation were left to the owning process — both files are under
  concurrent edit by a sibling agent (TASK-469/471) and were repeatedly reset to
  HEAD during this closure, so they are flagged for that owner rather than
  fought over here.
- Follow-up 2026-06-20: changelog 1185 resolved this deferred board/audit sync
  and added the no-source video placeholder regression guard.

### Renderer Wiring (already in code, confirmed)
- `image.fit` → `core/services/pages/pageRendererV2.tsx#renderImage` applies
  `pageImageFitClass(block.props.fit)` (`object-contain` / `object-cover`) to
  the `<img>` class instead of a hardcoded `object-cover`.
- `video.title` → the rendered `<video>` emits `title={title || undefined}` and
  `aria-label={title || undefined}` from `block.props.title`.

### Docs
- Recorded the discovery, verification evidence, and live-environment limitation
  in `TASK-470_Pages_Editor_Image_Fit_And_Video_Title_Render_Wiring.md`.
- Updated `_docs/_TASKS/_ROADMAP-open-tasks-2026-06-17.md` (TASK-470 row → Done
  + dated note).
- Pending for the owning process: `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md`
  §9.4 item 2 should be marked `RESOLVED 2026-06-19` (the file is reset-protected
  / under concurrent edit, so the note did not persist from this closure).

## Validation

- `bun --cwd core lint`: passed.
- `bun --cwd core lint:types`: passed.
- `bun run test:vitest tests/vitest/pages/page-renderer-v2.test.tsx`: `51/51`
  passed, including `"image fit prop changes the rendered image object-fit
  class"` (asserts `object-contain` vs `object-cover`) and `"video autoplay
  prop reaches the rendered video with policy companions"` (asserts
  `title="Intro"` + `aria-label="Intro"` and `title="Manual"`).

## Live Verification (`playwright-cli`, dev host `coderso-a.localhost`)

- Published a throwaway page with an image block set to `fit=contain`; the
  public-runtime DOM rendered `<img class="w-full rounded object-contain">`,
  proving panel → persistence → front paint for `image.fit` end-to-end. The
  verify page was deleted afterward (front returns not-found).
- `video.title` could not be rendered live: the renderer's `src` guard emits a
  placeholder when no video source is set, and this environment has no `video/*`
  asset (a synthetic 142-byte MP4 was correctly rejected by media validation
  with HTTP 400; no `ffmpeg` to author a decodable clip). The panel Title value
  persists and the renderer→DOM step is proven by the vitest assertion above.

## Notes

- No production code changed in this closure (renderer-only fixes were already
  committed); changes here are task/board/changelog/audit docs only.
- No API routes touched, so no Security Contract applies.
