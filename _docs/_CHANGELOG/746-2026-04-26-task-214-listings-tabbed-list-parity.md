# 746 - TASK-214 Listings tabbed list parity

Date: 2026-04-26
Version: unreleased
Tasks: TASK-214, TASK-214-01, TASK-214-01-01, TASK-214-01-02, TASK-214-02, TASK-214-02-01, TASK-214-02-02, TASK-214-02-03, TASK-214-03, TASK-214-03-01, TASK-214-03-02, TASK-214-03-03, TASK-214-04, TASK-214-04-01, TASK-214-04-02, TASK-214-04-03, TASK-214-04-04, TASK-214-05, TASK-214-05-01, TASK-214-05-02

## Key Changes

### Listings Admin List
- Upgraded `/admin/coderso/listings` to the Pages-style list shell while keeping `Queries` and `Templates` as separate tab-scoped resources.
- Added active-tab `New`, query/template filters, selectable tables, shared pagination, visible-row selection trimming, and inline bulk delete controls.
- Moved template list ownership to `ListingListPage`; `ListingTemplateManager` now owns only controlled create/edit dialog form state.

### Actions and Feedback
- Added shared Listings action toast adapters for listing query and listing template create/update/delete feedback.
- Gated query and template row/bulk delete behind `ConfirmActionDialog` and kept partial bulk failures visible inline and in toast copy.
- Added query create/update feedback in `ListingEditorPage`.

### Cache and Routes
- Updated query/template list hooks to hydrate from cache immediately, revalidate in the background when cache exists, and use foreground loading only on cache misses.
- Preserved `/coderso/listings` prefetch warmup for both query and template cached lists.
- Added stable route error mapping coverage for raw Listings query/template sentinels while preserving domain `ApiError` pass-through.

### Docs and QA
- Updated Content List UX, Admin Cache docs, Admin Cache Map, CMS API error notes, Listings QA report coverage split, task statuses, and task board stats.
- Validated with core lint/typecheck, targeted Vitest UI/admin suites, list-action toast coverage, pagination/cache/prefetch checks, and the Listings route test outside sandbox with repo env.
