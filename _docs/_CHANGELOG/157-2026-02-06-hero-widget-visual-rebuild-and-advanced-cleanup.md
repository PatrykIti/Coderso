# 157-2026-02-06 - Hero widget visual rebuild and advanced cleanup

Date: 2026-02-06
Version: Unreleased
Tasks: TASK-050-05-02

## Summary
- Rebuilt Hero editing UX around a Visual-first, section-based flow with working variant presets and a technical-only Advanced mode.

## Key Changes
- Admin/UI: added widget-level visual capability flag (`visualOwnsVariantSelection`) and hid generic Visual variant controls for Hero.
- Admin/UI: Hero Visual editor rebuilt into sections (Variant & Presets, Content, CTA, Media, Typography, Colors/Borders, Background).
- Admin/UI: implemented `Add variant preset` modal with create/apply/update/delete actions.
- Core/Settings: added per-user `widgets.hero.presets` setting with shape validation, unique names, and limit enforcement.
- CMS/Widgets: expanded Hero style schema/runtime mapping for text sizes/colors, button styles, and card/media border controls.
- Admin/UI: Hero Advanced editor now keeps only technical controls (layout/spacing/background/responsive), without duplicating Visual content/style fields.
- Tests: added VisualPanel capability coverage, Hero renderer style-token coverage, and user settings validation coverage for Hero presets.
