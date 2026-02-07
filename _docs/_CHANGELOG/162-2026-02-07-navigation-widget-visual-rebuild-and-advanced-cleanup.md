# 162-2026-02-07 - Navigation widget visual rebuild and advanced cleanup

Date: 2026-02-07
Version: Unreleased
Tasks: TASK-050-06-02, TASK-050-06

## Summary
- Rebuilt Navigation editing flow to a Visual-first, section-based UX and moved Advanced mode to technical-only controls.

## Key Changes
- Admin/UI: rebuilt `NavigationVisualEditor` into seven sections (variant/structure, logo, links, CTA/right actions, mobile, colors/typography, surface behavior).
- Admin/UI: added practical link editing with add/remove items and first-level sub-links in Visual mode.
- Admin/UI: added logo image workflow with media library support for Navigation branding.
- Admin/UI: moved Navigation Advanced to technical controls only (layout tokens + sticky/collapse toggles).
- CMS/Widgets: finalized Navigation data model with additive fields (`linksSource`, `menuKey`, `mobileMode`, layout/style tokens, logo source metadata).
- CMS/Widgets: renderer now maps final style/layout/mobile fields while preserving backward compatibility.
- Tests: expanded coverage for Navigation visual IA sections, technical Advanced scope, VisualPanel integration, and template-builder block settings integration.
