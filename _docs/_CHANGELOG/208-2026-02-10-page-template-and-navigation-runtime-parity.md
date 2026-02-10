# 208-2026-02-10 - Page template and navigation runtime parity

Date: 2026-02-10
Version: Unreleased
Tasks: TASK-052, TASK-052-01, TASK-052-02, TASK-052-03, TASK-052-04, TASK-052-05

## Summary
- Completed runtime parity for page templates and navigation sources: `settings.template` now drives public/preview rendering, and navigation can resolve links from published pages via `showInNav`.

## Key Changes
- CMS/Pages + Runtime:
  - Added page template key normalization + resolver and ensured deterministic fallback behavior (`core/services/pages/pageTemplateService.ts`).
  - Wired template-aware rendering for public pages and page preview, including safe fallbacks (`core/site/renderPublicPage.tsx`, `core/server/publicSite.tsx`).
- CMS/Menus + Widgets:
  - Added `linksSource="pages"` to navigation widget schema and runtime resolution from published pages (`settings.showInNav`) with deterministic fallbacks (`core/services/navigation/navigationRuntimeResolver.ts`).
- Admin/UI + API:
  - Added `GET /pages/template-options` and updated page settings UI to load theme-driven template options.
  - Updated navigation editor to expose the `Pages index` source semantics.
- Docs/Tests:
  - Updated docs for template resolution, navigation runtime sources, preview pipeline, and the template options API contract.
  - Added/updated unit + integration coverage for template-aware rendering, navigation runtime resolution, and route wiring.

