# 1242 - TASK-530 Page Editor Sliders — Fine ±1 Step for Every Numeric Range (One Place)

Date: 2026-07-08
Version: Unreleased
Tasks: TASK-530

## Key Changes

Owner request: every numeric SLIDER in the page editor that has options must
increment by 1 (fine control), not the coarse derived steps (2/4/10 by span).
Changed in ONE place so it applies uniformly to the page editor, page templates,
and the block/section option panels — all of which share the same control UI
model. Present-only behavior: **NO model/schema/normalizer change, NO DB
migration, NO npm dependency, NO route/RBAC change**. Clamping is unchanged and
the `sliderStepper` vs `slider` kind split (`PAGE_EDITOR_SLIDER_STEPPER_SPAN_THRESHOLD`)
is unchanged — wide ranges still pair with steppers, now stepping ±1.

- **Single source of truth: `resolveSliderStep` in
  `core/services/pages/pageEditorControlUiModel.ts`.** It was the only producer
  of the derived slider step, feeding both `slider` and `sliderStepper` models via
  `resolveNumberModel` (`step: control.step ?? resolveSliderStep(clamp)`). It now
  returns `clamp.max <= 1 ? 0.05 : 1` — the fractional branch is KEPT (line-height
  0..2, letter-spacing, opacity 0..1 can't step by 1 and stay fine-grained), and
  every numeric (px, `max > 1`) range now steps by 1 regardless of span. The old
  span buckets (`<=64 → 1`, `<=160 → 2`, `<=400 → 4`, else `10`) are removed.
- **Dropped the sole explicit integer registry step:
  `section.parallaxIntensity` in `core/services/pages/pageEditorControlRegistry.ts`
  had `step: 2` (px integer slider).** That line is removed so the control falls
  through to the now-1 derived default → parallax intensity also steps by 1. The
  intentional FRACTIONAL registry steps are UNTOUCHED: `block.style.lineHeight`
  `step: 0.05` and `block.style.letterSpacing` `step: 0.5` stay fine-grained.
- **Shared consumers — same UI model, all get step 1 automatically.** Page editor
  and page templates (`PageAuthoringCanvas`) and the block/section control panels
  all derive their slider step from this one function via `resolveNumberModel`, so
  a single edit covers all three surfaces. **Correction to grounding:** the menu
  design sliders in `core/admin/ui/menus/MenuDesignEditor.tsx` do NOT flow through
  `resolveSliderStep` — that file imports only `getPageEditorColorPalette` from the
  model and renders `<SliderControl step={1}>` with a hardcoded step. Menu design
  sliders were already stepping ±1 and are UNAFFECTED (no side-effect), so the
  grounding's "menu side-effect" note is inaccurate and is not carried here.
- **Tests (owned).** `tests/vitest/pages/page-editor-control-ui-model.test.ts`:
  rebaselined the coarse span-derived assertions to 1 — `section.layout.maxWidth`
  (320..1920) `step: 10 → 1`, the padding/margin/spacer group (0..240) `step: 4 → 1`,
  the gap group (0..120) `step: 2 → 1`. Added a dedicated TASK-530 test asserting a
  wide integer range (maxWidth 320..1920) models `step: 1` while staying
  `sliderStepper`, that `section.parallaxIntensity` now derives `step: 1`, and that
  fractional ranges stay fine-grained (opacity `0.05`, line-height `0.05`,
  letter-spacing `0.5`). `tests/vitest/ui/page-editor-v2-flow.test.tsx` needed no
  change — it sets arbitrary slider values (e.g. "900", "18") and never asserts an
  explicit `step`, so its flows remain valid.
- **Gates:** all green — `bun --cwd core lint`, `bun --cwd core lint:types`, root
  `tsc -p tsconfig.json --noEmit`, and the changed vitest files
  (`tests/vitest/pages/page-editor-control-ui-model.test.ts` +
  `tests/vitest/ui/page-editor-v2-flow.test.tsx`, 128/128).

## Open follow-ups (explicit, not dropped)

- Live ≥5-scenario-per-area Playwright smoke (page editor, page templates, block
  panel, section panel — fine ±1 on wide ranges, ±0.05 on line-height/opacity,
  parallax ±1) deferred to the orchestrator post-merge against the MAIN dev host.
