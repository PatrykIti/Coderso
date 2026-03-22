# TASK-147: Site Settings Admin UI Assistant Documentation Refresh
# FileName: TASK-147_Site_Settings_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/site/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Site Settings surface based
on a real authenticated walkthrough of the local admin UI. The goal is to split
Site Settings out of the old combined General/Site/Assistant settings article
and replace it with a guided document that matches the shipped URL, homepage,
preview, content-route, and cache workflow on `/admin/settings/site`.

## Scope

1. Review the current combined settings assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/settings/site` with
   an authenticated session and record actual behavior.
3. Create a dedicated Site Settings doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/settings/site` points to the new canonical
   doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the section navigation flow:
   - base URLs,
   - homepage & 404,
   - preview access,
   - content routes,
   - cache settings,
   - performance placeholder.
2. Capture the base/site URL flow:
   - admin base URL,
   - public base URL,
   - admin access path,
   - homepage test action.
3. Capture the content/public behavior flow:
   - homepage and 404 selectors,
   - preview toggle/test,
   - route editors and suggested routes,
   - cache TTL.
4. Rewrite the doc without keeping Site Settings mixed into the same assistant
   page as General Settings and Assistant Settings.

## Acceptance Criteria

1. Site Settings has its own assistant doc that describes the current shipped
   UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about URLs, homepage selection, preview access,
   content routes, and cache behavior.
4. The coverage matrix points `/settings/site` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Site Settings UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/site/*`

## Documentation Updates Required

- `docs/screens/site-settings.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-147_Site_Settings_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Site Settings
  UI on `/admin/settings/site`.
- The walkthrough confirmed:
  - section rail navigation,
  - base URL and admin path controls,
  - homepage and 404 selectors,
  - preview toggle and test action,
  - content route editors,
  - cache settings,
  - performance placeholder.
- The rewritten doc was verified against:
  - `core/admin/ui/site/SiteSettingsPage.tsx`
  - `core/admin/ui/site/SiteRouteEditor.tsx`
  - `core/admin/ui/site/siteSettingsValidation.ts`
  - `core/admin/ui/settings/BaseUrlCard.tsx`
  - `core/admin/ui/settings/AdminAccessCard.tsx`
- No automated lint or test commands were run because this was a docs-only
  change.
