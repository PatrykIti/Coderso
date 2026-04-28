# TASK-213-07-01: Widget Playwright and Vitest Regression Matrix
# FileName: TASK-213-07-01_Widget_Playwright_and_Vitest_Regression_Matrix.md

**Priority:** Medium
**Category:** QA + Widget Library + Widget Editors
**Estimated Effort:** Small
**Dependencies:** TASK-213-01, TASK-213-02, TASK-213-03, TASK-213-04, TASK-213-05, TASK-213-06
**Status:** Done (2026-04-26)

---

## Overview

Create the final regression matrix for the Widget Library QA family.

This leaf owns validation proof only. It must run the exact relevant lanes for
the implemented changes and replay the Widget Library paths from
`SUMMARY-WIDGETS.md`.

## Sub-Tasks

No child task files.

## Files to Change

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/_TASKS/TASK-213*.md`
- test files only if missing regression assertions are discovered during the
  validation pass.

## Implementation Direction

Build a matrix that maps each source finding to automated and manual proof.

Pseudocode:

```md
| Finding | Automated proof | Manual proof | Status |
|---|---|---|---|
| BUG-9 Form Embed crash | form-embed-editor-wave | Playwright add/open | Fixed after proof |
| GLOBAL-2 Listing/Search native select | code refs + UI suite | inspect controls | Current-state verified |
```

Minimum source matrix:

- `BUG-1` through `BUG-7`
- `UX-1` through `UX-8`
- `GLOBAL-1` through `GLOBAL-4`, with `GLOBAL-4` recorded as a false-positive
  verification rather than an implementation change
- `BUG-9` and `BUG-10`
- layout/content/forms/navigation per-widget notes that were intentionally
  routed into `TASK-213-05-*` and `TASK-213-06-*`

Use command output, not assumptions. If a suite fails for unrelated legacy
reasons, isolate it with a smaller targeted suite and document the unrelated
failure separately.

For findings that no longer reproduce in the current checkout, record exact file
references and the remaining valid owner. Example: `ListingFiltersEditors.tsx`
and `SearchBoxEditors.tsx` already use shared Radix Select primitives, while
their loading/empty-state issue remains under `TASK-213-01-02`.
For `GLOBAL-4`, verify the current Visual and Advanced tabs on representative
widgets such as Section, Hero, and Feature Grid, then record the source finding
as `false positive/current-state verified` without adding product work.

## Security Contract

- Visibility: QA/docs only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: validation notes must point to the real schema
  owner when payload contracts changed.
- Anti-abuse: do not paste secrets, private customer data, raw tokens, or
  unredacted payloads into QA notes.

## Testing Requirements

- Always:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Run every targeted Vitest suite from the completed leaves.
- Run Bun route/service suites if template/category/page insert route behavior
  changed. Load env first:
  `set -a && source .env && set +a`.
- Manual Playwright replay:
  - `/admin/coderso/widgets` list/filter/favorites/template actions;
  - insert page/template flow success and failure;
  - Form Embed no-crash;
  - Listing Filters/Search Box loading/empty states;
  - Listing Filters/Search Box current Select primitive verification for
    `GLOBAL-2`;
  - repeatable count widgets;
  - product/media/rich-text quick setup upgrades.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/_TASKS/TASK-213*.md`

## Acceptance Criteria

1. Each source finding has concrete automated and/or manual proof.
2. Test commands and outcomes are recorded with exact suite names.
3. Unrelated failures are separated from TASK-213 risk.
