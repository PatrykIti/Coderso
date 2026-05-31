# 861 - TASK-270 Gallery Mosaic widget follow-ups

Date: 2026-05-18
Version: Unreleased
Tasks: TASK-270, TASK-270-01, TASK-270-02, TASK-270-03, TASK-270-04, TASK-270-05, TASK-270-06, TASK-270-07

## Key Changes

### CMS Widgets

- Expanded Gallery Mosaic authoring with per-item previews, per-item media
  picking, destructive reorder/count safeguards, dedicated `alt` / `poster` /
  focus-point / ratio fields, opt-in lightbox/zoom, bounded responsive density
  presets, reduced-motion-safe tile entrances, and bounded JSON import/export.
- Kept the widget schema-first and backward compatible by owning every new
  field in `galleryMosaic.tsx` through defaults, normalizers, runtime markers,
  and editor wiring instead of ad-hoc editor-only state.
- Hardened hover-caption keyboard access in the final closure pass so linked,
  lightbox, and static hover tiles now expose the caption outside a pure
  mouse-hover path.

### Admin UI and QA

- Updated Wizard/Visual/Advanced guidance so the final Gallery Mosaic flow is
  explicit: Wizard for onboarding, Visual for product composition, and
  Advanced for normalized JSON import/export.
- Added targeted runtime, editor-wave, renderer, and validator coverage for
  lightbox behavior, density/motion presets, import/export validation errors,
  and the final hover-caption accessibility hardening.

### Documentation

- Rewrote the Gallery Mosaic Playwright report into a full closure map that
  preserves the original snapshot while explicitly mapping every `CODE`, `BUG`,
  `UX`, `BF`, and accessibility finding to shared fixes, local TASK-270 leaves,
  session/setup resolution, or an explicit defer reason.
- Synchronized `_docs/_WIDGETS/GALLERY_MOSAIC.md`, the TASK-270 family docs,
  the task board, and this changelog index with the fully shipped Gallery
  Mosaic contract.
