# 244-2026-02-18 - Coderso search preview route fix and filters query guide

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-08

## Key Changes
- Search preview (Admin/Coderso):
  - Fixed preview requests to avoid direct `/api/search` calls from admin dev host.
  - Added internal endpoint `GET /search/public-preview` (admin API, `content:read`) that proxies public search behavior.
  - Updated `ListingSearchPage` to use internal client call (`/admin/api/search/public-preview`).

- Filters UX help:
  - Added expandable "Show examples" panel in `ListingFiltersPage`.
  - Added token format explanation, operator list, and ready-to-run sample query strings.
  - Added "Use example" actions to quickly fill the runtime query input.

- API docs and tests:
  - Updated `_docs/CMS_API.md` with the new internal public-search preview endpoint.
  - Added/updated tests for:
    - search routes registration,
    - listings client preview request path,
    - filters page shell rendering with examples toggle.
