# TASK-530: Page Editor Sliders — Fine ±1 Step for Every Numeric Range

# FileName: TASK-530_Page_Editor_Sliders_Fine_Step_1.md

**Priority:** Medium
**Category:** Pages / Admin Editor UI / Present-only (no migration, no schema bump) / Testing / Docs / Task Board
**Estimated Effort:** Small
**Dependencies:** landed on the post-TASK-529 page-toolkit tree

**Status:** ✅ Done
**Completed:** 2026-07-08
**Closure changelog:** 1242 (`_docs/_CHANGELOG/1242-2026-07-08-task-530-page-editor-slider-fine-step-1.md`)

---

## Historical reconstruction notice

This board parent was reconstructed by TASK-545-04-L02 from physical evidence
only: the board row in `_docs/_TASKS/README.md`, changelog 1242, the
`_docs/_workflows/task-530-full.mjs` workflow script, and the implementing
commits `3d978425` (feat) plus merge `12a00da6`, both dated 2026-07-08. It is a
historical evidence summary of an already-shipped task, not a new execution
contract. **No physical children or leaves were authored historically for
TASK-530, and none are created here.** No retroactive implementation pseudocode,
acceptance promises, or validation/smoke claims beyond the recorded evidence are
added.

## Shipped behavior (from changelog 1242 and commit diff)

Owner mandate: every numeric SLIDER in the page editor that has options steps by
1 (fine control), not the coarse span-derived buckets (2/4/10). Changed in ONE
place so it applies uniformly to the page editor, page templates, and the
block/section option panels — all of which share the same control UI model.

- **Single source of truth: `resolveSliderStep` in
  `core/services/pages/pageEditorControlUiModel.ts`.** It was the only producer
  of the derived slider step, feeding both `slider` and `sliderStepper` models
  via `resolveNumberModel` (`step: control.step ?? resolveSliderStep(clamp)`).
  It now returns `clamp.max <= 1 ? 0.05 : 1` — the fractional branch is KEPT
  (line-height 0..2, letter-spacing, opacity 0..1 can't step by 1 and stay
  fine-grained), and every numeric (px, `max > 1`) range now steps by 1
  regardless of span. The old span buckets (`<=64 → 1`, `<=160 → 2`,
  `<=400 → 4`, else `10`) are removed.
- **Dropped the sole explicit integer registry step:** `section.parallaxIntensity`
  in `core/services/pages/pageEditorControlRegistry.ts` had `step: 2` (px
  integer slider). That explicit step is removed so the control falls through to
  the now-1 derived default; parallax intensity also steps by 1. The intentional
  FRACTIONAL registry steps are untouched: `block.style.lineHeight` `step: 0.05`
  and `block.style.letterSpacing` `step: 0.5` stay fine-grained.
- **MenuDesignEditor step side-effect note (owner-requested traceability):** the
  menu design sliders in `core/admin/ui/menus/MenuDesignEditor.tsx` do NOT flow
  through `resolveSliderStep` — that file renders `<SliderControl step={1}>`
  with a hardcoded step on all 17 sliders, so menu design sliders were already
  stepping ±1 and are UNAFFECTED (no functional side-effect).

## Compatibility, security, and validation facts (evidenced)

- **Present-only:** NO model/schema/normalizer change, NO DB migration, NO npm
  dependency, NO route/RBAC change. Clamping is unchanged; the `sliderStepper`
  vs `slider` kind split (`PAGE_EDITOR_SLIDER_STEPPER_SPAN_THRESHOLD`) is
  unchanged — wide ranges still pair with steppers, now stepping ±1.
- **Tests (owned):** `tests/vitest/pages/page-editor-control-ui-model.test.ts`
  rebaselined the coarse span-derived assertions to 1 —
  `section.layout.maxWidth` (320..1920) `10→1`, the padding/margin/spacer group
  (0..240) `4→1`, the gap group (0..120) `2→1` — and added a dedicated TASK-530
  test asserting a wide integer range (maxWidth 320..1920) models `step: 1`
  while staying `sliderStepper`, that `section.parallaxIntensity` now derives
  `step: 1`, and that fractional ranges stay fine-grained (opacity `0.05`,
  line-height `0.05`, letter-spacing `0.5`).
  `tests/vitest/ui/page-editor-v2-flow.test.tsx` needed no change (it never
  asserts an explicit `step`).
- **Validation recorded in changelog 1242:** core lint, core lint:types, root
  `tsc -p tsconfig.json --noEmit`, changed Vitest files 128/128. The changelog
  also records the known transient context: two `test:bun` failures attributed
  to a slow-remote-DB 15s-timeout (TASK-459-03 green 18/18 in isolation at 45s),
  and five jsdom parallel-contention timeout flakes in the broad Vitest glob
  (all green re-run isolated); `gates:coderso` 5/5. The LIVE ≥5-scenario-per-area
  Playwright smoke (page editor, page templates, block panel, section panel —
  fine ±1 on wide ranges, ±0.05 on line-height/opacity, parallax ±1) was
  deferred to the orchestrator post-merge and is not claimed as run here.
