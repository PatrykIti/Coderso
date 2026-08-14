# TASK-558: Popup Visual Theming (Follow-up to TASK-486)

# FileName: TASK-558_Popup_Visual_Theming_Follow_Up_To_TASK_486.md

**Parent Task:** (none; standalone follow-up)
**Priority:** Medium
**Category:** Engagement / Popups / Public Site / Present-only
**Estimated Effort:** Medium
**Dependencies:** TASK-486 (terminal)
**Status:** ⏳ To Do
**Changelog:** 1273 (pinned; closure only)

---

## Overview

TASK-486 delivered the public popup runtime: published/audience-targeted
popups are fetched via `GET /api/popups`, triggered by the client engine
(time_delay/scroll_depth/exit_intent/cta_click), gated by frequency/cooldown,
and rendered through `renderPopup`. The 8-scenario runtime smoke
(`wf486smoke`) proved the full DOM/aria contract renders with correct content
and zero console errors — **but the popup is unstyled** (static position,
appended below the fold, no visual theme). The TASK-486-03-L01 contract
explicitly scoped CSS theming out; this task closes that gap before release.

## Scope

- **Present-only visual theme**: default popup card styling (surface, border,
  shadow, radius, padding, typography), overlay/backdrop when the trigger uses
  one, close-button affordance, and safe z-index placement above site content.
  Follow the TASK-533/531 present-only discipline: no model/schema bump unless
  the theme must be author-configurable, and zero emitted bytes when unauthored
  (byte-identical legacy documents).
- **Placement**: fixed/centered (or per settings anchor) with viewport clamping;
  never below the fold, never clipped, visible on mobile widths.
- **Accessibility**: focus management, `aria-modal`/`role="dialog"` when
  modal, ESC-to-close, reduced-motion respect, focus trap where required.
- **Authoring surface (only if required by the task contract)**: bounded theme
  presets via the existing popup settings model with strict schema allowlist +
  reject-unknown + round-trip tests; otherwise fixed theme presets only.

## Out of scope

- New triggers, targeting rules, frequency strategies, or public route changes
  (TASK-486 owns those contracts; do not reopen them).
- Admin-only settings changes beyond the popup theme keys if a configurable
  theme is accepted.
- Any change to `popupPublicContract.ts` DTO shape or PII projection.

## Evidence / acceptance

- Runtime smoke (`wf558smoke`) with at least 5 distinct real-flow scenarios:
  modal popup with backdrop, non-modal card, close-button behavior, ESC close,
  mobile viewport geometry, light+dark admin render parity. Assert computed
  styles/geometry/DOM state, 0 console errors, valid PNGs under
  `_docs/_workflows/_smoke/`.
- Byte-identity: no-override documents render byte-identical (present-only
  gate, tests pinning `buildSiteShellCss(null)`-style no-op).
- Lane-correct tests (Vitest for render, Bun where route-adjacent), lint,
  typecheck, gates:coderso, files <=1000 lines.

## Source of truth

- `_docs/ARCHITECTURE.md` public-runtime delivery path (TASK-486 section),
  `docs/develop/runtime-smoke-cookbook.md` (shared runner recipe),
  `_docs/DESIGN_TOKENS.md` (existing tokens; add popup-specific tokens only if
  the theme needs them).
