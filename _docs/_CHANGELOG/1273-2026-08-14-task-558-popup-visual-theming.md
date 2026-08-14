# 1273 - TASK-558 Popup Visual Theming (Follow-up to TASK-486)

**Date:** 2026-08-14
**Version:** Unreleased
**Tasks:** TASK-558

## Key Changes

- **Present-only visual theme** for the public popup runtime: fixed preset card
  styling (surface, border, shadow, radius, padding, typography), overlay/backdrop
  for modal popups, top-right close affordance, safe `z-index: 9999` placement.
  `core/services/popups/runtime/popupThemeCss.ts` owns the canonical CSS;
  `renderPopup` injects one `<style data-coderso-popup-theme>` per document only
  when a popup renders. Zero emitted bytes when unauthored (byte-identical
  no-override documents, pinned by `buildPopupThemeCss(null)` tests).
- **Placement**: fixed/centered with viewport clamping — never below the fold,
  never clipped, fully visible on mobile widths.
- **Accessibility**: focus moves into the dialog on open and restores on close,
  `role="dialog"`/`aria-modal=true`, ESC-to-close (dismissible popups), modal Tab
  trap, `prefers-reduced-motion` rule (animations disabled, popup still visible).
- **No schema/model bump**: fixed presets only, per contract preference; the
  TASK-486 injection contract and `popupPublicContract` DTO are untouched.

## Validation

- Vitest: popup-theme-css (byte-identity/present-only gates) + popup-render-theme
  (computed styles: fixed, z-index 9999, backdrop, clamped geometry, close
  affordance, focus/ESC/trap) — 30 targeted tests green; full popups +
  ui-integration lanes 708 tests green.
- Bun route-adjacent (runtime-injection, popupService, popupValidation, resolver):
  18/18; security+routes 13/13; siteShellCss byte-identity 10/10.
- Core lint, lint:types, repo tsc, gates:coderso 5/5, git diff --check clean; all
  files <=1,000 lines.
- **Runtime smoke (wf558smoke)**: 7 distinct real-flow scenarios PASS on a real
  server + browser — time_delay opens visibly (fixed/z-index 9999/opacity 1/
  backdrop painted/focus moved), card styling applied (style tag in HEAD, radius/
  shadow/border/padding), close button click removes popup, ESC closes, mobile
  390x844 fully clamped, reduced-motion rule active, admin light+dark. 8 valid
  PNGs, 0 console errors on public flows, complete fixture cleanup (0 `wf558-*`
  rows remain), dev host stopped.

## Notes

- One executable task terminal. Deviation: the theme style tag is absent on the
  admin popups list by present-only design (the admin list does not render a
  popup); admin light+dark smoke still verifies fixture rendering in both themes.
