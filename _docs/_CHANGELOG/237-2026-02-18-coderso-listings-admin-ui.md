# 237-2026-02-18 - Coderso listings admin UI

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-07-05

## Key Changes
- Admin/UI: Added Listings list screen with query table, create/edit navigation, delete actions, and explicit loading/error/empty states.
- Admin/UI: Added Listings editor with source/filter/sort/pagination/fields panels, live preview execution, and save/discard flows.
- Admin/UI: Added listing template manager tab with create/edit/delete dialogs and layout selection.
- Admin/Nav: Exposed `Coderso -> Listings` as `Beta` module, added admin route wiring and legacy alias `/listings -> /coderso/listings`.
- Admin/Cache: Added listing query/template local cache keys and route prefetch integration.
- Tests: Added listings UI tests and updated admin path/nav/prefetch module tests for listings route exposure.
