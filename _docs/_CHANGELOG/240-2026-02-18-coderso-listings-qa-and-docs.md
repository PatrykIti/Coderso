# 240-2026-02-18 - Coderso listings QA and documentation closure

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-07-08

## Key Changes
- QA/Regression: Closed Listings QA matrix with deterministic checks across validation/execution/runtime/back-compat paths.
- Tests: Added explicit back-compat tests for `content-list` and `entry-teaser` (`source.mode` omitted + `listingQueryId` present -> listing mode).
- Docs/API: Added `Coderso Listings (v1 beta)` section in `_docs/CMS_API.md` with endpoints, payload contracts, operators, error codes, and runtime safety notes.
- Docs/Architecture: Added `Coderso Listings engine (v1 beta)` section in `_docs/ARCHITECTURE.md` (query/template/runtime/security layering).
- Docs/Status: Updated Listings progress and milestones in `_docs/CODERSO_MODULES.md` and task board status in `_docs/_TASKS/README.md`.
