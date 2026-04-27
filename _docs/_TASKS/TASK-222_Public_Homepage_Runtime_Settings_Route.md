# TASK-222: Public Homepage Runtime Settings Route
# FileName: TASK-222_Public_Homepage_Runtime_Settings_Route.md

**Priority:** High
**Category:** Site/Runtime + Settings + CMS Pages
**Estimated Effort:** Small
**Dependencies:** TASK-046
**Status:** Done (2026-04-27)

---

## Overview

Fix the public `/` runtime route so it renders the published page selected in
Settings -> Site as `site.homepageId`.

The bug was in the public runtime path resolution, not in the admin UI save:

- Settings UI already writes `site.homepageId`.
- Settings service already normalizes the value.
- `handlePublicRequest()` still treated `/` as an ordinary page slug and called
  `getPageBySlug("/")`, so a selected homepage whose slug was not `/` returned
  404.

## Sub-Tasks

- [x] Resolve `/` through `site.homepageId` before ordinary page-slug lookup.
- [x] Preserve public rendering rules: only published pages with `publishedData`
  render outside preview.
- [x] Keep HTML cache keying on `/` for the homepage response.
- [x] Add DB-backed Bun runtime regression coverage for the Settings-selected
  homepage path.

## Security Contract

- Visibility: public read route `/`.
- Auth model: public read only; no admin session or API key is required.
- RBAC: unchanged; only published page data is rendered.
- CSRF: not applicable; no write route is added or modified.
- Rate-limit bucket: existing `public_read` bucket remains in force.
- Reject-unknown validation: unchanged; no request payload or settings schema is
  widened.
- Anti-abuse: unchanged; runtime still serves only published data and uses the
  existing public cache/rate-limit protections.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/753-2026-04-27-task-222-public-homepage-runtime-settings-route.md`

## Closure Notes

- Public `/` now loads the configured homepage by page ID and renders its
  published snapshot.
- Existing slug-based page routes keep their current behavior when no homepage
  is configured for `/`.
