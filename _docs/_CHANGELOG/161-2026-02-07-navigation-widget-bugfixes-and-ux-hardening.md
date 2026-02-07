# 161-2026-02-07 - Navigation widget bugfixes and UX hardening

Date: 2026-02-07
Version: Unreleased
Tasks: TASK-050-06-01, TASK-050-06

## Summary
- Stabilized Navigation widget editing flow, aligned Visual/Wizard responsibilities, and shipped right-slot + behavior parity in runtime rendering.

## Key Changes
- CMS/Widgets: added `navigation` slot definition `right` (`Right Actions`) and runtime rendering for slot blocks in the right action area.
- CMS/Widgets: runtime now reflects `behavior.sticky` and `behavior.transparent`; `collapseOnScroll` is preserved via `data-collapse-on-scroll`.
- CMS/Widgets: hardened list rendering keys to avoid `href`-only instability while links are edited.
- CMS/Widgets: schema now accepts submenu items (`items[].children`) and logo alt metadata (`logo.alt`).
- Admin/UI: Navigation Wizard now supports logo type/source, logo link/alt, menu label+href quick editing, and CTA fields only for CTA-capable variants.
- Admin/UI: Navigation Visual mode now focuses on runtime look/behavior with explicit helper copy and widget-owned variant control.
- Admin/UI: Navigation Advanced mode now includes full menu item label+href editing and `collapseOnScroll` toggle.
- Tests: added `tests/unit/widgets/navigation.test.tsx` and extended renderer/visual panel coverage for navigation slot and variant control behavior.
