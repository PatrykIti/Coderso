# 233-2026-02-18 - Coderso listings query contract and validation

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-07-01

## Key Changes
- Core/Validation: Added formal listing query constants (`sources`, `operators`) and tightened schema caps (`fields` unique, update payload requires at least one property).
- Core/Content: Added `queryBuilderService` with `parseListingQuery`, `parseListingQueryCreateInput`, and `parseListingQueryUpdateInput`.
- Core/Security: Added semantic guards for source-specific config, unsafe field paths (`__proto__`, `constructor`, `prototype`), and operator/value compatibility.
- Tests: Added unit coverage for both AJV schema validation and runtime parser normalization/error-code behavior.
